// Boulders, ledges and streambed stones: procedural meshes, triplanar baked rock texture,
// moss on damp upper faces and lichen crusts on dry ones.
import * as THREE from 'three';
import { RNG, clamp, lerp, smoothstep, noise2 } from '../core/rng.js';
import { G, WORLD, makeMaterial, makeDepthMaterial, makeInstancedGeometry, setInstances, registerCaster, FSPass } from '../core/engine.js';

const HALF = WORLD / 2;

const ROCK_TEX_FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973)); p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec2 g2(vec2 c){ float a = h12(c)*6.2831853; return vec2(cos(a), sin(a)); }
float pn(vec2 p, float per){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*f*(f*(f*6.0 - 15.0) + 10.0);
  float a = dot(g2(mod(i, per)), f), b = dot(g2(mod(i+vec2(1,0), per)), f - vec2(1,0));
  float c = dot(g2(mod(i+vec2(0,1), per)), f - vec2(0,1)), d = dot(g2(mod(i+vec2(1,1), per)), f - vec2(1,1));
  return clamp(0.5 + 0.75*mix(mix(a, b, u.x), mix(c, d, u.x), u.y), 0.0, 1.0); }
float pfbm(vec2 uv, float per, int oct){ float a = 0.5, s = 0.0; for (int i = 0; i < 7; i++){ if (i >= oct) break; s += a*pn(uv*per, per); per *= 2.0; a *= 0.5; } return s; }
vec2 pvor(vec2 p, float per){ vec2 i = floor(p), f = fract(p); float f1 = 9.0, f2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(float(x), float(y)); vec2 o = h22(mod(i + g, per)); vec2 r = g + o - f; float d = dot(r, r); if (d < f1){ f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
  return vec2(sqrt(f1), sqrt(f2)); }
void main(){
  vec2 uv = vUv;
  float base = pfbm(uv, 4.0, 6);
  // foliated gneiss / metasandstone: wavy banding
  float band = pfbm(vec2(uv.x*0.35 + base*0.35, uv.y + base*0.25), 8.0, 5);
  vec2 v1 = pvor(uv*3.0 + (base - 0.5)*0.9, 3.0);
  // joints open only here and there
  float crack = (1.0 - smoothstep(0.0, 0.022, v1.y - v1.x))*smoothstep(0.50, 0.62, pfbm(uv + 0.77, 3.0, 3));
  vec2 v2 = pvor(uv*17.0, 17.0);
  float pit = smoothstep(0.25, 0.0, v2.x);
  float grain = pfbm(uv, 64.0, 3);
  float h = 0.55 + (base - 0.5)*0.7 + (band - 0.5)*0.25 - crack*0.35 - pit*0.12 + (grain - 0.5)*0.14;
  vec3 col = mix(vec3(0.20, 0.20, 0.205), vec3(0.42, 0.40, 0.37), smoothstep(0.3, 0.7, band));
  col = mix(col, vec3(0.30, 0.25, 0.20), smoothstep(0.55, 0.8, pfbm(uv + 0.3, 3.0, 4))*0.55);   // iron staining
  col *= 0.8 + 0.4*grain;
  col = mix(col, vec3(0.62, 0.62, 0.60), step(0.985, h12(floor(uv*700.0)))*0.5);                // quartz sparkle
  col *= 1.0 - crack*0.45;
  gl_FragColor = vec4(col*0.56, clamp(h, 0.0, 1.0));
}`;
const ROCK_N_FS = /* glsl */ `
precision highp float;
varying vec2 vUv; uniform sampler2D tH; uniform vec2 uTexel;
void main(){
  float hl = texture2D(tH, vUv - vec2(uTexel.x, 0.0)).a, hr = texture2D(tH, vUv + vec2(uTexel.x, 0.0)).a;
  float hd = texture2D(tH, vUv - vec2(0.0, uTexel.y)).a, hu = texture2D(tH, vUv + vec2(0.0, uTexel.y)).a;
  vec3 n = normalize(vec3((hl - hr)*5.0, (hd - hu)*5.0, 1.0));
  float h = texture2D(tH, vUv).a;
  gl_FragColor = vec4(n.xy*0.5 + 0.5, smoothstep(0.1, 0.6, h), 1.0);
}`;

const VS = /* glsl */ `
varying vec3 vWorld; varying vec3 vN; varying vec3 vLocal; varying float vSeed; varying float vScale; varying float vBaseY;
void main(){
  vec3 wp = instPos(position);
  vWorld = wp; vN = instNormal(normal); vLocal = position*iA.w; vSeed = iB.y; vScale = iA.w; vBaseY = iA.y;
  gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
}`;

const FS = /* glsl */ `
uniform sampler2D tRock; uniform sampler2D tRockN; uniform sampler2D uWaterMap;
varying vec3 vWorld; varying vec3 vN; varying vec3 vLocal; varying float vSeed; varying float vScale; varying float vBaseY;
void main(){
#ifdef DEPTH_PASS
  gl_FragColor = vec4(1.0);
#else
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  // triplanar
  vec3 w = pow(abs(N), vec3(4.0)); w /= (w.x + w.y + w.z);
  float sc = 0.62;
  vec3 p = vWorld*sc + vSeed*17.0;
  vec4 ax = texture(tRock, p.zy), ay = texture(tRock, p.xz), az = texture(tRock, p.xy);
  vec4 nx = texture(tRockN, p.zy), ny = texture(tRockN, p.xz), nz = texture(tRockN, p.xy);
  vec4 a = ax*w.x + ay*w.y + az*w.z;
  vec3 tx = vec3(0.0, nx.y*2.0 - 1.0, nx.x*2.0 - 1.0), ty = vec3(ny.x*2.0 - 1.0, 0.0, ny.y*2.0 - 1.0), tz = vec3(nz.x*2.0 - 1.0, nz.y*2.0 - 1.0, 0.0);
  vec3 Nd = normalize(N + (tx*w.x + ty*w.y + tz*w.z)*2.4);
  float cav = nx.b*w.x + ny.b*w.y + nz.b*w.z;
  vec3 alb = a.rgb*(0.95 + 0.6*fract(vSeed*3.7));
  // mineral streaks and weathering rind give the stone some life
  alb *= 0.8 + 0.5*fbm3(vWorld*vec3(1.1, 3.5, 1.1) + vSeed*4.0);
  vec4 site = texture(uSiteMap, worldUV(vWorld));
  vec2 wm = texture(uWaterMap, worldUV(vWorld)).rg;
  float above = vWorld.y - wm.r;
  float nearWater = smoothstep(4.0, 0.0, wm.g);
  float moist = clamp(site.r*0.7 + nearWater*0.5, 0.0, 1.0);
  // crustose lichens: pale grey-green and dark rock-tripe patches on dry faces
  float l1 = fbm3(vWorld*2.1 + vSeed*5.0), l2 = fbm3(vWorld*5.3 + 9.0);
  float lichen = smoothstep(0.52, 0.62, l1)*(1.0 - moist*0.6);
  alb = mix(alb, mix(vec3(0.34, 0.39, 0.32), vec3(0.50, 0.52, 0.44), l2), lichen*0.6);
  alb = mix(alb, vec3(0.035, 0.035, 0.03), smoothstep(0.62, 0.68, l2)*0.5*(1.0 - moist));
  // moss: velvet cushions on upper faces, creeping down damp sides
  float mn = fbm3(vWorld*3.1 + 2.0) + 0.3*vnoise3(vWorld*11.0);
  float up = smoothstep(0.05, 0.85, N.y);
  float mossAmt = smoothstep(0.52, 0.60, up*(0.30 + 0.62*moist) + (mn - 0.62)*0.95 - (1.0 - cav)*0.15 + (vnoise3(vWorld*27.0) - 0.5)*0.22 + (vnoise3(vWorld*90.0) - 0.5)*0.10);
  mossAmt *= smoothstep(0.0, 0.12, above)*(1.0 - 0.45*step(0.985, vSeed));
  alb = mix(alb, alb*1.9 + 0.03, step(0.985, vSeed)*0.7);
  float mfine = vnoise3(vWorld*42.0), mfine2 = vnoise3(vWorld*150.0);
  vec3 mossCol = mix(vec3(0.030, 0.058, 0.012), vec3(0.105, 0.155, 0.030), mfine*0.55 + mn*0.25);
  mossCol = mix(mossCol, vec3(0.13, 0.12, 0.035), smoothstep(0.55, 0.75, vnoise3(vWorld*6.0 + 3.0))*0.5);   // dry, yellowed patches
  mossCol *= 0.75 + 0.5*mfine2;
  alb = mix(alb, mossCol, mossAmt);
  Nd = normalize(mix(Nd, N + (vec3(vnoise3(vWorld*42.0 + vec3(0.03, 0.0, 0.0)), vnoise3(vWorld*42.0 + vec3(0.0, 0.03, 0.0)), vnoise3(vWorld*42.0 + vec3(0.0, 0.0, 0.03))) - mfine)*5.0, mossAmt));
  // fallen leaves and duff collect on flat tops
  float lit = smoothstep(0.86, 0.97, N.y)*smoothstep(0.60, 0.72, vnoise3(vWorld*5.0 + 7.0))*smoothstep(0.52, 0.6, vnoise3(vWorld*23.0))*smoothstep(0.3, 1.0, above);
  alb = mix(alb, mix(vec3(0.36, 0.22, 0.05), vec3(0.20, 0.10, 0.03), vnoise3(vWorld*30.0)), lit*0.8);
  // waterline: dark, wet, algae-slick
  float wet = smoothstep(0.28, 0.0, above)*nearWater;
  alb *= mix(1.0, 0.62, wet);
  // where the stone meets the ground: soil staining
  float foot = smoothstep(0.25, 0.0, vWorld.y - terrainH(vWorld.xz));
  alb *= mix(1.0, 0.6, foot);
  Surf s;
  s.albedo = alb; s.N = Nd; s.rough = mix(mix(0.88, 0.97, mossAmt), 0.5, wet); s.spec = mix(0.35, 0.15, mossAmt) + wet*0.3;
  s.ao = mix(0.55, 1.0, cav)*mix(0.6, 1.0, smoothstep(0.0, 0.5, vWorld.y - terrainH(vWorld.xz))); s.trans = 0.0; s.transCol = vec3(0.0); s.above = 0.0;
  // moss rim light: backscatter through the fuzz
  float sh = sunShadow(vWorld, N, ign(gl_FragCoord.xy));
  vec3 col = shadeSurface(s, vWorld, V, sh);
  col += mossCol*mossAmt*pow(1.0 - max(dot(N, V), 0.0), 3.0)*(uSunColor*sh*0.06 + skyAmbient(N)*0.25);
  gl_FragColor = vec4(col, 1.0);
#endif
}`;

function makeRock(rng, detail, style) {
  // displaced icosphere; style 0: blocky ledge boulder, 1: water-rounded stream stone, 2: slab
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position;
  const S = rng.i(1, 9999);
  const sx = style === 2 ? rng.f(1.1, 1.6) : rng.f(0.8, 1.25), sy = style === 2 ? rng.f(0.3, 0.5) : style === 1 ? rng.f(0.55, 0.8) : rng.f(0.6, 1.0), sz = rng.f(0.75, 1.2);
  // a few joint planes give flat faces; edges are then worn round by weathering noise
  const planes = [];
  const np = style === 1 ? 2 : rng.i(3, 6);
  for (let i = 0; i < np; i++) {
    const n = new THREE.Vector3(rng.n(), rng.n() * 0.7, rng.n()).normalize();
    planes.push([n, rng.f(0.6, 0.92)]);
  }
  const v = new THREE.Vector3();
  const n3 = (x, y, z, f, s) => noise2(x * f + z * f * 0.37 + s, y * f - z * f * 0.61 + s * 1.7, s);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1;
    r += 0.20 * n3(v.x, v.y, v.z, 1.7, S) + 0.09 * n3(v.x, v.y, v.z, 4.1, S + 3);
    for (const [n, d] of planes) {
      const k = v.dot(n);
      if (k * r > d) {
        // soft-min toward the plane: a worn, rounded arris instead of a knife edge
        const cut = d / k;
        const w = Math.min(1, (r - cut) / 0.12);
        r = r + (cut - r) * (style === 1 ? 0.5 : 0.9) * w * w * (3 - 2 * w);
      }
    }
    // pitting, bedding steps and chipped corners
    r += (style === 1 ? 0.012 : 0.035) * n3(v.x, v.y, v.z, 9, S + 5) + 0.014 * n3(v.x, v.y, v.z, 21, S + 7);
    if (style !== 1) r += 0.02 * Math.round(Math.sin(v.y * 9 + n3(v.x, v.y, v.z, 2, S + 9) * 2));
    v.multiplyScalar(r);
    v.x *= sx; v.y *= sy; v.z *= sz;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  const merged = mergeVerts(g);
  merged.computeVertexNormals();
  return merged;
}

function mergeVerts(g) {
  const pos = g.attributes.position;
  const map = new Map(); const np = []; const idx = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = Math.round(x * 4000) + ',' + Math.round(y * 4000) + ',' + Math.round(z * 4000);
    let j = map.get(k);
    if (j === undefined) { j = np.length / 3; map.set(k, j); np.push(x, y, z); }
    idx.push(j);
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(np, 3));
  o.setIndex(idx);
  return o;
}

export function buildRocks(terrain, eco, seed) {
  const rng = new RNG(seed).fork('rocks');
  const r = G.renderer;
  // --- baked tileable rock texture
  const res = 1024;
  const mk = (srgb) => {
    const rt = new THREE.WebGLRenderTarget(res, res, { depthBuffer: false, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
    rt.texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    rt.texture.anisotropy = 8;
    return rt;
  };
  const rtA = mk(true), rtN = mk(false);
  const prev = r.getRenderTarget();
  new FSPass(ROCK_TEX_FS, {}).render(r, rtA);
  new FSPass(ROCK_N_FS, { tH: { value: rtA.texture }, uTexel: { value: new THREE.Vector2(1 / res, 1 / res) } }).render(r, rtN);
  r.setRenderTarget(prev);

  const uniforms = { tRock: { value: rtA.texture }, tRockN: { value: rtN.texture }, uWaterMap: { value: G.waterTex } };
  const mat = makeMaterial({ name: 'rock', vs: VS, fs: FS, uniforms, instanced: true });
  const depth = makeDepthMaterial({ vs: VS, fs: FS, uniforms, instanced: true, side: THREE.FrontSide });
  const group = new THREE.Group();
  group.name = 'rocks';
  const variants = [];
  for (let i = 0; i < 9; i++) {
    const style = i < 4 ? 0 : i < 7 ? 1 : 2;
    variants.push({ geo: makeRock(rng.fork('v' + i), 4, style), geoLo: makeRock(rng.fork('v' + i), 2, style), style, A: [], B: [] });
  }
  const rocks = [];   // { x, z, r, y } for other systems (ferns nestle beside boulders; moss)
  const put = (x, z, size, style, sink, pale = false) => {
    const cand = variants.filter((v) => v.style === style);
    const v = rng.pick(cand);
    const y = terrain.heightAt(x, z) - size * sink;
    v.A.push(x, y, z, size); v.B.push(rng.f(0, 6.283), pale ? 0.992 : rng.next() * 0.97, 0, 0);
    rocks.push({ x, z, r: size, y });
  };
  const F = terrain.fields;
  // 1. stream boulders: thick at riffles and drops, sparse in pools
  for (const st of terrain.streams) {
    const pts = st.pts;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      if (Math.abs(p.x) > HALF - 2 || Math.abs(p.z) > HALF - 2) continue;
      const drop = Math.abs(pts[i + 1].w - pts[i - 1].w);
      const n = rng.i(0, 2) + (drop > 0.25 ? rng.i(3, 6) : 0) + (p.pool < 0.2 ? 2 : 0);
      for (let k = 0; k < n; k++) {
        const a = rng.f(0, 6.283), d = Math.abs(rng.n(0, p.half * 0.9 + 0.8));
        const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d * 1.4;
        const big = rng.chance(drop > 0.25 ? 0.25 : 0.07);
        const size = big ? rng.f(0.7, 1.9) * (st === terrain.main ? 1 : 0.6) : rng.f(0.14, 0.55);
        put(x, z, size, rng.chance(0.7) ? 1 : 0, rng.f(0.25, 0.5));
      }
    }
  }
  // 2. boulder fields and scattered ledge blocks on rocky ground
  for (let i = 0; i < 26000; i++) {
    const x = rng.f(-HALF + 2, HALF - 2), z = rng.f(-HALF + 2, HALF - 2);
    const rk = F.rock.at(x, z);
    if (!rng.chance(rk * rk * 0.5 + 0.004)) continue;
    if (F.trail.at(x, z) > 0.2) continue;
    const big = rng.chance(0.06);
    const size = big ? rng.f(1.4, 3.6) : rng.chance(0.3) ? rng.f(0.5, 1.3) : rng.f(0.12, 0.5);
    if (eco.big.blocked(x, z, size * 0.6, 0.6)) continue;
    put(x, z, size, rng.chance(0.2) ? 2 : rng.chance(0.75) ? 0 : 1, rng.f(0.3, 0.55));
  }
  // 3. a great pale boulder beside the hero pool, as in Richards' "October"
  if (eco.richards) {
    const b = eco.richards.boulder, b2 = eco.richards.boulder2;
    put(b[0], b[1], 2.3, 0, 0.36, true);
    put(b[0] + 1.9, b[1] + 1.0, 1.2, 0, 0.4, true);
    put(b2[0], b2[1], 0.8, 1, 0.4);
  }
  let nI = 0;
  for (const v of variants) {
    const n = v.A.length / 4;
    if (!n) continue;
    nI += n;
    const A = new Float32Array(v.A), B = new Float32Array(v.B);
    // split by size: large rocks use the detailed mesh
    const bigA = [], bigB = [], smA = [], smB = [];
    for (let i = 0; i < n; i++) {
      const tgt = A[i * 4 + 3] > 0.45 ? [bigA, bigB] : [smA, smB];
      for (let k = 0; k < 4; k++) { tgt[0].push(A[i * 4 + k]); tgt[1].push(B[i * 4 + k]); }
    }
    for (const [aa, bb, geo, cast] of [[bigA, bigB, v.geo, true], [smA, smB, v.geoLo, false]]) {
      const m = aa.length / 4;
      if (!m) continue;
      const ig = makeInstancedGeometry(geo, m);
      setInstances(ig, new Float32Array(aa), new Float32Array(bb), m);
      const mesh = new THREE.Mesh(ig, mat);
      mesh.frustumCulled = false; mesh.matrixAutoUpdate = false;
      group.add(mesh);
      if (cast) { registerCaster(mesh, depth, false); registerCaster(mesh, depth, true); }
    }
  }
  console.log('[info] rocks: ' + nI);
  return { group, rocks, material: mat };
}
