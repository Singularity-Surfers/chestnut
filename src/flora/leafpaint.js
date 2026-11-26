// Procedural leaf painter. Every species' leaf is described by a small botanical spec
// (outline family, margin, venation, autumn palette) and painted to a sprite sheet:
// one canvas of albedo+alpha and one of surface relief (vein grooves).
import { RNG, clamp, lerp, smoothstep, hex2rgb, rgb2css, mixRgb, rgb2hsl, hsl2rgb } from '../core/rng.js';
import { paintNeedleSpray, paintFrond, paintExtra } from './paintextra.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- outlines
// All outlines are closed polygons [[x,y]...] in blade units: base at (0,0), tip near (0,1).

function toothShape(type, ph) {
  switch (type) {
    case 'serrate': return ph < 0.72 ? Math.pow(ph / 0.72, 1.25) : (1 - ph) / 0.28;
    case 'bristle': return ph < 0.80 ? Math.pow(ph / 0.80, 1.9) : Math.pow((1 - ph) / 0.20, 0.8);
    case 'dentate': return 1 - Math.abs(ph * 2 - 1);
    case 'crenate': return Math.pow(Math.sin(Math.PI * ph), 0.7);
    case 'wavy': return 0.5 - 0.5 * Math.cos(TAU * ph);
    case 'dserrate': {
      const a = ph < 0.72 ? Math.pow(ph / 0.72, 1.2) : (1 - ph) / 0.28;
      const q = (ph * 3) % 1;
      const b = q < 0.7 ? q / 0.7 : (1 - q) / 0.3;
      return a * 0.72 + b * 0.38;
    }
    default: return 0;
  }
}

function halfWidth(d, y) {
  // d.p widest position; d.ba base exponent; d.ta tip exponent; d.drip drawn-out tip
  const p = d.p ?? 0.45;
  let f;
  if (y <= p) f = Math.pow(Math.sin((Math.PI / 2) * clamp(y / p)), d.ba ?? 1.0);
  else f = Math.pow(Math.cos((Math.PI / 2) * clamp((y - p) / (1 - p))), d.ta ?? 1.2);
  if (d.drip) {
    const u = clamp((y - p) / (1 - p));
    f = Math.max(f, d.drip * Math.pow(1 - u, 1.6) * 0.9 * smoothstep(1.0, 0.75, 1 - u + 0.25));
  }
  return f;
}

/** Open-path corner cutting (keeps both end points). */
function chaikin(pts, iters = 2) {
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      q.push([lerp(a[0], b[0], 0.25), lerp(a[1], b[1], 0.25)], [lerp(a[0], b[0], 0.75), lerp(a[1], b[1], 0.75)]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}

/**
 * Simple leaf (entire / toothed). Returns {polys, veins}.
 * Optional base shapes: d.oblique (one side of the base sits higher on the midrib and is wedge-shaped, the other
 * is rounder and lower), d.cordate (basal lobes dip below the petiole attachment), d.auricle {len, w, waist}
 * (two backward-pointing ear lobes either side of the petiole).
 */
export function simpleOutline(d, rng) {
  const N = 150;
  const W = 0.5 / d.ar; // half width in blade units (ar = length / width)
  const asym = d.asym ?? 0.05;
  const bend = (d.bend ?? 0.03) * rng.f(-1, 1);
  const mid = (y) => bend * Math.sin(Math.PI * clamp(y)) * 1.0;
  const sideW = [W * (1 + rng.f(-asym, asym)), W * (1 + rng.f(-asym, asym))];
  const m = d.margin || { type: 'entire' };
  // lopsided base
  const ob = d.oblique ?? 0;
  const hiSide = ob ? (rng.chance(0.5) ? 0 : 1) : -1;
  const yb = [0, 0], dS = [d, d];
  if (ob) {
    yb[hiSide] = ob * rng.f(0.75, 1.25);
    dS[hiSide] = { ...d, ba: (d.ba ?? 1) * 1.2 };
    dS[1 - hiSide] = { ...d, ba: (d.ba ?? 1) * 0.7 };
  }
  const cord = d.cordate ?? 0;
  const aur = d.auricle || null;
  const hwAt = (s, y) => {
    if (y < yb[s]) return 0;
    let f = halfWidth(dS[s], yb[s] ? (y - yb[s]) / (1 - yb[s]) : y);
    if (aur) f = Math.hypot(f, ((aur.waist ?? 0.04) / W) * (1 - smoothstep(0.12, 0.5, y)));
    return sideW[s] * f;
  };
  // secondary veins (computed first so that teeth can sit on vein ends)
  const veins = [];
  const v = d.veins || { type: 'pinnate', n: 8, ang: 50 };
  const apex = [[], []];
  if (v.type === 'pinnate' || v.type === 'arcuate') {
    const n = v.n;
    for (let s = 0; s < 2; s++) {
      const sgn = s === 0 ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const y0 = lerp(v.y0 ?? 0.05, v.y1 ?? 0.9, (i + (s ? 0.5 * (v.alt ?? 0.4) : 0)) / n) + rng.f(-0.006, 0.006);
        const ang = (v.ang + rng.f(-3, 3) - 12 * (y0 - 0.5) * (v.fan ?? 1)) * Math.PI / 180;
        // march until the margin
        let x = 0, y = y0, hit = false;
        const pts = [[mid(y0), y0]];
        const stepL = 0.012;
        let a = ang;
        for (let k = 0; k < 120; k++) {
          x += Math.sin(a) * stepL; y += Math.cos(a) * stepL;
          if (v.type === 'arcuate') a = Math.max(0.06, a - 0.035 * (v.curl ?? 1) * (0.5 + x / (sideW[s] * 1.0)));
          else a = Math.max(0.2, a - (v.curve ?? 0.004));
          const lim = hwAt(s, y) * (v.type === 'arcuate' ? 0.90 : 1.0);
          if (y >= 0.995) { hit = true; }
          if (x >= lim) { x = lim; hit = true; }
          pts.push([mid(y) + sgn * x, y]);
          if (hit) break;
        }
        veins.push({ pts, w: 0.55 });
        if (v.type === 'pinnate') apex[s].push(y);
      }
    }
  }
  const poly = [];
  const nT = m.n || 0;
  const side = (s) => {
    const sgn = s === 0 ? 1 : -1;
    const out = [];
    const ap = apex[s];
    const useVeinTeeth = m.onVeins && ap.length > 2;
    for (let i = 0; i <= N; i++) {
      const y = i / N;
      if (y < yb[s]) continue;
      if (yb[s] && !out.length) out.push([mid(yb[s]), yb[s]]);
      let hw = hwAt(s, y);
      let dx = 0, dy = 0;
      if (m.type && m.type !== 'entire') {
        let ph;
        if (useVeinTeeth) {
          // tooth k has its apex at ap[k]
          let k = 0;
          while (k < ap.length - 1 && y > ap[k] + 0.02 * 0) k++;
          const a1 = ap[Math.max(0, k)];
          const a0 = k > 0 ? ap[k - 1] : a1 - (ap[1] - ap[0]);
          ph = clamp((y - a0) / Math.max(1e-4, a1 - a0)) * 0.8;
          if (y > ap[ap.length - 1]) ph = ((y - ap[ap.length - 1]) / Math.max(1e-4, ap[ap.length - 1] - ap[ap.length - 2])) * 0.8 % 1;
          // shift so that the apex (ph≈0.8 for bristle, 0.72 serrate) lands on the vein end
          ph = (ph + 0.0) % 1;
        } else ph = (y * nT + (s ? 0.37 : 0)) % 1;
        const env = smoothstep(0.0, m.y0 ?? 0.12, y - yb[s]) * smoothstep(1.0, 0.94, y);
        const depth = (m.depth ?? 0.05) * sideW[s] * (0.45 + 0.55 * halfWidth(d, y)) * env;
        const t = toothShape(m.type, ph);
        dx = depth * t;
        dy = depth * (m.fwd ?? 0.6) * t;
        if (m.type === 'wavy' || m.type === 'crenate') { dx -= depth * 0.5; dy = 0; }
      }
      let yy = Math.min(1.0, y + dy);
      if (cord || ob) {
        // rounded basal lobes sag below the attachment (more on the low side of a lopsided base)
        const c = cord + (ob && s !== hiSide ? ob * 0.45 : 0);
        yy -= c * (1 - smoothstep(0, 0.22, y - yb[s])) * smoothstep(0, 0.35, hw / sideW[s]);
      }
      out.push([mid(y) + sgn * (hw + dx), yy]);
    }
    return out;
  };
  let R = side(0), L = side(1);
  if (aur) {
    // ear lobes: from the petiole down and out, round the ear, back up to the narrow waist of the blade
    const ear = (s, pts) => {
      const sgn = s === 0 ? 1 : -1;
      const al = aur.len * rng.f(0.8, 1.15), aw = aur.w * rng.f(0.85, 1.12);
      const yJ = aur.join ?? 0.09, xJ = hwAt(s, yJ);
      const ctrl = [[0.004, 0.014], [aw * 0.2, -al * 0.42], [aw * 0.52, -al * 1.05], [aw * 1.1, -al * 0.92],
        [aw * 1.2, -al * 0.3], [lerp(aw, xJ, 0.6) * 1.02, yJ * 0.35], [xJ, yJ]];
      const e = chaikin(ctrl, 3).map(([x, y]) => [mid(Math.max(0, y)) + sgn * x, y]);
      return [...e, ...pts.filter((_, i) => i / N > yJ + 1e-6)];
    };
    R = ear(0, R); L = ear(1, L);
  }
  for (const p of R) poly.push(p);
  for (let i = L.length - 2; i >= (ob || aur ? 0 : 1); i--) poly.push(L[i]);
  const midrib = [];
  for (let i = 0; i <= 24; i++) midrib.push([mid(i / 24), i / 24]);
  veins.unshift({ pts: midrib, w: 1.25, main: true });
  return { polys: [poly], veins };
}

/** Round / cordate / reniform leaves in polar form around a centre on the midrib. */
export function roundOutline(d, rng) {
  // d.r: half width; d.cy: centre height (0..1); d.sinus: basal notch depth (0 none .. 0.45); d.tip: pointed tip extension
  const N = 260;
  const cy = d.cy ?? 0.48;
  const rw = 0.5 / d.ar;
  const m = d.margin || { type: 'entire' };
  const poly = [];
  const asym = d.oblique ?? 0;
  const obSign = asym ? (rng.chance(0.5) ? 1 : -1) : 0;      // which basal lobe is the larger, lower one
  const acu = d.acumen || null;                             // abrupt drawn-out tip {len, w (deg), k}
  const acuLean = acu ? rng.f(-0.07, 0.07) : 0;
  for (let i = 0; i <= N; i++) {
    const t = i / N;                 // 0..1 around from base-right to base-left
    const th = -Math.PI / 2 + TAU * t; // angle from "down"
    // radius: ellipse (rw, ry)
    const cs = Math.cos(th), sn = Math.sin(th);
    const up = sn;                    // -1 at base, +1 at tip
    const ryUp = 1 - cy, ryDn = cy * (1 + (d.sinus ?? 0) * 0.9);
    const ry = up > 0 ? ryUp : ryDn;
    let r = 1 / Math.sqrt((cs / rw) ** 2 + (sn / ry) ** 2);
    // tip
    if (d.tip) r *= 1 + d.tip * Math.pow(clamp(up), d.tipSharp ?? 14);
    else r *= 1;
    // basal sinus: pinch toward the petiole
    const dn = clamp(-up);
    if (d.sinus) {
      const notch = Math.pow(dn, d.sinusSharp ?? 10);
      r *= 1 - notch * (1 - (d.sinusR ?? 0.08) / 1);
    }
    // oblique base (basswood): one basal lobe larger and lower than the other
    if (asym) r *= 1 + asym * (cs * obSign > 0 ? 1 : -0.3) * Math.min(1, Math.pow(dn, 0.7) * Math.sqrt(Math.abs(cs)) / 0.66);
    if (acu) {
      // a cusp rather than a bump: concave sides running out to a sharp point
      const off = Math.abs(Math.atan2(cs, sn) - acuLean) / ((acu.w ?? 16) * Math.PI / 180);
      if (off < 1) r *= 1 + acu.len * Math.pow(1 - off, acu.k ?? 1.6);
    }
    let rr = r;
    if (m.type && m.type !== 'entire') {
      const ph = ((cs > 0 ? t : 1 - t) * 2 * (m.n || 20)) % 1;
      const env = smoothstep(0.02, 0.12, Math.min(t, 1 - t)) * (d.tip || acu ? smoothstep(0.0, acu ? 0.035 : 0.05, Math.abs(t - 0.5)) : 1);
      rr += (m.depth ?? 0.04) * rw * toothShape(m.type, ph) * env - (m.type === 'crenate' || m.type === 'wavy' ? (m.depth ?? 0.04) * rw * 0.5 * env : 0);
    }
    if (d.lobes) {
      // shallow palmate lobing (foamflower, mayapple, hobblebush-like undulation)
      const k = d.lobes.n;
      const a = 0.5 + 0.5 * Math.cos((t - 0.5) * TAU * k);
      rr *= 1 - d.lobes.depth * (1 - Math.pow(a, d.lobes.sharp ?? 0.6)) * smoothstep(0.03, 0.2, Math.min(t, 1 - t));
    }
    poly.push([cs * rr, cy + sn * rr]);
  }
  // palmate venation from the petiole attachment (the sinus apex)
  const veins = [];
  const v = d.veins || { type: 'palmate', n: 5 };
  const base = [0, poly[0][1]];
  const edge = (ang) => {
    // intersect ray from base with polygon (approx by sampling)
    let best = 0.2;
    const dx = Math.sin(ang), dy = Math.cos(ang);
    for (let i = 0; i < poly.length; i++) {
      const px = poly[i][0] - base[0], py = poly[i][1] - base[1];
      const along = px * dx + py * dy;
      const perp = Math.abs(px * dy - py * dx);
      if (along > 0 && perp < 0.02 && along > best) best = along;
    }
    return best;
  };
  if (v.type === 'palmate') {
    const n = v.n;
    for (let i = 0; i < n; i++) {
      const ang = lerp(-(v.spread ?? 115), (v.spread ?? 115), n === 1 ? 0.5 : i / (n - 1)) * Math.PI / 180;
      const len = edge(ang) * 0.93;
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        const u = k / 10;
        const a2 = ang * (1 - 0.18 * u);
        pts.push([base[0] + Math.sin(a2) * len * u, base[1] + Math.cos(a2) * len * u]);
      }
      const main = Math.abs(i - (n - 1) / 2) < 0.6;
      veins.push({ pts, w: main ? 1.2 : 0.8, main });
      // secondaries
      const ns = v.sec ?? 3;
      for (let j = 1; j <= ns; j++) for (const sg of [-1, 1]) {
        const u = j / (ns + 1);
        const p0 = [base[0] + Math.sin(ang) * len * u, base[1] + Math.cos(ang) * len * u];
        const a3 = ang + sg * 0.75;
        const l2 = len * 0.33 * (1 - u * 0.5);
        veins.push({ pts: [p0, [p0[0] + Math.sin(a3) * l2 * 0.5, p0[1] + Math.cos(a3) * l2 * 0.5], [p0[0] + Math.sin(a3 - sg * 0.3) * l2, p0[1] + Math.cos(a3 - sg * 0.3) * l2]], w: 0.45 });
      }
    }
  } else {
    // pinnate in a round leaf (hobblebush, witch hazel-like handled by simple)
    const mid = [];
    let tipP = null;
    if (acu) { for (const q of poly) if (!tipP || q[1] > tipP[1]) tipP = q; }
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      mid.push(tipP ? [tipP[0] * u * u * u, lerp(base[1], tipP[1], u)] : [0, lerp(base[1], 1 + (d.tip || 0) * (1 - cy), u)]);
    }
    veins.push({ pts: mid, w: 1.2, main: true });
    const n = v.n ?? 6;
    for (let i = 0; i < n; i++) for (const sg of [-1, 1]) {
      const y0 = lerp(base[1] + 0.03, 0.85, i / n);
      const ang = sg * (v.ang ?? 55) * Math.PI / 180 * (1 - 0.3 * i / n) + (i === 0 ? sg * 0.5 : 0);
      const len = edge2(poly, [0, y0], ang) * 0.93;
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        const a2 = ang * (1 - 0.3 * u * u);
        pts.push([Math.sin(a2) * len * u, y0 + Math.cos(a2) * len * u]);
      }
      veins.push({ pts, w: 0.6 });
    }
  }
  // put the attachment at the origin and normalise the blade length to 1
  let ymax = -1e9;
  for (const p of poly) ymax = Math.max(ymax, p[1]);
  const k = 1 / (ymax - base[1]);
  const fix = (p) => { p[0] *= k; p[1] = (p[1] - base[1]) * k; };
  const seen = new Set();
  for (const p of poly) fix(p);
  for (const vv of veins) for (const p of vv.pts) { if (!seen.has(p)) { seen.add(p); fix(p); } }
  return { polys: [poly], veins };
}

function edge2(poly, base, ang) {
  let best = 0.05;
  const dx = Math.sin(ang), dy = Math.cos(ang);
  for (let i = 0; i < poly.length; i++) {
    const px = poly[i][0] - base[0], py = poly[i][1] - base[1];
    const along = px * dx + py * dy;
    const perp = Math.abs(px * dy - py * dx);
    if (along > 0 && perp < 0.025 && along > best) best = along;
  }
  return best;
}

/** One lobe blade from a base point toward a tip with optional teeth; used by palmate leaves. */
function lobeBlade(bx, by, ang, len, wid, d, rng, opts = {}) {
  const N = 40;
  const dirx = Math.sin(ang), diry = Math.cos(ang);
  const nx = diry, ny = -dirx;
  const p = opts.p ?? 0.42, ta = opts.ta ?? 1.5, ba = opts.ba ?? 0.5;
  const teeth = opts.teeth || null;
  const pts = [];
  const side = (sg) => {
    const out = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      let f = u <= p ? Math.pow(Math.sin(Math.PI / 2 * u / p), ba) : Math.pow(Math.cos(Math.PI / 2 * (u - p) / (1 - p)), ta);
      f = Math.max(f, opts.baseW ?? 0.55) * (u < p ? 1 : 1) * (u <= p ? 1 : 1);
      if (u > p) f = Math.pow(Math.cos(Math.PI / 2 * (u - p) / (1 - p)), ta);
      else f = lerp(opts.baseW ?? 0.6, 1, Math.pow(u / p, 0.8));
      let w = wid * f;
      let fw = 0;
      if (teeth) {
        const env = smoothstep(teeth.from ?? 0.25, (teeth.from ?? 0.25) + 0.1, u) * smoothstep(1.0, 0.93, u);
        const ph = (u * teeth.n + (sg > 0 ? 0 : 0.4) + (opts.phase || 0)) % 1;
        const t = toothShape(teeth.type, ph) * teeth.depth * wid * env * (0.5 + 0.5 * f);
        w += t; fw = t * 0.8;
      }
      const a = u * len + fw;
      out.push([bx + dirx * a + sg * nx * w, by + diry * a + sg * ny * w]);
    }
    return out;
  };
  const R = side(1), L = side(-1);
  for (const q of R) pts.push(q);
  for (let i = L.length - 2; i > 0; i--) pts.push(L[i]);
  return pts;
}

/** Palmately lobed leaf (maples, mapleleaf viburnum, striped maple). */
export function palmateOutline(d, rng) {
  // d.lobes: [{ang(deg), len, w, p, ta, baseW}], d.body: {r, cy}, d.teeth
  const polys = [];
  const veins = [];
  const by = d.baseY ?? 0.0;
  const j = d.jitter ?? 0.06;
  for (const l0 of d.lobes) {
    for (const sg of (l0.ang === 0 ? [1] : [1, -1])) {
      const ang = sg * (l0.ang + rng.f(-4, 4)) * Math.PI / 180;
      const len = l0.len * (1 + rng.f(-j, j));
      const wid = l0.w * (1 + rng.f(-j, j));
      polys.push(lobeBlade(0, by, ang, len, wid, d, rng, { p: l0.p, ta: l0.ta, baseW: l0.baseW, teeth: l0.teeth ?? d.teeth, phase: rng.f() }));
      // extra shoulder teeth / lobelets (sugar maple)
      if (l0.shoulders) {
        for (const sh of l0.shoulders) for (const s2 of [1, -1]) {
          const bx = Math.sin(ang) * len * sh.at, bb = by + Math.cos(ang) * len * sh.at;
          polys.push(lobeBlade(bx, bb, ang + s2 * sh.ang * Math.PI / 180, len * sh.len, wid * sh.w, d, rng, { p: 0.3, ta: sh.ta ?? 2.2, baseW: 0.9 }));
        }
      }
      // lobe midvein + secondaries
      const mv = [];
      for (let k = 0; k <= 10; k++) mv.push([Math.sin(ang) * len * 0.97 * k / 10, by + Math.cos(ang) * len * 0.97 * k / 10]);
      veins.push({ pts: mv, w: l0.ang === 0 ? 1.2 : 1.0, main: true });
      const ns = l0.sec ?? 4;
      for (let k = 1; k <= ns; k++) for (const s2 of [1, -1]) {
        const u = 0.22 + 0.62 * k / (ns + 1);
        const p0 = [Math.sin(ang) * len * u, by + Math.cos(ang) * len * u];
        const a2 = ang + s2 * 0.7;
        const l2 = wid * 1.05 * (1 - u * 0.45);
        veins.push({ pts: [p0, [p0[0] + Math.sin(a2) * l2 * 0.55, p0[1] + Math.cos(a2) * l2 * 0.55], [p0[0] + Math.sin(a2 - s2 * 0.25) * l2, p0[1] + Math.cos(a2 - s2 * 0.25) * l2]], w: 0.45 });
      }
    }
  }
  if (d.body) {
    const b = [];
    for (let i = 0; i < 40; i++) {
      const th = TAU * i / 40;
      b.push([Math.cos(th) * d.body.rx, d.body.cy + Math.sin(th) * d.body.ry]);
    }
    polys.push(b);
  }
  return { polys, veins };
}

/**
 * Pinnately lobed leaf (oaks).
 * d: { ar, n (lateral lobes per side, number or [min,max]), sinus (how far the sinuses cut toward the midrib, 0..0.9),
 *      sinusW (width of the sinus floor: ~0.3 narrow U, ~0.6 broad C), p/ba/ta (envelope traced by the lobe tips),
 *      tips: 'round' | 'bristle', lobeAng/lobeAng1 (deg from the midrib, lowest/highest lobe), y0/y1 (heights of the
 *      lowest/highest lateral lobe tips), lobeW (round: tip width), spread/tooth (bristle: flare and tooth length),
 *      first (relative reach of the lowest lobe), baseX, termW }
 * Each side is a list of control points: 'r' points are rounded, plain points stay sharp (bristle-tipped teeth).
 */
export function oakOutline(d, rng) {
  const W = 0.5 / d.ar, rad = Math.PI / 180;
  const envD = { p: d.p ?? 0.6, ba: d.ba ?? 0.9, ta: d.ta ?? 0.9 };
  const env = (y) => halfWidth(envD, clamp(y));
  const bristle = d.tips === 'bristle';
  const n = Array.isArray(d.n) ? rng.i(d.n[0], d.n[1]) : d.n;
  const bend = (d.bend ?? 0.04) * rng.f(-1, 1);
  const sw = d.sinusW ?? 0.34;
  const bl = d.bristle ?? 0.022;
  const add = (q, v, k) => [q[0] + v[0] * k, q[1] + v[1] * k];
  const mix = (q, r, t) => [lerp(q[0], r[0], t), lerp(q[1], r[1], t)];
  const Rr = (q) => [q[0], q[1], 'r'];
  const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const mkSide = () => {
    const veins = [], bristles = [];
    const sideW = W * (1 + rng.f(-0.06, 0.06));
    const shift = rng.f(-1, 1) * (d.stagger ?? 0.02);      // lobes are rarely exactly opposite
    const ax = [];
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0.5 : i / (n - 1);
      const ty = lerp(d.y0 ?? 0.2, d.y1 ?? 0.8, f) + shift + rng.f(-0.012, 0.012);
      const a = (lerp(d.lobeAng ?? 60, d.lobeAng1 ?? 42, f) + rng.f(-4, 4)) * rad;
      const reach = (i === 0 ? (d.first ?? 0.85) : 1) * (1 + rng.f(-0.1, 0.06));
      const tx = Math.max(0.04, sideW * env(ty) * reach);
      ax.push({ T: [tx, ty], a, O: [0, ty - tx / Math.tan(a)], dir: [Math.sin(a), Math.cos(a)], nor: [-Math.cos(a), Math.sin(a)] });
    }
    const tHalf = (d.termW ?? 0.16) * sideW * rng.f(0.85, 1.15);
    // sinus floors: centre S on the line midway between two lobe axes, two control points either side
    const sin = [];
    for (let k = 0; k < n; k++) {
      const A = ax[k], B = ax[k + 1];
      const depth = clamp((d.sinus ?? 0.6) * rng.f(0.86, 1.08), 0.05, 0.9);
      let xs = 0, ys, am, gap = 0.05;
      if (B) {
        am = (A.a + B.a) / 2;
        ys = (A.T[1] + B.T[1]) / 2 - 0.04;
        for (let it = 0; it < 3; it++) {
          xs = Math.max(0.02, sideW * env(ys) * (1 - depth));
          const yA = A.O[1] + xs / Math.tan(A.a), yB = B.O[1] + xs / Math.tan(B.a);
          ys = (yA + yB) / 2; gap = Math.max(0.02, (yB - yA) * Math.sin(am));
        }
      } else {
        // between the last lateral lobe and the terminal lobe
        am = A.a / 2;
        ys = lerp(A.T[1], 1, 0.3);
        for (let it = 0; it < 3; it++) {
          xs = Math.max(tHalf * 1.5, sideW * env(ys) * (1 - depth));
          ys = Math.min(0.9, A.O[1] + xs / Math.tan(am));
        }
        gap = 2 * xs / Math.cos(am);
      }
      const f = [-Math.cos(am), Math.sin(am)];
      const e = 0.5 * sw * gap * rng.f(0.8, 1.2);
      sin.push({ C1: [xs - f[0] * e, ys - f[1] * e], C2: [xs + f[0] * e, ys + f[1] * e] });
    }
    const pts = [[0.010, 0]];
    for (let i = 0; i < n; i++) {
      const A = ax[i], T = A.T, up = sin[i].C1;
      const perp = (q) => q[0] * A.nor[0] + (q[1] - A.O[1]) * A.nor[1];
      const along = (q) => q[0] * A.dir[0] + (q[1] - A.O[1]) * A.dir[1];
      const hbU = Math.max(0.012, perp(up));
      let lo;
      if (i > 0) lo = sin[i - 1].C2;
      else {
        // wedge base running into the lower flank of the first lobe
        const bx = sideW * (d.baseX ?? 0.12);
        lo = [bx, Math.max(d.baseY ?? 0.03, A.O[1] + bx / Math.tan(A.a) - hbU / Math.sin(A.a))];
        pts.push(Rr(lo));
      }
      const hb = (hbU + Math.max(0.012, -perp(lo))) / 2;
      const Le = Math.max(0.03, along(T) - (along(up) + along(lo)) / 2);     // exposed length of the lobe
      const Pq = (fr, off) => add(add(T, A.dir, fr * Le), A.nor, off);
      const lobeVein = [[0, A.O[1]], add(mix([0, A.O[1]], T, 0.5), A.nor, -0.008), add(T, A.dir, -0.012)];
      veins.push({ pts: lobeVein, w: 0.7 });
      if (!bristle) {
        // finger with a rounded end
        const ht = clamp(hb * (d.lobeW ?? 1.0) * rng.f(0.88, 1.14), 0.016, 0.55 * Le);
        const cl = add(add(T, A.nor, -ht), A.dir, -ht * rng.f(0.0, 0.3));
        const cu = add(add(T, A.nor, ht), A.dir, -ht * rng.f(0.1, 0.5));
        const big = Le > 0.11 && rng.chance(d.subLobe ?? 0.3);
        if (big) {
          // larger lobes often carry a secondary rounded lobe on the lower flank
          const m0 = mix(lo, cl, 0.38), m1 = mix(lo, cl, 0.56), m2 = mix(lo, cl, 0.7);
          pts.push(Rr(m0), Rr(add(add(m1, A.nor, -ht * 1.0), A.dir, -ht * 0.3)), Rr(add(add(m1, A.nor, -ht * 1.1), A.dir, ht * 0.5)), Rr(m2), Rr(cl));
          veins.push({ pts: [mix(lobeVein[0], T, 0.45), add(m1, A.nor, -ht * 0.8)], w: 0.45 });
        } else pts.push(Rr(add(mix(lo, cl, 0.6), A.nor, ht * rng.f(-0.18, 0.18))), Rr(cl));
        pts.push(Rr(cu), Rr(add(mix(up, cu, 0.6), A.nor, ht * rng.f(-0.18, 0.18))));
      } else {
        // tapering lobe ending in bristle-tipped teeth
        const hs = hb * (d.spread ?? 1.0) * rng.f(0.9, 1.1);
        const tl = Le * (d.tooth ?? 0.2) * rng.f(0.8, 1.2);
        const big = Le > 0.085;
        const tooth = (tip, dirv, from) => {
          bristles.push([tip, add(tip, dirv, bl * rng.f(0.8, 1.2))]);
          if (from) veins.push({ pts: [from, add(tip, dirv, -0.01)], w: 0.42 });
        };
        pts.push(Rr(Pq(-0.56, -hs * 0.95)));
        if (big && rng.chance(d.teeth2 ?? 0.35)) {
          const t0 = Pq(-0.58, -(hs * 1.0 + tl * 0.75));
          pts.push(t0, Rr(Pq(-0.5, -hs * 0.78)));
          tooth(t0, unit(A.dir[0] * 0.55 - A.nor[0] * 0.83, A.dir[1] * 0.55 - A.nor[1] * 0.83), mix(lobeVein[0], T, 0.3));
        }
        if (big || rng.chance(0.5)) {
          const t1 = Pq(-0.3, -(hs * 0.82 + tl));
          pts.push(t1, Rr(Pq(-0.27, -hs * 0.42)));
          tooth(t1, unit(A.dir[0] * 0.7 - A.nor[0] * 0.7, A.dir[1] * 0.7 - A.nor[1] * 0.7), mix(lobeVein[0], T, 0.55));
        }
        pts.push([T[0], T[1]]);
        tooth(T, A.dir, null);
        if (big ? rng.chance(0.85) : rng.chance(0.35)) {
          const t2 = Pq(-0.34, hs * 0.78 + tl * 0.85);
          pts.push(Rr(Pq(-0.26, hs * 0.38)), t2);
          tooth(t2, unit(A.dir[0] * 0.75 + A.nor[0] * 0.66, A.dir[1] * 0.75 + A.nor[1] * 0.66), mix(lobeVein[0], T, 0.5));
        }
        pts.push(Rr(Pq(-0.58, hs * 0.9)));
      }
      pts.push(Rr(sin[i].C1), Rr(sin[i].C2));
      // a weak vein runs toward each sinus
      veins.push({ pts: [[0, lerp(A.O[1], sin[i].C1[1], 0.55)], mix([0, sin[i].C1[1]], mix(sin[i].C1, sin[i].C2, 0.5), 0.8)], w: 0.35 });
    }
    // terminal lobe
    const yb = sin[n - 1].C2[1], H = 1 - yb;
    if (!bristle) {
      if (rng.chance(d.termLobes ?? 0.55)) {
        pts.push(Rr([tHalf * 1.25, yb + H * 0.26]), Rr([tHalf * 2.2, yb + H * 0.42]), Rr([tHalf * 2.15, yb + H * 0.66]), Rr([tHalf * 1.0, yb + H * 0.7]));
        veins.push({ pts: [[0, yb + H * 0.1], [tHalf * 1.7, yb + H * 0.5]], w: 0.42 });
      } else pts.push(Rr([tHalf * 1.25, yb + H * 0.5]));
      pts.push(Rr([tHalf * rng.f(0.9, 1.15), 1.0]));
    } else {
      const t = [tHalf * rng.f(2.0, 2.7), yb + H * rng.f(0.52, 0.66)];
      pts.push(Rr([tHalf * 1.15, yb + H * 0.3]), t, Rr([tHalf * 0.7, t[1] + H * 0.02]));
      bristles.push([t, add(t, unit(0.6, 0.8), bl)]);
      veins.push({ pts: [[0, yb + H * 0.05], add(t, unit(0.6, 0.8), -0.01)], w: 0.42 });
    }
    return { pts, veins, bristles };
  };
  const A = mkSide(), B = mkSide();
  const fl = (q) => { const o = [-q[0], q[1]]; if (q[2]) o.push(q[2]); return o; };
  const raw = [...A.pts, ...(bristle ? [[0, 1.0]] : []), ...B.pts.map(fl).reverse()];
  const bristles = [...A.bristles, ...B.bristles.map((s) => s.map(fl))];
  if (bristle) bristles.push([[0, 1.0], [rng.f(-0.004, 0.004), 1.0 + bl]]);
  const veins = [...A.veins, ...B.veins.map((v) => ({ pts: v.pts.map(fl), w: v.w }))];
  const midrib = [];
  for (let i = 0; i <= 12; i++) midrib.push([0, 0.99 * i / 12]);
  veins.unshift({ pts: midrib, w: 1.3, main: true });
  const poly = smoothPoly(raw);
  // gentle sideways curve of the whole leaf
  const bendP = (q) => { q[0] += bend * Math.sin(Math.PI * clamp(q[1])); };
  for (const q of poly) bendP(q);
  for (const v of veins) for (const q of v.pts) bendP(q);
  for (const s of bristles) for (const q of s) bendP(q);
  return { polys: [poly], veins, bristles };
}

/**
 * Peltate leaf (mayapple): a round, deeply lobed umbrella whose stalk joins at the centre.
 * The blade is centred on (0, 0.5); d: { n (lobes, number or [min,max]), sinus (floor radius / lobe length), fork }.
 */
export function peltateOutline(d, rng) {
  const k = Array.isArray(d.n) ? rng.i(d.n[0], d.n[1]) : (d.n ?? 7);
  const R = 0.5;
  const raw = [], veins = [];
  const P = (ang, r) => [Math.sin(ang) * r, Math.cos(ang) * r];
  const wts = []; let ws = 0;
  for (let i = 0; i < k; i++) { const w = rng.f(0.78, 1.25); wts.push(w); ws += w; }
  let a0 = rng.f(0, TAU);
  for (let i = 0; i < k; i++) {
    const span = TAU * wts[i] / ws, ac = a0 + span / 2, hs = span / 2;
    const len = R * rng.f(0.8, 1.0);
    const sr = len * (d.sinus ?? 0.3) * rng.f(0.75, 1.3);
    const fork = (d.fork ?? 0.14) * rng.f(0.6, 1.5);
    const sk = rng.f(-0.1, 0.1);                           // the two halves of a lobe are never quite alike
    const u = (f) => ac + f * hs;
    const l1 = len * rng.f(0.9, 1.0), l2 = len * rng.f(0.9, 1.0);
    const s1 = len * rng.f(0.62, 0.8), s2 = len * rng.f(0.62, 0.8);
    const sh = (f, sl, sharp) => { const q = P(u(f), sl); if (!sharp) q.push('r'); return q; };
    raw.push([...P(u(-0.94), sr), 'r'], [...P(u(-0.86), len * 0.45), 'r'], sh(-0.8, s1, rng.chance(0.5)), [...P(u(-0.6), s1 * 0.97), 'r'],
      P(u(-0.36 + sk), l1), [...P(u(sk), len * (1 - fork)), 'r'], P(u(0.36 + sk), l2),
      [...P(u(0.6), s2 * 0.97), 'r'], sh(0.8, s2, rng.chance(0.5)), [...P(u(0.86), len * 0.45), 'r'], [...P(u(0.94), sr), 'r']);
    // a main vein to each lobe, forking toward the two points, with a branch to each shoulder tooth
    const fk = len * 0.5;
    veins.push({ pts: [[0, 0], P(ac, fk * 0.5), P(u(sk * 0.5), fk)], w: 0.95, main: true });
    veins.push({ pts: [P(u(sk * 0.5), fk), P(u(-0.2 + sk), len * 0.8), P(u(-0.34 + sk), l1 * 0.96)], w: 0.6 });
    veins.push({ pts: [P(u(sk * 0.5), fk), P(u(0.2 + sk), len * 0.8), P(u(0.34 + sk), l2 * 0.96)], w: 0.6 });
    veins.push({ pts: [P(ac, fk * 0.62), P(u(-0.5), len * 0.6), P(u(-0.76), s1 * 0.95)], w: 0.42 });
    veins.push({ pts: [P(ac, fk * 0.62), P(u(0.5), len * 0.6), P(u(0.76), s2 * 0.95)], w: 0.42 });
    a0 += span;
  }
  const poly = smoothPoly(raw);
  // centre the blade on (0, 0.5) and make its larger dimension 1
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const q of poly) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  const sc = 1 / Math.max(x1 - x0, y1 - y0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const fix = (q) => { q[0] = (q[0] - mx) * sc; q[1] = (q[1] - my) * sc + 0.5; };
  const seen = new Set();
  for (const q of poly) fix(q);
  for (const v of veins) for (const q of v.pts) { if (!seen.has(q)) { seen.add(q); fix(q); } }
  return { polys: [poly], veins, centre: [-mx * sc, -my * sc + 0.5] };
}

/** Custom polygon with 'r' (round) markers, mirrored. pts are the right half from base to tip. */
export function customOutline(d, rng) {
  const j = d.jitter ?? 0.02;
  const R = d.half.map(([x, y, t]) => [x * (1 + rng.f(-j, j)), y + rng.f(-j, j) * 0.3, t]);
  const L = d.half.map(([x, y, t]) => [-x * (1 + rng.f(-j, j)), y + rng.f(-j, j) * 0.3, t]).reverse();
  const raw = [...R, ...L.filter((p) => Math.abs(p[0]) > 1e-4)];
  const veins = (d.veinLines || []).flatMap((v) => {
    const a = { pts: v.pts, w: v.w ?? 0.6, main: v.main };
    if (v.mirror === false) return [a];
    return [a, { pts: v.pts.map(([x, y]) => [-x, y]), w: v.w ?? 0.6, main: v.main }];
  });
  return { polys: [smoothPoly(raw)], veins };
}

function smoothPoly(raw) {
  const out = [];
  const n = raw.length;
  for (let i = 0; i < n; i++) {
    const p = raw[i];
    if (p[2] !== 'r') { out.push([p[0], p[1]]); continue; }
    const a = raw[(i - 1 + n) % n], b = raw[(i + 1) % n];
    const m0 = a[2] === 'r' ? [(a[0] + p[0]) / 2, (a[1] + p[1]) / 2] : [lerp(a[0], p[0], 0.5), lerp(a[1], p[1], 0.5)];
    const m1 = b[2] === 'r' ? [(b[0] + p[0]) / 2, (b[1] + p[1]) / 2] : [lerp(b[0], p[0], 0.5), lerp(b[1], p[1], 0.5)];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const x = (1 - t) * (1 - t) * m0[0] + 2 * (1 - t) * t * p[0] + t * t * m1[0];
      const y = (1 - t) * (1 - t) * m0[1] + 2 * (1 - t) * t * p[1] + t * t * m1[1];
      out.push([x, y]);
    }
  }
  return out;
}

export function buildOutline(shape, rng) {
  switch (shape.kind) {
    case 'simple': return simpleOutline(shape, rng);
    case 'round': return roundOutline(shape, rng);
    case 'palmate': return palmateOutline(shape, rng);
    case 'oak': return oakOutline(shape, rng);
    case 'peltate': return peltateOutline(shape, rng);
    case 'custom': return customOutline(shape, rng);
    default: throw new Error('unknown leaf kind ' + shape.kind);
  }
}

// ---------------------------------------------------------------- painting
let _noiseTile = null;
function noiseTile() {
  if (_noiseTile) return _noiseTile;
  const s = 256;
  const c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d');
  x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, s, s);
  const rng = new RNG(4242);
  // soft light and dark blobs at several scales, wrapped so the tile repeats
  for (let i = 0; i < 900; i++) {
    const r = i < 60 ? rng.f(24, 60) : i < 300 ? rng.f(8, 22) : rng.f(2, 7);
    const px = rng.f(0, s), py = rng.f(0, s);
    const v = rng.chance(0.5) ? 255 : 0;
    const a = i < 60 ? 0.16 : i < 300 ? 0.14 : 0.12;
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
      if (px + ox < -r || px + ox > s + r || py + oy < -r || py + oy > s + r) continue;
      const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r);
      g.addColorStop(0, `rgba(${v},${v},${v},${a})`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      x.fillStyle = g; x.fillRect(px + ox - r, py + oy - r, 2 * r, 2 * r);
    }
  }
  _noiseTile = c;
  return c;
}

function tracePoly(ctx, poly, tx) {
  ctx.beginPath();
  for (let i = 0; i < poly.length; i++) {
    const p = tx(poly[i]);
    if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
}
function traceLine(ctx, pts, tx) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = tx(pts[i]);
    if (i === 0) ctx.moveTo(p[0], p[1]);
    else if (i < pts.length - 1 && pts.length > 2) {
      const q = tx(pts[i + 1]);
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    } else ctx.lineTo(p[0], p[1]);
  }
}

const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
function jitterColor(c, rng, dh = 0.012, ds = 0.06, dl = 0.05) {
  const h = rgb2hsl(c[0], c[1], c[2]);
  return hsl2rgb(h[0] + rng.f(-dh, dh), clamp(h[1] + rng.f(-ds, ds)), clamp(h[2] + rng.f(-dl, dl)));
}

/**
 * Paint one leaf into ctx (albedo) and hctx (relief) inside the cell rect.
 * spec: { shape, pet (petiole length relative to blade), petW, palette entry, gloss ... }
 * Returns the blade bbox used.
 */
export function paintLeaf(ctx, hctx, cell, spec, variant, rng) {
  const { x: cx, y: cy, w: cw, h: ch } = cell;
  const o = buildOutline(spec.shape, rng);
  // bbox of outline
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const poly of o.polys) for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const peltate = spec.shape.kind === 'peltate';
  const pet = peltate ? 0 : (spec.pet ?? 0.1);
  const half = Math.max(Math.abs(x0), Math.abs(x1));
  const below = Math.max(pet, -Math.min(y0, 0));
  const totalH = y1 + below;
  const pad = 3;
  const sc = Math.min((cw - 2 * pad) / (2 * half), (ch - 2 * pad) / totalH);
  const baseY = cy + ch - pad - below * sc; // canvas y of blade base (0,0)
  const midX = cx + cw / 2;
  const tx = (p) => [midX + p[0] * sc, baseY - p[1] * sc];

  // offscreen for this leaf (so compositing ops stay local)
  const oc = paintLeaf._oc || (paintLeaf._oc = document.createElement('canvas'));
  const mc = paintLeaf._mc || (paintLeaf._mc = document.createElement('canvas'));
  for (const c of [oc, mc]) { if (c.width !== ctx.canvas.width || c.height !== ctx.canvas.height) { c.width = ctx.canvas.width; c.height = ctx.canvas.height; } }
  const g = oc.getContext('2d'), mg = mc.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.clearRect(cx, cy, cw, ch); mg.clearRect(cx, cy, cw, ch);
  g.save(); g.beginPath(); g.rect(cx, cy, cw, ch); g.clip();
  mg.save(); mg.beginPath(); mg.rect(cx, cy, cw, ch); mg.clip();

  // --- mask
  mg.fillStyle = '#fff';
  mg.lineJoin = 'round';
  for (const poly of o.polys) { tracePoly(mg, poly, tx); mg.fill(); }
  if (o.bristles) {
    // hair-fine bristle tips (red oak group): too thin for the polygon, so stroked into the mask
    mg.strokeStyle = '#fff'; mg.lineCap = 'round'; mg.lineWidth = Math.max(0.9, sc * 0.0045);
    for (const b of o.bristles) { const a = tx(b[0]), e = tx(b[1]); mg.beginPath(); mg.moveTo(a[0], a[1]); mg.lineTo(e[0], e[1]); mg.stroke(); }
  }

  // --- colours
  const blade = jitterColor(hex2rgb(variant.blade), rng, 0.012, 0.05, 0.035);
  const glow = variant.vein ? hex2rgb(variant.vein) : mixRgb(blade, [1, 0.9, 0.4], 0.25);
  const edge = variant.edge ? hex2rgb(variant.edge) : shade(blade, 0.8);
  g.fillStyle = rgb2css(blade);
  g.fillRect(cx, cy, cw, ch);
  // blade gradient base->tip
  if (variant.tip) {
    const gr = g.createLinearGradient(0, baseY, 0, baseY - sc);
    gr.addColorStop(0, rgb2css(blade, 0));
    gr.addColorStop(1, rgb2css(hex2rgb(variant.tip), 0.85));
    g.fillStyle = gr; g.fillRect(cx, cy, cw, ch);
  }
  // colour retained / changed along the veins
  g.lineCap = 'round'; g.lineJoin = 'round';
  const glowAmt = variant.veinGlow ?? 0.5;
  // secVein: 0..1 strength of the side veins (colour, line and relief); the midrib is never faded
  const secV = variant.secVein ?? spec.secVein ?? 1;
  if (glowAmt > 0) {
    g.save();
    g.shadowColor = rgb2css(glow, 1); g.shadowBlur = sc * 0.05;
    for (const v of o.veins) {
      const k = v.main ? 1 : secV;
      if (k <= 0) continue;
      g.shadowColor = rgb2css(glow, k);
      g.strokeStyle = rgb2css(glow, glowAmt * k);
      g.lineWidth = Math.max(1, sc * 0.018 * v.w * (variant.glowW ?? 1));
      traceLine(g, v.pts, tx); g.stroke();
    }
    g.restore();
  }
  // margin colour (reddened or browned edges)
  const edgeAmt = variant.edgeAmt ?? 0.5;
  if (edgeAmt > 0) {
    g.save();
    g.shadowColor = rgb2css(edge, 1); g.shadowBlur = sc * (variant.edgeBlur ?? 0.06);
    g.strokeStyle = rgb2css(edge, edgeAmt);
    g.lineWidth = sc * (variant.edgeW ?? 0.05);
    for (const poly of o.polys.slice(0, spec.shape.kind === 'palmate' ? o.polys.length - (spec.shape.body ? 1 : 0) : 1)) {
      // only outer edges matter; inner overlaps are hidden by later strokes of blade colour
      tracePoly(g, poly, tx); g.stroke();
    }
    g.restore();
    if (spec.shape.kind === 'palmate') {
      // repaint interior so lobe overlaps do not show margin lines
      g.save();
      g.fillStyle = rgb2css(blade, 0.92);
      for (const poly of o.polys) {
        const shr = shrinkPoly(poly, 0.035);
        tracePoly(g, shr, tx); g.fill();
      }
      g.restore();
      if (glowAmt > 0) {
        g.save(); g.shadowColor = rgb2css(glow, 1); g.shadowBlur = sc * 0.04;
        for (const v of o.veins) { g.strokeStyle = rgb2css(glow, glowAmt * (v.main ? 1 : secV)); g.lineWidth = Math.max(1, sc * 0.016 * v.w); traceLine(g, v.pts, tx); g.stroke(); }
        g.restore();
      }
    }
  }
  // blotches: patchy pigment
  const nb = variant.blotch ?? 5;
  for (let i = 0; i < nb; i++) {
    const bx = midX + rng.f(-half, half) * sc, byy = baseY - rng.f(0, 1) * sc;
    const r = sc * rng.f(0.05, 0.22);
    const pool = variant.blotchCols || [variant.edge || variant.blade, variant.vein || variant.blade];
    const c = jitterColor(hex2rgb(rng.pick(pool)), rng, 0.02, 0.08, 0.06);
    const gr = g.createRadialGradient(bx, byy, 0, bx, byy, r);
    gr.addColorStop(0, rgb2css(c, rng.f(0.2, 0.55) * (variant.blotchAmt ?? 1)));
    gr.addColorStop(1, rgb2css(c, 0));
    g.fillStyle = gr; g.fillRect(bx - r, byy - r, 2 * r, 2 * r);
  }
  // fine mottling
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.globalAlpha = variant.mottle ?? 0.22;
  const nt = noiseTile();
  const ox = rng.i(0, 255), oy = rng.i(0, 255);
  g.drawImage(nt, ox, oy, 256 - ox, 256 - oy, cx, cy, cw, ch);
  g.restore();

  // --- veins (drawn lines)
  const veinCol = variant.veinLine ? hex2rgb(variant.veinLine) : mixRgb(blade, [0.95, 0.85, 0.45], 0.35);
  const veinDark = shade(blade, 0.62);
  for (const v of o.veins) {
    const k = v.main ? 1 : secV;
    if (k <= 0) continue;
    const lw = Math.max(0.6, sc * 0.0085 * v.w * (spec.veinW ?? 1) * (v.main ? (spec.midW ?? 1) : 1));
    g.strokeStyle = rgb2css(veinDark, 0.35 * k); g.lineWidth = lw * 1.9;
    traceLine(g, v.pts, tx); g.stroke();
    g.strokeStyle = rgb2css(veinCol, (v.main ? 0.95 : 0.7) * k); g.lineWidth = lw;
    traceLine(g, v.pts, tx); g.stroke();
  }
  // tertiary network hint
  if ((spec.tertiary ?? 0.25) > 0) {
    g.save(); g.globalAlpha = (spec.tertiary ?? 0.25) * Math.min(1, secV * 2); g.strokeStyle = rgb2css(veinDark, 0.5); g.lineWidth = Math.max(0.5, sc * 0.003);
    for (const v of o.veins) {
      if (v.main || v.pts.length < 2) continue;
      const a = v.pts[0], b = v.pts[v.pts.length - 1];
      for (let k = 1; k < 5; k++) {
        const t = k / 5 + rng.f(-0.05, 0.05);
        const px = lerp(a[0], b[0], t), py = lerp(a[1], b[1], t);
        const dx = -(b[1] - a[1]), dy = b[0] - a[0];
        const l = 0.045 / (Math.hypot(dx, dy) + 1e-5);
        g.beginPath(); const p0 = tx([px - dx * l, py - dy * l]), p1 = tx([px + dx * l, py + dy * l]);
        g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      }
    }
    g.restore();
  }
  // reticulate network over the whole blade (rattlesnake plantain): wavering lengthwise veins that follow the
  // outline, cross-linked into irregular cells, either side of a broad pale midrib
  if (spec.net) {
    const nd = spec.net, body = o.polys[0];
    const NY = 56, yA = 0.025, yB = 0.975;
    const yAt = (i) => yA + (yB - yA) * i / NY;
    const spans = [];
    for (let i = 0; i <= NY; i++) {
      const yy = yAt(i); let lo = 0, hi = 0;
      for (let q = 0; q < body.length; q++) {
        const a = body[q], b = body[(q + 1) % body.length];
        if ((a[1] - yy) * (b[1] - yy) <= 0 && a[1] !== b[1]) { const xx = a[0] + (b[0] - a[0]) * (yy - a[1]) / (b[1] - a[1]); lo = Math.min(lo, xx); hi = Math.max(hi, xx); }
      }
      spans.push([lo, hi]);
    }
    const nl = nd.n ?? 4;
    const ncol = hex2rgb(nd.col || '#e6f0e2');
    const lines = [];                                    // [side][j] -> x at each sampled height
    for (const sgn of [1, -1]) {
      const set = [new Array(NY + 1).fill(0)];
      for (let j = 1; j <= nl + 1; j++) {
        const f = j > nl ? 1 : Math.pow(j / (nl + 0.6), 0.92);
        const ph1 = rng.f(0, TAU), ph2 = rng.f(0, TAU), amp = j > nl ? 0 : (nd.wobble ?? 0.1) / nl;
        const xs = [];
        for (let i = 0; i <= NY; i++) {
          const yy = yAt(i), hw = sgn > 0 ? spans[i][1] : -spans[i][0];
          xs.push(sgn * hw * clamp(f + amp * (Math.sin(yy * 27 + ph1) + 0.6 * Math.sin(yy * 61 + ph2)), 0.04, 1));
        }
        set.push(xs);
      }
      lines.push(set);
    }
    const xOn = (xs, yy) => { const f = clamp((yy - yA) / (yB - yA)) * NY, i = Math.min(NY - 1, Math.floor(f)); return lerp(xs[i], xs[i + 1], f - i); };
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let passI = 0; passI < 2; passI++) {
      // pass 0: soft pale halo, pass 1: the fine lines
      g.strokeStyle = rgb2css(ncol, passI ? (nd.alpha ?? 0.88) : 0.07);
      g.lineWidth = Math.max(passI ? 0.7 : 1.6, sc * (passI ? 0.005 : 0.014) * (nd.w ?? 1));
      const rr = rng.fork('net');
      for (const set of lines) {
        for (let j = 1; j <= nl; j++) {
          g.beginPath();
          for (let i = 0; i <= NY; i++) { const q = tx([set[j][i], yAt(i)]); if (i === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]); }
          g.stroke();
        }
        for (let j = 0; j <= nl; j++) {
          let yy = 0.05 + rr.f(0, 0.04);
          while (yy < 0.95) {
            const y2 = yy + rr.f(-0.012, 0.03);
            const a = tx([xOn(set[j], yy), yy]), b = tx([xOn(set[j + 1], y2), y2]);
            g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
            yy += rr.f(0.6, 1.4) * (nd.cell ?? 0.05);
          }
        }
      }
    }
    // broad pale midrib, tapering to the tip
    const mr = o.veins[0].pts, mw = (nd.mid ?? 0.03);
    g.fillStyle = rgb2css(ncol, 0.95);
    g.beginPath();
    for (let i = 0; i < mr.length; i++) { const q = tx([mr[i][0] + mw * (1 - 0.85 * mr[i][1]), mr[i][1]]); if (i === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]); }
    for (let i = mr.length - 1; i >= 0; i--) { const q = tx([mr[i][0] - mw * (1 - 0.85 * mr[i][1]), mr[i][1]]); g.lineTo(q[0], q[1]); }
    g.closePath(); g.shadowColor = rgb2css(ncol, 0.7); g.shadowBlur = sc * 0.012; g.fill();
    g.restore();
  }
  // spots and necrosis: small irregular blemishes
  const ns = Math.round((variant.spots ?? 3) * rng.f(0.2, 1.4));
  for (let i = 0; i < ns; i++) {
    const bx = midX + rng.f(-half, half) * sc * 0.9, byy = baseY - rng.f(0.05, 0.98) * sc;
    const r = sc * rng.f(0.004, 0.016) * (rng.chance(0.15) ? 2.0 : 1);
    const c = hex2rgb(rng.pick(variant.spotCols || ['#5a3a1c', '#4a2e16', '#6b4a22']));
    const nb2 = rng.i(2, 4);
    for (let k = 0; k < nb2; k++) {
      const qx = bx + rng.f(-r, r) * 0.8, qy = byy + rng.f(-r, r) * 0.8, rr = r * rng.f(0.5, 1.0);
      const gr = g.createRadialGradient(qx, qy, 0, qx, qy, rr);
      gr.addColorStop(0, rgb2css(c, 0.6)); gr.addColorStop(0.5, rgb2css(c, 0.4)); gr.addColorStop(1, rgb2css(c, 0));
      g.fillStyle = gr; g.fillRect(qx - rr, qy - rr, 2 * rr, 2 * rr);
    }
  }
  // --- petiole (painted on both layers before masking)
  const petCol = variant.pet ? hex2rgb(variant.pet) : mixRgb(blade, [0.5, 0.35, 0.15], 0.45);
  if (peltate) {
    // no petiole in the sprite: the stalk meets the underside at the centre, seen from above as a pale boss
    const c = tx(o.centre || [0, 0.5]), r0 = sc * 0.022;
    const gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], r0 * 2.2);
    gr.addColorStop(0, rgb2css(mixRgb(blade, [0.95, 0.9, 0.6], 0.5), 0.9)); gr.addColorStop(0.45, rgb2css(petCol, 0.55)); gr.addColorStop(1, rgb2css(petCol, 0));
    g.fillStyle = gr; g.fillRect(c[0] - r0 * 2.2, c[1] - r0 * 2.2, r0 * 4.4, r0 * 4.4);
    // stalk colour key: a few pixels in the padding at the bottom centre, where plant builders sample the stem colour
    mg.fillStyle = '#fff'; mg.fillRect(midX - 2, cy + ch - pad, 4, pad - 0.5);
    g.fillStyle = rgb2css(petCol); g.fillRect(midX - 2, cy + ch - pad, 4, pad - 0.5);
  } else {
    const p0 = tx([0, 0.02]), p1 = [midX + rng.f(-0.02, 0.02) * sc, baseY + below * sc];
    mg.strokeStyle = '#fff'; mg.lineCap = 'round'; mg.lineWidth = Math.max(1.6, sc * (spec.petW ?? 0.016));
    mg.beginPath(); mg.moveTo(p0[0], p0[1]); mg.lineTo(p1[0], p1[1]); mg.stroke();
    g.strokeStyle = rgb2css(petCol); g.lineWidth = Math.max(1.6, sc * (spec.petW ?? 0.016)) + 1;
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }

  // --- damage: insect holes and nibbled edges
  const holes = variant.holes ? rng.i(variant.holes[0], variant.holes[1]) : rng.chance(variant.holeP ?? 0.3) ? rng.i(1, 3) : 0;
  mg.globalCompositeOperation = 'destination-out';
  if (variant.tatter) {
    // senescent, weather-beaten blade: ragged bites all round the margin and a few tears running inward
    const body = o.polys[0], cen = tx(o.centre || [0, 0.5]);
    const nb3 = Math.round(variant.tatter * rng.f(14, 26));
    for (let i = 0; i < nb3; i++) {
      const q = tx(body[rng.i(0, body.length - 1)]);
      const r = sc * rng.f(0.008, 0.035);
      g.fillStyle = 'rgba(70,44,20,0.5)';
      g.beginPath(); g.ellipse(q[0], q[1], r * 1.5, r * 1.3, 0, 0, TAU); g.fill();
      mg.beginPath(); mg.ellipse(q[0], q[1], r, r * rng.f(0.6, 1.3), rng.f(0, 3), 0, TAU); mg.fill();
    }
    const nt3 = Math.round(variant.tatter * rng.f(1, 4));
    for (let i = 0; i < nt3; i++) {
      const q = tx(body[rng.i(0, body.length - 1)]);
      const u = rng.f(0.25, 0.6), ex = lerp(q[0], cen[0], u), ey = lerp(q[1], cen[1], u);
      const nx = -(ey - q[1]), ny = ex - q[0], wd = rng.f(0.05, 0.13);
      g.strokeStyle = 'rgba(84,54,24,0.3)'; g.lineWidth = Math.max(1.5, sc * 0.012);
      g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(ex, ey); g.stroke();
      mg.beginPath(); mg.moveTo(q[0] - nx * wd, q[1] - ny * wd); mg.lineTo(ex, ey); mg.lineTo(q[0] + nx * wd, q[1] + ny * wd); mg.closePath(); mg.fill();
    }
  }
  for (let i = 0; i < holes; i++) {
    const edgeBite = rng.chance(0.4);
    const yy = rng.f(0.15, 0.95);
    const bx = midX + (edgeBite ? (rng.chance(0.5) ? 1 : -1) * half * rng.f(0.75, 1.0) : rng.f(-half, half) * 0.7) * sc, byy = baseY - yy * sc;
    const r = sc * rng.f(0.008, edgeBite ? 0.05 : 0.022);
    mg.beginPath(); mg.ellipse(bx, byy, r, r * rng.f(0.6, 1.4), rng.f(0, 3), 0, TAU); mg.fill();
    // browned rim
    g.strokeStyle = 'rgba(80,50,24,0.45)'; g.lineWidth = Math.max(0.8, sc * 0.004);
    g.beginPath(); g.ellipse(bx, byy, r * 1.15, r * 1.25, 0, 0, TAU); g.stroke();
  }
  mg.globalCompositeOperation = 'source-over';
  // apply mask
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(mc, cx, cy, cw, ch, cx, cy, cw, ch);
  g.globalCompositeOperation = 'source-over';
  g.restore(); mg.restore();
  ctx.drawImage(oc, cx, cy, cw, ch, cx, cy, cw, ch);

  // --- relief: mid grey with vein grooves
  if (hctx) {
    g.save(); g.beginPath(); g.rect(cx, cy, cw, ch); g.clip();
    g.clearRect(cx, cy, cw, ch);
    g.fillStyle = 'rgb(150,150,150)'; g.fillRect(cx, cy, cw, ch);
    // quilting: brighten between veins by darkening wide bands along veins
    g.shadowColor = 'rgba(70,70,70,1)'; g.shadowBlur = sc * 0.02;
    for (const v of o.veins) {
      g.strokeStyle = `rgba(60,60,60,${v.main ? 0.95 : 0.8 * (spec.quilt ?? 0.6) * lerp(0.3, 1, Math.min(1, secV))})`;
      g.lineWidth = Math.max(1, sc * 0.011 * v.w);
      traceLine(g, v.pts, tx); g.stroke();
    }
    g.shadowBlur = 0;
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(mc, cx, cy, cw, ch, cx, cy, cw, ch);
    g.globalCompositeOperation = 'source-over';
    g.restore();
    hctx.drawImage(oc, cx, cy, cw, ch, cx, cy, cw, ch);
  }
  // metadata in cell-relative units
  return {
    petFrac: (below * sc + pad) / ch,              // fraction of cell height below the blade base
    bladeFrac: sc / ch,                           // blade length as fraction of cell height
    widthFrac: (2 * half * sc) / cw,
    aspect: (2 * half) / (1 + pet),                // true width / length (incl. petiole)
  };
}

function shrinkPoly(poly, k) {
  let cx = 0, cy = 0;
  for (const p of poly) { cx += p[0]; cy += p[1]; }
  cx /= poly.length; cy /= poly.length;
  return poly.map((p) => [cx + (p[0] - cx) * (1 - k * 2.2), cy + (p[1] - cy) * (1 - k * 2.2)]);
}

/**
 * Build a sprite sheet of leaf variants for a species.
 * Returns { canvas, hcanvas, cells:[{u0,v0,u1,v1,aspect,petFrac,bladeFrac}], mean:[r,g,b] }
 */
export function paintLeafSheet(spec, seed, opts = {}) {
  const rng = new RNG(seed);
  const pal = spec.palette;
  const extras = spec.extras || [];
  const nLeaf = opts.count ?? spec.count ?? Math.max(4, Math.min(8, pal.length * 2));
  const n = nLeaf + extras.length;
  const kind = spec.shape.kind;
  const special = kind === 'needles' || kind === 'frond';
  const res = opts.res ?? spec.res ?? 256;       // pixels along the longer side
  let cw, ch;
  if (special) {
    const asp = kind === 'frond' ? 1.08 / spec.shape.ar : (spec.shape.cellAspect ?? 0.8);
    if (asp > 1) { cw = res; ch = Math.round(res / asp); } else { ch = res; cw = Math.max(16, Math.round(res * asp)); }
  } else {
    // probe aspect from one outline
    const probe = buildOutline(spec.shape, new RNG(seed + 1));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const poly of probe.polys) for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const half = Math.max(Math.abs(x0), Math.abs(x1)) * 1.12;
    const totalH = y1 + Math.max(kind === 'peltate' ? 0 : (spec.pet ?? 0.1), -Math.min(0, y0));
    if (2 * half > totalH) { cw = res; ch = Math.max(16, Math.round(res * totalH / (2 * half))); }
    else { ch = res; cw = Math.max(16, Math.round(res * (2 * half) / totalH)); }
    // very narrow leaves (grass blades) may ask for wider cells so that their fruit / seed-head sprites get enough pixels
    if (spec.minAspect) cw = Math.max(cw, Math.round(ch * spec.minAspect));
  }
  cw += 6; ch += 6;
  const cols = Math.min(n, Math.max(1, Math.floor(2048 / cw)));
  const rows = Math.ceil(n / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * cw; canvas.height = rows * ch;
  const hcanvas = document.createElement('canvas');
  hcanvas.width = canvas.width; hcanvas.height = canvas.height;
  const ctx = canvas.getContext('2d'), hctx = hcanvas.getContext('2d');
  const weights = pal.map((p) => p.w ?? 1);
  const used = pal.map(() => 0);
  const cells = [], extraCells = {};
  let mr = 0, mg = 0, mb = 0, wsum = 0;
  for (let i = 0; i < n; i++) {
    const cell = { x: (i % cols) * cw, y: Math.floor(i / cols) * ch, w: cw, h: ch };
    const uv = { u0: cell.x / canvas.width, v0: 1 - (cell.y + ch) / canvas.height, u1: (cell.x + cw) / canvas.width, v1: 1 - cell.y / canvas.height };
    if (i >= nLeaf) {
      const ex = extras[i - nLeaf];
      const meta = paintExtra(ctx, hctx, cell, ex, rng.fork('x' + i));
      (extraCells[ex.name || ex.kind] ||= []).push({ ...uv, ...meta, size: ex.size });
      continue;
    }
    // cover the palette in order, then give each further cell to the variant that is most under-represented for its
    // weight, so the sheet itself shows the palette mix (a rare variant never gets a second cell by luck)
    let vi = i;
    if (i >= pal.length) {
      vi = 0;
      for (let k = 1; k < pal.length; k++) if (weights[k] / used[k] > weights[vi] / used[vi] + 1e-9) vi = k;
    }
    used[vi]++;
    const variant = pal[vi];
    const fn = kind === 'needles' ? paintNeedleSpray : kind === 'frond' ? paintFrond : paintLeaf;
    const meta = fn(ctx, hctx, cell, spec, variant, rng.fork(i));
    cells.push({ ...uv, variant: vi, weight: variant.w ?? 1, ...meta, aspect: cw / ch });
  }
  // A palette weight is the variant's share of the foliage. A variant painted into several cells splits its weight
  // between them, so picking cells by weight reproduces the palette mix exactly.
  const perVariant = new Map();
  for (const c of cells) perVariant.set(c.variant, (perVariant.get(c.variant) || 0) + 1);
  for (const c of cells) {
    c.weight /= perVariant.get(c.variant);
    const col = hex2rgb(pal[c.variant].blade);
    mr += col[0] * c.weight; mg += col[1] * c.weight; mb += col[2] * c.weight; wsum += c.weight;
  }
  // ---- weathering. A painted leaf is too clean: by mid-October a real one is mottled, dulled in patches, browned in
  // blotches. Applied to the pixels after painting so every species gets it; evergreens only get the tonal mottle.
  const W = canvas.width, H = canvas.height;
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const T = 64, tile = new Float32Array(T * T);
  const nr = rng.fork('weather');
  for (let i = 0; i < T * T; i++) tile[i] = nr.next();
  const samp = (x, y) => {
    x = ((x % T) + T) % T; y = ((y % T) + T) % T;
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, x1 = (xi + 1) % T, y1 = (yi + 1) % T;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return (tile[yi * T + xi] * (1 - u) + tile[yi * T + x1] * u) * (1 - v) + (tile[y1 * T + xi] * (1 - u) + tile[y1 * T + x1] * u) * v;
  };
  const tone = spec.evergreen ? 0.14 : 0.30;
  const brownAmt = spec.evergreen ? 0 : (spec.weather ?? (special ? 0.5 : 1));
  for (let ci = 0; ci < nLeaf; ci++) {
    const cx = (ci % cols) * cw, cy = Math.floor(ci / cols) * ch, off = ci * 17.31;
    for (let y = cy; y < cy + ch; y++) for (let x = cx; x < cx + cw; x++) {
      const k = (y * W + x) * 4;
      if (d[k + 3] === 0) continue;
      const u = (x - cx) / ch, v = (y - cy) / ch;
      const n1 = samp(u * 3.3 + off, v * 3.3), n2 = samp(u * 8.7 + off * 1.7, v * 8.7 + 5.1), n3 = samp(u * 27 + off, v * 27 + 9.3);
      let r = d[k], g = d[k + 1], b = d[k + 2];
      const m = (1 - tone * 0.5 + tone * n1) * (0.94 + 0.12 * n3);
      r *= m; g *= m; b *= m;
      if (brownAmt) {
        const br = smoothstep(0.56, 0.78, n2 * 0.62 + n1 * 0.3 + n3 * 0.2) * 0.55 * brownAmt;
        const l = 0.3 * r + 0.59 * g + 0.11 * b;
        r += (l * 0.98 - r) * br; g += (l * 0.69 - g) * br; b += (l * 0.37 - b) * br;
      }
      const l2 = 0.3 * r + 0.59 * g + 0.11 * b;
      d[k] = l2 + (r - l2) * 0.92; d[k + 1] = l2 + (g - l2) * 0.92; d[k + 2] = l2 + (b - l2) * 0.92;
    }
  }
  ctx.putImageData(img, 0, 0);
  // ---- texture pixels with each sprite's colour bled into its transparent surround, so filtering and mip-mapping
  // do not pull the outline toward black (the dark rim round every leaf). Rows are flipped for upload.
  const pixels = new Uint8Array(W * H * 4);
  const sheetMean = [mr / wsum * 255, mg / wsum * 255, mb / wsum * 255];
  for (let ci = 0; ci < cols * rows; ci++) {
    const cx = (ci % cols) * cw, cy = Math.floor(ci / cols) * ch;
    let sr = 0, sg = 0, sb = 0, sn = 0;
    for (let y = cy; y < cy + ch; y += 2) for (let x = cx; x < cx + cw; x += 2) {
      const k = (y * W + x) * 4;
      if (d[k + 3] > 128) { sr += d[k]; sg += d[k + 1]; sb += d[k + 2]; sn++; }
    }
    const mc = sn ? [sr / sn, sg / sn, sb / sn] : sheetMean;
    for (let y = cy; y < cy + ch; y++) {
      const o = (H - 1 - y) * W;
      for (let x = cx; x < cx + cw; x++) {
        const k = (y * W + x) * 4, q = (o + x) * 4;
        if (d[k + 3] === 0) { pixels[q] = mc[0]; pixels[q + 1] = mc[1]; pixels[q + 2] = mc[2]; pixels[q + 3] = 0; }
        else { pixels[q] = d[k]; pixels[q + 1] = d[k + 1]; pixels[q + 2] = d[k + 2]; pixels[q + 3] = d[k + 3]; }
      }
    }
  }
  return { canvas, hcanvas, cells, extraCells, pixels, mean: [mr / wsum, mg / wsum, mb / wsum] };
}
