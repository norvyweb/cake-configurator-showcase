export function fitWithin(width, height, max) {
  if (!(width > 0 && height > 0)) return { width: 0, height: 0, scale: 1 };
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height, scale: 1 };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

// Rough GPU size of an RGBA8 texture. Mipmaps add about a third.
export function estimateBytes(width, height, { mipmaps = true } = {}) {
  const base = width * height * 4;
  return Math.round(mipmaps ? base * (4 / 3) : base);
}

export const formatMiB = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
