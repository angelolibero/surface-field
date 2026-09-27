import * as React from "react";
import { createRoot } from "react-dom/client";
import { HugeiconsIcon } from "@hugeicons/react";
import { FlowConnectionIcon, GithubIcon } from "@hugeicons/core-free-icons";
import { SurfaceField, createSurfaceFieldController } from "surface-field";
import { SurfaceCard } from "../SurfaceCard";
import "../index.css";
import "./cover.css";

/* ── THE README COVER, drawn by the component it advertises. A fixed 1600×900
   stage: `npm run demo`, open /surface-field/cover.html, and a headless
   Chrome at device scale 2 takes the picture. Nothing here ships. ── */

type Node = { id: string; left: number; top: number; width: number; height: number; kind: string; title: string; rotation?: number };

const nodes: Node[] = [
  { id: "source", left: 830, top: 330, width: 260, height: 132, kind: "Source", title: "Live page" },
  { id: "stream", left: 1210, top: 150, width: 250, height: 132, kind: "Stream", title: "Capture" },
  { id: "layout", left: 1210, top: 560, width: 250, height: 132, kind: "Layout", title: "Measure" },
  { id: "notes", left: 850, top: 640, width: 190, height: 110, kind: "Note", title: "Draft", rotation: -8 },
];

/* A handle sits on the middle of a side, as React Flow's default does, and
   turns with its node about the node's centre. */
const turned = (n: Node, x: number, y: number) => {
  const a = (n.rotation ?? 0) * Math.PI / 180;
  const cx = n.left + n.width / 2, cy = n.top + n.height / 2;
  return [cx + Math.cos(a) * (x - cx) - Math.sin(a) * (y - cy), cy + Math.sin(a) * (x - cx) + Math.cos(a) * (y - cy)] as const;
};
const out = (n: Node) => turned(n, n.left + n.width, n.top + n.height / 2);
const into = (n: Node) => turned(n, n.left, n.top + n.height / 2);
/* The one node held in the hand: selected and mid-turn, as in the playground. */
const HELD = "notes";

/* React Flow's smoothstep: across to the middle, down, across again, every
   turn rounded. 14 is its default border radius at this stroke. */
function step([x1, y1]: readonly [number, number], [x2, y2]: readonly [number, number], r = 14) {
  const mx = (x1 + x2) / 2;
  const dy = Math.sign(y2 - y1);
  const turn = Math.min(r, Math.abs(y2 - y1) / 2, Math.abs(mx - x1));
  if (!dy || !turn) return `M${x1},${y1} L${x2},${y2}`;
  return `M${x1},${y1} L${mx - turn},${y1} Q${mx},${y1} ${mx},${y1 + dy * turn} ` +
    `L${mx},${y2 - dy * turn} Q${mx},${y2} ${mx + turn},${y2} L${x2},${y2}`;
}

const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
const edges = [
  { from: "source", to: "stream", dashed: false },
  { from: "source", to: "layout", dashed: false },
  { from: "notes", to: "layout", dashed: true },
];

function ReactMark() {
  return <svg viewBox="-11.5 -10.23 23 20.46" aria-hidden="true">
    <circle r="2.05" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="1" fill="none">
      <ellipse rx="11" ry="4.2" />
      <ellipse rx="11" ry="4.2" transform="rotate(60)" />
      <ellipse rx="11" ry="4.2" transform="rotate(120)" />
    </g>
  </svg>;
}

function Cover() {
  const stage = React.useRef<HTMLDivElement>(null);
  const controller = React.useMemo(createSurfaceFieldController, []);

  React.useLayoutEffect(() => {
    const root = stage.current;
    if (!root) return;
    /* The field is told the radius the cards wear and the held one's turn. */
    const card = root.querySelector<HTMLElement>(".cover-node");
    const radius = card ? parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0 : 0;
    controller.setScene({
      root,
      rects: nodes.map(n => ({ id: n.id, parent: null, left: n.left, top: n.top, right: n.left + n.width, bottom: n.top + n.height, radius, rotation: n.rotation })),
    });
    /* The light rests where the graph is, as if a hand had just left it. */
    const aim = () => window.dispatchEvent(new PointerEvent("pointermove", { clientX: 1150, clientY: 440, pointerType: "mouse" }));
    aim();
    const again = window.setTimeout(aim, 120);
    return () => { window.clearTimeout(again); controller.setScene(null); };
  }, [controller]);

  return <div className="cover" ref={stage}>
    <SurfaceField
      controller={controller} interactionRoot={stage}
      gap={22} focusRadius={250} lineRadius={200} baseOpacity={0.02} maxOpacity={0.2}
      connected tint={0} breathe={0} wander={false} cursorPush={2} ripplePush={6}
      style={{ position: "absolute", inset: 0, color: "var(--foreground)" }}
    />
    <svg className="cover-edges" viewBox="0 0 1600 900" aria-hidden="true">
      {edges.map(e => <path key={e.from + e.to} d={step(out(byId[e.from]), into(byId[e.to]))} className={e.dashed ? "dashed" : undefined} />)}
    </svg>
    {nodes.map(n => <SurfaceCard key={n.id} className="cover-node" style={{ left: n.left, top: n.top, width: n.width, height: n.height, transform: n.rotation ? `rotate(${n.rotation}deg)` : undefined }}>
      <small>{n.kind}</small>
      <strong>{n.title}</strong>
      <span className="cover-handle in" />
      <span className="cover-handle out" />
    </SurfaceCard>)}
    {(() => {
      const n = byId[HELD];
      return <div className="selection cover-selection" style={{ left: n.left, top: n.top, width: n.width, height: n.height, transform: `rotate(${n.rotation ?? 0}deg)` }}>
        {[[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => <span key={`${x}${y}`} className="sel-corner" style={{ left: `${x * 100}%`, top: `${y * 100}%` }} />)}
        {/* The playground's turn cursor, drawn at the size a cover reads. */}
        <svg className="cover-turn" viewBox="0 0 32 32" aria-hidden="true">
          {/* The top-right corner's turn: the arc bows out toward that corner. */}
          <g transform="rotate(90 16 16)">
            <path className="halo arc" d="M9 23A13 13 0 0 1 22 10" />
            <g className="halo heads"><path d="M9 28.5 5.25 23h7.5z" /><path d="M27.5 10 22 6.25v7.5z" /></g>
            <path className="ink arc" d="M9 23A13 13 0 0 1 22 10" />
            <g className="ink heads"><path d="M9 28.5 5.25 23h7.5z" /><path d="M27.5 10 22 6.25v7.5z" /></g>
          </g>
        </svg>
      </div>;
    })()}

    <header className="cover-top">
      <span className="cover-mark" aria-hidden="true">
        <SurfaceField gap={8} focusRadius={62} lineRadius={44} baseOpacity={0.18} maxOpacity={0.62} connected tint={0} cursorPush={0} ripplePush={0} breathe={0} wander={false} style={{ position: "absolute", left: "50%", top: "50%", width: 32, height: 32, transform: "translate(-50%, -50%)", color: "var(--foreground)" }} />
      </span>
      <span className="cover-badge"><ReactMark />React</span>
    </header>

    <div className="cover-copy">
      <h1>Surface Field</h1>
      <p>A field of dots and lines that makes room around your surfaces.</p>
      <ul className="cover-list">
        <li><HugeiconsIcon icon={GithubIcon} />Free &amp; open source</li>
        <li><ReactMark />React component</li>
        <li><HugeiconsIcon icon={FlowConnectionIcon} />Works with React Flow</li>
      </ul>
    </div>
  </div>;
}

createRoot(document.getElementById("root")!).render(<Cover />);
