// Beyond the walkable cove: the forest continues as a canopy surface over rising ridges,
// fading into the blue haze the Smokies are named for.
import * as THREE from 'three';
import { RNG, clamp, lerp, smoothstep, fbm2, ridged2 } from '../core/rng.js';
import { G, WORLD, makeMaterial, makeDepthMaterial } from '../core/engine.js';

const HALF = WORLD / 2;

const VS = /* glsl */ `
attribute float wall;
varying vec3 vWorld; varying vec3 vN; varying float vWall;
void main(){
  vWorld = position; vN = normal; vWall = wall;
  gl_Position = projectionMatrix*viewMatrix*vec4(position, 1.0);
}`;
const FS = /* glsl */ `
varying vec3 vWorld; varying vec3 vN; varying float vWall;
vec3 crownField(vec2 p, out float h, out float id){
  // cellular crowns
  vec2 i = floor(p), f = fract(p);
  float f1 = 9.0; vec2 bid = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y));
    vec2 o = hash22(i + g);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < f1){ f1 = d; bid = i + g; }
  }
  h = 1.0 - smoothstep(0.0, 0.75, sqrt(f1));
  vec3 rnd = hash32(bid);
  id = rnd.x;
  return rnd;
}
float crownH(vec2 p){ float h, id; crownField(p, h, id); return h; }
vec3 crownColour(vec3 rnd, float id, float ridge, float draw){
  // gold chestnut matrix, clear-yellow poplar and hickory, russet and still-green oaks on the spurs, scarlet maple and gum, hemlock in the draws
  vec3 col = mix(vec3(0.36, 0.20, 0.022), vec3(0.52, 0.34, 0.035), rnd.y);
  col = mix(col, mix(vec3(0.58, 0.44, 0.04), vec3(0.50, 0.40, 0.07), rnd.z), step(0.80, rnd.y));
  float oak = step(0.80 - 0.30*smoothstep(0.45, 0.7, ridge), id);
  col = mix(col, mix(vec3(0.33, 0.11, 0.028), mix(vec3(0.20, 0.22, 0.04), vec3(0.46, 0.20, 0.04), rnd.y), rnd.z), oak);
  col = mix(col, mix(vec3(0.50, 0.035, 0.022), vec3(0.70, 0.20, 0.03), rnd.z), step(id, 0.11));
  col = mix(col, vec3(0.026, 0.060, 0.032), step(0.93 - 0.45*smoothstep(0.52, 0.75, draw), rnd.z)*step(0.2, id));
  return col;
}
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float dist = length(cameraPosition - vWorld);
  // two generations of crowns: broad old-growth domes, and smaller trees filling between them
  vec2 wp = vWorld.xz + (vec2(fbm(vWorld.xz*0.021), fbm(vWorld.zx*0.021 + 7.0)) - 0.5)*26.0;
  float h1, id1, h2, id2;
  vec3 r1 = crownField(wp/13.5, h1, id1);
  vec3 r2 = crownField(wp/7.0 + 31.7, h2, id2);
  h2 *= 0.72;
  bool big = h1 >= h2;
  float h = big ? h1 : h2, id = big ? id1 : id2;
  vec3 rnd = big ? r1 : r2;
  float ridge = fbm(vWorld.xz*0.004 + 3.0);
  float draw = fbm(vWorld.xz*0.006 + 11.0);
  vec3 col = crownColour(rnd, id, ridge, draw);
  // sprays and leaf clumps break each crown up
  float clump = fbm(vWorld.xz*0.55 + rnd.xy*40.0);
  col *= 0.50 + 0.66*clump;
  col = mix(col, col*vec3(1.12, 0.95, 0.8), smoothstep(0.55, 0.8, vnoise(vWorld.xz*2.1)));
  // distance merges the mosaic into broad drifts of colour
  vec3 drift = mix(vec3(0.40, 0.24, 0.035), vec3(0.33, 0.15, 0.03), smoothstep(0.4, 0.7, ridge));
  col = mix(col, drift*(0.8 + 0.4*fbm(vWorld.xz*0.012)), smoothstep(900.0, 3200.0, dist)*0.7);
  // domed crowns: light one side, shade the other, deep shade in the chinks between
  float fade = smoothstep(3600.0, 600.0, dist);
  float hh = h + (clump - 0.5)*0.35;
  vec2 gH = vec2(dFdx(hh), dFdy(hh));
  vec3 dpx = dFdx(vWorld), dpy = dFdy(vWorld);
  // gradient of the crown height in world xz, from screen-space derivatives
  float det = dpx.x*dpy.z - dpx.z*dpy.x;
  vec2 gw = abs(det) > 1e-9 ? vec2(gH.x*dpy.z - gH.y*dpx.z, -gH.x*dpy.x + gH.y*dpx.x)/det : vec2(0.0);
  gw = clamp(gw*7.0, -1.6, 1.6);
  vec3 Nc = normalize(N - vec3(gw.x, 0.0, gw.y)*fade);
  float gapShade = mix(1.0, mix(0.34, 1.0, smoothstep(0.0, 0.22, h)), fade);
  // under the outer forest (real trees stand here) the surface is leaf litter in deep shade
  float gz = vWall;
  vec3 lit = mix(vec3(0.20, 0.12, 0.035), vec3(0.34, 0.22, 0.06), vnoise(vWorld.xz*0.7))*(0.7 + 0.6*vnoise(vWorld.xz*3.1));
  float wallF = gz;
  Surf s;
  s.albedo = mix(col*gapShade, lit, gz); s.N = normalize(mix(Nc, N, gz)); s.rough = 0.85; s.spec = 0.2; s.ao = mix(mix(0.6, 1.0, smoothstep(0.0, 0.5, h)), 0.8, gz); s.trans = 0.0; s.transCol = vec3(0.0); s.above = 1.0 - gz;
  // crowns shade their neighbours when the sun is low
  float self = mix(1.0, smoothstep(0.02, 0.45, h + uSunDir.y*0.9), 0.75*fade);
  // no shadow map out here: assume the closed canopy passes only flecks of sun
  vec3 c = shadeSurface(s, vWorld, V, mix(self, 0.14, gz));
  // leaves pass light on: the shaded side of a crown still glows
  c += col*uSunColor*(0.05 + 0.06*pow(max(dot(V, -uSunDir), 0.0), 3.0))*(1.0 - wallF);
  gl_FragColor = vec4(c, 1.0);
}`;

export const OUTER = 560;   // real (proxy) trees continue this far beyond the cove

/** Terrain height outside the cove; beyond the outer forest the surface is lifted to canopy height. */
export function makeFarHeight(terrain, lift = true) {
  const S = terrain.seed;
  return (x, z) => {
    const ox = Math.max(0, Math.abs(x) - HALF), oz = Math.max(0, Math.abs(z) - HALF);
    const out = Math.hypot(ox, oz);
    if (out <= 0) return terrain.heightAt(x, z);
    const edge = terrain.heightAt(clamp(x, -HALF, HALF), clamp(z, -HALF, HALF));
    let base = terrain.macro(x, z);
    // big country: ridges rising away from the cove, valley opening downstream (south-east)
    const r = Math.hypot(x, z);
    const far = smoothstep(420, 1700, r);
    const openDir = clamp((x * 0.35 + z * 0.94) / (r + 1), -1, 1);
    const mtn = 60 + 520 * ridged2(x * 0.00055 + 3.1, z * 0.00055 - 1.7, 5, S + 300) + 160 * fbm2(x * 0.0016, z * 0.0016, 4, S + 301);
    base = lerp(base, base * 0.3 + mtn * (0.45 + 0.55 * (1 - smoothstep(0.2, 0.95, openDir))), far);
    const h = lerp(edge, base, smoothstep(0, 60, out));
    const m = Math.max(Math.abs(x), Math.abs(z));
    return h + (lift ? 26 * smoothstep(OUTER - 25, OUTER + 30, m) : 0);
  };
}

export function buildBackdrop(terrain, seed) {
  const rng = new RNG(seed).fork('backdrop');
  const S = terrain.seed;
  // non-uniform square grid: fine at the cove edge, coarse far away
  const coords = [];
  const inner = [];
  const m0 = 20;
  for (let i = -m0; i <= m0; i++) inner.push(i / m0 * (HALF - 1.5));
  const outer = [];
  let d = HALF - 1.5, step = 6;
  while (d < 5200) { d += step; step *= 1.22; outer.push(d); }
  const axis = [...outer.slice().reverse().map((v) => -v), ...inner, ...outer];
  const n = axis.length;
  const pos = new Float32Array(n * n * 3), wall = new Float32Array(n * n);
  const hAt = makeFarHeight(terrain);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = axis[i], z = axis[j];
    const k = (j * n + i) * 3;
    pos[k] = x; pos[k + 1] = hAt(x, z); pos[k + 2] = z;
    const out = Math.hypot(Math.max(0, Math.abs(x) - HALF), Math.max(0, Math.abs(z) - HALF));
    wall[j * n + i] = Math.max(Math.abs(x), Math.abs(z)) < OUTER + 10 ? 1 : 0;
  }
  const idx = [];
  const lim = HALF - 3;
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    // skip quads wholly inside the cove
    if (Math.abs(axis[i]) < lim && Math.abs(axis[i + 1]) < lim && Math.abs(axis[j]) < lim && Math.abs(axis[j + 1]) < lim) continue;
    const a = j * n + i, b = a + 1, c = a + n, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  // inner rows sit under the real terrain: drop them slightly to avoid z-fighting
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (Math.abs(axis[i]) <= HALF - 1 && Math.abs(axis[j]) <= HALF - 1) pos[(j * n + i) * 3 + 1] -= 0.6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('wall', new THREE.BufferAttribute(wall, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = makeMaterial({ name: 'backdrop', vs: VS, fs: FS });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false; mesh.matrixAutoUpdate = false;
  mesh.name = 'backdrop';
  return { mesh };
}
