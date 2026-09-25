# Contributing

Install dependencies with `npm ci`. Before proposing a package change, run `npm run typecheck`, `npm test`, and `npm run build`. For demo changes, also run `npm --prefix demo ci` and `npm run demo:build`.

Keep the package independent of host applications and of the demo's shadcn/ui code. Public API changes belong in `src/index.ts` and `docs/API.md`. Preserve the field's reduced motion behavior, idle sleep path, visibility pause, resize and device pixel ratio handling, and listener cleanup.

If you change field rendering or pointer behavior, compare it in a browser fixture against the previous version. A visual change needs a visual check in both themes.
