// Screenshot harness. Run through:  navier-job -- webgpu-browser run -- node tools/shots.mjs [opts] name=query ...
//   --size 1600x900   --base http://127.0.0.1:8377/   --out shots   --wait 0 (extra ms after ready)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
let size = [1600, 900], base = 'http://127.0.0.1:8377/', out = 'shots', extra = 400, timeout = 180000;
const shots = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--size') size = args[++i].split('x').map(Number);
  else if (a === '--base') base = args[++i];
  else if (a === '--out') out = args[++i];
  else if (a === '--wait') extra = Number(args[++i]);
  else if (a === '--timeout') timeout = Number(args[++i]);
  else {
    const k = a.indexOf('=');
    shots.push({ name: a.slice(0, k), query: a.slice(k + 1) });
  }
}
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  executablePath: process.env.WEBGPU_CHROME,
  args: [...(process.env.WEBGPU_CHROME_ARGS || '').split(' ').filter(Boolean), `--window-size=${size[0]},${size[1] + 90}`],
});
const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
let failed = 0;
for (const s of shots) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${t}`);
    else if (/^GPU:|^\[perf\]|^\[info\]/.test(t)) console.log(`  ${t}`);
  });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  const url = /(^|&)hud=/.test(s.query) ? `${base}?${s.query}` : `${base}?hud=0&${s.query}`;
  const t0 = Date.now();
  try {
    await page.goto(url, { waitUntil: 'load', timeout });
    await page.waitForFunction('window.__READY === true || window.__ERROR', null, { timeout });
    const err = await page.evaluate('window.__ERROR || null');
    if (err) throw new Error(err);
    await page.waitForTimeout(extra);
    const info = await page.evaluate('window.__INFO ? window.__INFO() : null');
    await page.screenshot({ path: `${out}/${s.name}.png` });
    console.log(`${s.name}: ok in ${((Date.now() - t0) / 1000).toFixed(1)}s ${info ? JSON.stringify(info) : ''}`);
  } catch (e) {
    failed++;
    console.log(`${s.name}: FAILED ${e.message.split('\n')[0]}`);
    try { await page.screenshot({ path: `${out}/${s.name}-fail.png` }); } catch {}
  }
  const seen = new Set();
  for (const e of errors) { const k = e.slice(0, 300); if (!seen.has(k)) { seen.add(k); console.log('   ' + e.slice(0, 1500)); } }
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
