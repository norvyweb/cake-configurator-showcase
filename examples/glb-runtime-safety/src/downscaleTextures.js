import { estimateBytes, fitWithin } from "./textureBudget.js";

export const TEXTURE_SLOTS = [
  "map", "emissiveMap", "normalMap", "bumpMap", "displacementMap", "roughnessMap", "metalnessMap",
  "aoMap", "alphaMap", "lightMap", "clearcoatMap", "clearcoatNormalMap", "clearcoatRoughnessMap",
  "sheenColorMap", "sheenRoughnessMap", "specularColorMap", "specularIntensityMap",
  "transmissionMap", "thicknessMap", "iridescenceMap", "iridescenceThicknessMap", "anisotropyMap",
];

export function collectTextures(root) {
  const found = new Set();
  root.traverse((object) => {
    if (!object.material) return;
    for (const material of [].concat(object.material)) {
      for (const slot of TEXTURE_SLOTS) {
        if (material[slot]?.isTexture) found.add(material[slot]);
      }
    }
  });
  return [...found];
}

// Run after loading, before the first render. This saves GPU memory, not download size.
export function downscaleTextures(root, { maxSize, resize }) {
  const report = { textures: 0, resized: 0, bytesBefore: 0, bytesAfter: 0 };
  for (const texture of collectTextures(root)) {
    const { width = 0, height = 0 } = texture.image ?? {};
    if (!width || !height) continue;
    report.textures++;
    report.bytesBefore += estimateBytes(width, height);
    const target = fitWithin(width, height, maxSize);
    if (target.scale < 1) {
      texture.image = resize(texture.image, target.width, target.height);
      texture.needsUpdate = true;
      report.resized++;
    }
    report.bytesAfter += estimateBytes(target.width, target.height);
  }
  return report;
}

export function canvasResize(image, width, height) {
  const canvas = typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(width, height)
    : Object.assign(document.createElement("canvas"), { width, height });
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}
