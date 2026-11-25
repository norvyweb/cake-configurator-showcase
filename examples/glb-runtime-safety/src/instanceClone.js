// clone() shares materials, so tinting one copy tints all of them.
// Here each copy gets its own materials; geometry and textures stay shared.
export function cloneWithOwnMaterials(source) {
  const copy = source.clone(true);
  const clones = new Map(); // keeps materials that were shared in the source shared in the copy
  const own = (material) => {
    if (!clones.has(material)) clones.set(material, material.clone());
    return clones.get(material);
  };
  copy.traverse((object) => {
    if (!object.material) return;
    object.material = Array.isArray(object.material) ? object.material.map(own) : own(object.material);
  });
  return copy;
}

export function disposeOwnMaterials(copy) {
  const seen = new Set();
  copy.traverse((object) => {
    if (!object.material) return;
    for (const material of [].concat(object.material)) {
      if (seen.has(material)) continue;
      seen.add(material);
      material.dispose();
    }
  });
  return seen.size;
}
