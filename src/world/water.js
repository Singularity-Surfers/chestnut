// The stream: a ribbon of water following the channel, with pools, riffles and small cascades.
// The bed seen through the water is evaluated procedurally (same cobble as the banks), then tinted by
// depth; reflections come from the analytic sky plus the canopy map (golden crowns mirrored in pools).
import * as THREE from 'three';
import { G, makeMaterial } from '../core/engine.js';
import { GROUND_COMMON } from './ground.js';
import { WORLD } from '../core/engine.js';

const VS = /* glsl */ `
attribute vec3 flow;   // x: speed 0..1, y: steepness (white water), z: half width
varying vec3 vWorld; varying vec2 vUv; varying vec3 vFlow; varying vec2 vDir;
attribute vec2 dir;
void main(){
  vWorld = position; vUv = uv; vFlow = flow; vDir = dir;
  gl_Position = projectionMatrix*viewMatrix*vec4(position, 1.0);
}`;

const FS = /* glsl */ `
varying vec3 vWorld; varying vec2 vUv; varying vec3 vFlow; varying vec2 vDir;
uniform sampler2D tRefl; uniform mat4 uReflMat; uniform float uReflOn;
${GROUND_COMMON}
float wnoise(vec2 p){ return vnoise(p)*0.6 + vnoise(p*2.3 + 1.7)*0.4; }
vec2 waveGrad(vec2 p, float t, float speed){
  // scrolling ripples, mostly advected downstream
  vec2 q1 = p*vec2(2.6, 1.1) + vec2(0.0, -t*speed*1.3);
  vec2 q2 = p*vec2(5.5, 2.4) + vec2(t*0.12, -t*speed*2.0);
  float e = 0.08;
  float a = wnoise(q1), b = wnoise(q2);
  vec2 g = vec2(wnoise(q1 + vec2(e, 0.0)) - a, wnoise(q1 + vec2(0.0, e)) - a)*1.0
         + vec2(wnoise(q2 + vec2(e, 0.0)) - b, wnoise(q2 + vec2(0.0, e)) - b)*0.5;
  return g/e;
}
void main(){
  float bedH = terrainH(vWorld.xz);
  float depth = vWorld.y - bedH;
  if (depth < 0.004) discard;
  // the ribbon overshoots at bends: keep only fragments that belong to the local channel
  vec2 wmap = texture(uWaterMap, worldUV(vWorld)).rg;
  if (wmap.g > 0.9 || abs(vWorld.y - wmap.r) > 0.22) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  float speed = vFlow.x, steep = vFlow.y;
  // stream-space coordinates: u across, v downstream
  vec2 sp = vec2(vUv.x*vFlow.z, vUv.y);
  float t = uTime;
  vec2 g = waveGrad(sp, t, 0.25 + speed*1.6);
  float amp = (0.022 + 0.09*speed + 0.35*steep)*smoothstep(0.0, 0.12, depth) + 0.012*uWind.z;
  // rain rings
  // rotate gradient from stream space to world
  vec2 gw = vec2(g.x*vDir.y + g.y*vDir.x, -g.x*vDir.x + g.y*vDir.y);
  vec3 N = normalize(vec3(-gw.x*amp, 1.0, -gw.y*amp));

  // --- bed seen through the surface (refraction shifts the lookup)
  vec3 cn;
  vec2 refr = -N.xz*depth*0.6 - V.xz/max(V.y, 0.3)*depth*0.35;
  vec4 c1 = cobbles(vWorld.xz + refr, 5.5, cn);
  vec3 cn2;
  vec4 c2 = cobbles(vWorld.xz + refr + 3.3, 17.0, cn2);
  vec3 bed = (c1.a > 0.42 ? c1.rgb : mix(c2.rgb, c1.rgb, 0.25));
  float silt = smoothstep(0.55, 0.9, fbm(vWorld.xz*1.7 + 7.0));
  // pools floor with dark silt and drowned leaves; stones show mainly in the riffles
  float poolBed = 1.0 - speed;
  // pools floor with sand and fine gravel, drifts of silt in the deep slack water
  vec3 sand = mix(vec3(0.16, 0.12, 0.075), vec3(0.24, 0.19, 0.12), vnoise(vWorld.xz*23.0 + refr*20.0))*(0.8 + 0.4*vnoise(vWorld.xz*3.1));
  bed = mix(bed, sand, clamp(poolBed*1.1, 0.0, 0.92)*(1.0 - 0.3*step(0.42, c1.a)*step(0.6, hash12(floor(vWorld.xz*0.7)))));
  bed = mix(bed, vec3(0.060, 0.045, 0.028), clamp(silt*0.7*poolBed, 0.0, 0.8));
  // this autumn's leaves, waterlogged and sunk: ovals of gold and brown lying every way on the bottom
  vec2 lq = (vWorld.xz + refr)*11.0;
  vec2 li = floor(lq), lf = fract(lq) - 0.5;
  vec3 lh = hash32(li);
  float la = lh.x*6.283;
  vec2 lr = vec2(lf.x*cos(la) + lf.y*sin(la), -lf.x*sin(la) + lf.y*cos(la)) - (lh.yz - 0.5)*0.3;
  float leafMask = smoothstep(0.34, 0.26, length(lr*vec2(1.0, 2.3)) + 0.08*vnoise(lq*5.0))*step(0.62, hash12(li + 7.7))*(0.25 + 0.75*poolBed);
  vec3 leafCol = mix(vec3(0.17, 0.10, 0.03), vec3(0.085, 0.05, 0.022), lh.y);
  bed = mix(bed, leafCol, leafMask*0.7);
  bed *= 0.72;                                        // wet stone is dark
  float sh = sunShadow(vWorld, vec3(0.0, 1.0, 0.0), ign(gl_FragCoord.xy));
  // caustic shimmer on the bed where the sun reaches it
  float ca = pow(wnoise(sp*vec2(7.0, 4.0) + g*0.35 + vec2(0.0, -t*0.6)), 3.0)*2.4;
  vec4 cm = texture(uCanopyMap, worldUV(vWorld));
  vec3 amb = skyAmbient(vec3(0.0, 1.0, 0.0))*(1.0 - cm.a*0.8) + uCanopyGlow*cm.a;
  vec3 bedLit = bed*(uSunColor*max(uSunDir.y, 0.0)*sh*(0.20 + 0.5*ca) + amb);
  // absorption: clear mountain water with a faint tea stain
  vec3 absorb = exp(-depth*vec3(0.75, 0.9, 1.55)*1.15);
  vec3 scatter = vec3(0.026, 0.026, 0.014)*(uSunColor*max(uSunDir.y, 0.0)*sh*0.3 + amb);
  vec3 col = bedLit*absorb + scatter*(1.0 - absorb.g);

  // --- reflection: sky through canopy gaps, sunlit crowns elsewhere
  vec3 R = reflect(-V, N);
  R.y = abs(R.y) + 0.02;
  vec2 rp = vWorld.xz + R.xz/R.y*22.0;
  vec4 rc = texture(uCanopyMap, rp*uWorld.y + 0.5);
  vec3 tint = rc.rgb*rc.rgb;
  vec3 crowns = tint*(uSunColor*(0.10 + 0.22*max(uSunDir.y, 0.0)) + skyAmbient(vec3(0.0, 1.0, 0.0))*0.35);
  // leaf-scale variation so the mirror is not a flat wash
  float lv = vnoise(rp*0.9) * vnoise(rp*2.7 + 4.0);
  crowns *= 0.45 + 1.5*lv;
  // grazing rays meet the wall of forest; only steep ones find sky through the canopy gap
  float gap = (1.0 - rc.a)*smoothstep(0.1, 0.5, lv + 0.25)*smoothstep(0.22, 0.7, R.y);
  vec3 skyc = mix(uSkyHorizon, uSkyTop, R.y);
  vec3 wall = tint*(uSunColor*0.035 + skyAmbient(vec3(0.0, 1.0, 0.0))*0.16)*(0.4 + 1.6*lv);
  crowns = mix(wall, crowns, smoothstep(0.1, 0.5, R.y));
  vec3 refl = mix(crowns, skyc, clamp(gap, 0.0, 1.0));
  if (uReflOn > 0.01){
    // true mirror image of the forest, rippled by the surface normal
    vec4 rp4 = uReflMat*vec4(vWorld + vec3(N.x, 0.0, N.z)*(0.7 + 2.0*amp), 1.0);
    vec2 ruv = clamp(rp4.xy/rp4.w, 0.004, 0.996);   // rays leaving the mirror image reuse its edge
    if (rp4.w > 0.0){
      vec3 planar = texture(tRefl, ruv).rgb;
      if (uDebug > 5.5){ gl_FragColor = vec4(planar, 1.0); return; }
      // sample a second, slightly offset copy to soften facets of the proxy crowns
      planar = 0.6*planar + 0.4*texture(tRefl, ruv + N.xz*0.012).rgb;
      // the mirrored proxies are sparser than the real crowns: where they show open sky under what the
      // canopy map says is closed canopy, fill with crown colour so the pool reflects foliage, not a clear sky
      float pl = luma(planar);
      float skyish = smoothstep(0.02, 0.22, (planar.b - planar.r)/max(pl, 1e-3))*smoothstep(0.25, 0.9, pl/max(luma(skyc), 1e-3));
      planar = mix(planar, crowns, skyish*clamp(rc.a*1.25, 0.0, 1.0)*(0.55 + 0.45*smoothstep(0.2, 0.6, lv + 0.2)));
      // broken water scatters the mirror image
      refl = mix(refl, planar, uReflOn*(1.0 - smoothstep(0.25, 0.7, steep)));
    }
  }
  // dark trunks streak the reflection
  float trunk = smoothstep(0.72, 0.9, vnoise(vec2(rp.x*1.3 + rp.y*0.2, 3.0)));
  refl *= 1.0 - 0.55*trunk*rc.a;
  float F = 0.02 + 0.98*pow(1.0 - max(dot(N, V), 0.0), 5.0);
  col = mix(col, refl, F);
  // sun glitter
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), 600.0)*90.0 + pow(max(dot(N, H), 0.0), 60.0)*0.6;
  col += uSunColor*spec*sh*F*2.0;

  // --- white water: threads of foam drawn out along the flow, with dark glassy water between
  vec2 fp = sp*vec2(11.0, 0.9) + vec2(0.0, -t*(1.2 + speed*2.8));
  float thread = wnoise(fp)*0.6 + wnoise(fp*vec2(2.7, 2.1) + 3.1)*0.4;
  float bubbles = wnoise(sp*vec2(34.0, 16.0) + vec2(0.0, -t*4.0));
  float chute = smoothstep(0.55, 1.0, steep);
  float foam = chute*smoothstep(0.50, 0.74, thread + chute*0.10)*(0.5 + 0.5*bubbles);
  foam += smoothstep(0.25, 0.55, steep)*(1.0 - chute)*smoothstep(0.64, 0.84, thread)*0.55;
  // lace where fast water runs thin over stones
  foam += smoothstep(0.06, 0.0, depth)*smoothstep(0.5, 0.9, speed)*smoothstep(0.58, 0.8, thread)*0.4;
  foam = clamp(foam, 0.0, 1.0);
  float fshade = 0.55 + 0.45*bubbles;
  vec3 foamCol = vec3(0.70, 0.75, 0.76)*fshade*(uSunColor*max(uSunDir.y, 0.0)*sh*0.22 + amb*0.9);
  // falling water is aerated through and through: no clear view of the bed or of reflections
  col = mix(col, foamCol*0.62, chute*0.7);
  col = mix(col, foamCol, foam*0.88);
  // soften the shoreline
  float edge = smoothstep(0.004, 0.035, depth);
  gl_FragColor = vec4(col, edge);
}`;

export function buildWater(terrain) {
  const group = new THREE.Group();
  group.name = 'water';
  const mat = makeMaterial({ name: 'water', vs: VS, fs: FS, uniforms: { uWaterMap: { value: G.waterTex }, tRefl: { value: null }, uReflMat: { value: new THREE.Matrix4() }, uReflOn: { value: 0 } }, transparent: true, depthWrite: true, side: THREE.DoubleSide });
  const HALF = WORLD / 2;
  const pools = [];
  for (const st of terrain.streams) {
    const pts = st.pts;
    const pos = [], uv = [], flow = [], dir = [], idx = [];
    const NX = 6;
    let rows = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (Math.abs(p.x) > HALF + 12 || Math.abs(p.z) > HALF + 12) { if (rows) break; else continue; }
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b.x - a.x, tz = b.z - a.z;
      const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      // flow direction follows the falling water surface
      const down = b.w <= a.w ? 1 : -1;
      const slope = Math.abs(b.w - a.w) / tl;
      const half = p.half * 1.5 + 1.4;
      const speed = Math.min(1, 0.18 + (1 - p.pool) * 0.6 + slope * 3);
      for (let k = 0; k <= NX; k++) {
        const u = k / NX * 2 - 1;
        pos.push(p.x - tz * u * half, p.w, p.z + tx * u * half);
        uv.push(u, p.s * down);
        flow.push(speed, Math.min(1, slope * 3.2), half);
        dir.push(tx * down, tz * down);
      }
      if (rows > 0) {
        const r0 = (rows - 1) * (NX + 1), r1 = rows * (NX + 1);
        for (let k = 0; k < NX; k++) idx.push(r0 + k, r1 + k, r0 + k + 1, r0 + k + 1, r1 + k, r1 + k + 1);
      }
      rows++;
      if (p.pool > 0.85 && st === terrain.main) pools.push({ x: p.x, z: p.z, w: p.w, half: p.half });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('flow', new THREE.Float32BufferAttribute(flow, 3));
    g.setAttribute('dir', new THREE.Float32BufferAttribute(dir, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false;
    m.renderOrder = 5;
    group.add(m);
  }
  const setReflection = (pipeline) => {
    mat.uniforms.tRefl.value = pipeline.rtRefl ? pipeline.rtRefl.texture : null;
    mat.uniforms.uReflMat.value = pipeline.reflMat;
    mat.uniforms.uReflOn.value = pipeline.rtRefl ? pipeline.reflInfo.on : 0;
  };
  return { group, pools, material: mat, setReflection };
}
