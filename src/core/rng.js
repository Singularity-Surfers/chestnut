// Deterministic random + noise utilities (CPU side).

export function hash32(a) {
  a |= 0;
  a = (a + 0x7ed55d16 + (a << 12)) | 0;
  a = a ^ 0xc761c23c ^ (a >>> 19);
  a = (a + 0x165667b1 + (a << 5)) | 0;
  a = ((a + 0xd3a2646c) | 0) ^ (a << 9);
  a = (a + 0xfd7046c5 + (a << 3)) | 0;
  a = a ^ 0xb55a4f09 ^ (a >>> 16);
  return a >>> 0;
}

export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 based RNG with helpers
export class RNG {
  constructor(seed = 1) {
    this.s = (typeof seed === 'string' ? hashStr(seed) : seed) >>> 0;
    if (this.s === 0) this.s = 0x9e3779b9;
  }
  next() {
    let t = (this.s += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  f(a = 1, b) {
    if (b === undefined) return this.next() * a;
    return a + (b - a) * this.next();
  }
  i(a, b) {
    return Math.floor(this.f(a, b + 1));
  }
  chance(p) {
    return this.next() < p;
  }
  // gaussian (Box-Muller)
  n(mean = 0, sd = 1) {
    const u = Math.max(1e-9, this.next());
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * v);
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length) % arr.length];
  }
  // weighted pick: weights array of numbers
  wpick(weights) {
    let s = 0;
    for (let i = 0; i < weights.length; i++) s += weights[i];
    let r = this.next() * s;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }
  fork(tag) {
    return new RNG(hash32(this.s ^ hashStr(String(tag))));
  }
}

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const remap = (x, a, b, c, d) => c + (d - c) * clamp((x - a) / (b - a));

// ---------- value/gradient noise ----------
function h2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}

const G2 = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071],
  [0.9239, 0.3827], [-0.9239, 0.3827], [0.9239, -0.3827], [-0.9239, -0.3827],
  [0.3827, 0.9239], [-0.3827, 0.9239], [0.3827, -0.9239], [-0.3827, -0.9239],
];

// 2D gradient (Perlin) noise in [-1,1]
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const g00 = G2[h2(ix, iy, seed) & 15], g10 = G2[h2(ix + 1, iy, seed) & 15];
  const g01 = G2[h2(ix, iy + 1, seed) & 15], g11 = G2[h2(ix + 1, iy + 1, seed) & 15];
  const n00 = g00[0] * fx + g00[1] * fy;
  const n10 = g10[0] * (fx - 1) + g10[1] * fy;
  const n01 = g01[0] * fx + g01[1] * (fy - 1);
  const n11 = g11[0] * (fx - 1) + g11[1] * (fy - 1);
  return 1.5 * (n00 + (n10 - n00) * u + (n01 + (n11 - n01) * u - (n00 + (n10 - n00) * u)) * v);
}

export function fbm2(x, y, oct = 5, seed = 0, lac = 2.0, gain = 0.5) {
  let a = 1, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise2(x * f, y * f, seed + i * 17);
    n += a;
    a *= gain;
    f *= lac;
  }
  return s / n;
}

// ridged multifractal in [0,1]
export function ridged2(x, y, oct = 5, seed = 0, lac = 2.0, gain = 0.5) {
  let a = 1, f = 1, s = 0, n = 0, w = 1;
  for (let i = 0; i < oct; i++) {
    let v = 1 - Math.abs(noise2(x * f, y * f, seed + i * 31));
    v *= v;
    s += a * v * w;
    w = clamp(v * 1.6);
    n += a;
    a *= gain;
    f *= lac;
  }
  return s / n;
}

// hash to [0,1) from 2 ints
export function rand2(ix, iy, seed = 0) {
  return h2(ix, iy, seed) / 4294967296;
}

// worley F1 distance (2D), returns [dist, cellRandom]
export function worley2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let best = 9, bid = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i, cy = iy + j;
      const px = cx + rand2(cx, cy, seed), py = cy + rand2(cx, cy, seed + 7);
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < best) { best = d; bid = rand2(cx, cy, seed + 13); }
    }
  return [Math.sqrt(best), bid];
}

// HSV/HSL helpers (all 0..1)
export function hsl2rgb(h, s, l) {
  h = ((h % 1) + 1) % 1;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}
export function rgb2hsl(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}
export function hex2rgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export function rgb2css(c, a = 1) {
  return `rgba(${Math.round(clamp(c[0]) * 255)},${Math.round(clamp(c[1]) * 255)},${Math.round(clamp(c[2]) * 255)},${a})`;
}
export function mixRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
export const srgb2lin = (c) => c.map((v) => Math.pow(v, 2.2));
