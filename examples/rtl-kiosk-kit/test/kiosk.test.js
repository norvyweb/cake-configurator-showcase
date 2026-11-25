import { test } from "node:test";
import assert from "node:assert/strict";
import { createIdleMachine } from "../src/idleMachine.js";
import { formatMoney, fromMinor, minorDigits, toMinor } from "../src/money.js";
import { dirForInput, firstStrongDirection, isolate, template } from "../src/bidi.js";
import { applyKey } from "../src/keyboard/editing.js";
import { LAYOUTS } from "../src/keyboard/layouts.js";

function clock() {
  let t = 0;
  return { now: () => t, advance: (ms) => (t += ms) };
}

test("idle machine: active, prompt, expired, and back on touch", () => {
  const c = clock();
  const changes = [];
  const m = createIdleMachine({ promptAfterMs: 60_000, resetAfterMs: 75_000, now: c.now, onChange: (s) => changes.push(s) });
  c.advance(59_000);
  assert.equal(m.tick(), "active");
  c.advance(1_000);
  assert.equal(m.tick(), "prompt");
  assert.equal(m.secondsToReset, 15);
  c.advance(15_000);
  assert.equal(m.tick(), "expired");
  m.touch();
  assert.equal(m.status, "active");
  assert.deepEqual(changes, ["prompt", "expired", "active"]);
});

test("idle machine: hold keeps it active, release restarts the countdown", () => {
  const c = clock();
  const m = createIdleMachine({ promptAfterMs: 1000, resetAfterMs: 2000, now: c.now });
  m.hold();
  c.advance(10_000);
  assert.equal(m.tick(), "active");
  m.release();
  c.advance(1500);
  assert.equal(m.tick(), "prompt");
  assert.throws(() => createIdleMachine({ promptAfterMs: 5, resetAfterMs: 5 }), RangeError);
});

test("money: decimals come from ISO 4217 via Intl", () => {
  assert.equal(minorDigits("KWD"), 3);
  assert.equal(minorDigits("BHD"), 3);
  assert.equal(minorDigits("OMR"), 3);
  assert.equal(minorDigits("SAR"), 2);
  assert.equal(minorDigits("AED"), 2);
  assert.equal(minorDigits("MAD"), 2);
  assert.equal(toMinor(12.5, "KWD"), 12500);
  assert.equal(toMinor(0.1 + 0.2, "AED"), 30);
  assert.equal(toMinor(-1.005, "SAR"), -101);
  assert.equal(fromMinor(12500, "KWD"), 12.5);
});

test("money: Western or Arabic-Indic digits on request", () => {
  const latn = formatMoney(12500, { currency: "KWD", locale: "ar-KW", digits: "latn" });
  const arab = formatMoney(12500, { currency: "KWD", locale: "ar-KW", digits: "arab" });
  assert.match(latn, /12[.,٫]500/);
  assert.match(arab, /١٢٫٥٠٠/);
});

test("bidi: direction detection and isolation", () => {
  assert.equal(firstStrongDirection("123 كيكة"), "rtl");
  assert.equal(firstStrongDirection("Sara سارة"), "ltr");
  assert.equal(firstStrongDirection("+212 600"), "neutral");
  assert.equal(dirForInput("+212"), "rtl");
  assert.equal(isolate("A-17"), "⁨A-17⁩");
  assert.equal(template("طلب رقم {id} باسم {name}", { id: "A-17", name: "Sara" }), "طلب رقم ⁨A-17⁩ باسم ⁨Sara⁩");
  assert.equal(template("{missing}", {}), "{missing}");
});

test("keyboard: insert, shift once, backspace by code point, done, switch layout", () => {
  let f = applyKey({ value: "", caret: 0 }, "س");
  assert.deepEqual(f, { value: "س", caret: 1, shift: false });
  f = applyKey({ value: "ab", caret: 1, shift: true }, "x");
  assert.deepEqual(f, { value: "aXb", caret: 2, shift: false });
  f = applyKey({ value: "a😀", caret: 2 }, { cmd: "backspace" });
  assert.deepEqual(f, { value: "a", caret: 1, shift: false });
  assert.equal(applyKey({ value: "x", caret: 1 }, { cmd: "enter" }).done, true);
  assert.equal(applyKey({ value: "", caret: 0 }, { cmd: "layout:en" }).layout, "en");
  assert.equal(applyKey({ value: "", caret: 0 }, "لا").value, "لا");
});

test("layouts: every row is non-empty and every command has a label", () => {
  for (const [name, layout] of Object.entries(LAYOUTS)) {
    assert.ok(["rtl", "ltr"].includes(layout.dir), name);
    for (const row of layout.rows) {
      assert.ok(row.length > 0, name);
      for (const key of row) if (typeof key !== "string") assert.ok(key.cmd && key.label, `${name}: ${key.cmd}`);
    }
  }
});
