// Example values. Replace them with numbers from your own analytics.
export const EXAMPLE_POLICY = {
  softwareRenderer: /swiftshader|llvmpipe|softpipe|software|basic render/i,
  strongGpu: /nvidia|geforce|radeon rx|apple m\d|arc a\d/i,
  weakGpu: /mali-[34]\d\d|adreno \(tm\) [34]\d\d|powervr|intel\(r\) hd graphics [2-5]\d{2}/i,
  smallScreenWidth: 768,
  lowMemoryGiB: 2,
  highMemoryGiB: 8,
  lowCores: 4,
  highCores: 8,
  minTextureSize: 4096,
  highAt: 2,
  lowAt: -2,
  settings: {
    low: { maxPixelRatio: 1, antialias: false, shadows: false, shadowMapSize: 0, maxTextureSize: 1024 },
    medium: { maxPixelRatio: 1.5, antialias: true, shadows: true, shadowMapSize: 1024, maxTextureSize: 2048 },
    high: { maxPixelRatio: 2, antialias: true, shadows: true, shadowMapSize: 2048, maxTextureSize: 4096 },
  },
};

export function classifyDevice(signals, policy = EXAMPLE_POLICY) {
  const renderer = signals.renderer || "";
  if (policy.softwareRenderer.test(renderer)) {
    return result("low", -99, ["software renderer"], policy, signals);
  }

  let score = 0;
  const reasons = [];
  const add = (points, why) => {
    score += points;
    reasons.push(`${points > 0 ? "+" : ""}${points} ${why}`);
  };

  if (policy.strongGpu.test(renderer)) add(1, "fast GPU family");
  if (policy.weakGpu.test(renderer)) add(-1, "slow GPU family");
  if (!renderer) reasons.push("0 GPU name hidden");
  if (signals.maxTextureSize && signals.maxTextureSize < policy.minTextureSize) add(-1, "small max texture size");

  const memory = signals.deviceMemory;
  if (memory != null && memory <= policy.lowMemoryGiB) add(-1, "low memory");
  if (memory != null && memory >= policy.highMemoryGiB) add(1, "plenty of memory");

  const cores = signals.hardwareConcurrency;
  if (cores != null && cores <= policy.lowCores) add(-1, "few cores");
  if (cores != null && cores >= policy.highCores) add(1, "many cores");

  if (signals.coarsePointer && signals.viewportWidth < policy.smallScreenWidth) add(-1, "phone-sized touch screen");
  if (signals.saveData) add(-2, "data saver on");

  const tier = score >= policy.highAt ? "high" : score <= policy.lowAt ? "low" : "medium";
  return result(tier, score, reasons, policy, signals);
}

function result(tier, score, reasons, policy, signals) {
  const base = policy.settings[tier];
  return {
    tier,
    score,
    reasons,
    settings: {
      ...base,
      pixelRatio: Math.min(signals.devicePixelRatio || 1, base.maxPixelRatio),
      maxTextureSize: Math.min(base.maxTextureSize, signals.maxTextureSize || base.maxTextureSize),
    },
  };
}
