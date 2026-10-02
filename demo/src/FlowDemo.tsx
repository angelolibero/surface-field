import * as React from "react";
import {
  Controls, Handle, MiniMap, NodeResizer, Position, ReactFlow, ReactFlowProvider, addEdge, useEdgesState, useNodesState, useStoreApi,
  type Connection, type Edge, type FitViewOptions, type Node, type NodeProps, type NodeTypes, type ReactFlowState,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { SurfaceField, createSurfaceFieldController, type SurfaceFieldController, type SurfaceFieldLink, type SurfaceFieldRect } from "surface-field";
import { FieldWorkspace, type Config, type FieldSettings } from "./FieldControls";
import { SurfaceCard } from "./SurfaceCard";

/* ── The graph. What sits inside a node does not matter here: a card with a
   title is enough to show the field following React Flow's camera. A node IS
   a playground surface, the React Flow way: the same empty-handed card, dragged
   by its body, and when selected React Flow's own NodeResizer draws the box,
   the corners and the edges that resize it. No turn: React Flow's nodes are
   upright boxes. The arrow keys move a selected node, which React Flow does
   on its own. ── */

type SurfaceNodeData = { title: string; kind: string };
type SurfaceNode = Node<SurfaceNodeData, "surface">;

/* The smallest card that still holds its kind and a one-line title. */
const minSize = { width: 120, height: 64 };

function SurfaceNodeCard({ data, selected }: NodeProps<SurfaceNode>) {
  return <SurfaceCard className="flow-node">
    <NodeResizer isVisible={selected} minWidth={minSize.width} minHeight={minSize.height} lineClassName="flow-resize-line" handleClassName="flow-resize-handle" />
    <Handle type="target" position={Position.Left} />
    <span className="flow-node-kind">{data.kind}</span>
    <strong className="flow-node-title">{data.title}</strong>
    <Handle type="source" position={Position.Right} />
  </SurfaceCard>;
}

const nodeTypes: NodeTypes = { surface: SurfaceNodeCard };

/* A resizable node needs a size of its own to start from; the card fills it. */
const node = (id: string, x: number, y: number, title: string, kind: string): SurfaceNode =>
  ({ id, type: "surface", position: { x, y }, width: 184, height: 72, data: { title, kind } });

const initialNodes: SurfaceNode[] = [
  node("source", 0, 150, "Live page", "Source"),
  node("capture", 280, 40, "Capture", "Stream"),
  node("measure", 280, 270, "Measure", "Layout"),
  node("compose", 560, 150, "Compose", "Scene"),
  node("preview", 840, 20, "Preview", "Canvas"),
  node("cut", 840, 200, "Cut frames", "Sheet"),
  node("export", 1120, 110, "Export", "Files"),
  node("share", 1120, 300, "Share link", "Publish"),
];

const edge = (source: string, target: string, animated = false): Edge =>
  ({ id: `${source}-${target}`, source, target, animated });

const initialEdges: Edge[] = [
  edge("source", "capture", true), edge("source", "measure"),
  edge("capture", "compose"), edge("measure", "compose"),
  edge("compose", "preview", true), edge("compose", "cut"),
  edge("preview", "export"), edge("cut", "export"), edge("cut", "share"),
];

/* ── The bridge. React Flow already keeps the camera and every node's box in
   one store; subscribing to it hands the field both WITHOUT a React render,
   on the same tick the store changes, so the clearing under a dragged node
   never trails the card. ── */

type SceneRect = SurfaceFieldRect & { id: string; parent: string | null };

/** World box to root-relative screen box: the same transform React Flow draws with. */
function sceneRects(state: ReactFlowState, radius: number, only?: (node: { dragging?: boolean; resizing?: boolean }) => boolean): SceneRect[] {
  const [x, y, zoom] = state.transform;
  const rects: SceneRect[] = [];
  for (const item of state.nodeLookup.values()) {
    const { width, height } = item.measured;
    if (item.hidden || !width || !height || (only && !only(item))) continue;
    const p = item.internals.positionAbsolute;
    rects.push({
      id: item.id, parent: null,
      left: p.x * zoom + x, top: p.y * zoom + y,
      right: (p.x + width) * zoom + x, bottom: (p.y + height) * zoom + y,
      radius: radius * zoom || undefined,
    });
  }
  return rects;
}

const sameRects = (a: readonly SceneRect[], b: readonly SceneRect[]) =>
  a.length === b.length && a.every((r, i) => r.id === b[i].id && r.left === b[i].left &&
    r.top === b[i].top && r.right === b[i].right && r.bottom === b[i].bottom && r.radius === b[i].radius);

function FieldBridge({ controller, root, wave, strength, speed, width }: {
  controller: SurfaceFieldController; root: React.RefObject<HTMLDivElement | null>; wave: boolean; strength: number; speed: number; width: number;
}) {
  const store = useStoreApi();
  React.useEffect(() => {
    const element = root.current;
    if (!element) return;
    let viewport = { x: NaN, y: NaN, zoom: NaN };
    let scene: SceneRect[] = [];
    let first = true;
    /* A press on a node's body or its resize frame holds the card, as in the
       playground: the footprint says so with `suppressRipple`, from the
       press itself, so the field lays no ring under a card being moved or
       resized. A press on a connection dot is not a hold. The clearing
       follows through the scene, which a resize changes in the same store
       update that sizes the card. The pointer that pressed is the bridge's
       to remember: neither React Flow's drag nor NodeResizer exposes it. */
    let press: { pointerId: number; box: DOMRect; initial: boolean; handle: boolean } | null = null;

    const footprint = (rects: readonly SceneRect[]) => {
      if (!press || !rects.length) return;
      const { box } = press;
      controller.setFootprint({
        pointerId: press.pointerId,
        ids: rects.map(rect => rect.id),
        initial: press.initial || undefined,
        suppressRipple: press.handle || undefined,
        rects: rects.map(rect => ({
          left: box.left + rect.left, top: box.top + rect.top,
          right: box.left + rect.right, bottom: box.top + rect.bottom, radius: rect.radius,
        })),
      });
      press.initial = false;
    };

    /* The radius the cards wear, read off the first one mounted; it is a token
       and does not change with the zoom, which the rects apply. */
    let radius = 0;
    const cardRadius = () => {
      if (!radius) {
        const card = element.querySelector<HTMLElement>(".flow-node");
        if (card) radius = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0;
      }
      return radius;
    };
    const sync = (state: ReactFlowState) => {
      const [x, y, zoom] = state.transform;
      if (x !== viewport.x || y !== viewport.y || zoom !== viewport.zoom) {
        viewport = { x, y, zoom };
        controller.setViewport(viewport);
      }
      const next = sceneRects(state, cardRadius());
      if (first || !sameRects(next, scene)) {
        first = false;
        scene = next;
        controller.setScene({ root: element, rects: scene });
      }
      if (press) footprint(sceneRects(state, cardRadius(), item => Boolean(item.dragging || item.resizing)));
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      const nodeId = target && !target.closest(".react-flow__handle")
        ? target.closest<HTMLElement>(".react-flow__node")?.dataset.id : undefined;
      press = { pointerId: event.pointerId, box: element.getBoundingClientRect(), initial: true, handle: Boolean(nodeId) };
      if (nodeId) footprint(scene.filter(rect => rect.id === nodeId));
    };
    const onUp = (event: PointerEvent) => { if (press?.pointerId === event.pointerId) press = null; };
    element.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    sync(store.getState());
    /* ═══ EVERY EDGE IS ALSO A CHANNEL IN THE FIELD ═══
       The channel follows the edge's own drawn path, read off its SVG after
       React Flow has laid it out: sampled every 14 screen pixels into the
       scene root's coordinates. An animated edge carries the wave when it is on.
       Read once per frame at most, and only after the store changed. */
    let linkFrame = 0;
    const sendLinks = () => {
      linkFrame = 0;
      const box = element.getBoundingClientRect();
      const links: SurfaceFieldLink[] = [];
      for (const edge of element.querySelectorAll<SVGGElement>(".react-flow__edge")) {
        const path = edge.querySelector<SVGPathElement>(".react-flow__edge-path");
        const matrix = path?.getScreenCTM();
        if (!path || !matrix) continue;
        const length = path.getTotalLength();
        const zoom = Math.hypot(matrix.a, matrix.b) || 1;
        const count = Math.max(2, Math.ceil(length * zoom / 14));
        const points = Array.from({ length: count + 1 }, (_, i) => {
          const p = path.getPointAtLength(length * i / count).matrixTransform(matrix);
          return { x: p.x - box.left, y: p.y - box.top };
        });
        links.push({ points, motion: wave && edge.classList.contains("animated") ? "loop" : "still", speed, strength, width });
      }
      controller.setLinks(links);
    };
    const queueLinks = () => { if (!linkFrame) linkFrame = requestAnimationFrame(sendLinks); };
    const unsubscribe = store.subscribe(state => { sync(state); queueLinks(); });
    queueLinks();
    return () => {
      unsubscribe();
      cancelAnimationFrame(linkFrame);
      controller.setLinks(null);
      element.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
    };
  }, [controller, root, store, wave, strength, speed, width]);
  React.useEffect(() => () => controller.setScene(null), [controller]);
  return null;
}

/* ── The page. ── */

/* The side panel floats over the left of the canvas on a wide screen, so the
   graph is framed in what is left of it. Below 769px the panel is a sheet. */
const fitOptions = (): FitViewOptions => ({
  padding: window.matchMedia("(min-width: 769px)").matches
    ? { top: "96px", right: "72px", bottom: "110px", left: "372px" }
    : { top: "84px", right: "28px", bottom: "96px", left: "28px" },
});

function FlowCanvas({ config, accent, dark, linkWave, linkStrength, linkSpeed, linkWidth }: { config: Config; accent: string | null; dark: boolean; linkWave: boolean; linkStrength: number; linkSpeed: number; linkWidth: number }) {
  const fitViewOptions = React.useMemo(fitOptions, []);
  const root = React.useRef<HTMLDivElement>(null);
  const controller = React.useMemo(createSurfaceFieldController, []);
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = React.useCallback((connection: Connection) => setEdges(current => addEdge(connection, current)), [setEdges]);

  /* Presses count only on the graph itself, not on the controls floating over it. */
  const interactionRoot = React.useRef<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    interactionRoot.current = root.current?.querySelector<HTMLElement>(".react-flow__renderer") ?? root.current;
  });

  React.useEffect(() => { controller.refreshTheme(); }, [accent, controller, dark]);

  return <div className="flow-canvas" ref={root}>
    <SurfaceField
      {...config}
      controller={controller} interactionRoot={interactionRoot}
      style={{ position: "absolute", inset: 0, color: "var(--foreground)" }}
    />
    <ReactFlow
      nodes={nodes} edges={edges} nodeTypes={nodeTypes}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
      colorMode={dark ? "dark" : "light"}
      fitView fitViewOptions={fitViewOptions} minZoom={0.2} maxZoom={3}
      defaultEdgeOptions={{ type: "smoothstep" }}
      attributionPosition="bottom-right"
    >
      <Controls position="bottom-center" orientation="horizontal" showInteractive={false} fitViewOptions={fitViewOptions} />
      <MiniMap position="top-right" pannable zoomable nodeBorderRadius={10} style={{ width: 172, height: 112 }} />
    </ReactFlow>
    <FieldBridge controller={controller} root={root} wave={linkWave} strength={linkStrength} speed={linkSpeed} width={linkWidth} />
  </div>;
}

/** React Flow on the field, tuned by the same sidebar as the playground. The integration itself is `examples/react-flow/` in the repository. */
export function FlowDemo({ settings, dark, setDark }: { settings: FieldSettings; dark: boolean; setDark: (value: boolean) => void }) {
  return <FieldWorkspace
    settings={settings} dark={dark} setDark={setDark} links="always" sheetTitle="React Flow demo controls"
    intro="Surface Field as React Flow's background. Pan, zoom, move or resize a card: the grid follows the canvas and every card carves its clearing."
  >
    <ReactFlowProvider><FlowCanvas config={settings.config} accent={settings.accent} dark={dark} linkWave={settings.linkWave} linkStrength={settings.linkStrength} linkSpeed={settings.linkSpeed} linkWidth={settings.linkWidth} /></ReactFlowProvider>
  </FieldWorkspace>;
}
