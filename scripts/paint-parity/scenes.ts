/* ═══════════════════════════════════════════════════════════════════════════
 *  THE SCENES: EVERY PICTURE THE ENGINE MUST GET RIGHT, EACH ON A FIXED CLOCK.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A scene is a canvas size, a device pixel ratio, a theme, a few option
 * overrides, and a `play` that talks to the engine through its public
 * methods and advances the harness clock. Nothing in here reads real time:
 * `h.step(ms)` and `h.until(ms)` are the only ways time passes, in frames of
 * `FRAME_MS`, so the same scene is the same picture on every run.
 *
 * Times are milliseconds since the engine started (`h.at` is the current
 * one). The base options are the component's defaults with the two things
 * that cannot be deterministic switched off or pinned: `wander` is false (it
 * aims the light with `Math.random`), and `connected` is true so the fabric
 * canvas is exercised in every scene (one scene checks it off).
 */
import type { SurfaceFieldEngine, SurfaceFieldEngineSignal, SurfaceFieldOptions } from "../../src/engine";

export type Harness = {
  engine: SurfaceFieldEngine;
  /** Milliseconds since the engine started. */
  readonly at: number;
  /** Advance the clock by at least `ms`, one frame at a time, firing due timers first. */
  step(ms: number): void;
  /** Advance to the first frame at or after an absolute time. */
  until(ms: number): void;
  move(x: number, y: number): void;
  down(x: number, y: number): void;
  up(x: number, y: number): void;
  signal(signal: SurfaceFieldEngineSignal): void;
  /** Which colours `env.readColor` hands back from now on; send a `theme` signal to make the engine read them. */
  setTheme(theme: "light" | "dark"): void;
  /** Fill both visible canvases with opaque black, behind the engine's back: a buffer the pipeline lost. */
  wipe(): void;
};

export type Scene = {
  name: string;
  about: string;
  width?: number;
  height?: number;
  dpr?: number;
  theme?: "light" | "dark";
  options?: Partial<SurfaceFieldOptions>;
  play(h: Harness): void;
};

/* Three surfaces used by the selection and link scenes, in root CSS px. */
const card = { id: "a", parent: null, left: 120, top: 150, right: 360, bottom: 330, radius: 16 };
const oval = { id: "b", parent: null, left: 600, top: 300, right: 820, bottom: 460, shape: "ellipse" as const };
const tilted = { id: "c", parent: null, left: 520, top: 80, right: 700, bottom: 200, radius: 8, rotation: 12 };

export const scenes: Scene[] = [
  {
    name: "rest",
    about: "Resting field, breath off: the light parked at the centre, where it starts, nothing moving.",
    options: { breathe: 0 },
    play: h => h.until(1500),
  },
  {
    name: "rest-breath",
    about: "Resting field with the default breath, captured at a fixed time (t = 2000 ms).",
    play: h => h.until(2000),
  },
  {
    name: "light-top-left",
    about: "Pointer moved to (140, 110) and the light allowed to arrive and settle.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.move(140, 110); h.until(2000); },
  },
  {
    name: "light-centre",
    about: "Pointer at (470, 310), just off the start point, settled.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.move(470, 310); h.until(2000); },
  },
  {
    name: "light-edge",
    about: "Pointer at (955, 590), the bottom-right corner, so the light is clipped by two edges.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.move(955, 590); h.until(2000); },
  },
  {
    name: "light-moving",
    about: "Pointer moved from (200, 200) to (700, 420) and captured mid-flight, 100 ms after, while the light is still easing.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.move(200, 200); h.step(1500); h.move(700, 420); h.step(96); },
  },
  ...[64, 400, 900].map((age): Scene => ({
    name: `ring-${age}ms`,
    about: `A ring asked for with engine.ripple(480, 300), captured ${age} ms after the frame that started it.`,
    options: { breathe: 0 },
    play: h => { h.step(32); h.engine.ripple(480, 300); h.step(16); const start = h.at; h.until(start + age); },
  })),
  {
    name: "press-ring",
    about: "A free press (no work area): pointer down at (300, 240), captured 250 ms later with the ring out.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.move(300, 240); h.down(300, 240); h.step(250); },
  },
  {
    name: "held",
    about: "Work area on: pointer down at (400, 300) and a footprint of a 200 x 140 rounded rect around it, held for 600 ms.",
    options: { breathe: 0, workArea: true },
    play: h => {
      h.step(32);
      h.move(400, 300);
      h.down(400, 300);
      h.signal({ kind: "footprint", value: { pointerId: 1, initial: true, rects: [{ id: "a", left: 300, top: 230, right: 500, bottom: 370, radius: 14 }] } });
      h.step(600);
    },
  },
  {
    name: "held-released",
    about: "The held scene, then released: captured 180 ms after pointer up, the ring leaving the footprint.",
    options: { breathe: 0, workArea: true },
    play: h => {
      h.step(32);
      h.move(400, 300);
      h.down(400, 300);
      h.signal({ kind: "footprint", value: { pointerId: 1, initial: true, rects: [{ id: "a", left: 300, top: 230, right: 500, bottom: 370, radius: 14 }] } });
      h.step(600);
      h.up(400, 300);
      h.step(180);
    },
  },
  {
    name: "preview",
    about: "A preview rectangle (the drop target a host shows) at (560, 120)-(860, 300), faded in.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.signal({ kind: "preview", value: { rect: { left: 560, top: 120, right: 860, bottom: 300, radius: 10 } } }); h.until(1200); },
  },
  {
    name: "selection",
    about: "Scene of three shapes: a rounded rect, an ellipse and a rotated rect, faded in and settled.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.signal({ kind: "scene", value: { rects: [card, oval, tilted] } }); h.move(480, 300); h.until(1800); },
  },
  {
    name: "selection-fading",
    about: "The selection scene captured 60 ms after the shapes arrive, mid fade.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.signal({ kind: "scene", value: { rects: [card, oval, tilted] } }); h.step(64); },
  },
  {
    name: "links-still",
    about: "Two surfaces (rect a, ellipse b) and a still link between them: the default curve lifting the dots.",
    options: { breathe: 0 },
    play: h => {
      h.step(32);
      h.signal({ kind: "scene", value: { rects: [card, oval] } });
      h.signal({ kind: "links", value: [{ from: "a", to: "b", motion: "still" }] });
      h.until(1500);
    },
  },
  {
    name: "links-crest",
    about: "The same link with motion 'loop': a crest travelling it, captured at t = 1800 ms.",
    options: { breathe: 0 },
    play: h => {
      h.step(32);
      h.signal({ kind: "scene", value: { rects: [card, oval] } });
      h.signal({ kind: "links", value: [{ from: "a", to: "b", motion: "loop" }] });
      h.until(1800);
    },
  },
  {
    name: "links-points",
    about: "A link given as explicit points (a polyline), with motion 'bounce', captured at t = 1300 ms.",
    options: { breathe: 0 },
    play: h => {
      h.step(32);
      h.signal({ kind: "links", value: [{ points: [{ x: 80, y: 520 }, { x: 300, y: 420 }, { x: 520, y: 540 }, { x: 900, y: 380 }], motion: "bounce", width: 2 }] });
      h.until(1300);
    },
  },
  {
    name: "breath-still",
    about: "A `still` field (no light, only the breath loop) at t = 3000 ms.",
    options: { still: true },
    play: h => h.until(3000),
  },
  {
    name: "unconnected",
    about: "connected: false, pointer at (300, 200): no fabric canvas at all, the dots alone.",
    options: { breathe: 0, connected: false },
    play: h => { h.step(32); h.move(300, 200); h.until(2000); },
  },
  {
    name: "push",
    about: "cursorPush 10: the dots pushed away from the pointer at (480, 300), settled.",
    options: { breathe: 0, cursorPush: 10 },
    play: h => { h.step(32); h.move(480, 300); h.until(2000); },
  },
  {
    name: "camera",
    about: "Viewport signal (x -37, y 13, zoom 1.6): the lattice rescaled and shifted, zoom wave included, t = 700 ms.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.move(480, 300); h.step(500); h.signal({ kind: "viewport", value: { x: -37, y: 13, zoom: 1.6 } }); h.step(200); },
  },
  {
    name: "dark",
    about: "Dark theme colours, pointer at (300, 200), breath on, t = 2000 ms.",
    theme: "dark",
    play: h => { h.step(32); h.move(300, 200); h.until(2000); },
  },
  {
    name: "theme-switch",
    about: "Light theme, pointer at (300, 200), then a theme signal to dark at t = 1000 ms; captured at t = 1300 ms.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.move(300, 200); h.until(1000); h.setTheme("dark"); h.signal({ kind: "theme" }); h.until(1300); },
  },
  {
    name: "dpr2",
    about: "The light-top-left scene at device pixel ratio 2 (backing store 1920 x 1200).",
    dpr: 2,
    options: { breathe: 0 },
    play: h => { h.step(32); h.move(140, 110); h.until(2000); },
  },
  {
    name: "dpr2-selection",
    about: "The selection scene at device pixel ratio 2, with a held link crest.",
    dpr: 2,
    play: h => {
      h.step(32);
      h.signal({ kind: "scene", value: { rects: [card, oval, tilted] } });
      h.signal({ kind: "links", value: [{ from: "a", to: "b", motion: "loop" }] });
      h.move(480, 300);
      h.until(1800);
    },
  },
  {
    name: "narrow",
    about: "A 320 x 700 canvas, pointer at (160, 350), with a ring 300 ms out.",
    width: 320,
    height: 700,
    options: { breathe: 0 },
    play: h => { h.step(32); h.move(160, 350); h.until(1500); h.engine.ripple(100, 500); h.step(300); },
  },
  {
    name: "wide",
    about: "A 1800 x 360 canvas, pointer at (1500, 120), breath on, t = 2000 ms.",
    width: 1800,
    height: 360,
    play: h => { h.step(32); h.move(1500, 120); h.until(2000); },
  },
  /* ═══ A LOST BUFFER IS REPAIRED BY THE NEXT PAINTED FRAME, NOT BUILT ON ═══
     The two below replay a scene whose last frame paints, black out both
     visible canvases one frame before the capture (what the compositor
     hands back when its copy of the canvas fails), and capture the frame
     after. Each must equal its twin byte for byte; compare them by pairing
     the files, since the names differ on purpose. */
  {
    name: "wiped-light-moving",
    about: "light-moving with both visible canvases blacked out one frame before the capture; must equal light-moving.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.move(200, 200); h.step(1500); h.move(700, 420); h.step(80); h.wipe(); h.step(16); },
  },
  {
    name: "wiped-ring-400ms",
    about: "ring-400ms with both visible canvases blacked out one frame before the capture; must equal ring-400ms.",
    options: { breathe: 0 },
    play: h => { h.step(32); h.engine.ripple(480, 300); h.step(16); const start = h.at; h.until(start + 384); h.wipe(); h.until(start + 400); },
  },
  {
    name: "fractional-dpr",
    about: "Device pixel ratio 1.5 on a 700 x 500 canvas, pointer at (350, 250): dots off the pixel grid.",
    width: 700,
    height: 500,
    dpr: 1.5,
    options: { breathe: 0 },
    play: h => { h.step(32); h.move(350, 250); h.until(2000); },
  },
];
