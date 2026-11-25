# RTL kiosk kit

> Written from scratch for this repository as a teaching example. It is not code from Cake Composer.

## The problem

A self-service screen in a shop serves strangers one after another, mostly in Arabic:

- When a customer walks away mid-order, the next one must not see their name or choices.
- There is no physical keyboard, and the system keyboard is often disabled on kiosks.
- Prices must use the right number of decimals: three for the Kuwaiti dinar, two for the
  Saudi riyal, and Western or Arabic-Indic digits depending on the shop.
- A Latin name or an order number inside an Arabic sentence can scramble the punctuation around it.

## The approach

Four small modules, each usable alone:

| File | What it does |
| --- | --- |
| `src/idleMachine.js` | Idle detection as a small state machine (`active` → `prompt` → `expired`), driven by `tick()` and `touch()`, with `hold()` / `release()` for steps that must not time out; `watchInput` connects it to pointer and key events |
| `src/keyboard/` | Layouts as data (Arabic 101 arrangement, English, a phone pad that stays left-to-right), a pure `applyKey` editor working on code points, and `mountKeyboard`, a plain-DOM keyboard of real `<button>`s at least 48 px tall |
| `src/money.js` | Integer minor units; decimals read from Intl's ISO 4217 data, not a hand-kept table; digit system selectable with the `-u-nu-` locale extension |
| `src/bidi.js` | First-strong direction detection, Unicode isolates (FSI/PDI) around embedded values, a `template` helper that isolates every placeholder |

## Usage

```js
import { createIdleMachine, watchInput } from "./src/idleMachine.js";
import { mountKeyboard } from "./src/keyboard/mountKeyboard.js";
import { formatMoney } from "./src/money.js";
import { template } from "./src/bidi.js";

const idle = createIdleMachine({ promptAfterMs: 60_000, resetAfterMs: 75_000, onChange: (s) => s === "expired" && resetOrder() });
watchInput(idle);
// during card payment
idle.hold(); /* … */ idle.release();

mountKeyboard(document.querySelector("#keys"), document.querySelector("#name"), { layout: "ar" });
formatMoney(12500, { currency: "KWD", locale: "ar-KW" });     // "١٢٫٥٠٠ د.ك." (three decimals, Arabic-Indic digits)
template("طلب رقم {id}", { id: "A-17" });                       // the id cannot reorder the sentence
```

Demo: serve this folder with any static server (for example `python -m http.server`) and open
`demo/index.html`. The demo prompts after 8 seconds and resets after 12 so you can watch it.

## Tests

```sh
npm test   # 7 tests: idle states, hold/release, ISO 4217 decimals (KWD, BHD, OMR = 3;
           # SAR, AED, MAD = 2), float-safe rounding, digit systems, bidi detection and
           # isolation, keyboard editing incl. emoji and the لا ligature key
```

The demo page was also loaded in headless Chrome: typing سارة on the on-screen keyboard filled
the field and produced the isolated greeting with no script errors.

## Limitations and compatibility

- Digit and currency output depends on the ICU data of the browser or Node build; exact strings
  can differ between versions (the tests check digits, not whole strings).
- `toMinor` cuts to 12 significant digits before rounding: right for prices, not a replacement
  for decimal arithmetic in accounting.
- Backspace removes one code point; grapheme clusters such as flags need `Intl.Segmenter`.
- The idle machine resets the screen; it does not clear server-side sessions. Do that in
  `onChange` when the state becomes `expired`.
- Requires ES2020 and `Intl.NumberFormat` with currency support (all current browsers, Node 18+).
