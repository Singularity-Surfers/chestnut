// Curated viewpoints, found procedurally in whatever cove the seed produced.
import { WORLD } from '../core/engine.js';
import { clamp } from '../core/rng.js';

const yawTo = (dx, dz) => Math.atan2(-dx, -dz);

export function findViews(terrain, eco, water) {
  const H = terrain.heightAt, F = terrain.fields;
  const lim = WORLD / 2 - 45;
  const views = {};
  const giants = eco.trees.filter((t) => t.sp === 'chestnut' && t.cls === 'giant');
  // nearest spot with no stems or shrubs crowding the lens
  // a lens position is clear when no crown, shrub or bole crowds it (r scales the required margin)
  const isClear = (x, z, r) => {
    if (F.streamDist.at(x, z) < 0.5) return false;
    for (const e of eco.small.near(x, z, 7)) {
      const t = e[3]; const d = Math.hypot(e[0] - x, e[1] - z);
      if (d < ((t && t.crownR) || 0.8) + r * 0.55) return false;
    }
    for (const e of eco.big.near(x, z, 10)) {
      const t = e[3]; const d = Math.hypot(e[0] - x, e[1] - z);
      const young = t && (t.cls === 'pole' || t.cls === 'sap');
      if (d < (young ? t.crownR * 0.8 + r * 0.5 : (t ? t.dbh * 0.8 : 1) + 2.2)) return false;
    }
    return true;
  };
  const findClear = (x, z, r, maxR = 7) => {
    for (let d = 0; d <= maxR; d += 0.5) for (let a = 0; a < 6.283; a += 0.5) {
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (Math.abs(px) < lim && Math.abs(pz) < lim && isClear(px, pz, r)) return [px, pz];
    }
    return [x, z];
  };
  const around = (g, dist, r) => {
    // ignore the subject tree itself when testing clearance
    const clearBut = (x, z) => {
      if (F.streamDist.at(x, z) < 0.5) return false;
      for (const e of eco.small.near(x, z, 7)) { const t = e[3]; if (Math.hypot(e[0] - x, e[1] - z) < ((t && t.crownR) || 0.8) + r * 0.55) return false; }
      for (const e of eco.big.near(x, z, 10)) {
        const t = e[3]; if (t === g) continue;
        const d = Math.hypot(e[0] - x, e[1] - z); const young = t && (t.cls === 'pole' || t.cls === 'sap');
        if (d < (young ? t.crownR * 0.8 + r * 0.5 : 2.6)) return false;
      }
      return true;
    };
    for (const k of [1, 1.25, 1.6]) for (let a = 0; a < 6.283; a += 0.3) { const px = g.x + Math.cos(a + 2.2) * dist * k, pz = g.z + Math.sin(a + 2.2) * dist * k; if (clearBut(px, pz)) return [px, pz]; }
    return [g.x + dist, g.z];
  };
  const near = (x, z, list) => list.reduce((b, t) => { const d = Math.hypot(t.x - x, t.z - z); return d < b.d ? { t, d } : b; }, { t: null, d: 1e9 });

  // 1. after Richards
  if (eco.richards) {
    const r = eco.richards;
    const y = Math.max(H(r.cam[0], r.cam[1]), r.pool.w) + 1.25;
    views.october = { label: 'October (after W. T. Richards)', pos: [r.cam[0], y, r.cam[1]], yaw: yawTo(r.fwd[0] - r.right[0] * 0.12, r.fwd[1] - r.right[1] * 0.12), pitch: 0.10, hour: 15.6, fov: 62 };
  }
  // 2. among the giants
  const h = eco.hero;
  {
    // stand where two or three giants are close by
    let hx = h.x, hz = h.z, bestG = -1;
    for (let a = 0; a < 6.283; a += 0.25) for (const d of [0, 4, 8, 12, 16, 22]) {
      const x = h.x + Math.cos(a) * d, z = h.z + Math.sin(a) * d;
      if (Math.abs(x) > lim || Math.abs(z) > lim || !isClear(x, z, 3.2)) continue;
      const sc = giants.filter((t) => { const q = Math.hypot(t.x - x, t.z - z); return q > 5 && q < 18; }).length - d * 0.02;
      if (sc > bestG) { bestG = sc; hx = x; hz = z; }
    }
    const g = near(hx, hz, giants).t || { x: hx + 5, z: hz };
    views.grove = { label: 'The chestnut grove', pos: [hx, H(hx, hz) + 1.65, hz], yaw: yawTo(g.x - hx, g.z - hz) + 0.3, pitch: 0.14, hour: 11.4 };
    const [px, pz] = around(g, 5.0, 3.0);
    views.trunk = { label: 'Looking up a giant', pos: [px, H(px, pz) + 1.5, pz], yaw: yawTo(g.x - px, g.z - pz), pitch: 0.95, hour: 12.5, fov: 70 };
    const [qx, qz] = around(g, 3.8, 2.4);
    views.bark = { label: 'Chestnut bark', pos: [qx, H(qx, qz) + 1.45, qz], yaw: yawTo(g.x - qx, g.z - qz) - 0.22, pitch: 0.02, hour: 13.4, fov: 50 };
  }
  // 3. forest floor
  {
    let best = [h.x + 7, h.z - 5], bs = -1;
    for (let a = 0; a < 6.283; a += 0.3) for (const d of [8, 12, 16, 22]) {
      const x = h.x + Math.cos(a) * d, z = h.z + Math.sin(a) * d;
      if (!isClear(x, z, 1.2) || F.streamDist.at(x, z) < 7 || F.trail.at(x, z) > 0.2) continue;
      const sc = eco.litterAt(x, z)[3] + (1 - Math.abs(F.moisture.at(x, z) - 0.5));
      if (sc > bs) { bs = sc; best = [x, z]; }
    }
    views.floor = { label: 'Forest floor', pos: [best[0], H(best[0], best[1]) + 0.40, best[1]], yaw: 2.2, pitch: -0.30, hour: 11.5, fov: 55 };
  }
  // 4. cascade
  {
    const pts = terrain.main.pts;
    let bi = 5, bd = 0;
    for (let i = 5; i < pts.length - 5; i++) {
      const p = pts[i];
      if (Math.abs(p.x) > lim || Math.abs(p.z) > lim) continue;
      const d = pts[i - 2].w - pts[i + 2].w;
      if (d > bd) { bd = d; bi = i; }
    }
    const p = pts[bi], q = pts[Math.min(pts.length - 1, bi + 9)], q2 = pts[Math.min(pts.length - 1, bi + 11)];
    // stand on the bank a few paces downstream, looking up at the falls
    const tx = q.x - q2.x, tz = q.z - q2.z, tl = Math.hypot(tx, tz) || 1;
    let cx = q.x + (-tz / tl) * (q.half + 1.6), cz = q.z + (tx / tl) * (q.half + 1.6);
    [cx, cz] = findClear(cx, cz, 2.6, 4);
    views.cascade = { label: 'Cascade', pos: [cx, Math.max(H(cx, cz), q.w) + 1.5, cz], yaw: yawTo(p.x - cx, p.z - cz), pitch: -0.10, hour: 13.0, fov: 58 };
  }
  // 5. dry ridge
  {
    let best = null, bs = -1e9;
    for (let z = -lim; z <= lim; z += 6) for (let x = -lim; x <= lim; x += 6) {
      const s = F.rel.at(x, z) * 0.02 - F.moisture.at(x, z) * 3 - F.slope.at(x, z) * 1.5;
      if (s > bs) { bs = s; best = [x, z]; }
    }
    const [x, z] = findClear(best[0], best[1], 3.2, 10);
    const sl = terrain.slopeAt(x, z, 4);
    views.ridge = { label: 'Dry ridge: chestnut oak, laurel, blueberry', pos: [x, H(x, z) + 1.65, z], yaw: yawTo(-sl[1], sl[0]), pitch: -0.05, hour: 14.2 };
  }
  // 6. tree-fall gap
  if (eco.gaps.length) {
    const g = eco.gaps.reduce((b, q) => (Math.hypot(q.x, q.z) < Math.hypot(b.x, b.z) ? q : b), eco.gaps[0]);
    const [x, z] = findClear(clamp(g.x + Math.cos(g.ang + 2.2) * (g.r + 3), -lim, lim), clamp(g.z + Math.sin(g.ang + 2.2) * (g.r + 3), -lim, lim), 2.4);
    views.gap = { label: 'Tree-fall gap', pos: [x, H(x, z) + 1.65, z], yaw: yawTo(g.x - x, g.z - z), pitch: 0.0, hour: 12.0 };
  }
  // 7. hemlock ravine along the tributary
  {
    const pts = terrain.trib.pts;
    let best = pts[8];
    for (const p of pts) { if (Math.abs(p.x) < lim && Math.abs(p.z) < lim && p.s > 30 && p.s < 110) { best = p; } }
    const j = terrain.junction;
    const [rx, rz] = findClear(best.x + 2, best.z + 1.5, 3.6, 9);
    views.ravine = { label: 'Hemlock ravine', pos: [rx, H(rx, rz) + 1.6, rz], yaw: yawTo(j.x - best.x, j.z - best.z) + 3.14, pitch: 0.05, hour: 11.8 };
  }
  // 8. above the canopy
  {
    const y = H(h.x, h.z);
    views.canopy = { label: 'Over the canopy', pos: [h.x - 70, y + 62, h.z + 95], yaw: yawTo(70, -95), pitch: -0.30, hour: 15.4, fly: true, fov: 55 };
    views.vista = { label: 'Blue ridges', pos: [h.x - 40, y + 165, h.z - 150], yaw: yawTo(0.36, 0.93), pitch: -0.20, hour: 16.8, fly: true, fov: 46 };
  }
  // 9. stream-side at walking height
  {
    const p = water.pools[Math.floor(water.pools.length * 0.35)] || terrain.junction;
    const [x, z] = findClear(p.x + (p.half || 2) + 2.5, p.z + 3, 5.0, 12);
    views.stream = { label: 'Stream bank', pos: [x, H(x, z) + 1.55, z], yaw: yawTo(p.x - x - 2, p.z - z - 9), pitch: -0.12, hour: 10.8 };
  }
  return views;
}

/** Portrait of the nearest good specimen of a woody species (for review). */
export function speciesView(terrain, eco, key, cls, whole = false) {
  const H = terrain.heightAt;
  const lim = WORLD / 2 - 36;
  const h = eco.hero;
  let best = null, bs = 1e9;
  for (const strict of [true, false]) { if (best) break;
  for (const t of eco.trees) {
    if (t.sp !== key || Math.abs(t.x) > lim || Math.abs(t.z) > lim) continue;
    if (cls ? t.cls !== cls : (t.cls === 'sap' || (t.cls === 'pole' && strict))) continue;
    const d = Math.hypot(t.x - h.x, t.z - h.z) - (t.cls === 'giant' ? 40 : 0);
    if (d < bs) { bs = d; best = t; }
  } }
  if (!best) return null;
  const t = best;
  const dist = whole ? Math.max(2.6, Math.min(46, t.h * 1.05 + t.crownR * 0.6)) : Math.max(2.2, Math.min(26, t.h * (t.h > 12 ? 0.62 : 1.05)));
  let pos = null, clearBest = -1e9;
  for (let a = 0; a < 6.283; a += 0.3) {
    const x = t.x + Math.cos(a) * dist, z = t.z + Math.sin(a) * dist;
    if (Math.abs(x) > WORLD / 2 - 6 || Math.abs(z) > WORLD / 2 - 6) continue;
    // prefer an unobstructed line: count stems near the sight line
    let c = 10 - eco.small.near((x + t.x) / 2, (z + t.z) / 2, dist * 0.45).length - 2 * eco.big.near((x + t.x) / 2, (z + t.z) / 2, dist * 0.35).length - 3 * eco.small.near(x, z, 2).length;
    c -= Math.abs(H(x, z) - t.y) * 0.3;
    if (c > clearBest) { clearBest = c; pos = [x, z]; }
  }
  if (!pos) return null;
  const y = H(pos[0], pos[1]) + 1.6;
  const targetY = t.y + t.h * (whole ? 0.5 : t.h > 12 ? 0.42 : 0.5);
  const pitch = Math.atan2(targetY - y, dist);
  return { label: key, pos: [pos[0], y, pos[1]], yaw: yawTo(t.x - pos[0], t.z - pos[1]), pitch, hour: 13.0, fov: whole ? 62 : t.h > 12 ? 72 : 55, tree: t };
}

/** Close look at the nearest instance of a ground-layer plant. */
export function groundView(terrain, eco, gf, id) {
  const H = terrain.heightAt;
  const t = gf.types.find((q) => q.id === id);
  if (!t) return null;
  const h = eco.hero;
  const CELL = 8;
  const c0 = [Math.floor(h.x / CELL), Math.floor(h.z / CELL)];
  let best = null, bs = 1e9;
  for (let r = 0; r <= 20 && !best; r++) {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
      const c = gf._cell(c0[0] + i, c0[1] + j);
      const l = c.lists[t.index];
      if (!l) continue;
      for (let k = 0; k < l.length; k += 8) {
        if (Math.abs(l[k]) > WORLD / 2 - 40 || Math.abs(l[k + 2]) > WORLD / 2 - 40) continue;
        const d = Math.hypot(l[k] - h.x, l[k + 2] - h.z) + (eco.small.near(l[k], l[k + 2], 1.2).length ? 30 : 0);
        if (d < bs) { bs = d; best = [l[k], l[k + 1], l[k + 2]]; }
      }
    }
  }
  if (!best) return null;
  const tall = /bracken|bottlebrush|aster|cucumber|hairgrassheads/.test(id);
  const dist = tall ? 1.5 : 0.85, eye = tall ? 0.75 : 0.48;
  let pos = [best[0] + dist, best[2]];
  for (let a = 0; a < 6.283; a += 0.4) {
    const x = best[0] + Math.cos(a) * dist, z = best[2] + Math.sin(a) * dist;
    if (!eco.small.near(x, z, 1.0).length && !eco.big.near(x, z, 1.0).length) { pos = [x, z]; break; }
  }
  const y = H(pos[0], pos[1]) + eye;
  return { label: id, pos: [pos[0], y, pos[1]], yaw: yawTo(best[0] - pos[0], best[2] - pos[1]), pitch: Math.atan2(best[1] + (tall ? 0.35 : 0.08) - y, dist), hour: 12.5, fov: 50 };
}
