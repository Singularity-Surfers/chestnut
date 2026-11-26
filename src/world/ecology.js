// Stand structure: where every woody plant grows, by species niche, with an old-growth size
// distribution (a few giants, many poles and saplings), tree-fall gaps and shrub colonies.
import * as THREE from 'three';
import { RNG, clamp, lerp, smoothstep, fbm2, hex2rgb } from '../core/rng.js';
import { G, WORLD, dataTexture } from '../core/engine.js';
import { SPECIES, CANOPY, UNDER, SHRUBS, CREEPER, juvenileArch } from '../flora/species.js';
import { LEAVES } from '../flora/leaves.js';
import { makeFarHeight, OUTER } from './backdrop.js';

const HALF = WORLD / 2;

function niche(sp, m, north, slope, rel, sd = 30) {
  const n = sp.niche;
  const [a, o, b] = n.m;
  let s = m < o ? smoothstep(a - 0.06, o, m) : smoothstep(b + 0.06, o, m);
  s = 0.03 + 0.97 * s;
  if (n.north) s *= 1 + n.north * north * 1.5;
  if (n.pos === 'ridge') s *= 0.5 + smoothstep(8, 40, rel);
  if (n.pos === 'cove') s *= 0.45 + smoothstep(38, 6, rel);
  // streamside species: abundant within `stream` metres of water, scarce (factor `away`) beyond
  if (n.stream) s *= (n.away ?? 0) + (1 - (n.away ?? 0)) * Math.exp(-Math.max(0, sd - 2) / n.stream) * 1.6;
  return Math.max(0, s);
}

class Grid {
  constructor(cell) { this.cell = cell; this.m = new Map(); }
  key(x, z) { return Math.floor(x / this.cell) * 4096 + Math.floor(z / this.cell); }
  add(x, z, r, data) {
    const k = this.key(x, z);
    let l = this.m.get(k);
    if (!l) this.m.set(k, l = []);
    l.push([x, z, r, data]);
  }
  // true if any stored disc violates spacing: dist < k*(r + r_i)
  blocked(x, z, r, k = 1) {
    const c = this.cell;
    const reach = Math.ceil((r * k + 12) / c);
    const cx = Math.floor(x / c), cz = Math.floor(z / c);
    for (let j = -reach; j <= reach; j++) for (let i = -reach; i <= reach; i++) {
      const l = this.m.get((cx + i) * 4096 + (cz + j));
      if (!l) continue;
      for (const e of l) {
        const d = Math.hypot(e[0] - x, e[1] - z);
        if (d < k * (r + e[2])) return true;
      }
    }
    return false;
  }
  near(x, z, rad, out = []) {
    const c = this.cell;
    const reach = Math.ceil(rad / c);
    const cx = Math.floor(x / c), cz = Math.floor(z / c);
    for (let j = -reach; j <= reach; j++) for (let i = -reach; i <= reach; i++) {
      const l = this.m.get((cx + i) * 4096 + (cz + j));
      if (!l) continue;
      for (const e of l) if (Math.hypot(e[0] - x, e[1] - z) < rad) out.push(e);
    }
    return out;
  }
}

export async function populate(terrain, veg, seed, status) {
  const rng = new RNG(seed).fork('ecology');
  const F = terrain.fields;
  const site = (x, z) => ({
    m: F.moisture.at(x, z), sd: F.streamDist.at(x, z), trail: F.trail.at(x, z), rock: F.rock.at(x, z),
    slope: F.slope.at(x, z), north: F.north.at(x, z), rel: F.rel.at(x, z),
  });
  const trees = [];      // { x, z, y, sp, cls, h, dbh, crownR, scale }

  // ------------------------------------------------------------ variants
  const variants = {};   // sp -> { giant:[keys], mature:[], pole:[], sap:[] }
  const mk = (spKey, cls, i, arch, h, dbh, opts) => {
    const key = `${spKey}:${cls}:${i}`;
    const v = veg.addVariant(key, spKey, SPECIES[spKey], arch, { h, dbh }, rng.fork(key).i(1, 1e9), opts);
    (variants[spKey] ||= {});
    (variants[spKey][cls] ||= []).push({ key, h, dbh, crownR: v.plant.meta.crown.rxz, v });
  };
  let done = 0;
  const allSp = [...CANOPY, ...UNDER, ...SHRUBS];
  for (const spKey of CANOPY) {
    const sp = SPECIES[spKey];
    const hero = spKey === 'chestnut';
    const r = rng.fork('var:' + spKey);
    if (sp.giant) for (let i = 0; i < (hero ? 4 : 1); i++)
      mk(spKey, 'giant', i, sp.arch, r.f(sp.giant.h[0], sp.giant.h[1]), r.f(sp.giant.dbh[0], sp.giant.dbh[1]), { gnarl: 1.3 });
    for (let i = 0; i < (hero ? 4 : sp.share >= 0.04 ? 2 : 1); i++)
      mk(spKey, 'mature', i, sp.arch, r.f(sp.h[0], sp.h[1]), r.f(sp.dbh[0], sp.dbh[1]));
    for (let i = 0; i < (hero ? 2 : 1); i++) {
      const h = sp.h[0] * r.f(0.45, 0.62);
      mk(spKey, 'pole', i, juvenileArch(sp, 1), h, h / r.f(72, 95));
    }
    for (let i = 0; i < (hero ? 2 : 1); i++) {
      const h = r.f(2.0, 4.6);
      mk(spKey, 'sap', i, juvenileArch(sp, 0), h, h / r.f(95, 120), { spacing: 0.6 });
    }
    status?.(`Growing ${sp.name}…`, ++done / allSp.length);
    await new Promise((res) => setTimeout(res, 0));
  }
  // a veteran: the short-boled, forked giant of Richards' painting
  {
    const c = SPECIES.chestnut;
    const vet = JSON.parse(JSON.stringify(c.arch));
    vet.bole = [0.15, 0.2]; vet.l1 = { n: [3, 4], ang: [12, 34], len: [0.5, 0.64], rad: 0.74, up: 0.34 }; vet.lean = 0.05; vet.flare = 1.7; vet.buttress = 0.35;
    mk('chestnut', 'veteran', 0, vet, 31, 2.7, { gnarl: 1.6 }); // ~3 m, as the giants in old photographs
  }
  for (const spKey of [...UNDER, ...SHRUBS]) {
    const sp = SPECIES[spKey];
    const r = rng.fork('var:' + spKey);
    const nv = 3;
    for (let i = 0; i < nv; i++) {
      const h = lerp(sp.h[0], sp.h[1], (i + r.f(0.2, 0.8)) / nv);
      const dbh = lerp(sp.dbh[0], sp.dbh[1], (i + 0.5) / nv);
      mk(spKey, 'mature', i, sp.arch, h, dbh, { spacing: sp.layer === 'shrub' ? 0.52 : 0.5, gnarl: sp.layer === 'shrub' ? 1.4 : 1.2 });
    }
    status?.(`Growing ${sp.name}…`, ++done / allSp.length);
    await new Promise((res) => setTimeout(res, 0));
  }

  // ------------------------------------------------------------ gaps (old tree-falls)
  const gaps = [];
  for (let i = 0; i < 9; i++) {
    for (let t = 0; t < 40; t++) {
      const x = rng.f(-HALF + 40, HALF - 40), z = rng.f(-HALF + 40, HALF - 40);
      const s = site(x, z);
      if (s.sd < 14 || s.slope > 0.6) continue;
      if (gaps.some((g) => Math.hypot(g.x - x, g.z - z) < 55)) continue;
      gaps.push({ x, z, r: rng.f(8, 15), ang: rng.f(0, 6.28) });
      break;
    }
  }
  const gapAt = (x, z) => {
    let g = 0;
    for (const q of gaps) g = Math.max(g, 1 - smoothstep(q.r * 0.7, q.r * 1.15, Math.hypot(q.x - x, q.z - z)));
    return g;
  };

  // ------------------------------------------------------------ canopy trees
  const big = new Grid(10);
  const small = new Grid(4);
  const achieved = {}; let achievedSum = 1e-6;
  for (const k of CANOPY) achieved[k] = 0;
  const shareSum = CANOPY.reduce((a, k) => a + SPECIES[k].share, 0);
  const pickSpecies = (s, r, filter) => {
    const w = CANOPY.map((k) => {
      const sp = SPECIES[k];
      if (filter && !filter(sp)) return 0;
      const target = sp.share / shareSum;
      const have = achieved[k] / achievedSum;
      const bal = clamp(Math.pow((target + 0.004) / (have + 0.004), 1.6), 0.15, 6);
      return sp.share * niche(sp, s.m, s.north, s.slope, s.rel, s.sd) * bal;
    });
    return CANOPY[r.wpick(w)];
  };
  const vines = new Map();
  const addTree = (spKey, cls, x, z, r) => {
    const list = variants[spKey][cls] || variants[spKey].mature;
    const vr = r.pick(list);
    const scale = r.f(0.86, 1.14);
    if (SPECIES[spKey].layer === 'canopy' && cls !== 'sap' && vr.dbh * scale > 0.3) terrain.shapeAround(x, z, vr.dbh * scale * 0.5 * (SPECIES[spKey].arch.flare ?? 1.3));
    const y = terrain.heightAt(x, z);
    const t = { x, z, y, sp: spKey, cls, h: vr.h * scale, dbh: vr.dbh * scale, crownR: vr.crownR * scale, scale, key: vr.key, layer: SPECIES[spKey].layer };
    const yaw = r.f(0, 6.283);
    veg.place(vr.key, x, y - 0.05, z, scale, yaw, r.next());
    trees.push(t);
    // Virginia creeper on some of the larger boles, scarlet in October
    if (SPECIES[spKey].layer === 'canopy' && spKey !== 'hemlock' && spKey !== 'beech' && (cls === 'mature' || cls === 'giant' || cls === 'veteran') && r.chance(0.16)) {
      const vk = vr.key + ':vine';
      if (!vines.has(vk)) vines.set(vk, veg.addVine(vk, 'creeper', CREEPER, vr.key, r.i(1, 1e9)));
      if (vines.get(vk)) veg.place(vk, x, y - 0.05, z, scale, yaw, r.next());
    }
    return t;
  };
  const okSite = (x, z, s, minStream) => Math.abs(x) < HALF - 3 && Math.abs(z) < HALF - 3 && s.sd > minStream && s.slope < 1.0;

  // hero grove: giant chestnuts beside the trail on the cove flat
  const tp = terrain.trailPts;
  const hero = tp[Math.floor(tp.length * 0.5)];
  const rh = rng.fork('hero');
  let placed = 0;
  for (let t = 0; t < 400 && placed < 7; t++) {
    const a = rh.f(0, 6.283), d = rh.f(5, 30);
    const x = hero.x + Math.cos(a) * d, z = hero.z + Math.sin(a) * d;
    const s = site(x, z);
    if (!okSite(x, z, s, 4) || s.trail > 0.05 || big.blocked(x, z, 4.6, 1)) continue;
    const tr = addTree('chestnut', 'giant', x, z, rh);
    big.add(x, z, 4.6, tr);
    achieved.chestnut += tr.crownR * tr.crownR; achievedSum += tr.crownR * tr.crownR;
    placed++;
  }
  // a composition after W. T. Richards' "October" (1863): a pool in the foreground, a great chestnut on the
  // right with a dogwood leaning before it, a pale boulder and a witch hazel beyond, the path receding left
  let richards = null;
  {
    const pts = terrain.main.pts;
    let best = null, bd = 1e9;
    for (let i = 4; i < pts.length - 4; i++) {
      const p = pts[i];
      if (p.pool < 0.75 || Math.abs(p.x) > HALF - 60 || Math.abs(p.z) > HALF - 60) continue;
      const d = Math.hypot(p.x - hero.x, p.z - hero.z);
      if (d < bd) { bd = d; best = i; }
    }
    if (best !== null) {
      const p = pts[best], a = pts[best - 3], b = pts[best + 3];
      // look upstream; the stream flows from pts[0] onward
      let fx = a.x - b.x, fz = a.z - b.z; const fl = Math.hypot(fx, fz); fx /= fl; fz /= fl;
      const rx = -fz, rz = fx;                        // right-hand side when facing upstream
      // which bank carries the trail? put the chestnut on the other one
      const side = terrain.trailDist(p.x + rx * 8, p.z + rz * 8) > terrain.trailDist(p.x - rx * 8, p.z - rz * 8) ? 1 : -1;
      const at = (f, r) => [p.x + fx * f + rx * r * side, p.z + fz * f + rz * r * side];
      const cam = at(-3.4, 0.3);
      const rr = rng.fork('richards');
      const [cx, cz] = at(6.5, p.half + 3.6);
      const tr = addTree('chestnut', 'veteran', cx, cz, rr);
      big.add(cx, cz, 4.4, tr);
      achieved.chestnut += tr.crownR * tr.crownR; achievedSum += tr.crownR * tr.crownR;
      // the slender dogwood leans out over the water toward the light
      const [dx, dz] = at(3.4, p.half + 1.5);
      {
        const d = SPECIES.dogwood;
        const la = JSON.parse(JSON.stringify(d.arch)); la.lean = 0.5; la.bole = [0.45, 0.55]; la.wobble = 0.07;
        const tx = -(rx * side) * 1.0 - fx * 0.45, tz = -(rz * side) * 1.0 - fz * 0.45;
        const key = 'dogwood:lean:0';
        const v = veg.addVariant(key, 'dogwood', d, la, { h: 7.5, dbh: 0.15 }, 77123, { spacing: 0.5, leanAz: Math.atan2(tz, tx) });
        const y = terrain.heightAt(dx, dz);
        veg.place(key, dx, y - 0.05, dz, 1, 0, 0.31);
        trees.push({ x: dx, z: dz, y, sp: 'dogwood', cls: 'mature', h: 7.5, dbh: 0.15, crownR: v.plant.meta.crown.rxz, scale: 1, key, layer: 'under' });
        small.add(dx, dz, 1.2, trees[trees.length - 1]);
      }
      const [wx, wz] = at(9.5, -(p.half + 2.2));
      addTree('witchhazel', 'mature', wx, wz, rr);
      const [mx, mz] = at(15, -(p.half + 6));
      addTree('redmaple', 'pole', mx, mz, rr);
      richards = { cam, fwd: [fx, fz], right: [rx * side, rz * side], pool: p, boulder: at(7.5, -(p.half + 0.9)), boulder2: at(4.2, -(p.half + 0.3)), tree: [cx, cz] };
    }
  }
  // classes are placed from the largest down so that giants claim their space first
  const classes = [
    { cls: 'giant', attempts: 2600, r: 6.2, minStream: 3.5, p: (s, g) => (1 - g) * smoothstep(0.75, 0.3, s.slope) },
    { cls: 'mature', attempts: 30000, r: 3.9, minStream: 1.8, p: (s, g) => (1 - g * 0.95) },
    { cls: 'pole', attempts: 26000, r: 2.1, minStream: 1.2, p: (s, g) => 0.75 + g * 0.25 },
  ];
  for (const c of classes) {
    const r = rng.fork(c.cls);
    for (let i = 0; i < c.attempts; i++) {
      const x = r.f(-HALF, HALF), z = r.f(-HALF, HALF);
      const s = site(x, z);
      if (!okSite(x, z, s, c.minStream)) continue;
      if (s.trail > 0.15) continue;
      const g = gapAt(x, z);
      if (!r.chance(c.p(s, g))) continue;
      if (big.blocked(x, z, c.r, 1)) continue;
      const spKey = pickSpecies(s, r, c.cls === 'giant' ? (sp) => !!sp.giant : null);
      const sp = SPECIES[spKey];
      if (c.cls === 'giant' && !r.chance(sp.giant.p * 3.2)) continue;
      const tr = addTree(spKey, c.cls, x, z, r);
      big.add(x, z, c.cls === 'pole' ? 1.6 : c.r, tr);
      const wgt = tr.crownR * tr.crownR * (c.cls === 'pole' ? 0.5 : 1);
      achieved[spKey] += wgt; achievedSum += wgt;
    }
    status?.(`Planting the ${c.cls} trees…`, 1);
    await new Promise((res) => setTimeout(res, 0));
  }

  // ------------------------------------------------------------ the forest beyond the cove (canopy trees only)
  {
    const r = rng.fork('outer');
    const farH = makeFarHeight(terrain, false);
    const og = new Grid(10);
    const n = Math.round(46000 * (G.quality.outer ?? 1));
    for (let i = 0; i < n; i++) {
      const x = r.f(-OUTER, OUTER), z = r.f(-OUTER, OUTER);
      if (Math.abs(x) < HALF - 1 && Math.abs(z) < HALF - 1) continue;
      // keep clear of the stream corridors
      const big2 = r.chance(0.7);
      const rad = big2 ? 4.3 : 2.4;
      if (og.blocked(x, z, rad, 1)) continue;
      const y = farH(x, z);
      const rel = y - terrain.fields.water.at(clamp(x, -HALF, HALF), clamp(z, -HALF, HALF));
      if (rel < 1.2) continue;
      const m = clamp(0.95 * Math.exp(-rel / 7) + 0.45 * Math.exp(-rel / 30) + 0.12 * fbm2(x * 0.02, z * 0.02, 3, terrain.seed + 80));
      const w = CANOPY.map((k) => SPECIES[k].share * niche(SPECIES[k], m, 0, 0.3, rel));
      const spKey = CANOPY[r.wpick(w)];
      const sp = SPECIES[spKey];
      const cls = big2 ? (sp.giant && r.chance(sp.giant.p * 0.5) ? 'giant' : 'mature') : 'pole';
      const list = variants[spKey][cls] || variants[spKey].mature;
      const vr = r.pick(list);
      veg.place(vr.key, x, y - 0.05, z, r.f(0.86, 1.14), r.f(0, 6.283), r.next(), true);
      og.add(x, z, rad, null);
    }
  }
  // ------------------------------------------------------------ saplings & advance regeneration
  {
    const r = rng.fork('sap');
    const tol = { beech: 3.2, sugarmaple: 3.0, hemlock: 2.6, redmaple: 2.2, chestnut: 1.6, ybirch: 1.2, bbirch: 1.0, stripedmaple: 1 };
    for (let i = 0; i < 22000; i++) {
      const x = r.f(-HALF, HALF), z = r.f(-HALF, HALF);
      const s = site(x, z);
      if (!okSite(x, z, s, 0.8) || s.trail > 0.3) continue;
      const g = gapAt(x, z);
      if (!r.chance(0.16 + 0.84 * g)) continue;
      if (small.blocked(x, z, 0.8, 1) || big.blocked(x, z, 0.25, 0.35)) continue;
      const w = CANOPY.map((k) => SPECIES[k].share * (tol[k] ?? 0.5) * niche(SPECIES[k], s.m, s.north, s.slope, s.rel, s.sd));
      const spKey = CANOPY[r.wpick(w)];
      const tr = addTree(spKey, 'sap', x, z, r);
      small.add(x, z, 0.8, tr);
    }
  }
  // beech suckers from its roots: old trees stand in a thicket of their own sprouts
  {
    const r = rng.fork('beechsprouts');
    for (const t of trees.slice()) {
      if (t.sp !== 'beech' || (t.cls !== 'mature' && t.cls !== 'giant')) continue;
      const n = r.i(6, 14);
      for (let k = 0; k < n; k++) {
        const a = r.f(0, 6.283), d = r.f(1.6, 7.5);
        const x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
        const s = site(x, z);
        if (!okSite(x, z, s, 0.8) || s.trail > 0.3 || small.blocked(x, z, 0.5, 1) || big.blocked(x, z, 0.25, 0.35)) continue;
        small.add(x, z, 0.5, addTree('beech', 'sap', x, z, r));
      }
    }
  }
  // ------------------------------------------------------------ understory trees
  {
    const r = rng.fork('under');
    for (let i = 0; i < 16000; i++) {
      const x = r.f(-HALF, HALF), z = r.f(-HALF, HALF);
      const s = site(x, z);
      if (!okSite(x, z, s, 0.8) || s.trail > 0.3) continue;
      const w = UNDER.map((k) => SPECIES[k].density * niche(SPECIES[k], s.m, s.north, s.slope, s.rel, s.sd));
      const tot = w.reduce((a, b) => a + b, 0);
      const clump = smoothstep(0.40, 0.66, 0.5 + 0.5 * fbm2(x * 0.028 + 9, z * 0.028 - 4, 3, terrain.seed + 500)) * 1.9;
      if (!r.chance(clamp(tot * 0.22 * clump, 0, 0.9))) continue;
      if (small.blocked(x, z, 1.5, 1) || big.blocked(x, z, 0.3, 0.3)) continue;
      const tr = addTree(UNDER[r.wpick(w)], 'mature', x, z, r);
      small.add(x, z, 1.5, tr);
    }
  }
  // ------------------------------------------------------------ shrubs (colonial)
  {
    const r = rng.fork('shrub');
    const S = terrain.seed;
    for (let si = 0; si < SHRUBS.length; si++) {
      const k = SHRUBS[si], sp = SPECIES[k];
      const attempts = Math.round(26000 * sp.density);
      const rad = Math.max(0.35, sp.h[1] * 0.32);
      for (let i = 0; i < attempts; i++) {
        const x = r.f(-HALF, HALF), z = r.f(-HALF, HALF);
        const s = site(x, z);
        if (!okSite(x, z, s, 0.5) || s.trail > 0.2) continue;
        const col = 0.5 + 0.5 * fbm2(x * 0.025 + si * 37.1, z * 0.025 - si * 11.3, 3, S + 100 + si);
        const colony = sp.colony ? smoothstep(0.52, 0.72, col) : 1.7 * smoothstep(0.44, 0.68, col);
        // keep the staged pool open, as in the painting
        if (richards && sp.h[1] > 1.6 && Math.hypot(x - richards.pool.x, z - richards.pool.z) < 16) continue;
        if (richards && Math.hypot(x - richards.boulder[0], z - richards.boulder[1]) < 3.6) continue;
        const p = niche(sp, s.m, s.north, s.slope, s.rel, s.sd) * colony * (0.6 + 0.4 * gapAt(x, z));
        if (!r.chance(p * 0.5)) continue;
        if (small.blocked(x, z, rad, 0.9) || big.blocked(x, z, 0.3, 0.3)) continue;
        const tr = addTree(k, 'mature', x, z, r);
        small.add(x, z, rad, tr);
      }
    }
  }

  // ------------------------------------------------------------ maps
  const N = 256;
  const cover = new Float32Array(N * N), cr = new Float32Array(N * N), cg = new Float32Array(N * N), cb = new Float32Array(N * N);
  const maple = new Float32Array(N * N), needle = new Float32Array(N * N), chest = new Float32Array(N * N), oak = new Float32Array(N * N);
  const cellM = WORLD / N;
  const meanCol = {};
  for (const k of Object.keys(SPECIES)) {
    const lf = LEAVES[SPECIES[k].leaf];
    let r = 0, g = 0, b = 0, w = 0;
    for (const p of lf.palette) { const c = hex2rgb(p.blade); r += c[0] * p.w; g += c[1] * p.w; b += c[2] * p.w; w += p.w; }
    meanCol[k] = [Math.pow(r / w, 2.2), Math.pow(g / w, 2.2), Math.pow(b / w, 2.2)];
  }
  for (const t of trees) {
    if (t.layer !== 'canopy' || t.cls === 'sap') continue;
    const R = t.crownR * 1.05;
    const i0 = Math.max(0, Math.floor((t.x - R + HALF) / cellM)), i1 = Math.min(N - 1, Math.ceil((t.x + R + HALF) / cellM));
    const j0 = Math.max(0, Math.floor((t.z - R + HALF) / cellM)), j1 = Math.min(N - 1, Math.ceil((t.z + R + HALF) / cellM));
    const mc = meanCol[t.sp];
    const dens = t.cls === 'pole' ? 0.6 : 1.0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = -HALF + (i + 0.5) * cellM, z = -HALF + (j + 0.5) * cellM;
      const d = Math.hypot(x - t.x, z - t.z) / R;
      if (d > 1) continue;
      const w = (1 - d * d) * dens;
      const k = j * N + i;
      cover[k] += w; cr[k] += mc[0] * w; cg[k] += mc[1] * w; cb[k] += mc[2] * w;
      if (t.sp === 'redmaple' || t.sp === 'sugarmaple' || t.sp === 'blackgum' || t.sp === 'scarletoak') maple[k] += w;
      if (t.sp === 'hemlock') needle[k] += w;
      if (t.sp === 'chestnut') chest[k] += w;
      if (t.sp.includes('oak') || t.sp === 'beech') oak[k] += w;
    }
  }
  const blur = (a) => {
    const o = new Float32Array(a.length);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let s = 0, w = 0;
      for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) {
        const x = i + c, y = j + b;
        if (x < 0 || y < 0 || x >= N || y >= N) continue;
        const ww = 1 / (1 + c * c + b * b);
        s += a[y * N + x] * ww; w += ww;
      }
      o[j * N + i] = s / w;
    }
    return o;
  };
  const bc = blur(cover), br = blur(cr), bg = blur(cg), bb = blur(cb), bm = blur(maple), bn = blur(needle), bch = blur(chest), bo = blur(oak);
  const canopyData = new Uint8Array(N * N * 4), litterData = new Uint8Array(N * N * 4);
  const coverF = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) {
    const c = Math.max(1e-4, bc[k]);
    const cov = 1 - Math.exp(-c * 1.5);
    coverF[k] = cov;
    canopyData[k * 4] = clamp(Math.sqrt(br[k] / c)) * 255;
    canopyData[k * 4 + 1] = clamp(Math.sqrt(bg[k] / c)) * 255;
    canopyData[k * 4 + 2] = clamp(Math.sqrt(bb[k] / c)) * 255;
    canopyData[k * 4 + 3] = cov * 255;
    litterData[k * 4] = clamp(bm[k] / c * 1.6) * 255;
    litterData[k * 4 + 1] = clamp(bn[k] / c * 1.5) * 255;
    litterData[k * 4 + 2] = clamp(bo[k] / c * 1.4) * 255;
    litterData[k * 4 + 3] = clamp(bch[k] / c * 1.2) * 255;
  }
  const canopyTex = dataTexture(canopyData, N, N, { type: THREE.UnsignedByteType });
  const litterTex = dataTexture(litterData, N, N, { type: THREE.UnsignedByteType });
  G.uniforms.uCanopyMap.value = canopyTex;
  const sample = (arr, x, z, ch = 0, stride = 1) => {
    const i = clamp(Math.floor((x + HALF) / cellM), 0, N - 1), j = clamp(Math.floor((z + HALF) / cellM), 0, N - 1);
    return arr[(j * N + i) * stride + ch];
  };
  const counts = {};
  for (const t of trees) counts[t.sp] = (counts[t.sp] || 0) + 1;
  console.log('[info] woody plants: ' + trees.length + ' ' + JSON.stringify(counts));
  const basal = {}; let bt = 0;
  for (const t of trees) if (t.layer === 'canopy' && t.cls !== 'sap') { const a = t.crownR * t.crownR; basal[t.sp] = (basal[t.sp] || 0) + a; bt += a; }
  console.log('[info] canopy share: ' + Object.entries(basal).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / bt).toFixed(1)}%`).join(', '));
  return {
    trees, gaps, big, small, variants, canopyTex, litterTex, hero, richards,
    coverAt: (x, z) => sample(coverF, x, z),
    litterAt: (x, z) => { const i = clamp(Math.floor((x + HALF) / cellM), 0, N - 1), j = clamp(Math.floor((z + HALF) / cellM), 0, N - 1); const k = (j * N + i) * 4; return [litterData[k] / 255, litterData[k + 1] / 255, litterData[k + 2] / 255, litterData[k + 3] / 255]; },
    gapAt, site,
  };
}
