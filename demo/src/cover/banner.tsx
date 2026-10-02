import * as React from "react";
import { createRoot } from "react-dom/client";
import { HugeiconsIcon } from "@hugeicons/react";
import { FlowConnectionIcon, GithubIcon } from "@hugeicons/core-free-icons";
import { SurfaceField, createSurfaceFieldController } from "surface-field";
import { SurfaceCard } from "../SurfaceCard";
import "../index.css";
import "./cover.css";
import "./banner.css";

/* ── THE X HEADER, the cover's cards and field at 1500×500: `npm run demo`,
   open /surface-field/banner.html, and take the picture at device scale 2.
   The bottom left stays quiet, where X puts the profile photo. Nothing here
   ships. ── */

type Node = { id: string; left: number; top: number; width: number; height: number; kind: string; title: string };

const nodes: Node[] = [
  { id: "source", left: 830, top: 196, width: 200, height: 96, kind: "Source", title: "Live page" },
  { id: "stream", left: 1130, top: 70, width: 200, height: 96, kind: "Stream", title: "Capture" },
  { id: "layout", left: 1130, top: 322, width: 200, height: 96, kind: "Layout", title: "Measure" },
];

/* A handle sits on the middle of a side, as React Flow's default does. */
const out = (n: Node) => [n.left + n.width, n.top + n.height / 2] as const;
const into = (n: Node) => [n.left, n.top + n.height / 2] as const;
/* The one node in the hand: selected, its resize frame showing, as in the demo. */
const HELD = "stream";
/* The edge that carries a wave in the picture, and how fast it runs. */
const WAVE = ["source", "layout"] as const;
const WAVE_SPEED = 60;

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

function Banner() {
  const stage = React.useRef<HTMLDivElement>(null);
  const controller = React.useMemo(createSurfaceFieldController, []);

  React.useLayoutEffect(() => {
    const root = stage.current;
    if (!root) return;
    /* The field is told the radius the cards wear. */
    const card = root.querySelector<HTMLElement>(".cover-node");
    const radius = card ? parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0 : 0;
    controller.setScene({
      root,
      rects: nodes.map(n => ({ id: n.id, parent: null, left: n.left, top: n.top, right: n.left + n.width, bottom: n.top + n.height, radius })),
    });
    /* Every edge is also a channel in the field, along the same steps the
       edge draws: across, down, across. One carries its wave, at a speed
       picked so that the three seconds before the picture leave the crest
       halfway down its drop. */
    controller.setLinks(edges.map(e => {
      const [x1, y1] = out(byId[e.from]), [x2, y2] = into(byId[e.to]);
      const mx = (x1 + x2) / 2;
      const points = [{ x: x1, y: y1 }, { x: mx, y: y1 }, { x: mx, y: y2 }, { x: x2, y: y2 }];
      return e.from === WAVE[0] && e.to === WAVE[1] ? { points, motion: "loop" as const, speed: WAVE_SPEED, strength: 2 } : { points };
    }));
    /* The light rests where the graph is, as if a hand had just left it. */
    const aim = () => window.dispatchEvent(new PointerEvent("pointermove", { clientX: 1080, clientY: 245, pointerType: "mouse" }));
    aim();
    const again = window.setTimeout(aim, 120);
    return () => { window.clearTimeout(again); controller.setLinks(null); controller.setScene(null); };
  }, [controller]);

  return <div className="cover banner" ref={stage}>
    <SurfaceField
      controller={controller} interactionRoot={stage}
      gap={22} focusRadius={250} lineRadius={200} baseOpacity={0.02} maxOpacity={0.2}
      connected tint={0} breathe={0} wander={false} cursorPush={2} ripplePush={6}
      style={{ position: "absolute", inset: 0, color: "var(--foreground)" }}
    />
    <svg className="cover-edges" viewBox="0 0 1500 500" aria-hidden="true">
      {edges.map(e => <path key={e.from + e.to} d={step(out(byId[e.from]), into(byId[e.to]))} className={e.dashed ? "dashed" : undefined} />)}
    </svg>
    {nodes.map(n => <SurfaceCard key={n.id} className="cover-node" style={{ left: n.left, top: n.top, width: n.width, height: n.height }}>
      <small>{n.kind}</small>
      <strong>{n.title}</strong>
      <span className="cover-handle in" />
      <span className="cover-handle out" />
    </SurfaceCard>)}
    {(() => {
      const n = byId[HELD];
      return <div className="selection cover-selection" style={{ left: n.left, top: n.top, width: n.width, height: n.height }}>
        {[[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => <span key={`${x}${y}`} className="sel-corner" style={{ left: `${x * 100}%`, top: `${y * 100}%` }} />)}
      </div>;
    })()}

    <div className="banner-copy">
      <h1>Surface Field</h1>
      <p>A field of dots and lines that makes room around your surfaces.</p>
      <ul className="cover-list">
        <li><HugeiconsIcon icon={GithubIcon} />Open source</li>
        <li><ReactMark />React</li>
        <li><HugeiconsIcon icon={FlowConnectionIcon} />React Flow</li>
      </ul>
    </div>
  </div>;
}

createRoot(document.getElementById("root")!).render(<Banner />);
