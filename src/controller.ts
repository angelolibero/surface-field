export type SurfaceFieldRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type SurfaceFieldScene = {
  /** Scene rectangles are CSS pixels relative to this element's border box. */
  root: HTMLElement;
  rects: readonly (SurfaceFieldRect & { id: string; parent: string | null })[];
};

export type SurfaceFieldFootprint = {
  pointerId: number;
  /** Footprints are viewport CSS rectangles, such as getBoundingClientRect returns. */
  rects: readonly SurfaceFieldRect[];
  ids?: readonly string[];
  initial?: true;
  /** Suppress the held press ring while another gesture owns that press. */
  suppressRipple?: boolean;
};

export type SurfaceFieldPreview = {
  /** A viewport CSS rectangle, or null to release the preview. */
  rect: SurfaceFieldRect | null;
  committed?: true;
};

export type SurfaceFieldController = {
  setScene(scene: SurfaceFieldScene | null): void;
  setFootprint(footprint: SurfaceFieldFootprint): void;
  setPreview(preview: SurfaceFieldPreview): void;
  refreshTheme(): void;
};

type Signal =
  | { kind: "scene"; value: SurfaceFieldScene | null }
  | { kind: "footprint"; value: SurfaceFieldFootprint }
  | { kind: "preview"; value: SurfaceFieldPreview }
  | { kind: "theme" };

type State = { scene: SurfaceFieldScene | null; listener: ((signal: Signal) => void) | null };
const states = new WeakMap<SurfaceFieldController, State>();

/** One controller belongs to one field. Geometry updates never cause React renders. */
export function createSurfaceFieldController(): SurfaceFieldController {
  const state: State = { scene: null, listener: null };
  const send = (signal: Signal) => state.listener?.(signal);
  const controller: SurfaceFieldController = {
    setScene(scene) { state.scene = scene; send({ kind: "scene", value: scene }); },
    setFootprint(value) { send({ kind: "footprint", value }); },
    setPreview(value) { send({ kind: "preview", value }); },
    refreshTheme() { send({ kind: "theme" }); },
  };
  states.set(controller, state);
  return controller;
}

/** The component's private subscription. A late mount receives the latest layout. */
export function subscribeSurfaceField(controller: SurfaceFieldController, listener: (signal: Signal) => void): () => void {
  const state = states.get(controller);
  if (!state) throw new Error("SurfaceField requires a controller from createSurfaceFieldController");
  if (state.listener) throw new Error("A SurfaceField controller may be attached to only one field");
  state.listener = listener;
  listener({ kind: "scene", value: state.scene });
  return () => { if (state.listener === listener) state.listener = null; };
}
