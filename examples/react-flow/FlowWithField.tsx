/* Surface Field as the background of a React Flow canvas.
 *
 * The field replaces <Background />. React Flow already keeps the camera and
 * every node's box in one store; FieldBridge subscribes to that store and hands
 * the field both WITHOUT a React render, on the same tick the store changes:
 *
 *   camera               -> controller.setViewport   the grid pans and zooms with the flow
 *   node boxes           -> controller.setScene      every node carves its own clearing
 *   dragged/resized node -> controller.setFootprint  the clearing travels with the card
 *
 * A node moves by its grip (the node's `dragHandle`) and resizes by one
 * corner (<NodeResizeControl />). A press on either is a handle gesture, so
 * its footprint carries `suppressRipple` from the press on and the field lays
 * no ring under the card; the clearing follows through setScene, since a
 * resize is a store change like a drag. Colours are neutral greys: the field
 * is the only coloured thing on the canvas.
 *
 * Copy this file into an app that depends on `react`, `@xyflow/react` and
 * `surface-field`. It is not part of the published package.
 */
import { useEffect, useMemo, useRef, type CSSProperties, type RefObject } from "react";
import {
  Handle, NodeResizeControl, Position, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useStoreApi,
  type Edge, type Node, type NodeProps, type NodeTypes, type ReactFlowState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  SurfaceField, createSurfaceFieldController,
  type SurfaceFieldController, type SurfaceFieldRect,
} from "surface-field";

type SceneRect = SurfaceFieldRect & { id: string; parent: string | null };

/** Node boxes in SCREEN space, CSS px relative to the flow's root: the transform React Flow draws with. */
function nodeRects(state: ReactFlowState, inHandOnly = false): SceneRect[] {
  const [x, y, zoom] = state.transform;
  const rects: SceneRect[] = [];
  for (const node of state.nodeLookup.values()) {
    const { width, height } = node.measured;
    if (node.hidden || !width || !height || (inHandOnly && !node.dragging && !node.resizing)) continue;
    const p = node.internals.positionAbsolute;
    rects.push({
      id: node.id, parent: null,
      left: p.x * zoom + x, top: p.y * zoom + y,
      right: (p.x + width) * zoom + x, bottom: (p.y + height) * zoom + y,
    });
  }
  return rects;
}

/** Renders nothing: it forwards React Flow's store to the field's controller. */
export function FieldBridge({ controller, root }: {
  controller: SurfaceFieldController;
  root: RefObject<HTMLDivElement | null>;
}) {
  const store = useStoreApi();

  useEffect(() => {
    const element = root.current;
    if (!element) return;

    /* Neither React Flow's drag nor NodeResizeControl exposes the pointer
       that started it, so the bridge remembers the press itself. Footprints
       are VIEWPORT CSS px. */
    let press: { pointerId: number; box: DOMRect; initial: boolean; handle: boolean } | null = null;

    const sync = (state: ReactFlowState) => {
      const [x, y, zoom] = state.transform;
      controller.setViewport({ x, y, zoom });
      controller.setScene({ root: element, rects: nodeRects(state) });

      if (!press) return;
      const dragged = nodeRects(state, true);
      if (!dragged.length) return;
      const { box } = press;
      controller.setFootprint({
        pointerId: press.pointerId,
        ids: dragged.map(rect => rect.id),
        initial: press.initial || undefined,
        suppressRipple: press.handle || undefined,
        rects: dragged.map(rect => ({
          left: box.left + rect.left, top: box.top + rect.top,
          right: box.left + rect.right, bottom: box.top + rect.bottom,
        })),
      });
      press.initial = false;
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const handle = event.target instanceof Element && Boolean(event.target.closest(".grip, .corner"));
      press = { pointerId: event.pointerId, box: element.getBoundingClientRect(), initial: true, handle };
    };
    const onUp = (event: PointerEvent) => {
      if (press?.pointerId === event.pointerId) press = null;
    };
    element.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);

    sync(store.getState());
    const unsubscribe = store.subscribe(sync);
    return () => {
      unsubscribe();
      element.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
      controller.setScene(null);
    };
  }, [controller, root, store]);

  return null;
}

/** A plain card: the grip at the top moves it, the corner at the bottom right resizes it. */
function ResizableNode({ data, selected }: NodeProps<Node<{ label: string }>>) {
  return (
    <div style={{
      position: "relative", boxSizing: "border-box", height: "100%", padding: "18px 12px 10px",
      border: "1px solid #d4d4d4", borderRadius: 10, background: "#fff",
      boxShadow: selected ? "0 0 0 1.5px #737373" : undefined,
    }}>
      <div className="grip" style={{ position: "absolute", top: 0, left: "50%", width: 36, height: 18, translate: "-50% 0", cursor: "grab" }}>
        <div style={{ width: 18, height: 2, margin: "8px auto 0", borderRadius: 2, background: "#a3a3a3" }} />
      </div>
      <Handle type="target" position={Position.Left} />
      {data.label}
      <Handle type="source" position={Position.Right} />
      <NodeResizeControl
        position="bottom-right" className="corner" autoScale={false} minWidth={100} minHeight={56}
        style={{ width: 16, height: 16, translate: "-100% -100%", border: 0, background: "transparent" }}
      >
        <svg viewBox="0 0 16 16" width={16} height={16} fill="none"><path d="M13 3 3 13M13 7 7 13M13 11 11 13" stroke="#a3a3a3" strokeWidth={1.35} strokeLinecap="round" /></svg>
      </NodeResizeControl>
    </div>
  );
}
const nodeTypes: NodeTypes = { resizable: ResizableNode };

/* A resizable node starts from a size of its own. */
const card = (id: string, x: number, y: number, label: string): Node =>
  ({ id, type: "resizable", position: { x, y }, width: 150, height: 56, dragHandle: ".grip", data: { label } });
const initialNodes: Node[] = [
  card("a", 0, 80, "Source"),
  card("b", 260, 0, "Transform"),
  card("c", 260, 170, "Measure"),
  card("d", 520, 80, "Output"),
];
const initialEdges: Edge[] = [
  { id: "a-b", source: "a", target: "b" },
  { id: "a-c", source: "a", target: "c" },
  { id: "b-d", source: "b", target: "d" },
  { id: "c-d", source: "c", target: "d" },
];

/* React Flow's theme is CSS variables, so neutral is a style, not a stylesheet. */
const neutral = {
  background: "transparent",
  "--xy-edge-stroke-selected": "#525252",
  "--xy-connectionline-stroke": "#525252",
  "--xy-handle-background-color": "#fff",
  "--xy-handle-border-color": "#a3a3a3",
  "--xy-selection-background-color": "rgb(0 0 0 / 4%)",
  "--xy-selection-border": "1px solid rgb(0 0 0 / 28%)",
} as CSSProperties;

function Flow() {
  const root = useRef<HTMLDivElement>(null);
  const controller = useMemo(createSurfaceFieldController, []);
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div ref={root} style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Behind the flow, in the same box. The dots take their colour from `color`. */}
      <SurfaceField
        controller={controller} interactionRoot={root}
        gap={24} focusRadius={560} connected
        style={{ position: "absolute", inset: 0, color: "#262626" }}
      />
      {/* No <Background />: the field is the background, so the flow stays
          transparent. The default theme's blue goes too, for neutral greys. */}
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        fitView style={neutral}
      />
      <FieldBridge controller={controller} root={root} />
    </div>
  );
}

/** The bridge reads React Flow's store, so it must sit inside the provider. */
export function FlowWithField() {
  return (
    <ReactFlowProvider>
      <div style={{ width: "100vw", height: "100vh" }}>
        <Flow />
      </div>
    </ReactFlowProvider>
  );
}
