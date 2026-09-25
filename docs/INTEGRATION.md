# Integration

Give the field an explicit host box. Its canvases fill that box; the package does not choose absolute positioning or a background. Set inherited `color` for the dots and, if desired, `--surface-field-tint` on the document root. `className` and `style` let a host use its own layout system without adding a CSS dependency to the package.

For an editor, keep one controller next to the field and its geometry producer. Send committed object rectangles with `setScene`; send moving footprints and preview rectangles directly from gesture callbacks. These methods bypass React rendering and preserve the current pointer event order. Use `interactionRoot` to limit held press rings to the editor surface. Use `refreshTheme` when host theme changes are applied on an ancestor other than the document root.

Keep host-specific event names and theme selectors in an adapter owned by the host. Convert committed object geometry to `setScene` calls, send active gesture footprints through `setFootprint`, and map marquee or selection state to `suppressRipple` as needed. The demo shows a complete controller integration with draggable surfaces. Generic package defaults remain decorative.

## React Flow

Put the field behind the flow, in the same box, instead of React Flow's `<Background>`. The grid follows the camera through `setViewport`, panning with it exactly and zooming with parallax; the light and surfaces follow node rectangles in screen space through `setScene`. Neither path renders React.

A complete, runnable version, with drag and resize footprints, is [`examples/react-flow`](../examples/react-flow/). It subscribes to React Flow's store instead of `onMove`, so the camera and node boxes reach the field on the same tick.

```tsx
const controller = useMemo(createSurfaceFieldController, []);
const box = useRef<HTMLDivElement>(null);
const flow = useReactFlow();

// Each rectangle is SCREEN space: CSS px relative to `root`.
const publish = useCallback(() => {
  const { x, y, zoom } = flow.getViewport();
  controller.setViewport({ x, y, zoom });
  const root = box.current;
  if (!root) return;
  controller.setScene({
    root,
    rects: flow.getNodes().map(node => {
      const { x: wx, y: wy } = flow.getInternalNode(node.id)?.internals.positionAbsolute ?? node.position;
      const w = node.measured?.width ?? 0, h = node.measured?.height ?? 0;
      return {
        id: node.id, parent: node.parentId ?? null,
        left: wx * zoom + x, top: wy * zoom + y,
        right: (wx + w) * zoom + x, bottom: (wy + h) * zoom + y,
      };
    }),
  });
}, [controller, flow]);

return (
  <div ref={box} style={{ position: "relative", width: "100%", height: "100%" }}>
    <SurfaceField controller={controller} interactionRoot={box}
      style={{ position: "absolute", inset: 0 }} />
    <ReactFlow nodes={nodes} onMove={publish} onInit={publish}
      style={{ position: "absolute", inset: 0, background: "transparent" }} />
  </div>
);
```

- Call `publish` from `onMove` (every pan and zoom frame) and from an effect on `nodes`, so the camera and the node rectangles land in the same frame. `useOnViewportChange({ onChange })` works as well.
- For a declarative host, `<SurfaceField viewport={viewport} />` with `useViewport()` is equivalent but re-renders the host component on every camera frame; the controller path does not.
- During a node drag, send the dragged nodes' `getBoundingClientRect()` through `setFootprint` for the carried light. Those rectangles are viewport CSS px, not flow coordinates.
- `gap` is the grid spacing at zoom 1. The grid pans exactly with the flow but scales by `clamp(zoom ^ 0.4, 0.7, 1.6)`, a floor below the nodes, so its density stays bounded at any zoom and the host needs no density clamp. The field infers the zoom anchor from consecutive cameras. Send the camera on every frame, as `onMove` does, so each zoom arrives as a sequence of small steps about the pointer.

The package's `prepare` script builds JavaScript and declarations during installation from Git. Install with `npm install github:angelolibero/surface-field`; it is not published to a registry.
