// Falling leaves and rain, kept in a volume around the viewer. Motion is a pure function of time,
// so nothing is simulated on the CPU.
import * as THREE from 'three';
import { RNG } from '../core/rng.js';
import { G, makeMaterial } from '../core/engine.js';

const LEAF_VS = /* glsl */ `
attribute vec4 seed;     // x,y,z: position seed, w: phase
attribute vec2 corner;
uniform vec3 uBox;       // half extents x, height, half extents z
uniform float uRate;     // 0..1 fraction of leaves in the air
uniform float uSize;
varying vec3 vWorld; varying vec2 vUv; varying vec3 vN; varying float vSeed; varying float vAlive;
void main(){
  float fall = 0.55 + 0.9*seed.w;
  float t = uTime*fall*0.5 + seed.y*37.0;
  float cyc = fract(t/ (uBox.y*0.5));
  // position within a camera-centred wrapping volume
  vec3 c = cameraPosition;
  vec2 drift = uWind.xy*uWind.z*(2.2 + 2.0*seed.w)*cyc*uBox.y*0.5;
  vec2 sway = vec2(sin(uTime*1.3*fall + seed.x*40.0), cos(uTime*1.1*fall + seed.z*31.0))*(0.35 + 0.6*seed.w);
  vec2 xz = (seed.xz*2.0 - 1.0)*uBox.xz + drift + sway;
  xz = mod(xz - c.xz + uBox.xz, uBox.xz*2.0) - uBox.xz + c.xz;
  float ground = terrainH(xz);
  float y = ground + uBox.y*(1.0 - cyc) - 0.5;
  vAlive = step(seed.w*0.999, uRate)*smoothstep(0.0, 0.03, cyc)*step(ground + 0.02, y);
  // tumbling: a leaf rocks and spins about a wandering axis
  float a1 = uTime*(2.0 + 3.0*seed.x) + seed.z*20.0, a2 = uTime*(1.2 + 2.0*seed.z) + seed.x*20.0;
  vec3 ax = normalize(vec3(sin(a2), 0.6 + 0.4*cos(a1*0.37), cos(a2)));
  vec3 bx = normalize(cross(ax, vec3(0.3, 1.0, 0.1)));
  vec3 nx = cross(ax, bx);
  float rock = sin(a1)*1.1;
  vec3 up = normalize(bx*cos(rock) + nx*sin(rock));
  vec3 side = normalize(cross(ax, up));
  vec3 p = vec3(xz.x, y, xz.y) + (ax*corner.y*uSize + side*corner.x*uSize*0.5)*vAlive;
  vWorld = p; vUv = uv; vN = up; vSeed = seed.w;
  gl_Position = projectionMatrix*viewMatrix*vec4(p, 1.0);
}`;
const LEAF_FS = /* glsl */ `
uniform sampler2D tLeaf;
varying vec3 vWorld; varying vec2 vUv; varying vec3 vN; varying float vSeed; varying float vAlive;
void main(){
  if (vAlive < 0.5) discard;
  vec4 a = texture(tLeaf, vUv);
  if (a.a < 0.5) discard;
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  Surf s;
  s.albedo = a.rgb; s.N = N; s.rough = 0.6; s.spec = 0.5; s.ao = 1.0; s.trans = 0.9; s.transCol = saturateCol(a.rgb, 1.25)*1.15;
  s.above = smoothstep(3.0, 20.0, vWorld.y - terrainH(vWorld.xz));
  float sh = sunShadow(vWorld, normalize(N + uSunDir), ign(gl_FragCoord.xy));
  gl_FragColor = vec4(shadeSurface(s, vWorld, V, sh), 1.0);
}`;

const RAIN_VS = /* glsl */ `
attribute vec4 seed; attribute vec2 corner;
uniform vec3 uBox; uniform float uRain;
varying float vA; varying float vV;
void main(){
  float sp = 7.5 + 3.0*seed.w;
  float cyc = fract((uTime*sp + seed.y*97.0)/uBox.y);
  vec3 c = cameraPosition;
  vec2 slant = uWind.xy*uWind.z*1.6;
  vec2 xz = (seed.xz*2.0 - 1.0)*uBox.xz + slant*cyc*uBox.y*0.12;
  xz = mod(xz - c.xz + uBox.xz, uBox.xz*2.0) - uBox.xz + c.xz;
  float y = c.y - uBox.y*0.4 + uBox.y*(1.0 - cyc);
  vec3 p = vec3(xz.x, y, xz.y);
  vec3 dir = normalize(vec3(slant.x*0.12, -1.0, slant.y*0.12));
  vec3 toCam = normalize(c - p);
  vec3 side = normalize(cross(dir, toCam));
  float len = 0.22 + 0.25*seed.w;
  p += dir*corner.y*len + side*corner.x*0.0035;
  float ground = terrainH(xz);
  vA = step(seed.w, uRain)*step(ground, p.y)*smoothstep(60.0, 20.0, distance(p, c));
  vV = corner.y;
  gl_Position = projectionMatrix*viewMatrix*vec4(p, 1.0);
}`;
const RAIN_FS = /* glsl */ `
varying float vA; varying float vV;
void main(){
  if (vA < 0.01) discard;
  vec3 col = (uSkyTop + uSkyHorizon)*0.5 + uSunColor*0.03;
  float a = 0.32*vA*sin(vV*3.14159);
  gl_FragColor = vec4(col*a, a);
}`;

function quadCloud(n, rng, cells) {
  const g = new THREE.BufferGeometry();
  const seed = new Float32Array(n * 16), corner = new Float32Array(n * 8), uv = new Float32Array(n * 8), pos = new Float32Array(n * 12);
  const idx = new Uint32Array(n * 6);
  const cs = [[-1, 0], [1, 0], [-1, 1], [1, 1]];
  for (let i = 0; i < n; i++) {
    const s = [rng.next(), rng.next(), rng.next(), rng.next()];
    const cell = cells ? cells[Math.floor(rng.next() * cells.length)] : { u0: 0, v0: 0, u1: 1, v1: 1, aspect: 1 };
    for (let k = 0; k < 4; k++) {
      seed.set(s, (i * 4 + k) * 4);
      corner[(i * 4 + k) * 2] = cs[k][0] * (cell.aspect || 1); corner[(i * 4 + k) * 2 + 1] = cs[k][1];
      uv[(i * 4 + k) * 2] = cs[k][0] < 0 ? cell.u0 : cell.u1; uv[(i * 4 + k) * 2 + 1] = cs[k][1] < 0.5 ? cell.v0 : cell.v1;
    }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2], i * 6);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  g.setAttribute('corner', new THREE.BufferAttribute(corner, 2));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return g;
}

export function buildWeatherFX(flora, seed) {
  const rng = new RNG(seed).fork('fx');
  const group = new THREE.Group();
  group.name = 'weatherfx';
  const leafMats = [];
  for (const [id, n, size] of [['chestnut', 420, 0.2], ['redmaple', 120, 0.16], ['tulip', 70, 0.2], ['redoak', 70, 0.22], ['beech', 60, 0.11]]) {
    const sh = flora.sheet(id);
    const uniforms = { tLeaf: { value: sh.tex }, uBox: { value: new THREE.Vector3(22, 30, 22) }, uRate: { value: 0.3 }, uSize: { value: size } };
    const mat = makeMaterial({ name: 'fall:' + id, vs: LEAF_VS, fs: LEAF_FS, uniforms, side: THREE.DoubleSide });
    const m = new THREE.Mesh(quadCloud(Math.round(n * G.quality.litter), rng, sh.cells), mat);
    m.frustumCulled = false; m.matrixAutoUpdate = false;
    group.add(m);
    leafMats.push(mat);
  }
  const rainU = { uBox: { value: new THREE.Vector3(26, 34, 26) }, uRain: { value: 0 } };
  const rainMat = makeMaterial({ name: 'rain', vs: RAIN_VS, fs: RAIN_FS, uniforms: rainU, lit: false, transparent: true, depthWrite: false, blending: THREE.CustomBlending, side: THREE.DoubleSide });
  rainMat.blendSrc = THREE.OneFactor; rainMat.blendDst = THREE.OneMinusSrcAlphaFactor;
  const rain = new THREE.Mesh(quadCloud(Math.round(9000 * G.quality.litter), rng, null), rainMat);
  rain.frustumCulled = false; rain.matrixAutoUpdate = false; rain.renderOrder = 20;
  group.add(rain);
  const update = (sky) => {
    const w = sky.w;
    // leaves let go in gusts
    const rate = Math.min(1, 0.10 + 0.55 * w.wind * w.wind + 0.25 * w.rain);
    for (const m of leafMats) m.uniforms.uRate.value = rate;
    rainU.uRain.value = w.rain;
    rain.visible = w.rain > 0.01;
  };
  return { group, update };
}
