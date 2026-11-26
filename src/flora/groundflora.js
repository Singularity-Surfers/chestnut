// The herb layer: ferns, sedges and grasses, wildflowers, creeping evergreens, seedlings,
// loose fallen leaves and chestnut burs. Each kind has real geometry (fronds, blades, leaves on
// petioles) and is streamed around the viewer in cells, placed by site moisture, light and colony masks.
import * as THREE from 'three';
import { RNG, clamp, lerp, smoothstep, fbm2, noise2, hex2rgb, hash32 } from '../core/rng.js';
import { G, WORLD, makeMaterial, makeDepthMaterial, makeInstancedGeometry, setInstances, registerCaster } from '../core/engine.js';

const HALF = WORLD / 2;
const CELL = 8;

// ------------------------------------------------------------------------------------------ geometry helpers
class MB {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.dat = []; this.col = []; this.idx = []; }
  get n() { return this.pos.length / 3; }
  toGeometry(withCol) {
    const g = new THREE.BufferGeometry();
    const n = this.n;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
    const nb = new Int8Array(n * 4);
    for (let i = 0; i < n; i++) { nb[i * 4] = this.nor[i * 3] * 127; nb[i * 4 + 1] = this.nor[i * 3 + 1] * 127; nb[i * 4 + 2] = this.nor[i * 3 + 2] * 127; }
    g.setAttribute('normal', new THREE.BufferAttribute(nb, 4, true));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.uv), 2));
    const db = new Uint8Array(n * 4);
    for (let i = 0; i < n * 4; i++) db[i] = clamp(this.dat[i]) * 255;
    g.setAttribute('data', new THREE.BufferAttribute(db, 4, true));
    if (withCol) {
      const cb = new Uint8Array(n * 4);
      for (let i = 0; i < n; i++) { cb[i * 4] = clamp(this.col[i * 3]) * 255; cb[i * 4 + 1] = clamp(this.col[i * 3 + 1]) * 255; cb[i * 4 + 2] = clamp(this.col[i * 3 + 2]) * 255; cb[i * 4 + 3] = 255; }
      g.setAttribute('col', new THREE.BufferAttribute(cb, 4, true));
    }
    g.setIndex(n > 65535 ? new THREE.BufferAttribute(new Uint32Array(this.idx), 1) : new THREE.BufferAttribute(new Uint16Array(this.idx), 1));
    return g;
  }
}
const V = (x, y, z) => [x, y, z];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vmul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vnorm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/**
 * A ribbon along a 3D path (frond, grass blade, leaf): pts [[x,y,z]], half widths, side vector per point.
 * uvr: {u0,v0,u1,v1}; fold: V-keel depth as a fraction of width; col: optional rgb fn(t).
 */
function ribbon(mb, pts, widths, sides, uvr, o = {}) {
  const base = mb.n;
  const n = pts.length;
  const cols = o.fold ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const p = pts[i], s = sides[i], w = widths[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const tan = vnorm(vsub(b, a));
    let nrm = vnorm(vcross(s, tan));
    if (nrm[1] < 0) nrm = vmul(nrm, -1);
    for (let k = 0; k < cols; k++) {
      const u = cols === 3 ? (k - 1) : (k * 2 - 1);
      const lift = cols === 3 ? (k === 1 ? -(o.fold) * w : 0) : 0;
      mb.pos.push(p[0] + s[0] * w * u + nrm[0] * lift, p[1] + s[1] * w * u + nrm[1] * lift, p[2] + s[2] * w * u + nrm[2] * lift);
      // tilt edge normals outward for a rounded look
      const nn = vnorm(vadd(nrm, vmul(s, u * (o.round ?? 0.35))));
      mb.nor.push(nn[0], nn[1], nn[2]);
      mb.uv.push(lerp(uvr.u0, uvr.u1, cols === 3 ? k / 2 : k), lerp(uvr.v0, uvr.v1, o.vFlip ? 1 - t : t));
      const ao = lerp(o.ao0 ?? 0.55, 1.0, Math.min(1, t * 2.2));
      mb.dat.push(ao, clamp((o.flex0 ?? 0) + t * (o.flex ?? 0.5)), o.seed ?? 0.5, o.phase ?? 0.5);
      if (o.col) { const c = o.col(t, u); mb.col.push(c[0], c[1], c[2]); }
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < cols - 1; k++) {
    const a = base + i * cols + k;
    mb.idx.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols);
  }
}

/** An arching path: starts at p0 heading (az, elevation), bends over under its own weight. */
function archPath(p0, az, elev, len, droop, nseg, rng, wob = 0.05, prof = null) {
  // droop: total change of elevation (radians) along the path, weighted toward the tip.
  // prof: optional {e1, at}: bend from `elev` to `e1` concentrated around fraction `at` (petiole -> blade)
  const pts = [p0];
  let a = az;
  let p = p0;
  for (let i = 0; i < nseg; i++) {
    const t = (i + 0.5) / nseg;
    let e;
    if (prof) { const k = clamp((t - (prof.at - 0.22)) / 0.36); e = lerp(elev, prof.e1, k * k * (3 - 2 * k)); }
    else e = elev - droop * t * t;
    a += rng ? rng.f(-wob, wob) : 0;
    const d = [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)];
    p = vadd(p, vmul(d, len / nseg));
    pts.push(p);
  }
  return pts;
}
function sidesFor(pts, twist = 0) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tan = vnorm(vsub(b, a));
    let s = vnorm(vcross(tan, [0, 1, 0]));
    if (Math.hypot(tan[0], tan[2]) < 0.05) s = [1, 0, 0];
    if (twist) {
      const up = vcross(s, tan);
      const c = Math.cos(twist * i / pts.length), sn = Math.sin(twist * i / pts.length);
      s = vnorm(vadd(vmul(s, c), vmul(up, sn)));
    }
    out.push(s);
  }
  return out;
}

/** A single leaf from a sheet cell, attached at `base`, pointing along (az, elev). */
function leaf(mb, base, az, elev, bladeLen, cell, rng, o = {}) {
  const H = bladeLen / cell.bladeFrac;          // full cell height in metres (incl. petiole)
  const W = H * cell.aspect;
  const nseg = o.nseg ?? 3;
  const pts = archPath(base, az, elev, H, o.droop ?? rng.f(0.1, 0.5), nseg, null, 0.05, o.e1 !== undefined ? { e1: o.e1, at: Math.max(0.12, cell.petFrac) } : null);
  const sides = sidesFor(pts, o.twist ?? rng.f(-0.5, 0.5));
  ribbon(mb, pts, pts.map(() => W / 2), sides, cell, { fold: o.fold ?? 0.06, flex0: o.flex0 ?? 0.2, flex: o.flex ?? 0.25, seed: o.seed ?? rng.next(), phase: rng.next(), ao0: o.ao0 ?? 0.7, round: 0.2 });
  return pts[pts.length - 1];
}

/** Thin stem: two crossed ribbons textured from the petiole pixels of a cell. */
function stem(mb, pts, r, cell, o = {}) {
  const uvr = { u0: (cell.u0 + cell.u1) / 2 - 0.0005, u1: (cell.u0 + cell.u1) / 2 + 0.0005, v0: cell.v0 + (cell.v1 - cell.v0) * Math.min(0.012, cell.petFrac * 0.4), v1: cell.v0 + (cell.v1 - cell.v0) * Math.min(0.02, cell.petFrac * 0.6) };
  const s1 = sidesFor(pts);
  const s2 = s1.map((s, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; return vnorm(vcross(s, vnorm(vsub(b, a)))); });
  const w = pts.map((_, i) => r * lerp(1, o.taper ?? 0.5, i / (pts.length - 1)));
  ribbon(mb, pts, w, s1, uvr, { flex0: o.flex0 ?? 0, flex: o.flex ?? 0.3, seed: 0.5, ao0: 0.5, round: 0.9 });
  ribbon(mb, pts, w, s2, uvr, { flex0: o.flex0 ?? 0, flex: o.flex ?? 0.3, seed: 0.5, ao0: 0.5, round: 0.9 });
}

// ------------------------------------------------------------------------------------------ plant builders
const pickCell = (sheet, rng) => sheet.cells[rng.wpick(sheet.cells.map((c) => c.weight))];

function fernRosette(sheet, rng, o) {
  // o: { fronds:[a,b], len, elev:[a,b], droop:[a,b], spread, flat (fraction lying down) }
  const mb = new MB();
  const n = rng.i(o.fronds[0], o.fronds[1]);
  const L = sheet.spec.len;
  for (let i = 0; i < n; i++) {
    const cell = pickCell(sheet, rng);
    const az = (i / n) * 6.283 + rng.f(-0.4, 0.4);
    const lying = rng.chance(o.flat ?? 0);
    const len = L * rng.f(0.7, 1.15) * (o.scale ?? 1);
    const elev = lying ? rng.f(0.05, 0.25) : rng.f(o.elev[0], o.elev[1]);
    const droop = lying ? rng.f(0.05, 0.2) : rng.f(o.droop[0], o.droop[1]);
    const p0 = V(Math.cos(az) * 0.015, 0.01, Math.sin(az) * 0.015);
    const pts = archPath(p0, az, elev, len, droop, 7, rng, 0.04);
    const W = len * cell.aspect / 2;
    ribbon(mb, pts, pts.map(() => W), sidesFor(pts, rng.f(-0.25, 0.25)), cell, { fold: 0.10, flex: 0.6, seed: rng.next(), phase: rng.next(), ao0: 0.45 });
  }
  return mb;
}

function colonyFronds(sheet, rng, o) {
  // loose tuft of single fronds from a creeping rhizome (hay-scented, New York fern, bracken)
  const mb = new MB();
  const n = rng.i(o.fronds[0], o.fronds[1]);
  const L = sheet.spec.len;
  for (let i = 0; i < n; i++) {
    const cell = pickCell(sheet, rng);
    const az = rng.f(0, 6.283);
    const p0 = V(rng.f(-o.radius, o.radius), 0.0, rng.f(-o.radius, o.radius));
    const len = L * rng.f(0.75, 1.15);
    if (o.stalk) {
      // bracken: wiry stalk, then a broad three-part blade held almost flat
      const sh = rng.f(o.stalk[0], o.stalk[1]);
      const lean = rng.f(0.0, 0.25);
      const top = vadd(p0, V(Math.cos(az) * sh * lean, sh, Math.sin(az) * sh * lean));
      stem(mb, [p0, vadd(p0, V(Math.cos(az) * sh * lean * 0.4, sh * 0.5, Math.sin(az) * sh * lean * 0.4)), top], 0.004, cell, { flex: 0.4 });
      const pts = archPath(top, az, rng.f(0.2, 0.5), len, rng.f(0.5, 0.9), 5, rng, 0.05);
      const W = len * cell.aspect / 2;
      ribbon(mb, pts, pts.map(() => W), sidesFor(pts, rng.f(-0.3, 0.3)), cell, { fold: 0.06, flex0: 0.4, flex: 0.5, seed: rng.next(), phase: rng.next(), ao0: 0.8 });
    } else {
      const pts = archPath(p0, az, rng.f(o.elev[0], o.elev[1]), len, rng.f(o.droop[0], o.droop[1]), 6, rng, 0.05);
      const W = len * cell.aspect / 2;
      ribbon(mb, pts, pts.map(() => W), sidesFor(pts, rng.f(-0.3, 0.3)), cell, { fold: 0.08, flex: 0.7, seed: rng.next(), phase: rng.next(), ao0: 0.5 });
    }
  }
  return mb;
}

function tuft(rng, o) {
  // grass / sedge tuft of vertex-coloured blades. o: { n, len:[a,b], w, elev:[a,b], droop:[a,b], cols:[[r,g,b]...], dead, radius }
  const mb = new MB();
  const n = rng.i(o.n[0], o.n[1]);
  for (let i = 0; i < n; i++) {
    const az = rng.f(0, 6.283);
    const rr = Math.sqrt(rng.next()) * (o.radius ?? 0.03);
    const p0 = V(Math.cos(az) * rr, 0, Math.sin(az) * rr);
    const len = rng.f(o.len[0], o.len[1]);
    const dead = rng.chance(o.dead ?? 0.2);
    const c0 = dead ? rng.pick(o.deadCols || [[0.52, 0.42, 0.22], [0.44, 0.33, 0.17]]) : rng.pick(o.cols);
    const k = rng.f(0.8, 1.15);
    const pts = archPath(p0, az + rng.f(-0.5, 0.5), rng.f(o.elev[0], o.elev[1]), len, rng.f(o.droop[0], o.droop[1]), o.seg ?? 4, rng, 0.08);
    const w = o.w * rng.f(0.7, 1.2);
    const tipC = o.tip || [0.50, 0.42, 0.20];
    ribbon(mb, pts, pts.map((_, j) => w * (1 - Math.pow(j / (pts.length - 1), 2.2) * 0.92)), sidesFor(pts, rng.f(-0.6, 0.6)), { u0: 0, v0: 0, u1: 1, v1: 1 },
      { fold: o.fold ?? 0.25, flex: 0.9, seed: rng.next(), phase: rng.next(), ao0: 0.62,
        col: (t, u) => {
          const m = Math.pow(t, 3) * (o.tipAmt ?? 0.5); const rib = o.rib && Math.abs(u) < 0.3 ? 0.8 : 1;
          let c = [lerp(c0[0], tipC[0], m) * k * rib, lerp(c0[1], tipC[1], m) * k * rib, lerp(c0[2], tipC[2], m) * k * rib];
          if (o.baseCol && t < 0.2) { const b = 1 - t / 0.2; c = [lerp(c[0], o.baseCol[0], b), lerp(c[1], o.baseCol[1], b), lerp(c[2], o.baseCol[2], b)]; }
          return c;
        } });
  }
  return mb;
}

function panicGrass(rng) {
  const mb = new MB();
  const stems = rng.i(3, 6);
  const cols = [[0.34, 0.48, 0.16], [0.44, 0.50, 0.18], [0.52, 0.42, 0.22], [0.46, 0.30, 0.26]];
  const one = { u0: 0, v0: 0, u1: 1, v1: 1 };
  for (let s = 0; s < stems; s++) {
    const h = rng.f(0.3, 0.58), az0 = rng.f(0, 6.283), lean = rng.f(0.1, 0.5);
    const p0 = V(rng.f(-0.03, 0.03), 0, rng.f(-0.03, 0.03));
    const pts = archPath(p0, az0, 1.45 - lean, h, lean * 0.6, 6, rng, 0.12);
    const sc = [0.42, 0.40, 0.22];
    ribbon(mb, pts, pts.map(() => 0.0009), sidesFor(pts), one, { fold: 0, flex: 0.8, seed: rng.next(), phase: rng.next(), ao0: 0.5, col: () => sc });
    const nl = rng.i(4, 6);
    for (let q = 0; q < nl; q++) {
      const t = lerp(0.2, 0.95, q / (nl - 1));
      const f = t * 6, i = Math.min(5, Math.floor(f));
      const base = vadd(vmul(pts[i], 1 - (f - i)), vmul(pts[i + 1], f - i));
      const c0 = rng.pick(cols), k = rng.f(0.85, 1.15);
      const len = rng.f(0.075, 0.12), w = rng.f(0.010, 0.014);
      const lp = archPath(base, az0 + q * 2.6 + rng.f(-0.4, 0.4), rng.f(0.3, 0.8), len, rng.f(0.4, 0.9), 4, rng, 0.05);
      ribbon(mb, lp, lp.map((_, j) => w * Math.sin(Math.PI * Math.min(1, 0.18 + j / 4 * 0.86))), sidesFor(lp, rng.f(-0.3, 0.3)), one,
        { fold: 0.12, flex0: 0.4, flex: 0.4, seed: rng.next(), phase: rng.next(), ao0: 0.8, col: (tt, u) => [c0[0] * k * (Math.abs(u) < 0.3 ? 0.85 : 1), c0[1] * k * (Math.abs(u) < 0.3 ? 0.85 : 1), c0[2] * k] });
    }
  }
  return mb;
}

function basalLeaves(sheet, rng, o) {
  // leaves on petioles from the ground (galax, wild ginger, foamflower, rattlesnake plantain)
  const mb = new MB();
  const n = rng.i(o.n[0], o.n[1]);
  const L = sheet.spec.len;
  for (let i = 0; i < n; i++) {
    const cell = pickCell(sheet, rng);
    const az = (i / n) * 6.283 + rng.f(-0.5, 0.5);
    const p0 = V(rng.f(-1, 1) * (o.radius ?? 0.02), 0, rng.f(-1, 1) * (o.radius ?? 0.02));
    // the cell includes the petiole: start steep, flatten at the blade
    leaf(mb, p0, az, rng.f(o.elev[0], o.elev[1]), L * rng.f(0.7, 1.1), cell, rng, { e1: rng.f(o.blade?.[0] ?? -0.25, o.blade?.[1] ?? 0.25), nseg: 6, fold: o.fold ?? 0.05, flex: 0.5, ao0: 0.6 });
  }
  return mb;
}

function stemPlant(sheet, rng, o) {
  // upright stem with leaves along it or in whorls; optional flower / berry sprites on top
  const mb = new MB();
  const L = sheet.spec.len;
  const stems = rng.i(o.stems?.[0] ?? 1, o.stems?.[1] ?? 1);
  for (let s = 0; s < stems; s++) {
    const h = rng.f(o.h[0], o.h[1]);
    const az0 = rng.f(0, 6.283);
    const lean = rng.f(0, o.lean ?? 0.2);
    const p0 = V(rng.f(-1, 1) * (o.radius ?? 0.01), 0, rng.f(-1, 1) * (o.radius ?? 0.01));
    const nseg = 5;
    const pts = [p0];
    let zig = 0;
    for (let i = 1; i <= nseg; i++) {
      const t = i / nseg;
      zig = (o.zigzag ?? 0) * (i % 2 ? 1 : -1) * h * 0.04;
      pts.push(V(p0[0] + Math.cos(az0) * (lean * h * t * t) + Math.cos(az0 + 1.57) * zig, h * t, p0[2] + Math.sin(az0) * (lean * h * t * t) + Math.sin(az0 + 1.57) * zig));
    }
    const cell0 = pickCell(sheet, rng);
    stem(mb, pts, o.stemR ?? 0.0018, cell0, { flex: 0.6 });
    const at = (t) => { const f = t * nseg, i = Math.min(nseg - 1, Math.floor(f)); return vadd(vmul(pts[i], 1 - (f - i)), vmul(pts[i + 1], f - i)); };
    if (o.whorls) {
      for (const wh of o.whorls) {
        const k = rng.i(wh.n[0], wh.n[1]);
        const off = rng.f(0, 6.283);
        for (let q = 0; q < k; q++) leaf(mb, at(wh.t), off + q / k * 6.283 + rng.f(-0.15, 0.15), rng.f(wh.elev[0], wh.elev[1]), L * (wh.scale ?? 1) * rng.f(0.85, 1.1), pickCell(sheet, rng), rng, { droop: rng.f(0.1, 0.4), flex0: 0.4, flex: 0.3 });
      }
    } else {
      const k = rng.i(o.leaves[0], o.leaves[1]);
      for (let q = 0; q < k; q++) {
        const t = lerp(o.from ?? 0.25, 0.96, q / Math.max(1, k - 1));
        const sc = lerp(1.0, o.topScale ?? 0.5, t) * rng.f(0.85, 1.1);
        const azl = az0 + q * 2.4 + rng.f(-0.3, 0.3);
        leaf(mb, at(t), azl, rng.f(0.3, 0.8), L * sc, pickCell(sheet, rng), rng, { droop: rng.f(0.3, 0.7), flex0: 0.3 + t * 0.3, flex: 0.3 });
        if (o.opposite) leaf(mb, at(t), azl + Math.PI, rng.f(0.3, 0.8), L * sc, pickCell(sheet, rng), rng, { droop: rng.f(0.3, 0.7), flex0: 0.3 + t * 0.3, flex: 0.3 });
      }
    }
    if (o.top) {
      const list = sheet.extraCells[o.top.name];
      if (list) {
        const k = rng.i(o.top.n[0], o.top.n[1]);
        const tp = at(1);
        for (let q = 0; q < k; q++) {
          const cell = rng.pick(list);
          const sz = cell.size * rng.f(0.85, 1.2);
          const az = rng.f(0, 6.283), rr = rng.f(0, o.top.spread ?? 0.03);
          const c = vadd(tp, V(Math.cos(az) * rr, rng.f(-0.01, 0.02), Math.sin(az) * rr));
          // a small card facing up-ish
          const tilt = rng.f(0, 0.6), ta = rng.f(0, 6.283);
          const pts2 = [vadd(c, V(-Math.cos(ta) * sz / 2, -Math.sin(tilt) * sz * 0.3, -Math.sin(ta) * sz / 2)), vadd(c, V(Math.cos(ta) * sz / 2, Math.sin(tilt) * sz * 0.3, Math.sin(ta) * sz / 2))];
          ribbon(mb, pts2, [sz / 2, sz / 2], sidesFor(pts2), cell, { flex0: 0.6, flex: 0.1, seed: rng.next(), ao0: 1.0, round: 0 });
          // pedicel
          stem(mb, [at(0.85), c], 0.0008, cell0, { flex0: 0.6, flex: 0.1 });
        }
      }
    }
  }
  return mb;
}

function umbrellaPlant(sheet, rng, o) {
  // mayapple: one round, deeply lobed blade (two on a forked flowering stem) held flat on top of its stalk like an umbrella
  const mb = new MB();
  const cell0 = pickCell(sheet, rng);
  const h = rng.f(o.h[0], o.h[1]);
  const az0 = rng.f(0, 6.283), lean = rng.f(0, o.lean ?? 0.25);
  const top = V(Math.cos(az0) * lean * h, h, Math.sin(az0) * lean * h);
  const mid = V(top[0] * 0.3, h * 0.55, top[2] * 0.3);
  const disc = (c, R, cell) => {
    const a = rng.f(0, 6.283), tilt = rng.f(-0.3, 0.3), sag = rng.f(0.25, 0.6);
    const dir = V(Math.cos(a), 0, Math.sin(a)), side = V(-Math.sin(a), 0, Math.cos(a));
    const pts = [], sides = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 2 - 1;   // -1..1 across the blade
      pts.push(vadd(c, V(dir[0] * R * t, Math.sin(tilt) * R * t - sag * R * t * t, dir[2] * R * t)));
      sides.push(side);
    }
    ribbon(mb, pts, pts.map(() => R), sides, cell, { fold: -0.22 * sag, flex0: 0.55, flex: 0.1, seed: rng.next(), phase: rng.next(), ao0: 0.85, round: 0.5 });
  };
  const R = sheet.spec.len * rng.f(0.55, 0.8);
  if (rng.chance(o.fork ?? 0.3)) {
    stem(mb, [V(0, 0, 0), mid], o.stemR ?? 0.003, cell0, { flex: 0.3 });
    for (const sg of [-1, 1]) {
      const c = vadd(mid, V(Math.cos(az0 + sg * 1.4) * R * 0.8, h * 0.4, Math.sin(az0 + sg * 1.4) * R * 0.8));
      stem(mb, [mid, c], (o.stemR ?? 0.003) * 0.8, cell0, { flex0: 0.3, flex: 0.3 });
      disc(c, R * 0.85, pickCell(sheet, rng));
    }
  } else {
    stem(mb, [V(0, 0, 0), mid, top], o.stemR ?? 0.003, cell0, { flex: 0.6 });
    disc(top, R, pickCell(sheet, rng));
  }
  return mb;
}

function groundMat(sheet, rng, o) {
  // creeping mat of tiny paired leaves on trailing stems (partridgeberry), lying on the ground
  const mb = new MB();
  const L = sheet.spec.len;
  const runners = rng.i(o.runners[0], o.runners[1]);
  for (let r = 0; r < runners; r++) {
    let az = rng.f(0, 6.283);
    let p = V(rng.f(-0.05, 0.05), 0.012, rng.f(-0.05, 0.05));
    const pts = [p];
    const cell0 = pickCell(sheet, rng);
    const steps = rng.i(o.steps[0], o.steps[1]);
    for (let i = 0; i < steps; i++) {
      az += rng.f(-0.5, 0.5);
      p = vadd(p, V(Math.cos(az) * L * 1.5, 0, Math.sin(az) * L * 1.5));
      pts.push(p);
      for (const sg of [-1, 1]) leaf(mb, p, az + sg * rng.f(1.2, 1.7), rng.f(0.05, 0.3), L * rng.f(0.8, 1.15), pickCell(sheet, rng), rng, { droop: 0.1, nseg: 1, fold: 0, flex: 0, flex0: 0, ao0: 0.85 });
      if (o.berry && rng.chance(o.berry)) {
        const list = sheet.extraCells.berries;
        if (list) { const c = rng.pick(list); const sz = c.size; const q = [vadd(p, V(-sz / 2, 0.008, 0)), vadd(p, V(sz / 2, 0.008, 0))]; ribbon(mb, q, [sz / 2, sz / 2], [[0, 0, 1], [0, 0, 1]], c, { flex: 0, flex0: 0, ao0: 1, round: 0 }); }
      }
    }
    stem(mb, pts, 0.0007, cell0, { flex: 0, flex0: 0, taper: 0.8 });
  }
  return mb;
}

function looseLeaf(sheet, rng, o) {
  // one fallen leaf, cupped or curled, resting on the litter
  const mb = new MB();
  const cell = pickCell(sheet, rng);
  const L = sheet.spec.len * rng.f(0.8, 1.1);
  const H = L / cell.bladeFrac;
  const curl = rng.f(-0.9, 1.4) * (o.curl ?? 1);
  const pts = [];
  let e = rng.f(-0.1, 0.25), p = V(-H / 2, 0.006 + rng.f(0, 0.012), 0);
  pts.push(p);
  for (let i = 0; i < 4; i++) { e += curl / 4; p = vadd(p, V(Math.cos(e) * H / 4, Math.sin(e) * H / 4, 0)); pts.push(p); }
  const minY = Math.min(...pts.map((q) => q[1]));
  for (const q of pts) q[1] += 0.004 - Math.min(0, minY);
  const roll = rng.f(-0.35, 0.35);
  const sides = pts.map(() => vnorm([0, Math.sin(roll), 1]));
  ribbon(mb, pts, pts.map(() => H * cell.aspect / 2), sides, cell, { fold: rng.f(-0.12, 0.16), flex: 0.0, flex0: 0.0, seed: rng.next(), phase: rng.next(), ao0: 0.8, round: 0.15 });
  return mb;
}

function burMesh(rng, open) {
  // chestnut bur: spiny husk (vertex-coloured), ~5–6 cm
  const mb = new MB();
  const R = 0.022;
  const husk = open ? [0.42, 0.30, 0.13] : [0.50, 0.50, 0.17];
  const nS = 190;
  for (let i = 0; i < nS; i++) {
    // fibonacci sphere of spines
    const y = 1 - (i + 0.5) / nS * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996;
    const d = [Math.cos(th) * rr, y, Math.sin(th) * rr];
    if (open && d[1] > 0.55) continue;
    const base = vadd([0, R * 0.9, 0], vmul(d, R * 0.72));
    const tipD = vnorm(vadd(d, [rng.f(-0.35, 0.35), rng.f(-0.35, 0.35), rng.f(-0.35, 0.35)]));
    const tip = vadd(base, vmul(tipD, R * rng.f(0.55, 0.95)));
    const side = vnorm(vcross(tipD, [0.3, 1, 0.2]));
    const k = rng.f(0.75, 1.2);
    const c = [husk[0] * k, husk[1] * k, husk[2] * k * 0.9];
    const b = mb.n;
    for (const [p, cc] of [[vadd(base, vmul(side, R * 0.11)), c], [vsub(base, vmul(side, R * 0.11)), c], [tip, [c[0] * 1.25, c[1] * 1.2, c[2]]]]) {
      mb.pos.push(p[0], p[1], p[2]); mb.nor.push(d[0], d[1], d[2]); mb.uv.push(0.5, 0.5); mb.dat.push(0.5 + 0.5 * (d[1] * 0.5 + 0.5), 0, 0.5, 0.5); mb.col.push(cc[0], cc[1], cc[2]);
    }
    mb.idx.push(b, b + 1, b + 2);
  }
  // core
  const core = new THREE.IcosahedronGeometry(R * 0.78, 1).toNonIndexed();
  const cp = core.attributes.position;
  for (let i = 0; i < cp.count; i += 3) {
    const b = mb.n;
    let skip = false;
    const tri = [];
    for (let k = 0; k < 3; k++) { const x = cp.getX(i + k), y = cp.getY(i + k), z = cp.getZ(i + k); if (open && y > R * 0.5) skip = true; tri.push([x, y + R * 0.9, z]); }
    if (skip) continue;
    for (const p of tri) {
      const nn = vnorm([p[0], p[1] - R * 0.9, p[2]]);
      mb.pos.push(p[0], p[1], p[2]); mb.nor.push(nn[0], nn[1], nn[2]); mb.uv.push(0.5, 0.5); mb.dat.push(0.35, 0, 0.5, 0.5);
      const cc = open ? [0.50, 0.40, 0.24] : [husk[0] * 0.55, husk[1] * 0.55, husk[2] * 0.5];
      mb.col.push(cc[0], cc[1], cc[2]);
    }
    mb.idx.push(b, b + 1, b + 2);
  }
  if (open) {
    // three glossy nuts nestled in the pale lining
    for (let k = 0; k < 3; k++) {
      const nut = new THREE.SphereGeometry(R * 0.36, 8, 6).toNonIndexed();
      const np = nut.attributes.position;
      const ox = (k - 1) * R * 0.52, oz = (k === 1 ? 0.12 : -0.06) * R;
      for (let i = 0; i < np.count; i += 3) {
        const b = mb.n;
        for (let q = 0; q < 3; q++) {
          const x = np.getX(i + q) * 0.85, y = np.getY(i + q) * 1.15, z = np.getZ(i + q) * 0.7;
          const nn = vnorm([x, y, z]);
          mb.pos.push(x + ox, y + R * 1.25, z + oz); mb.nor.push(nn[0], nn[1], nn[2]); mb.uv.push(0.5, 0.5); mb.dat.push(0.9, 0, 0.9, 0.5);
          const tipy = y / (R * 0.42);
          const cc = tipy < -0.55 ? [0.62, 0.52, 0.36] : [0.20, 0.075, 0.03];
          mb.col.push(cc[0], cc[1], cc[2]);
        }
        mb.idx.push(b, b + 1, b + 2);
      }
    }
  }
  return mb;
}

// ------------------------------------------------------------------------------------------ shaders
const LEAFY_VS = /* glsl */ `
attribute vec4 data;
uniform float uFade; uniform float uFlutter; uniform float uFlex;
varying vec3 vWorld; varying vec2 vUv; varying vec3 vN; varying vec4 vData; varying float vSeed;
#ifdef USE_COL
attribute vec4 col; varying vec3 vCol;
#endif
#ifdef TREE_LEAF
attribute vec4 tan; varying float vClu; varying vec3 vCrownN;
#endif
void main(){
  // shrink to nothing at the edge of the draw distance (no popping)
  float d = distance(iA.xyz, cameraPosition);
  float k = 1.0 - smoothstep(uFade*0.78, uFade, d);
  vec3 lp = position*k;
  vec3 wp = instPos(lp);
#ifdef TREE_LEAF
  // a real leaf on a woody plant: sways with its branch, flutters about its petiole
  wp += windOffset(wp, data.g*3.0, uFlutter*(0.2 + tan.w)*iA.w, data.a + iB.y);
  vClu = tan.x;
  vCrownN = wp - instPos(vec3(0.0, iB.z, 0.0));   // iB.z carries the crown-centre height, as on the cards
#else
  wp += windOffset(wp, data.g*uFlex*iA.w, uFlutter*data.g, data.a + iB.y);
#endif
  vWorld = wp; vUv = uv; vN = instNormal(normal.xyz); vData = data; vSeed = iB.y;
#ifdef USE_COL
  vCol = col.rgb;
#endif
  gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
}`;

const LEAFY_FS = /* glsl */ `
uniform sampler2D tLeaf; uniform sampler2D tLeafN;
uniform float uTrans, uGloss, uHueVar, uTexSize, uBright, uBrown, uCover, uBronze;
#ifdef TREE_LEAF
varying float vClu; varying vec3 vCrownN;
#endif
varying vec3 vWorld; varying vec2 vUv; varying vec3 vN; varying vec4 vData; varying float vSeed;
#ifdef USE_COL
varying vec3 vCol;
#endif
void main(){
#ifdef USE_COL
  vec3 alb = vCol*vCol*1.5;
  float alpha = 1.0;
  float thick = 1.0;
  vec2 nxy = vec2(0.0);
#else
  vec4 a = texture(tLeaf, vUv);
  vec2 dx = dFdx(vUv*uTexSize), dy = dFdy(vUv*uTexSize);
  float lod = max(0.0, 0.5*log2(min(dot(dx, dx), dot(dy, dy)) + 1e-8));
  float alpha = a.a*(1.0 + lod*uCover);
  vec3 alb = a.rgb;
#endif
#ifdef DEPTH_PASS
  if (alpha < 0.4) discard;
  gl_FragColor = vec4(1.0);
#else
#ifndef USE_COL
  alpha *= smoothstep(0.02, 0.16, abs(dot(normalize(vN), normalize(cameraPosition - vWorld))));
  alpha = clamp((alpha - 0.4)/max(fwidth(alpha), 1e-4) + 0.5, 0.0, 1.0);
  if (alpha < 0.03) discard;
  vec4 nm = texture(tLeafN, vUv);
  vec2 nxy = (nm.xy*2.0 - 1.0)*0.3;
  float thick = 1.0;
#endif
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  // cotangent frame for the relief
  vec3 dp1 = dFdx(vWorld), dp2 = dFdy(vWorld);
  vec2 du1 = dFdx(vUv), du2 = dFdy(vUv);
  vec3 dp2p = cross(dp2, N), dp1p = cross(N, dp1);
  vec3 T = dp2p*du1.x + dp1p*du2.x, B = dp2p*du1.y + dp1p*du2.y;
  float inv = inversesqrt(max(dot(T, T), dot(B, B)) + 1e-12);
  vec3 Nw = normalize(T*inv*nxy.x + B*inv*nxy.y + N);
  if (dot(Nw, V) < 0.0) Nw = -Nw;
#ifdef TREE_LEAF
  // colour follows the spray this leaf belongs to, exactly as on the card it replaces, plus a little of its own
  alb = hueShift(alb, (vSeed - 0.5)*uHueVar*2.2 + (vClu - 0.5)*uHueVar*0.9 + (vData.b - 0.5)*uHueVar*0.3);
  float bz = smoothstep(0.60, 0.95, fract(vClu + fract(vSeed*3.1)) + (fract(vSeed*9.7) - 0.5)*0.4)*uBronze;
  alb = mix(alb, vec3(luma(alb))*vec3(1.30, 0.92, 0.52)*0.82 + alb*0.12, bz);
  alb = saturateCol(alb, 0.90)*(0.84 + 0.30*vClu)/(0.85 + 0.3*vData.b)*(0.94 + 0.12*vData.b);
#else
  alb = hueShift(alb, (vSeed - 0.5)*uHueVar*2.0 + (vData.b - 0.5)*uHueVar);
#endif
  // fallen leaves tan and brown within days
  float brown = smoothstep(0.15, 0.85, fract(vSeed*3.71))*uBrown;
  alb = mix(alb, vec3(luma(alb))*vec3(1.45, 0.98, 0.55)*0.72 + alb*0.12, brown);
  alb *= uBright*(0.85 + 0.3*vData.b)*(0.9 + 0.2*fract(vSeed*7.3));
  Surf s;
  s.albedo = alb; s.N = Nw; s.rough = mix(0.6, 0.22, uGloss); s.spec = 0.6 + 0.8*uGloss; s.ao = vData.r;
  s.trans = uTrans*thick; s.transCol = saturateCol(alb, 1.25)*1.15; s.above = 0.0;
#ifdef TREE_LEAF
  // match the spray cards these leaves stand in for
  s.rough = mix(0.74, 0.28, uGloss); s.spec = 0.22 + 0.95*uGloss; s.transCol = saturateCol(alb, 1.3)*1.2;
  s.above = smoothstep(3.0, 20.0, vWorld.y - terrainH(vWorld.xz));
  float sh = sunShadow(vWorld, normalize(Nw + uSunDir*0.8), ign(gl_FragCoord.xy));
  // crown self-shading, matched to the cards (see LEAF_FS in forest.js)
  float fleck = (fract(vClu*13.7 + vSeed*5.3) - 0.5)*0.6;
  float selfSun = smoothstep(-0.30, 0.50, dot(normalize(vCrownN), uSunDir)*0.6 + (vData.r - 0.62)*1.7 + fleck);
  sh *= mix(0.28, 1.0, selfSun);
  sh = mix(0.30*uTrans, 1.0, sh);
#else
  float sh = sunShadow(vWorld, normalize(Nw + uSunDir*0.6), ign(gl_FragCoord.xy));
  sh = mix(0.18*uTrans, 1.0, sh);
#endif
  vec3 col = shadeSurface(s, vWorld, V, sh);
  gl_FragColor = vec4(col, alpha);
#endif
}`;

export function makeLeafyMaterial(flora, sheetId, o = {}) {
  {
    const sh = flora.sheet(sheetId);
    const spec = sh.spec;
    const uniforms = {
      tLeaf: { value: sh.tex }, tLeafN: { value: flora.sheetNormal(sheetId) },
      uTrans: { value: o.trans ?? (spec.evergreen ? 0.25 : 0.6) }, uGloss: { value: o.gloss ?? spec.gloss ?? 0.1 },
      uHueVar: { value: o.hueVar ?? 0.06 }, uTexSize: { value: sh.canvas.width }, uFade: { value: 30 }, uFlutter: { value: o.flutter ?? 0.012 },
      uAlign: { value: o.align ? 1 : 0 }, uBright: { value: o.bright ?? 1 }, uBrown: { value: o.brown ?? 0 }, uCover: { value: o.cover ?? 0.3 }, uFlex: { value: o.flex ?? 0.22 }, uBronze: { value: o.bronze ?? 0 },
    };
    const defines = o.tree ? { TREE_LEAF: 1 } : {};
    if (o.tree) uniforms.uFade.value = 1e6;
    const main = makeMaterial({ name: (o.tree ? 'near:' : 'gf:') + sheetId, vs: LEAFY_VS, fs: LEAFY_FS, uniforms, instanced: true, wind: true, side: THREE.DoubleSide, a2c: true, defines });
    const depth = makeDepthMaterial({ vs: LEAFY_VS, fs: LEAFY_FS, uniforms, instanced: true, wind: true, defines });
    return { main, depth, uniforms };
  }
}

/** Fallen leaves afloat on the stream: rafts along the banks and in the eddies of still pools, a few caught in the riffles. */
export function buildFloatingLeaves(flora, terrain, seed) {
  const group = new THREE.Group();
  group.name = 'floating';
  const rng = new RNG(seed).fork('floating');
  const kinds = [['chestnut', 5], ['redmaple', 2.5], ['sugarmaple', 1.2], ['redoak', 1.5], ['tulip', 1.5], ['beech', 1], ['ybirch', 1.2], ['hickory', 0.6]];
  const weights = kinds.map((k) => k[1]);
  const NV = 3;
  const lists = kinds.map(() => Array.from({ length: NV }, () => ({ A: [], B: [] })));
  const HALF = WORLD / 2;
  const dens = G.quality.ground;
  for (const st of terrain.streams) {
    const pts = st.pts;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], a = pts[i - 1], b = pts[i + 1];
      if (Math.abs(p.x) > HALF - 2 || Math.abs(p.z) > HALF - 2) continue;
      let tx = b.x - a.x, tz = b.z - a.z;
      const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const seg = tl / 2;
      const still = smoothstep(0.35, 0.9, p.pool);
      const n = Math.round(seg * p.half * 2 * (1.5 + 30 * still) * rng.f(0.7, 1.3) * dens);
      for (let k = 0; k < n; k++) {
        const u = rng.f(-1, 1), along = rng.f(-0.5, 0.5) * seg;
        const x = p.x - tz * u * p.half * 1.3 + tx * along, z = p.z + tx * u * p.half * 1.3 + tz * along;
        const lvl = p.w + (b.w - a.w) * along / tl;
        const depth = lvl - terrain.heightAt(x, z);
        if (depth < 0.012) continue;
        // rafts gather against the banks and where the current slackens
        const raft = noise2(x * 0.8, z * 0.8, seed + 77);
        const edge = 1 - smoothstep(0.02, 0.2, depth);
        if (rng.next() > Math.max(edge * 0.95, smoothstep(0.5, 0.7, raft)) * (0.2 + 0.8 * still) + 0.035) continue;
        const ki = rng.wpick(weights), l = lists[ki][rng.i(0, NV - 1)];
        l.A.push(x, lvl + 0.006, z, rng.f(0.85, 1.15));
        l.B.push(rng.f(0, 6.283), rng.next(), 0, 0);
      }
    }
  }
  let total = 0;
  kinds.forEach(([id], ki) => {
    const sheet = flora.sheet(id);
    const mat = makeLeafyMaterial(flora, id, { trans: 0.35, hueVar: 0.07, bright: 0.9, flutter: 0, brown: 0.5, gloss: 0.7 });
    mat.uniforms.uFade.value = 110;
    for (let v = 0; v < NV; v++) {
      const l = lists[ki][v];
      const n = l.A.length / 4;
      if (!n) continue;
      const geo = looseLeaf(sheet, rng.fork(id + v), { curl: 0.22 }).toGeometry(false);
      const ig = makeInstancedGeometry(geo, n);
      setInstances(ig, new Float32Array(l.A), new Float32Array(l.B), n);
      const mesh = new THREE.Mesh(ig, mat.main);
      mesh.frustumCulled = false; mesh.matrixAutoUpdate = false;
      group.add(mesh);
      total += n;
    }
  });
  return { group, count: total };
}

// ------------------------------------------------------------------------------------------ the layer
export class GroundFlora {
  constructor(flora, terrain, eco, rocks, seed) {
    this.flora = flora; this.terrain = terrain; this.eco = eco; this.rocks = rocks;
    this.seed = seed;
    this.types = [];
    this.group = new THREE.Group();
    this.group.name = 'groundflora';
    this.cells = new Map();
    this.lastX = 1e9; this.lastZ = 1e9;
    this.S = terrain.seed;
    this.rockGrid = new Map();
    for (const r of rocks.rocks) {
      if (r.r < 0.45) continue;
      const k = Math.floor(r.x / 6) + ',' + Math.floor(r.z / 6);
      let l = this.rockGrid.get(k); if (!l) this.rockGrid.set(k, l = []);
      l.push(r);
    }
    this._define();
  }

  _leafyMat(sheetId, o = {}) { return makeLeafyMaterial(this.flora, sheetId, o); }
  _bladeMat(o = {}) {
    const uniforms = {
      tLeaf: { value: null }, tLeafN: { value: null }, uTrans: { value: o.trans ?? 0.7 }, uGloss: { value: o.gloss ?? 0.25 }, uHueVar: { value: o.hueVar ?? 0.05 },
      uTexSize: { value: 1 }, uFade: { value: 30 }, uFlutter: { value: o.flutter ?? 0.02 }, uAlign: { value: o.align ? 1 : 0 }, uBright: { value: 1 }, uBrown: { value: 0 }, uCover: { value: 0 }, uFlex: { value: 0.22 }, uBronze: { value: 0 },
    };
    const main = makeMaterial({ name: 'gf:blade', vs: LEAFY_VS, fs: LEAFY_FS, uniforms, instanced: true, wind: true, side: THREE.DoubleSide, defines: { USE_COL: 1 } });
    const depth = makeDepthMaterial({ vs: LEAFY_VS, fs: LEAFY_FS, uniforms, instanced: true, wind: true, defines: { USE_COL: 1 } });
    return { main, depth, uniforms };
  }

  /** Register a plant kind. def: { id, mat, build(rng)->MB, variants, dist, max (per m²), density(site)->per m², scale:[a,b], shadow, cap } */
  add(def) {
    const rng = new RNG(this.seed).fork('gf:' + def.id);
    const t = { ...def, meshes: [], A: [], B: [] };
    const q = G.quality;
    t.dist = def.dist * q.groundDist;
    t.max = def.max * q.ground;
    t.cap = Math.ceil((def.cap ?? Math.min(60000, t.max * Math.PI * t.dist * t.dist * (def.fill ?? 0.5))) / def.variants) + 64;
    for (let v = 0; v < def.variants; v++) {
      const mb = def.build(rng.fork(v));
      const geo = mb.toGeometry(!!def.blade);
      const ig = makeInstancedGeometry(geo, t.cap);
      const mat = { ...def.mat };
      const mesh = new THREE.Mesh(ig, def.mat.main);
      mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.visible = false;
      const dist = t.dist;
      mesh.onBeforeRender = () => { def.mat.uniforms.uFade.value = dist; def.mat.main.uniformsNeedUpdate = true; def.mat.depth.uniformsNeedUpdate = true; };
      this.group.add(mesh);
      if (def.shadow) registerCaster(mesh, def.mat.depth, false);
      t.meshes.push(mesh);
      t.A.push(new Float32Array(t.cap * 4)); t.B.push(new Float32Array(t.cap * 4));
    }
    t.index = this.types.length;
    this.types.push(t);
    return t;
  }

  _site(x, z) {
    const F = this.terrain.fields, e = this.eco;
    const S = this.S;
    const lit = e.litterAt(x, z);
    let nearRock = 0;
    const cx = Math.floor(x / 6), cz = Math.floor(z / 6);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const l = this.rockGrid.get((cx + i) + ',' + (cz + j));
      if (!l) continue;
      for (const r of l) { const d = Math.hypot(r.x - x, r.z - z); if (d < r.r * 0.8) nearRock = 2; else if (d < r.r * 1.9) nearRock = Math.max(nearRock, 1); }
    }
    return {
      x, z, m: F.moisture.at(x, z), sd: F.streamDist.at(x, z), trail: F.trail.at(x, z), rock: F.rock.at(x, z), slope: F.slope.at(x, z),
      north: F.north.at(x, z), rel: F.rel.at(x, z), cover: e.coverAt(x, z), gap: e.gapAt(x, z), maple: lit[0], needle: lit[1], oak: lit[2], chest: lit[3], nearRock,
      // colony masks: independent low-frequency fields
      c1: 0.5 + 0.5 * fbm2(x * 0.045, z * 0.045, 3, S + 201), c2: 0.5 + 0.5 * fbm2(x * 0.05 + 40, z * 0.05, 3, S + 202),
      c3: 0.5 + 0.5 * fbm2(x * 0.06, z * 0.06 + 80, 3, S + 203), c4: 0.5 + 0.5 * fbm2(x * 0.04 - 30, z * 0.04, 3, S + 204),
      c5: 0.5 + 0.5 * fbm2(x * 0.07, z * 0.07 - 55, 3, S + 205),
    };
  }

  _cell(ci, cj) {
    const key = ci * 4096 + cj;
    let c = this.cells.get(key);
    if (c) return c;
    c = { lists: new Array(this.types.length).fill(null) };
    const x0 = ci * CELL, z0 = cj * CELL;
    if (Math.abs(x0 + CELL / 2) > HALF - 1 || Math.abs(z0 + CELL / 2) > HALF - 1) { this.cells.set(key, c); return c; }
    // probe sites once per cell for quick rejection
    const probes = [this._site(x0 + 2, z0 + 2), this._site(x0 + 6, z0 + 2), this._site(x0 + 2, z0 + 6), this._site(x0 + 6, z0 + 6), this._site(x0 + 4, z0 + 4)];
    for (const t of this.types) {
      let pm = 0;
      for (const p of probes) pm = Math.max(pm, t.density(p));
      if (pm <= 1e-4) continue;
      const rng = new RNG(hash32((ci * 73856093) ^ (cj * 19349663) ^ (t.index * 83492791) ^ this.seed));
      const K = Math.ceil(t.max * CELL * CELL);
      const out = [];
      for (let k = 0; k < K; k++) {
        const x = x0 + rng.next() * CELL, z = z0 + rng.next() * CELL;
        const r1 = rng.next(), r2 = rng.next(), r3 = rng.next(), r4 = rng.next();
        const s = this._site(x, z);
        if (s.sd < (t.minStream ?? 0.4) || s.nearRock === 2) continue;
        if (r1 * t.max > t.density(s) * G.quality.ground) continue;
        if (!t.onTrunk && this.eco.big.blocked(x, z, 0.15, 0.4)) continue;
        const y = this.terrain.heightAt(x, z);
        const sl = this.terrain.slopeAt(x, z, 0.3);
        out.push(x, y, z, lerp(t.scale[0], t.scale[1], r2), r3 * 6.283, r4, sl[0], sl[1]);
      }
      if (out.length) c.lists[t.index] = new Float32Array(out);
    }
    this.cells.set(key, c);
    return c;
  }

  solo(id) { this._solo = id; }

  update(camera, force = false) {
    const cx = camera.position.x, cz = camera.position.z;
    if (!force && Math.hypot(cx - this.lastX, cz - this.lastZ) < 2.0) return;
    this.lastX = cx; this.lastZ = cz;
    const maxD = Math.max(...this.types.map((t) => t.dist));
    const R = Math.ceil(maxD / CELL);
    const ci0 = Math.floor(cx / CELL), cj0 = Math.floor(cz / CELL);
    const counts = this.types.map((t) => new Int32Array(t.variants));
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      const ci = ci0 + i, cj = cj0 + j;
      // distance from camera to the cell's nearest point
      const nx = clamp(cx, ci * CELL, ci * CELL + CELL), nz = clamp(cz, cj * CELL, cj * CELL + CELL);
      const dc = Math.hypot(nx - cx, nz - cz);
      if (dc > maxD) continue;
      const c = this._cell(ci, cj);
      for (const t of this.types) {
        if (dc > t.dist) continue;
        const l = c.lists[t.index];
        if (!l) continue;
        const nv = t.variants;
        for (let k = 0; k < l.length; k += 8) {
          const dx = l[k] - cx, dz = l[k + 2] - cz;
          if (dx * dx + dz * dz > t.dist * t.dist) continue;
          const v = Math.floor(l[k + 5] * 977) % nv;
          const n = counts[t.index][v];
          if (n >= t.cap) continue;
          const A = t.A[v], B = t.B[v], o = n * 4;
          A[o] = l[k]; A[o + 1] = l[k + 1]; A[o + 2] = l[k + 2]; A[o + 3] = l[k + 3];
          B[o] = l[k + 4]; B[o + 1] = l[k + 5]; B[o + 2] = l[k + 6]; B[o + 3] = l[k + 7];
          counts[t.index][v] = n + 1;
        }
      }
    }
    let total = 0;
    for (const t of this.types) for (let v = 0; v < t.variants; v++) {
      const n = counts[t.index][v];
      t.meshes[v].visible = n > 0 && (!this._solo || t.id === this._solo || t.id.startsWith('leaf:') === false && this._solo === '*');
      if (n > 0) setInstances(t.meshes[v].geometry, t.A[v], t.B[v], n);
      total += n;
    }
    this.count = total;
    this.typeCounts = this.types.map((t) => [t.id, Array.from(counts[t.index]).reduce((a, b) => a + b, 0)]);
    // drop far cells to bound memory
    if (this.cells.size > 6000) {
      for (const [k] of this.cells) {
        const ci = Math.floor(k / 4096), cj = k - ci * 4096;
        if (Math.abs(ci - ci0) > R + 4 || Math.abs((cj > 2048 ? cj - 4096 : cj) - cj0) > R + 4) this.cells.delete(k);
      }
    }
  }

  // ---------------------------------------------------------------------------------------- the species
  _define() {
    const f = this.flora;
    const sm = smoothstep;
    const band = (m, a, o, b) => (m < o ? sm(a, o, m) : sm(b, o, m));
    const open = (s) => 0.55 + 0.45 * Math.max(s.gap, 1 - s.cover);       // light on the forest floor
    const noTrail = (s) => 1 - sm(0.05, 0.5, s.trail);
    const rockEdge = (s) => (s.nearRock === 1 ? 1 : 0);

    // ---- ferns
    const S = (id) => f.sheet(id);
    this.add({ id: 'christmasfern', mat: this._leafyMat('christmasfern', { cover: 0.06, gloss: 0.7, trans: 0.45, hueVar: 0.03 }), variants: 4, dist: 58, max: 1.2, scale: [0.8, 1.25], shadow: true,
      build: (r) => fernRosette(S('christmasfern'), r, { fronds: [7, 13], elev: [0.45, 0.95], droop: [0.6, 1.1], flat: 0.4 }),
      density: (s) => (0.34 * band(s.m, 0.12, 0.55, 0.97) * (0.55 + 0.9 * sm(0.4, 0.62, s.c3)) + 0.7 * rockEdge(s) + 0.15 * sm(0.3, 0.7, s.slope)) * noTrail(s) });
    this.add({ id: 'woodfern', mat: this._leafyMat('woodfern', { cover: 0.06, gloss: 0.3, trans: 0.7 }), variants: 3, dist: 58, max: 0.7, scale: [0.8, 1.2], shadow: true,
      build: (r) => fernRosette(S('woodfern'), r, { fronds: [6, 10], elev: [0.8, 1.2], droop: [0.8, 1.3], flat: 0.12 }),
      density: (s) => (0.16 * sm(0.45, 0.8, s.m) + 0.55 * rockEdge(s) * sm(0.3, 0.7, s.m)) * noTrail(s) });
    this.add({ id: 'ladyfern', mat: this._leafyMat('ladyfern', { cover: 0.06, trans: 0.9, hueVar: 0.08 }), variants: 3, dist: 58, max: 0.9, scale: [0.8, 1.25], shadow: true,
      build: (r) => fernRosette(S('ladyfern'), r, { fronds: [6, 10], elev: [0.9, 1.25], droop: [0.9, 1.4], flat: 0.15 }),
      density: (s) => 0.8 * sm(0.74, 0.95, s.m) * sm(0.45, 0.7, s.c1 + 0.3 * sm(8, 2, s.sd)) * noTrail(s) });
    this.add({ id: 'hayfern', mat: this._leafyMat('hayfern', { cover: 0.06, trans: 0.95, hueVar: 0.08 }), variants: 5, dist: 62, max: 9.0, scale: [0.8, 1.25], shadow: true, fill: 0.2,
      build: (r) => colonyFronds(S('hayfern'), r, { fronds: [1, 2], radius: 0.10, elev: [0.85, 1.3], droop: [0.8, 1.3] }),
      density: (s) => 9.0 * sm(0.56, 0.66, s.c2 + 0.25 * s.gap) * band(s.m, 0.08, 0.4, 0.75) * noTrail(s) });
    this.add({ id: 'nyfern', mat: this._leafyMat('nyfern', { cover: 0.06, trans: 0.95, hueVar: 0.08 }), variants: 5, dist: 58, max: 11.0, scale: [0.8, 1.2], shadow: true, fill: 0.15,
      build: (r) => colonyFronds(S('nyfern'), r, { fronds: [1, 3], radius: 0.08, elev: [0.9, 1.35], droop: [0.8, 1.3] }),
      density: (s) => 11.0 * sm(0.60, 0.70, s.c3) * band(s.m, 0.33, 0.62, 0.92) * noTrail(s) });
    this.add({ id: 'bracken', mat: this._leafyMat('bracken', { cover: 0.06, trans: 0.8, hueVar: 0.08 }), variants: 4, dist: 62, max: 2.2, scale: [0.85, 1.35], shadow: true, fill: 0.2,
      build: (r) => colonyFronds(S('bracken'), r, { fronds: [1, 2], radius: 0.2, stalk: [0.35, 0.75] }),
      density: (s) => 2.2 * sm(0.52, 0.64, s.c4 + 0.25 * s.gap) * sm(0.45, 0.15, s.m) * noTrail(s) });

    // ---- sedges and grasses (blades)
    const blade = this._bladeMat({});
    const blade2 = this._bladeMat({ gloss: 0.5 });
    const G1 = [[0.36, 0.50, 0.18], [0.42, 0.55, 0.20], [0.48, 0.56, 0.22], [0.56, 0.58, 0.26]];
    this.add({ id: 'pasedge', blade: true, mat: blade, variants: 4, dist: 42, max: 14, scale: [0.8, 1.25], fill: 0.12,
      build: (r) => tuft(r, { n: [34, 52], len: [0.16, 0.30], w: 0.0013, elev: [0.55, 1.3], droop: [1.1, 1.9], cols: G1, dead: 0.25, radius: 0.06, seg: 5, fold: 0.3, tip: [0.62, 0.55, 0.30], tipAmt: 0.8 }),
      density: (s) => 14 * sm(0.52, 0.60, s.c5 + 0.12 * (1 - s.cover)) * band(s.m, 0.04, 0.3, 0.62) * noTrail(s) });
    this.add({ id: 'appsedge', blade: true, mat: blade, variants: 3, dist: 42, max: 1.8, scale: [0.85, 1.3],
      build: (r) => tuft(r, { n: [70, 100], len: [0.28, 0.42], w: 0.0007, elev: [0.75, 1.4], droop: [1.5, 2.3], cols: [[0.30, 0.50, 0.14], [0.36, 0.54, 0.16], [0.44, 0.56, 0.18]], dead: 0.2, radius: 0.045, seg: 6, fold: 0 }),
      density: (s) => (1.1 * band(s.m, 0.2, 0.5, 0.85) * (0.4 + 1.2 * sm(0.42, 0.6, s.c2)) + 0.5 * sm(0.3, 0.7, s.trail) * (1 - sm(0.8, 1.0, s.trail))) * open(s) });
    this.add({ id: 'plantainsedge', blade: true, mat: blade2, variants: 3, dist: 36, max: 0.9, scale: [0.85, 1.25],
      build: (r) => tuft(r, { n: [9, 15], len: [0.18, 0.30], w: 0.013, elev: [0.45, 1.0], droop: [0.7, 1.2], cols: [[0.20, 0.42, 0.13], [0.24, 0.47, 0.15], [0.28, 0.50, 0.16]], dead: 0.06, radius: 0.025, seg: 6, fold: 0.2, rib: true, tipAmt: 0.2, baseCol: [0.36, 0.10, 0.14] }),
      density: (s) => 0.9 * sm(0.58, 0.82, s.m) * sm(0.36, 0.58, s.c1) * noTrail(s) });
    this.add({ id: 'panicgrass', blade: true, mat: blade, variants: 4, dist: 36, max: 0.9, scale: [0.85, 1.25],
      build: (r) => panicGrass(r),
      density: (s) => 0.9 * band(s.m, 0.05, 0.3, 0.6) * sm(0.38, 0.58, s.c3) * open(s) * noTrail(s) });
    this.add({ id: 'hairgrass', blade: true, mat: blade, variants: 3, dist: 40, max: 1.6, scale: [0.85, 1.3],
      build: (r) => tuft(r, { n: [60, 90], len: [0.14, 0.26], w: 0.0012, elev: [0.8, 1.45], droop: [0.8, 1.5], cols: [[0.16, 0.32, 0.12], [0.20, 0.36, 0.13], [0.30, 0.38, 0.15]], dead: 0.3, radius: 0.035, seg: 4, fold: 0 }),
      density: (s) => 1.6 * sm(0.36, 0.1, s.m) * sm(0.42, 0.6, s.c2 + 0.25 * s.rock) * noTrail(s) });
    // tall culms with seed heads
    const gb = S('grassbits');
    this.add({ id: 'bottlebrush', mat: this._leafyMat('grassbits', { trans: 0.6, hueVar: 0.03, flutter: 0.03 }), variants: 3, dist: 44, max: 0.5, scale: [0.85, 1.2],
      build: (r) => stemPlant(gb, r, { stems: [3, 6], h: [0.85, 1.3], lean: 0.22, leaves: [2, 4], from: 0.15, topScale: 0.7, stemR: 0.0014, radius: 0.04, top: { name: 'bottlebrush', n: [1, 1], spread: 0.0 } }),
      density: (s) => 0.5 * band(s.m, 0.3, 0.6, 0.9) * sm(0.5, 0.68, s.c4 + 0.3 * s.gap + 0.2 * sm(0.2, 0.6, s.trail)) * (1 - sm(0.8, 1, s.trail)) });
    this.add({ id: 'hairgrassheads', mat: this._leafyMat('grassbits', { trans: 0.7, hueVar: 0.03, flutter: 0.04 }), variants: 3, dist: 34, max: 1.2, scale: [0.85, 1.2],
      build: (r) => stemPlant(gb, r, { stems: [3, 7], h: [0.35, 0.6], lean: 0.35, leaves: [0, 0], stemR: 0.0007, radius: 0.03, top: { name: 'panicle', n: [1, 1], spread: 0.0 } }),
      density: (s) => 1.2 * sm(0.36, 0.1, s.m) * sm(0.42, 0.6, s.c2 + 0.25 * s.rock) * noTrail(s) });

    // ---- herbs
    this.add({ id: 'galax', mat: this._leafyMat('galax', { gloss: 1.0, trans: 0.25, hueVar: 0.05 }), variants: 4, dist: 34, max: 14, scale: [0.85, 1.25], fill: 0.1,
      build: (r) => basalLeaves(S('galax'), r, { n: [5, 9], radius: 0.09, elev: [1.1, 1.45], blade: [0.05, 0.6], fold: 0.14 }),
      density: (s) => 14 * sm(0.56, 0.65, s.c1) * band(s.m, 0.04, 0.28, 0.6) * noTrail(s) });
    this.add({ id: 'wintergreen', mat: this._leafyMat('wintergreen', { gloss: 0.9, trans: 0.3 }), variants: 3, dist: 26, max: 8, scale: [0.85, 1.2], fill: 0.1,
      build: (r) => stemPlant(S('wintergreen'), r, { stems: [2, 4], h: [0.07, 0.13], lean: 0.25, radius: 0.05, stemR: 0.0012, whorls: [{ t: 1.0, n: [3, 5], elev: [0.35, 0.95] }], top: { name: 'berries', n: [0, 2], spread: 0.012 } }),
      density: (s) => 8 * sm(0.58, 0.68, s.c2) * sm(0.5, 0.15, s.m) * noTrail(s) });
    this.add({ id: 'partridgeberry', mat: this._leafyMat('partridgeberry', { gloss: 0.8, trans: 0.3, align: true }), variants: 4, dist: 24, max: 1.6, scale: [0.9, 1.5],
      build: (r) => groundMat(S('partridgeberry'), r, { runners: [4, 7], steps: [6, 11], berry: 0.07 }),
      density: (s) => 1.6 * band(s.m, 0.35, 0.7, 0.97) * (0.4 + 0.6 * s.needle) * sm(0.36, 0.56, s.c3) * noTrail(s) });
    this.add({ id: 'stripedwintergreen', mat: this._leafyMat('stripedwintergreen', { gloss: 0.7, trans: 0.3 }), variants: 3, dist: 24, max: 0.35, scale: [0.85, 1.2],
      build: (r) => stemPlant(S('stripedwintergreen'), r, { h: [0.08, 0.15], lean: 0.15, whorls: [{ t: 0.55, n: [3, 4], elev: [0.0, 0.3] }, { t: 1.0, n: [3, 4], elev: [0.1, 0.5], scale: 0.85 }] }),
      density: (s) => 0.35 * sm(0.5, 0.15, s.m) * (0.4 + 0.6 * s.oak) * noTrail(s) });
    this.add({ id: 'rattlesnake', mat: this._leafyMat('rattlesnake', { gloss: 0.4, trans: 0.4, align: true }), variants: 3, dist: 22, max: 0.3, scale: [0.85, 1.25],
      build: (r) => basalLeaves(S('rattlesnake'), r, { n: [4, 7], radius: 0.005, elev: [0.15, 0.35], blade: [0.0, 0.2], fold: 0.03 }),
      density: (s) => 0.3 * band(s.m, 0.35, 0.65, 0.92) * (0.35 + 0.65 * s.needle) * noTrail(s) });
    this.add({ id: 'wildginger', mat: this._leafyMat('wildginger', { trans: 0.3, gloss: 0.05, bright: 0.85 }), variants: 3, dist: 30, max: 9, scale: [0.9, 1.35], fill: 0.1,
      build: (r) => basalLeaves(S('wildginger'), r, { n: [2, 2], radius: 0.01, elev: [1.15, 1.45], blade: [-0.35, 0.2], fold: 0.12 }),
      density: (s) => 9 * sm(0.58, 0.67, s.c4) * sm(0.55, 0.8, s.m) * noTrail(s) });
    this.add({ id: 'aster', mat: this._leafyMat('aster', { trans: 0.9 }), variants: 4, dist: 36, max: 1.6, scale: [0.85, 1.3], shadow: true,
      build: (r) => stemPlant(S('aster'), r, { stems: [2, 4], h: [0.38, 0.78], lean: 0.3, zigzag: 1, leaves: [6, 9], from: 0.15, topScale: 0.55, radius: 0.04, stemR: 0.0022, top: { name: 'asterflower', n: [9, 20], spread: 0.11 } }),
      density: (s) => (1.1 * band(s.m, 0.1, 0.42, 0.82) * sm(0.3, 0.55, s.c5) + 0.5 * sm(0.15, 0.6, s.trail) * (1 - sm(0.8, 1, s.trail))) * open(s) });
    this.add({ id: 'foamflower', mat: this._leafyMat('foamflower', { trans: 0.85 }), variants: 3, dist: 28, max: 6, scale: [0.85, 1.2], fill: 0.1,
      build: (r) => basalLeaves(S('foamflower'), r, { n: [4, 7], radius: 0.02, elev: [1.0, 1.4], blade: [-0.15, 0.35] }),
      density: (s) => 6 * sm(0.56, 0.67, s.c5 + 0.2 * sm(6, 1, s.sd)) * sm(0.62, 0.85, s.m) * noTrail(s) });
    this.add({ id: 'trillium', mat: this._leafyMat('trillium', { trans: 0.9 }), variants: 3, dist: 26, max: 0.3, scale: [0.85, 1.2],
      build: (r) => stemPlant(S('trillium'), r, { h: [0.14, 0.26], lean: 0.6, stemR: 0.002, whorls: [{ t: 1.0, n: [3, 3], elev: [-0.5, 0.1] }] }),
      density: (s) => 0.3 * sm(0.6, 0.82, s.m) * sm(0.45, 0.62, s.c2) * noTrail(s) });
    this.add({ id: 'mayapple', mat: this._leafyMat('mayapple', { trans: 0.9 }), variants: 3, dist: 28, max: 1.2, scale: [0.85, 1.2], fill: 0.1,
      build: (r) => umbrellaPlant(S('mayapple'), r, { h: [0.2, 0.36], lean: 0.25, stemR: 0.003 }),
      density: (s) => 1.2 * sm(0.68, 0.76, s.c3) * sm(0.62, 0.8, s.m) * noTrail(s) });
    this.add({ id: 'cucumberroot', mat: this._leafyMat('cucumberroot', { trans: 0.9 }), variants: 3, dist: 28, max: 0.5, scale: [0.85, 1.2],
      build: (r) => stemPlant(S('cucumberroot'), r, { h: [0.32, 0.6], lean: 0.12, stemR: 0.0018, whorls: [{ t: 0.6, n: [5, 9], elev: [0.0, 0.3] }, { t: 1.0, n: [3, 3], elev: [0.1, 0.45], scale: 0.55 }], top: { name: 'berries', n: [1, 2], spread: 0.01 } }),
      density: (s) => 0.5 * band(s.m, 0.4, 0.66, 0.9) * sm(0.4, 0.6, s.c4) * noTrail(s) });
    this.add({ id: 'creeperground', mat: this._leafyMat('creeper', { trans: 0.95, hueVar: 0.08 }), variants: 3, dist: 30, max: 0.35, scale: [0.85, 1.25],
      build: (r) => stemPlant(S('creeper'), r, { stems: [2, 4], h: [0.1, 0.24], lean: 2.2, radius: 0.1, stemR: 0.0015, whorls: [{ t: 1.0, n: [5, 5], elev: [0.0, 0.5] }, { t: 0.5, n: [5, 5], elev: [0.2, 0.7], scale: 0.8 }] }),
      density: (s) => 0.35 * band(s.m, 0.2, 0.55, 0.9) * sm(0.4, 0.6, s.c1) * noTrail(s) });
    // seedlings of the canopy trees
    for (const [id, dens, mfn] of [['chestnut', 0.5, (s) => band(s.m, 0.1, 0.42, 0.8) * (0.4 + 0.6 * s.chest)], ['redmaple', 0.45, (s) => band(s.m, 0.2, 0.6, 1.0)], ['beech', 0.2, (s) => band(s.m, 0.35, 0.65, 0.95)], ['sugarmaple', 0.25, (s) => sm(0.5, 0.8, s.m)]]) {
      this.add({ id: 'seedling:' + id, mat: this._leafyMat(id, { trans: 0.95, hueVar: 0.08 }), variants: 3, dist: 30, max: dens, scale: [0.7, 1.3],
        build: (r) => stemPlant(S(id), r, { h: [0.14, 0.4], lean: 0.25, leaves: [3, 6], from: 0.4, topScale: 0.9, stemR: 0.0016, opposite: id.includes('maple') }),
        density: (s) => dens * mfn(s) * noTrail(s) * (0.6 + 0.4 * s.gap) });
    }

    // ---- loose fallen leaves, burs
    const litter = [
      ['chestnut', 6.5, (s) => 0.35 + 0.65 * s.chest], ['redmaple', 3.0, (s) => 0.15 + 0.85 * s.maple], ['sugarmaple', 1.6, (s) => 0.1 + 0.9 * s.maple * sm(0.4, 0.7, s.m)],
      ['redoak', 2.2, (s) => 0.15 + 0.85 * s.oak], ['chestnutoak', 1.6, (s) => (0.1 + 0.9 * s.oak) * sm(0.5, 0.2, s.m)], ['tulip', 1.6, (s) => sm(0.4, 0.75, s.m)],
      ['beech', 1.4, (s) => 0.1 + 0.9 * s.oak * sm(0.3, 0.6, s.m)], ['hickory', 1.0, (s) => sm(0.6, 0.25, s.m)], ['dogwood', 0.8, () => 0.5], ['ybirch', 1.0, (s) => sm(0.55, 0.85, s.m)],
    ];
    for (const [id, dens, fn] of litter) {
      this.add({ id: 'leaf:' + id, mat: this._leafyMat(id, { trans: 0.5, hueVar: 0.07, align: true, bright: 0.85, flutter: 0.0, brown: 0.85 }), variants: 5, dist: 13, max: dens, scale: [0.85, 1.15], minStream: -1, fill: 1.0,
        build: (r) => looseLeaf(S(id), r, {}), density: (s) => dens * fn(s) * (1 - 0.6 * sm(0.3, 0.9, s.trail)) });
    }
    const burMat = this._bladeMat({ trans: 0.0, gloss: 0.3, flutter: 0, align: false });
    this.add({ id: 'bur', blade: true, mat: burMat, variants: 3, dist: 16, max: 1.6, scale: [0.9, 1.25], shadow: false, fill: 1.0,
      build: (r) => burMesh(r, false), density: (s) => 1.6 * sm(0.25, 0.7, s.chest) });
    this.add({ id: 'buropen', blade: true, mat: burMat, variants: 3, dist: 16, max: 2.2, scale: [0.9, 1.25], shadow: false, fill: 1.0,
      build: (r) => burMesh(r, true), density: (s) => 2.2 * sm(0.25, 0.7, s.chest) });
  }
}
