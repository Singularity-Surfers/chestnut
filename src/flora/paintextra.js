// Special painters: conifer sprays, fern fronds, fruits and flowers. Same cell contract as paintLeaf.
import { clamp, lerp, smoothstep, hex2rgb, rgb2css, mixRgb, rgb2hsl, hsl2rgb } from '../core/rng.js';

const TAU = Math.PI * 2;
const jit = (c, rng, dh = 0.012, ds = 0.06, dl = 0.05) => {
  const h = rgb2hsl(c[0], c[1], c[2]);
  return hsl2rgb(h[0] + rng.f(-dh, dh), clamp(h[1] + rng.f(-ds, ds)), clamp(h[2] + rng.f(-dl, dl)));
};

/**
 * Hemlock: a flat, lacy spray. Slender twiglets branch alternately in one plane; each carries two ranks of short,
 * flat, blunt needles standing out to the sides, with a line of small upside-down needles lying along its top.
 * shape: { needle (length / cell height), needleW, pitch (spacing along the twig) }
 */
export function paintNeedleSpray(ctx, hctx, cell, spec, variant, rng) {
  const { x, y, w, h } = cell;
  const S = spec.shape;
  const nl0 = h * (S.needle ?? 0.085), nw = Math.max(1.1, h * (S.needleW ?? 0.0105)), pitch = Math.max(2.2, h * (S.pitch ?? 0.019));
  const base = hex2rgb(variant.blade), tw = hex2rgb(variant.twig || '#5a4630');
  const young = variant.vein ? hex2rgb(variant.vein) : mixRgb(base, [0.5, 0.7, 0.3], 0.25);
  const draw = (g, relief) => {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.lineCap = 'round';
    const needle = (px, py, ang, len, wd, tipness) => {
      // every random draw happens in both passes so that colour and relief stay registered
      let c = jit(mixRgb(base, young, tipness * 0.55), rng, 0.012, 0.07, 0.045);
      const dx = Math.sin(ang), dy = -Math.cos(ang);
      if (relief) c = [0.6, 0.6, 0.6];
      // short stalk, then a parallel-sided blade with a blunt end
      g.strokeStyle = rgb2css(c); g.lineWidth = Math.max(0.7, wd * 0.45);
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + dx * len * 0.22, py + dy * len * 0.22); g.stroke();
      g.lineWidth = wd;
      g.beginPath(); g.moveTo(px + dx * len * 0.2, py + dy * len * 0.2); g.lineTo(px + dx * (len - wd * 0.5), py + dy * (len - wd * 0.5)); g.stroke();
      // grooved midrib of the upper face: a slightly darker line, with a thin lighter flank
      g.strokeStyle = relief ? 'rgb(105,105,105)' : rgb2css([c[0] * 0.72, c[1] * 0.76, c[2] * 0.72], 0.8); g.lineWidth = Math.max(0.5, wd * 0.22);
      g.beginPath(); g.moveTo(px + dx * len * 0.24, py + dy * len * 0.24); g.lineTo(px + dx * len * 0.9, py + dy * len * 0.9); g.stroke();
    };
    const twig = (px, py, ang, len, wd, depth) => {
      // shorten a twig that would run out of the cell rather than letting the cell edge cut it
      const mg = nl0 + 3, ex = px + Math.sin(ang) * len, ey = py - Math.cos(ang) * len;
      let fit = 1;
      if (ex < x + mg) fit = Math.min(fit, (px - (x + mg)) / (px - ex));
      if (ex > x + w - mg) fit = Math.min(fit, (x + w - mg - px) / (ex - px));
      if (ey < y + mg) fit = Math.min(fit, (py - (y + mg)) / (py - ey));
      len *= clamp(fit, 0.15, 1);
      const steps = Math.max(3, Math.round(len / pitch));
      let cx = px, cy = py, a = ang;
      const sway = rng.f(-0.02, 0.02);
      let nextSide = rng.chance(0.5) ? 1 : -1, sinceBranch = rng.i(0, 2);
      const every = depth === 0 ? Math.max(3, Math.round(steps / (S.sides ?? 8))) : Math.max(5, Math.round(steps / 2.2));
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const nx = cx + Math.sin(a) * len / steps, ny = cy - Math.cos(a) * len / steps;
        g.strokeStyle = relief ? 'rgb(195,195,195)' : rgb2css(mixRgb(tw, [0.62, 0.56, 0.3], t * 0.5)); g.lineWidth = Math.max(0.9, wd * (1 - t * 0.6));
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(nx, ny); g.stroke();
        // two ranks, set alternately; needles shorten toward the twig tip and at its very base
        const taper = (0.55 + 0.45 * smoothstep(0, 0.12, t)) * (1 - 0.5 * smoothstep(0.7, 1, t));
        for (const sg of [-1, 1]) {
          const f = sg > 0 ? 0 : 0.5;
          needle(lerp(cx, nx, f), lerp(cy, ny, f), a + sg * rng.f(1.02, 1.3), nl0 * (depth === 0 ? 1 : 0.92) * taper * rng.f(0.82, 1.08), nw, t * t);
        }
        // small appressed needles on top of the twig show their pale underside
        if (i % 2 === 1) {
          const al = a + rng.f(-0.3, 0.3), ll = nl0 * 0.36;
          g.strokeStyle = relief ? 'rgb(170,170,170)' : rgb2css(mixRgb(base, [0.52, 0.64, 0.46], 0.4), 0.9); g.lineWidth = nw * 0.75;
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(al) * ll, cy - Math.cos(al) * ll); g.stroke();
        }
        sinceBranch++;
        if (depth < 2 && i >= 2 && i < steps - 3 && sinceBranch >= every) {
          sinceBranch = rng.i(0, 1);
          const sl = len * (1 - t * 0.9) * (depth === 0 ? rng.f(0.42, 0.6) : rng.f(0.3, 0.42));
          const sa = a + nextSide * rng.f(0.84, 1.0);
          // third-order twiglets only where a side branch is long enough to carry them
          if (sl > pitch * (depth === 0 ? 4 : 5) && (depth === 0 || len > h * 0.26)) twig(nx, ny, sa, sl, wd * 0.62, depth + 1);
          else { rng.next(); }
          nextSide = -nextSide;
        }
        a += sway + rng.f(-0.05, 0.05);
        cx = nx; cy = ny;
      }
      needle(cx, cy, a + rng.f(-0.2, 0.2), nl0 * 0.5, nw, 1);
    };
    twig(x + w / 2, y + h - 3, rng.f(-0.05, 0.05), h * 0.9, Math.max(1.6, h * 0.011), 0);
    g.restore();
  };
  const seedState = rng.s;
  draw(ctx, false);
  rng.s = seedState;
  if (hctx) draw(hctx, true);
  return { petFrac: 0.01, bladeFrac: 0.95, widthFrac: 0.9, aspect: w / h };
}

/**
 * Fern frond. shape: { kind:'frond', ar, stipe, pairs, widest, baseTaper, tipTaper, pinna:'blade'|'lobed'|'pinnate', pinnaAr, pinnules, ang, tri }
 */
export function paintFrond(ctx, hctx, cell, spec, variant, rng) {
  const { x, y, w, h } = cell;
  const S = spec.shape;
  if (S.ternate) return paintTernateFrond(ctx, hctx, cell, spec, variant, rng);
  const L = h - 6;                  // full frond length in px
  const stipe = S.stipe ?? 0.2;
  const bladeL = L * (1 - stipe);
  const halfW = Math.min(w / 2 - 3, L / S.ar / 2);
  const cx0 = x + w / 2, by = y + h - 3;
  const lean = rng.f(-0.03, 0.03);
  const base = hex2rgb(variant.blade), rach = hex2rgb(variant.rachis || '#6a7a3a');
  const edgeC = variant.edge ? hex2rgb(variant.edge) : null;
  const widthAt = (t) => {
    // t: 0 at blade base .. 1 at tip
    const p = S.widest ?? 0.3;
    let f;
    if (t < p) f = lerp(S.baseTaper ?? 0.6, 1, Math.pow(t / p, 0.8));
    else f = Math.pow(1 - (t - p) / (1 - p), S.tipTaper ?? 0.9);
    return Math.max(0.0, f);
  };
  const seedState = rng.s;
  const pass = (g, relief) => {
    rng.s = seedState;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.lineCap = 'round'; g.lineJoin = 'round';
    const colOf = (t, k = 1) => {
      // draws the same random numbers in the relief pass, so both layers get identical geometry
      let c = jit(base, rng, 0.012, 0.06, 0.05);
      if (edgeC) c = mixRgb(c, edgeC, clamp((variant.edgeAmt ?? 0.4) * (0.3 + t) * rng.f(0.3, 1.3)));
      if (relief) return 'rgb(165,165,165)';
      return rgb2css([c[0] * k, c[1] * k, c[2] * k]);
    };
    const rx = (t) => cx0 + lean * bladeL * t * t;
    // rachis + stipe
    g.strokeStyle = relief ? 'rgb(215,215,215)' : rgb2css(rach);
    g.lineWidth = Math.max(1.5, L * 0.006);
    g.beginPath(); g.moveTo(cx0, by); g.lineTo(cx0, by - L * stipe);
    for (let i = 1; i <= 12; i++) g.lineTo(rx(i / 12), by - L * stipe - bladeL * i / 12);
    g.stroke();
    if (!relief && variant.scales) {
      // chaffy brown scales on the stipe (Christmas fern, wood fern)
      g.strokeStyle = 'rgba(120,84,44,0.8)'; g.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        const yy = by - rng.f(0, L * stipe * 1.2);
        g.beginPath(); g.moveTo(cx0, yy); g.lineTo(cx0 + rng.f(-1, 1) * L * 0.012, yy - L * 0.006); g.stroke();
      }
    }
    const n = S.pairs;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const py = by - L * stipe - bladeL * t;
      const pl = halfW * widthAt(t) * rng.f(0.93, 1.05);
      if (pl < 1.5) continue;
      const spacing = bladeL / n;
      for (const sg of [-1, 1]) {
        const ang = sg * ((S.ang ?? 78) - 26 * t * t + rng.f(-3, 3)) * Math.PI / 180;
        const dx = Math.sin(ang), dy = -Math.cos(ang);
        const ox = rx(t), oy = py + (sg > 0 ? 0 : spacing * 0.35 * (S.alt ?? 0.5));
        if (S.pinna === 'blade') {
          // simple toothed pinna with an "ear" at the base on the upper (tip-ward) side — Christmas fern
          const wd = Math.max(1.4, spacing * 0.42);
          g.fillStyle = colOf(t);
          g.beginPath();
          const nx = -dy * sg, ny = dx * sg; // "up" (toward frond tip) normal
          g.moveTo(ox, oy);
          g.lineTo(ox + dx * pl * 0.05 + nx * wd * 1.5, oy + dy * pl * 0.05 + ny * wd * 1.5);
          g.lineTo(ox + dx * pl * 0.12 + nx * wd * 2.5, oy + dy * pl * 0.12 + ny * wd * 2.5);   // auricle ("thumb" of the stocking)
          g.lineTo(ox + dx * pl * 0.2 + nx * wd * 1.0, oy + dy * pl * 0.2 + ny * wd * 1.0);
          g.quadraticCurveTo(ox + dx * pl * 0.7 + nx * wd * 0.9, oy + dy * pl * 0.7 + ny * wd * 0.9, ox + dx * pl + nx * wd * 0.1, oy + dy * pl + ny * wd * 0.1 - spacing * 0.12);
          g.quadraticCurveTo(ox + dx * pl * 0.6 - nx * wd * 0.9, oy + dy * pl * 0.6 - ny * wd * 0.9, ox + dx * pl * 0.05 - nx * wd * 0.7, oy + dy * pl * 0.05 - ny * wd * 0.7);
          g.closePath(); g.fill();
          g.strokeStyle = relief ? 'rgb(105,105,105)' : rgb2css(mixRgb(base, [0.7, 0.85, 0.5], 0.25), 0.7); g.lineWidth = Math.max(0.6, wd * 0.14);
          g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + dx * pl * 0.93, oy + dy * pl * 0.93 - spacing * 0.1); g.stroke();
        } else {
          // pinna axis
          g.strokeStyle = relief ? 'rgb(205,205,205)' : rgb2css(mixRgb(rach, base, 0.5)); g.lineWidth = Math.max(0.7, L * 0.0022);
          g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + dx * pl, oy + dy * pl - spacing * 0.25); g.stroke();
          const m = Math.max(3, Math.round((S.pinnules ?? 10) * (0.35 + 0.65 * widthAt(t))));
          for (let k = 0; k < m; k++) {
            const u = (k + 0.6) / (m + 0.4);
            const qx = ox + dx * pl * u, qy = oy + dy * pl * u - spacing * 0.25 * u * u;
            const ql = spacing * (S.pinnuleLen ?? 0.62) * (1 - u * 0.72) * rng.f(0.85, 1.1) * (S.tri ? 1 + (1 - t) * 1.6 * (sg > 0 ? 1 : 1) : 1);
            const qw = (pl / m) * (S.pinnuleW ?? 0.42);
            for (const s2 of [-1, 1]) {
              const a2 = ang + s2 * sg * 1.25 - sg * 0.2;
              const ex = Math.sin(a2), ey = -Math.cos(a2);
              g.fillStyle = colOf(t, 0.9 + 0.2 * rng.next());
              if (S.pinna === 'lobed') {
                // rounded lobes joined at the base (pinnatifid)
                g.beginPath();
                g.ellipse(qx + ex * ql * 0.5, qy + ey * ql * 0.5, Math.max(0.8, ql * 0.56), Math.max(0.8, qw * 1.25), Math.atan2(ey, ex), 0, TAU);
                g.fill();
              } else {
                // separate toothed pinnules (bipinnate, lacy)
                const nn = Math.max(2, Math.round(ql / Math.max(1.4, qw * 1.1)));
                for (let q = 0; q < nn; q++) {
                  const v = (q + 0.5) / nn;
                  const rr = Math.max(0.7, qw * (1 - v * 0.6) * 0.9);
                  g.beginPath();
                  g.ellipse(qx + ex * ql * v, qy + ey * ql * v, rr * 1.35, rr * 0.8, Math.atan2(ey, ex) + s2 * sg * 0.9, 0, TAU);
                  g.fill();
                }
                g.strokeStyle = relief ? 'rgb(195,195,195)' : colOf(t, 0.8); g.lineWidth = 0.6;
                g.beginPath(); g.moveTo(qx, qy); g.lineTo(qx + ex * ql, qy + ey * ql); g.stroke();
              }
            }
          }
        }
      }
    }
    // frond tip
    g.fillStyle = colOf(1);
    g.beginPath(); g.ellipse(rx(1), by - L + 2, Math.max(1, halfW * 0.03), halfW * 0.12, 0, 0, TAU); g.fill();
    g.restore();
  };
  pass(ctx, false);
  if (hctx) pass(hctx, true);
  return { petFrac: 0.0, bladeFrac: 1.0, widthFrac: (2 * halfW) / w, aspect: w / h };
}

/**
 * Bracken: the blade is ternate. Above a stiff stalk it divides into a terminal part and two big basal branches,
 * each broadly triangular and itself twice divided, with pinnae standing nearly square to their axes.
 * shape: { kind:'frond', ternate:true, ar, stipe, branchAng (deg from the stalk), pairs, pinnules }
 */
function paintTernateFrond(ctx, hctx, cell, spec, variant, rng) {
  const { x, y, w, h } = cell;
  const S = spec.shape;
  const L = h - 6;
  const stipe = S.stipe ?? 0.14;
  const bladeL = L * (1 - stipe);
  const halfW = Math.min(w / 2 - 3, L / S.ar / 2);
  const cx0 = x + w / 2, by = y + h - 3;
  const base = hex2rgb(variant.blade), rach = hex2rgb(variant.rachis || '#8a6a3a');
  const edgeC = variant.edge ? hex2rgb(variant.edge) : null;
  const seedState = rng.s;
  const pass = (g, relief) => {
    rng.s = seedState;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.lineCap = 'round'; g.lineJoin = 'round';
    const colOf = (t, k = 1) => {
      let c = jit(base, rng, 0.014, 0.07, 0.055);
      if (edgeC) c = mixRgb(c, edgeC, clamp((variant.edgeAmt ?? 0.4) * (0.25 + t) * rng.f(0.3, 1.3)));
      if (relief) return 'rgb(165,165,165)';
      return rgb2css([c[0] * k, c[1] * k, c[2] * k]);
    };
    const axis = (x0, y0, x1, y1, wd, k) => {
      g.strokeStyle = relief ? 'rgb(212,212,212)' : rgb2css(mixRgb(rach, base, k));
      g.lineWidth = wd; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    };
    // a pinna: a narrow comb of oblong, blunt pinnules either side of its own slender axis
    const pinna = (ox, oy, ang, len, t, gap) => {
      const dx = Math.sin(ang), dy = -Math.cos(ang);
      const droop = rng.f(-0.05, 0.05);
      const P = (u) => [ox + dx * len * u - dy * droop * len * u * u, oy + dy * len * u + dx * droop * len * u * u];
      const e = P(1);
      axis(ox, oy, e[0], e[1], Math.max(0.7, L * 0.0019), 0.45);
      const m = clamp(Math.round(len / (L * 0.0125)), 3, S.pinnules ?? 16);
      const pit = len / (m + 0.6);
      for (let k = 0; k < m; k++) {
        const u = (k + 0.55) / (m + 0.6);
        const q = P(u);
        const ql = Math.max(1.2, Math.min(len * 0.22, gap * 0.46) * (0.25 + 0.75 * Math.pow(1 - u, 0.8)) * rng.f(0.86, 1.1));
        const qw = Math.max(0.8, pit * 0.33);
        const fill = colOf(t, 0.9 + 0.2 * rng.next());
        for (const s2 of [-1, 1]) {
          const a2 = ang + s2 * rng.f(1.28, 1.48);            // nearly square to the pinna
          const ex = Math.sin(a2), ey = -Math.cos(a2);
          g.fillStyle = fill;
          g.beginPath(); g.ellipse(q[0] + ex * ql * 0.5, q[1] + ey * ql * 0.5, ql * 0.56, qw, Math.atan2(ey, ex), 0, TAU); g.fill();
        }
      }
      g.fillStyle = colOf(t);
      g.beginPath(); g.ellipse(e[0], e[1], Math.max(1, pit * 0.9), Math.max(0.8, pit * 0.4), Math.atan2(dy, dx), 0, TAU); g.fill();
    };
    // one of the three parts: a triangle of pinnae, longest at its base
    const part = (ox, oy, ang, len, hw, lowerSide) => {
      const dx = Math.sin(ang), dy = -Math.cos(ang);
      const bow = rng.f(-0.04, 0.04);
      const P = (u) => [ox + dx * len * u - dy * bow * len * Math.sin(Math.PI * u), oy + dy * len * u + dx * bow * len * Math.sin(Math.PI * u)];
      const N = 10;
      g.strokeStyle = relief ? 'rgb(220,220,220)' : rgb2css(rach);
      g.lineWidth = Math.max(1.1, L * 0.0042);
      g.beginPath(); g.moveTo(ox, oy); for (let i = 1; i <= N; i++) { const q = P(i / N); g.lineTo(q[0], q[1]); } g.stroke();
      const n = S.pairs ?? 9;
      const u0 = lowerSide === 0 ? 0.27 : 0.16;              // bare stalk below the first pinnae
      const gap = len * (0.95 - u0) / n;
      for (let i = 0; i < n; i++) {
        const f = i / n;
        const u = lerp(u0, 0.95, Math.pow(f, 0.92));
        const q = P(u);
        const pl = hw * Math.pow(1 - f, 0.9) * rng.f(0.9, 1.06);
        if (pl < L * 0.012) continue;
        const stag = (0.75 * len / n) * 0.4;
        for (const sg of [-1, 1]) {
          const q2 = sg > 0 ? q : P(Math.min(1, u + stag / len));
          const sideK = lowerSide === 0 ? 1 : (sg === lowerSide ? 1.0 : 0.78);     // basal branches are fuller on their lower side
          pinna(q2[0], q2[1], ang + sg * ((84 - 22 * f + rng.f(-4, 4)) * Math.PI / 180), pl * sideK, f, gap);
        }
      }
      const e = P(0.93);
      pinna(e[0], e[1], ang + bow, len * 0.1, 1, gap);
    };
    // stiff stalk up to the fork
    const sy = by - L * stipe;
    g.strokeStyle = relief ? 'rgb(225,225,225)' : rgb2css(mixRgb(rach, [0.35, 0.24, 0.12], 0.3));
    g.lineWidth = Math.max(1.8, L * 0.0075);
    g.beginPath(); g.moveTo(cx0, by); g.lineTo(cx0, sy); g.stroke();
    const bAng = (S.branchAng ?? 60) * Math.PI / 180;
    const lenB = Math.min(halfW * 0.93 / Math.sin(bAng + 0.06), bladeL * 0.78);
    for (const sg of [-1, 1]) part(cx0, sy, sg * (bAng + rng.f(-0.06, 0.06)), lenB * rng.f(0.93, 1.0), lenB * 0.36, sg);
    part(cx0, sy, rng.f(-0.04, 0.04), bladeL * 0.985, Math.min(halfW * 0.7, bladeL * 0.37), 0);
    g.restore();
  };
  pass(ctx, false);
  if (hctx) pass(hctx, true);
  return { petFrac: 0.0, bladeFrac: 1.0, widthFrac: (2 * halfW) / w, aspect: w / h };
}

// ---------------------------------------------------------------- fruits, flowers, seed heads
export const EXTRAS = {
  // opened chestnut bur: four spiny valves with glossy nuts
  bur(g, cx, cy, r, rng, v) {
    const open = v?.open ?? rng.chance(0.5);
    const hull = v?.dry ? [0.52, 0.38, 0.18] : [0.62, 0.62, 0.24];
    const spines = (px, py, rr, n) => {
      for (let i = 0; i < n; i++) {
        const a = rng.f(0, TAU), l = rr * rng.f(0.75, 1.25);
        const c = jit(hull, rng, 0.02, 0.1, 0.12);
        g.strokeStyle = rgb2css(c, 0.95); g.lineWidth = Math.max(0.6, r * 0.014);
        const sx = px + Math.cos(a) * rr * rng.f(0, 0.55), sy = py + Math.sin(a) * rr * rng.f(0, 0.55);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); g.stroke();
      }
    };
    if (!open) {
      g.fillStyle = rgb2css(hull.map((c) => c * 0.7)); g.beginPath(); g.arc(cx, cy, r * 0.5, 0, TAU); g.fill();
      spines(cx, cy, r * 0.52, 420);
    } else {
      // valves spread like a four-pointed star around the nuts
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + 0.4;
        const px = cx + Math.cos(a) * r * 0.42, py = cy + Math.sin(a) * r * 0.42;
        g.fillStyle = 'rgb(196,170,120)'; g.beginPath(); g.ellipse(px, py, r * 0.3, r * 0.22, a, 0, TAU); g.fill();
        spines(px + Math.cos(a) * r * 0.1, py + Math.sin(a) * r * 0.1, r * 0.3, 150);
      }
      for (let k = 0; k < 3; k++) {
        const px = cx + (k - 1) * r * 0.2, py = cy + (k === 1 ? -r * 0.04 : r * 0.03);
        const gr = g.createRadialGradient(px - r * 0.05, py - r * 0.06, 0, px, py, r * 0.2);
        gr.addColorStop(0, '#a8663a'); gr.addColorStop(0.5, '#6a3418'); gr.addColorStop(1, '#3c1c0e');
        g.fillStyle = gr; g.beginPath(); g.ellipse(px, py, r * 0.13, r * 0.18, 0, 0, TAU); g.fill();
        g.fillStyle = '#c8b48a'; g.beginPath(); g.ellipse(px, py + r * 0.14, r * 0.08, r * 0.04, 0, 0, TAU); g.fill();
      }
    }
  },
  nut(g, cx, cy, r) {
    const gr = g.createRadialGradient(cx - r * 0.2, cy - r * 0.25, 0, cx, cy, r * 0.85);
    gr.addColorStop(0, '#b0703e'); gr.addColorStop(0.45, '#6e3618'); gr.addColorStop(1, '#3a1a0c');
    g.fillStyle = gr; g.beginPath();
    g.moveTo(cx, cy - r * 0.85); g.quadraticCurveTo(cx + r * 0.85, cy - r * 0.3, cx + r * 0.6, cy + r * 0.6);
    g.quadraticCurveTo(cx, cy + r * 0.9, cx - r * 0.6, cy + r * 0.6); g.quadraticCurveTo(cx - r * 0.85, cy - r * 0.3, cx, cy - r * 0.85); g.fill();
    g.fillStyle = '#c9b68c'; g.beginPath(); g.ellipse(cx, cy + r * 0.62, r * 0.42, r * 0.16, 0, 0, TAU); g.fill();
    g.strokeStyle = '#d8c8a0'; g.lineWidth = Math.max(0.8, r * 0.05); g.beginPath(); g.moveTo(cx, cy - r * 0.85); g.lineTo(cx, cy - r * 1.0); g.stroke();
  },
  // A cluster of glossy fruits on a stalk that enters at the bottom centre of the cell.
  // v: { col, n (number or [min,max]), berry (fruit radius / half cell; default from n), oval (length / width),
  //      tight (stalkless fruits packed on one short stalk, as in flowering dogwood), twin (partridgeberry's two dimples) }
  berries(g, cx, cy, r, rng, v) {
    const col = hex2rgb(v?.col || '#c81e1e');
    const n = Array.isArray(v?.n) ? rng.i(v.n[0], v.n[1]) : (v?.n ?? rng.i(3, 6));
    const oval = v?.oval ?? 1;
    const br = r * (v?.berry ?? v?.size2 ?? clamp(0.5 / Math.sqrt(n + 0.4), 0.14, 0.45));
    const stalkCol = v?.stalk || 'rgba(96,70,40,0.95)';
    const fruit = (px, py, ang, k = 1) => {
      // ang: direction of the fruit's far end (calyx scar), from straight up
      const c = jit(col, rng, 0.008, 0.05, 0.04);
      const rx = br * k, ry = br * oval * k;
      g.save(); g.translate(px, py); g.rotate(ang);
      const gr = g.createRadialGradient(-rx * 0.3, -ry * 0.3, 0, 0, 0, Math.max(rx, ry) * 1.05);
      gr.addColorStop(0, rgb2css(mixRgb(c, [1, 0.96, 0.9], 0.38))); gr.addColorStop(0.35, rgb2css(c)); gr.addColorStop(1, rgb2css(c.map((q) => q * 0.42)));
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
      // persistent calyx: a small dark scar at the far end (two of them on partridgeberry's twin fruit)
      g.fillStyle = rgb2css(c.map((q) => q * 0.22), 0.9);
      if (v?.twin) { for (const sg of [-1, 1]) { g.beginPath(); g.ellipse(sg * rx * 0.3, -ry * 0.55, rx * 0.11, rx * 0.08, 0, 0, TAU); g.fill(); } }
      else { g.beginPath(); g.ellipse(0, -ry * 0.9, rx * 0.16, rx * 0.09, 0, 0, TAU); g.fill(); }
      // highlight
      g.fillStyle = 'rgba(255,250,240,0.6)';
      g.beginPath(); g.ellipse(-rx * 0.36, -ry * 0.36, rx * 0.2, ry * 0.12, -0.7, 0, TAU); g.fill();
      g.restore();
    };
    g.strokeStyle = stalkCol; g.lineCap = 'round';
    const foot = [cx, cy + r * 0.96];
    if (v?.tight) {
      // fruits radiate from the swollen end of one short stalk
      const hub = [cx + rng.f(-0.05, 0.05) * r, cy + r * 0.3];
      g.lineWidth = Math.max(1.2, r * 0.07);
      g.beginPath(); g.moveTo(foot[0], foot[1]); g.quadraticCurveTo(cx, cy + r * 0.6, hub[0], hub[1]); g.stroke();
      const list = [];
      for (let i = 0; i < n; i++) {
        const a = lerp(-1.25, 1.25, n === 1 ? 0.5 : i / (n - 1)) + rng.f(-0.16, 0.16);
        const d = br * oval * rng.f(0.72, 1.0);
        list.push([hub[0] + Math.sin(a) * d, hub[1] - Math.cos(a) * d * 1.05, a, rng.f(0.86, 1.05)]);
      }
      // fruits nearest the centre line sit in front
      list.sort((p1, p2) => Math.abs(p2[2]) - Math.abs(p1[2]));
      for (const q of list) fruit(q[0], q[1], q[2], q[3]);
      g.fillStyle = stalkCol; g.beginPath(); g.arc(hub[0], hub[1], Math.max(1.2, r * 0.06), 0, TAU); g.fill();
      return;
    }
    const pts = [];
    const hub = [cx, cy + r * 0.45];
    const reach = Math.max(0, r * 0.94 - br * Math.max(1, oval));
    for (let i = 0; i < n; i++) {
      let best = null, bd = -1;
      for (let k = 0; k < (n === 1 ? 1 : 14); k++) {
        const a = rng.f(0, TAU), d = n === 1 ? 0 : reach * Math.sqrt(rng.f(0.03, 1));
        const q = [cx + Math.cos(a) * d, cy - r * (n === 1 ? 0.06 : 0.12) + Math.sin(a) * d * 0.85];
        let md = 1e9;
        for (const o of pts) md = Math.min(md, Math.hypot(o[0] - q[0], o[1] - q[1]));
        if (md > bd) { bd = md; best = q; }
        if (md > br * 2.1) break;
      }
      pts.push(best);
    }
    g.lineWidth = Math.max(0.9, r * 0.045);
    g.beginPath(); g.moveTo(foot[0], foot[1]); g.lineTo(hub[0], hub[1]); g.stroke();
    g.lineWidth = Math.max(0.8, r * 0.03);
    for (const q of pts) { g.beginPath(); g.moveTo(hub[0], hub[1]); g.quadraticCurveTo(lerp(hub[0], q[0], 0.3), lerp(hub[1], q[1], 0.75), q[0], q[1]); g.stroke(); }
    pts.sort((p1, p2) => p1[1] - p2[1]);
    for (const q of pts) fruit(q[0], q[1], Math.atan2(q[0] - hub[0], hub[1] - q[1]) * 0.6 + rng.f(-0.25, 0.25));
  },
  // witch hazel: several flowers crowded at a node, each with four narrow, crinkled, strap-shaped yellow petals
  // (1.5-2 cm) spreading from a small tan-brown four-lobed calyx
  hazelflower(g, cx, cy, r, rng) {
    const nf = rng.i(3, 4);
    const ribbon = (fx, fy, a, len, col) => {
      const steps = 9, pts = [];
      let px = fx, py = fy, aa = a;
      const ph = rng.f(0, TAU), kink = rng.f(0.35, 0.7), curl = rng.f(-0.12, 0.12);
      for (let i = 0; i <= steps; i++) {
        pts.push([px, py]);
        aa = a + curl * i + Math.sin(i * 1.9 + ph) * kink * (0.4 + 0.6 * i / steps);
        px += Math.cos(aa) * len / steps; py += Math.sin(aa) * len / steps;
      }
      const wd = Math.max(1.1, r * 0.062);
      // strap of even width with a blunt end; a darker edge line gives the twist
      for (const [k, c, off] of [[1, col, 0], [0.34, col.map((q) => q * 0.78), wd * 0.22]]) {
        g.strokeStyle = rgb2css(c); g.lineWidth = wd * k; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath();
        for (let i = 0; i < pts.length; i++) { const q = pts[i], sgn = Math.sin(i * 1.9 + ph) > 0 ? 1 : -1; if (i === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0] + off * sgn, q[1] + off * sgn); }
        g.stroke();
      }
    };
    const flowers = [];
    for (let f = 0; f < nf; f++) {
      const a = f / nf * TAU + rng.f(-0.5, 0.5), d = r * rng.f(0.08, 0.26);
      flowers.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]);
    }
    // short stalk to the twig
    g.strokeStyle = 'rgba(98,76,50,0.95)'; g.lineWidth = Math.max(1, r * 0.05); g.lineCap = 'round';
    for (const q of flowers) { g.beginPath(); g.moveTo(cx, cy + r * 0.96); g.quadraticCurveTo(cx, cy + r * 0.3, q[0], q[1]); g.stroke(); }
    for (const q of flowers) {
      const rot = rng.f(0, TAU);
      for (let k = 0; k < 4; k++) {
        const col = jit([0.95, 0.80, 0.14], rng, 0.012, 0.06, 0.05);
        ribbon(q[0], q[1], rot + k * Math.PI / 2 + rng.f(-0.3, 0.3), r * rng.f(0.5, 0.68), col);
      }
      // calyx: four tiny recurved lobes, dull yellow-brown, darker in the throat
      for (let k = 0; k < 4; k++) {
        const a = rot + Math.PI / 4 + k * Math.PI / 2;
        g.fillStyle = 'rgb(150,112,48)';
        g.beginPath(); g.ellipse(q[0] + Math.cos(a) * r * 0.05, q[1] + Math.sin(a) * r * 0.05, r * 0.055, r * 0.04, a, 0, TAU); g.fill();
      }
      g.fillStyle = 'rgb(104,58,26)'; g.beginPath(); g.arc(q[0], q[1], r * 0.04, 0, TAU); g.fill();
    }
  },
  // flowering dogwood: next spring's flower bud, a grey flattened "onion" with a short point, on a short stout stalk
  dogbud(g, cx, cy, r, rng, v, box) {
    const hh = box ? box.hh : r, hw = box ? box.hw : r;
    const foot = cy + hh * 0.97, by = cy - hh * 0.1;             // bud centre
    const rx = hw * 0.8, ry = hh * 0.42;
    const lean = rng.f(-0.06, 0.06) * hw;
    // stalk: slightly thickened upward, grey-green to purplish
    g.strokeStyle = 'rgb(104,86,80)'; g.lineCap = 'round'; g.lineWidth = Math.max(1.4, hw * 0.13);
    g.beginPath(); g.moveTo(cx, foot); g.quadraticCurveTo(cx + lean * 0.3, cy + hh * 0.6, cx + lean, by + ry * 0.8); g.stroke();
    const bx = cx + lean;
    const body = () => {
      g.beginPath();
      g.moveTo(bx, by - ry * 1.5);                                // the point
      g.bezierCurveTo(bx + rx * 0.22, by - ry * 1.02, bx + rx * 1.0, by - ry * 0.95, bx + rx, by - ry * 0.05);
      g.bezierCurveTo(bx + rx, by + ry * 0.75, bx + rx * 0.5, by + ry, bx, by + ry);
      g.bezierCurveTo(bx - rx * 0.5, by + ry, bx - rx, by + ry * 0.75, bx - rx, by - ry * 0.05);
      g.bezierCurveTo(bx - rx * 1.0, by - ry * 0.95, bx - rx * 0.22, by - ry * 1.02, bx, by - ry * 1.5);
      g.closePath();
    };
    const c = jit([0.64, 0.63, 0.57], rng, 0.01, 0.03, 0.04);
    const gr = g.createRadialGradient(bx - rx * 0.35, by - ry * 0.3, 0, bx, by, rx * 1.25);
    gr.addColorStop(0, rgb2css(mixRgb(c, [1, 1, 0.96], 0.42))); gr.addColorStop(0.5, rgb2css(c)); gr.addColorStop(1, rgb2css(c.map((q) => q * 0.5)));
    g.fillStyle = gr; body(); g.fill();
    // the two outer bud scales meet in a seam that runs over the top
    g.strokeStyle = rgb2css(c.map((q) => q * 0.52), 0.8); g.lineWidth = Math.max(0.7, hw * 0.045);
    g.beginPath(); g.moveTo(bx, by - ry * 1.45); g.bezierCurveTo(bx + rx * 0.2, by - ry * 0.4, bx + rx * 0.12, by + ry * 0.5, bx + rx * 0.05, by + ry * 0.98); g.stroke();
    g.strokeStyle = rgb2css(mixRgb(c, [1, 1, 1], 0.5), 0.5);
    g.beginPath(); g.moveTo(bx - rx * 0.03, by - ry * 1.4); g.bezierCurveTo(bx + rx * 0.12, by - ry * 0.4, bx + rx * 0.05, by + ry * 0.4, bx - rx * 0.02, by + ry * 0.9); g.stroke();
  },
  // great rhododendron: the terminal flower bud, a pale green pointed cone of overlapping scales
  rhodobud(g, cx, cy, r, rng, v, box) {
    const hh = box ? box.hh : r, hw = box ? box.hw : r;
    const y0 = cy + hh * 0.97, y1 = cy - hh * 0.97, H = y0 - y1;
    const halfAt = (t) => hw * 0.92 * Math.pow(Math.sin(Math.PI * Math.pow(clamp(t * 0.94 + 0.03), 0.62)), 0.85);   // t: 0 base .. 1 tip
    const lean = rng.f(-0.04, 0.04) * hw;
    const xAt = (t) => cx + lean * t * t;
    const c0 = jit([0.66, 0.75, 0.46], rng, 0.012, 0.05, 0.04);
    // silhouette
    g.beginPath();
    for (let i = 0; i <= 24; i++) { const t = i / 24; g.lineTo(xAt(t) + halfAt(t), y0 - H * t); }
    for (let i = 24; i >= 0; i--) { const t = i / 24; g.lineTo(xAt(t) - halfAt(t), y0 - H * t); }
    g.closePath();
    const gr = g.createLinearGradient(cx - hw, 0, cx + hw, 0);
    gr.addColorStop(0, rgb2css(c0.map((q) => q * 0.72))); gr.addColorStop(0.4, rgb2css(mixRgb(c0, [1, 1, 0.85], 0.25))); gr.addColorStop(1, rgb2css(c0.map((q) => q * 0.6)));
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    // imbricate scales: rows of pointed scales, each row offset, drawn from the tip downward so lower rows overlap
    const rows = 7;
    for (let k = rows - 1; k >= 0; k--) {
      const t = (k + 0.3) / rows, yy = y0 - H * t, wdt = halfAt(Math.min(1, t + 0.05));
      const m = k % 2 ? 2 : 3;
      for (let j = 0; j < m; j++) {
        const fx = m === 1 ? 0 : (j / (m - 1)) * 2 - 1;
        const sx = xAt(t) + fx * wdt * 0.78, sw2 = wdt * (m === 2 ? 0.62 : 0.5), sh2 = H * 0.26;
        const c = jit(mixRgb(c0, [0.86, 0.84, 0.5], t * 0.35), rng, 0.01, 0.05, 0.04);
        const sg = g.createLinearGradient(0, yy - sh2, 0, yy + sh2 * 0.2);
        sg.addColorStop(0, rgb2css(mixRgb(c, [0.62, 0.5, 0.3], 0.3))); sg.addColorStop(0.25, rgb2css(mixRgb(c, [1, 1, 0.9], 0.18))); sg.addColorStop(1, rgb2css(c.map((q) => q * 0.8)));
        g.fillStyle = sg;
        g.beginPath();
        g.moveTo(sx, yy - sh2);
        g.bezierCurveTo(sx + sw2 * 0.9, yy - sh2 * 0.55, sx + sw2, yy - sh2 * 0.1, sx + sw2 * 0.8, yy + sh2 * 0.25);
        g.lineTo(sx - sw2 * 0.8, yy + sh2 * 0.25);
        g.bezierCurveTo(sx - sw2, yy - sh2 * 0.1, sx - sw2 * 0.9, yy - sh2 * 0.55, sx, yy - sh2);
        g.fill();
        g.strokeStyle = rgb2css(c.map((q) => q * 0.55), 0.55); g.lineWidth = Math.max(0.6, hw * 0.03); g.stroke();
      }
    }
    g.restore();
  },
  // sourwood: drooping one-sided sprays of tan capsules
  capsules(g, cx, cy, r, rng) {
    for (let k = 0; k < 5; k++) {
      const a0 = lerp(-0.9, 0.9, k / 4) + rng.f(-0.1, 0.1);
      let px = cx, py = cy - r * 0.9;
      g.strokeStyle = 'rgba(170,150,105,0.95)'; g.lineWidth = Math.max(0.8, r * 0.025);
      g.beginPath(); g.moveTo(px, py);
      const pts = [];
      for (let s = 1; s <= 12; s++) {
        const a = a0 * (1 - s / 16);
        px += Math.sin(a) * r * 0.14; py += Math.cos(a) * r * 0.14; g.lineTo(px, py); pts.push([px, py]);
      }
      g.stroke();
      g.fillStyle = 'rgb(196,176,128)';
      for (const p of pts) { g.beginPath(); g.ellipse(p[0] + r * 0.02, p[1], r * 0.028, r * 0.045, 0, 0, TAU); g.fill(); }
    }
  },
  // white wood aster flower head
  asterflower(g, cx, cy, r, rng, v) {
    if (v?.fluff) {
      // gone to seed: a small globe of tan pappus bristles round a dark receptacle
      for (let i = 0; i < 90; i++) {
        const a = rng.f(0, TAU), l = r * rng.f(0.45, 0.82);
        g.strokeStyle = rgb2css(jit([0.84, 0.78, 0.64], rng, 0.01, 0.05, 0.07), 0.8); g.lineWidth = Math.max(0.6, r * 0.022);
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.1, cy + Math.sin(a) * r * 0.1); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke();
      }
      const gr0 = g.createRadialGradient(cx, cy, 0, cx, cy, r * 0.22);
      gr0.addColorStop(0, '#6a5234'); gr0.addColorStop(1, 'rgba(120,96,60,0)');
      g.fillStyle = gr0; g.beginPath(); g.arc(cx, cy, r * 0.22, 0, TAU); g.fill();
      return;
    }
    const n = rng.i(6, 10);
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + rng.f(-0.15, 0.15);
      g.fillStyle = rgb2css(jit([0.96, 0.96, 0.94], rng, 0.0, 0.02, 0.03));
      g.beginPath(); g.ellipse(cx + Math.cos(a) * r * 0.52, cy + Math.sin(a) * r * 0.52, r * 0.42, r * 0.12, a, 0, TAU); g.fill();
    }
    const c = rng.chance(0.5) ? '#d8b830' : '#9a5a6a';
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r * 0.26);
    gr.addColorStop(0, c); gr.addColorStop(1, '#6a4a28');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 0.24, 0, TAU); g.fill();
  },
  // bottlebrush grass spike: pairs of spikelets standing square to the axis, each ending in long straight bristles
  bottlebrush(g, cx, cy, r, rng) {
    const hh = r, hw = r * 0.44;
    g.strokeStyle = 'rgba(176,156,100,0.95)'; g.lineWidth = Math.max(0.9, hw * 0.05); g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, cy + hh); g.lineTo(cx, cy - hh * 0.9); g.stroke();
    const nodes = 15;
    for (let i = 0; i < nodes; i++) {
      const t = i / (nodes - 1), yy = cy + hh * 0.55 - t * hh * 1.4;
      const k = 0.75 + 0.25 * Math.sin(Math.PI * clamp(t * 0.9 + 0.1));
      for (const sg of [-1, 1]) {
        if (rng.chance(0.08)) continue;                           // a few spikelets have already dropped
        for (let q = 0; q < 2; q++) {
          const up = rng.f(0.05, 0.5) + q * 0.12, l = hw * rng.f(0.82, 1.0) * k;
          const c = jit([0.80, 0.71, 0.46], rng, 0.01, 0.08, 0.08);
          const ex = cx + sg * Math.cos(up) * l, ey = yy - Math.sin(up) * l;
          // glumes and lemma: a short stout body, then the awn
          g.strokeStyle = rgb2css(c, 0.97); g.lineWidth = Math.max(1, hw * 0.075);
          g.beginPath(); g.moveTo(cx, yy); g.lineTo(lerp(cx, ex, 0.3), lerp(yy, ey, 0.3)); g.stroke();
          g.lineWidth = Math.max(0.6, hw * 0.022);
          g.beginPath(); g.moveTo(lerp(cx, ex, 0.25), lerp(yy, ey, 0.25)); g.lineTo(ex, ey); g.stroke();
          g.beginPath(); g.moveTo(lerp(cx, ex, 0.2), lerp(yy, ey, 0.2)); g.lineTo(lerp(cx, ex, 0.85) , lerp(yy, ey, 0.85) + hw * rng.f(0.04, 0.12)); g.stroke();
        }
      }
    }
  },
  // airy panicle (wavy hair-grass, panic grass)
  panicle(g, cx, cy, r, rng, v) {
    const col = v?.col ? hex2rgb(v.col) : [0.72, 0.6, 0.45];
    const branch = (px, py, a, l, d) => {
      const ex = px + Math.sin(a) * l, ey = py - Math.cos(a) * l;
      g.strokeStyle = rgb2css(col, 0.85); g.lineWidth = Math.max(0.5, r * 0.012 * (3 - d) / 3);
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + Math.sin(a) * l * 0.5 + rng.f(-1, 1) * l * 0.15, py - Math.cos(a) * l * 0.5, ex, ey); g.stroke();
      if (d >= 2) { g.fillStyle = rgb2css(jit(col, rng, 0.02, 0.1, 0.1)); g.beginPath(); g.ellipse(ex, ey, r * 0.02, r * 0.045, a, 0, TAU); g.fill(); return; }
      const n = d === 0 ? 7 : 3;
      for (let i = 0; i < n; i++) {
        const t = (i + 1) / (n + 0.5);
        branch(lerp(px, ex, t), lerp(py, ey, t), a + (i % 2 ? 1 : -1) * rng.f(0.5, 1.1), l * (1 - t * 0.6) * rng.f(0.3, 0.5), d + 1);
      }
    };
    branch(cx, cy + r, 0, r * 1.9, 0);
  },
  // sedge / small flower spike or generic small white flowers
  whiteflowers(g, cx, cy, r, rng) {
    for (let i = 0; i < 12; i++) {
      const px = cx + rng.f(-0.7, 0.7) * r, py = cy + rng.f(-0.7, 0.7) * r;
      g.fillStyle = 'rgba(240,238,228,0.95)';
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.beginPath(); g.ellipse(px + Math.cos(a) * r * 0.06, py + Math.sin(a) * r * 0.06, r * 0.06, r * 0.035, a, 0, TAU); g.fill(); }
    }
  },
  // dried fern-ally / generic dead leaf scrap used in litter
  twigbit(g, cx, cy, r, rng) {
    g.strokeStyle = rgb2css(jit([0.30, 0.22, 0.14], rng, 0.02, 0.1, 0.08)); g.lineCap = 'round';
    g.lineWidth = Math.max(1.2, r * rng.f(0.03, 0.07));
    g.beginPath(); g.moveTo(cx - r * 0.9, cy + rng.f(-0.2, 0.2) * r);
    g.quadraticCurveTo(cx, cy + rng.f(-0.3, 0.3) * r, cx + r * 0.9, cy + rng.f(-0.2, 0.2) * r); g.stroke();
    if (rng.chance(0.6)) { g.lineWidth *= 0.6; g.beginPath(); g.moveTo(cx - r * 0.1, cy); g.lineTo(cx + r * 0.3, cy - r * 0.45); g.stroke(); }
  },
};

// Sprite proportions (width / height) for extras that are not round; everything else is painted in a square.
const EXTRA_ASPECT = { rhodobud: 0.5, dogbud: 0.72 };

/**
 * Paint one fruit / flower / bud sprite. Leaf cells are often tall and narrow, so the sprite is painted in the largest
 * box of its own proportions that fits the cell, centred, and that box (not the whole cell) is returned as the sprite's
 * UV rectangle: `size` (metres) is the height of that box, `aspect` its width / height. Attachment is at the bottom centre.
 */
export function paintExtra(ctx, hctx, cell, extra, rng) {
  const { x, y, w, h } = cell;
  const asp = EXTRA_ASPECT[extra.kind] ?? 1;
  let sh = h - 6, sw = sh * asp;
  if (sw > w - 6) { sw = w - 6; sh = sw / asp; }
  const r = Math.min(sw, sh) / 2;
  const cx = x + w / 2, cy = y + h / 2;
  const fn = EXTRAS[extra.kind];
  if (!fn) throw new Error('unknown extra ' + extra.kind);
  for (const [g, relief] of [[ctx, false], [hctx, true]]) {
    if (!g) continue;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.lineCap = 'round';
    if (relief) {
      // relief: a soft dome
      g.translate(cx, cy); g.scale(sw / (2 * r), sh / (2 * r));
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, 'rgb(210,210,210)'); gr.addColorStop(1, 'rgba(120,120,120,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.8, 0, TAU); g.fill();
    } else fn(g, cx, cy, r, rng, extra, { hw: sw / 2, hh: sh / 2 });
    g.restore();
  }
  const CW = ctx.canvas.width, CH = ctx.canvas.height, pad = 1.5;
  return {
    u0: (cx - sw / 2 - pad) / CW, u1: (cx + sw / 2 + pad) / CW, v0: 1 - (cy + sh / 2 + pad) / CH, v1: 1 - (cy - sh / 2 - pad) / CH,
    petFrac: 0, bladeFrac: 1, widthFrac: 1, aspect: (sw + 2 * pad) / (sh + 2 * pad), extra: extra.kind,
  };
}
