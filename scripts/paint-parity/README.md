# Paint parity

A harness that proves two versions of the engine draw the same field, pixel
for pixel. It drives the real engine (`startSurfaceField`) through a fixed list
of scenes in a hidden Electron window, on a clock it controls, and writes the
dots canvas and the fabric canvas of every scene as raw RGBA and as PNG. A
second tool compares two such runs and fails on any difference above a gate you
pass on the command line.

Use it before changing how the engine draws: capture the version you start
from, capture your change, compare. A change that should not move a pixel is
proven by a comparison at the default gate (identical bytes), not by looking.

## Files

| File | What it is |
| --- | --- |
| `capture.cjs` | Electron main. Bundles `page.ts` with the package's esbuild, runs every scene, writes the files. |
| `page.ts` | The page half: the deterministic env, the per-frame flush, the read-back. |
| `scenes.ts` | The scene list. Each scene documents itself in its `about`. |
| `compare.cjs` | Plain Node. Two runs in, a table and heatmaps out, exit code 1 on failure. |
| `png.cjs` | A dependency-free PNG writer and the composite used for the ground images. |

Nothing is added to `package.json`. esbuild is taken from `node_modules`,
where it arrives as a dependency of vitest (through vite), so run `npm ci`
first. Electron is any Electron binary you have installed.

## Capture a run

From the package root:

```bash
git show HEAD:src/engine.ts > /tmp/parity/engine-before.ts
electron scripts/paint-parity/capture.cjs --engine=/tmp/parity/engine-before.ts \
  --out=/tmp/parity/before --user-data-dir=/tmp/parity/electron-profile
electron scripts/paint-parity/capture.cjs --out=/tmp/parity/after \
  --user-data-dir=/tmp/parity/electron-profile
```

- `--engine=<file>` (default `src/engine.ts`): the engine under test. Any
  copy of `src/engine.ts` works; its relative imports resolve against `src/`,
  so the rest of the package is the working tree's.
- `--out=<dir>` (required) where the run is written.
- `--scenes=a,b,c` runs only those scenes.
- `--user-data-dir=<dir>` keeps the hidden window's profile out of your own.

The window is never shown. A full run of 31 scenes takes about 6 seconds.

Per scene the run writes:

- `<scene>.dots.rgba`, `<scene>.dots.png`: the dots canvas at its backing size.
- `<scene>.fabric.rgba`, `<scene>.fabric.png`: the fabric canvas (not written
  when the scene has `connected: false`).
- `<scene>.light.png`, `<scene>.dark.png`: fabric, then dots, composited over a
  light ground (250, 250, 250) and a dark one (18, 18, 20).

and one `manifest.json` with each scene's size, device pixel ratio, theme,
clock and frame count. `.rgba` files are straight (unpremultiplied) RGBA, row
major, no header.

Both canvases are read the same way whatever drew them: copied into a
CPU-backed 2D canvas and read with `getImageData`, in the same task as the
last frame, so a difference between two runs is a difference in what the
engine drew.

Every frame also ends with a `drawImage` of both canvases into a 1x1 canvas.
On screen each frame is rasterised and committed on its own; played in one
task, the GPU rasteriser would batch several frames into one flush and move
edge pixels of single dots, so two engines could differ for a reason the
screen never shows. The flush makes each frame rasterise as it does on screen.
It is a `drawImage` and not a `getImageData`, which can move a 2D canvas off
GPU raster and change what it measures.

## Compare two runs

```bash
node scripts/paint-parity/compare.cjs /tmp/parity/before /tmp/parity/after
node scripts/paint-parity/compare.cjs /tmp/parity/before /tmp/parity/after --threshold=2 --allow=0
```

Per scene and per canvas it prints the maximum absolute channel delta and the
number of pixels whose delta is above 0, 2 and 8. A pixel's delta is the
largest of its four channel differences.

- `--threshold=N` (default 0) and `--allow=K` (default 0): a scene and canvas
  FAILS when more than K pixels have a delta above N. The defaults demand
  identical bytes.
- A canvas present in one run and absent in the other, or of another size,
  always fails.
- `--heatmaps=<dir>` (default `<runB>/diff-vs-<runA name>`): one PNG per
  scene and canvas that differs at all. Unchanged pixels are a dim grey of the
  first run's alpha; changed ones are blue (1 to 2), yellow (3 to 8) or red
  (above 8).
- `--json` prints the table as JSON.

Exit code: 0 pass, 1 fail, 2 bad arguments.

## Determinism

- **Time.** The env's `now` is a counter that only `step` advances, in frames
  of 16 ms, starting at 1000 (the engine reads `now || env.now()` in places, so
  0 would read as "no clock"). The engine's `frame` callbacks and `setTimer`
  callbacks run only from `step`: due timers first, earliest first, then the
  frames queued before the tick. No `requestAnimationFrame`, no real timer, no
  `performance.now` reaches the engine.
- **Randomness.** The engine calls `Math.random` in two places: the trace id
  (never drawn) and `pickTarget`, the wander. The scenes set `wander: false`,
  and `Math.random` is replaced anyway by a seeded generator (mulberry32, seed
  `0x5eed`), reset at the start of every scene.
- **Colour.** The env's `readColor` answers fixed triples per theme (light: the
  engine's seed colours; dark: fg (236, 236, 236), primary (251, 146, 60)), and
  Electron is started with `--force-color-profile=srgb`.
- **Fresh state.** Every scene gets new canvases, a new engine and a new
  memory (`pending`, `floor`), and the engine is disposed after capture.

Two captures of the same engine, compared with the default gate (identical
bytes), give worst max delta 0 on every scene and canvas. A tampered copy (one
scene's dots swapped for another's) is caught: max delta 255, 6505 pixels, exit
code 1. The engine that keeps its picture on a retained canvas was compared
this way against the one before it: 59 comparisons, worst max delta 0.

## Scenes

All scenes are 960 x 600 CSS px at device pixel ratio 1 on the light theme
unless the scene says otherwise. Base options are the component's defaults
with `wander: false` and `connected: true`. Times are milliseconds since the
engine started; a capture happens on the first frame at or after the time
named.

| Scene | What it shows |
| --- | --- |
| `rest` | Resting field, breath off, light parked at the centre where it starts. |
| `rest-breath` | Resting field with the default breath, at t = 2000. |
| `light-top-left` | Pointer moved to (140, 110), light settled. |
| `light-centre` | Pointer at (470, 310), settled. |
| `light-edge` | Pointer at (955, 590), the light clipped by two edges. |
| `light-moving` | Pointer from (200, 200) to (700, 420), captured 96 ms after, mid-ease. |
| `ring-64ms`, `ring-400ms`, `ring-900ms` | `engine.ripple(480, 300)`, captured 64, 400 and 900 ms after the frame that started it. |
| `press-ring` | A free press (no work area) at (300, 240), 250 ms later. |
| `held` | Work area on: press at (400, 300) plus a footprint (a 200 x 140 rounded rect), held 600 ms. |
| `held-released` | `held`, then pointer up, captured 180 ms later with the ring leaving. |
| `preview` | A preview rectangle (560, 120)-(860, 300), faded in. |
| `selection` | Scene of a rounded rect, an ellipse and a rect rotated 12 degrees, settled. |
| `selection-fading` | The same shapes 64 ms after they arrive, mid fade. |
| `links-still` | Rect `a` and ellipse `b` with a still link: the default curve lifting the dots, fabric curves. |
| `links-crest` | The same link with `motion: "loop"`: a crest travelling it, t = 1800. |
| `links-points` | A link given as points (a polyline) with `motion: "bounce"`, t = 1300. |
| `breath-still` | A `still` field: only the breath loop, t = 3000. |
| `unconnected` | `connected: false`: dots only, no fabric canvas. |
| `push` | `cursorPush: 10`, dots pushed from the pointer at (480, 300). |
| `camera` | Viewport signal (x -37, y 13, zoom 1.6): lattice rescaled, zoom wave, t = 720. |
| `dark` | Dark theme colours, pointer at (300, 200), breath on, t = 2000. |
| `theme-switch` | Light, then a theme signal to dark at t = 1000, captured at t = 1300. |
| `dpr2` | `light-top-left` at device pixel ratio 2 (backing 1920 x 1200). |
| `dpr2-selection` | `selection` plus a looping link crest, breath on, at device pixel ratio 2. |
| `narrow` | 320 x 700, pointer at (160, 350), a ring 300 ms out. |
| `wide` | 1800 x 360, pointer at (1500, 120), breath on. |
| `fractional-dpr` | 700 x 500 at device pixel ratio 1.5, dots off the pixel grid. |
| `wiped-light-moving`, `wiped-ring-400ms` | `light-moving` and `ring-400ms` with both visible canvases filled black one frame before the capture (a buffer the compositor lost). Each must equal its twin byte for byte: pair the files by hand (`cmp`), the names differ. An engine without a retained picture fails them by design, so leave them out (`--scenes`) when capturing one. |

To add a scene, append it to `scenes.ts`: a name, an `about`, optional size,
dpr, theme and option overrides, and a `play` that uses only the harness's
methods (`step`, `until`, `move`, `down`, `up`, `signal`, `setTheme`,
`wipe`, `engine`).
