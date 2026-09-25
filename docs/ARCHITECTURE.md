# Architecture

`src/SurfaceField.tsx` owns the two canvases, cell layout, drawing, pointer light, rings, resize and theme reads, and its animation schedule. The renderer retains its original draw math and constants. `src/controller.ts` is an instance-owned signal channel. It stores only the latest committed scene so a field mounted after its layout producer can paint immediately. Pointer footprints and previews are transient. `src/index.ts` limits the public exports.

The private renderer and its React effect remain in one file for this extraction. Their closure shares cell buffers, dirty regions and frame scheduling. A later split should follow measured behavior and preserve that lifecycle; the package boundary does not require exposing these internals.

The field measures CSS rectangles at its boundary and scales its canvas up to device pixels, capped at device pixel ratio 2. When connected lines are enabled, their fabric canvas is behind the dot canvas. The outer element clips both canvases, stays hidden from accessibility, and lets pointer input reach the content above it.

The renderer can subscribe to window pointer events while mounted so a held press can end outside the field. Press ownership is limited by `interactionRoot` and the field bounds. The instance controller limits host scene and gesture messages to one field. Theme changes on arbitrary host ancestors are supplied through `refreshTheme()`, leaving host theme conventions outside this package.

The module is safe to import during server rendering. Browser objects are read after the component mounts. An effect cleanup removes its controller subscription, event listeners, observers, animation frames and timers. Host event bridges are outside this package.
