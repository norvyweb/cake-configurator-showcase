import { test } from "node:test";
import assert from "node:assert/strict";
import { createHistory } from "../src/history.js";

const doc = { shape: "round", layers: [{ size: 20, color: "#ffffff" }] };
const withColor = (d, color) => ({ ...d, layers: [{ ...d.layers[0], color }] });

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

test("undo and redo walk the steps; a new commit clears redo", () => {
  const h = createHistory(doc);
  h.commit({ ...doc, shape: "square" });
  h.commit({ ...doc, shape: "hexagon" });
  assert.equal(h.undo(), true);
  assert.equal(h.state.shape, "square");
  assert.equal(h.redo(), true);
  assert.equal(h.state.shape, "hexagon");
  h.undo();
  h.commit({ ...doc, shape: "rectangle" });
  assert.equal(h.canRedo, false);
});

test("a commit that changes nothing is ignored", () => {
  const h = createHistory(doc, { isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
  assert.equal(h.commit({ ...doc }), false);
  assert.equal(h.canUndo, false);
});

test("slider drags with one coalesce key become one step", () => {
  const c = clock();
  const h = createHistory(doc, { now: c.now, coalesceMs: 500 });
  for (const color of ["#eeeeee", "#dddddd", "#cccccc"]) {
    h.commit(withColor(h.state, color), { coalesce: "layer0.color" });
    c.advance(100);
  }
  assert.deepEqual(h.depth, { undo: 1, redo: 0 });
  h.undo();
  assert.equal(h.state.layers[0].color, "#ffffff");
});

test("a pause longer than the window starts a new step", () => {
  const c = clock();
  const h = createHistory(doc, { now: c.now, coalesceMs: 500 });
  h.commit(withColor(h.state, "#eeeeee"), { coalesce: "layer0.color" });
  c.advance(800);
  h.commit(withColor(h.state, "#dddddd"), { coalesce: "layer0.color" });
  assert.equal(h.depth.undo, 2);
});

test("a transaction is one step, even when nested", () => {
  const h = createHistory(doc);
  h.transaction(() => {
    h.commit({ ...h.state, shape: "square" });
    h.transaction(() => h.commit(withColor(h.state, "#000000")));
  });
  assert.equal(h.depth.undo, 1);
  h.undo();
  assert.equal(h.state, doc);
});

test("history keeps at most `limit` steps and shares unchanged branches", () => {
  const h = createHistory({ n: 0, big: { untouched: true } }, { limit: 3 });
  for (let n = 1; n <= 10; n++) h.commit({ ...h.state, n });
  assert.equal(h.depth.undo, 3);
  const current = h.state;
  h.undo();
  assert.equal(h.state.big, current.big); // same object, not a copy
});

test("subscribers hear every change and can unsubscribe", () => {
  const h = createHistory(doc);
  const seen = [];
  const off = h.subscribe((s) => seen.push(s.shape));
  h.commit({ ...doc, shape: "square" });
  h.undo();
  off();
  h.redo();
  assert.deepEqual(seen, ["square", "round"]);
});

test("reset forgets the past", () => {
  const h = createHistory(doc);
  h.commit({ ...doc, shape: "square" });
  h.reset(doc);
  assert.equal(h.canUndo, false);
  assert.equal(h.canRedo, false);
});
