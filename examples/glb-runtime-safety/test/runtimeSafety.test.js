import { test } from "node:test";
import assert from "node:assert/strict";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, NoColorSpace, SRGBColorSpace, Texture } from "three";
import { estimateBytes, fitWithin } from "../src/textureBudget.js";
import { collectTextures, downscaleTextures } from "../src/downscaleTextures.js";
import { auditColorSpaces, repairColorSpaces } from "../src/colorSpaces.js";
import { cloneWithOwnMaterials, disposeOwnMaterials } from "../src/instanceClone.js";

const textureOf = (width, height) => new Texture({ width, height });
const stubResize = (image, width, height) => ({ width, height, from: image });

test("fitWithin keeps the aspect ratio and never upscales", () => {
  assert.deepEqual(fitWithin(4096, 2048, 1024), { width: 1024, height: 512, scale: 0.25 });
  assert.deepEqual(fitWithin(800, 600, 1024), { width: 800, height: 600, scale: 1 });
  assert.deepEqual(fitWithin(0, 10, 1024), { width: 0, height: 0, scale: 1 });
});

test("estimateBytes counts RGBA8 plus a third for mipmaps", () => {
  assert.equal(estimateBytes(1024, 1024, { mipmaps: false }), 4 * 1024 * 1024);
  assert.equal(estimateBytes(1024, 1024), Math.round(4 * 1024 * 1024 * (4 / 3)));
});

test("a texture shared by several meshes is collected and resized once", () => {
  const shared = textureOf(4096, 4096);
  const material = new MeshStandardMaterial({ map: shared, normalMap: textureOf(2048, 2048) });
  const root = new Group();
  root.add(new Mesh(new BoxGeometry(), material), new Mesh(new BoxGeometry(), material));
  assert.equal(collectTextures(root).length, 2);

  const report = downscaleTextures(root, { maxSize: 1024, resize: stubResize });
  assert.equal(report.textures, 2);
  assert.equal(report.resized, 2);
  assert.equal(material.map.image.width, 1024);
  assert.equal(material.normalMap.image.width, 1024);
  assert.ok(report.bytesAfter < report.bytesBefore);
});

test("colour textures become sRGB and data textures linear", () => {
  const map = textureOf(8, 8);
  const roughness = textureOf(8, 8);
  map.colorSpace = NoColorSpace;
  roughness.colorSpace = SRGBColorSpace;
  const material = new MeshStandardMaterial({ map, roughnessMap: roughness });
  assert.equal(auditColorSpaces(material).length, 2);
  assert.deepEqual(repairColorSpaces(material), { fixed: 2, conflicts: [] });
  assert.equal(map.colorSpace, SRGBColorSpace);
  assert.equal(roughness.colorSpace, NoColorSpace);
  assert.equal(auditColorSpaces(material).length, 0);
});

test("a texture used as both colour and data is reported, not changed", () => {
  const both = textureOf(8, 8);
  both.colorSpace = SRGBColorSpace;
  const material = new MeshStandardMaterial({ map: both, roughnessMap: both });
  const result = repairColorSpaces(material);
  assert.equal(result.fixed, 0);
  assert.deepEqual(result.conflicts, [both]);
  assert.equal(both.colorSpace, SRGBColorSpace);
});

test("each copy owns its materials; sharing inside the model is kept", () => {
  const shared = new MeshStandardMaterial({ color: 0xffffff });
  const source = new Group();
  source.add(new Mesh(new BoxGeometry(), shared), new Mesh(new BoxGeometry(), shared));

  const a = cloneWithOwnMaterials(source);
  const b = cloneWithOwnMaterials(source);
  a.children[0].material.color.set(0xff0000);

  assert.notEqual(a.children[0].material, shared);
  assert.equal(a.children[0].material, a.children[1].material);
  assert.notEqual(a.children[0].material, b.children[0].material);
  assert.equal(b.children[0].material.color.getHex(), 0xffffff);
  assert.equal(shared.color.getHex(), 0xffffff);
  assert.equal(a.children[0].geometry, source.children[0].geometry);
  assert.equal(disposeOwnMaterials(a), 1);
});
