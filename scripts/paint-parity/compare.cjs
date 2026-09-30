/* ═══════════════════════════════════════════════════════════════════════════
 *  TWO RUNS, SCENE BY SCENE AND CANVAS BY CANVAS: HOW FAR APART, HOW MANY
 *  PIXELS, AND WHERE. A PASS IS A NUMBER, NOT A LOOK.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   node scripts/paint-parity/compare.cjs <runA> <runB>
 *        [--threshold=0] [--allow=0] [--heatmaps=<dir>] [--json]
 *
 * A pixel's delta is the largest absolute difference of its four channels
 * (straight RGBA, as captured). Per scene and canvas it reports the maximum
 * delta and how many pixels differ by more than 0, 2 and 8.
 *
 * FAILS (exit 1) when, in any scene or canvas, more than `--allow` pixels
 * have a delta above `--threshold`, or when the two runs disagree on a
 * canvas's size or presence. The defaults (0 and 0) demand identical bytes;
 * a looser gate is written on the command line where somebody can see it.
 *
 * Heatmaps (one PNG per scene and canvas with any difference, written to
 * `--heatmaps`, default `<runB>/diff-vs-<name of runA>`): an unchanged pixel
 * is a dim grey of run A's alpha, so the field stays readable; a changed one
 * is blue for a delta of 1 or 2, yellow for 3 to 8, red above 8, brighter
 * the larger it is.
 */
const fs = require('fs');
const path = require('path');
const { encodePng } = require('./png.cjs');

const positional = process.argv.slice(2).filter(a => !a.startsWith('--'));
const args = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--'))
  .map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), 'true'] : [a.slice(2, i), a.slice(i + 1)]; }));
if (positional.length !== 2) {
  console.error('usage: node compare.cjs <runA> <runB> [--threshold=0] [--allow=0] [--heatmaps=<dir>] [--json]');
  process.exit(2);
}
const [runA, runB] = positional;
const threshold = Number(args.threshold ?? 0);
const allow = Number(args.allow ?? 0);
if (!Number.isFinite(threshold) || threshold < 0 || !Number.isFinite(allow) || allow < 0) {
  console.error('--threshold and --allow must be non-negative numbers');
  process.exit(2);
}
const heatDir = args.heatmaps ?? path.join(runB, `diff-vs-${path.basename(path.resolve(runA))}`);
const load = dir => JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const A = load(runA), B = load(runB);

function heatmap(width, height, a, b) {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    let d = 0;
    for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(a[i * 4 + k] - b[i * 4 + k]));
    const o = i * 4;
    if (!d) {
      const g = 24 + Math.round(a[o + 3] * 0.4);
      out[o] = out[o + 1] = out[o + 2] = g;
    } else {
      const lift = Math.min(1, 0.55 + d / 64);
      const [r, g, bl] = d <= 2 ? [60, 140, 255] : d <= 8 ? [255, 220, 40] : [255, 40, 40];
      out[o] = Math.round(r * lift);
      out[o + 1] = Math.round(g * lift);
      out[o + 2] = Math.round(bl * lift);
    }
    out[o + 3] = 255;
  }
  return out;
}

const rows = [];
let failed = false;
const names = [...new Set([...A.scenes.map(s => s.scene), ...B.scenes.map(s => s.scene)])];
for (const name of names) {
  const sa = A.scenes.find(s => s.scene === name), sb = B.scenes.find(s => s.scene === name);
  if (!sa || !sb) {
    rows.push({ scene: name, canvas: '*', error: `missing from ${sa ? 'B' : 'A'}` });
    failed = true;
    continue;
  }
  for (const canvas of ['dots', 'fabric']) {
    const ca = sa.canvases[canvas], cb = sb.canvases[canvas];
    if (!ca && !cb) continue;
    if (!ca || !cb || ca.width !== cb.width || ca.height !== cb.height) {
      rows.push({ scene: name, canvas, error: `size ${ca ? `${ca.width}x${ca.height}` : 'absent'} vs ${cb ? `${cb.width}x${cb.height}` : 'absent'}` });
      failed = true;
      continue;
    }
    const a = fs.readFileSync(path.join(runA, `${name}.${canvas}.rgba`));
    const b = fs.readFileSync(path.join(runB, `${name}.${canvas}.rgba`));
    let max = 0, over0 = 0, over2 = 0, over8 = 0, overT = 0;
    for (let i = 0; i < a.length; i += 4) {
      let d = 0;
      for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(a[i + k] - b[i + k]));
      if (d > max) max = d;
      if (d > 0) over0++;
      if (d > 2) over2++;
      if (d > 8) over8++;
      if (d > threshold) overT++;
    }
    const row = { scene: name, canvas, size: `${ca.width}x${ca.height}`, max, over0, over2, over8, overThreshold: overT };
    if (overT > allow) { row.fail = true; failed = true; }
    if (over0) {
      fs.mkdirSync(heatDir, { recursive: true });
      row.heatmap = path.join(heatDir, `${name}.${canvas}.heat.png`);
      fs.writeFileSync(row.heatmap, encodePng(ca.width, ca.height, heatmap(ca.width, ca.height, a, b)));
    }
    rows.push(row);
  }
}

if (args.json) console.log(JSON.stringify({ runA, runB, threshold, allow, failed, rows }, null, 2));
else {
  console.log(`A: ${runA} (${A.engine})\nB: ${runB} (${B.engine})\ngate: at most ${allow} pixel(s) with delta > ${threshold}\n`);
  console.log(`${'scene'.padEnd(20)} ${'canvas'.padEnd(7)} ${'size'.padEnd(10)} ${'max'.padStart(4)} ${'>0'.padStart(8)} ${'>2'.padStart(8)} ${'>8'.padStart(8)}  result`);
  for (const r of rows) {
    if (r.error) { console.log(`${r.scene.padEnd(20)} ${r.canvas.padEnd(7)} ${r.error}  FAIL`); continue; }
    console.log(`${r.scene.padEnd(20)} ${r.canvas.padEnd(7)} ${r.size.padEnd(10)} ${String(r.max).padStart(4)} ${String(r.over0).padStart(8)} ${String(r.over2).padStart(8)} ${String(r.over8).padStart(8)}  ${r.fail ? 'FAIL' : 'ok'}`);
  }
  const worst = rows.reduce((m, r) => Math.max(m, r.max ?? 0), 0);
  console.log(`\n${rows.length} comparison(s), worst max delta ${worst}: ${failed ? 'FAIL' : 'PASS'}`);
  if (rows.some(r => r.heatmap)) console.log(`heatmaps: ${heatDir}`);
}
process.exit(failed ? 1 : 0);
