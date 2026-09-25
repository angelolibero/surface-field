# Surface Field demo

This Vite app uses the standalone `surface-field` package and official shadcn/ui components for its controls. Try it at [angelolibero.github.io/surface-field](https://angelolibero.github.io/surface-field/). It is a working playground, not part of the library runtime or npm package.

From the repository root:

```bash
npm ci
npm run build
cd demo
npm ci
npm run dev
```

Open the URL printed by Vite. Use the sidebar to select a preset or tune individual props. Drag or resize the three empty surfaces by their handles. Focus a handle and use arrow keys to move or resize its surface; Shift reduces each step to one pixel. Copy React config writes a self-contained backdrop with the current field props and accent to the clipboard. The interactive surfaces in this demo are connected separately through the field controller; see the root README for that API. On narrow screens, the controls open in a sheet.

`npm run build` in this directory checks TypeScript and emits a static site in `demo/dist/`. The Vite base path matches this repository's GitHub Pages URL. Pushes to `main` deploy the built demo through GitHub Actions.
