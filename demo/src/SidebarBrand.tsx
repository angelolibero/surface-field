import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun02Icon } from "@hugeicons/core-free-icons";
import { SurfaceField } from "surface-field";
import { Button } from "@/components/ui/button";

/** The mark, the name and the theme switch, shared by every demo's panel. */
export function SidebarBrand({ dark, setDark }: { dark: boolean; setDark: (value: boolean) => void }) {
  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  return <div className="sidebar-brand">
    <span className="brand-mark" aria-hidden="true">
      <SurfaceField gap={8} focusRadius={62} lineRadius={44} baseOpacity={0.18} maxOpacity={0.62} connected tint={0.35} cursorPush={0} ripplePush={0} breathe={0.35} breatheRate={0.65} wander style={{ position: "absolute", left: "50%", top: "50%", width: 32, height: 32, transform: "translate(-50%, -50%)", color: "var(--foreground)" }} />
    </span>
    <div className="brand-copy"><strong>Surface Field</strong><small>Interactive React canvas</small></div>
    <Button className="theme-button" variant="outline" size="icon" aria-label={label} title={label} onClick={() => setDark(!dark)}><HugeiconsIcon icon={dark ? Sun02Icon : Moon02Icon} size={17} /></Button>
  </div>;
}
