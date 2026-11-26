// usage: webgpu-browser run -- node tools/eval.mjs "<query>" "<js expression>"
import { chromium } from 'playwright-core';
const [query, expr] = process.argv.slice(2);
const browser = await chromium.launch({ headless: false, executablePath: process.env.WEBGPU_CHROME, args: (process.env.WEBGPU_CHROME_ARGS || '').split(' ').filter(Boolean) });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('[err]', m.text().slice(0, 600)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:8377/?hud=0&${query}`);
await page.waitForFunction('window.__READY === true || window.__ERROR', null, { timeout: 120000 });
console.log(JSON.stringify(await page.evaluate(expr)));
await browser.close();
