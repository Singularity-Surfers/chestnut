// usage: webgpu-browser run -- node tools/evalshot.mjs WxH "<query>" out.png "<js to run before the shot>"
import { chromium } from 'playwright-core';
const [size, query, out, expr] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ headless: false, executablePath: process.env.WEBGPU_CHROME, args: [...(process.env.WEBGPU_CHROME_ARGS || '').split(' ').filter(Boolean), `--window-size=${w},${h + 90}`] });
const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:8377/?hud=0&${query}`);
await page.waitForFunction('window.__READY === true || window.__ERROR', null, { timeout: 120000 });
if (expr) console.log(JSON.stringify(await page.evaluate(expr)));
await page.waitForTimeout(1500);
await page.screenshot({ path: out });
await browser.close();
