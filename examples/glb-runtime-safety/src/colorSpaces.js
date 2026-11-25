import { NoColorSpace, SRGBColorSpace } from "three";

// glTF stores colour textures in sRGB; everything else is linear data.
const COLOR_SLOTS = ["map", "emissiveMap", "sheenColorMap", "specularColorMap"];
const DATA_SLOTS = [
  "normalMap", "bumpMap", "displacementMap", "roughnessMap", "metalnessMap", "aoMap", "alphaMap",
  "clearcoatMap", "clearcoatNormalMap", "clearcoatRoughnessMap", "sheenRoughnessMap",
  "specularIntensityMap", "transmissionMap", "thicknessMap", "iridescenceMap",
  "iridescenceThicknessMap", "anisotropyMap",
];

export const expectedColorSpace = (slot) => (COLOR_SLOTS.includes(slot) ? SRGBColorSpace : NoColorSpace);

const texturesBySlot = (material) =>
  [...COLOR_SLOTS, ...DATA_SLOTS].map((slot) => [slot, material[slot]]).filter(([, t]) => t?.isTexture);

export function auditColorSpaces(material) {
  return texturesBySlot(material)
    .map(([slot, texture]) => ({ slot, from: texture.colorSpace, to: expectedColorSpace(slot) }))
    .filter(({ from, to }) => from !== to);
}

// A texture used as colour and as data at the same time can't be right for both, so it's left alone.
export function repairColorSpaces(material) {
  const wanted = new Map();
  for (const [slot, texture] of texturesBySlot(material)) {
    if (!wanted.has(texture)) wanted.set(texture, new Set());
    wanted.get(texture).add(expectedColorSpace(slot));
  }
  let fixed = 0;
  const conflicts = [];
  for (const [texture, spaces] of wanted) {
    if (spaces.size > 1) {
      conflicts.push(texture);
      continue;
    }
    const [to] = spaces;
    if (texture.colorSpace !== to) {
      texture.colorSpace = to;
      texture.needsUpdate = true;
      fixed++;
    }
  }
  return { fixed, conflicts };
}
