// Forest floor: baked leaf-litter textures whose species mix follows the canopy overhead,
// plus moss, bare soil on the footpath, streambed cobble and ledge rock.
import * as THREE from 'three';
import { G, makeMaterial, makeDepthMaterial, registerCaster, dataTexture } from '../core/engine.js';

const VS = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main(){
  vWorld = position;
  vNormal = normal;
  gl_Position = projectionMatrix*viewMatrix*vec4(position, 1.0);
}
`;

export const GROUND_COMMON = /* glsl */ `
uniform sampler2D uWaterMap;   // r: water surface elevation, g: distance outside the channel (m)
// streambed: rounded stones of mixed size lying on sand and gravel. rgb albedo, a height; normal via out param
vec4 cobbles(vec2 p, float scale, out vec3 nrm){
  p *= scale;
  vec2 i = floor(p), f = fract(p);
  float gr = vnoise(p*7.0), gr2 = vnoise(p*23.0);
  vec3 col = mix(vec3(0.15, 0.125, 0.10), vec3(0.30, 0.26, 0.20), gr)*(0.78 + 0.44*gr2);
  nrm = normalize(vec3((vnoise(p*23.0 + vec2(0.04, 0.0)) - gr2)*3.0, (vnoise(p*23.0 + vec2(0.0, 0.04)) - gr2)*3.0, 1.0));
  float h = 0.08*gr2;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y));
    vec3 rnd = hash32(i + g);
    vec3 rnd2 = hash32(i + g + 71.3);
    if (rnd2.x < 0.22) continue;                              // some cells stay open sand
    vec2 c = g + 0.5 + (rnd.xy - 0.5)*0.75;
    float rad = mix(0.13, 0.56, rnd.z*rnd.z);
    vec2 d = f - c;
    float ca = cos(rnd2.y*6.2832), sa = sin(rnd2.y*6.2832);
    d = vec2(ca*d.x + sa*d.y, -sa*d.x + ca*d.y);
    d.x *= 1.0 + 0.7*rnd2.z;
    float r = length(d)/rad;
    if (r < 1.0){
      float hh = 0.12 + sqrt(1.0 - r*r)*rad*1.5;
      if (hh > h){
        h = hh;
        vec3 sc = mix(vec3(0.19, 0.185, 0.18), vec3(0.36, 0.32, 0.26), rnd.x);
        sc = mix(sc, vec3(0.30, 0.19, 0.11), step(0.80, rnd.y)*0.8);     // rusty quartzite
        sc = mix(sc, vec3(0.46, 0.46, 0.43), step(0.90, rnd.z)*0.7);     // pale quartz
        col = sc*(0.8 + 0.4*vnoise(p*13.0 + rnd.xy*9.0))*mix(0.55, 1.0, sqrt(max(1.0 - r*r, 0.0)));
        vec2 dn = vec2(ca*d.x - sa*d.y, sa*d.x + ca*d.y)/rad;
        nrm = normalize(vec3(dn*1.1, sqrt(max(1.0 - r*r, 0.04))));
      }
    }
  }
  return vec4(col, clamp(h*1.6, 0.0, 1.0));
}
`;

const FS = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
uniform sampler2D tLitA, tLitAN, tLitB, tLitBN, tLitC, tLitCN, tLitD, tLitDN;
uniform vec4 uTiles;          // tile sizes (m) of A..D
uniform sampler2D uLitterMap; // r: maple/red, g: needle duff, b: oak-beech, a: chestnut
${GROUND_COMMON}

void stoch(sampler2D ta, sampler2D tn, vec2 uv, out vec4 a, out vec4 n){
  // blend two randomly offset copies to break up tiling
  vec2 cell = uv*0.61;
  vec2 g1 = floor(cell), g2 = floor(cell + 0.5);
  vec2 o1 = hash22(g1)*5.0, o2 = hash22(g2 + 31.0)*5.0;
  vec2 f = abs(fract(cell) - 0.5)*2.0;
  float w = smoothstep(0.62, 0.92, max(f.x, f.y));
  vec4 a1 = texture(ta, uv + o1), a2 = texture(ta, uv + o2);
  // height-aware blend keeps whole leaves
  float k = clamp(w*2.0 - 1.0 + (a2.a - a1.a)*1.5 + 0.5, 0.0, 1.0);
  if (w < 0.001) k = 0.0;
  a = mix(a1, a2, k);
  n = mix(texture(tn, uv + o1), texture(tn, uv + o2), k);
}

void main(){
  vec3 Ng = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  float dist = length(cameraPosition - vWorld);
  vec2 wuv = worldUV(vWorld);
  vec4 site = texture(uSiteMap, wuv);
  vec4 lm = texture(uLitterMap, wuv);
  vec2 wm = texture(uWaterMap, wuv).rg;
  float moist = site.r, streamProx = site.g, trail = site.b, rock = site.a;
  float above = vWorld.y - wm.r;                 // height above the stream surface
  float n1 = fbm(vWorld.xz*0.21);
  float n2 = fbm(vWorld.xz*1.7 + 7.0);
  float n3 = vnoise(vWorld.xz*0.06 + 3.0);

  // ---- leaf litter
  vec4 a, n;
  vec2 uvA = vWorld.xz/uTiles.x;
  // cheap parallax from the baked height
  float hA = texture(tLitA, uvA).a;
  vec2 par = V.xz/max(V.y, 0.25)*(hA - 0.5)*0.022*smoothstep(14.0, 2.0, dist);
  stoch(tLitA, tLitAN, uvA + par/uTiles.x, a, n);
  float wB = smoothstep(0.22, 0.6, lm.r + (n1 - 0.5)*0.35);
  float wC = smoothstep(0.30, 0.70, lm.b + (n2 - 0.5)*0.3)*(1.0 - wB*0.7);
  float wD = smoothstep(0.30, 0.62, lm.g + (n1 - 0.5)*0.3);
  if (wB > 0.01){
    vec2 uv = (vWorld.xz + par)/uTiles.y + 0.37;
    vec4 b = texture(tLitB, uv);
    float k = clamp(wB*2.2 - 0.6 + (b.a - a.a), 0.0, 1.0);
    a = mix(a, b, k); n = mix(n, texture(tLitBN, uv), k);
  }
  if (wC > 0.01){
    vec2 uv = (vWorld.xz + par)/uTiles.z + 0.71;
    vec4 b = texture(tLitC, uv);
    float k = clamp(wC*2.2 - 0.6 + (b.a - a.a), 0.0, 1.0);
    a = mix(a, b, k); n = mix(n, texture(tLitCN, uv), k);
  }
  if (wD > 0.01){
    vec2 uv = (vWorld.xz + par)/uTiles.w + 0.13;
    vec4 b = texture(tLitD, uv);
    float k = clamp(wD*2.4 - 0.5 + (b.a - a.a)*0.6, 0.0, 1.0);
    a = mix(a, b, k); n = mix(n, texture(tLitDN, uv), k);
  }
  vec3 albedo = a.rgb;
  // broad colour drift: damp hollows darker, drifts of fresh leaves brighter
  albedo *= 0.66 + 0.30*n3 + 0.10*(n1 - 0.5);
  vec2 nxy = n.xy*2.0 - 1.0;
  float ao = n.b;
  float rough = mix(0.86, 0.62, n.a);
  float spec = 0.45;
  float hgt = a.a;

  // ---- bare, compacted soil on the footpath and wet margins
  float soilAmt = clamp(trail*1.15 - hgt*0.45 + (n2 - 0.5)*0.3, 0.0, 1.0)*0.88;
  vec3 soil = mix(vec3(0.050, 0.036, 0.025), vec3(0.11, 0.082, 0.055), n2)*(0.8 + 0.4*vnoise(vWorld.xz*23.0));
  albedo = mix(albedo, soil, soilAmt);
  nxy = mix(nxy, (vec2(vnoise(vWorld.xz*31.0), vnoise(vWorld.zx*31.0 + 5.0)) - 0.5)*0.5, soilAmt);
  ao = mix(ao, 1.0, soilAmt*0.6); rough = mix(rough, 0.92, soilAmt);

  // ---- moss: stream banks, seeps, around ledges
  float mossN = fbm(vWorld.xz*0.9 + 13.0);
  float mossAmt = smoothstep(0.62, 0.86, moist*0.28 + streamProx*0.62 + rock*0.30 + (mossN - 0.5)*0.75 - hgt*0.30)*smoothstep(0.02, 0.25, above);
  mossAmt *= 0.9*(1.0 - soilAmt);
  if (mossAmt > 0.01){
    float m1 = vnoise(vWorld.xz*38.0), m2 = vnoise(vWorld.xz*11.0 + 3.0), m3 = vnoise(vWorld.xz*130.0);
    vec3 mcol = mix(vec3(0.030, 0.070, 0.012), vec3(0.13, 0.21, 0.035), m2*0.6 + m1*0.4);
    mcol *= 0.7 + 0.6*m3;
    albedo = mix(albedo, mcol, mossAmt);
    vec2 mn = vec2(vnoise(vWorld.xz*38.0 + vec2(0.05, 0.0)) - m1, vnoise(vWorld.xz*38.0 + vec2(0.0, 0.05)) - m1)*6.0;
    nxy = mix(nxy, -mn, mossAmt);
    rough = mix(rough, 0.97, mossAmt); spec = mix(spec, 0.2, mossAmt); ao = mix(ao, 0.75 + 0.25*m1, mossAmt);
  }

  // ---- streambed and gravel bars
  float bed = smoothstep(0.30, -0.02, above)*smoothstep(1.6, 0.2, wm.g);
  if (bed > 0.01){
    vec3 cn, cn2;
    vec4 c1 = cobbles(vWorld.xz, 5.5, cn);
    vec4 c2 = cobbles(vWorld.xz + 3.3, 17.0, cn2);
    vec4 cb = c1.a > 0.42 ? c1 : mix(c2, c1, 0.25);
    vec3 cnn = c1.a > 0.42 ? cn : cn2;
    // silt and drowned leaves in the pools
    cb.rgb = mix(cb.rgb, vec3(0.06, 0.045, 0.03), smoothstep(0.55, 0.9, n2)*0.6);
    float k = clamp(bed*1.6 - hgt*0.5*(1.0 - smoothstep(0.0, -0.05, above)), 0.0, 1.0);
    albedo = mix(albedo, cb.rgb, k);
    nxy = mix(nxy, cnn.xy*1.2, k);
    ao = mix(ao, mix(0.5, 1.0, cb.a), k); rough = mix(rough, 0.5, k); spec = mix(spec, 0.8, k);
  }
  // ---- exposed ledge rock on the steepest banks
  float slope = 1.0 - Ng.y;
  float rk = smoothstep(0.36, 0.52, slope + rock*0.08 + (n2 - 0.5)*0.12);
  if (rk > 0.01){
    float strata = vnoise(vec2(vWorld.y*7.0 + n1*4.0, dot(vWorld.xz, vec2(0.3, 0.2))));
    vec3 rc = mix(vec3(0.10, 0.10, 0.105), vec3(0.24, 0.22, 0.20), strata)*(0.7 + 0.6*vnoise(vWorld.xz*9.0 + vWorld.y*9.0));
    rc = mix(rc, vec3(0.045, 0.085, 0.02), smoothstep(0.45, 0.75, mossN + moist*0.4)*0.8);
    albedo = mix(albedo, rc, rk);
    nxy = mix(nxy, (vec2(vnoise(vWorld.xz*14.0 + vWorld.y*9.0), strata) - 0.5)*1.4, rk);
    rough = mix(rough, 0.85, rk); ao = mix(ao, 0.8, rk);
  }

  // local wetness: splash zone beside the water
  float damp = smoothstep(0.45, 0.02, above)*smoothstep(3.0, 0.0, wm.g);
  albedo *= mix(1.0, 0.55, damp*(1.0 - uWet));
  rough = mix(rough, 0.35, damp*0.7);

  // tangent frame from the heightfield (u = +x, v = +z)
  vec3 T = normalize(vec3(Ng.y, -Ng.x, 0.0));
  vec3 B = normalize(cross(Ng, T));
  float bumpFade = mix(1.0, 0.35, smoothstep(20.0, 90.0, dist));
  vec3 N = normalize(T*nxy.x*bumpFade - B*nxy.y*bumpFade + Ng*sqrt(max(1.0 - dot(nxy, nxy), 0.2)));

  Surf s;
  s.albedo = albedo; s.N = N; s.rough = rough; s.spec = spec; s.ao = ao; s.trans = 0.0; s.transCol = vec3(0.0); s.above = 0.0;
  float sh = sunShadow(vWorld, Ng, ign(gl_FragCoord.xy));
  vec3 col = shadeSurface(s, vWorld, V, sh);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function buildGround(terrain, flora, eco) {
  const q = G.qualityName;
  const hi = q === 'low' ? 1024 : 2048, lo = q === 'ultra' ? 2048 : 1024;
  const litA = flora.bakeLitter('chestnut', [['chestnut', 0.60], ['redoak', 0.09], ['chestnutoak', 0.07], ['hickory', 0.05], ['tulip', 0.07], ['redmaple', 0.05], ['beech', 0.04], ['sugarmaple', 0.03]],
    { res: hi, tile: 2.4, old: 2800, fresh: 820, twigs: 110, browned: 0.78, extras: [['chestnut', 'bur', 26], ['chestnut', 'nut', 18]] });
  const litB = flora.bakeLitter('maple', [['redmaple', 0.42], ['sugarmaple', 0.2], ['chestnut', 0.22], ['dogwood', 0.06], ['sourwood', 0.05], ['blackgum', 0.05]],
    { res: lo, tile: 1.9, old: 1600, fresh: 750, twigs: 60, browned: 0.5 });
  const litC = flora.bakeLitter('oak', [['redoak', 0.3], ['whiteoak', 0.16], ['chestnutoak', 0.2], ['beech', 0.18], ['chestnut', 0.16]],
    { res: lo, tile: 1.9, old: 1800, fresh: 600, twigs: 70, browned: 0.85 });
  // hemlock duff: a felt of shed brown needles and twiglets (tinted dead sprays), with broad leaves blown in
  const litD = flora.bakeLitter('duff', [['hemlock', 1.0]],
    { res: lo, tile: 1.6, old: 3400, fresh: 380, twigs: 180, browned: 0.6, soil: [0.055, 0.032, 0.018], oldTint: [1.9, 0.62, 0.22],
      freshMix: [['ybirch', 0.3], ['beech', 0.2], ['redmaple', 0.25], ['chestnut', 0.2], ['hemlock', 0.05]] });

  // water surface elevation + channel distance, for wet banks and the streambed
  const F = terrain.fields;
  const n = F.water.n;
  const wd = new Float32Array(n * n * 2);
  for (let i = 0; i < n * n; i++) { wd[i * 2] = F.water.d[i]; wd[i * 2 + 1] = F.d.d[i] - F.half.d[i]; }
  const waterTex = dataTexture(wd, n, n, { format: THREE.RGFormat, type: THREE.FloatType });
  G.waterTex = waterTex;

  const mat = makeMaterial({
    name: 'ground', vs: VS, fs: FS,
    uniforms: {
      tLitA: { value: litA.albedo }, tLitAN: { value: litA.normal }, tLitB: { value: litB.albedo }, tLitBN: { value: litB.normal },
      tLitC: { value: litC.albedo }, tLitCN: { value: litC.normal }, tLitD: { value: litD.albedo }, tLitDN: { value: litD.normal },
      uTiles: { value: new THREE.Vector4(litA.tile, litB.tile, litC.tile, litD.tile) },
      uLitterMap: { value: eco.litterTex }, uWaterMap: { value: waterTex },
    },
  });
  const depthMat = makeDepthMaterial({
    vs: `void main(){ gl_Position = projectionMatrix*viewMatrix*vec4(position, 1.0); }`,
    side: THREE.DoubleSide,
  });
  for (const geo of terrain.chunks) {
    const m = new THREE.Mesh(geo, mat);
    m.matrixAutoUpdate = false;
    terrain.group.add(m);
    registerCaster(m, depthMat, true);
  }
  return { material: mat, litters: { A: litA, B: litB, C: litC, D: litD } };
}
