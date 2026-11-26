// Records what the compositor actually shows (CDP screencast) while the page runs with its normal HUD settings,
// and prints the page's [diag] log. Frames go to <out>/f_<ms>.jpg for brightness analysis.
//   navier-job -- webgpu-browser run -- node tools/flashdiag.mjs --out DIR --size 1440x900 --dpr 2 --secs 60 "query"
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const a = process.argv.slice(2);
let out = 'diag', size = [1440, 900], dpr = 2, secs = 60, query = 'diag=1&walk=1';
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--out') out = a[++i]; else if (a[i] === '--size') size = a[++i].split('x').map(Number);
  else if (a[i] === '--dpr') dpr = Number(a[++i]); else if (a[i] === '--secs') secs = Number(a[++i]); else query = a[i];
}
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: false, executablePath: process.env.WEBGPU_CHROME,
  args: [...(process.env.WEBGPU_CHROME_ARGS || '').split(' ').filter(Boolean), `--window-size=${size[0]},${size[1] + 90}`, '--enable-precise-memory-info'] });
const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: dpr });
const page = await ctx.newPage();
const t0 = Date.now();
page.on('console', (m) => { const t = m.text(); if (/^\[diag\]|^\[info\] world/.test(t) || m.type() === 'error') console.log(t.slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:8377/?' + query, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__READY === true || window.__ERROR', null, { timeout: 180000 });
try { await page.click('#enter', { timeout: 3000 }); } catch {}
const cdp = await ctx.newCDPSession(page);
let n = 0;
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const ms = Math.round(metadata.timestamp * 1000);
  writeFileSync(`${out}/f_${ms}.jpg`, Buffer.from(data, 'base64'));
  frames.push(ms); n++;
  try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 50, maxWidth: 240, maxHeight: 150, everyNthFrame: 1 });
console.log(`recording ${secs}s at ${size[0]}x${size[1]} dpr ${dpr}`);
await page.waitForTimeout(secs * 1000);
await cdp.send('Page.stopScreencast');
console.log(`frames captured: ${n} (${(n / secs).toFixed(1)}/s)`);
await browser.close();
