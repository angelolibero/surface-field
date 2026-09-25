import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircleIcon, Copy01Icon, Menu01Icon, Moon02Icon,
  RotateCcwIcon, Sun02Icon,
} from "@hugeicons/core-free-icons";
import { SurfaceField, createSurfaceFieldController } from "surface-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HouseSlider } from "./HouseSlider";
import { Switch } from "@/components/ui/switch";

type Config = {
  gap: number;
  focusRadius: number;
  lineRadius: number;
  baseOpacity: number;
  maxOpacity: number;
  connected: boolean;
  cursorPush: number;
  ripplePush: number;
  tint: number;
  breathe: number;
  breatheRate: number;
  wander: boolean;
  still: boolean;
};

const presets = {
  workspace: {
    gap: 22, focusRadius: 600, lineRadius: 200, baseOpacity: 0.02,
    maxOpacity: 0.2, connected: true, cursorPush: 2, ripplePush: 6,
    tint: 0, breathe: 0, breatheRate: 1, wander: false, still: false,
  },
  ambient: {
    gap: 25, focusRadius: 360, lineRadius: 100, baseOpacity: 0.04,
    maxOpacity: 0.3, connected: false, cursorPush: 0, ripplePush: 4,
    tint: 0.35, breathe: 0.4, breatheRate: 0.8, wander: true, still: false,
  },
  mesh: {
    gap: 19, focusRadius: 460, lineRadius: 180, baseOpacity: 0.03,
    maxOpacity: 0.25, connected: true, cursorPush: 7, ripplePush: 9,
    tint: 0.22, breathe: 0.18, breatheRate: 1.2, wander: false, still: false,
  },
  still: {
    gap: 28, focusRadius: 440, lineRadius: 140, baseOpacity: 0.03,
    maxOpacity: 0.13, connected: true, cursorPush: 0, ripplePush: 0,
    tint: 0.12, breathe: 0, breatheRate: 1, wander: false, still: true,
  },
} satisfies Record<string, Config>;

type Preset = keyof typeof presets | "custom";
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

const defaultAccent = "#6683e8";

function SliderRow({ id, label, value, min, max, step = 1, unit = "", onChange }: {
  id: string; label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (value: number) => void;
}) {
  const inputId = `${React.useId()}-${id}`;
  return <div className="slider-row">
    <div className="control-line"><Label htmlFor={inputId}>{label}</Label><span className="control-value">{value}{unit}</span></div>
    <HouseSlider id={inputId} label={label} value={value} min={min} max={max} step={step} onChange={onChange} />
  </div>;
}

function SwitchRow({ id, label, description, checked, onChange }: {
  id: string; label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void;
}) {
  return <div className="switch-row">
    <div><Label htmlFor={id}>{label}</Label>{description && <p>{description}</p>}</div>
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
  </div>;
}

function ControlPanel({ config, preset, accent, dark, copied, setPreset, setAccent, setDark, change, reset, copyCode }: {
  config: Config; preset: Preset; accent: string; dark: boolean; copied: boolean;
  setPreset: (value: Preset) => void; setAccent: (value: string) => void;
  setDark: (value: boolean) => void;
  change: <K extends keyof Config>(key: K, value: Config[K]) => void;
  reset: () => void; copyCode: () => void;
}) {
  const accentInputId = React.useId();
  return <div className="controls">
    <div className="sidebar-brand">
      <span className="brand-mark" aria-hidden="true">
        <SurfaceField gap={8} focusRadius={62} lineRadius={44} baseOpacity={0.18} maxOpacity={0.62} connected tint={0.35} cursorPush={0} ripplePush={0} breathe={0.35} breatheRate={0.65} wander style={{ position: "absolute", left: "50%", top: "50%", width: 32, height: 32, transform: "translate(-50%, -50%)", color: "var(--foreground)" }} />
      </span>
      <div className="brand-copy"><strong>Surface Field</strong><small>Interactive React canvas</small></div>
      <Button className="theme-button" variant="outline" size="icon" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setDark(!dark)}><HugeiconsIcon icon={dark ? Sun02Icon : Moon02Icon} size={17} /></Button>
    </div>
    <div className="controls-intro">
      <p>Move your cursor, click the canvas, or drag and resize a surface. Tune the light and texture here.</p>
    </div>
    <Separator />
    <div className="control-group">
      <div className="group-title"><span>Preset</span></div>
      <div className="preset-row">
        <Select value={preset} onValueChange={value => {
          if (value !== "custom") setPreset(value as Preset);
        }}>
          <SelectTrigger aria-label="Field preset" className="w-full"><SelectValue placeholder="Choose a preset" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="workspace">Workspace</SelectItem>
            <SelectItem value="ambient">Ambient</SelectItem>
            <SelectItem value="mesh">Mesh</SelectItem>
            <SelectItem value="still">Still</SelectItem>
            {preset === "custom" && <SelectItem value="custom" disabled>Custom</SelectItem>}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" aria-label="Reset to Workspace" title="Reset to Workspace" onClick={reset}><HugeiconsIcon icon={RotateCcwIcon} size={15} /></Button>
        <Button variant="outline" size="icon" aria-label={copied ? "React config copied" : "Copy React config"} title={copied ? "Copied React config" : "Copy React config"} onClick={copyCode}><HugeiconsIcon icon={copied ? CheckmarkCircleIcon : Copy01Icon} size={15} /></Button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">{copied ? "React config copied" : ""}</span>
    </div>
    <Separator />
    <div className="control-group">
      <div className="group-title"><span>Dots & lines</span></div>
      <SliderRow id="gap" label="Spacing" value={config.gap} min={14} max={42} unit=" px" onChange={value => change("gap", value)} />
      <SliderRow id="focus" label="Light radius" value={config.focusRadius} min={180} max={760} step={10} unit=" px" onChange={value => change("focusRadius", value)} />
      <SliderRow id="opacity" label="Brightness" value={Math.round(config.maxOpacity * 100)} min={8} max={50} unit="%" onChange={value => change("maxOpacity", value / 100)} />
      <SwitchRow id="lines" label="Connected lines" checked={config.connected} onChange={value => change("connected", value)} />
      {config.connected && <SliderRow id="line-radius" label="Line reach" value={config.lineRadius} min={60} max={320} step={10} unit=" px" onChange={value => change("lineRadius", value)} />}
    </div>
    <Separator />
    <div className="control-group">
      <div className="group-title"><span>Interaction</span></div>
      <SliderRow id="cursor-push" label="Cursor distortion" value={config.cursorPush} min={0} max={12} unit=" px" onChange={value => change("cursorPush", value)} />
      <SliderRow id="ripple-push" label="Ripple displacement" value={config.ripplePush} min={0} max={16} unit=" px" onChange={value => change("ripplePush", value)} />
    </div>
    <Separator />
    <div className="control-group">
      <div className="group-title"><span>Color & motion</span></div>
      <div className="color-control"><Label htmlFor={accentInputId}>Accent color</Label><span className="color-picker" style={{ "--selected-color": accent } as React.CSSProperties}>
        <input id={accentInputId} type="color" value={accent} title={`Choose accent color (${accent})`} onInput={event => setAccent(event.currentTarget.value)} onChange={event => setAccent(event.currentTarget.value)} />
      </span></div>
      <SliderRow id="tint" label="Accent blend" value={Math.round(config.tint * 100)} min={0} max={80} unit="%" onChange={value => change("tint", value / 100)} />
      <SwitchRow id="wander" label="Wandering light" description="Let the light drift when idle" checked={config.wander} onChange={value => change("wander", value)} />
      <SliderRow id="breathe" label="Breathing dots" value={Math.round(config.breathe * 100)} min={0} max={100} unit="%" onChange={value => change("breathe", value / 100)} />
      <SwitchRow id="still" label="Still field" description="Render a static texture" checked={config.still} onChange={value => change("still", value)} />
    </div>
  </div>;
}

function snippet(config: Config, accent: string) {
  const values = Object.entries(config).map(([key, value]) => `  ${key}={${JSON.stringify(value)}}`).join("\n");
  return `import { SurfaceField } from "surface-field";\n\nexport function FieldBackdrop() {\n  return (\n    <div style={{ position: "relative", minHeight: 480 }}>\n      <style>{\`:root { --surface-field-tint: ${accent}; }\`}</style>\n      <SurfaceField\n${values.split("\n").map(line => `      ${line}`).join("\n")}\n        style={{ position: "absolute", inset: 0 }}\n      />\n      <div style={{ position: "relative" }}>Your content</div>\n    </div>\n  );\n}`;
}

export default function App() {
  const [config, setConfig] = React.useState<Config>({ ...presets.workspace });
  const [preset, setPresetState] = React.useState<Preset>("workspace");
  const [accent, setAccent] = React.useState<string>(defaultAccent);
  const [dark, setDark] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const controller = React.useMemo(createSurfaceFieldController, []);
  const layout = React.useRef<Layout>(structuredClone(initialLayout));
  const gesture = React.useRef<Gesture | null>(null);

  const change = React.useCallback(<K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig(current => ({ ...current, [key]: value }));
    setPresetState("custom");
  }, []);
  const setPreset = React.useCallback((next: Preset) => {
    if (next === "custom") return;
    setPresetState(next);
    setConfig({ ...presets[next] });
  }, []);
  const reset = React.useCallback(() => {
    setPreset("workspace");
    setAccent(defaultAccent);
    layout.current = structuredClone(initialLayout);
    paintLayout();
  }, [setPreset]);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.setProperty("--surface-field-tint", accent);
    controller.refreshTheme();
  }, [accent, controller, dark]);

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
    const delta = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[event.key];
    if (!delta) return;
    event.preventDefault();
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return;
    const item = layout.current[id];
    const rect = rectFor(item, box);
    const step = event.shiftKey ? 1 : 12;
    if (mode === "move") {
      item.x = clamp(rect.left + delta[0] / 12 * step, inset, box.width - rect.width - inset) / box.width;
      item.y = clamp(rect.top + delta[1] / 12 * step, inset, box.height - rect.height - inset) / box.height;
    } else {
      item.width = clamp(rect.width + delta[0] / 12 * step, Math.min(minSize.width, box.width - inset * 2), box.width - rect.left - inset);
      item.height = clamp(rect.height + delta[1] / 12 * step, Math.min(minSize.height, box.height - inset * 2), box.height - rect.top - inset);
    }
    paintLayout(box);
  };
  const copyCode = async () => {
    await navigator.clipboard.writeText(snippet(config, accent));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const controlProps = { config, preset, accent, dark, copied, setPreset, setAccent, setDark, change, reset, copyCode };
  const handle = (id: ObjectId, mode: Gesture["mode"]) => <button
    type="button" className={`object-handle ${mode}-handle`}
    aria-label={`${mode === "move" ? "Move" : "Resize"} ${id} surface with arrow keys${mode === "resize" ? "; right and down make it larger" : ""}`}
    title={`${mode === "move" ? "Drag to move" : "Drag to resize"}; arrow keys also work`}
    onPointerDown={event => onHandleDown(id, mode, event)}
    onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}
    onKeyDown={event => onHandleKey(id, mode, event)}
  >{mode === "resize"
    ? <svg className="handle-mark" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 3 3 13M13 7 7 13M13 11 11 13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" /></svg>
    : <span className="handle-mark" aria-hidden="true" />}</button>;

  return <div className="app-shell">
    <div className="app-body">
      <aside className="control-sidebar"><ControlPanel {...controlProps} /></aside>
      <main className="workspace">
        <Sheet><SheetTrigger asChild><Button className="mobile-controls-button" variant="outline" size="icon" aria-label="Open controls"><HugeiconsIcon icon={Menu01Icon} size={18} /></Button></SheetTrigger><SheetContent side="left" className="mobile-sheet"><SheetHeader><SheetTitle className="sr-only">Surface Field controls</SheetTitle></SheetHeader><ControlPanel {...controlProps} /></SheetContent></Sheet>
        <div className="canvas" ref={canvasRef}>
            <SurfaceField {...config} controller={controller} interactionRoot={canvasRef} style={{ position: "absolute", inset: 0, color: "var(--foreground)" }} />
            {objectIds.map(id => <div key={id} className={`field-object field-${id}`} data-field-object={id}>
              {handle(id, "move")}
              {handle(id, "resize")}
            </div>)}
        </div>
      </main>
    </div>
    <a className="viewport-credit" href="https://github.com/angelolibero" target="_blank" rel="noopener noreferrer">Made by Angelo Libero</a>
  </div>;
}
