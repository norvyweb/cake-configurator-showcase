// Made-up device profiles, just to see what the classifier decides.
import { classifyDevice } from "../src/classify.js";

const PROFILES = [
  ["Headless CI browser", { renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))", maxTextureSize: 8192 }],
  ["Desktop, discrete GPU", { renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)", maxTextureSize: 16384, deviceMemory: 8, hardwareConcurrency: 12, devicePixelRatio: 1 }],
  ["Laptop, integrated GPU", { renderer: "ANGLE (Intel, Intel(R) UHD Graphics)", maxTextureSize: 16384, deviceMemory: 8, hardwareConcurrency: 8, devicePixelRatio: 1.25 }],
  ["Recent phone", { renderer: "Adreno (TM) 730", maxTextureSize: 16384, deviceMemory: 8, hardwareConcurrency: 8, devicePixelRatio: 3, coarsePointer: true, viewportWidth: 412 }],
  ["Older phone", { renderer: "Mali-400 MP", maxTextureSize: 4096, deviceMemory: 2, hardwareConcurrency: 4, devicePixelRatio: 2, coarsePointer: true, viewportWidth: 360 }],
  ["Browser hiding the GPU", { maxTextureSize: 16384, hardwareConcurrency: 8, devicePixelRatio: 2 }],
];

console.table(PROFILES.map(([name, signals]) => {
  const { tier, score, settings } = classifyDevice(signals);
  return { profile: name, tier, score, pixelRatio: settings.pixelRatio, shadows: settings.shadows, textureCap: settings.maxTextureSize };
}));
