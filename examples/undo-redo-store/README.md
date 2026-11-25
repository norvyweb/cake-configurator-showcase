# Undo/redo store

> Written from scratch for this repository as a teaching example. It is not code from Cake Composer.

## The problem

In a configurator, undo must feel natural:

- Dragging a colour slider for two seconds is one change, not sixty.
- Opening a panel, selecting an item or orbiting the camera is not a change at all.
- Choosing the option that is already selected should not create an empty step.
- Some actions change several things at once (switching a template) and must undo together.
- History must stay small even when the document is large.

## The approach

`src/history.js`, a framework-neutral store of about 100 lines with no dependencies:

| Need | How it is met |
| --- | --- |
| Small memory | The document is treated as immutable. History keeps references to past states; unchanged branches are the same objects in every step, so a step costs only what changed. A `limit` bounds the number of steps. |
| One step per drag | `commit(next, { coalesce: "some-key" })`: commits with the same key within `coalesceMs` merge into the step before. |
| No empty steps | An `isEqual` option (identity by default) drops commits that change nothing. |
| Grouped changes | `transaction(fn)`: every commit inside is one step; nesting is allowed. |
| UI state excluded | By design: keep panels, selection and camera outside the document. |
| Testable timing | The clock is injected (`now`). |

## Usage

```js
import { createHistory } from "./src/history.js";

const history = createHistory(initialDesign, { limit: 100, coalesceMs: 600 });
history.subscribe((design) => render(design));

// a discrete choice
history.commit({ ...history.state, shape: "square" });

// a slider: one undo step for the whole drag
slider.oninput = (e) => history.commit(setColor(history.state, e.target.value), { coalesce: "color" });

// several changes as one step
history.transaction(() => {
  history.commit(applyTemplate(history.state, template));
  history.commit(resetDecorations(history.state));
});

undoButton.onclick = () => history.undo();
```

With React, read `history.state` through `useSyncExternalStore(history.subscribe, () => history.state)`.

## Tests

```sh
npm test   # 8 tests: undo/redo, redo cleared by a new commit, no-op commits, coalescing window,
           # nested transactions, step limit and structural sharing, subscriptions, reset
```

## Limitations and compatibility

- The store relies on immutable updates. Mutating `history.state` in place corrupts every step
  that shares the mutated object. Freeze states in development if the codebase is mixed.
- Coalescing is by key and time, not by intent: two different sliders need two keys.
- History lives in memory. Persist the document, not the history, if a draft must survive reloads.
- ES2020; runs in browsers and Node 18+.
