// Checks, for each generator, which way its triangles face relative to their vertex normals.
// navier-job -- webgpu-browser run -- node tools/check-winding.mjs
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: false, executablePath: process.env.WEBGPU_CHROME, args: (process.env.WEBGPU_CHROME_ARGS || '').split(' ').filter(Boolean) });
const page = await (await browser.newContext()).newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto('http://127.0.0.1:8377/tools/debug-bark.html?only=chestnut');
const r = await page.evaluate(async () => {
  const T = await import('/src/flora/treegen.js');
  const bark = { tile: [0.9, 2.0] };
  const check = (buf) => {
    let agree = 0, n = 0;
    for (let t = 0; t < buf.idx.length; t += 3) {
      const [a, b, c] = [buf.idx[t], buf.idx[t + 1], buf.idx[t + 2]];
      const P = (i) => [buf.pos[i * 3], buf.pos[i * 3 + 1], buf.pos[i * 3 + 2]];
      const pa = P(a), pb = P(b), pc = P(c);
      const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
      const fn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const vn = [0, 1, 2].map((k) => buf.nor[a * 3 + k] + buf.nor[b * 3 + k] + buf.nor[c * 3 + k]);
      const d = fn[0] * vn[0] + fn[1] * vn[1] + fn[2] * vn[2];
      if (Math.abs(d) < 1e-12) continue;
      n++; if (d > 0) agree++;
    }
    return `${agree}/${n} triangles face the same way as their normals`;
  };
  const b1 = new T.Buf();
  T.tube(b1, { pts: [{ p: [0, 0, 0], r: 0.5 }, { p: [0, 2, 0], r: 0.45 }, { p: [0.2, 4, 0], r: 0.4 }], level: 1, flex0: 0, flex1: 0, L: 4 }, 12, 1, bark, {});
  const b2 = new T.Buf();
  T.tube(b2, { pts: [{ p: [0, 0, 0], r: 0.8 }, { p: [0, 3, 0], r: 0.7 }, { p: [0, 6, 0], r: 0.6 }], level: 0, flex0: 0, flex1: 0, L: 6, isTrunk: true }, 16, 1, bark, { flare: 1.4, buttress: 0.3 });
  return { branch: check(b1), trunk: check(b2) };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
