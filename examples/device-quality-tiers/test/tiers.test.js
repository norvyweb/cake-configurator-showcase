import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyDevice } from "../src/classify.js";
import { createResolutionGovernor } from "../src/resolutionGovernor.js";

test("a software renderer is always low tier", () => {
  const result = classifyDevice({ renderer: "ANGLE (Google, SwiftShader Device)", deviceMemory: 16, hardwareConcurrency: 16 });
  assert.equal(result.tier, "low");
  assert.equal(result.settings.shadows, false);
});

test("a strong desktop is high tier and keeps its reasons", () => {
  const result = classifyDevice({
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)", maxTextureSize: 16384,
    deviceMemory: 8, hardwareConcurrency: 12, devicePixelRatio: 1,
  });
  assert.equal(result.tier, "high");
  assert.equal(result.score, 3);
  assert.equal(result.reasons.length, 3);
});

test("a small low-memory phone is low tier", () => {
  const result = classifyDevice({
    renderer: "Mali-400 MP", maxTextureSize: 4096, deviceMemory: 2, hardwareConcurrency: 4,
    coarsePointer: true, viewportWidth: 390, devicePixelRatio: 3,
  });
  assert.equal(result.tier, "low");
  assert.equal(result.settings.pixelRatio, 1);
});

test("unknown signals fall back to medium and the pixel ratio is capped", () => {
  const result = classifyDevice({ devicePixelRatio: 3 });
  assert.equal(result.tier, "medium");
  assert.equal(result.settings.pixelRatio, 1.5);
});

test("the texture cap never exceeds what the GPU supports", () => {
  const result = classifyDevice({ renderer: "Apple M2", deviceMemory: 8, hardwareConcurrency: 8, maxTextureSize: 2048 });
  assert.equal(result.settings.maxTextureSize, 2048);
});

test("governor steps down under load, waits, then recovers", () => {
  const g = createResolutionGovernor({ min: 1, max: 2, window: 4, cooldown: 3, budgetMs: 16 });
  for (let i = 0; i < 4; i++) g.frame(30);
  assert.equal(g.pixelRatio, 1.75);
  for (let i = 0; i < 3; i++) g.frame(30); // cooldown: no change
  assert.equal(g.pixelRatio, 1.75);
  for (let i = 0; i < 4; i++) g.frame(5);
  assert.equal(g.pixelRatio, 2);
});

test("governor stays inside its bounds", () => {
  const g = createResolutionGovernor({ min: 1, max: 1.5, window: 2, cooldown: 0, budgetMs: 16 });
  for (let i = 0; i < 40; i++) g.frame(100);
  assert.equal(g.pixelRatio, 1);
  assert.throws(() => createResolutionGovernor({ min: 0, max: 1 }), RangeError);
});
