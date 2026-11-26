// Engine context: shared uniforms, material factory, instancing helpers, quality presets.
import * as THREE from 'three';
import { COMMON, INSTANCING, WIND, SHADOWS, LIGHTING } from './glsl.js';

export const WORLD = 400; // metres, square, centred on origin

export const QUALITY = {
  low:    { nearLeaves: 0, pom: 0, outer: 0.35, reflect: false, scale: 0.7,  msaa: 2, shadowNear: 1024, shadowFar: 2048, taps: 6,  search: 4, lod0: 22, lod1: 70,  cards: 0.5, ground: 0.45, groundDist: 0.6, vol: 12, ao: 0, litter: 0.4, bark: 512 },
  medium: { nearLeaves: 6, pom: 8, outer: 0.6, reflect: false, scale: 0.85, msaa: 4, shadowNear: 2048, shadowFar: 2048, taps: 8,  search: 5, lod0: 30, lod1: 95,  cards: 0.75, ground: 0.7, groundDist: 0.8, vol: 18, ao: 1, litter: 0.7, bark: 512 },
  high:   { nearLeaves: 9, reflect: true, scale: 1.0,  msaa: 4, shadowNear: 2048, shadowFar: 4096, taps: 8, search: 5, lod0: 36, lod1: 112, cards: 1.0, ground: 1.0, groundDist: 1.0, vol: 28, ao: 1, litter: 1.0, bark: 1024 },
  ultra:  { nearLeaves: 13, reflect: true, scale: 1.0,  msaa: 4, shadowNear: 4096, shadowFar: 4096, taps: 12, search: 6, lod0: 55, lod1: 150, cards: 1.0, ground: 1.4, groundDist: 1.3, vol: 40, ao: 1, litter: 1.5, bark: 1024 },
};

export const G = {
  renderer: null,
  scene: null,
  camera: null,
  quality: QUALITY.high,
  qualityName: 'high',
  seed: 1850,
  time: 0,
  frame: 0,
  casters: [],     // { mesh, depthMat } rendered into the near shadow map
  farCasters: [],  // { mesh, depthMat } rendered into the world shadow map
  updaters: [],    // fn(dt, camera)
  uniforms: {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.5).normalize() },
    uSunColor: { value: new THREE.Vector3(8, 7.5, 6.5) },
    uSkyTop: { value: new THREE.Vector3(0.4, 0.6, 1.0) },
    uSkyHorizon: { value: new THREE.Vector3(0.8, 0.85, 0.9) },
    uGroundCol: { value: new THREE.Vector3(0.2, 0.15, 0.08) },
    uCanopyGlow: { value: new THREE.Vector3(0.3, 0.3, 0.3) },
    uWind: { value: new THREE.Vector4(0.8, 0.6, 0.35, 0.6) },
    uWet: { value: 0 },
    uDebug: { value: 0 },
    uFrameN: { value: 0 },
    uWorld: { value: new THREE.Vector3(WORLD, 1 / WORLD, 80) },
    uHeightMap: { value: null },
    uCanopyMap: { value: null },
    uSiteMap: { value: null },
    uShadowNear: { value: null },
    uShadowFar: { value: null },
    uShadowNearMat: { value: new THREE.Matrix4() },
    uShadowFarMat: { value: new THREE.Matrix4() },
    uShadowNearInfo: { value: new THREE.Vector4(0.02, 200, 1 / 2048, 1) },
    uShadowFarInfo: { value: new THREE.Vector4(0.002, 600, 1 / 4096, 1) },
    uSunSoft: { value: 0.02 },
  },
};

const SHARED_KEYS = Object.keys(G.uniforms);

function sharedUniforms() {
  const u = {};
  for (const k of SHARED_KEYS) u[k] = G.uniforms[k];
  return u;
}

function qualityDefines() {
  return `#define SHADOW_TAPS ${G.quality.taps}\n#define SHADOW_SEARCH ${G.quality.search}\n`;
}

/**
 * Build a world ShaderMaterial.
 * opts: { vs, fs, uniforms, instanced, wind, lit, shadows, defines, side, a2c, ... }
 * The vertex shader body gets COMMON (+INSTANCING, +WIND); the fragment gets COMMON (+SHADOWS, +LIGHTING).
 */
export function makeMaterial(opts) {
  const {
    vs, fs, uniforms = {}, instanced = false, wind = false, lit = true, defines = {},
    side = THREE.FrontSide, a2c = false, transparent = false, depthWrite = true, depthTest = true,
    blending = THREE.NormalBlending, name = '', polygonOffset = false,
  } = opts;
  const u = { ...sharedUniforms(), ...uniforms };
  if (instanced && !u.uAlign) u.uAlign = { value: 0 };
  const vsrc = `${COMMON}\n${instanced ? INSTANCING : ''}\n${wind ? WIND : ''}\n${vs}`;
  const fsrc = `${qualityDefines()}${COMMON}\n${lit ? SHADOWS + LIGHTING : ''}\n${fs}`;
  const m = new THREE.ShaderMaterial({
    name, uniforms: u, vertexShader: vsrc, fragmentShader: fsrc, defines, side,
    transparent, depthWrite, depthTest, blending,
  });
  m.alphaToCoverage = a2c && !(typeof location !== 'undefined' && /[?&]a2c=0/.test(location.search));
  if (polygonOffset) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; }
  return m;
}

/** Depth-only material for shadow passes (vertex stage must mirror the visible material). */
export function makeDepthMaterial(opts) {
  const { vs, fs = null, uniforms = {}, instanced = false, wind = false, defines = {}, side = THREE.DoubleSide } = opts;
  const u = { ...sharedUniforms(), ...uniforms };
  if (instanced && !u.uAlign) u.uAlign = { value: 0 };
  const vsrc = `#define DEPTH_PASS 1\n${COMMON}\n${instanced ? INSTANCING : ''}\n${wind ? WIND : ''}\n${vs}`;
  const fsrc = `#define DEPTH_PASS 1\n${COMMON}\n${fs || 'void main(){ gl_FragColor = vec4(1.0); }'}`;
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: vsrc, fragmentShader: fsrc, defines, side });
  m.colorWrite = false;
  return m;
}

/** Instanced geometry sharing vertex buffers with a base geometry. */
export function makeInstancedGeometry(base, capacity) {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const k of Object.keys(base.attributes)) g.setAttribute(k, base.attributes[k]);
  const a = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
  const b = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
  a.setUsage(THREE.DynamicDrawUsage);
  b.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iA', a);
  g.setAttribute('iB', b);
  g.instanceCount = 0;
  g.userData.capacity = capacity;
  // generous bounds: instanced meshes are culled manually (or not at all)
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  g.boundingBox = new THREE.Box3(new THREE.Vector3(-1e5, -1e5, -1e5), new THREE.Vector3(1e5, 1e5, 1e5));
  return g;
}

export function setInstances(geo, arrA, arrB, count) {
  const a = geo.attributes.iA, b = geo.attributes.iB;
  const n = Math.min(count, geo.userData.capacity);
  a.array.set(arrA.subarray(0, n * 4));
  b.array.set(arrB.subarray(0, n * 4));
  a.clearUpdateRanges(); b.clearUpdateRanges();
  a.addUpdateRange(0, n * 4); b.addUpdateRange(0, n * 4);
  a.needsUpdate = true; b.needsUpdate = true;
  geo.instanceCount = n;
}

// layer 1: near shadow map, layer 2: world shadow map
export function registerCaster(mesh, depthMat, far = false) {
  mesh.layers.enable(far ? 2 : 1);
  if (far) mesh.layers.enable(3);   // layer 3: what the stream reflects
  (far ? G.farCasters : G.casters).push({ mesh, depthMat });
}

export function fullscreenTriangle() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  return g;
}

/** Render a fullscreen shader into a target. */
export class FSPass {
  constructor(fragmentShader, uniforms = {}, opts = {}) {
    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy*0.5+0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader,
      depthTest: false, depthWrite: false, ...opts,
    });
    this.mesh = new THREE.Mesh(fullscreenTriangle(), this.material);
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  get u() { return this.material.uniforms; }
  render(renderer, target = null) {
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.cam);
  }
}

export function dataTexture(data, w, h, { format = THREE.RGBAFormat, type = THREE.FloatType, filter = THREE.LinearFilter, wrap = THREE.ClampToEdgeWrapping, mips = false, srgb = false } = {}) {
  const t = new THREE.DataTexture(data, w, h, format, type);
  t.magFilter = filter;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : filter;
  t.generateMipmaps = mips;
  t.wrapS = t.wrapT = wrap;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}
