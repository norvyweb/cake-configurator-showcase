import { test } from "node:test";
import assert from "node:assert/strict";
import { countLinks } from "../src/countLinks.js";

test("counts calls, forwards them and can be restored", () => {
  const linked = [];
  const gl = { linkProgram(program) { linked.push(program); } };
  const original = gl.linkProgram;
  const counter = countLinks(gl);
  gl.linkProgram("p1");
  gl.linkProgram("p2");
  assert.equal(counter.read(), 2);
  assert.deepEqual(linked, ["p1", "p2"]);
  counter.reset();
  assert.equal(counter.read(), 0);
  counter.restore();
  assert.equal(gl.linkProgram, original);
});
