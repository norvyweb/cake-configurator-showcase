# Device quality tiers

> Written from scratch for this repository as a teaching example. It is not code from Cake Composer. The thresholds are examples.

## The problem

The same 3D product view must open on a recent desktop, an older Android phone and a browser
that hides its GPU. Rendering at full quality everywhere crashes or overheats low-end phones;
rendering at low quality everywhere wastes good hardware. The decision has to be made before the
first frame, from incomplete information, and then corrected while the page runs.

## The approach

Two independent parts:

1. **A first guess from device signals** (`src/classify.js`). Each signal adds or removes a point
   and records a human-readable reason: GPU family, maximum texture size, device memory, CPU
   cores, a phone-sized touch screen, the user's data-saver setting. A software renderer
   (SwiftShader, llvmpipe) always gives the low tier. The score maps to `low`, `medium` or
   `high`, each with renderer settings (pixel-ratio cap, antialiasing, shadows, texture cap).
   All thresholds live in one `EXAMPLE_POLICY` object to replace with values from your own
   analytics.
2. **A correction from measured frames** (`src/resolutionGovernor.js`). Fed with frame times, it
   lowers the pixel ratio a step when the average stays over budget and raises it when there is
   plenty of headroom, with a cooldown after each change so it does not oscillate.

`src/probe.js` collects the signals in a browser and releases its probe WebGL context at once.

## Usage

```js
import { readSignals } from "./src/probe.js";
import { classifyDevice } from "./src/classify.js";
import { createResolutionGovernor } from "./src/resolutionGovernor.js";

const { tier, reasons, settings } = classifyDevice(readSignals());
const renderer = new THREE.WebGLRenderer({ antialias: settings.antialias });
renderer.setPixelRatio(settings.pixelRatio);
renderer.shadowMap.enabled = settings.shadows;

const governor = createResolutionGovernor({ min: 1, max: settings.pixelRatio });
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const ratio = governor.frame(now - last);
  last = now;
  if (ratio !== renderer.getPixelRatio()) renderer.setPixelRatio(ratio);
  renderer.render(scene, camera);
});
```

For a scene rendered on demand (only when something changes), feed the governor only the frames
that were actually rendered.

## Tests and measurement

```sh
npm test          # 7 tests
npm run measure   # decisions for six invented device profiles
```

Output of `npm run measure` (the profiles are fictional combinations of public signal values):

| Profile | Tier | Score | Pixel ratio | Shadows | Texture cap |
| --- | --- | --- | --- | --- | --- |
| Headless CI browser | low | software | 1 | no | 1024 |
| Desktop, discrete GPU | high | 3 | 1 | yes | 4096 |
| Laptop, integrated GPU | high | 2 | 1.25 | yes | 4096 |
| Recent phone | medium | 1 | 1.5 | yes | 2048 |
| Older phone | low | −4 | 1 | no | 1024 |
| Browser hiding the GPU | medium | 1 | 1.5 | yes | 2048 |

## Limitations and compatibility

- `navigator.deviceMemory` exists only in Chromium browsers and is rounded; Safari and Firefox
  may mask the GPU string. Missing signals count as neutral, so such devices land in `medium`
  and the governor corrects from there.
- GPU name patterns age quickly. Treat them as hints and keep the list short.
- Changing the pixel ratio resizes the drawing buffer; avoid doing it during a camera animation.
- The governor needs real frames: in a hidden tab browsers pause `requestAnimationFrame`.
