# Engineering notes

Some of the problems we ran into while building Cake Composer, and the general idea behind the
fix. The product code isn't published; where an idea can be shown on its own, there is a small
sample in `examples/` written from scratch for this repository.

None of the numbers below come from the product. They come from the samples and you can
reproduce them with the commands in each README.

## Clicking an option froze the view for a moment

Each finish or pattern ended up as a new material, and a new combination of material features
means a new shader program. Dispose the material and three.js drops the program; pick the option
again and the program gets compiled and linked again. On Windows, where Chrome and Edge run WebGL
on top of Direct3D 11, that link is slow enough to see.

The fix is to compile once and keep it: reuse materials per combination and change colours on
the existing material instead of making a new one.

Sample: [webgl-shader-cache](examples/webgl-shader-cache/). Same 40 switches, 40 program links
without the pool, 8 with it.

## Phones went blank

Detailed models came with 2K and 4K textures. A 4096 × 4096 texture takes around 85 MiB of GPU
memory once uploaded with mipmaps, whatever the file size. A few of those and a phone runs out,
the browser drops the WebGL context and the view is gone.

So textures get a size budget per device, the pixel ratio is capped, and files are optimised
before they ever reach the browser.

Samples: [glb-runtime-safety](examples/glb-runtime-safety/) and
[device-quality-tiers](examples/device-quality-tiers/).

## Undo that feels right

Recording every state change gives sixty undo steps for one slider drag, empty steps when you
pick what was already picked, and steps for opening a panel. Undo should follow what a person
thinks of as one change: keep screen state out of the document, skip no-op changes, merge quick
changes to the same control, and group actions that change several things at once.

Sample: [undo-redo-store](examples/undo-redo-store/).

## Arabic first, online and in the shop

Most customers read right to left, pay in currencies with three decimals, and some order on a
shared touch screen in the shop with no physical keyboard. Right-to-left is treated as a layout of
its own, not a mirror added at the end. Names and numbers inside Arabic text are isolated so they
don't scramble the sentence, currency precision comes from ISO 4217, and the shared screen resets
itself when a customer walks away.

Sample: [rtl-kiosk-kit](examples/rtl-kiosk-kit/).

## The price the bakery can trust

Anything computed only in the browser can be changed by whoever is using it. The price shown
while designing is a preview; the server works the price out again from the submitted design,
and that is the price used for the order and the payment.

No sample for this one.
