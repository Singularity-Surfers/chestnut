// Instanced woody vegetation: bark + foliage materials, per-frame LOD binning, static shadow proxies.
import * as THREE from 'three';
import { G, makeMaterial, makeDepthMaterial, makeInstancedGeometry, setInstances, registerCaster } from '../core/engine.js';
import { generatePlant, generateVine, generateNear } from './treegen.js';
import { makeLeafyMaterial } from './groundflora.js';

const LEAF_VS = /* glsl */ `
attribute vec4 tan;
attribute vec4 data;
uniform float uFlutter;
varying vec3 vWorld; varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vCrownN; varying vec4 vData; varying float vSeed;
void main(){
  vec3 wp = instPos(position);
  float tip = tan.w;
  wp += windOffset(wp, data.g*3.0, uFlutter*(0.25 + tip)*iA.w, data.a + iB.y);
  vWorld = wp; vUv = uv;
  vN = instRotate(normal.xyz); vT = instRotate(tan.xyz);
  vCrownN = normalize(wp - instPos(vec3(0.0, iB.z, 0.0)));   // iB.z carries the crown-centre height
  vData = data; vSeed = iB.y;
  gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
}`;

const LEAF_FS = /* glsl */ `
uniform sampler2D tAlbedo; uniform sampler2D tNormal;
uniform float uTrans, uGloss, uHueVar, uCrownBlend, uTexSize, uShadowKeep, uBrightL, uBronze;
varying vec3 vWorld; varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vCrownN; varying vec4 vData; varying float vSeed;
void main(){
  vec4 a = texture(tAlbedo, vUv);
  // preserve coverage as mips blur the cut-out
  vec2 dx = dFdx(vUv*uTexSize), dy = dFdy(vUv*uTexSize);
  // coverage boost follows the minor axis of the footprint, so cards seen edge-on do not turn into solid streaks
  float lod = max(0.0, 0.5*log2(min(dot(dx, dx), dot(dy, dy)) + 1e-8));
  float alpha = a.a*(1.0 + lod*0.28);
#ifdef DEPTH_PASS
  // mid-October crowns are thinning: let a share of the sprays pass sunlight so flecks reach the floor
  if (alpha < 0.38 || vData.b > uShadowKeep) discard;
  gl_FragColor = vec4(1.0);
#else
  vec3 N = normalize(vN), T = normalize(vT);
  vec3 V = normalize(cameraPosition - vWorld);
  // a spray seen exactly edge-on is a line: let it vanish instead
  alpha *= smoothstep(0.03, 0.20, abs(dot(N, V)));
  alpha = clamp((alpha - 0.36)/max(fwidth(alpha), 1e-4) + 0.5, 0.0, 1.0);
  if (alpha < 0.03) discard;
  vec4 nm = texture(tNormal, vUv);
  vec3 B = cross(N, T);
  vec2 nxy = nm.xy*2.0 - 1.0;
  vec3 Nw = normalize(T*nxy.x + B*nxy.y + N*sqrt(max(1.0 - dot(nxy, nxy), 0.08)));
  // the card normal leans to the upper (adaxial) side: seen from it, a leaf's underside, paler and duller
  float under = step(dot(N, V), 0.0);
  if (dot(Nw, V) < 0.0) Nw = -Nw;
  vec3 Ns = normalize(mix(Nw, normalize(vCrownN), uCrownBlend));
  vec3 alb = a.rgb;
  float s1 = vSeed, s2 = vData.b;
  alb = hueShift(alb, (s1 - 0.5)*uHueVar*2.2 + (s2 - 0.5)*uHueVar*0.9);
  alb *= (0.84 + 0.30*s2)*(0.9 + 0.2*fract(s1*7.31))*uBrightL;
  // mid-October: whole sprays have gone to bronze, russet and tan while others on the same limb are still fresh
  float bz = smoothstep(0.60, 0.95, fract(s2 + fract(s1*3.1)) + (fract(s1*9.7) - 0.5)*0.4)*uBronze;
  alb = mix(alb, vec3(luma(alb))*vec3(1.30, 0.92, 0.52)*0.82 + alb*0.12, bz);
  alb = saturateCol(alb, 0.90);
  alb = mix(alb, vec3(luma(alb))*vec3(1.10, 1.04, 0.86), 0.22*under)*(1.0 - 0.06*under);
  // far crowns: the mip chain averages bright blades with twigs and the shaded undersides between them,
  // where the eye would still read the colour of the lit leaves
  float far = smoothstep(35.0, 220.0, length(cameraPosition - vWorld));
  alb = saturateCol(alb, 1.0 + 0.10*far)*(1.0 + 0.42*far);
  Surf s;
  s.albedo = alb; s.N = Ns; s.rough = mix(0.74, 0.28, uGloss); s.spec = 0.22 + 0.95*uGloss; s.ao = vData.r;
  s.trans = uTrans*nm.b; s.transCol = saturateCol(alb, 1.15)*1.15;
  float agl = vWorld.y - terrainH(vWorld.xz);
  s.above = smoothstep(3.0, 20.0, agl);
  float sh = sunShadow(vWorld, normalize(Nw + uSunDir*0.8), ign(gl_FragCoord.xy));
  // a leaf in the shade of other leaves still receives the light they transmit and scatter
  // high in the crown that scattered light is strong: gold leaves pass and reflect most of what reaches them
  // Self-shading of the crown volume. Without it every spray in a crown takes the same full sun and the tree
  // reads as flat stamped sprites; real crowns are lit on the sun side and at the rim, dim within, with flecks.
  float sunSide = dot(normalize(vCrownN), uSunDir);
  float fleck = (fract(s2*13.7 + s1*5.3) - 0.5)*0.6;
  float selfSun = smoothstep(-0.30, 0.50, sunSide*0.6 + (vData.r - 0.62)*1.7 + fleck);
  sh *= mix(0.28, 1.0, selfSun);
  sh = mix((0.30 + 0.22*s.above)*uTrans, 1.0, sh);
  vec3 col = shadeSurface(s, vWorld, V, sh);
  gl_FragColor = vec4(col, alpha);
#endif
}`;

const BARK_VS = /* glsl */ `
attribute vec4 data;
varying vec3 vWorld; varying vec2 vUv; varying vec3 vN; varying vec4 vData; varying float vSeed; varying float vBaseY;
void main(){
  vec3 wp = instPos(position);
  wp += windOffset(wp, data.g*3.0, 0.0, iB.y);
  vWorld = wp; vUv = uv; vN = instRotate(normal.xyz); vData = data; vSeed = iB.y; vBaseY = iA.y;
  gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
}`;

const BARK_FS = /* glsl */ `
uniform sampler2D tBark; uniform sampler2D tBarkN;
uniform float uBump; uniform float uMossy; uniform float uGroundH; uniform vec4 uPom;   // tile w, tile h, max distance, depth (m)
varying vec3 vWorld; varying vec2 vUv; varying vec3 vN; varying vec4 vData; varying float vSeed; varying float vBaseY;
void main(){
#ifdef DEPTH_PASS
  gl_FragColor = vec4(1.0);
#else
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  // cotangent frame from screen-space derivatives
  vec3 dp1 = dFdx(vWorld), dp2 = dFdy(vWorld);
  vec2 du1 = dFdx(vUv), du2 = dFdy(vUv);
  vec3 dp2p = cross(dp2, N), dp1p = cross(N, dp1);
  vec3 T = dp2p*du1.x + dp1p*du2.x, B = dp2p*du1.y + dp1p*du2.y;
  float inv = inversesqrt(max(dot(T, T), dot(B, B)) + 1e-12);
  // parallax occlusion: march the view ray through the baked height field so furrows have real depth
  vec2 uv = vUv;
  float dist = length(cameraPosition - vWorld);
  float pomF = (1.0 - smoothstep(uPom.z*0.55, uPom.z, dist))*smoothstep(0.12, 0.45, dot(V, N));
  if (pomF > 0.01 && uPom.w > 0.0){
    vec3 Vt = vec3(dot(V, T*inv), dot(V, B*inv), max(dot(V, N), 0.22));
    vec2 stepUv = -(Vt.xy/Vt.z)*(uPom.w*pomF)/uPom.xy/10.0;
    float layer = 1.0;
    float hgt = textureGrad(tBark, uv, du1, du2).a;
    float ph = hgt;
    for (int k = 0; k < 10; k++){
      if (hgt >= layer) break;
      ph = hgt;
      uv += stepUv; layer -= 0.1;
      hgt = textureGrad(tBark, uv, du1, du2).a;
    }
    // slide back to where the ray actually met the surface, or the march shows as contour lines
    float after = hgt - layer, before = ph - (layer + 0.1);
    uv -= stepUv*clamp(after/max(after - before, 1e-4), 0.0, 1.0);
  }
  vec4 a = textureGrad(tBark, uv, du1, du2);
  vec4 nm = textureGrad(tBarkN, uv, du1, du2);
  vec2 nxy = (nm.xy*2.0 - 1.0)*uBump;
  vec3 Nw = normalize(T*inv*nxy.x + B*inv*nxy.y + N);
  vec3 alb = a.rgb*(0.52 + 0.18*fract(vSeed*5.7));
  // what the baked tile cannot resolve: fibrous grain and flaking along the stem, and the deep shade of furrow floors
  float dfade = 1.0 - smoothstep(6.0, 16.0, dist);
  vec3 dp = vWorld*vec3(31.0, 4.5, 31.0);
  float grain = vnoise3(dp)*0.55 + vnoise3(dp*2.9 + 3.1)*0.45;
  alb *= 1.0 + (grain - 0.5)*0.75*dfade;
  vec3 dq = vWorld*vec3(140.0, 17.0, 140.0);
  alb *= 1.0 + (vnoise3(dq) - 0.5)*0.55*(1.0 - smoothstep(2.5, 7.0, dist));
  alb *= mix(0.8, 1.0, smoothstep(0.0, 0.5, a.a));
  // slow tonal drift along the bole hides the texture repeat
  alb *= 0.82 + 0.36*fbm3(vWorld*vec3(0.6, 0.25, 0.6) + vSeed*9.0);
  float h = mix(vWorld.y - vBaseY, vWorld.y - terrainH(vWorld.xz), uGroundH);   // height above the root collar / ground
  vec4 site = texture(uSiteMap, worldUV(vWorld));
  // moss: thick on root flares and the lower bole in moist coves, upper sides of limbs, the shaded (north) face
  float mn = fbm3(vWorld*vec3(2.3, 1.1, 2.3)) + 0.35*vnoise3(vWorld*vec3(7.0, 3.0, 7.0));
  float wetSite = site.r;
  float north = smoothstep(-0.3, 0.9, -N.z);
  // the moss line wanders: tongues climb the damp, shaded flutes and stop short on dry ridges
  float hm = h*(0.3 + 1.3*vnoise3(vWorld*vec3(1.6, 0.12, 1.6) + 7.0) + 1.5*vnoise3(vWorld*vec3(6.5, 0.7, 6.5) + 3.0)) + (1.0 - a.a)*-0.25;
  float mossBase = smoothstep(0.30 + 1.9*wetSite*wetSite, 0.0, hm)*(0.55 + 0.6*wetSite + 0.3*north);
  // upper sides of limbs, and the backs of surface roots
  float mossTop = smoothstep(0.45, 0.95, N.y)*(0.15 + 0.75*wetSite)*mix(step(1.5, h), 1.0, uGroundH) + smoothstep(0.3, 0.85, N.y)*smoothstep(0.75, 0.3, h)*(0.5 + 0.5*wetSite);
  float moss = clamp((mossBase + mossTop + north*wetSite*0.16*smoothstep(3.0, 0.4, h))*uMossy, 0.0, 1.0);
  moss = smoothstep(0.66, 0.92, moss*0.78 + (mn - 0.58)*0.95 + (a.a - 0.35)*0.3);
  vec3 mossCol = mix(vec3(0.045, 0.080, 0.018), vec3(0.11, 0.165, 0.04), vnoise3(vWorld*vec3(9.0, 7.0, 9.0)));
  alb = mix(alb, mossCol, moss*0.9);
  // pale crustose lichen patches higher up
  float li = smoothstep(0.60, 0.70, fbm3(vWorld*vec3(1.7, 0.9, 1.7) + 4.0))*smoothstep(1.0, 4.0, h);
  alb = mix(alb, vec3(0.42, 0.47, 0.40), li*0.22);
  // damp, soil-stained root collar
  float collar = smoothstep(0.5, 0.0, h);
  alb *= mix(1.0, 0.72, collar);
  // leaf litter and duff bank up against the foot of the trunk
  float foot = smoothstep(0.16, 0.0, vWorld.y - terrainH(vWorld.xz) + (vnoise3(vWorld*vec3(5.0, 2.0, 5.0)) - 0.5)*0.14);
  vec3 duff = mix(vec3(0.085, 0.052, 0.022), vec3(0.24, 0.15, 0.05), vnoise3(vWorld*23.0));
  alb = mix(alb, duff, foot*0.9);
  Surf s;
  s.albedo = alb; s.N = normalize(mix(Nw, N, moss*0.6)); s.rough = mix(nm.a, 0.95, moss); s.spec = mix(0.5, 0.15, moss);
  s.ao = vData.r*mix(nm.b, 1.0, moss*0.5); s.trans = 0.0; s.transCol = vec3(0.0);
  s.above = smoothstep(4.0, 22.0, h);
  float sh = sunShadow(vWorld, N, ign(gl_FragCoord.xy));
  vec3 col = shadeSurface(s, vWorld, V, sh);
  gl_FragColor = vec4(col, 1.0);
#endif
}`;

export class Vegetation {
  constructor(flora, barkLib) {
    this.flora = flora;
    this.barkLib = barkLib;
    this.variants = new Map();
    this.leafMats = new Map();
    this.barkMats = new Map();
    this.group = new THREE.Group();
    this.group.name = 'vegetation';
    this.colliders = [];
    this._fr = new THREE.Frustum();
    this._m = new THREE.Matrix4();
    this._s = new THREE.Sphere();
    this.stats = { lod0: 0, lod1: 0, lod2: 0, near: 0 };
    this.nearMats = new Map();
    this.nearLive = [];
    this.logNear = /[?&]nearlog=1/.test(location.search);
    this._frame = 0;
  }

  _leafMat(key, def, atlas) {
    let m = this.leafMats.get(key);
    if (m) return m;
    const uniforms = {
      tAlbedo: { value: atlas.albedo }, tNormal: { value: atlas.normal },
      uTrans: { value: def.trans ?? 0.9 }, uGloss: { value: def.gloss ?? 0.15 }, uHueVar: { value: def.hueVar ?? 0.08 },
      uCrownBlend: { value: def.layer === 'canopy' ? 0.28 : 0.18 }, uTexSize: { value: atlas.albedo.image?.width || 1024 },
      uFlutter: { value: def.evergreen ? 0.012 : 0.028 }, uShadowKeep: { value: def.evergreen ? 0.9 : def.layer === 'canopy' ? 0.52 : 0.7 }, uBrightL: { value: def.bright ?? 1 }, uBronze: { value: def.evergreen ? 0 : (def.bronze ?? 0.35) },
    };
    const main = makeMaterial({ name: 'leaf:' + key, vs: LEAF_VS, fs: LEAF_FS, uniforms, instanced: true, wind: true, side: THREE.DoubleSide, a2c: true });
    const depth = makeDepthMaterial({ vs: LEAF_VS, fs: LEAF_FS, uniforms, instanced: true, wind: true });
    m = { main, depth, uniforms };
    this.leafMats.set(key, m);
    return m;
  }

  _barkMat(name) {
    let m = this.barkMats.get(name);
    if (m) return m;
    const b = this.barkLib.get(name);
    const uniforms = { tBark: { value: b.albedo }, tBarkN: { value: b.normal }, uBump: { value: 2.6 * b.depth }, uMossy: { value: 1 }, uGroundH: { value: 0 },
      uPom: { value: new THREE.Vector4(b.tile[0], b.tile[1], G.quality.pom ?? 16, 0.042 * b.depth * (b.params.furrow || b.params.plate || b.params.block ? 1 : 0.25)) } };
    const main = makeMaterial({ name: 'bark:' + name, vs: BARK_VS, fs: BARK_FS, uniforms, instanced: true, wind: true });
    // shadow casters draw the side away from the light, which keeps lit bark free of self-shadow acne
    const depth = makeDepthMaterial({ vs: BARK_VS, fs: BARK_FS, uniforms, instanced: true, wind: true, side: THREE.BackSide });
    m = { main, depth, uniforms, bark: b };
    this.barkMats.set(name, m);
    return m;
  }

  /** Create a plant variant (geometry at 3 LODs). */
  addVariant(key, spKey, def, arch, size, seed, opts = {}) {
    const atlas = this.flora.atlas(spKey, def.leaf, def.cl);
    const bm = this._barkMat(def.bark);
    const plant = generatePlant(def, arch, size, bm.bark, atlas, seed, { cards: G.quality.cards, ...opts });
    const v = {
      key, spKey, def, plant, size, inst: [], lodMeshes: [], far: [],
      leafMat: this._leafMat(spKey, def, atlas), leafMatFar: this._leafMat(spKey + ':far', def, this.flora.atlas(spKey, def.leaf, def.cl, true)), barkMat: bm, small: size.h < 6, tiny: size.h < 2.2,
      crown: new THREE.Vector3(...plant.meta.crown.c),
    };
    // small plants are redrawn leaf by leaf when the viewer is close enough to see the difference
    if (size.h <= 14 && (G.quality.nearLeaves ?? 0) > 0 && !/[?&]near=0/.test(location.search)) v.gen = { arch, seed, atlas, opts: { cards: G.quality.cards, ...opts } };
    this.variants.set(key, v);
    return v;
  }

  _nearMat(spKey, def) {
    let m = this.nearMats.get(spKey);
    if (!m) {
      m = makeLeafyMaterial(this.flora, def.leaf, { tree: true, trans: def.trans ?? 0.9, gloss: def.gloss ?? 0.15, hueVar: def.hueVar ?? 0.08,
        bright: (def.bright ?? 1) * 0.84, flutter: def.evergreen ? 0.008 : 0.016, cover: 0.2, bronze: def.evergreen ? 0 : (def.bronze ?? 0.35) });
      this.nearMats.set(spKey, m);
    }
    return m;
  }

  /** Build (once) the leaf-by-leaf model of a variant; old ones are dropped when too many are alive. */
  _ensureNear(v) {
    if (v.near) { v.near.used = this._frame; return true; }
    if (this._nearBudget <= 0) return false;
    this._nearBudget--;
    const layouts = this.flora.layouts(v.spKey, v.def.leaf, v.def.cl);
    const t0 = performance.now();
    const geo = generateNear(v.def, v.gen.arch, v.size, v.barkMat.bark, v.gen.atlas, layouts, v.gen.seed, v.gen.opts);
    if (!geo) { v.gen = null; return false; }
    if (this.logNear) console.log(`[perf] near ${v.key}: ${(performance.now() - t0).toFixed(0)} ms, ${Math.round(geo.tris / 1000)}k tris`);
    const lm = this._nearMat(v.spKey, v.def);
    const cap = Math.min(v.n, 24);
    const mk = (g, mats) => {
      const mesh = new THREE.Mesh(makeInstancedGeometry(g, cap), mats.main);
      mesh.frustumCulled = false; mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
      registerCaster(mesh, mats.depth, false);
      return mesh;
    };
    v.near = { bark: mk(geo.bark, v.barkMat), leaves: mk(geo.leaves, lm), cards: geo.cards ? mk(geo.cards, v.leafMat) : null, base: [geo.bark, geo.leaves, geo.cards].filter(Boolean), cap, used: this._frame,
      bin: { A: new Float32Array(cap * 4), B: new Float32Array(cap * 4), n: 0 } };
    this.nearLive.push(v);
    this.nearBuilt = (this.nearBuilt || 0) + 1;
    if (this.nearLive.length > 20) {
      let oi = 0;
      for (let i = 1; i < this.nearLive.length; i++) if (this.nearLive[i].near.used < this.nearLive[oi].near.used) oi = i;
      const o = this.nearLive[oi];
      if (o !== v && o.near.used < this._frame) {
        for (const m of [o.near.bark, o.near.leaves, o.near.cards]) {
          if (!m) continue;
          this.group.remove(m); m.geometry.dispose();
          const k = G.casters.findIndex((c) => c.mesh === m); if (k >= 0) G.casters.splice(k, 1);
        }
        for (const g of o.near.base) g.dispose();
        o.near = null;
        this.nearLive.splice(oi, 1);
        this.nearEvicted = (this.nearEvicted || 0) + 1;
      }
    }
    return true;
  }

  /** A climber fitted to an existing host variant; place it with exactly the host's transform. */
  addVine(key, spKey, def, hostKey, seed) {
    const host = this.variants.get(hostKey);
    if (!host || !host.plant.meta.trunk) return null;
    const atlas = this.flora.atlas(spKey, def.leaf, def.cl);
    const bm = this._barkMat(def.bark);
    const plant = generateVine(def, host.plant.meta, bm.bark, atlas, seed);
    const v = { key, spKey, def, plant, size: { h: plant.meta.h, dbh: 0.02 }, inst: [], lodMeshes: [], far: [], leafMat: this._leafMat(spKey, def, atlas), barkMat: bm, small: true, tiny: true, crown: new THREE.Vector3(0, plant.meta.h * 0.5, 0) };
    this.variants.set(key, v);
    return v;
  }

  place(key, x, y, z, scale, yaw, seed, outer = false) {
    const v = this.variants.get(key);
    v.inst.push(x, y, z, scale, yaw, seed);
    (v.outer ||= []).push(outer ? 1 : 0);
    return v;
  }

  finalize() {
    for (const v of this.variants.values()) {
      const n = v.inst.length / 6;
      if (!n) continue;
      v.n = n;
      v.A = new Float32Array(n * 4); v.B = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        v.A[i * 4] = v.inst[i * 6]; v.A[i * 4 + 1] = v.inst[i * 6 + 1]; v.A[i * 4 + 2] = v.inst[i * 6 + 2]; v.A[i * 4 + 3] = v.inst[i * 6 + 3];
        v.B[i * 4] = v.inst[i * 6 + 4]; v.B[i * 4 + 1] = v.inst[i * 6 + 5]; v.B[i * 4 + 2] = v.crown.y;
      }
      v.bins = [0, 1, 2].map(() => ({ A: new Float32Array(n * 4), B: new Float32Array(n * 4), n: 0 }));
      const mkMesh = (geo, mats, cap) => {
        const ig = makeInstancedGeometry(geo, cap);
        const mesh = new THREE.Mesh(ig, mats.main);
        mesh.frustumCulled = false;
        mesh.matrixAutoUpdate = false;
        return mesh;
      };
      for (let L = 0; L < 3; L++) {
        const lod = v.plant.lods[L];
        const entry = {};
        if (lod.bark) {
          entry.bark = mkMesh(lod.bark, v.barkMat, n);
          this.group.add(entry.bark);
          if (L < 1) registerCaster(entry.bark, v.barkMat.depth, false);
        }
        if (lod.leaves) {
          entry.leaves = mkMesh(lod.leaves, L === 0 ? v.leafMat : (v.leafMatFar || v.leafMat), n);
          this.group.add(entry.leaves);
          if (L < 1) registerCaster(entry.leaves, v.leafMat.depth, false);
        }
        v.lodMeshes.push(entry);
      }
      // static proxies for the world shadow map: every instance, lowest detail
      if (!v.tiny) {
        const lod = v.plant.lods[v.small ? 1 : 2];
        // trees beyond the cove lie outside the world shadow map: leave them out of the proxy set
        const iA = [], iB = [];
        for (let i = 0; i < n; i++) if (!v.outer[i]) { for (let k = 0; k < 4; k++) { iA.push(v.A[i * 4 + k]); iB.push(v.B[i * 4 + k]); } }
        const nIn = iA.length / 4;
        for (const [geo, mats] of [[lod.bark, v.barkMat], [lod.leaves, v.leafMatFar || v.leafMat]]) {
          if (!geo || !nIn) continue;
          const ig = makeInstancedGeometry(geo, nIn);
          setInstances(ig, new Float32Array(iA), new Float32Array(iB), nIn);
          const mesh = new THREE.Mesh(ig, mats.main);
          mesh.frustumCulled = false; mesh.matrixAutoUpdate = false;
          mesh.layers.set(2);
          mesh.layers.enable(3);   // what the stream mirrors
          this.group.add(mesh);
          G.farCasters.push({ mesh, depthMat: mats.depth });
          v.far.push(mesh);
        }
      }
      // trunk colliders for walking
      if (v.size.dbh > 0.12) {
        for (let i = 0; i < n; i++) if (!v.outer[i]) this.colliders.push([v.A[i * 4], v.A[i * 4 + 2], v.plant.meta.trunkR * v.A[i * 4 + 3] * 1.25 + 0.3]);
      }
      delete v.inst; delete v.outer;
    }
    this._buildColliderGrid();
  }

  _buildColliderGrid() {
    this.cgrid = new Map();
    const cs = 8;
    for (const c of this.colliders) {
      const k = Math.floor(c[0] / cs) + ',' + Math.floor(c[1] / cs);
      let l = this.cgrid.get(k);
      if (!l) this.cgrid.set(k, l = []);
      l.push(c);
    }
    this.collide = (x, z) => {
      let px = 0, pz = 0;
      const cx = Math.floor(x / cs), cz = Math.floor(z / cs);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const l = this.cgrid.get((cx + i) + ',' + (cz + j));
        if (!l) continue;
        for (const c of l) {
          const dx = x - c[0], dz = z - c[1];
          const d = Math.hypot(dx, dz);
          if (d < c[2] && d > 1e-4) { px += dx / d * (c[2] - d); pz += dz / d * (c[2] - d); }
        }
      }
      return [px, pz];
    };
  }

  /** Assign every instance to an LOD bin for the current camera. */
  update(camera) {
    const q = G.quality;
    // Re-binning uploads hundreds of instance buffers, so do it only when the view has really changed.
    // The culling frustum is widened so that a small turn of the head never reveals a hole.
    const cp = camera.position, cq = camera.quaternion;
    if (this._lp && this._since < 30 && this._lsolo === this.soloKey) {
      const moved = Math.hypot(cp.x - this._lp.x, cp.y - this._lp.y, cp.z - this._lp.z);
      const turned = 1 - Math.abs(cq.dot(this._lq));
      if (moved < 0.35 && turned < 0.0002 && Math.abs(camera.fov - this._lfov) < 0.5) { this._since++; return; }
    }
    this._lp = cp.clone(); this._lq = cq.clone(); this._lfov = camera.fov; this._since = 0; this._lsolo = this.soloKey;
    this._frame++; this._nearBudget = 1;
    let nearWant = false, sN = 0;
    const dNear = q.nearLeaves ?? 0, dNs = dNear * dNear;
    const wide = this._wide || (this._wide = new THREE.PerspectiveCamera());
    wide.fov = Math.min(150, camera.fov * 1.3 + 14); wide.aspect = camera.aspect; wide.near = camera.near; wide.far = camera.far;
    wide.updateProjectionMatrix();
    this._m.multiplyMatrices(wide.projectionMatrix, camera.matrixWorldInverse);
    this._fr.setFromProjectionMatrix(this._m);
    const fr = this._fr, sph = this._s;
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    let s0 = 0, s1 = 0, s2 = 0;
    for (const v of this.variants.values()) {
      if (!v.n) continue;
      if (this.soloKey && v.spKey !== this.soloKey) {
        // specimen review mode: only one species is drawn
        for (const e of v.lodMeshes) for (const m of [e.bark, e.leaves]) if (m) m.visible = false;
        if (v.near) for (const m of [v.near.bark, v.near.leaves, v.near.cards]) if (m) m.visible = false;
        continue;
      }
      const h = v.size.h;
      const k = v.tiny ? 0.55 : v.small ? 0.75 : 0.65 + h / 40;
      const d0 = q.lod0 * k, d1 = q.lod1 * k;
      const dMax = v.tiny ? 85 * q.groundDist : v.small ? 170 * q.groundDist : 1e9;
      const d0s = d0 * d0, d1s = d1 * d1, dMs = dMax * dMax;
      const bins = v.bins;
      bins[0].n = bins[1].n = bins[2].n = 0;
      if (v.near) v.near.bin.n = 0;
      const A = v.A, B = v.B;
      const rad = h * 0.75 + 1;
      for (let i = 0; i < v.n; i++) {
        const x = A[i * 4], y = A[i * 4 + 1], z = A[i * 4 + 2], sc = A[i * 4 + 3];
        const dx = x - cx, dy = y + h * 0.5 * sc - cy, dz = z - cz;
        const d2 = dx * dx + dz * dz + dy * dy * 0.25;
        if (d2 > dMs) continue;
        const L = d2 < d0s ? 0 : d2 < d1s ? 1 : 2;
        // keep nearby plants even when off screen: they cast near shadows
        if (L === 2 || d2 > 45 * 45) {
          sph.center.set(x, y + h * 0.5 * sc, z); sph.radius = rad * sc;
          if (!fr.intersectsSphere(sph)) continue;
        }
        let b = bins[L];
        if (L === 0 && v.gen && dx * dx + dz * dz + dy * dy < dNs) {
          // close enough to count the leaves
          if (this._ensureNear(v)) { if (v.near.bin.n < v.near.cap) b = v.near.bin; } else nearWant = true;
        }
        const o = b.n * 4, s = i * 4;
        b.A[o] = x; b.A[o + 1] = y; b.A[o + 2] = z; b.A[o + 3] = sc;
        b.B[o] = B[s]; b.B[o + 1] = B[s + 1]; b.B[o + 2] = B[s + 2]; b.B[o + 3] = 0;
        b.n++;
      }
      for (let L = 0; L < 3; L++) {
        const e = v.lodMeshes[L], b = bins[L];
        for (const m of [e.bark, e.leaves]) {
          if (!m) continue;
          m.visible = b.n > 0;
          if (b.n > 0) setInstances(m.geometry, b.A, b.B, b.n);
        }
      }
      if (v.near) {
        const b = v.near.bin;
        for (const m of [v.near.bark, v.near.leaves, v.near.cards]) { if (!m) continue; m.visible = b.n > 0; if (b.n > 0) setInstances(m.geometry, b.A, b.B, b.n); }
        sN += b.n;
      }
      s0 += bins[0].n; s1 += bins[1].n; s2 += bins[2].n;
    }
    this.stats.near = sN;
    // models still waiting to be built: come back next frame
    if (nearWant) this._lp = null;
    this.stats.lod0 = s0; this.stats.lod1 = s1; this.stats.lod2 = s2;
  }
}
