// Switches one mesh through 8 material variants and counts program links.
// recreate: new material on every switch, old one disposed. pool: one material per variant.
import * as THREE from "three";
import { MaterialPool } from "../src/materialPool.js";
import { countLinks } from "../src/countLinks.js";

const params = new URLSearchParams(location.search);
const mode = params.get("mode") === "pool" ? "pool" : "recreate";
const rounds = Math.max(1, Number(params.get("rounds")) || 5);

// each flag changes the shader source, so 8 combinations = 8 programs
const VARIANTS = [];
for (const flatShading of [false, true])
  for (const vertexColors of [false, true])
    for (const cutout of [false, true]) VARIANTS.push({ flatShading, vertexColors, cutout });

const keyOf = (v) => `flat:${v.flatShading}|vc:${v.vertexColors}|cut:${v.cutout}`;
const makeMaterial = (v) =>
  new THREE.MeshStandardMaterial({
    color: 0x8899aa,
    roughness: 0.6,
    flatShading: v.flatShading,
    vertexColors: v.vertexColors,
    alphaTest: v.cutout ? 0.5 : 0,
  });

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(320, 240);
document.body.appendChild(renderer.domElement);
const links = countLinks(renderer.getContext());

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 320 / 240, 0.1, 100);
camera.position.set(0, 0, 4);
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));

const geometry = new THREE.SphereGeometry(1, 32, 16);
const colors = new Float32Array(geometry.attributes.position.count * 3).fill(0.8);
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
const mesh = new THREE.Mesh(geometry, makeMaterial(VARIANTS[0]));
scene.add(mesh);

const pool = new MaterialPool({ create: (key) => makeMaterial(VARIANTS.find((v) => keyOf(v) === key)), capacity: 16 });

links.reset();
let switches = 0;
for (let r = 0; r < rounds; r++) {
  for (const variant of VARIANTS) {
    if (mode === "pool") {
      mesh.material = pool.acquire(keyOf(variant));
    } else {
      const previous = mesh.material;
      mesh.material = makeMaterial(variant);
      previous.dispose();
    }
    renderer.render(scene, camera);
    switches++;
  }
}

const result = {
  mode,
  rounds,
  variants: VARIANTS.length,
  switches,
  programLinks: links.read(),
  liveProgramsAtEnd: renderer.info.programs.length,
  renderer: navigator.userAgent.includes("Headless") ? "headless" : "browser",
};
document.getElementById("out").textContent = JSON.stringify(result, null, 2);
window.__result = result;
