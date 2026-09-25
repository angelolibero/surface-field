# Working on Surface Field

This package must stand on its own. Its runtime may import React and its own modules only. Do not import host application code, Tailwind, shadcn, app CSS, an app store, or an app event name.

Keep drawing math and its tuning constants private. Public API changes belong in `src/index.ts` and `docs/API.md`. Geometry updates for moving objects go through the instance controller without a React render. Document coordinate space for every new rectangle or point.

Preserve reduced motion, document visibility pause, resize behavior, the device pixel ratio cap, and the idle sleep path. Clean up every listener, observer, timer, animation frame and subscription when a field unmounts. A controller belongs to one mounted field at a time and must work across React strict mode remounts.

Run `npm run typecheck`, `npm test`, and `npm run build` after changing the package. Verify the built exports in a fresh consumer whenever packaging changes. For visual or pointer changes, compare against a frozen browser or native fixture rather than relying only on unit tests.

Never use the Unicode em dash character in generated code, comments, or docs.
