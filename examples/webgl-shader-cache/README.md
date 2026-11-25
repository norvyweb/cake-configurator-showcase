# WebGL shader cache

> Written from scratch for this repository as a teaching example. It is not code from Cake Composer.

## The problem

A product configurator lets people flip between options: matte or glossy, with or without a
pattern, one finish or another. In three.js each distinct combination of material features is
compiled into its own GPU shader program. When a material is disposed and no other material
uses its program, three.js deletes the program. If the customer later picks that option again,
the program is compiled and **linked again**.

Linking is the slow part of shader compilation, and on some platforms it is very slow: browsers
on Windows usually run WebGL through ANGLE on Direct3D 11, where a link can take long enough to
freeze a frame. A configurator that rebuilds its materials on every click therefore stutters on
exactly the interaction it exists for.

## The approach

Keep one live material per variant instead of disposing and rebuilding it.

- `src/materialPool.js` is a keyed pool with least-recently-used eviction. `acquire(key)` returns
  the existing material for a variant or builds it once. Past `capacity`, the variant used least
  recently is disposed, so memory stays bounded when the number of combinations is large.
- `src/countLinks.js` wraps `gl.linkProgram` and counts calls. Link counts do not depend on the
  speed of the machine, so they can be compared between runs, browsers and CI, where wall-clock
  timings cannot.

Colour changes do not need a new program: change `material.color` on the pooled material rather
than making a new variant key for each colour.

## Usage

```js
import { MaterialPool } from "./src/materialPool.js";

const pool = new MaterialPool({
  capacity: 24,
  create: (key) => buildMaterialFor(key), // your factory
});

mesh.material = pool.acquire("glossy|pattern-on");
// on teardown
pool.clear();
```

## Tests and measurement

```sh
npm install          # from the repository root
npm test             # unit tests (Node 18.17+)
npm run bench        # headless Chromium; set CHROME_PATH to use an installed Chrome
```

The benchmark switches one mesh through 8 material variants (flat shading × vertex colours ×
alpha cut-out), 5 rounds, and counts program links. Result of a run on 25 Nov 2026
(Chrome, SwiftShader software WebGL, three.js 0.170):

| Mode | Variants | Switches | Program links | Programs alive at the end |
| --- | --- | --- | --- | --- |
| recreate (dispose on every switch) | 8 | 40 | 40 | 1 |
| pool | 8 | 40 | 8 | 8 |

The counts are deterministic for a given three.js version. The benchmark does not report times:
under software rendering they say nothing about real GPUs. To see the time cost on your own
hardware, open `bench/index.html` through any static server in a normal browser with the
performance panel recording.

## Limitations and compatibility

- Each pooled variant holds its program and uniforms in GPU memory. Choose `capacity` from the
  number of variants people actually switch between, not from the total number possible.
- A material shared by several meshes is shared state: recolour a clone if only one mesh should
  change (see the `glb-runtime-safety` sample).
- Pre-compiling with `renderer.compile()` or `compileAsync()` is complementary: it moves the first
  link out of the interaction; the pool stops the later ones.
- Tested with three.js 0.170 in Chromium. The pool itself has no three.js dependency.
