# Integration

Give the field an explicit host box. Its canvases fill that box; the package does not choose absolute positioning or a background. Set inherited `color` for the dots and, if desired, `--surface-field-tint` on the document root. `className` and `style` let a host use its own layout system without adding a CSS dependency to the package.

For an editor, keep one controller next to the field and its geometry producer. Send committed object rectangles with `setScene`; send moving footprints and preview rectangles directly from gesture callbacks. These methods bypass React rendering and preserve the current pointer event order. Use `interactionRoot` to limit held press rings to the editor surface. Use `refreshTheme` when host theme changes are applied on an ancestor other than the document root.

Keep host-specific event names and theme selectors in an adapter owned by the host. Convert committed object geometry to `setScene` calls, send active gesture footprints through `setFootprint`, and map marquee or selection state to `suppressRipple` as needed. The demo shows a complete controller integration with draggable surfaces. Generic package defaults remain decorative.

The package's `prepare` script builds JavaScript and declarations during installation from Git. Install with `npm install github:angelolibero/surface-field`; it is not published to a registry.
