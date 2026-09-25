import * as React from "react";

/* ── ONE SURFACE, TWO TABS. The playground's card and its two handles, lifted
   out whole so the React Flow tab wears the same object: a grip at the top
   that moves it, a corner at the bottom right that resizes it. What moves or
   resizes it is the host's business, so both take their handlers as props. ── */

export type HandleMode = "move" | "resize";

/** The resting plate every tab's objects are made of. */
export function SurfaceCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className ? `surface-card ${className}` : "surface-card"} {...props} />;
}

/** The playground's grip or corner. `name` is what the handle's label calls the surface. */
export function SurfaceHandle({ mode, name, className, ...props }: { mode: HandleMode; name: string } &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children">) {
  return <button
    type="button" className={`object-handle ${mode}-handle${className ? ` ${className}` : ""}`}
    aria-label={`${mode === "move" ? "Move" : "Resize"} ${name} surface with arrow keys${mode === "resize" ? "; right and down make it larger" : ""}`}
    title={`${mode === "move" ? "Drag to move" : "Drag to resize"}; arrow keys also work`}
    {...props}
  >{mode === "resize"
    ? <svg className="handle-mark" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 3 3 13M13 7 7 13M13 11 11 13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" /></svg>
    : <span className="handle-mark" aria-hidden="true" />}</button>;
}

/** Arrow keys as a handle reads them: 12px a press, 1px with Shift. Null for any other key. */
export function arrowStep(event: React.KeyboardEvent): [number, number] | null {
  const delta = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[event.key];
  if (!delta) return null;
  const step = event.shiftKey ? 1 : 12;
  return [delta[0] * step, delta[1] * step];
}
