import * as React from "react";
import { SurfaceField, createSurfaceFieldController } from "surface-field";
import { FieldWorkspace, type FieldSettings } from "./FieldControls";
import { SurfaceCard, SurfaceHandle, arrowStep } from "./SurfaceCard";

type ObjectId = "note" | "label" | "swatch";
// x and y are fractions of the canvas border box; width and height are CSS pixels.
type Geometry = { x: number; y: number; width: number; height: number };
type Layout = Record<ObjectId, Geometry>;
// Pointer coordinates and box are viewport CSS pixels; origin uses Geometry above.
type Gesture = { id: ObjectId; mode: "move" | "resize"; pointerId: number; clientX: number; clientY: number; origin: Geometry; box: DOMRect };

const initialLayout: Layout = {
  note: { x: 0.44, y: 0.22, width: 254, height: 174 },
  label: { x: 0.66, y: 0.1, width: 174, height: 90 },
  swatch: { x: 0.59, y: 0.64, width: 186, height: 112 },
};
const objectIds: ObjectId[] = ["note", "label", "swatch"];
const minSize = { width: 88, height: 72 };
const inset = 12;

/** The original playground: three draggable surfaces on a full-bleed field. */
export function PlaygroundDemo({ settings, dark, setDark }: { settings: FieldSettings; dark: boolean; setDark: (value: boolean) => void }) {
  const { config, accent } = settings;
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const controller = React.useMemo(createSurfaceFieldController, []);
  const layout = React.useRef<Layout>(structuredClone(initialLayout));
  const gesture = React.useRef<Gesture | null>(null);

  /* The sidebar's reset also puts the surfaces back where they started. */
  const resetLayout = () => {
    layout.current = structuredClone(initialLayout);
    paintLayout();
  };

  React.useEffect(() => { controller.refreshTheme(); }, [accent, controller, dark]);

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
  const paintLayout = (box = canvasRef.current?.getBoundingClientRect()) => {
    const root = canvasRef.current;
    if (!root || !box) return;
    const rects = objectIds.flatMap(id => {
      const element = root.querySelector<HTMLElement>(`[data-field-object="${id}"]`);
      if (!element) return [];
      const rect = rectFor(layout.current[id], box);
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
      return [{ id, parent: null, left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height }];
    });
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
      rects: [{ left: box.left + rect.left, top: box.top + rect.top, right: box.left + rect.left + rect.width, bottom: box.top + rect.top + rect.height }],
    });
  };
  const onHandleDown = (id: ObjectId, mode: Gesture["mode"], event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || gesture.current) return;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return;
    event.preventDefault();
    const origin = { ...layout.current[id] };
    gesture.current = { id, mode, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, origin, box };
    event.currentTarget.setPointerCapture(event.pointerId);
    sendFootprint(id, event.pointerId, box, true);
  };
  const onHandleMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.clientX;
    const dy = event.clientY - active.clientY;
    const next = layout.current[active.id];
    const originRect = rectFor(active.origin, active.box);
    if (active.mode === "move") {
      next.x = clamp(originRect.left + dx, inset, active.box.width - next.width - inset) / active.box.width;
      next.y = clamp(originRect.top + dy, inset, active.box.height - next.height - inset) / active.box.height;
    } else {
      next.width = clamp(active.origin.width + dx, Math.min(minSize.width, active.box.width - inset * 2), active.box.width - originRect.left - inset);
      next.height = clamp(active.origin.height + dy, Math.min(minSize.height, active.box.height - inset * 2), active.box.height - originRect.top - inset);
    }
    paintLayout(active.box);
    sendFootprint(active.id, event.pointerId, active.box);
  };
  const onHandleUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (gesture.current?.pointerId === event.pointerId) gesture.current = null;
  };
  const onHandleKey = (id: ObjectId, mode: Gesture["mode"], event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = arrowStep(event);
    if (!step) return;
    event.preventDefault();
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return;
    const item = layout.current[id];
    const rect = rectFor(item, box);
    if (mode === "move") {
      item.x = clamp(rect.left + step[0], inset, box.width - rect.width - inset) / box.width;
      item.y = clamp(rect.top + step[1], inset, box.height - rect.height - inset) / box.height;
    } else {
      item.width = clamp(rect.width + step[0], Math.min(minSize.width, box.width - inset * 2), box.width - rect.left - inset);
      item.height = clamp(rect.height + step[1], Math.min(minSize.height, box.height - inset * 2), box.height - rect.top - inset);
    }
    paintLayout(box);
  };
  const handle = (id: ObjectId, mode: Gesture["mode"]) => <SurfaceHandle
    mode={mode} name={id}
    onPointerDown={event => onHandleDown(id, mode, event)}
    onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}
    onKeyDown={event => onHandleKey(id, mode, event)}
  />;

  return <FieldWorkspace
    settings={settings} dark={dark} setDark={setDark} onReset={resetLayout} sheetTitle="Surface Field controls"
    intro="Move your cursor, click the canvas, or drag and resize a surface. Tune the light and texture here."
  >
    <div className="canvas" ref={canvasRef}>
      <SurfaceField {...config} controller={controller} interactionRoot={canvasRef} style={{ position: "absolute", inset: 0, color: "var(--foreground)" }} />
      {objectIds.map(id => <SurfaceCard key={id} className={`field-object field-${id}`} data-field-object={id}>
        {handle(id, "move")}
        {handle(id, "resize")}
      </SurfaceCard>)}
    </div>
  </FieldWorkspace>;
}
