# Verification

Run the package checks from the repository root:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm --prefix demo ci
npm run demo:build
```

The package tests cover controller attachment, scene updates, and strict mode remount behavior. The demo build checks its TypeScript and emits the static site used by GitHub Pages. CI runs these checks on pushes and pull requests. For visual or pointer changes, inspect the demo in both themes, on wide and narrow viewports, and with mouse, touch, and keyboard input.

To check Git packaging, install `git+https://github.com/angelolibero/surface-field.git` in a clean temporary React consumer and import `SurfaceField` and `createSurfaceFieldController` from `surface-field`. The Git install runs `prepare`, which generates the JavaScript and declarations used by consumers.
