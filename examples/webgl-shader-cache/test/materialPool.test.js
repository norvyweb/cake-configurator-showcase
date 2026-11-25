import { test } from "node:test";
import assert from "node:assert/strict";
import { MaterialPool } from "../src/materialPool.js";

function fakeFactory() {
  const disposed = [];
  const create = (key) => ({ key, dispose: () => disposed.push(key) });
  return { create, disposed };
}

test("builds a material once per key and reuses it", () => {
  const { create } = fakeFactory();
  const pool = new MaterialPool({ create });
  const first = pool.acquire("matte");
  const again = pool.acquire("matte");
  assert.equal(first, again);
  assert.deepEqual(pool.stats, { hits: 1, misses: 1, evictions: 0 });
});

test("evicts and disposes the least recently used key past capacity", () => {
  const { create, disposed } = fakeFactory();
  const pool = new MaterialPool({ create, capacity: 2 });
  pool.acquire("a");
  pool.acquire("b");
  pool.acquire("a"); // a is now the most recent
  pool.acquire("c"); // b is the oldest and goes
  assert.deepEqual(disposed, ["b"]);
  assert.equal(pool.has("a"), true);
  assert.equal(pool.has("b"), false);
  assert.equal(pool.size, 2);
});

test("clear disposes everything", () => {
  const { create, disposed } = fakeFactory();
  const pool = new MaterialPool({ create });
  pool.acquire("a");
  pool.acquire("b");
  pool.clear();
  assert.deepEqual(disposed.sort(), ["a", "b"]);
  assert.equal(pool.size, 0);
});

test("rejects bad options", () => {
  assert.throws(() => new MaterialPool({}), TypeError);
  assert.throws(() => new MaterialPool({ create: () => ({}), capacity: 0 }), RangeError);
});
