// What a key press does to { value, caret, shift }. The caret counts code points, so an
// emoji is deleted in one go (flags and other clusters would need Intl.Segmenter).
export function applyKey(field, key) {
  const chars = [...field.value];
  const caret = Math.min(Math.max(0, field.caret), chars.length);
  const shift = Boolean(field.shift);

  if (typeof key === "string") {
    const text = shift ? key.toUpperCase() : key;
    const inserted = [...text];
    chars.splice(caret, 0, ...inserted);
    return { value: chars.join(""), caret: caret + inserted.length, shift: false };
  }

  switch (key.cmd) {
    case "backspace":
      if (caret === 0) return { value: field.value, caret, shift };
      chars.splice(caret - 1, 1);
      return { value: chars.join(""), caret: caret - 1, shift };
    case "space":
      return applyKey({ value: field.value, caret, shift: false }, " ");
    case "shift":
      return { value: field.value, caret, shift: !shift };
    case "enter":
      return { value: field.value, caret, shift, done: true };
    default:
      if (key.cmd.startsWith("layout:")) return { value: field.value, caret, shift: false, layout: key.cmd.slice(7) };
      return { value: field.value, caret, shift };
  }
}
