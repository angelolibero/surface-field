import * as React from "react";

/* ── ONE SURFACE, TWO TABS. The card both tabs' objects are made of, and
   nothing on it: a playground surface and a React Flow node are held by
   their body and resized from their selection, never from a control drawn
   on the card itself. ── */

/** The resting plate every tab's objects are made of. */
export function SurfaceCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className ? `surface-card ${className}` : "surface-card"} {...props} />;
}
