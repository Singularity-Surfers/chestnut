// Temporal-noise probe: holds the camera still and saves N consecutive screenshots, so per-pixel
// frame-to-frame variation (shadow/AO crawl) can be measured. Run through:
//   navier-job -- webgpu-browser run -- node tools/noise.mjs --out DIR --n 12 --gap 120 "query"
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
let out = 'shots/noise', n = 12, gap = 120, base = 'http://127.0.0.1:8377/', size = [1280, 720], query = '';
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') out = args[++i];
  else if (a === '--n') n = Number(args[++i]);
  else if (a === '--gap') gap = Number(args[++i]);
  else if (a === '--base') base = args[++i];
  else if (a === '--size') size = args[++i].split('x').map(Number);
  else query = a;
}
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: false, executablePath: process.env.WEBGPU_CHROME,
  args: [...(process.env.WEBGPU_CHROME_ARGS || '').split(' ').filter(Boolean), `--window-size=${size[0]},${size[1] + 90}`],
});
const page = await (await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[error]', m.text().slice(0, 400)); });
await page.goto(`${base}?hud=0&dyn=0&${query}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__READY === true || window.__ERROR', null, { timeout: 180000 });
await page.waitForTimeout(2500);
for (let i = 0; i < n; i++) {
  await page.screenshot({ path: `${out}/f${String(i).padStart(2, '0')}.png` });
  await page.waitForTimeout(gap);
}
console.log('saved', n, 'frames to', out);
await browser.close();
