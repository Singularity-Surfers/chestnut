// Terrain: a sheltered Appalachian cove. A boulder-strewn stream winds down the valley;
// a broad bench (the "cove flat") on the west bank carries the largest chestnuts, the east
// bank is steeper and rockier, and the slopes round over into drier ridge spurs.
import * as THREE from 'three';
import { RNG, noise2, fbm2, ridged2, rand2, clamp, lerp, smoothstep } from '../core/rng.js';
import { G, WORLD, dataTexture } from '../core/engine.js';

export const HALF = WORLD / 2;
const HRES = 0.5;                      // height grid spacing (m)
const HN = Math.round(WORLD / HRES) + 1; // 801
const CRES = 1.0;                      // coarse field spacing
const CN = Math.round(WORLD / CRES) + 1; // 401

export class Field {
  constructor(n, size) {
    this.n = n; this.size = size; this.d = new Float32Array(n * n);
    this.inv = (n - 1) / size;
  }
  set(i, j, v) { this.d[j * this.n + i] = v; }
  get(i, j) {
    i = i < 0 ? 0 : i >= this.n ? this.n - 1 : i;
    j = j < 0 ? 0 : j >= this.n ? this.n - 1 : j;
    return this.d[j * this.n + i];
  }
  at(x, z) {
    const fx = (x + this.size / 2) * this.inv, fz = (z + this.size / 2) * this.inv;
    const i = Math.floor(fx), j = Math.floor(fz);
    const u = fx - i, v = fz - j;
    const a = this.get(i, j), b = this.get(i + 1, j), c = this.get(i, j + 1), d = this.get(i + 1, j + 1);
    return a + (b - a) * u + (c + (d - c) * u - (a + (b - a) * u)) * v;
  }
}

function buildStream(rng, def) {
  // def: { p0:[x,z], p1:[x,z], meander, n, top, bottom, width:[a,b], seed }
  const pts = [];
  const n = def.n;
  const dx = def.p1[0] - def.p0[0], dz = def.p1[1] - def.p0[1];
  const len = Math.hypot(dx, dz);
  const nx = -dz / len, nz = dx / len;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = def.meander * (
      Math.sin(6.283 * (1.35 * t + def.ph)) * 0.6 +
      Math.sin(6.283 * (3.1 * t + def.ph * 2.3)) * 0.28 +
      noise2(t * 9, def.seed * 3.1, def.seed) * 0.45
    ) * (def.pin ? smoothstep(0, 0.12, t) : 1);
    pts.push({ x: def.p0[0] + dx * t + nx * off, z: def.p0[1] + dz * t + nz * off });
  }
  // arc length
  let s = 0;
  pts[0].s = 0;
  for (let i = 1; i <= n; i++) {
    s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    pts[i].s = s;
  }
  const total = s;
  // pool / riffle sequence -> water surface elevation
  const units = [];
  let acc = 0;
  while (acc < total) {
    const pool = rng.f(def.pool[0], def.pool[1]);
    const riffle = rng.f(def.riffle[0], def.riffle[1]);
    const drop = rng.f(def.drop[0], def.drop[1]);
    units.push({ s0: acc, pool, riffle, drop });
    acc += pool + riffle;
  }
  const rawDrop = units.reduce((a, u) => a + u.drop + u.pool * 0.004, 0);
  const k = (def.top - def.bottom) / rawDrop;
  const surf = (sv) => {
    let h = def.top;
    for (const u of units) {
      if (sv >= u.s0 + u.pool + u.riffle) { h -= (u.drop + u.pool * 0.004) * k; continue; }
      const l = sv - u.s0;
      if (l < u.pool) h -= l * 0.004 * k;
      else h -= (u.pool * 0.004 + u.drop * smoothstep(0, 1, (l - u.pool) / u.riffle)) * k;
      break;
    }
    return h;
  };
  const poolness = (sv) => {
    for (const u of units) {
      if (sv < u.s0 + u.pool + u.riffle) {
        const l = sv - u.s0;
        if (l < u.pool) return Math.sin(Math.PI * clamp(l / u.pool)) ** 0.7;
        return 0;
      }
    }
    return 0;
  };
  for (const p of pts) {
    p.w = surf(p.s);
    p.pool = poolness(p.s);
    const wn = 0.5 + 0.5 * noise2(p.s * 0.06, 5.5, def.seed + 3);
    p.half = lerp(def.width[0], def.width[1], wn) * (0.8 + 0.55 * p.pool) * 0.5;
    p.depth = lerp(def.depth[0], def.depth[1], p.pool);
  }
  return { pts, total, def };
}

// nearest point on a stream polyline plus smoothly blended along-stream quantities.
// Using the nearest point's water level directly makes cliffs along the medial axis of each
// meander, so level / side / chainage are inverse-distance blends over the whole polyline.
function nearestOnStream(st, x, z, out) {
  const pts = st.pts;
  let best = 1e18, bi = 0, bt = 0;
  let sw = 0, sW = 0, sSide = 0, sS = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const ex = b.x - a.x, ez = b.z - a.z;
    let t = ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = a.x + ex * t - x, pz = a.z + ez * t - z;
    const d = px * px + pz * pz;
    if (d < best) { best = d; bi = i; bt = t; }
    const wgt = 1 / (d * d * d + 1e-3);
    sw += wgt;
    sW += wgt * (a.w + (b.w - a.w) * t);
    sS += wgt * (a.s + (b.s - a.s) * t);
    sSide += wgt * (ex * (z - a.z) - ez * (x - a.x) > 0 ? 1 : -1);
  }
  const a = pts[bi], b = pts[bi + 1];
  out.d = Math.sqrt(best);
  out.wNear = lerp(a.w, b.w, bt);
  out.w = sW / sw;
  out.half = lerp(a.half, b.half, bt);
  out.depth = lerp(a.depth, b.depth, bt);
  out.pool = lerp(a.pool, b.pool, bt);
  out.s = sS / sw;
  out.side = sSide / sw; // > 0: west bank of a south-flowing stream
  return out;
}

function makeProfile(segs) {
  // segs: [[distance, slope], ...] piecewise slope with smooth transitions; returns height table per metre
  const N = 700;
  const tab = new Float32Array(N);
  let h = 0;
  const slopeAt = (d) => {
    for (let i = 0; i < segs.length - 1; i++) {
      if (d < segs[i + 1][0]) {
        const t = smoothstep(segs[i][0], segs[i + 1][0], d);
        return lerp(segs[i][1], segs[i + 1][1], t);
      }
    }
    return segs[segs.length - 1][1];
  };
  for (let i = 0; i < N; i++) { tab[i] = h; h += slopeAt(i + 0.5); }
  return (d) => {
    d = clamp(d, 0, N - 1.001);
    const i = Math.floor(d);
    return lerp(tab[i], tab[i + 1], d - i);
  };
}

export function buildTerrain(seed) {
  const rng = new RNG(seed).fork('terrain');
  const S = rng.i(1, 9999);

  const main = buildStream(rng.fork('main'), {
    p0: [-70, -330], p1: [55, 330], meander: 30, n: 260, ph: rng.f(), seed: S,
    top: 48, bottom: 2, width: [2.6, 4.6], depth: [0.16, 0.75],
    pool: [9, 22], riffle: [2.5, 6], drop: [0.35, 1.1],
  });
  // tributary joins the main stem from the east
  const jIdx = Math.round(main.pts.length * 0.56);
  const J = main.pts[jIdx];
  const trib = buildStream(rng.fork('trib'), {
    p0: [J.x, J.z], p1: [J.x + 300, J.z - 150], meander: 13, n: 150, ph: rng.f(), seed: S + 77, pin: true,
    top: J.w, bottom: J.w - 46, width: [0.9, 1.7], depth: [0.08, 0.35],
    pool: [4, 9], riffle: [1.5, 4], drop: [0.5, 1.6],
  });
  // tributary flows *toward* the junction: elevation rises with s
  for (const p of trib.pts) p.w = J.w + (J.w - p.w);
  const streams = [main, trib];

  // valley cross profiles: [distance from bank, slope]
  const profW = makeProfile([[0, 0.30], [3, 0.05], [14, 0.04], [22, 0.30], [34, 0.07], [85, 0.09], [110, 0.42], [185, 0.36], [240, 0.10], [300, 0.02], [700, 0.0]]);
  const profE = makeProfile([[0, 0.45], [2.5, 0.07], [9, 0.10], [16, 0.50], [70, 0.46], [125, 0.30], [170, 0.10], [230, 0.02], [700, 0.0]]);
  const profT = makeProfile([[0, 0.6], [2, 0.16], [6, 0.48], [50, 0.42], [90, 0.2], [140, 0.05], [700, 0.0]]);

  // coarse fields of stream relation
  const fD = new Field(CN, WORLD), fW = new Field(CN, WORLD), fHalf = new Field(CN, WORLD), fDepth = new Field(CN, WORLD);
  const fBase = new Field(CN, WORLD), fPool = new Field(CN, WORLD), fTribD = new Field(CN, WORLD);
  const o1 = {}, o2 = {};
  const softmin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); };

  // macro valley height (without channel) at arbitrary point — also used for the far backdrop
  function macro(x, z) {
    nearestOnStream(main, x, z, o1);
    nearestOnStream(trib, x, z, o2);
    const warp = 1 + 0.28 * fbm2(x * 0.006, z * 0.006, 3, S + 5);
    const dm = Math.max(0, o1.d - o1.half) * warp;
    const pw = profW(dm) * (0.85 + 0.3 * (0.5 + 0.5 * noise2(o1.s * 0.008, 1.5, S)));
    const pe = profE(dm) * (0.9 + 0.3 * (0.5 + 0.5 * noise2(o1.s * 0.009, 7.5, S + 1)));
    const sideT = smoothstep(-0.9, 0.9, o1.side * clamp(o1.d / 6));
    const hMain = o1.w + lerp(pe, pw, sideT); // side > 0 is the west bank
    const dt = Math.max(0, o2.d - o2.half) * (1 + 0.2 * fbm2(x * 0.01, z * 0.01, 2, S + 9));
    const hTrib = o2.w + profT(dt);
    let h = softmin(hMain, hTrib, 5.0);
    const amp = smoothstep(4, 70, Math.min(dm, dt));
    h += amp * (9 * fbm2(x * 0.0065, z * 0.0065, 4, S + 20) + 2.4 * fbm2(x * 0.03, z * 0.03, 3, S + 21));
    return h;
  }

  for (let j = 0; j < CN; j++) {
    const z = -HALF + j * CRES;
    for (let i = 0; i < CN; i++) {
      const x = -HALF + i * CRES;
      const hm = macro(x, z);
      // which stream dominates the local channel
      const useTrib = o2.d - o2.half < o1.d - o1.half;
      const o = useTrib ? o2 : o1;
      fBase.set(i, j, hm);
      fD.set(i, j, o.d);
      fW.set(i, j, o.w);
      fHalf.set(i, j, o.half);
      fDepth.set(i, j, o.depth);
      fPool.set(i, j, o.pool);
      fTribD.set(i, j, o2.d);
    }
  }

  // full-resolution height
  const H = new Field(HN, WORLD);
  let hMax = 0, hMin = 1e9;
  for (let j = 0; j < HN; j++) {
    const z = -HALF + j * HRES;
    for (let i = 0; i < HN; i++) {
      const x = -HALF + i * HRES;
      let h = fBase.at(x, z);
      const d = fD.at(x, z), half = fHalf.at(x, z), w = fW.at(x, z), depth = fDepth.at(x, z);
      // irregular banks
      const bn = half * (1 + 0.35 * noise2(x * 0.45, z * 0.45, S + 30)) + 0.5 * noise2(x * 1.3, z * 1.3, S + 31);
      if (d < bn + 3) {
        const q = clamp(d / Math.max(bn, 0.3));
        const bed = w - depth * (1 - q * q) - 0.06 + 0.07 * noise2(x * 1.7, z * 1.7, S + 32);
        const t = smoothstep(bn - 0.25, bn + 1.6, d);
        h = lerp(bed, h, t);
      }
      const away = smoothstep(1, 9, d - half);
      // forest-floor relief: gentle swells, pit-and-mound from ancient windthrows, fine roughness
      h += away * 0.55 * fbm2(x * 0.11, z * 0.11, 3, S + 40);
      const cx = Math.floor(x / 7), cz = Math.floor(z / 7);
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
        const r = rand2(cx + a, cz + b, S + 50);
        if (r > 0.3) continue;
        const mx = (cx + a + rand2(cx + a, cz + b, S + 51)) * 7, mz = (cz + b + rand2(cx + a, cz + b, S + 52)) * 7;
        const rr = 1.1 + 1.6 * rand2(cx + a, cz + b, S + 53);
        const ang = 6.283 * rand2(cx + a, cz + b, S + 54);
        const e1 = Math.exp(-((x - mx) ** 2 + (z - mz) ** 2) / (rr * rr));
        const px = mx + Math.cos(ang) * rr * 1.5, pz = mz + Math.sin(ang) * rr * 1.5;
        const e2 = Math.exp(-((x - px) ** 2 + (z - pz) ** 2) / (rr * rr * 0.8));
        h += away * (0.55 * e1 - 0.38 * e2) * (0.5 + r * 2.5);
      }
      h += (0.25 + 0.75 * away) * (0.07 * noise2(x * 0.9, z * 0.9, S + 60) + 0.03 * noise2(x * 2.6, z * 2.6, S + 61));
      // no hollows below stream level beside the channel: the water ribbon must always meet a bank
      if (d > bn + 0.4 && d < bn + 14) h = Math.max(h, w + 0.06 + 0.16 * smoothstep(0.4, 3, d - bn));
      H.set(i, j, h);
      if (h > hMax) hMax = h;
      if (h < hMin) hMin = h;
    }
  }

  const heightAt = (x, z) => H.at(clamp(x, -HALF, HALF), clamp(z, -HALF, HALF));
  const slopeAt = (x, z, e = 0.6) => {
    const sx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
    const sz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
    return [sx, sz];
  };

  // ---------- trail ----------
  // a faint footpath that follows the stream on the cove flat, fords it and climbs the east slope
  const trailPts = [];
  {
    const n = main.pts.length;
    for (let i = Math.round(n * 0.2); i < Math.round(n * 0.86); i += 4) {
      const p = main.pts[i], q = main.pts[Math.min(n - 1, i + 2)];
      const tx = q.x - p.x, tz = q.z - p.z, tl = Math.hypot(tx, tz) || 1;
      const t = (i / n - 0.2) / 0.66;
      // west of the stream, drifting toward and away from the bank
      const off = 9 + 8 * (0.5 + 0.5 * Math.sin(t * 11)) + 5 * noise2(t * 6, 2.2, S + 70);
      trailPts.push({ x: p.x + (-tz / tl) * off, z: p.z + (tx / tl) * off });
    }
  }
  const trailDist = (x, z) => {
    let best = 1e9;
    for (let i = 0; i < trailPts.length - 1; i++) {
      const a = trailPts[i], b = trailPts[i + 1];
      const ex = b.x - a.x, ez = b.z - a.z;
      let t = ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez);
      t = clamp(t);
      const d = Math.hypot(a.x + ex * t - x, a.z + ez * t - z);
      if (d < best) best = d;
    }
    return best;
  };

  // ---------- site maps (1 m) ----------
  const SN = CN - 1; // 400
  const site = new Uint8Array(SN * SN * 4);
  const fMoist = new Field(SN, WORLD), fStreamD = new Field(SN, WORLD), fTrail = new Field(SN, WORLD), fRock = new Field(SN, WORLD);
  const fSlope = new Field(SN, WORLD), fNorth = new Field(SN, WORLD), fRel = new Field(SN, WORLD);
  for (let j = 0; j < SN; j++) {
    const z = -HALF + (j + 0.5) * (WORLD / SN);
    for (let i = 0; i < SN; i++) {
      const x = -HALF + (i + 0.5) * (WORLD / SN);
      const d = fD.at(x, z), half = fHalf.at(x, z), w = fW.at(x, z);
      const h = heightAt(x, z);
      const rel = h - w; // height above the nearest stream surface
      const [sx, sz] = slopeAt(x, z, 3);
      const slope = Math.hypot(sx, sz);
      // curvature (concave = moist hollows)
      const e = 8;
      const curv = (heightAt(x + e, z) + heightAt(x - e, z) + heightAt(x, z + e) + heightAt(x, z - e) - 4 * heightAt(x, z)) / (e * e);
      // aspect: slopes facing north/east stay moister (north = -z, downslope direction = -grad)
      const northness = slope > 0.01 ? (sz / slope) * clamp(slope * 3) : 0; // downslope toward -z => grad.z > 0
      let m = 0.92 * Math.exp(-rel / 5.5) + 0.42 * Math.exp(-rel / 26);
      m += clamp(curv * 28, -0.3, 0.3) + 0.12 * northness + 0.12 * fbm2(x * 0.02, z * 0.02, 3, S + 80);
      m = clamp(m);
      const sp = Math.max(0, d - half);
      const streamProx = clamp(1 - sp / 6);
      const tr = clamp(1 - (trailDist(x, z) - 0.25) / 0.7);
      // rock: steep east-bank ledges, stream margins, scattered boulder fields
      let rock = smoothstep(0.52, 0.8, slope) * 0.8 + 0.5 * streamProx * (0.5 + 0.5 * noise2(x * 0.2, z * 0.2, S + 81));
      rock += smoothstep(0.55, 0.8, 0.5 + 0.5 * fbm2(x * 0.018, z * 0.018, 3, S + 82)) * 0.7;
      rock = clamp(rock);
      const k = (j * SN + i) * 4;
      site[k] = Math.round(m * 255);
      site[k + 1] = Math.round(streamProx * 255);
      site[k + 2] = Math.round(tr * 255);
      site[k + 3] = Math.round(rock * 255);
      fMoist.set(i, j, m); fStreamD.set(i, j, sp); fTrail.set(i, j, tr); fRock.set(i, j, rock);
      fSlope.set(i, j, slope); fNorth.set(i, j, northness); fRel.set(i, j, rel);
    }
  }
  // Field.at assumes node-centred grids spanning the world; cell-centred is within half a metre — fine for ecology.

  // ---------- textures ----------
  const hTex = dataTexture(H.d, HN, HN, { format: THREE.RedFormat, type: THREE.FloatType });
  const siteTex = dataTexture(site, SN, SN, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType });
  G.uniforms.uHeightMap.value = hTex;
  G.uniforms.uSiteMap.value = siteTex;
  G.uniforms.uWorld.value.set(WORLD, 1 / WORLD, hMax);

  // ---------- geometry (chunked) ----------
  const group = new THREE.Group();
  group.name = 'terrain';
  const CH = 100; // quads per chunk side
  const chunks = [];
  const nrm = (i, j, out) => {
    const sx = (H.get(i + 1, j) - H.get(i - 1, j)) / (2 * HRES);
    const sz = (H.get(i, j + 1) - H.get(i, j - 1)) / (2 * HRES);
    const l = 1 / Math.hypot(sx, 1, sz);
    out[0] = -sx * l; out[1] = l; out[2] = -sz * l;
  };
  const tmp = [0, 0, 0];
  const finalize = () => {
  for (let cj = 0; cj < (HN - 1) / CH; cj++) {
    for (let ci = 0; ci < (HN - 1) / CH; ci++) {
      const n = CH + 1;
      const pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3);
      let yMin = 1e9, yMax = -1e9;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const gi = ci * CH + i, gj = cj * CH + j;
        const k = (j * n + i) * 3;
        const y = H.get(gi, gj);
        pos[k] = -HALF + gi * HRES; pos[k + 1] = y; pos[k + 2] = -HALF + gj * HRES;
        nrm(gi, gj, tmp);
        nor[k] = tmp[0]; nor[k + 1] = tmp[1]; nor[k + 2] = tmp[2];
        if (y < yMin) yMin = y; if (y > yMax) yMax = y;
      }
      const idx = new Uint16Array(CH * CH * 6);
      let q = 0;
      for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) {
        const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
      chunks.push(geo);
    }
  }

    hTex.needsUpdate = true;
  };
  // Old trees build their own ground: soil gathers on the uphill side and the root plate stands proud.
  // Blend the surface toward a gentle dome around the stem so trunks never sit in a pit behind a mound.
  const shapeAround = (x, z, R) => {
    const c = heightAt(x, z);
    const rad = Math.max(1.2, R * 3.0);
    const i0 = Math.max(0, Math.floor((x - rad + HALF) / HRES)), i1 = Math.min(HN - 1, Math.ceil((x + rad + HALF) / HRES));
    const j0 = Math.max(0, Math.floor((z - rad + HALF) / HRES)), j1 = Math.min(HN - 1, Math.ceil((z + rad + HALF) / HRES));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = -HALF + i * HRES, pz = -HALF + j * HRES;
      const r = Math.hypot(px - x, pz - z);
      if (r >= rad) continue;
      const w = smoothstep(rad, R * 0.8, r) * 0.8;
      const h = H.get(i, j);
      const target = c + 0.14 * Math.min(R, 1.2) * (1 - r / rad) + 0.25 * (h - c);
      H.set(i, j, lerp(h, target, w));
    }
  };
  return {
    seed: S, H, heightAt, slopeAt, streams, main, trib, junction: J, trailPts, trailDist, macro,
    hMin, hMax, group, chunks, finalize, shapeAround,
    fields: { moisture: fMoist, streamDist: fStreamD, trail: fTrail, rock: fRock, slope: fSlope, north: fNorth, rel: fRel, water: fW, half: fHalf, d: fD, pool: fPool, depth: fDepth },
    textures: { height: hTex, site: siteTex },
  };
}
