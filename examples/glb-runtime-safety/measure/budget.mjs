// Estimated GPU memory of a made-up texture set at different size caps.
// Arithmetic only (see estimateBytes), not a device measurement.
import { estimateBytes, fitWithin, formatMiB } from "../src/textureBudget.js";

const SYNTHETIC_SET = [
  ["base colour", 4096, 4096],
  ["normal", 4096, 4096],
  ["roughness/metalness", 2048, 2048],
  ["occlusion", 2048, 2048],
  ["detail colour", 2048, 1024],
  ["decal", 1024, 1024],
];

const total = (cap) =>
  SYNTHETIC_SET.reduce((sum, [, w, h]) => {
    const t = cap ? fitWithin(w, h, cap) : { width: w, height: h };
    return sum + estimateBytes(t.width, t.height);
  }, 0);

const uncapped = total(null);
const rows = [null, 2048, 1024, 512].map((cap) => {
  const bytes = total(cap);
  return { cap: cap ? `${cap} px` : "none", estimate: formatMiB(bytes), "vs none": `${((bytes / uncapped) * 100).toFixed(0)}%` };
});

console.log(`Synthetic set: ${SYNTHETIC_SET.length} textures, RGBA8 with mipmaps`);
console.table(rows);
