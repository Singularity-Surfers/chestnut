// Procedural, tileable bark textures baked on the GPU: one generic shader, a preset per species.
import * as THREE from 'three';
import { FSPass } from '../core/engine.js';
import { hex2rgb } from '../core/rng.js';

const lin = (hex) => new THREE.Vector3(...hex2rgb(hex).map((v) => Math.pow(v, 2.2)));

// cells: [across, along] feature counts per tile; tile: [width, height] metres.
// furrow: 0..1 fissured ridges; plate: scaly plates; block: squarish alligator blocks; smooth: low relief;
// lent: horizontal lenticels; peel: papery curls; stripe: vertical pale stripes; flat: ridge-top flatness;
export const BARKS = {
  chestnut:    { tile: [0.9, 2.0], cells: [12, 1], warp: 1.0, furrow: 1.0, flat: 0.72, depth: 1.0, striae: 0.6, ridge: '#77706a', deep: '#261d18', accent: '#958d85', lichen: 0.25, rough: 0.94 },
  redoak:      { tile: [0.8, 2.0], cells: [16, 1], warp: 0.6, furrow: 1.0, flat: 0.9, depth: 0.7, striae: 0.25, ridge: '#85817c', deep: '#2a2420', accent: '#aaa49c', lichen: 0.2, rough: 0.78 },
  chestnutoak: { tile: [0.8, 2.0], cells: [10, 1], warp: 0.8, furrow: 1.0, flat: 0.35, depth: 1.3, striae: 0.4, ridge: '#6c645c', deep: '#2e2620', accent: '#80766c', lichen: 0.2, rough: 0.95 },
  whiteoak:    { tile: [0.8, 1.6], cells: [12, 4], warp: 0.6, furrow: 0.4, plate: 1.0, flat: 0.5, depth: 0.7, striae: 0.5, ridge: '#b0aca4', deep: '#5e564e', accent: '#cbc7bf', lichen: 0.3, rough: 0.95 },
  redmaple:    { tile: [0.7, 1.6], cells: [9, 2.2], warp: 0.7, furrow: 0.45, plate: 0.75, flat: 0.5, depth: 0.6, striae: 0.4, ridge: '#7c7872', deep: '#38322e', accent: '#989490', lichen: 0.35, rough: 0.9 },
  sugarmaple:  { tile: [0.8, 1.8], cells: [7, 1.6], warp: 0.8, furrow: 0.6, plate: 0.9, flat: 0.45, depth: 0.85, striae: 0.5, ridge: '#7e766c', deep: '#352e28', accent: '#9a9288', lichen: 0.35, rough: 0.92 },
  tulip:       { tile: [0.8, 1.6], cells: [18, 2], warp: 1.5, furrow: 1.0, flat: 0.5, depth: 0.75, striae: 0.2, ridge: '#847b70', deep: '#9a948a', accent: '#9c9286', lichen: 0.15, rough: 0.9, paleFurrow: 1 },
  hemlock:     { tile: [0.8, 1.8], cells: [12, 1], warp: 0.9, furrow: 1.0, plate: 0.3, flat: 0.55, depth: 0.95, striae: 0.3, ridge: '#5c4c46', deep: '#2a1c1a', accent: '#72594e', lichen: 0.2, rough: 0.97 },
  ybirch:      { tile: [0.6, 1.0], cells: [3, 9], warp: 0.3, smooth: 1.0, lent: 0.9, peel: 1.0, depth: 0.5, ridge: '#a8997c', deep: '#5a4a34', accent: '#d8ccb0', lichen: 0.15, rough: 0.5 },
  bbirch:      { tile: [0.6, 1.0], cells: [3, 9], warp: 0.3, smooth: 1.0, lent: 1.0, peel: 0.12, depth: 0.3, ridge: '#4a3a34', deep: '#281e1c', accent: '#8a7a70', lichen: 0.15, rough: 0.6 },
  beech:       { tile: [0.9, 1.2], cells: [3, 2], warp: 0.5, smooth: 1.0, depth: 0.12, ridge: '#9a9c9a', deep: '#6e706e', accent: '#c4c8c2', lichen: 0.9, rough: 0.75 },
  hickory:     { tile: [0.7, 1.6], cells: [20, 2], warp: 1.3, furrow: 1.0, flat: 0.4, depth: 0.7, striae: 0.3, ridge: '#7e7a74', deep: '#34302c', accent: '#9a9690', lichen: 0.2, rough: 0.9 },
  basswood:    { tile: [0.7, 2.0], cells: [22, 1], warp: 0.5, furrow: 1.0, flat: 0.85, depth: 0.55, striae: 0.5, ridge: '#7a746a', deep: '#3a342e', accent: '#989288', lichen: 0.25, rough: 0.9 },
  buckeye:     { tile: [0.8, 1.4], cells: [6, 3], warp: 0.8, plate: 1.0, flat: 0.6, depth: 0.6, striae: 0.2, ridge: '#8a8278', deep: '#4a423a', accent: '#a8a096', lichen: 0.3, rough: 0.9 },
  blackgum:    { tile: [0.6, 0.9], cells: [8, 7], warp: 0.3, block: 1.0, flat: 0.6, depth: 1.1, striae: 0.2, ridge: '#5e5852', deep: '#221e1c', accent: '#7a746c', lichen: 0.2, rough: 0.95 },
  ash:         { tile: [0.7, 1.4], cells: [22, 3], warp: 1.6, furrow: 1.0, flat: 0.35, depth: 0.8, striae: 0.2, ridge: '#827c72', deep: '#3a3630', accent: '#9c968c', lichen: 0.2, rough: 0.9 },
  dogwood:     { tile: [0.3, 0.45], cells: [16, 22], warp: 0.25, block: 1.0, flat: 0.7, depth: 0.9, striae: 0.1, ridge: '#5c544e', deep: '#28221e', accent: '#7a7068', lichen: 0.25, rough: 0.95, small: 1 },
  stripedmaple:{ tile: [0.3, 0.6], cells: [3, 2], warp: 0.4, smooth: 1.0, stripe: 1.0, depth: 0.1, ridge: '#5a7040', deep: '#3c5030', accent: '#d8dcc8', lichen: 0.0, rough: 0.6, small: 1 },
  sourwood:    { tile: [0.4, 0.8], cells: [7, 3], warp: 0.4, furrow: 0.8, block: 0.5, flat: 0.4, depth: 1.1, striae: 0.3, ridge: '#6e6058', deep: '#3a2420', accent: '#8a7a70', lichen: 0.2, rough: 0.95, small: 1 },
  hornbeam:    { tile: [0.5, 0.8], cells: [3, 2], warp: 0.5, smooth: 1.0, depth: 0.1, ridge: '#7a7e80', deep: '#565a5c', accent: '#aab0b0', lichen: 0.7, rough: 0.7, small: 1 },
  serviceberry:{ tile: [0.4, 0.8], cells: [5, 1.2], warp: 0.4, smooth: 1.0, stripe: 0.35, depth: 0.15, ridge: '#8a8a88', deep: '#4e4e4e', accent: '#5a5856', lichen: 0.4, rough: 0.75, small: 1 },
  magnolia:    { tile: [0.5, 0.8], cells: [3, 2], warp: 0.5, smooth: 1.0, lent: 0.25, depth: 0.12, ridge: '#8a8478', deep: '#5c564c', accent: '#b0aa9c', lichen: 0.6, rough: 0.8, small: 1 },
  smoothgray:  { tile: [0.25, 0.5], cells: [3, 2], warp: 0.5, smooth: 1.0, lent: 0.4, depth: 0.12, ridge: '#7a7068', deep: '#4c443e', accent: '#a09a90', lichen: 0.4, rough: 0.8, small: 1 },
  greenstem:   { tile: [0.12, 0.3], cells: [3, 2], warp: 0.5, smooth: 1.0, depth: 0.08, ridge: '#6a7040', deep: '#484c2c', accent: '#8a5a48', lichen: 0.1, rough: 0.7, small: 1 },
  rhodo:       { tile: [0.3, 0.6], cells: [7, 2.0], warp: 0.6, plate: 0.9, furrow: 0.3, flat: 0.5, depth: 0.5, striae: 0.5, ridge: '#7e5e48', deep: '#3e2a20', accent: '#9a7860', lichen: 0.2, rough: 0.9, small: 1 },
  deadwood:    { tile: [0.6, 2.0], cells: [18, 1], warp: 0.5, furrow: 1.0, flat: 0.5, depth: 0.6, striae: 1.0, ridge: '#8a8478', deep: '#3c3630', accent: '#a8a296', lichen: 0.3, rough: 0.95 },
};

const BARK_FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uCells; uniform float uWarp;
uniform float uFurrow, uPlate, uBlock, uSmooth, uLent, uPeel, uStripe, uFlat, uDepth, uStriae, uLichen, uPale, uSeed;
uniform vec3 uRidge, uDeep, uAccent;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973)); p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec2 g2(vec2 c){ float a = h12(c + uSeed)*6.2831853; return vec2(cos(a), sin(a)); }
// periodic gradient noise (value noise leaves a woven lattice once it reaches the normal map)
float pn(vec2 p, vec2 per){
  vec2 i = floor(p), f = fract(p); vec2 u = f*f*f*(f*(f*6.0 - 15.0) + 10.0);
  float a = dot(g2(mod(i, per)), f), b = dot(g2(mod(i + vec2(1,0), per)), f - vec2(1,0));
  float c = dot(g2(mod(i + vec2(0,1), per)), f - vec2(0,1)), d = dot(g2(mod(i + vec2(1,1), per)), f - vec2(1,1));
  return clamp(0.5 + 0.75*mix(mix(a, b, u.x), mix(c, d, u.x), u.y), 0.0, 1.0);
}
float pfbm(vec2 uv, vec2 per, int oct){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 6; i++){ if (i >= oct) break; s += a*pn(uv*per, per); per *= 2.0; a *= 0.5; }
  return s;
}
// periodic voronoi: x = F1, y = F2, z = cell random
vec3 pvor(vec2 p, vec2 per, float jit){
  vec2 i = floor(p), f = fract(p);
  float f1 = 9.0, f2 = 9.0, id = 0.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++){
    vec2 g = vec2(float(x), float(y));
    vec2 c = mod(i + g, per);
    vec2 hh = h22(c + uSeed*7.0);
    // brick-staggered columns: ridges end in interlocking points instead of along horizontal lines
    vec2 o = vec2(0.5 + (hh.x - 0.5)*jit, fract(0.5 + (hh.y - 0.5)*jit*0.8 + 0.5*mod(c.x, 2.0)));
    vec2 r = g + o - f;
    r.y *= 0.85;
    float d = dot(r, r);
    if (d < f1){ f2 = f1; f1 = d; id = h12(c + 3.7 + uSeed); } else if (d < f2) f2 = d;
  }
  return vec3(sqrt(f1), sqrt(f2), id);
}
void main(){
  vec2 uv = vUv;
  // large-scale waviness of the grain
  float w1 = pfbm(uv, vec2(2.0, 3.0), 3) - 0.5;
  float w2 = pfbm(uv + 0.37, vec2(4.0, 5.0), 3) - 0.5;
  vec2 q = uv;
  // each ridge wanders on its own: the sideways drift decorrelates across the trunk
  float wr = pfbm(uv + 0.19, vec2(uCells.x, 3.0), 3) - 0.5;
  q.x += (wr*1.1 + w1*0.12 + w2*0.08)*uWarp/uCells.x;
  float h = 0.5;
  float crack = 0.0;
  float cellId = 0.5;
  float wall = 0.0;
  if (uFurrow > 0.01 && uPlate + uBlock < 0.45){
    // Furrowed bark. Ridges run up the stem as displaced stripes; each one swells and pinches along its
    // length, and where it pinches out the fissures either side of it join, so the furrows fork and braid.
    // A coarser set of ridges takes over in patches. Fissures are wide V-shaped valleys, not hairlines;
    // the ridge tops are broken across by irregular cracks into long blocks that sit at slightly different heights.
    float nx = uCells.x;
    float wob = (pfbm(uv + 0.19, vec2(nx*0.5, 3.0*uCells.y), 3) - 0.5)*2.6*uWarp
              + (pfbm(uv + 0.61, vec2(nx, 8.0*uCells.y), 2) - 0.5)*1.2*uWarp;
    float sA = q.x*nx + wob;
    float sB = q.x*nx*0.5 + wob*0.5 + 0.25;
    float iA = mod(floor(sA), nx), iB = mod(floor(sB), nx*0.5);
    float dA = abs(fract(sA) - 0.5)*2.0, dB = abs(fract(sB) - 0.5)*2.0;
    float fuse = smoothstep(0.47, 0.58, pfbm(uv + 0.83, vec2(nx*0.25, 3.0*uCells.y), 3));
    float idA = h12(vec2(iA, 3.0) + uSeed), idB = h12(vec2(iB, 7.0) + uSeed);
    // swelling and pinching of each ridge
    float swA = pn(vec2(idA*37.0 + 0.5, uv.y*5.0*uCells.y), vec2(64.0, 5.0*uCells.y));
    float swB = pn(vec2(idB*37.0 + 9.5, uv.y*3.0*uCells.y), vec2(64.0, 3.0*uCells.y));
    float top = mix(0.14, 0.40, uFlat);        // half-width of the crest plateau (1 = middle of the fissure)
    float slope = mix(0.66, 0.38, uFlat);      // width of the fissure wall
    // the coarse set has twice the period: widen its crest so the fissure stays the same width on the trunk
    float tA = top*(0.5 + 1.0*smoothstep(0.2, 0.7, swA)), tB = 0.5 + 0.5*top*(0.5 + 1.0*smoothstep(0.2, 0.7, swB));
    float pinA = smoothstep(0.08, 0.20, swA), pinB = smoothstep(0.06, 0.18, swB);
    float rA = (1.0 - smoothstep(tA, tA + slope, dA))*pinA;
    float rB = (1.0 - smoothstep(tB, tB + slope*0.5, dB))*pinB;
    float ridge = mix(rA, rB, fuse);
    float rid = mix(idA, idB, step(0.5, fuse));
    cellId = rid;
    // cross-cracks: iso-lines of a noise that varies fast along the stem, tilted a little across each ridge
    float fr = mix(fract(sA), fract(sB), step(0.5, fuse)) - 0.5;
    float ky = 16.0*uCells.y;
    float wav = 0.0035*sin(fr*11.0 + rid*40.0) + fr*0.03*(rid - 0.5);
    float cn = pn(vec2(rid*53.0 + 2.5, (uv.y + wav)*ky), vec2(64.0, ky));
    float cn2 = pn(vec2(rid*29.0 + 7.5, (uv.y - wav*0.7)*ky*2.6), vec2(64.0, ky*2.6));
    // only some of the possible cracks open, and many stop part-way across the ridge
    float open1 = smoothstep(0.50, 0.62, pn(vec2(rid*91.0 + 1.5, uv.y*ky*0.45), vec2(64.0, ky*0.45)));
    float open2 = smoothstep(0.55, 0.66, pn(vec2(rid*17.0 + 4.5, uv.y*ky*1.1), vec2(64.0, ky*1.1)))*smoothstep(-0.1, 0.25, fr*(rid - 0.5)*4.0 + 0.1);
    float ck = (1.0 - smoothstep(0.0, 0.045, abs(cn - 0.5)))*open1;
    float ck2 = (1.0 - smoothstep(0.0, 0.05, abs(cn2 - 0.42)))*open2;
    float scaly = clamp(0.55 + uPlate*1.6 + (1.0 - uFlat)*0.25, 0.0, 1.5);
    float crest = smoothstep(0.55, 0.9, ridge);
    // blocks between cracks stand a little proud of, or below, their neighbours
    float blockH = (step(0.5, cn) - 0.5)*0.10 + (step(0.42, cn2) - 0.5)*0.05*scaly;
    h = ridge*(0.78 + 0.14*(rid - 0.5) + blockH*crest*open1) - (ck*0.30 + ck2*0.14*scaly)*crest*uFurrow;
    // the crest is not a board: it carries rounded sub-ridges along the grain and flaking scales
    float sub = pfbm(vec2(q.x, uv.y) + 0.27, vec2(nx*3.0, 5.0*uCells.y), 3);
    float fl = pfbm(uv + 0.47, vec2(nx*4.0, 30.0*uCells.y), 3);
    h += ((sub - 0.5)*0.34 + (fl - 0.5)*0.20*scaly)*smoothstep(0.3, 0.8, ridge);
    crack = 1.0 - smoothstep(0.0, 0.42, ridge);
    wall = smoothstep(0.05, 0.4, ridge)*(1.0 - smoothstep(0.5, 0.85, ridge));
    crack = max(crack, (ck*0.8 + ck2*0.5*scaly)*crest);
  } else if (uFurrow + uPlate + uBlock > 0.01){

    vec3 v = pvor(q*uCells, uCells, mix(0.95, 0.7, uBlock));
    float edge = v.y - v.x;                      // 0 at fissures
    cellId = v.z;
    float wEdge = mix(0.55, 0.16, uFlat);
    float ridge = smoothstep(0.0, wEdge, edge);
    ridge = mix(ridge, pow(ridge, 0.5), uFlat*0.6);
    // second generation of finer fissures splitting the ridges
    vec3 v2 = pvor((q + 0.31)*uCells*vec2(2.0, 2.0), uCells*vec2(2.0, 2.0), 0.9);
    float e2 = smoothstep(0.0, 0.22, v2.y - v2.x);
    ridge *= mix(1.0, 0.72 + 0.28*e2, 0.6*uFurrow);
    float plate = (v.z - 0.5)*0.55 + (h12(vec2(v.z*91.0, 3.0)) - 0.5)*0.3*sin(uv.y*uCells.y*6.283*1.3 + v.z*40.0);
    h = ridge*(0.70 + 0.10*v.z*uFurrow) + plate*(uPlate*0.6 + uBlock*0.25);
    crack = 1.0 - smoothstep(0.0, wEdge*0.55, edge);
    // flaky plates: one side lifts
    if (uPlate > 0.01){
      float lift = smoothstep(0.1, 0.5, v.x)*(0.5 + 0.5*sin(v.z*50.0));
      h += lift*0.12*uPlate;
    }
  } else {
    h = 0.6 + (pfbm(uv, uCells*2.0, 4) - 0.5)*0.5;
  }
  // vertical striations / fibrous texture
  float st = pfbm(q, vec2(uCells.x*7.0, 3.0), 3) - 0.5;
  float st2 = pfbm(q, vec2(uCells.x*17.0, 6.0), 2) - 0.5;
  h += (st*0.20 + st2*0.10)*uStriae*smoothstep(0.1, 0.6, h)*mix(1.0, 0.7, step(0.01, uFurrow)*step(uPlate + uBlock, 0.45));
  // fine grain everywhere
  float grain = pfbm(uv, vec2(48.0, 64.0), 3) - 0.5;
  h += grain*0.04;
  // horizontal lenticels
  float lent = 0.0;
  if (uLent > 0.01){
    vec2 lp = uv*vec2(7.0, 46.0);
    vec2 li = floor(lp), lf = fract(lp);
    vec2 lper = vec2(7.0, 46.0);
    float r = h12(mod(li, lper) + 11.0 + uSeed);
    float len = 0.25 + 0.7*h12(mod(li, lper) + 5.0);
    float cx = h12(mod(li, lper) + 17.0);
    float dx = abs(lf.x - cx)/len, dy = abs(lf.y - 0.5);
    lent = step(0.45, r)*smoothstep(1.0, 0.6, dx)*smoothstep(0.34, 0.12, dy);
    h += lent*0.10*uLent;
  }
  // papery peeling strips (yellow birch): horizontal bands with a curled, shadowed lip
  float peel = 0.0, curl = 0.0;
  if (uPeel > 0.01){
    float band = pfbm(uv + 0.11, vec2(3.0, 22.0), 3);
    float lipSrc = pfbm(uv + 0.6, vec2(5.0, 31.0), 2);
    peel = smoothstep(0.50, 0.56, band);
    float lip = smoothstep(0.5, 0.56, band)*(1.0 - smoothstep(0.56, 0.64, band));
    curl = lip*step(0.35, lipSrc);
    h += (peel*0.12 + curl*0.35)*uPeel;
  }
  h = clamp(h*uDepth + 0.5*(1.0 - uDepth), 0.0, 1.0);

  // ---- colour
  float tone = pfbm(uv + 0.5, vec2(3.0, 4.0), 4);
  vec3 ridgeCol = mix(uRidge, uAccent, smoothstep(0.35, 0.8, tone)*0.35 + (cellId - 0.5)*0.22);
  vec3 col = mix(mix(uDeep, ridgeCol, 0.22), ridgeCol, smoothstep(0.03, 0.32, h));
  // fissure walls show the warmer, redder inner bark
  col = mix(col, mix(uDeep, uRidge*vec3(1.12, 0.80, 0.60), 0.6), wall*0.55*(1.0 - uPale));
  if (uPale > 0.5) col = mix(col, uDeep, crack*0.75);          // tulip poplar: ashy pale furrows
  else col *= 1.0 - crack*mix(0.24, 0.40, step(0.45, 1.0 - uPlate - uBlock)*step(0.01, uFurrow));
  col *= 0.86 + 0.28*(st + 0.5)*uStriae + grain*0.5;
  // smooth barks: blotchy lichen and algae
  float bl = pfbm(uv + 0.23, vec2(4.0, 5.0), 5);
  float bl2 = pfbm(uv + 0.71, vec2(7.0, 8.0), 4);
  float lich = smoothstep(0.50, 0.62, bl)*uLichen;
  col = mix(col, mix(uAccent, vec3(0.62, 0.68, 0.60), 0.55), lich*0.55);
  float lich2 = smoothstep(0.58, 0.66, bl2)*uLichen;
  col = mix(col, vec3(0.30, 0.36, 0.22), lich2*0.35);
  float dark = smoothstep(0.55, 0.75, pfbm(uv + 0.9, vec2(2.0, 6.0), 4))*uSmooth;
  col *= 1.0 - dark*0.25;
  // lenticels: dark or pale dashes
  col = mix(col, mix(uDeep*0.7, uAccent, uPeel), lent*0.7*uLent);
  // birch: bronze sheen on intact bark, pale papery curls
  if (uPeel > 0.01){
    col = mix(col, uAccent*1.1, curl*0.8);
    col = mix(col, uDeep*1.3, peel*(1.0 - curl)*0.25);
  }
  // striped maple: chalky vertical stripes
  if (uStripe > 0.01){
    float s = pfbm(q, vec2(26.0, 1.0), 2);
    float line = smoothstep(0.56, 0.62, s)*(0.6 + 0.4*pfbm(uv, vec2(6.0, 9.0), 2));
    col = mix(col, uAccent, line*uStripe*0.85);
  }
  gl_FragColor = vec4(max(col, 0.0), h);
}`;

const NORMAL_FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tH; uniform vec2 uTexel; uniform float uStrength; uniform float uRough;
void main(){
  float hl = texture2D(tH, vUv - vec2(uTexel.x, 0.0)).a, hr = texture2D(tH, vUv + vec2(uTexel.x, 0.0)).a;
  float hd = texture2D(tH, vUv - vec2(0.0, uTexel.y)).a, hu = texture2D(tH, vUv + vec2(0.0, uTexel.y)).a;
  float h = texture2D(tH, vUv).a;
  vec3 n = normalize(vec3((hl - hr)*uStrength, (hd - hu)*uStrength, 1.0));
  // cavity AO: compare with a wide neighbourhood
  float s = 0.0;
  for (int i = 0; i < 12; i++){
    float a = float(i)*0.5236;
    float r = (1.0 + mod(float(i), 3.0))*5.0;
    s += texture2D(tH, vUv + vec2(cos(a), sin(a))*uTexel*r).a;
  }
  s /= 12.0;
  float ao = clamp(1.0 - (s - h)*2.0, 0.5, 1.0)*mix(0.82, 1.0, smoothstep(0.05, 0.5, h));
  float rough = clamp(uRough + (0.5 - h)*0.15, 0.2, 1.0);
  gl_FragColor = vec4(n.xy*0.5 + 0.5, ao, rough);
}`;

export class BarkLibrary {
  constructor(renderer, res = 1024) {
    this.r = renderer;
    this.res = res;
    this.cache = new Map();
    const U = (v) => ({ value: v });
    this.pass = new FSPass(BARK_FS, {
      uCells: U(new THREE.Vector2()), uWarp: U(0), uFurrow: U(0), uPlate: U(0), uBlock: U(0), uSmooth: U(0), uLent: U(0), uPeel: U(0),
      uStripe: U(0), uFlat: U(0), uDepth: U(1), uStriae: U(0), uLichen: U(0), uPale: U(0), uSeed: U(0),
      uRidge: U(new THREE.Vector3()), uDeep: U(new THREE.Vector3()), uAccent: U(new THREE.Vector3()),
    });
    this.npass = new FSPass(NORMAL_FS, { tH: U(null), uTexel: U(new THREE.Vector2()), uStrength: U(4), uRough: U(0.9) });
  }

  get(name) {
    let b = this.cache.get(name);
    if (b) return b;
    const p = BARKS[name];
    if (!p) throw new Error('unknown bark ' + name);
    const h = p.small ? Math.max(256, this.res / 2) : this.res * 2;
    const w = h / 2;
    const mk = (srgb) => {
      const rt = new THREE.WebGLRenderTarget(w, h, {
        depthBuffer: false, format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
        minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true,
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
      });
      rt.texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      rt.texture.anisotropy = 8;
      return rt;
    };
    const rtA = mk(true), rtN = mk(false);
    const u = this.pass.u;
    // periodic noise needs integer feature counts; keep the feature size by rescaling the tile
    // even column count so the stagger wraps cleanly around the trunk
    const c0 = Math.max(2, Math.round(p.cells[0] / 2) * 2), c1 = Math.max(1, Math.round(p.cells[1]));
    const tile = [p.tile[0] * c0 / p.cells[0], p.tile[1] * c1 / p.cells[1]];
    u.uCells.value.set(c0, c1); u.uWarp.value = p.warp ?? 0.4;
    u.uFurrow.value = p.furrow ?? 0; u.uPlate.value = p.plate ?? 0; u.uBlock.value = p.block ?? 0; u.uSmooth.value = p.smooth ?? 0;
    u.uLent.value = p.lent ?? 0; u.uPeel.value = p.peel ?? 0; u.uStripe.value = p.stripe ?? 0; u.uFlat.value = p.flat ?? 0.5;
    u.uDepth.value = Math.min(1, 0.55 + 0.45 * (p.depth ?? 1)); u.uStriae.value = p.striae ?? 0.3; u.uLichen.value = p.lichen ?? 0.2; u.uPale.value = p.paleFurrow ?? 0;
    u.uSeed.value = (name.length * 13.7 + name.charCodeAt(0)) % 50;
    u.uRidge.value.copy(lin(p.ridge)); u.uDeep.value.copy(lin(p.deep)); u.uAccent.value.copy(lin(p.accent));
    const prev = this.r.getRenderTarget();
    this.pass.render(this.r, rtA);
    this.npass.u.tH.value = rtA.texture;
    this.npass.u.uTexel.value.set(1 / w, 1 / h);
    this.npass.u.uStrength.value = 5.5 * (p.depth ?? 1) * (w / 512) * (p.small ? 1 : 0.8);
    this.npass.u.uRough.value = p.rough ?? 0.9;
    this.npass.render(this.r, rtN);
    this.r.setRenderTarget(prev);
    b = { albedo: rtA.texture, normal: rtN.texture, tile, depth: p.depth ?? 1, params: p };
    this.cache.set(name, b);
    return b;
  }
}
