import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircleIcon, Copy01Icon, Menu01Icon, RotateCcwIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HouseSlider } from "./HouseSlider";
import { SidebarBrand } from "./SidebarBrand";
import { Switch } from "@/components/ui/switch";

/* ── The field's settings, shared by every tab. They live in App, so a field
   tuned in one tab is the same field in the next. ── */

export type Config = {
  gap: number;
  focusRadius: number;
  lineRadius: number;
  baseOpacity: number;
  maxOpacity: number;
  connected: boolean;
  cursorPush: number;
  ripplePush: number;
  surfacePadding: number;
  tint: number;
  breathe: number;
  breatheRate: number;
  wander: boolean;
  still: boolean;
};

const presets = {
  workspace: {
    gap: 22, focusRadius: 250, lineRadius: 200, baseOpacity: 0.02,
    maxOpacity: 0.2, connected: true, cursorPush: 2, ripplePush: 6, surfacePadding: 0,
    tint: 0, breathe: 0, breatheRate: 1, wander: false, still: false,
  },
  ambient: {
    gap: 25, focusRadius: 360, lineRadius: 100, baseOpacity: 0.04,
    maxOpacity: 0.3, connected: false, cursorPush: 0, ripplePush: 4, surfacePadding: 0,
    tint: 0.35, breathe: 0.4, breatheRate: 0.8, wander: true, still: false,
  },
  mesh: {
    gap: 19, focusRadius: 460, lineRadius: 180, baseOpacity: 0.03,
    maxOpacity: 0.25, connected: true, cursorPush: 7, ripplePush: 9, surfacePadding: 0,
    tint: 0.22, breathe: 0.18, breatheRate: 1.2, wander: false, still: false,
  },
  still: {
    gap: 28, focusRadius: 440, lineRadius: 140, baseOpacity: 0.03,
    maxOpacity: 0.13, connected: true, cursorPush: 0, ripplePush: 0, surfacePadding: 0,
    tint: 0.12, breathe: 0, breatheRate: 1, wander: false, still: true,
  },
} satisfies Record<string, Config>;

type Preset = keyof typeof presets | "custom";

const defaultAccent = "#6683e8";

function snippet(config: Config, accent: string) {
  const values = Object.entries(config).map(([key, value]) => `  ${key}={${JSON.stringify(value)}}`).join("\n");
  return `import { SurfaceField } from "surface-field";\n\nexport function FieldBackdrop() {\n  return (\n    <div style={{ position: "relative", minHeight: 480 }}>\n      <style>{\`:root { --surface-field-tint: ${accent}; }\`}</style>\n      <SurfaceField\n${values.split("\n").map(line => `      ${line}`).join("\n")}\n        style={{ position: "absolute", inset: 0 }}\n      />\n      <div style={{ position: "relative" }}>Your content</div>\n    </div>\n  );\n}`;
}

export type FieldSettings = {
  config: Config; preset: Preset; accent: string; copied: boolean;
  setPreset: (value: Preset) => void; setAccent: (value: string) => void;
  change: <K extends keyof Config>(key: K, value: Config[K]) => void;
  reset: () => void; copyCode: () => void;
};

export function useFieldSettings(): FieldSettings {
  const [config, setConfig] = React.useState<Config>({ ...presets.workspace });
  const [preset, setPresetState] = React.useState<Preset>("workspace");
  const [accent, setAccent] = React.useState<string>(defaultAccent);
  const [copied, setCopied] = React.useState(false);

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
  }, [setPreset]);

  /* A LAYOUT effect, so the tint is on the root before any tab's passive
     effect calls `refreshTheme`: children's effects run before their parent's. */
  React.useLayoutEffect(() => {
    document.documentElement.style.setProperty("--surface-field-tint", accent);
  }, [accent]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(snippet(config, accent));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return { config, preset, accent, copied, setPreset, setAccent, change, reset, copyCode };
}

/* ── The sidebar. ── */

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
  const inputId = `${React.useId()}-${id}`;
  return <div className="switch-row">
    <div><Label htmlFor={inputId}>{label}</Label>{description && <p>{description}</p>}</div>
    <Switch id={inputId} checked={checked} onCheckedChange={onChange} />
  </div>;
}

type PanelProps = {
  settings: FieldSettings; intro: string; dark: boolean;
  setDark: (value: boolean) => void; onReset?: () => void;
};

function ControlPanel({ settings, intro, dark, setDark, onReset }: PanelProps) {
  const { config, preset, accent, copied, setPreset, setAccent, change, copyCode } = settings;
  const reset = () => { settings.reset(); onReset?.(); };
  const accentInputId = React.useId();
  return <div className="controls">
    <SidebarBrand dark={dark} setDark={setDark} />
    <div className="controls-intro">
      <p>{intro}</p>
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
      <SliderRow id="surface-padding" label="Surface spacing" value={config.surfacePadding} min={-32} max={64} step={2} unit=" px" onChange={value => change("surfacePadding", value)} />
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

/** Every tab's frame: the field sidebar on a wide screen, the same panel in a sheet below 769px, and the tab's canvas. */
export function FieldWorkspace({ sheetTitle, children, ...panel }: PanelProps & { sheetTitle: string; children: React.ReactNode }) {
  return <div className="app-body">
    <aside className="control-sidebar"><ControlPanel {...panel} /></aside>
    <main className="workspace">
      <Sheet><SheetTrigger asChild><Button className="mobile-controls-button" variant="outline" size="icon" aria-label="Open controls"><HugeiconsIcon icon={Menu01Icon} size={18} /></Button></SheetTrigger><SheetContent side="left" className="mobile-sheet"><SheetHeader><SheetTitle className="sr-only">{sheetTitle}</SheetTitle></SheetHeader><ControlPanel {...panel} /></SheetContent></Sheet>
      {children}
    </main>
  </div>;
}
