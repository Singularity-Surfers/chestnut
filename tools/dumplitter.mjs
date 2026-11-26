// Save the baked forest-floor litter textures as PNGs. Run through:
//   navier-job -- webgpu-browser run -- node tools/dumplitter.mjs --out DIR
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'shots/litter';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: false, executablePath: process.env.WEBGPU_CHROME,
  args: (process.env.WEBGPU_CHROME_ARGS || '').split(' ').filter(Boolean) });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
await page.goto('http://127.0.0.1:8377/?hud=0', { waitUntil: 'load' });
await page.waitForFunction('window.__READY === true || window.__ERROR', null, { timeout: 180000 });
for (const k of ['A', 'B', 'C', 'D', 'E']) {
  const url = await page.evaluate((k) => window.__litterPNG(k), k);
  writeFileSync(`${out}/litter_${k}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
console.log('saved to', out);
await browser.close();
