/* ═══════════════════════════════════════════════════════════════════════════
 *  ONE RUN: EVERY SCENE THROUGH THE REAL ENGINE IN A HIDDEN WINDOW, WRITTEN
 *  AS RAW RGBA (WHAT IS COMPARED) AND PNG (WHAT IS LOOKED AT).
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   electron scripts/paint-parity/capture.cjs --out=<dir> [--engine=<engine.ts>]
 *            [--scenes=a,b,c] [--user-data-dir=<dir>]
 *
 * The page half (`page.ts` with `scenes.ts` and the engine source) is bundled
 * here with the esbuild already in the package's node_modules, and evaluated
 * in an `about:blank` window that is never shown. Per scene it writes:
 *
 *   <scene>.dots.rgba / .dots.png       the dots canvas, backing size
 *   <scene>.fabric.rgba / .fabric.png   the fabric canvas (absent when unconnected)
 *   <scene>.light.png / .dark.png       fabric then dots over a light and a dark ground
 *
 * and a `manifest.json` with sizes, clock and frame counts. Raw files are
 * straight RGBA, row major, no header: the manifest holds the dimensions.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { encodePng, composite } = require('./png.cjs');

const ROOT = path.resolve(__dirname, '../..');
/* The two grounds a composite is laid on: near-white paper and a near-black
   room, the two ends a host puts this field over. */
const GROUNDS = { light: [250, 250, 250], dark: [18, 18, 20] };

const args = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--'))
  .map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), 'true'] : [a.slice(2, i), a.slice(i + 1)]; }));
/* The engine under test: the working tree's by default, or any other copy of
   `src/engine.ts` (a released version, a stash) so two versions can be
   captured and compared. Its relative imports still resolve against `src/`. */
const engine = path.resolve(args.engine ?? path.join(ROOT, 'src', 'engine.ts'));
const out = args.out;
if (args['user-data-dir']) app.setPath('userData', path.resolve(args['user-data-dir']));
/* A fixed colour profile, so a display's profile cannot reach the numbers. */
app.commandLine.appendSwitch('force-color-profile', 'srgb');

const fail = message => { console.error(`paint-parity: ${message}`); app.exit(1); };

app.whenReady().then(async () => {
  if (!out) return fail('--out=<dir> is required');
  if (!fs.existsSync(engine)) return fail(`--engine: no file at ${engine}`);
  const esbuild = require(path.join(ROOT, 'node_modules', 'esbuild'));
  const src = path.join(ROOT, 'src');
  const swap = {
    name: 'engine',
    setup(build) {
      build.onResolve({ filter: /src\/engine$/ }, () => ({ path: engine }));
      build.onResolve({ filter: /^\./ }, async a => a.importer === engine && path.dirname(engine) !== src
        ? build.resolve(a.path, { resolveDir: src, kind: a.kind })
        : undefined);
    },
  };
  const bundle = (await esbuild.build({
    entryPoints: [path.join(__dirname, 'page.ts')],
    bundle: true,
    format: 'iife',
    target: 'es2022',
    write: false,
    logLevel: 'error',
    plugins: [swap],
  })).outputFiles[0].text;

  const win = new BrowserWindow({
    width: 800, height: 600, show: false,
    webPreferences: { backgroundThrottling: false, offscreen: false },
  });
  await win.loadURL('about:blank');
  await win.webContents.executeJavaScript(bundle);
  const all = await win.webContents.executeJavaScript('window.paintParity.scenes');
  const wanted = args.scenes ? args.scenes.split(',') : all.map(s => s.name);
  const unknown = wanted.filter(n => !all.some(s => s.name === n));
  if (unknown.length) return fail(`unknown scene(s): ${unknown.join(', ')}`);

  fs.mkdirSync(out, { recursive: true });
  const manifest = { engine: engine.startsWith(ROOT + path.sep) ? path.relative(ROOT, engine) : engine, electron: process.versions.electron, chrome: process.versions.chrome, scenes: [] };
  for (const name of wanted) {
    let result;
    try {
      result = await win.webContents.executeJavaScript(`window.paintParity.run(${JSON.stringify(name)})`);
    } catch (error) {
      return fail(`scene "${name}": ${error.message ?? error}`);
    }
    if (result.error) return fail(`scene "${name}": ${result.error}`);
    const entry = { ...result, about: all.find(s => s.name === name).about, canvases: {} };
    delete entry.dots;
    delete entry.fabric;
    const layers = {};
    for (const canvas of ['dots', 'fabric']) {
      const c = result[canvas];
      if (!c) continue;
      const rgba = Buffer.from(c.rgba, 'base64');
      layers[canvas] = rgba;
      fs.writeFileSync(path.join(out, `${name}.${canvas}.rgba`), rgba);
      fs.writeFileSync(path.join(out, `${name}.${canvas}.png`), encodePng(c.width, c.height, rgba));
      entry.canvases[canvas] = { width: c.width, height: c.height };
    }
    const { width, height } = result.dots;
    for (const [ground, colour] of Object.entries(GROUNDS)) {
      fs.writeFileSync(path.join(out, `${name}.${ground}.png`),
        encodePng(width, height, composite(width, height, colour, [layers.fabric, layers.dots])));
    }
    manifest.scenes.push(entry);
    console.log(`${name.padEnd(20)} ${width}x${height} t=${result.time}ms frames=${result.frames}`);
  }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`paint-parity: ${wanted.length} scene(s), engine ${manifest.engine}, written to ${path.resolve(out)}`);
  app.quit();
}).catch(error => fail(error.stack ?? String(error)));
