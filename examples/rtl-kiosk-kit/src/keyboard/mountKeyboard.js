import { LAYOUTS } from "./layouts.js";
import { applyKey } from "./editing.js";

// Plain DOM keyboard. Keys are real buttons so screen readers announce them.
export function mountKeyboard(container, input, { layout = "ar", onDone = () => {} } = {}) {
  let current = layout;
  let shift = false;

  const root = document.createElement("div");
  root.className = "kbd";
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", "On-screen keyboard");
  container.appendChild(root);

  function caretInCodePoints() {
    return [...input.value.slice(0, input.selectionStart ?? input.value.length)].length;
  }

  function press(key) {
    const result = applyKey({ value: input.value, caret: caretInCodePoints(), shift }, key);
    input.value = result.value;
    const offset = [...result.value].slice(0, result.caret).join("").length;
    input.setSelectionRange?.(offset, offset);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    shift = result.shift;
    if (result.layout) setLayout(result.layout);
    else render();
    if (result.done) onDone(result.value);
  }

  function render() {
    const spec = LAYOUTS[current];
    root.dir = spec.dir;
    root.replaceChildren(
      ...spec.rows.map((row) => {
        const line = document.createElement("div");
        line.className = "kbd-row";
        for (const key of row) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = typeof key === "string" ? "kbd-key" : `kbd-key kbd-${key.cmd.split(":")[0]}`;
          button.textContent = typeof key === "string" ? (shift ? key.toUpperCase() : key) : key.label;
          button.style.flexGrow = String(typeof key === "string" ? 1 : key.width);
          if (typeof key !== "string") button.setAttribute("aria-label", key.cmd);
          // preventDefault keeps focus and caret in the input
          button.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            press(key);
          });
          line.appendChild(button);
        }
        return line;
      }),
    );
  }

  function setLayout(name) {
    if (!LAYOUTS[name]) return;
    current = name;
    shift = false;
    render();
  }

  render();
  return { setLayout, destroy: () => root.remove() };
}
