// usage: webgpu-browser run -- node tools/bench.mjs "<query>" ["<query2>" ...] — uncapped average frame time
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: false, executablePath: process.env.WEBGPU_CHROME, args: [...(process.env.WEBGPU_CHROME_ARGS || '').split(' ').filter(Boolean), '--disable-gpu-vsync', '--disable-frame-rate-limit', '--window-size=1600,990'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
for (const query of process.argv.slice(2)) {
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:8377/?hud=0&${query}`);
  await page.waitForFunction('window.__READY === true || window.__ERROR', null, { timeout: 120000 });
  const r = await page.evaluate(() => new Promise((res) => { let n = 0, t0 = 0; const f = (t) => { if (n === 0) t0 = t; if (++n > 200) { const i = window.__INFO(); res({ ms: +((t - t0) / 200).toFixed(2), tris: i.tris, calls: i.calls }); } else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
  console.log(query.padEnd(34), JSON.stringify(r));
  await page.close();
}
await browser.close();
