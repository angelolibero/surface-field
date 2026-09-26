import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, PanelLeftCloseIcon, Sun02Icon } from "@hugeicons/core-free-icons";
import { SurfaceField } from "surface-field";
import { Button } from "@/components/ui/button";

/** The mark, the name, the theme switch and, in the docked sidebar, the close, shared by every demo's panel. */
export function SidebarBrand({ dark, setDark, onClose }: { dark: boolean; setDark: (value: boolean) => void; onClose?: () => void }) {
  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  return <div className="sidebar-brand">
    <span className="brand-mark" aria-hidden="true">
      <SurfaceField gap={6.5} focusRadius={50} lineRadius={36} baseOpacity={0.18} maxOpacity={0.62} connected tint={0.35} cursorPush={0} ripplePush={0} breathe={0.35} breatheRate={0.65} wander style={{ position: "absolute", left: "50%", top: "50%", width: 26, height: 26, transform: "translate(-50%, -50%)", color: "var(--foreground)" }} />
    </span>
    <div className="brand-copy"><strong>Surface Field</strong><small>Interactive React canvas</small></div>
    <div className="brand-actions">
      <Button variant="ghost" size="icon-xs" aria-label={label} title={label} onClick={() => setDark(!dark)}><HugeiconsIcon icon={dark ? Sun02Icon : Moon02Icon} className="size-4" /></Button>
      {onClose && <Button variant="ghost" size="icon-xs" aria-label="Hide controls" title="Hide controls" onClick={onClose}><HugeiconsIcon icon={PanelLeftCloseIcon} className="size-4" /></Button>}
    </div>
  </div>;
}
