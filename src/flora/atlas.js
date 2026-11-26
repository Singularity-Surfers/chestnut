// Leaf sheets -> GPU textures, and the branchlet ("cluster") atlas baker.
// A cluster card is a top-down render of a real twig: leaves placed by the species' phyllotaxis
// (alternate, two-ranked, opposite, whorled, compound), with petioles, fruit and bark-coloured twigs.
import * as THREE from 'three';
import { FSPass } from '../core/engine.js';
import { RNG, clamp, lerp, hex2rgb } from '../core/rng.js';
import { paintLeafSheet } from './leafpaint.js';
import { LEAVES } from './leaves.js';

const S2L = (c) => c.map((v) => Math.pow(v, 2.2));

const BAKE_VS = /* glsl */ `
attribute vec3 col;
attribute float kind;
varying vec2 vUv; varying vec3 vCol; varying float vKind; varying vec3 vN; varying float vZ;
void main(){
  vUv = uv; vCol = col; vKind = kind; vN = normal; vZ = position.z;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0);
}`;
const BAKE_FS = /* glsl */ `
uniform sampler2D tLeaf; uniform sampler2D tLeafH; uniform float uPass; uniform float uBump; uniform vec2 uZRange;
varying vec2 vUv; varying vec3 vCol; varying float vKind; varying vec3 vN; varying float vZ;
void main(){
  vec4 t = vKind < 0.5 ? texture2D(tLeaf, vUv) : vec4(1.0);
  float a = t.a;
  if (vKind > 0.5 && vKind < 1.5) a = 1.0;
  bool litter = uPass > 1.5;
  if (a < (litter ? 0.5 : 0.08)) discard;
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float hgt = clamp((vZ - uZRange.x)/(uZRange.y - uZRange.x), 0.0, 1.0);
  if (uPass < 0.5 || (litter && uPass < 2.5)){
    vec3 c = vKind < 0.5 ? t.rgb*vCol : vCol;
    if (vKind > 0.5) c *= 0.55 + 0.45*sin(vUv.x*3.14159);
    if (litter){
      // deep layers are dark and damp
      c *= mix(0.42, 1.0, smoothstep(0.0, 0.55, hgt));
      gl_FragColor = vec4(c, hgt);
    } else {
      // leaves lower in the stack sit in the shade of those above
      c *= mix(0.62, 1.0, smoothstep(-0.05, 0.05, vZ));
      gl_FragColor = vec4(c, a);
    }
  } else {
    if (vKind < 0.5){
      float h = texture2D(tLeafH, vUv).r;
      vec2 g = clamp(vec2(dFdx(h), dFdy(h))*uBump, -0.6, 0.6);
      n = normalize(n - vec3(g, 0.0));
    } else {
      n = normalize(n + vec3((vUv.x - 0.5)*1.6, 0.0, 0.0));
    }
    if (litter) gl_FragColor = vec4(n.xy*0.5 + 0.5, mix(0.4, 1.0, smoothstep(0.0, 0.6, hgt)), vKind < 0.5 ? 1.0 : 0.3);
    else gl_FragColor = vec4(n.xy*0.5 + 0.5, vKind < 0.5 ? 1.0 : 0.0, a);
  }
}`;

class GeoBuf {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.k = []; this.i = []; }
  get count() { return this.p.length / 3; }
}

function addLeaf(b, x, y, yaw, H, W, cell, o) {
  // o: { tilt, roll, curl, keel, z, shade:[r,g,b] }
  if (b.rec) { b.rec.push({ x, y, yaw, H, W, cell, tilt: o.tilt, roll: o.roll, curl: o.curl, keel: o.keel, z: o.z, shade: o.shade[1] }); return; }
  const nu = 3, nv = 4;
  const base = b.count;
  const cr = Math.cos(o.roll), sr = Math.sin(o.roll), ct = Math.cos(o.tilt), st = Math.sin(o.tilt);
  const cyw = Math.cos(yaw), syw = Math.sin(yaw);
  const P = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const u = i / (nu - 1) - 0.5, v = j / (nv - 1);
    const lx = u * W, ly = v * H;
    const lz = -o.curl * H * v * v + o.keel * Math.abs(u) * W;
    const x1 = lx * cr + lz * sr, z1 = -lx * sr + lz * cr;
    const y2 = ly * ct - z1 * st, z2 = ly * st + z1 * ct;
    // yaw: 0 points along +y
    const px = x + x1 * cyw + y2 * syw, py = y - x1 * syw + y2 * cyw;
    P.push([px, py, z2 + o.z]);
    b.uv.push(lerp(cell.u0, cell.u1, i / (nu - 1)), lerp(cell.v0, cell.v1, v));
    b.c.push(o.shade[0], o.shade[1], o.shade[2]);
    b.k.push(o.kind ?? 0);
  }
  // normals
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = P[j * nu + Math.max(0, i - 1)], c = P[j * nu + Math.min(nu - 1, i + 1)];
    const d = P[Math.max(0, j - 1) * nu + i], e = P[Math.min(nv - 1, j + 1) * nu + i];
    const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2];
    const vx = e[0] - d[0], vy = e[1] - d[1], vz = e[2] - d[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const p = P[j * nu + i];
    b.p.push(p[0], p[1], p[2]);
    b.n.push(nx / l, ny / l, nz / l);
  }
  for (let j = 0; j < nv - 1; j++) for (let i = 0; i < nu - 1; i++) {
    const a = base + j * nu + i, c = a + 1, d = a + nu, e = d + 1;
    b.i.push(a, c, d, c, e, d);
  }
}

function addTwig(b, pts, w0, w1, col, z) {
  // ribbon along pts [[x,y],...]
  if (b.rec) { b.twigs.push({ pts, w0, w1 }); return; }
  const base = b.count;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[Math.min(n - 1, i + 1)], r = pts[Math.max(0, i - 1)];
    let dx = q[0] - r[0], dy = q[1] - r[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = lerp(w0, w1, i / (n - 1)) * 0.5;
    for (const sg of [-1, 1]) {
      b.p.push(p[0] - dy * w * sg, p[1] + dx * w * sg, z);
      b.n.push(0, 0, 1); b.uv.push(sg > 0 ? 1 : 0, i / (n - 1)); b.c.push(col[0], col[1], col[2]); b.k.push(1);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a = base + i * 2;
    b.i.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
}

/** Lay out one cluster in card space (unit square, twig base at (0.5, 0)). */
function layoutCluster(b, spec, sheet, cl, cardSize, density, rng, o = {}) {
  const ox = o.x ?? 0.5, oy = o.y ?? 0, oa = o.ang ?? 0, ok = o.reach ?? 1;   // where the twig starts, its heading, and its scale within the card
  const L = spec.len / cardSize;                      // blade length in card units
  const cells = sheet.cells;
  const weights = cells.map((c) => c.weight);
  const twigCol = S2L(hex2rgb(cl.twig || '#4a3a2a'));
  const pick = () => cells[rng.wpick(weights)];
  const shadeOf = () => { const s = rng.f(0.82, 1.08); return [s * rng.f(0.96, 1.04), s, s * rng.f(0.96, 1.04)]; };
  const dims = (cell, scale) => {
    const H = (L * scale) / cell.bladeFrac;
    return [H, H * cell.aspect];
  };
  const leaf = (x, y, yaw, scale, o = {}) => {
    const cell = pick();
    const [H, W] = dims(cell, scale);
    addLeaf(b, x, y, yaw, H, W, cell, {
      tilt: o.tilt ?? rng.f(-0.25, 0.3) * (cl.tilt ?? 1), roll: o.roll ?? rng.f(-0.4, 0.4) * (cl.roll ?? 1),
      curl: o.curl ?? rng.f(0.0, 0.25) * (cl.curl ?? 1), keel: o.keel ?? rng.f(-0.05, 0.12) * (cl.keel ?? 1),
      z: o.z ?? rng.f(-0.04, 0.04), shade: shadeOf(),
    });
  };
  const extra = (name, x, y, yaw, o = {}) => {
    const list = sheet.extraCells[name];
    if (!list) return;
    const cell = rng.pick(list);
    const H = (cell.size / cardSize) * rng.f(0.85, 1.15);
    addLeaf(b, x - Math.sin(yaw) * H * 0.5 * (o.center ? 1 : 0), y - Math.cos(yaw) * H * 0.5 * (o.center ? 1 : 0), yaw, H, H * cell.aspect, cell,
      { tilt: 0, roll: 0, curl: 0, keel: 0, z: o.z ?? 0.06, shade: [1, 1, 1] });
  };
  const comp = spec.compound;
  // one "leaf unit" at a node: simple leaf or compound leaf
  const unit = (x, y, yaw, scale, o = {}) => {
    if (!comp) { leaf(x, y, yaw, scale, o); return; }
    const z = o.z ?? rng.f(-0.03, 0.03);
    if (comp.type === 'pinnate') {
      const R = (comp.rachis / cardSize) * scale, pet = (comp.petiole / cardSize) * scale;
      const pairs = (comp.n - 1) / 2;
      const pts = [];
      const bend = rng.f(-0.25, 0.25);
      for (let i = 0; i <= 6; i++) {
        const t = i / 6, a = yaw + bend * t;
        pts.push([x + Math.sin(a) * (pet + R) * t, y + Math.cos(a) * (pet + R) * t]);
      }
      addTwig(b, pts, 0.012 * scale, 0.005 * scale, S2L(hex2rgb(cl.rachis || '#8a7a3a')), z - 0.002);
      for (let i = 0; i < pairs; i++) {
        const t = (pet + R * (i + 0.6) / (pairs + 0.2)) / (pet + R);
        const a = yaw + bend * t;
        const px = x + Math.sin(a) * (pet + R) * t, py = y + Math.cos(a) * (pet + R) * t;
        const sz = comp.sizes[Math.min(i, comp.sizes.length - 1)];
        for (const sg of [-1, 1]) leaf(px, py, a + sg * rng.f(0.85, 1.1), scale * sz, { z: z + rng.f(-0.01, 0.01), tilt: rng.f(-0.15, 0.2) });
      }
      const e = pts[pts.length - 1];
      leaf(e[0], e[1], yaw + bend, scale * comp.sizes[comp.sizes.length - 1], { z: z + 0.01 });
    } else {
      // palmate
      const pet = (comp.petiole / cardSize) * scale;
      const ex = x + Math.sin(yaw) * pet, ey = y + Math.cos(yaw) * pet;
      addTwig(b, [[x, y], [ex, ey]], 0.010 * scale, 0.007 * scale, S2L(hex2rgb(cl.rachis || '#8a6a3a')), z - 0.002);
      const n = comp.n;
      for (let i = 0; i < n; i++) {
        const f = n === 1 ? 0 : i / (n - 1) * 2 - 1;
        const sz = comp.sizes[Math.min(comp.sizes.length - 1, Math.round((1 - Math.abs(f)) * (comp.sizes.length - 1)))];
        leaf(ex, ey, yaw + f * (comp.spread ?? 1.25), scale * sz, { z: z + (1 - Math.abs(f)) * 0.012 + rng.f(-0.004, 0.004), tilt: rng.f(-0.1, 0.25) });
      }
    }
  };

  const arr = spec.arr;
  const grow = (x0, y0, ang0, len, depth, nodes) => {
    const pts = [];
    let a = ang0;
    const wob = cl.wobble ?? 0.12;
    const zig = cl.zigzag ?? 0;
    let x = x0, y = y0;
    const seg = len / nodes;
    const out = [];
    pts.push([x, y]);
    for (let i = 0; i < nodes; i++) {
      a += rng.f(-wob, wob) + (i % 2 ? zig : -zig);
      x += Math.sin(a) * seg * (1 - 0.35 * i / nodes); y += Math.cos(a) * seg * (1 - 0.35 * i / nodes);
      pts.push([x, y]);
      out.push({ x, y, a, i });
    }
    const tw = (cl.twigW ?? 0.012) * (depth ? 0.6 : 1) * ok;
    addTwig(b, pts, tw, tw * 0.4, twigCol, -0.06 + depth * 0.002);
    const skipTo = depth === 0 ? Math.floor(nodes * (cl.bare ?? 0.08)) : 0;
    for (const nd of out) {
      if (nd.i < skipTo) continue;
      const tipness = nd.i / (nodes - 1 || 1);
      const scale = (cl.scale ?? 1) * lerp(1.0, 0.82, tipness) * rng.f(0.85, 1.1);
      const last = nd.i === nodes - 1;
      if (rng.chance(1 - density) && !last) continue;
      if (arr === 'whorl' || arr === 'whorl3') {
        if (!last) continue;
        const k = arr === 'whorl3' ? 3 : rng.i(cl.whorl?.[0] ?? 5, cl.whorl?.[1] ?? 8);
        const off = rng.f(0, 6.28);
        for (let q = 0; q < k; q++) {
          const ya = off + q / k * 6.283 + rng.f(-0.2, 0.2);
          // leaves pointing back toward the twig base are hidden beneath / foreshortened
          leaf(nd.x, nd.y, ya, scale * rng.f(0.8, 1.05), { tilt: rng.f(-0.5, -0.05) * (cl.droop ?? 1), z: rng.f(0.0, 0.05), curl: rng.f(0.05, 0.3) });
        }
        // next year's bud sits in the middle of the whorl, pointing along the shoot
        if (cl.extras) for (const ex of cl.extras) if (rng.chance(ex.p)) extra(ex.name, nd.x, nd.y, nd.a + rng.f(-0.3, 0.3), { z: 0.07, center: ex.center });
        continue;
      }
      if (arr === 'opp') {
        const flat = nd.i % 2 === 0;
        for (const sg of [-1, 1]) {
          if (flat) unit(nd.x, nd.y, nd.a + sg * rng.f(0.85, 1.2), scale);
          else unit(nd.x, nd.y, nd.a + sg * rng.f(0.25, 0.6), scale * 0.9, { tilt: sg * rng.f(0.5, 0.85), z: sg * 0.03 });
        }
      } else if (arr === 'alt2' || arr === 'spray') {
        const sg = nd.i % 2 ? 1 : -1;
        unit(nd.x, nd.y, nd.a + sg * rng.f(0.8, 1.1) * (cl.spread ?? 1), scale, { tilt: rng.f(-0.12, 0.12), roll: rng.f(-0.2, 0.2) });
      } else {
        // spiral alternate: leaves to both sides, some toward / away from the viewer
        const ph = nd.i * 2.4 + depth;
        const sg = Math.sin(ph) >= 0 ? 1 : -1;
        const inPlane = Math.abs(Math.sin(ph));
        unit(nd.x, nd.y, nd.a + sg * lerp(0.25, 1.15, inPlane) * (cl.spread ?? 1), scale, { tilt: (1 - inPlane) * rng.f(0.3, 0.8) * (rng.chance(0.5) ? 1 : -1) + rng.f(-0.2, 0.2) });
      }
      if (last && arr !== 'opp') unit(nd.x, nd.y, nd.a + rng.f(-0.25, 0.25), scale * 0.95);
      // fruit / flowers
      if (cl.extras) for (const ex of cl.extras) {
        if (rng.chance(ex.p * (last ? (ex.tip ?? 1) : 1))) extra(ex.name, nd.x, nd.y, nd.a + rng.f(-1.2, 1.2), { z: 0.07, center: ex.center });
      }
      // side twigs
      if (depth === 0 && !last && nd.i >= 1 && rng.chance(Math.min(0.8, (cl.branch ?? 0.3) * 1.3))) {
        const sg = (nd.i % 2 ? 1 : -1) * (rng.chance(0.8) ? 1 : -1);
        grow(nd.x, nd.y, nd.a + sg * rng.f(0.5, 0.95), len * (1 - nd.i / nodes) * rng.f(0.6, 0.9), 1, Math.max(2, Math.round(nodes * (1 - nd.i / nodes) * 0.85)));
      }
    }
  };
  const nodes = Math.max(2, Math.round(rng.f(cl.nodes[0], cl.nodes[1]) * (cl.nodeMul ?? 1.45) * (0.55 + 0.45 * density)));
  const reach = (cl.reach ?? 0.82) * ok;
  grow(ox, oy, oa + rng.f(-0.08, 0.08), reach * rng.f(0.92, 1.0), 0, nodes);
  // a second, shorter shoot from the base fills the card on full-density variants
  if (density > 0.7 && (cl.fill ?? 1) > 0) {
    const sg = rng.chance(0.5) ? 1 : -1;
    grow(ox, oy, oa + sg * rng.f(0.35, 0.6), reach * rng.f(0.55, 0.75), 1, Math.max(2, Math.round(nodes * 0.6)));
    if (density > 0.9) grow(ox, oy, oa - sg * rng.f(0.3, 0.55), reach * rng.f(0.45, 0.68), 1, Math.max(2, Math.round(nodes * 0.5)));
  }
}

export class Flora {
  constructor(renderer, seed, res = 1024) {
    this.r = renderer;
    this.seed = seed;
    this.res = res;
    this.sheets = new Map();
    this.atlases = new Map();
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 10);
    this.cam.position.set(0, 0, 5);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tLeaf: { value: null }, tLeafH: { value: null }, uPass: { value: 0 }, uBump: { value: 1 }, uZRange: { value: new THREE.Vector2(0, 1) } },
      vertexShader: BAKE_VS, fragmentShader: BAKE_FS, side: THREE.DoubleSide,
    });
    this.mat.alphaToCoverage = true;
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  /** Painted sprite sheet for a species (albedo + relief), with GPU textures. */
  sheet(id) {
    let s = this.sheets.get(id);
    if (s) return s;
    const spec = LEAVES[id];
    if (!spec) throw new Error('no leaf spec for ' + id);
    let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    s = paintLeafSheet(spec, (this.seed * 7919 + h) >>> 0);
    s.spec = spec;
    const mk = (canvas, srgb) => {
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = true; t.anisotropy = 4;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    };
    if (s.pixels) {
      const t = new THREE.DataTexture(s.pixels, s.canvas.width, s.canvas.height, THREE.RGBAFormat, THREE.UnsignedByteType);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = true; t.anisotropy = 4;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true;
      s.tex = t;
    } else s.tex = mk(s.canvas, true);
    s.htex = mk(s.hcanvas, false);
    this.sheets.set(id, s);
    return s;
  }

  /** Normal map (rg) + thickness (b) for a sheet, computed from the relief canvas. */
  sheetNormal(id) {
    const s = this.sheet(id);
    if (s.ntex) return s.ntex;
    const w = s.hcanvas.width, h = s.hcanvas.height;
    const src = s.hcanvas.getContext('2d').getImageData(0, 0, w, h).data;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const out = ctx.createImageData(w, h);
    const H = (x, y) => src[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4] / 255;
    const k = 2.2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y - 1) - H(x, y + 1)) * k;
      const l = 1 / Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      out.data[i] = (-dx * l * 0.5 + 0.5) * 255; out.data[i + 1] = (-dy * l * 0.5 + 0.5) * 255;
      out.data[i + 2] = src[i]; out.data[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
    s.ntex = t;
    return t;
  }

  /** The same twig layouts as the atlas cells, as leaf lists — for real 3D foliage close to the viewer. */
  layouts(key, leafId, cl) {
    const sheet = this.sheet(leafId);
    const rng = new RNG(this.seed).fork('atlas:' + key);
    const dens = cl.density ?? [1.0, 1.0, 0.75, 0.5];
    const out = [];
    for (let i = 0; i < 4; i++) {
      const b = { rec: [], twigs: [] };
      layoutCluster(b, sheet.spec, sheet, cl, cl.size, dens[i], rng.fork(i));
      out.push({ leaves: b.rec, twigs: b.twigs });
    }
    return { cells: out, sheet };
  }

  /**
   * Bake a 2x2 cluster atlas. cl: cluster definition (see species.js).
   * Returns { albedo, normal, cells:[{u0,v0,u1,v1}], size (m per card), mean }
   */
  atlas(key, leafId, cl, far = false) {
    const akey = far ? key + ':far' : key;
    let a = this.atlases.get(akey);
    if (a) return a;
    const sheet = this.sheet(leafId);
    const spec = sheet.spec;
    // The far atlas is what distant crowns are drawn with, on cards about twice the size: each cell holds a
    // whole bough (several twigs at about half scale) so that enlarging the card does not enlarge the leaves.
    const FAR = 1.9;
    const res = far ? Math.max(256, (cl.res ?? this.res) / 2) : (cl.res ?? this.res);
    // bake into shared multisampled targets, keep only a plain resolved copy
    const scratch = (srgb) => {
      const k = res + (srgb ? 's' : 'l');
      this._scr = this._scr || new Map();
      let rt = this._scr.get(k);
      if (!rt) {
        rt = new THREE.WebGLRenderTarget(res, res, { samples: 4, depthBuffer: true, stencilBuffer: false, format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
          minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
        rt.texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        this._scr.set(k, rt);
      }
      return rt;
    };
    const keep = (srgb) => {
      const rt = new THREE.WebGLRenderTarget(res, res, { depthBuffer: false, format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
        minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true });
      rt.texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      rt.texture.anisotropy = 4;
      return rt;
    };
    const rtA = scratch(true), rtN = scratch(false);
    const mean = S2L(sheet.mean);
    const r = this.r;
    const rng = new RNG(this.seed).fork('atlas:' + akey);
    const dens = cl.density ?? [1.0, 1.0, 0.75, 0.5];
    const cells = [];
    const geos = [];
    for (let i = 0; i < 4; i++) {
      const b = new GeoBuf();
      if (!far) layoutCluster(b, spec, sheet, cl, cl.size, dens[i], rng.fork(i));
      else {
        const rr = rng.fork('far' + i);
        const n = cl.farTwigs ?? Math.round(lerp(3, 6, dens[i]));
        for (let k = 0; k < n; k++) {
          // twigs fan out from the supporting branch, which enters at the bottom centre of the card
          const x = k === 0 ? 0.5 : rr.f(0.2, 0.8), y = k === 0 ? 0 : rr.f(0.05, 0.5);
          const ang = k === 0 ? rr.f(-0.2, 0.2) : (x - 0.5) * 2.6 + rr.f(-0.45, 0.45);
          layoutCluster(b, spec, sheet, cl, cl.size * FAR, Math.max(0.5, dens[i]), rr.fork(k), { x, y, ang, reach: 1 / FAR });
          if (k > 0) addTwig(b, [[0.5, 0.0], [lerp(0.5, x, 0.6), y * 0.55], [x, y]], 0.012, 0.007, S2L(hex2rgb(cl.twig || '#4a3a2a')), -0.07);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('col', new THREE.Float32BufferAttribute(b.c, 3));
      g.setAttribute('kind', new THREE.Float32BufferAttribute(b.k, 1));
      g.setIndex(b.i);
      geos.push(g);
      const cx = i % 2, cy = Math.floor(i / 2);
      cells.push({ u0: cx * 0.5, v0: cy * 0.5, u1: cx * 0.5 + 0.5, v1: cy * 0.5 + 0.5 });
    }
    const u = this.mat.uniforms;
    u.tLeaf.value = sheet.tex; u.tLeafH.value = sheet.htex;
    u.uBump.value = (cl.bump ?? 1.0) * res * 0.0007;
    const prevRT = r.getRenderTarget();
    const prevAuto = r.autoClear;
    r.autoClear = false;
    for (const [rt, pass] of [[rtA, 0], [rtN, 1]]) {
      u.uPass.value = pass;
      // target viewport / scissor are latched by setRenderTarget, so set them first
      rt.scissorTest = false;
      rt.viewport.set(0, 0, res, res);
      rt.scissor.set(0, 0, res, res);
      r.setRenderTarget(rt);
      if (pass === 0) r.setClearColor(new THREE.Color(mean[0], mean[1], mean[2]), 0);
      else r.setClearColor(new THREE.Color(0.5, 0.5, 1.0), 0);
      r.clear(true, true, false);
      for (let i = 0; i < 4; i++) {
        const cx = i % 2, cy = Math.floor(i / 2);
        rt.viewport.set(cx * res / 2, cy * res / 2, res / 2, res / 2);
        rt.scissor.set(cx * res / 2, cy * res / 2, res / 2, res / 2);
        rt.scissorTest = true;
        r.setRenderTarget(rt);
        this.mesh.geometry = geos[i];
        r.render(this.scene, this.cam);
      }
      rt.scissorTest = false;
      rt.viewport.set(0, 0, res, res);
    }
    r.setRenderTarget(prevRT);
    r.autoClear = prevAuto;
    for (const g of geos) g.dispose();
    // resolve into plain textures; the multisampled scratch targets are reused for the next species
    if (!this._copy) this._copy = new FSPass('uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv); }', { tSrc: { value: null } }, { blending: THREE.NoBlending });
    const outA = keep(true), outN = keep(false);
    for (const [src, dst] of [[rtA, outA], [rtN, outN]]) { this._copy.u.tSrc.value = src.texture; this._copy.render(r, dst); }
    r.setRenderTarget(prevRT);
    a = { albedo: outA.texture, normal: outN.texture, cells, size: cl.size, mean };
    this.atlases.set(akey, a);
    return a;
  }

  /**
   * Bake a tileable forest-floor texture by dropping thousands of leaves.
   * mix: [[leafId, weight], ...]; opts: { tile (m), res, old, fresh, twigs, extras:[[leafId, extraName, count]], duff }
   * Returns { albedo (rgb + height in a), normal (rg normal, b ao, a leaf mask), tile }
   */
  bakeLitter(key, mix, opts = {}) {
    const res = opts.res ?? 2048, tile = opts.tile ?? 2.4;
    const rng = new RNG(this.seed).fork('litter:' + key);
    const mk = (srgb) => {
      const rt = new THREE.WebGLRenderTarget(res, res, {
        samples: 4, depthBuffer: true, stencilBuffer: false, format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
        minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true,
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
      });
      rt.texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      rt.texture.anisotropy = 8;
      return rt;
    };
    const rtA = mk(true), rtN = mk(false);
    const bufs = new Map();
    const bufFor = (id) => { let b = bufs.get(id); if (!b) bufs.set(id, b = new GeoBuf()); return b; };
    const ids = mix.map((m) => m[0]), w = mix.map((m) => m[1]);
    const ZMAX = 0.12;
    const drop = (id, z, tintFn, sizeMul = 1, flat = 1) => {
      const sheet = this.sheet(id), spec = sheet.spec;
      const cells = sheet.cells;
      const cell = cells[rng.wpick(cells.map((c) => c.weight))];
      const H = (spec.len * sizeMul * rng.f(0.75, 1.1) / tile) / cell.bladeFrac, W = H * cell.aspect;
      const x = rng.next(), y = rng.next(), yaw = rng.f(0, 6.283);
      const o = { tilt: rng.f(-0.16, 0.16) * flat, roll: rng.f(-0.3, 0.3) * flat, curl: rng.f(-0.12, 0.3) * flat, keel: rng.f(-0.1, 0.2) * flat, z, shade: tintFn(spec, sheet) };
      const m = H * 1.1;
      const b = bufFor(id);
      for (const ox of [0, x < m ? 1 : x > 1 - m ? -1 : null]) for (const oy of [0, y < m ? 1 : y > 1 - m ? -1 : null]) {
        if (ox === null || oy === null) continue;
        addLeaf(b, x + ox - Math.sin(yaw) * H * 0.5, y + oy - Math.cos(yaw) * H * 0.5, yaw, H, W, cell, o);
      }
    };
    const S2 = (c) => c.map((v) => Math.pow(v, 2.2));
    const oldTint = opts.oldTint ? () => { const k = rng.f(0.7, 1.2); return opts.oldTint.map((c) => c * k); }
      : () => { const k = rng.f(0.20, 0.55); return [k * rng.f(0.95, 1.1), k * rng.f(0.74, 0.9), k * rng.f(0.52, 0.72)]; };
    const freshTint = (spec, sheet) => {
      // many fallen leaves have already browned toward the species' litter colour
      const k = rng.next() < (opts.browned ?? 0.5) ? rng.f(0.35, 0.95) : rng.f(0.0, 0.2);
      const lit = S2(hex2rgb(rng.pick(spec.litter || ['#7a5a30']))), mean = S2(sheet.mean);
      const s = rng.f(0.8, 1.08);
      return [0, 1, 2].map((i) => s * lerp(1, clamp(lit[i] / Math.max(0.02, mean[i]), 0.25, 1.6), k));
    };
    const nOld = opts.old ?? 2200, nFresh = opts.fresh ?? 1300;
    for (let i = 0; i < nOld; i++) drop(ids[rng.wpick(w)], 0.002 + (i / nOld) * ZMAX * 0.42, oldTint, 1, 0.8);
    const fmix = opts.freshMix || mix;
    const fids = fmix.map((m) => m[0]), fw = fmix.map((m) => m[1]);
    for (let i = 0; i < nFresh; i++) drop(fids[rng.wpick(fw)], ZMAX * 0.42 + (i / nFresh) * ZMAX * 0.5, freshTint, 1, 1.2);
    // sticks and fine woody debris
    const tb = bufFor('__twig');
    const nTw = opts.twigs ?? 70;
    for (let i = 0; i < nTw; i++) {
      const x = rng.next(), y = rng.next(), a = rng.f(0, 6.283), L = rng.f(0.03, 0.16), bend = rng.f(-0.5, 0.5);
      const pts = [];
      for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push([x + Math.cos(a + bend * t) * L * (t - 0.5), y + Math.sin(a + bend * t) * L * (t - 0.5)]); }
      const c = rng.f(0.03, 0.09);
      const wd = rng.f(0.0016, 0.006);
      for (const ox of [-1, 0, 1]) for (const oy of [-1, 0, 1]) {
        if ((ox || oy) && !(x + ox > -0.2 && x + ox < 1.2 && y + oy > -0.2 && y + oy < 1.2)) continue;
        addTwig(tb, pts.map((p) => [p[0] + ox, p[1] + oy]), wd, wd * 0.6, [c * 1.2, c, c * 0.8], ZMAX * rng.f(0.3, 0.95));
      }
    }
    // fruit on top (burs, nuts)
    for (const [id, name, count] of (opts.extras || [])) {
      const sheet = this.sheet(id);
      const list = sheet.extraCells[name];
      if (!list) continue;
      const b = bufFor(id);
      for (let i = 0; i < count; i++) {
        const cell = rng.pick(list);
        const H = cell.size / tile * rng.f(0.85, 1.15);
        const x = rng.f(0.06, 0.94), y = rng.f(0.06, 0.94);
        addLeaf(b, x, y, rng.f(0, 6.283), H, H * cell.aspect, cell, { tilt: 0, roll: 0, curl: -0.25, keel: 0, z: ZMAX * 0.96, shade: [1, 1, 1] });
      }
    }
    const litMat = this.litMat || (this.litMat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(this.mat.uniforms), vertexShader: BAKE_VS, fragmentShader: BAKE_FS, side: THREE.DoubleSide }));
    const u = litMat.uniforms;
    u.uZRange.value.set(0, ZMAX + 0.02);
    u.uBump.value = res * 0.0008;
    const r = this.r;
    const prevRT = r.getRenderTarget(), prevAuto = r.autoClear;
    r.autoClear = false;
    const geos = [];
    for (const [id, b] of bufs) {
      if (!b.count) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('col', new THREE.Float32BufferAttribute(b.c, 3));
      g.setAttribute('kind', new THREE.Float32BufferAttribute(b.k, 1));
      g.setIndex(b.i);
      geos.push([id, g]);
    }
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), litMat);
    mesh.frustumCulled = false;
    const sc = new THREE.Scene();
    sc.add(mesh);
    const soil = opts.soil || [0.030, 0.021, 0.014];
    for (const [rt, pass] of [[rtA, 2], [rtN, 3]]) {
      u.uPass.value = pass;
      r.setRenderTarget(rt);
      if (pass === 2) r.setClearColor(new THREE.Color(soil[0], soil[1], soil[2]), 0);
      else r.setClearColor(new THREE.Color(0.5, 0.5, 0.35), 0.3);
      r.clear(true, true, false);
      for (const [id, g] of geos) {
        if (id !== '__twig') { const sh = this.sheet(id); u.tLeaf.value = sh.tex; u.tLeafH.value = sh.htex; }
        mesh.geometry = g;
        r.render(sc, this.cam);
      }
    }
    r.setRenderTarget(prevRT);
    r.autoClear = prevAuto;
    for (const [, g] of geos) g.dispose();
    return { albedo: rtA.texture, normal: rtN.texture, tile };
  }
}
