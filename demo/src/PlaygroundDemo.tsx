import * as React from "react";
import { SurfaceField, createSurfaceFieldController, type SurfaceFieldRect } from "surface-field";
import { FieldWorkspace, type FieldSettings } from "./FieldControls";
import { SurfaceCard } from "./SurfaceCard";

type ObjectId = "note" | "label" | "swatch";
// x and y are fractions of the canvas border box; width and height are CSS pixels; rotation is degrees, clockwise.
type Geometry = { x: number; y: number; width: number; height: number; rotation: number };
type Layout = Record<ObjectId, Geometry>;
/* What the hand holds: the body moves, a corner or an edge resizes (sx, sy
   say which sides of the box follow it), a turn zone rotates. */
type Grip = { kind: "move" } | { kind: "resize"; sx: -1 | 0 | 1; sy: -1 | 0 | 1 } | { kind: "rotate" };
// Pointer coordinates and box are viewport CSS pixels; origin uses Geometry above.
type Gesture = { id: ObjectId; grip: Grip; pointerId: number; clientX: number; clientY: number; origin: Geometry; box: DOMRect; moved: boolean };

const initialLayout: Layout = {
  note: { x: 0.44, y: 0.22, width: 254, height: 174, rotation: 0 },
  label: { x: 0.66, y: 0.1, width: 174, height: 90, rotation: -6 },
  swatch: { x: 0.6, y: 0.62, width: 136, height: 136, rotation: 0 },
};
/* What each surface is besides its box and its turn. The field is told the
   same shape the card wears, so a round card clears a round hole and a turned
   one a turned hole; the corner radius is read from the card itself. */
const looks: Record<ObjectId, Pick<SurfaceFieldRect, "shape">> = {
  note: {},
  label: {},
  swatch: { shape: "ellipse" },
};
const names: Record<ObjectId, string> = { note: "Note", label: "Label", swatch: "Round" };
const objectIds: ObjectId[] = ["note", "label", "swatch"];
const minSize = { width: 72, height: 56 };
const inset = 12;
/* A press that travels less than this is a click that selects, not a drag. */
const DRAG_SLOP = 3;
const corners = [["nw", -1, -1], ["ne", 1, -1], ["se", 1, 1], ["sw", -1, 1]] as const;
const edges = [["n", 0, -1], ["e", 1, 0], ["s", 0, 1], ["w", -1, 0]] as const;

/** The playground: three surfaces on a full-bleed field, held the way a canvas holds its layers. */
export function PlaygroundDemo({ settings, dark, setDark }: { settings: FieldSettings; dark: boolean; setDark: (value: boolean) => void }) {
  const { config, accent } = settings;
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const selectionRef = React.useRef<HTMLDivElement>(null);
  const controller = React.useMemo(createSurfaceFieldController, []);
  const layout = React.useRef<Layout>(structuredClone(initialLayout));
  const gesture = React.useRef<Gesture | null>(null);
  const [selected, setSelected] = React.useState<ObjectId | null>(null);
  /* Read once per card: the radius is a token and does not move while a card does. */
  const radii = React.useRef(new Map<ObjectId, number>());
  const shapeOf = (id: ObjectId, element?: HTMLElement | null) => {
    let radius = radii.current.get(id);
    if (radius === undefined && element) {
      radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
      radii.current.set(id, radius);
    }
    return { radius, ...looks[id], rotation: layout.current[id].rotation || undefined };
  };

  /* The sidebar's reset also puts the surfaces back where they started. */
  const resetLayout = () => {
    layout.current = structuredClone(initialLayout);
    setSelected(null);
    paintLayout();
  };

  React.useEffect(() => { controller.refreshTheme(); }, [accent, controller, dark]);
  /* Two links, routed by id so they follow their surfaces: a wave running
     from the note to the round one, and a still channel from the label. */
  React.useEffect(() => {
    if (!settings.links) { controller.setLinks(null); return; }
    const strength = settings.linkStrength;
    controller.setLinks([{ from: "note", to: "swatch", motion: "loop", speed: settings.linkSpeed, strength }, { from: "label", to: "note", strength }]);
    return () => controller.setLinks(null);
  }, [controller, settings.links, settings.linkStrength, settings.linkSpeed]);

  /* A turn kept in (-180, 180], so a card spun twice reads -6 and not 714. */
  const wrap = (deg: number) => { const d = ((deg % 360) + 360) % 360; return d > 180 ? d - 360 : d; };
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
  const rectFor = (geometry: Geometry, box: DOMRect) => {
    const width = Math.min(geometry.width, Math.max(1, box.width - inset * 2));
    const height = Math.min(geometry.height, Math.max(1, box.height - inset * 2));
    return {
      left: clamp(geometry.x * box.width, inset, box.width - width - inset),
      top: clamp(geometry.y * box.height, inset, box.height - height - inset),
      width, height,
    };
  };
  const place = (element: HTMLElement, rect: ReturnType<typeof rectFor>, rotation: number) => {
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
    element.style.transform = rotation ? `rotate(${rotation}deg)` : "";
  };
  const paintLayout = (box = canvasRef.current?.getBoundingClientRect()) => {
    const root = canvasRef.current;
    if (!root || !box) return;
    const rects = objectIds.flatMap(id => {
      const element = root.querySelector<HTMLElement>(`[data-field-object="${id}"]`);
      if (!element) return [];
      const rect = rectFor(layout.current[id], box);
      place(element, rect, layout.current[id].rotation);
      return [{ id, parent: null, left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height, ...shapeOf(id, element) }];
    });
    const frame = selectionRef.current;
    const held = frame?.dataset.id as ObjectId | undefined;
    if (frame && held) place(frame, rectFor(layout.current[held], box), layout.current[held].rotation);
    controller.setScene({ root, rects });
  };

  React.useLayoutEffect(() => { paintLayout(); });
  React.useEffect(() => {
    const root = canvasRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() => paintLayout());
    observer.observe(root);
    return () => { observer.disconnect(); controller.setScene(null); };
  }, [controller]);

  const sendFootprint = (id: ObjectId, pointerId: number, box: DOMRect, initial = false) => {
    const rect = rectFor(layout.current[id], box);
    controller.setFootprint({
      pointerId, ids: [id], initial: initial || undefined, suppressRipple: true,
      rects: [{ left: box.left + rect.left, top: box.top + rect.top, right: box.left + rect.left + rect.width, bottom: box.top + rect.top + rect.height, ...shapeOf(id) }],
    });
  };

  const begin = (id: ObjectId, grip: Grip, event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || gesture.current) return;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return;
    event.preventDefault();
    event.stopPropagation();
    setSelected(id);
    /* Kept from the canvas's own press, which would let go of the selection;
       the field still hears the press, it listens on the window. */
    gesture.current = { id, grip, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, origin: { ...layout.current[id] }, box, moved: grip.kind !== "move" };
    event.currentTarget.setPointerCapture(event.pointerId);
    sendFootprint(id, event.pointerId, box, true);
  };
  const drag = (event: React.PointerEvent<HTMLElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.clientX;
    const dy = event.clientY - active.clientY;
    if (!active.moved) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return;
      active.moved = true;
    }
    const { box, origin, grip } = active;
    const next = layout.current[active.id];
    const from = rectFor(origin, box);
    const cx = from.left + from.width / 2;
    const cy = from.top + from.height / 2;
    if (grip.kind === "move") {
      next.x = clamp(from.left + dx, inset, box.width - next.width - inset) / box.width;
      next.y = clamp(from.top + dy, inset, box.height - next.height - inset) / box.height;
    } else if (grip.kind === "rotate") {
      /* The turn is the angle the hand sweeps about the card's centre, added
         to the one it started at; Shift lands on 15 degree steps, as in Figma. */
      const px = box.left + cx, py = box.top + cy;
      const swept = Math.atan2(event.clientY - py, event.clientX - px) - Math.atan2(active.clientY - py, active.clientX - px);
      const turn = origin.rotation + swept * 180 / Math.PI;
      next.rotation = wrap(event.shiftKey ? Math.round(turn / 15) * 15 : turn);
    } else {
      /* A RESIZE IS READ IN THE CARD'S OWN FRAME. The hand's travel is turned
         back by the card's angle, the sides the grip owns follow it, and the
         centre moves by half of what they gained, turned forward again: the
         opposite side stays where it was on screen, turned or not. */
      const a = origin.rotation * Math.PI / 180;
      const cos = Math.cos(a), sin = Math.sin(a);
      const du = cos * dx + sin * dy;
      const dv = cos * dy - sin * dx;
      const width = grip.sx ? Math.max(minSize.width, from.width + grip.sx * du) : from.width;
      const height = grip.sy ? Math.max(minSize.height, from.height + grip.sy * dv) : from.height;
      const lx = grip.sx * (width - from.width) / 2;
      const ly = grip.sy * (height - from.height) / 2;
      const nx = cx + cos * lx - sin * ly;
      const ny = cy + sin * lx + cos * ly;
      next.width = width;
      next.height = height;
      next.x = (nx - width / 2) / box.width;
      next.y = (ny - height / 2) / box.height;
    }
    paintLayout(box);
    sendFootprint(active.id, event.pointerId, box);
  };
  const end = (event: React.PointerEvent<HTMLElement>) => {
    if (gesture.current?.pointerId === event.pointerId) gesture.current = null;
  };
  /* A press on the bare field lets go of the selection; the field still
     answers it with its ring. */
  const onCanvasDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!(event.target as Element).closest(".field-object, .selection")) setSelected(null);
  };
  /* The keyboard holds a card the way the hand does: focus selects it, the
     arrows move it 12px (1px with Shift), Escape lets go. */
  const onCardKey = (id: ObjectId, event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { setSelected(null); event.currentTarget.blur(); return; }
    const delta = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[event.key];
    if (!delta) return;
    event.preventDefault();
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return;
    const step = event.shiftKey ? 1 : 12;
    const item = layout.current[id];
    const rect = rectFor(item, box);
    item.x = clamp(rect.left + delta[0] * step, inset, box.width - rect.width - inset) / box.width;
    item.y = clamp(rect.top + delta[1] * step, inset, box.height - rect.height - inset) / box.height;
    paintLayout(box);
  };
  const grip = (id: ObjectId, value: Grip) => ({
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => begin(id, value, event),
    onPointerMove: drag, onPointerUp: end, onPointerCancel: end,
  });

  return <FieldWorkspace
    settings={settings} dark={dark} setDark={setDark} onReset={resetLayout} sheetTitle="Surface Field controls"
    intro="Click a surface to select it, then drag, resize or turn it. Tune the light and texture here."
  >
    <div className="canvas" ref={canvasRef} onPointerDown={onCanvasDown}>
      <SurfaceField {...config} controller={controller} interactionRoot={canvasRef} style={{ position: "absolute", inset: 0, color: "var(--foreground)" }} />
      {objectIds.map(id => <SurfaceCard
        key={id} className={`field-object field-${id}${looks[id].shape === "ellipse" ? " is-ellipse" : ""}`} data-field-object={id}
        tabIndex={0} role="button" aria-label={`${names[id]} surface. Arrow keys move it.`} aria-pressed={selected === id}
        onFocus={() => setSelected(id)} onKeyDown={event => onCardKey(id, event)}
        {...grip(id, { kind: "move" })}
      />)}
      {selected && <div className="selection" ref={selectionRef} data-id={selected} aria-hidden="true">
        {edges.map(([side, sx, sy]) => <span key={side} className="sel-edge" data-side={side} {...grip(selected, { kind: "resize", sx, sy })} />)}
        {corners.map(([side]) => <span key={`turn-${side}`} className="sel-turn" data-side={side} {...grip(selected, { kind: "rotate" })} />)}
        {corners.map(([side, sx, sy]) => <span key={side} className="sel-corner" data-side={side}
          style={{ left: sx < 0 ? 0 : "100%", top: sy < 0 ? 0 : "100%" }} {...grip(selected, { kind: "resize", sx, sy })} />)}
      </div>}
    </div>
  </FieldWorkspace>;
}
