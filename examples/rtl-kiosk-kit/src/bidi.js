// A Latin name or an order number inside an Arabic sentence can pull punctuation to the wrong
// side. Wrapping it in isolate marks (FSI ... PDI) fixes that.
const FSI = "⁨";
const PDI = "⁩";

const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/u;
const LTR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/u;

export function firstStrongDirection(text) {
  for (const ch of text) {
    if (RTL.test(ch)) return "rtl";
    if (LTR.test(ch)) return "ltr";
  }
  return "neutral";
}

export const isolate = (value) => `${FSI}${value}${PDI}`;

// template("مرحبا {name}", { name: "Sara" })
export function template(text, values) {
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in values ? isolate(String(values[key])) : match));
}

export function dirForInput(value, fallback = "rtl") {
  const direction = firstStrongDirection(value);
  return direction === "neutral" ? fallback : direction;
}
