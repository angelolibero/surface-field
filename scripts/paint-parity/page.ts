/* ═══════════════════════════════════════════════════════════════════════════
 *  THE PAGE HALF: THE REAL ENGINE, A CLOCK THAT ONLY MOVES WHEN TOLD, AND
 *  THE PIXELS OF BOTH CANVASES READ BACK THE SAME WAY WHATEVER DREW THEM.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bundled by `capture.cjs` with esbuild and run in a hidden window. It
 * exposes `window.paintParity.run(sceneName)`, which builds fresh
 * canvases, starts `startSurfaceField` against an env whose `now`, `frame`
 * and timers belong to this file, plays the scene, and returns the dots and
 * fabric pixels as base64 straight RGBA.
 *
 * DETERMINISM. Time: `now` is a counter advanced only by `step`, in frames of
 * FRAME_MS, and the engine's `frame` and `setTimer` callbacks run only from
 * `step`, timers first in due order. `requestAnimationFrame` and real timers
 * are never handed to the engine. Randomness: the engine calls `Math.random`
 * in two places, the trace id (never drawn) and `pickTarget`, the wander,
 * which the scenes switch off. `Math.random` is still replaced by a seeded
 * generator, reset per scene, so a scene that turned the wander on would stay
 * reproducible.
 */
import { startSurfaceField, SEED_FG, SEED_PRIMARY, type SurfaceFieldEnv, type SurfaceFieldOptions, type SurfaceFieldRgb } from "../../src/engine";
import { scenes, type Harness } from "./scenes";

/* 16 and not 1000 / 60: an integer frame keeps every time a scene names on
   the frame grid, and the engine's own easing is written against elapsed
   time, so the picture a scene reaches does not depend on the exact rate. */
const FRAME_MS = 16;
/* Not 0: the engine reads `now || env.now()` in places, so a clock at 0
   would be read as "no clock yet". */
const T0 = 1000;

/* The colours `env.readColor` answers with. Light is the engine's own seed,
   which is what a host on light paper resolves to; dark is a light grey
   foreground with a warm tint, as a dark host would post. */
const THEMES: Record<"light" | "dark", { fg: SurfaceFieldRgb; primary: SurfaceFieldRgb }> = {
  light: { fg: [...SEED_FG] as SurfaceFieldRgb, primary: [...SEED_PRIMARY] as SurfaceFieldRgb },
  dark: { fg: [236, 236, 236], primary: [251, 146, 60] },
};

/* The component's defaults (SurfaceField.tsx), with the wander off and the
   fabric on; see scenes.ts. `lineRadius` is its default, focusRadius / 4. */
const BASE: SurfaceFieldOptions = {
  gap: 22,
  focusRadius: 250,
  lineRadius: 250 * 0.25,
  maxOpacity: 0.26,
  baseOpacity: 0.05,
  tint: 0.22,
  tintHueVar: undefined,
  rippleSpeed: 0.6,
  rippleWidth: 38,
  surfacePadding: 0,
  rippleBoost: 0.14,
  rippleGrow: 0.3,
  ripplePush: 6,
  cursorPush: 0,
  cursorPushRadius: 110,
  connected: true,
  breathe: 1,
  breatheRate: 1,
  still: false,
  wander: false,
  prefersReduced: false,
  focused: true,
  workArea: false,
  viewport: undefined,
};

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* Every canvas is read the same way: drawn with `copy` into a CPU-backed 2D
   canvas of the same backing size and read with getImageData, so both runs
   go through the same unpremultiply and a difference between them is a
   difference in what the engine drew. */
function readBack(source: HTMLCanvasElement | null) {
  if (!source || !source.width || !source.height) return null;
  const scratch = document.createElement("canvas");
  scratch.width = source.width;
  scratch.height = source.height;
  const c = scratch.getContext("2d", { willReadFrequently: true })!;
  c.globalCompositeOperation = "copy";
  c.drawImage(source, 0, 0);
  const data = c.getImageData(0, 0, source.width, source.height).data;
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < data.length; i += CHUNK) binary += String.fromCharCode.apply(null, data.subarray(i, i + CHUNK) as unknown as number[]);
  return { width: source.width, height: source.height, rgba: btoa(binary) };
}

function run(name: string) {
  const scene = scenes.find(s => s.name === name);
  if (!scene) throw new Error(`no scene "${name}"`);
  const width = scene.width ?? 960;
  const height = scene.height ?? 600;
  const dpr = scene.dpr ?? 1;
  let theme = scene.theme ?? "light";

  const realRandom = Math.random;
  Math.random = mulberry32(0x5eed);

  document.body.replaceChildren();
  const make = () => {
    const c = document.createElement("canvas");
    c.style.cssText = `position:absolute;left:0;top:0;width:${width}px;height:${height}px`;
    document.body.append(c);
    return c;
  };
  const options: SurfaceFieldOptions = { ...BASE, ...scene.options };
  const fabric = options.connected ? make() : null;
  const dots = make();

  let clock = T0;
  let nextHandle = 1;
  const frames = new Map<number, (time: number) => void>();
  const timers = new Map<number, { due: number; callback: () => void }>();
  const box = { left: 0, top: 0, right: width, bottom: height, width, height };
  const env: SurfaceFieldEnv = {
    canvas: dots,
    fabric,
    box: () => ({ ...box }),
    dpr: () => dpr,
    now: () => clock,
    frame: callback => { const h = nextHandle++; frames.set(h, callback); return h; },
    cancelFrame: handle => { frames.delete(handle); },
    setTimer: (callback, ms) => { const h = nextHandle++; timers.set(h, { due: clock + Math.max(0, ms), callback }); return h; },
    clearTimer: handle => { timers.delete(handle); },
    readColor: () => ({ fg: [...THEMES[theme].fg] as SurfaceFieldRgb, primary: [...THEMES[theme].primary] as SurfaceFieldRgb }),
    readTintHue: () => null,
    sceneOrigin: () => ({ x: 0, y: 0 }),
  };

  const engine = startSurfaceField(env, options, { pending: { current: [] }, floor: { current: null } });
  if (!engine) throw new Error("startSurfaceField returned null: the canvas gave no context");

  /* ═══ EVERY FRAME IS FLUSHED, AS IT IS ON SCREEN ════════════════════════
     On screen each frame is its own task and its drawing is rasterised and
     committed before the next one. Here a whole scene plays in one task, and
     the GPU rasteriser then batches several frames' drawing into one flush,
     which moves edge pixels of single dots by a coverage step or two: an
     engine that flushes per frame (one that copies a kept picture to the
     canvas every frame) would differ from one that does not for reasons the
     screen never shows. So every frame ends with a read of both canvases.
     `drawImage` into a 1x1 canvas and not `getImageData`: a read-back can
     move a 2D canvas off GPU raster, which changes the pixels it measures. */
  const sink = new OffscreenCanvas(1, 1).getContext("2d")!;
  const flush = () => { for (const c of [dots, fabric]) if (c?.width) sink.drawImage(c, 0, 0, 1, 1); };

  let frameCount = 0;
  const tick = () => {
    clock += FRAME_MS;
    /* Timers first, earliest due first, handle order breaking ties: a timer
       set for this frame is how the engine's doze asks for it. */
    for (;;) {
      let pick = 0, due = Infinity;
      for (const [h, t] of timers) if (t.due <= clock && (t.due < due || (t.due === due && h < pick))) { pick = h; due = t.due; }
      if (!pick) break;
      const t = timers.get(pick)!;
      timers.delete(pick);
      t.callback();
    }
    const due = [...frames.entries()].sort((a, b) => a[0] - b[0]);
    frames.clear();
    for (const [, callback] of due) callback(clock);
    flush();
    frameCount++;
  };
  const pointer = (x: number, y: number, buttons: number) => ({
    pointerId: 1, clientX: x, clientY: y, buttons, button: 0, pointerType: "mouse", inRoot: true, related: false,
  });
  const h: Harness = {
    engine,
    get at() { return clock - T0; },
    step(ms) { const end = clock + ms; while (clock < end) tick(); },
    until(ms) { while (clock - T0 < ms) tick(); },
    move(x, y) { engine.pointerMove(pointer(x, y, 0)); },
    down(x, y) { engine.pointerDown(pointer(x, y, 1)); },
    up(x, y) { engine.pointerUp(pointer(x, y, 0)); },
    signal(signal) { engine.signal(signal); },
    setTheme(next) { theme = next; },
    wipe() {
      for (const c of [dots, fabric]) {
        const x = c?.getContext("2d");
        if (!c || !x) continue;
        x.save();
        x.setTransform(1, 0, 0, 1, 0, 0);
        x.globalCompositeOperation = "source-over";
        x.fillStyle = "#000";
        x.fillRect(0, 0, c.width, c.height);
        x.restore();
      }
    },
  };

  try {
    engine.begin();
    scene.play(h);
    return {
      scene: scene.name,
      width, height, dpr,
      theme,
      time: clock - T0,
      frames: frameCount,
      dots: readBack(dots),
      fabric: readBack(fabric),
    };
  } finally {
    engine.dispose();
    Math.random = realRandom;
  }
}

(window as unknown as { paintParity: unknown }).paintParity = {
  scenes: scenes.map(s => ({ name: s.name, about: s.about })),
  /* An error comes back as a value: `executeJavaScript` would otherwise
     replace its message with a generic one. */
  run: (name: string) => {
    try { return run(name); } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
  },
};
