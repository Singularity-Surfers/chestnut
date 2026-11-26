// Procedural woody-plant generator: skeleton (trunk, limbs, twigs) -> bark tubes + leaf-cluster cards, 3 LODs.
import * as THREE from 'three';
import { RNG, clamp, lerp, smoothstep, noise2 } from '../core/rng.js';

const UP = [0, 1, 0];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
function perp(d) {
  const a = Math.abs(d[1]) < 0.9 ? UP : [1, 0, 0];
  return norm(cross(d, a));
}
function rotAround(v, axis, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const k = cross(axis, v), d = dot(axis, v) * (1 - c);
  return [v[0] * c + k[0] * s + axis[0] * d, v[1] * c + k[1] * s + axis[1] * d, v[2] * c + k[2] * s + axis[2] * d];
}

const SHAPES = {
  round: (u) => lerp(1.0, 0.5, u * u),
  oval: (u) => lerp(0.82, 0.42, u),
  spreading: (u) => lerp(1.12, 0.45, u),
  conical: (u) => lerp(0.55, 1.0, Math.min(1, u * 5)) * lerp(1.0, 0.1, Math.pow(u, 0.85)),
  vase: (u) => lerp(0.7, 1.0, u),
  arching: () => 1.0,
};

/**
 * Build the branch skeleton.
 * Returns { branches:[{pts:[{p,r}], level, flex0, flex1}], clusters:[{p,dir,size,seed,lvl}], H, crown }
 */
export function growSkeleton(arch, H, dbh, cl, rng, opts = {}) {
  const branches = [];
  const clusters = [];
  const r0 = dbh / 2;
  const shapeFn = SHAPES[arch.shape] || SHAPES.round;
  const levels = [arch.l1, arch.l2, arch.l3].filter(Boolean);
  const nLevels = levels.length;
  const clSpacing = cl.size * (opts.spacing ?? 0.25);
  const sparse = opts.sparse ?? 1;

  function emitClusters(pts, t0, lvl, flat) {
    // foliage along the outer part of a twig-bearing branch
    let acc = clSpacing * rng.f(0.2, 1.0);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const seg = len(sub(b.p, a.p));
      const ta = (i - 1) / (pts.length - 1), tb = i / (pts.length - 1);
      if (tb < t0) continue;
      const dirB = norm(sub(b.p, a.p));
      let d = acc;
      while (d < seg) {
        const f = d / seg;
        const p = mix3(a.p, b.p, f);
        const t = lerp(ta, tb, f);
        if (rng.chance(sparse)) {
          // lean the twig outward from the branch, mostly sideways and a little upward
          let side = perp(dirB);
          side = rotAround(side, dirB, flat ? (rng.chance(0.5) ? 0 : Math.PI) + rng.f(-0.35, 0.35) : rng.f(0, 6.283));
          if (flat && Math.abs(side[1]) > 0.6) side = norm([side[0], side[1] * 0.3, side[2]]);
          let dir = norm(add(mul(dirB, rng.f(0.25, 0.75)), mul(side, rng.f(0.6, 1.0))));
          dir = norm(add(dir, [0, (flat ? 0.0 : 0.22) - (arch.droop || 0) * 0.5, 0]));
          clusters.push({ p, dir, size: cl.size * rng.f(0.82, 1.18), seed: rng.next(), lvl, t });
        }
        d += clSpacing * rng.f(0.75, 1.3);
      }
      acc = d - seg;
    }
    // terminal spray
    const e = pts[pts.length - 1], e0 = pts[pts.length - 2];
    const dirE = norm(add(norm(sub(e.p, e0.p)), [0, -(arch.droop || 0) * 0.35, 0]));
    clusters.push({ p: e.p, dir: dirE, size: cl.size * rng.f(0.95, 1.25), seed: rng.next(), lvl, t: 1 });
  }

  function grow(start, dir, L, rad, lvl, flexBase, flat) {
    // lvl: 0 trunk/stem, 1.. limbs
    const def = levels[lvl - 1];
    const segL = lvl === 0 ? clamp(H / 28, 0.12, 1.3) : clamp(L / 7, 0.08, lvl === 1 ? 1.0 : 0.6);
    const nseg = Math.max(3, Math.ceil(L / segL));
    const pts = [];
    let p = start, d = dir;
    const wob = (lvl === 0 ? (arch.wobble ?? 0.015) : 0.085 + 0.04 * lvl) * (opts.gnarl ?? 1);
    const upK = lvl === 0 ? 0 : (def?.up ?? 0);
    const droop = (arch.droop || 0) * (lvl >= 2 ? 1 : lvl === 1 ? 0.35 : 0);
    for (let i = 0; i <= nseg; i++) {
      const t = i / nseg;
      const r = Math.max(0.0035, rad * (lvl === 0 ? 1 : (1 - 0.72 * Math.pow(t, 1.15))));
      pts.push({ p, r, t });
      if (i === nseg) break;
      // tropisms and wander
      let nd = add(d, [rng.n(0, wob), rng.n(0, wob * 0.6), rng.n(0, wob)]);
      nd = add(nd, [0, (upK * 1.6 - droop * t * 1.4 + (lvl === 1 ? (-0.22 + 0.62 * t) * (opts.sag ?? 1) : 0)) / nseg, 0]);
      if (lvl === 0) nd = add(nd, [0, 0.06, 0]);
      if (flat && lvl >= 2) nd[1] *= 0.86;
      d = norm(nd);
      p = add(p, mul(d, L / nseg));
    }
    const flexEnd = flexBase + (lvl === 0 ? 0.25 * H * 0.01 : L * (0.07 + 0.05 * lvl) * (opts.flex ?? 1));
    const br = { pts, level: lvl, flex0: flexBase, flex1: flexEnd, L };
    branches.push(br);
    return br;
  }

  function children(br, lvl, flatParent) {
    // spawn level `lvl` branches along br (lvl >= 2), or foliage if no deeper level exists
    const def = levels[lvl - 1];
    const pts = br.pts;
    if (!def) { emitClusters(pts, 0.10, lvl - 1, flatParent); return; }
    const n = Math.max(1, Math.round(rng.i(def.n[0], def.n[1]) * (opts.bushy ?? 1)));
    const flat = !!def.flat;
    let az = rng.f(0, 6.283);
    for (let k = 0; k < n; k++) {
      const t = lerp(0.24, 0.94, (k + rng.f(0.2, 0.8)) / n);
      const fi = t * (pts.length - 1);
      const i0 = Math.min(pts.length - 2, Math.floor(fi));
      const a = pts[i0], b = pts[i0 + 1];
      const p = mix3(a.p, b.p, fi - i0);
      const pr = lerp(a.r, b.r, fi - i0);
      const pd = norm(sub(b.p, a.p));
      const ang = rng.f(def.ang[0], def.ang[1]) * Math.PI / 180;
      let axis = perp(pd);
      if (flat) {
        // two-ranked: alternate left / right in the horizontal plane
        const h = norm(cross(pd, UP));
        const sgn = k % 2 ? 1 : -1;
        axis = norm(cross(pd, mul(h, sgn)));
        if (len(axis) < 0.1) axis = perp(pd);
        axis = rotAround(axis, pd, rng.f(-0.3, 0.3));
      } else {
        az += 2.4 + rng.f(-0.5, 0.5);
        axis = rotAround(axis, pd, az);
      }
      let d = rotAround(pd, axis, ang);
      // discourage growth straight down / back into the crown
      if (!flat && d[1] < -0.25) d = norm([d[0], -0.25 * 0.5, d[2]]);
      const L = br.L * rng.f(def.len[0], def.len[1]) * (1 - 0.45 * t);
      if (L < 0.12) continue;
      const rad = Math.min(pr * 0.9, pr * def.rad * (0.75 + 0.5 * rng.next()));
      const fb = lerp(br.flex0, br.flex1, t);
      const c = grow(p, d, L, rad, lvl, fb, flat);
      children(c, lvl + 1, flat);
    }
    // the parent's own outer shoot carries foliage too
    if (lvl >= nLevels || lvl >= 2) emitClusters(pts, lvl >= nLevels ? 0.3 : 0.55, lvl - 1, flatParent);
  }

  const stems = arch.form === 'shrub' ? rng.i(arch.stems[0], arch.stems[1]) : (arch.stems ? rng.i(arch.stems[0], arch.stems[1]) : 1);
  let trunkR = r0;
  for (let s = 0; s < stems; s++) {
    const multi = stems > 1;
    const az0 = (s / stems) * 6.283 + rng.f(-0.4, 0.4);
    const leanAmt = (arch.lean ?? 0.03) * (multi ? rng.f(0.6, 1.3) : rng.f(0.3, 1.2));
    const laz = multi ? az0 : (opts.leanAz ?? rng.f(0, 6.283));
    const dir0 = norm([Math.cos(laz) * leanAmt, 1, Math.sin(laz) * leanAmt]);
    const baseOff = multi ? mul([Math.cos(az0), 0, Math.sin(az0)], r0 * rng.f(0.8, 2.2)) : [0, 0, 0];
    const sH = H * (multi ? rng.f(0.7, 1.0) : 1);
    const sR = r0 * (multi ? rng.f(0.6, 1.0) : 1);
    const bole = arch.bole ? rng.f(arch.bole[0], arch.bole[1]) : (arch.form === 'shrub' ? rng.f(0.12, 0.3) : 0.4);
    const def1 = levels[0];
    // ---- trunk / stem
    const topFrac = arch.form === 'excurrent' ? 1.0 : (arch.form === 'shrub' ? 1.0 : rng.f(0.84, 0.95));
    const trunkL = sH * topFrac;
    const segL = clamp(sH / 28, 0.12, 1.3);
    const nseg = Math.max(4, Math.ceil(trunkL / segL));
    const pts = [];
    let p = add([0, -0.02, 0], baseOff), d = dir0;
    const wob = (arch.wobble ?? 0.015) * (opts.gnarl ?? 1);
    const archK = arch.arch ?? 0;
    for (let i = 0; i <= nseg; i++) {
      const t = i / nseg;
      const h = t * trunkL / sH;
      let r;
      if (arch.form === 'shrub') r = sR * (1 - 0.8 * t);
      else if (h < bole) r = sR * lerp(1.0, 0.80, Math.pow(h / bole, 0.9));
      else {
        const u = (h - bole) / Math.max(1e-3, topFrac - bole);
        r = sR * 0.80 * Math.pow(Math.max(0, 1 - u), arch.form === 'excurrent' ? 0.95 : 1.45) + 0.006;
      }
      pts.push({ p, r: Math.max(0.004, r), t });
      if (i === nseg) break;
      let nd = add(d, [rng.n(0, wob), 0, rng.n(0, wob)]);
      if (arch.form === 'shrub') {
        // stems arch outward, then nod
        nd = add(nd, [Math.cos(laz) * archK * 0.05, -archK * t * 0.16 + 0.02 * (1 - archK), Math.sin(laz) * archK * 0.05]);
      } else {
        // slowly return to vertical
        nd = add(nd, [0, 0.05 + 0.1 * t, 0]);
        if (arch.leader && t > 0.9) nd = add(nd, [rng.n(0, 0.2) * arch.leader, -0.15 * arch.leader, rng.n(0, 0.2) * arch.leader]);
      }
      d = norm(nd);
      p = add(p, mul(d, trunkL / nseg));
    }
    const trunk = { pts, level: 0, flex0: 0, flex1: sH * 0.012 * (opts.flex ?? 1), L: trunkL, isTrunk: true, flareR: sR };
    branches.push(trunk);
    if (s === 0) trunkR = sR;
    // ---- first-order branches
    if (def1) {
      const n = Math.max(1, Math.round(rng.f(def1.n[0], def1.n[1]) * (multi && arch.form === 'shrub' ? 1 : 1)));
      let az = rng.f(0, 6.283);
      const tb = bole / topFrac;
      for (let k = 0; k < n; k++) {
        // lower limbs are few and massive on decurrent trees; excurrent trees carry many even tiers
        const u = arch.form === 'excurrent' ? (k + rng.f(0.1, 0.9)) / n : Math.pow((k + rng.f(0.15, 0.85)) / n, 1.25);
        const t = lerp(tb, 0.97, u);
        const fi = t * (pts.length - 1);
        const i0 = Math.min(pts.length - 2, Math.floor(fi));
        const a = pts[i0], b = pts[i0 + 1];
        const bp = mix3(a.p, b.p, fi - i0);
        const pr = lerp(a.r, b.r, fi - i0);
        const pd = norm(sub(b.p, a.p));
        az += 2.4 + rng.f(-0.6, 0.6);
        const ang = lerp(def1.ang[1], def1.ang[0], arch.form === 'excurrent' ? rng.next() : u) * Math.PI / 180 * rng.f(0.9, 1.1);
        let axis = rotAround(perp(pd), pd, az);
        let dd = rotAround(pd, axis, ang);
        // old conifers lose limbs and grow unevenly; nothing in a wild crown is ruler-regular
        const irr = arch.irregular ?? 0;
        if (irr && rng.chance(irr * 0.28)) continue;
        const L = sH * rng.f(def1.len[0], def1.len[1]) * shapeFn(u) * (multi ? 0.8 : 1) * (irr ? rng.f(1 - irr * 0.55, 1 + irr * 0.2) : 1);
        if (L < 0.1) continue;
        const rad = Math.min(pr * 0.82, Math.max(0.005, pr * def1.rad * (0.8 + 0.4 * rng.next()) * (arch.form === 'excurrent' ? 1 : lerp(1.15, 0.8, u))));
        const fb = lerp(trunk.flex0, trunk.flex1, t);
        const c = grow(bp, dd, L, rad, 1, fb, !!def1.flat);
        children(c, 2, !!def1.flat);
      }
      if (arch.form !== 'decurrent' || nLevels <= 1) emitClusters(pts, arch.form === 'shrub' ? 0.55 : 0.9, 0, false);
    } else emitClusters(pts, 0.4, 0, false);
  }

  // crown statistics for shading
  let cx = 0, cy = 0, cz = 0, yMin = 1e9, yMax = -1e9;
  for (const c of clusters) { cx += c.p[0]; cy += c.p[1]; cz += c.p[2]; yMin = Math.min(yMin, c.p[1]); yMax = Math.max(yMax, c.p[1]); }
  const nC = Math.max(1, clusters.length);
  cx /= nC; cy /= nC; cz /= nC;
  let rxz = 0.1;
  for (const c of clusters) rxz = Math.max(rxz, Math.hypot(c.p[0] - cx, c.p[2] - cz));
  rxz += cl.size * 0.5;
  const ry = Math.max(0.2, (yMax - yMin) / 2 + cl.size * 0.5);
  for (const c of clusters) {
    const dn = Math.hypot((c.p[0] - cx) / rxz, (c.p[1] - cy) / ry, (c.p[2] - cz) / rxz);
    const top = clamp((c.p[1] - yMin) / Math.max(0.1, yMax - yMin));
    c.ao = clamp(lerp(0.34, 1.0, smoothstep(0.25, 0.95, dn)) * lerp(0.72, 1.0, top) + 0.06);
  }
  return { branches, clusters, H, trunkR, crown: { c: [cx, cy, cz], rxz, ry, yMin, yMax } };
}

// ------------------------------------------------------------------------------------------------ meshing
export class Buf {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = []; this.tan = []; this.tw = []; }
  get n() { return this.pos.length / 3; }
}

export function tube(buf, br, radial, ringStep, bark, opts) {
  const pts = br.pts;
  const n = pts.length;
  const baseR = pts[0].r;
  // choose rings
  const rings = [];
  for (let i = 0; i < n; i += ringStep) rings.push(i);
  if (rings[rings.length - 1] !== n - 1) rings.push(n - 1);
  const uRep = Math.max(1, Math.round((2 * Math.PI * baseR) / bark.tile[0]));
  let vAcc = 0;
  // initial frame
  let d0 = norm(sub(pts[1].p, pts[0].p));
  let nx = perp(d0);
  const start = buf.n;
  const isTrunk = !!br.isTrunk;
  const flare = isTrunk ? (opts.flare ?? 1) : 1, butt = isTrunk ? (opts.buttress ?? 0) : 0;
  // e-folding height of the root swell: decimetres, not a tenth of the tree
  const flareH = Math.min(0.85, 0.22 + 0.5 * baseR);
  const lobes = opts.lobes ?? 5, lobePh = opts.lobePh ?? 0;
  // Bark plates as real geometry (nearest LOD of big trunks only): broad ridges ~30 cm wide, split into
  // staggered plates, that break the silhouette and catch light; the fine furrows stay in the bark texture.
  const plates = isTrunk && opts.plateLOD && opts.plates ? opts.plates : 0;
  let K = 0;
  const plateTop = opts.plateTop ?? 10;
  if (plates) { K = Math.max(12, Math.round((2 * Math.PI * baseR) / 0.3)); radial = Math.max(radial, Math.min(200, K * 6)); }
  const hsh = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const plateDisp = (th, y) => {
    // lanes drift and spiral gently with height; K is an integer, so the pattern closes around the stem
    const L = th * K / 6.283185 + 0.55 * Math.sin(y * 0.21 + lobePh) + 0.25 * Math.sin(y * 0.67 + 2.0 * lobePh) + y * 0.045;
    const li0 = Math.floor(L), f = L - li0, li = ((li0 % K) + K) % K;
    const seg = Math.floor(y / (0.8 + 1.4 * hsh(li)) + hsh(li + 17));
    const hgt = 0.5 + 0.5 * hsh(li * 7.1 + seg * 13.3);
    // rounded shoulders, a narrow V fissure on one side, a wider shallow valley on the other
    const prof = smoothstep(0.0, 0.2, f) * (1 - smoothstep(0.58, 1.0, f));
    return hgt * prof - 0.45;
  };
  let rows = 0;
  const addRing = (P, r, dir, v, t, extraY, ky = 1) => {
    rows++;
    // parallel transport
    nx = norm(sub(nx, mul(dir, dot(nx, dir))));
    const by = cross(dir, nx);
    const y = P[1];
    for (let j = 0; j <= radial; j++) {
      const th = (j / radial) * 6.283185;
      let rr = r;
      if (isTrunk) {
        const e = Math.exp(-Math.max(0, y) / flareH);
        const e2 = Math.exp(-Math.max(0, y) / (flareH * 3.2));
        let lob;
        if (opts.rootTh) {
          lob = 0;
          for (const rt of opts.rootTh) { let dth = Math.abs(th - rt) % 6.283185; if (dth > 3.141593) dth = 6.283185 - dth; lob = Math.max(lob, Math.exp(-dth * dth / 0.2)); }
          lob = Math.sqrt(lob);
        } else lob = 0.5 + 0.5 * Math.cos(th * lobes + lobePh + 1.3 * Math.sin(th * 2 + lobePh));
        rr *= 1 + (flare - 1) * (e * (1 - butt + butt * 2.3 * lob) + 0.3 * e2 * lob);
        // slow swelling and burl-like irregularity of old boles
        // noise blended with itself one turn later, so the ring closes where th wraps from 2*pi back to 0
        const wrap = (k, ph, yy, sd) => lerp(noise2(th * k + ph, yy, sd), noise2((th - 6.283185) * k + ph, yy, sd), th / 6.283185);
        rr *= 1 + 0.035 * wrap(1.3, lobePh, y * 0.35, 7) + (opts.burl ?? 0) * Math.max(0, wrap(2.1, 0, y * 0.9, 11) - 0.35);
        // "musclewood": rounded sinews running the length of the stem
        if (opts.flute) rr *= 1 + 0.13 * opts.flute * Math.cos(th * 4 + lobePh + y * 0.9) + 0.05 * opts.flute * Math.cos(th * 7 - y * 1.7);
      }
      const c = Math.cos(th), s = Math.sin(th);
      const ox = nx[0] * c + by[0] * s, oy = nx[1] * c + by[1] * s, oz = nx[2] * c + by[2] * s;
      let pn = null;
      if (plates) {
        const fade = (1 - smoothstep(plateTop * 0.55, plateTop, y)) * smoothstep(-1.2, -0.2, y);
        if (fade > 0) {
          const amp = plates * fade * Math.min(0.17, 0.12 * r);
          rr += amp * plateDisp(th, y);
          // normal from the displacement's slope around and along the stem
          const e = 0.5 / K;
          const dS = (plateDisp(th + e, y) - plateDisp(th - e, y)) / (2 * e) * amp / Math.max(rr, 0.05);
          const dY = (plateDisp(th, y + 0.04) - plateDisp(th, y - 0.04)) / 0.08 * amp;
          const tx = -nx[0] * s + by[0] * c, ty = -nx[1] * s + by[1] * c, tz = -nx[2] * s + by[2] * c;
          pn = norm([ox - dS * tx - dY * dir[0], oy - dS * ty - dY * dir[1], oz - dS * tz - dY * dir[2]]);
        }
      }
      buf.pos.push(P[0] + ox * rr, P[1] + oy * rr * ky + (extraY || 0), P[2] + oz * rr);
      if (pn) buf.nor.push(pn[0], pn[1], pn[2]);
      else if (ky !== 1) { const l = Math.hypot(ox, oy / ky, oz) || 1; buf.nor.push(ox / l, oy / ky / l, oz / l); } else buf.nor.push(ox, oy, oz);
      buf.uv.push((j / radial) * uRep, v);
      // colour: r = ao, g = flex, b = height above base (for moss / soil staining), a = level
      const ao = isTrunk ? lerp(0.45, 1.0, smoothstep(-0.2, 0.9 + flareH, y)) : br.isRoot ? lerp(0.5, 0.92, smoothstep(-0.1, 0.6, y)) : (opts.limbAO ?? 0.8);
      buf.col.push(ao, clamp(lerp(br.flex0, br.flex1, t) / 3.0), clamp(y / 4.0), br.level / 4);
    }
  };
  if (isTrunk) {
    // buried skirt so trunks stay rooted on slopes
    const P = pts[0].p;
    addRing([P[0], P[1] - 1.6, P[2]], pts[0].r * 1.12, d0, -1.6 / bark.tile[1], 0, 0);
  }
  for (let k = 0; k < rings.length; k++) {
    const i = rings[k];
    const P = pts[i].p;
    const dir = i === 0 ? d0 : i === n - 1 ? norm(sub(pts[i].p, pts[i - 1].p)) : norm(sub(pts[i + 1].p, pts[i - 1].p));
    if (k > 0) {
      const ip = rings[k - 1], Pp = pts[ip].p, segL = len(sub(P, Pp));
      // plated trunks need rings every decimetre or two low down, where the eye is
      if (plates && Math.min(P[1], Pp[1]) < plateTop) {
        const ym = 0.5 * (P[1] + Pp[1]) - pts[0].p[1];
        const nsub = Math.ceil(segL / (ym < 4 ? 0.12 : 0.24)) - 1;
        for (let q = 1; q <= nsub; q++) {
          const f = q / (nsub + 1);
          addRing(mix3(Pp, P, f), lerp(pts[ip].r, pts[i].r, f), dir, vAcc + f * segL / bark.tile[1], lerp(ip, i, f) / (n - 1), 0, lerp(pts[ip].ky ?? 1, pts[i].ky ?? 1, f));
        }
      }
      vAcc += segL / bark.tile[1];
    }
    addRing(P, pts[i].r, dir, vAcc, i / (n - 1), 0, pts[i].ky ?? 1);
  }
  const nr = rows;
  for (let k = 0; k < nr - 1; k++) for (let j = 0; j < radial; j++) {
    const a = start + k * (radial + 1) + j, b = a + 1, c = a + radial + 1, d = c + 1;
    // counter-clockwise seen from outside: the outer surface is the front face
    buf.idx.push(a, b, c, b, d, c);
  }
}

function emitCard(buf, c, F, Nq, R, size, cell, bend, q) {
  const base = buf.n;
  const rows = bend ? 3 : 2;
  for (let j = 0; j < rows; j++) {
    const f = j / (rows - 1);
    const drop = bend ? -bend * size * f * f : 0;
    for (const sx of [-0.5, 0.5]) {
      const px = c.p[0] + F[0] * size * f + R[0] * size * sx;
      const py = c.p[1] + F[1] * size * f + R[1] * size * sx + drop;
      const pz = c.p[2] + F[2] * size * f + R[2] * size * sx;
      buf.pos.push(px, py, pz);
      buf.nor.push(Nq[0], Nq[1], Nq[2]);
      buf.tan.push(R[0], R[1], R[2]);
      buf.tw.push(f);
      buf.uv.push(sx < 0 ? cell.u0 : cell.u1, lerp(cell.v0, cell.v1, f));
      // r = ao, g = flex, b = hue seed, a = flutter phase
      buf.col.push(c.ao, clamp((c.flex ?? 0.3) / 3.0), c.seed, (c.seed * 7.13 + q * 0.37) % 1);
    }
  }
  for (let j = 0; j < rows - 1; j++) {
    const a = base + j * 2;
    buf.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
}

/** Walk the clusters and hand each spray (frame, size, atlas cell index) to `emit`; the random stream is fixed by this order. */
function eachSpray(sk, keep, sizeMul, cross2, rng, flatness, emit) {
  for (const c of sk.clusters) {
    if (keep < 1 && rng.next() > keep) continue;
    const F = c.dir;
    let N = sub(UP, mul(F, dot(UP, F)));
    if (len(N) < 0.15) N = perp(F); else N = norm(N);
    const roll = rng.f(-1, 1) * lerp(0.95, 0.22, flatness);
    N = rotAround(N, F, roll);
    const nCards = cross2 ? 2 : 1;
    for (let q = 0; q < nCards; q++) {
      const Nq = q === 0 ? N : rotAround(N, F, 1.25 + rng.f(-0.3, 0.3));
      const R = norm(cross(F, Nq));
      const size = c.size * sizeMul * (q === 0 ? 1 : 0.86);
      // variant: outer / upper sprays use the fuller cells
      const ci = q === 0 ? (rng.chance(0.5) ? 0 : 1) : (rng.chance(0.5) ? 2 : rng.i(0, 3));
      emit(c, F, Nq, R, size, ci, q);
    }
  }
}

function cards(buf, sk, atlasCells, keep, sizeMul, cross2, rng, flatness, bend) {
  eachSpray(sk, keep, sizeMul, cross2, rng, flatness, (c, F, Nq, R, size, ci, q) => emitCard(buf, c, F, Nq, R, size, atlasCells[ci], bend, q));
}

export function toGeometry(buf, withTan) {
  const g = new THREE.BufferGeometry();
  const n = buf.n;
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf.pos), 3));
  const nb = new Int8Array(n * 4);
  for (let i = 0; i < n; i++) { nb[i * 4] = buf.nor[i * 3] * 127; nb[i * 4 + 1] = buf.nor[i * 3 + 1] * 127; nb[i * 4 + 2] = buf.nor[i * 3 + 2] * 127; }
  g.setAttribute('normal', new THREE.BufferAttribute(nb, 4, true));
  if (withTan) {
    const tb = new Int8Array(n * 4);
    for (let i = 0; i < n; i++) { tb[i * 4] = buf.tan[i * 3] * 127; tb[i * 4 + 1] = buf.tan[i * 3 + 1] * 127; tb[i * 4 + 2] = buf.tan[i * 3 + 2] * 127; tb[i * 4 + 3] = (buf.tw[i] || 0) * 127; }
    g.setAttribute('tan', new THREE.BufferAttribute(tb, 4, true));
  }
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(buf.uv), 2));
  const cb = new Uint8Array(n * 4);
  for (let i = 0; i < n * 4; i++) cb[i] = clamp(buf.col[i]) * 255;
  g.setAttribute('data', new THREE.BufferAttribute(cb, 4, true));
  g.setIndex(n > 65535 ? new THREE.BufferAttribute(new Uint32Array(buf.idx), 1) : new THREE.BufferAttribute(new Uint16Array(buf.idx), 1));
  return g;
}

/**
 * Generate a full plant with three LODs.
 * def: species entry; arch: architecture to use; size {h, dbh}; bark: BarkLibrary entry; atlas: cluster atlas.
 */
function prepare(def, arch, size, seed, q) {
  const rng = new RNG(seed);
  const cl = def.cl;
  const big = size.h > 14;
  const sk = growSkeleton(arch, size.h, size.dbh, cl, rng.fork('sk'), {
    sparse: def.sparse ?? 1, gnarl: q.gnarl ?? 1, spacing: q.spacing, flex: arch.form === 'shrub' ? 1.6 : 1, leanAz: q.leanAz,
    // big old crowns ramify more: the canopy must close overhead
    bushy: q.bushy ?? (big && arch.form === 'decurrent' ? 1.35 : 1),
  });
  // per-cluster flex from its branch height / distance
  for (const c of sk.clusters) {
    const out = Math.hypot(c.p[0], c.p[2]);
    c.flex = clamp(0.12 + 0.03 * c.p[1] + 0.07 * out, 0, 3) * (arch.form === 'shrub' ? 1.3 : 1);
  }
  const topt = { flute: arch.flute ?? 0, H: size.h, flare: arch.flare ?? 1.2, flareH: arch.flareH ?? 0.05, buttress: arch.buttress ?? 0, lobes: rng.i(4, 7), lobePh: rng.f(0, 6.28), burl: big ? 0.05 : 0,
    plates: big && size.dbh > 0.5 ? (arch.plates ?? 0) : 0, plateTop: Math.min(12, 0.32 * size.h) };
  // root spurs: the flare of an old trunk runs out into surface roots that dive under the litter
  if (arch.form !== 'shrub' && size.dbh > 0.14 && sk.branches.length && sk.branches[0].isTrunk) {
    const rr = rng.fork('roots');
    const r0 = sk.trunkR;
    const nR = size.dbh > 1.0 ? rr.i(5, 7) : size.dbh > 0.4 ? rr.i(4, 6) : rr.i(3, 5);
    const a0 = rr.f(0, 6.283);
    const base = sk.branches[0].pts[0].p;
    topt.rootTh = [];
    topt.buttress = Math.max(topt.buttress, size.dbh > 0.6 ? 0.6 : 0.45);
    for (let i = 0; i < nR; i++) {
      const a = a0 + (i + rr.f(-0.3, 0.3)) / nR * 6.283;
      const th = Math.atan2(-Math.cos(a), -Math.sin(a));
      topt.rootTh.push(th < 0 ? th + 6.283185 : th);
      // a surface root: a low rounded hump running out from the foot of a buttress lobe, wandering, soon under the litter
      const L = Math.min(1.9, r0 * rr.f(1.0, 1.9) + 0.3), rad = Math.min(0.2, r0 * rr.f(0.18, 0.28));
      const bend = rr.f(-0.7, 0.7), wig = rr.f(0.1, 0.3) * (rr.chance(0.5) ? 1 : -1), ph = rr.f(0, 6.28);
      const top = Math.min(0.26, r0 * rr.f(0.2, 0.36));
      const pts = [];
      const nk = 9;
      for (let k = 0; k <= nk; k++) {
        const t = k / nk, aa = a + bend * t * t + wig * Math.sin(t * 6 + ph) * t;
        const d = r0 * 0.6 + L * t;
        const r = Math.max(0.008, rad * (1 - 0.75 * t) * (1 + 0.15 * Math.sin(t * 9 + ph)));
        const ky = lerp(1.3, 1.0, smoothstep(0, 0.5, t));
        const crest = top * Math.exp(-2.0 * t) - 0.32 * t * t - 0.03 * t;
        pts.push({ p: [base[0] + Math.cos(aa) * d, crest - r * ky * 0.85, base[2] + Math.sin(aa) * d], r, ky });
      }
      // the lobed flare of the bole reads as roots on its own; separate surface roots are off unless asked for
      if (q.rootSpurs) sk.branches.push({ pts, level: 1, flex0: 0, flex1: 0, L, isRoot: true });
    }
  }
  return { rng, cl, big, sk, topt, flatness: arch.flat ?? 0 };
}

export function generatePlant(def, arch, size, bark, atlas, seed, q = {}) {
  const { rng, big, sk, topt, flatness } = prepare(def, arch, size, seed, q);
  const cardQ = q.cards ?? 1;
  const lods = [];
  const lodSpec = big
    ? [{ rad: [44, 10, 7, 5], maxLvl: 3, step: 1, keep: 1.0 * cardQ, mul: 1.12, cross: true, bend: 0.22 },
       { rad: [20, 6, 4, 3], maxLvl: 2, step: 2, keep: 0.56, mul: 1.5, cross: false, bend: 0 },
       { rad: [7, 4, 3, 3], maxLvl: 1, step: 3, keep: 0.26, mul: 2.4, cross: false, bend: 0 }]
    : [{ rad: [10, 6, 5, 4], maxLvl: 3, step: 1, keep: 1.0, mul: 1.0, cross: true, bend: 0.18 },
       { rad: [6, 4, 3, 3], maxLvl: 2, step: 2, keep: 0.5, mul: 1.4, cross: false, bend: 0 },
       { rad: [4, 3, 3, 3], maxLvl: 0, step: 3, keep: 0.2, mul: 2.2, cross: false, bend: 0 }];
  for (let L = 0; L < 3; L++) {
    const s = lodSpec[L];
    const bb = new Buf();
    for (const br of sk.branches) {
      if (br.level > s.maxLvl) continue;
      // skip hair-thin twigs at lower detail
      if (L > 0 && br.pts[0].r < 0.012 * (L === 1 ? 1 : 3)) continue;
      if (br.isRoot && L === 2) continue;
      tube(bb, br, br.isRoot ? Math.max(5, Math.round(s.rad[1] * 0.9)) : s.rad[Math.min(3, br.level)], br.isTrunk ? Math.max(1, s.step - (L === 0 ? 0 : 1)) : s.step, bark, L === 0 ? { ...topt, plateLOD: true } : topt);
    }
    const lb = new Buf();
    cards(lb, sk, atlas.cells, s.keep, s.mul, s.cross, rng.fork('cards' + L), flatness, s.bend);
    lods.push({ bark: bb.n ? toGeometry(bb, false) : null, leaves: lb.n ? toGeometry(lb, true) : null, tris: (bb.idx.length + lb.idx.length) / 3 });
  }
  return {
    lods,
    meta: {
      h: size.h, dbh: size.dbh, trunkR: sk.trunkR, flare: arch.flare ?? 1.2,
      crown: sk.crown, nClusters: sk.clusters.length, nBranches: sk.branches.length,
      trunk: sk.branches[0] && sk.branches[0].isTrunk ? sk.branches[0].pts.map((q) => ({ p: q.p, r: q.r })) : null,
      flareMul: arch.flare ?? 1.2,
    },
  };
}

/**
 * A vine climbing a particular trunk (Virginia creeper): stems hug the bark of the host's own centreline,
 * so an instance placed with the host's transform fits it exactly.
 */
export function generateVine(def, host, bark, atlas, seed) {
  const rng = new RNG(seed);
  const cl = def.cl;
  const tp = host.trunk;
  const branches = [], clusters = [];
  const flareH = Math.min(0.85, 0.22 + 0.5 * tp[0].r);
  const at = (y) => {
    // trunk centre and surface radius at height y
    let i = 0;
    while (i < tp.length - 2 && tp[i + 1].p[1] < y) i++;
    const a = tp[i], b = tp[i + 1];
    const t = clamp((y - a.p[1]) / Math.max(1e-3, b.p[1] - a.p[1]));
    const c = mix3(a.p, b.p, t);
    const r = lerp(a.r, b.r, t) * (1 + (host.flareMul - 1) * Math.exp(-Math.max(0, y) / flareH) * 0.75) * 1.03 + 0.012;
    return { c, r };
  };
  const top = Math.min(tp[tp.length - 1].p[1] * 0.42, rng.f(3.5, 11));
  const nStem = rng.i(2, 4);
  for (let s = 0; s < nStem; s++) {
    let ang = rng.f(0, 6.283);
    const spin = rng.f(-0.22, 0.22);
    const h = top * rng.f(0.55, 1);
    const pts = [];
    const n = Math.ceil(h / 0.22);
    for (let k = 0; k <= n; k++) {
      const y = 0.05 + (k / n) * h;
      ang += spin * 0.22 + rng.n(0, 0.07);
      const q = at(y);
      const p = [q.c[0] + Math.cos(ang) * q.r, y, q.c[2] + Math.sin(ang) * q.r];
      pts.push({ p, r: lerp(0.016, 0.005, k / n) });
      if (k > 2 && rng.chance(0.62 * (0.4 + 0.6 * k / n))) {
        const out = [Math.cos(ang), 0, Math.sin(ang)];
        const tan = [-Math.sin(ang), 0, Math.cos(ang)];
        const side = rng.f(-1, 1);
        const dir = norm([out[0] * 0.8 + tan[0] * side, rng.f(-0.45, 0.25), out[2] * 0.8 + tan[2] * side]);
        clusters.push({ p, dir, size: cl.size * rng.f(0.8, 1.2), seed: rng.next(), lvl: 1, t: k / n, ao: 0.75 + 0.25 * rng.next(), flex: 0.12 });
      }
    }
    branches.push({ pts, level: 2, flex0: 0, flex1: 0, L: h });
  }
  const sk = { branches, clusters };
  const lods = [];
  for (let L = 0; L < 3; L++) {
    if (L === 2) { lods.push({ bark: null, leaves: null, tris: 0 }); continue; }
    const bb = new Buf(), lb = new Buf();
    if (L === 0) for (const br of branches) tube(bb, br, 4, 1, bark, { H: 10, limbAO: 0.8 });
    cards(lb, sk, atlas.cells, L === 0 ? 1 : 0.55, L === 0 ? 1 : 1.35, false, rng.fork('c' + L), 0.3, 0.2);
    lods.push({ bark: bb.n ? toGeometry(bb, false) : null, leaves: lb.n ? toGeometry(lb, true) : null, tris: (bb.idx.length + lb.idx.length) / 3 });
  }
  return { lods, meta: { h: top, dbh: 0.02, trunkR: 0.01, crown: { c: [0, top * 0.5, 0], rxz: tp[0].r + 0.4, ry: top / 2, yMin: 0, yMax: top }, nClusters: clusters.length, nBranches: branches.length, trunk: null } };
}

/**
 * True 3D foliage for a plant seen from very near: every leaf of the sprays within reach of a walker's eye
 * as its own curved, keeled blade on real twigs. The layouts are the very ones baked into the cluster cards,
 * and the same random stream places them, so a card and the leaves that replace it agree leaf for leaf.
 * Sprays higher up stay cards. Returns { bark, leaves, cards } geometries or null.
 */
export function generateNear(def, arch, size, bark, atlas, layouts, seed, q = {}) {
  const { rng, big, sk, topt, flatness } = prepare(def, arch, size, seed, q);
  if (big) return null;
  // how high real leaves go: as far as the budget allows, at least to head height
  const hs = sk.clusters.map((c) => c.p[1]).sort((a, b) => a - b);
  const perSpray = Math.max(1, layouts.cells.reduce((a, c) => a + c.leaves.length, 0) / 4);
  const maxN = Math.round(clamp((q.nearLeafBudget ?? 6500) / perSpray, 50, 650));
  let yMax = q.nearY ?? 4.8;
  if (hs.length > maxN && hs[maxN] < yMax) yMax = Math.max(2.3, hs[maxN]);
  if (!hs.length || hs[0] > yMax) return null;
  const bb = new Buf();
  for (const br of sk.branches) {
    if (br.level > 3) continue;
    tube(bb, br, [10, 6, 5, 4][Math.min(3, br.level)], 1, bark, topt);
  }
  const lb = new Buf(), cb = new Buf();
  const bend = 0.18;
  // hard ceiling on real leaves per model (lowest sprays first), so no species becomes a hitch to build or draw
  const leafCap = q.nearLeafCap ?? 7000;
  let leafN = 0;
  const order = sk.clusters.map((c, i) => [c.p[1], i]).sort((a, b) => a[0] - b[0]);
  const rank = new Map(); { let acc = 0; const per = layouts.cells.reduce((a, c) => a + c.leaves.length, 0) / 4 * 2; for (const [, i] of order) { rank.set(sk.clusters[i], acc); acc += per; } }
  eachSpray(sk, 1, 1, true, rng.fork('cards0'), flatness, (c, F, Nq, R, S, ci, qi) => {
    if (c.p[1] > yMax || rank.get(c) > leafCap) { emitCard(cb, c, F, Nq, R, S, atlas.cells[ci], bend, qi); return; }
    const lay = layouts.cells[ci];
    leafN += lay.leaves.length;
    const flexN = clamp((c.flex ?? 0.3) / 3.0);
    // card space (x across, y along the twig, z out of the spray) -> plant space
    const W3 = (x, y, z) => {
      const xs = (x - 0.5) * S, ys = y * S, zs = z * S;
      return [c.p[0] + R[0] * xs + F[0] * ys + Nq[0] * zs, c.p[1] + R[1] * xs + F[1] * ys + Nq[1] * zs - bend * S * y * y, c.p[2] + R[2] * xs + F[2] * ys + Nq[2] * zs];
    };
    const V3 = (x, y, z) => norm([R[0] * x + F[0] * y + Nq[0] * z, R[1] * x + F[1] * y + Nq[1] * z, R[2] * x + F[2] * y + Nq[2] * z]);
    for (const tw of lay.twigs) {
      const n = tw.pts.length;
      const ids = [];
      for (let i = 0; i < n; i += (n > 4 ? 2 : 1)) ids.push(i);
      if (ids[ids.length - 1] !== n - 1) ids.push(n - 1);
      const br = { level: 3, flex0: c.flex ?? 0.3, flex1: c.flex ?? 0.3, pts: ids.map((i) => ({ p: W3(tw.pts[i][0], tw.pts[i][1], -0.012), r: Math.max(0.0011, lerp(tw.w0, tw.w1, i / (n - 1)) * S * 0.5) })) };
      tube(bb, br, 3, 1, bark, topt);
    }
    for (const L of lay.leaves) {
      const sy = Math.sin(L.yaw), cy = Math.cos(L.yaw), st = Math.sin(L.tilt), ct = Math.cos(L.tilt), sr = Math.sin(L.roll), crl = Math.cos(L.roll);
      // blade frame in card space: across, along, normal
      const ax = [crl * cy + sr * st * sy, -crl * sy + sr * st * cy, -sr * ct];
      const al = [ct * sy, ct * cy, st];
      const an = [sr * cy - crl * st * sy, -sr * sy - crl * st * cy, crl * ct];
      const curl = L.curl || 0, keel = L.keel || 0;
      const base = lb.n;
      const seedv = (c.seed * 13.7 + L.x * 3.1 + L.y * 1.7) % 1;
      const ao = clamp(c.ao * (0.86 + 0.14 * clamp(L.z * 12 + 0.5)));
      const side = V3(ax[0], ax[1], ax[2]);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
        const u = i / 2 - 0.5, v = j / 2;
        const lx = u * L.W, ly = v * L.H, lz = -curl * L.H * v * v + keel * Math.abs(u) * L.W;
        const p = W3(L.x + ax[0] * lx + al[0] * ly + an[0] * lz, L.y + ax[1] * lx + al[1] * ly + an[1] * lz, L.z + ax[2] * lx + al[2] * ly + an[2] * lz);
        const nx = -keel * Math.sign(u), ny = 2 * curl * v;
        const nn = V3(an[0] + ax[0] * nx + al[0] * ny, an[1] + ax[1] * nx + al[1] * ny, an[2] + ax[2] * nx + al[2] * ny);
        lb.pos.push(p[0], p[1], p[2]);
        lb.nor.push(nn[0], nn[1], nn[2]);
        lb.tan.push(c.seed, 0, 0);   // the spray's seed: lets the leaves share the colour of the card they replace
        lb.tw.push(v);
        lb.uv.push(lerp(L.cell.u0, L.cell.u1, i / 2), lerp(L.cell.v0, L.cell.v1, v));
        lb.col.push(ao, flexN, seedv, (c.seed * 7.13 + seedv * 0.6) % 1);
      }
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const a = base + j * 3 + i, b = a + 1, d = a + 3, e = d + 1;
        lb.idx.push(a, b, d, b, e, d);
      }
    }
  });
  if (!lb.n) return null;
  return { bark: toGeometry(bb, false), leaves: toGeometry(lb, true), cards: cb.n ? toGeometry(cb, true) : null, tris: (bb.idx.length + lb.idx.length + cb.idx.length) / 3 };
}
