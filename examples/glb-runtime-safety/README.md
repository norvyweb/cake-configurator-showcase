# glTF runtime safety

> Written from scratch for this repository as a teaching example. It is not code from Cake Composer.

## The problem

A configurator loads many glTF/GLB models made by different people and tools. Three things go
wrong at run time, mostly on phones:

1. **Texture memory.** A 4096 × 4096 texture uses about 85 MiB of GPU memory once uploaded with
   mipmaps, whatever its file size. A few of them can exhaust a phone's WebGL memory, and the
   browser then loses the WebGL context: the 3D view goes blank.
2. **Colour spaces.** glTF stores colour textures in sRGB and data textures (normal, roughness,
   occlusion) as linear values. Exporters sometimes tag them wrongly, which washes out colours or
   bends lighting.
3. **Shared materials.** `Object3D.clone()` copies the hierarchy but shares material objects, so
   recolouring one placed copy recolours every copy.

## The approach

Small, separate functions, each testable without a browser:

| File | What it does |
| --- | --- |
| `src/textureBudget.js` | `fitWithin` (aspect-correct downscale size) and `estimateBytes` (RGBA8 + mipmaps estimate) |
| `src/downscaleTextures.js` | Finds each distinct texture under a model once and replaces oversize images before upload; the resize function is injected (`canvasResize` for browsers) |
| `src/colorSpaces.js` | `auditColorSpaces` lists mismatches without changing anything; `repairColorSpaces` corrects them and reports a texture used as both colour and data instead of guessing |
| `src/instanceClone.js` | `cloneWithOwnMaterials` gives a copy its own materials while keeping materials that were shared inside the model shared inside the copy; geometry and textures stay shared |

## Usage

```js
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { downscaleTextures, canvasResize } from "./src/downscaleTextures.js";
import { repairColorSpaces } from "./src/colorSpaces.js";
import { cloneWithOwnMaterials } from "./src/instanceClone.js";

const gltf = await new GLTFLoader().loadAsync(url);
downscaleTextures(gltf.scene, { maxSize: 2048, resize: canvasResize }); // before the first render
gltf.scene.traverse((o) => o.material && [].concat(o.material).forEach(repairColorSpaces));

const copy = cloneWithOwnMaterials(gltf.scene);
copy.traverse((o) => o.isMesh && o.material.color.set("#d9a5b3")); // only this copy changes
```

## Tests and measurement

```sh
npm test          # 6 tests with three.js objects in Node, no GPU needed
npm run measure   # memory estimate for an invented texture set
```

`npm run measure` applies the formula in `textureBudget.js` to a synthetic set of six textures
(two at 4096², three at 2048² or 2048 × 1024, one at 1024²). It is arithmetic, not a device
measurement:

| Size cap | Estimated GPU memory | Share of uncapped |
| --- | --- | --- |
| none | 229.3 MiB | 100% |
| 2048 px | 101.3 MiB | 44% |
| 1024 px | 29.3 MiB | 13% |
| 512 px | 7.3 MiB | 3% |

## Limitations and compatibility

- Downscaling at run time saves GPU memory, not download time. Resize and compress files offline
  as well (for example with glTF-Transform or gltfpack, using KTX2/Basis textures).
- Compressed GPU textures (KTX2) have no `width`/`height` image to redraw; they are counted but
  should be sized offline.
- `canvasResize` needs a DOM or `OffscreenCanvas`; it is not available in Node.
- The estimate ignores driver padding and compression; use it to compare options.
- Colour-space constants follow three.js r152+ (`SRGBColorSpace`, `NoColorSpace`). Tested with 0.170.
