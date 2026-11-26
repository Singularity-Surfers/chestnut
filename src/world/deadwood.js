// Coarse woody debris: the fallen giants, snags and shed limbs that mark an unlogged forest.
import * as THREE from 'three';
import { RNG, clamp, lerp, noise2 } from '../core/rng.js';
import { G, WORLD, makeInstancedGeometry, setInstances, registerCaster } from '../core/engine.js';
import { Buf, tube, toGeometry } from '../flora/treegen.js';

const HALF = WORLD / 2;

export function buildDeadwood(terrain, eco, veg, seed) {
  const rng = new RNG(seed).fork('deadwood');
  const group = new THREE.Group();
  group.name = 'deadwood';
  const barkDead = veg._barkMat('deadwood');
  const barkChest = veg._barkMat('chestnut');
  const logs = [];     // { x0,z0,x1,z1,r } for placement of other things
  const bufs = { dead: new Buf(), chest: new Buf() };
  const H = (x, z) => terrain.heightAt(clamp(x, -HALF + 1, HALF - 1), clamp(z, -HALF + 1, HALF - 1));

  function addLog(x, z, az, L, r0, r1, kind, opts = {}) {
    const n = Math.max(3, Math.ceil(L / 0.7));
    const dx = Math.cos(az), dz = Math.sin(az);
    // rest a rigid pole on the terrain: least-squares line lifted onto the high points
    const hs = [];
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * L;
      const h = H(x + dx * s, z + dz * s);
      hs.push(h); sx += s; sy += h; sxx += s * s; sxy += s * h;
    }
    const m = n + 1;
    const b = (m * sxy - sx * sy) / Math.max(1e-6, m * sxx - sx * sx), a = (sy - b * sx) / m;
    let lift = -1e9;
    for (let i = 0; i <= n; i++) lift = Math.max(lift, hs[i] - (a + b * (i / n) * L));
    const sag = opts.sag ?? 0.35;      // old logs slump into the ground
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, s = t * L;
      const r = lerp(r0, r1, t) * (1 + 0.06 * noise2(s * 0.7, r0 * 9, 3));
      const yl = a + b * s + lift;
      const y = lerp(yl, hs[i], sag) + r * (opts.sink ?? 0.62);
      const wob = (opts.wobble ?? 0.05) * noise2(s * 0.25, az * 3, 5);
      pts.push({ p: [x + dx * s - dz * wob, y, z + dz * s + dx * wob], r });
    }
    const br = { pts, level: 1, flex0: 0, flex1: 0, L };
    const bark = kind === 'chest' ? barkChest.bark : barkDead.bark;
    tube(bufs[kind], br, r0 > 0.35 ? 16 : r0 > 0.12 ? 10 : 6, 1, bark, { H: 10, limbAO: 0.9 });
    // end caps
    for (const end of [0, n]) {
      const c = pts[end], d = end === 0 ? -1 : 1;
      const buf = bufs[kind];
      const base = buf.n;
      const seg = 12;
      buf.pos.push(c.p[0] + dx * d * c.r * 0.15, c.p[1], c.p[2] + dz * d * c.r * 0.15);
      buf.nor.push(dx * d, 0, dz * d); buf.uv.push(0.5, 0.01); buf.col.push(0.6, 0, 0.5, 0.25);
      for (let k = 0; k <= seg; k++) {
        const th = k / seg * 6.283;
        const jag = 1 + 0.12 * Math.sin(th * 5 + az);
        const ox = -dz * Math.cos(th), oz = dx * Math.cos(th), oy = Math.sin(th);
        buf.pos.push(c.p[0] + ox * c.r * 0.97 * jag, c.p[1] + oy * c.r * 0.97 * jag, c.p[2] + oz * c.r * 0.97 * jag);
        buf.nor.push(dx * d, 0, dz * d); buf.uv.push(0.5 + 0.02 * Math.cos(th), 0.01 + 0.02 * Math.sin(th)); buf.col.push(0.75, 0, 0.5, 0.25);
      }
      // both caps face out along the log: the ring runs the other way round at the far end
      for (let k = 0; k < seg; k++) { if (d < 0) buf.idx.push(base, base + 1 + k, base + 2 + k); else buf.idx.push(base, base + 2 + k, base + 1 + k); }
    }
    logs.push({ x0: x, z0: z, x1: x + dx * L, z1: z + dz * L, r: r0 });
    return pts;
  }

  // 1. the fallen giant in every gap, with its shattered limbs
  for (const g of eco.gaps) {
    const L = rng.f(16, 28), r0 = rng.f(0.45, 0.85);
    const x = g.x - Math.cos(g.ang) * L * 0.4, z = g.z - Math.sin(g.ang) * L * 0.4;
    addLog(x, z, g.ang, L, r0, r0 * 0.45, 'chest', { sag: 0.2 });
    // the upturned root plate: a wall of roots and soil where the tree stood
    {
      const buf = bufs.dead, base = buf.n;
      const dx = Math.cos(g.ang), dz = Math.sin(g.ang);
      const cy = H(x, z) + r0 * 0.9, R = r0 * rng.f(2.6, 3.4), seg = 18;
      buf.pos.push(x - dx * 0.25, cy, z - dz * 0.25); buf.nor.push(-dx, 0.15, -dz); buf.uv.push(0.5, 0.5); buf.col.push(0.45, 0, 0.3, 0.25);
      for (let k = 0; k <= seg; k++) {
        const th = k / seg * 6.283, jag = 1 + 0.28 * Math.sin(th * 7 + g.ang * 3) + 0.15 * Math.sin(th * 13 + 1);
        const ox = -dz * Math.cos(th), oz = dx * Math.cos(th), oy = Math.sin(th);
        buf.pos.push(x + ox * R * jag + dx * 0.35 * Math.abs(Math.cos(th * 3)), Math.max(cy + oy * R * jag, H(x + ox * R, z + oz * R) - 0.3), z + oz * R * jag + dz * 0.35 * Math.abs(Math.cos(th * 3)));
        buf.nor.push(-dx * 0.8 + ox * 0.4, 0.2 + oy * 0.4, -dz * 0.8 + oz * 0.4); buf.uv.push(0.5 + 0.9 * Math.cos(th), 0.5 + 0.9 * Math.sin(th)); buf.col.push(0.6, 0, 0.4, 0.25);
      }
      for (let k = 0; k < seg; k++) { buf.idx.push(base, base + 1 + k, base + 2 + k); buf.idx.push(base, base + 2 + k, base + 1 + k); }
      for (let k = 0; k < 7; k++) {
        const th = rng.f(0, 6.283), rl = R * rng.f(0.7, 1.3);
        const ox = -dz * Math.cos(th), oz = dx * Math.cos(th), oy = Math.sin(th);
        const pts = [];
        for (let q = 0; q <= 4; q++) { const t = q / 4; pts.push({ p: [x + ox * rl * t - dx * 0.5 * t * (1 - t) * 4, Math.max(cy + oy * rl * t, H(x, z) + 0.05), z + oz * rl * t - dz * 0.5 * t * (1 - t) * 4], r: r0 * 0.3 * (1 - 0.8 * t) + 0.01 }); }
        tube(buf, { pts, level: 1, flex0: 0, flex1: 0, L: rl }, 6, 1, barkDead.bark, { H: 10, limbAO: 0.7 });
      }
    }
    for (let k = 0; k < 5; k++) {
      const s = rng.f(0.5, 0.95) * L;
      const bx = x + Math.cos(g.ang) * s, bz = z + Math.sin(g.ang) * s;
      addLog(bx, bz, g.ang + rng.f(0.5, 1.2) * (rng.chance(0.5) ? 1 : -1), rng.f(2.5, 7), rng.f(0.08, 0.2), 0.03, 'dead', { sag: 0.5, sink: 0.8 });
    }
  }
  // 2. older logs anywhere, a few bridging the stream
  for (let i = 0; i < 520; i++) {
    const x = rng.f(-HALF + 15, HALF - 15), z = rng.f(-HALF + 15, HALF - 15);
    const big = rng.chance(0.22);
    const L = big ? rng.f(9, 20) : rng.f(3, 9), r0 = big ? rng.f(0.28, 0.6) : rng.f(0.07, 0.2);
    const az = rng.f(0, 6.283);
    if (terrain.fields.trail.at(x, z) > 0.1 || terrain.fields.trail.at(x + Math.cos(az) * L, z + Math.sin(az) * L) > 0.1) continue;
    if (!big && terrain.fields.streamDist.at(x, z) < 2) continue;
    // decay classes: fresh and round, slumped and mossy, or a low punky ridge almost gone into the soil
    const decay = rng.next();
    addLog(x, z, az, L, r0, r0 * rng.f(0.35, 0.7), decay < 0.4 && big ? 'chest' : 'dead', { sag: decay < 0.4 ? rng.f(0.15, 0.35) : decay < 0.75 ? rng.f(0.45, 0.7) : 0.95, sink: decay < 0.4 ? rng.f(0.7, 0.85) : decay < 0.75 ? rng.f(0.45, 0.62) : rng.f(0.15, 0.32), wobble: decay > 0.75 ? 0.12 : 0.05 });
  }
  // 3. standing snags
  const snags = [];
  for (let i = 0; i < 150; i++) {
    const x = rng.f(-HALF + 10, HALF - 10), z = rng.f(-HALF + 10, HALF - 10);
    if (terrain.fields.streamDist.at(x, z) < 3 || terrain.fields.trail.at(x, z) > 0.05) continue;
    if (eco.big.blocked(x, z, 1.0, 0.5)) continue;
    const r0 = rng.chance(0.3) ? rng.f(0.5, 0.95) : rng.f(0.18, 0.5);
    const h = Math.min(24, r0 * rng.f(14, 34));
    const y = H(x, z);
    const pts = [];
    const lean = rng.f(0, 0.2) * rng.f(0, 1), laz = rng.f(0, 6.283);
    const n = Math.ceil(h / 0.9);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const r = r0 * (1 - 0.3 * t) * (1 + 0.05 * noise2(t * 7, i, 9));
      const kx = 0.12 * noise2(t * 3.1, i * 1.7, 21) * h * 0.06, kz = 0.12 * noise2(t * 3.1, i * 2.3, 23) * h * 0.06;
      pts.push({ p: [x + Math.cos(laz) * lean * h * t * t + kx, y + h * t - 0.05, z + Math.sin(laz) * lean * h * t * t + kz], r });
    }
    const kind = rng.chance(0.6) ? 'chest' : 'dead';
    const bark = kind === 'chest' ? barkChest.bark : barkDead.bark;
    tube(bufs[kind], { pts, level: 0, flex0: 0, flex1: 0, L: h, isTrunk: true }, 14, 1, bark, { H: h, flare: 1.4, flareH: 0.08, buttress: 0.2, lobes: 5, lobePh: i, burl: 0.05 });
    // splintered top
    const top = pts[n], buf = bufs[kind], base = buf.n;
    buf.pos.push(top.p[0], top.p[1] + top.r * rng.f(0.6, 1.6), top.p[2]); buf.nor.push(0, 1, 0); buf.uv.push(0.5, 0.02); buf.col.push(0.8, 0, 1, 0);
    for (let k = 0; k <= 10; k++) {
      const th = k / 10 * 6.283;
      buf.pos.push(top.p[0] + Math.cos(th) * top.r, top.p[1] + top.r * 0.3 * Math.sin(th * 3 + i), top.p[2] + Math.sin(th) * top.r);
      buf.nor.push(Math.cos(th) * 0.5, 0.86, Math.sin(th) * 0.5); buf.uv.push(0.5 + 0.02 * Math.cos(th), 0.02 + 0.02 * Math.sin(th)); buf.col.push(0.8, 0, 1, 0);
    }
    for (let k = 0; k < 10; k++) buf.idx.push(base, base + 2 + k, base + 1 + k);
    // a few broken limb stubs
    for (let k = 0; k < rng.i(1, 4); k++) {
      const t = rng.f(0.45, 0.95), bi = Math.floor(t * n), bp = pts[bi];
      const a = rng.f(0, 6.283), up = rng.f(0.2, 0.9), bl = rng.f(0.6, 2.4), br0 = bp.r * rng.f(0.25, 0.4);
      const sp = [];
      for (let q = 0; q <= 3; q++) sp.push({ p: [bp.p[0] + Math.cos(a) * bl * q / 3, bp.p[1] + up * bl * q / 3, bp.p[2] + Math.sin(a) * bl * q / 3], r: br0 * (1 - 0.2 * q) });
      tube(bufs[kind], { pts: sp, level: 1, flex0: 0, flex1: 0, L: bl }, 7, 1, bark, { H: h, limbAO: 0.9 });
    }
    snags.push({ x, z, r: r0 });
    veg.colliders.push([x, z, r0 * 1.3 + 0.3]);
  }
  for (const l of logs) if (l.r > 0.3) {
    // big logs block walking
    const n = Math.ceil(Math.hypot(l.x1 - l.x0, l.z1 - l.z0) / 0.6);
    for (let i = 0; i <= n; i++) veg.colliders.push([lerp(l.x0, l.x1, i / n), lerp(l.z0, l.z1, i / n), l.r + 0.25]);
  }
  veg._buildColliderGrid();

  for (const [kind, mats] of [['dead', barkDead], ['chest', barkChest]]) {
    const b = bufs[kind];
    if (!b.n) continue;
    const geo = toGeometry(b, false);
    // deadwood is mossier than living bark
    const main = mats.main.clone();
    main.uniforms = { ...mats.main.uniforms, uMossy: { value: 1.7 }, uGroundH: { value: 1 } };
    const ig = makeInstancedGeometry(geo, 1);
    setInstances(ig, new Float32Array([0, -1000, 0, 1]), new Float32Array([0, 0.5, 0, 0]), 1);
    // iA.y is the "root collar" height used for moss: push it far below so the whole log reads as "above base"
    ig.attributes.iA.array[1] = 0;
    const mesh = new THREE.Mesh(ig, main);
    mesh.frustumCulled = false; mesh.matrixAutoUpdate = false;
    group.add(mesh);
    registerCaster(mesh, mats.depth, false);
    registerCaster(mesh, mats.depth, true);
  }
  console.log('[info] deadwood: ' + logs.length + ' logs, ' + snags.length + ' snags');
  return { group, logs, snags };
}
