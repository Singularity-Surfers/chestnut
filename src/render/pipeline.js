// HDR frame pipeline: MSAA scene -> volumetric light + AO (half res) -> composite -> bloom -> film.
import * as THREE from 'three';
import { G, FSPass } from '../core/engine.js';
import { COMMON } from '../core/glsl.js';

const HF = THREE.HalfFloatType;

function rt(w, h, opts = {}) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: HF,
    depthBuffer: false, stencilBuffer: false, ...opts,
  });
}

const DEPTH_UTIL = /* glsl */ `
uniform sampler2D tDepth;
uniform mat4 uInvViewProj;
uniform mat4 uInvProj;
uniform vec2 uNearFar;
float linDepth(float d){
  float z = d*2.0 - 1.0;
  return 2.0*uNearFar.x*uNearFar.y/(uNearFar.y + uNearFar.x - z*(uNearFar.y - uNearFar.x));
}
vec3 worldAt(vec2 uv, float d){
  vec4 p = uInvViewProj*vec4(uv*2.0 - 1.0, d*2.0 - 1.0, 1.0);
  return p.xyz/p.w;
}
vec3 viewAt(vec2 uv, float d){
  vec4 p = uInvProj*vec4(uv*2.0 - 1.0, d*2.0 - 1.0, 1.0);
  return p.xyz/p.w;
}
`;

const VOL_FS = /* glsl */ `
${COMMON}
${DEPTH_UTIL}
uniform highp sampler2D uShadowFar;
uniform mat4 uShadowFarMat;
uniform vec3 uCamPos;
uniform vec3 uFogSun, uFogAmb, uFogHorizon;
uniform vec4 uFog;      // density, height falloff, base height, mist
uniform vec2 uRes;
uniform float uFrame;
uniform float uHaze;
varying vec2 vUv;
#define STEPS VOL_STEPS
float ign(vec2 p){ return fract(52.9829189*fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float fogDensity(vec3 p){
  float d = uFog.x*min(exp(-(p.y - uFog.z)*uFog.y), 2.2);
  if (uFog.w > 0.01){
    vec3 q = p*vec3(0.035, 0.07, 0.035) + vec3(uWind.x, 0.0, uWind.y)*uTime*0.02;
    float n = vnoise3(q)*0.65 + vnoise3(q*2.7 + 5.0)*0.35;
    d *= mix(1.0, 0.25 + 1.9*n*n, uFog.w);
  }
  return d;
}
float shadowAt(vec3 p){
  vec4 f4 = uShadowFarMat*vec4(p, 1.0);
  vec3 fc = f4.xyz*0.5 + 0.5;
  if (fc.x < 0.0 || fc.x > 1.0 || fc.y < 0.0 || fc.y > 1.0 || fc.z > 1.0) return 1.0;
  return step(fc.z - 0.0008, texture(uShadowFar, fc.xy).r);
}
void main(){
  float d = texture(tDepth, vUv).r;
  vec3 wp = worldAt(vUv, d);
  vec3 ray = wp - uCamPos;
  float dist = length(ray);
  vec3 dir = ray/dist;
  bool isSky = d >= 0.99999;
  float maxMarch = 170.0;
  float tEnd = min(dist, maxMarch);
  float jitter = ign(gl_FragCoord.xy + 17.0*mod(uFrame, 8.0));
  float cs = dot(dir, uSunDir);
  float g = 0.74;
  float phase = (1.0 - g*g)/(4.0*PI*pow(1.0 + g*g - 2.0*g*cs, 1.5));
  float phaseB = (1.0 - 0.09)/(4.0*PI*pow(1.0 + 0.09 + 0.6*cs, 1.5));
  phase = phase*0.8 + phaseB*0.2;
  vec3 scat = vec3(0.0);
  float T = 1.0;
  float prev = 0.0;
  for (int i = 0; i < STEPS; i++){
    // quadratic distribution: fine steps near the eye
    float f = (float(i) + jitter)/float(STEPS);
    float t = tEnd*f*f;
    float dt = t - prev; prev = t;
    vec3 p = uCamPos + dir*t;
    float dens = fogDensity(p);
    float sh = shadowAt(p);
    vec3 li = uFogSun*sh*phase*3.2 + uFogAmb*0.085;
    float a = 1.0 - exp(-dens*dt);
    scat += T*a*li;
    T *= 1.0 - a;
  }
  // analytic haze beyond the marched range (aerial perspective, no shadowing)
  float far = isSky ? 9000.0 : dist;
  if (far > tEnd){
    float seg = far - tEnd;
    vec3 p0 = uCamPos + dir*tEnd;
    float k = uFog.y*dir.y;
    float d0 = uFog.x*min(exp(-(p0.y - uFog.z)*uFog.y), 2.2);
    float od = abs(k) > 1e-4 ? d0*(1.0 - exp(-k*seg))/k : d0*seg;
    od = min(od*mix(1.0, 0.7, uFog.w), 30.0);
    float a = 1.0 - exp(-od);
    vec3 li = uFogSun*phase*1.6*0.45 + mix(uFogAmb, uFogHorizon, 0.6)*0.11;
    scat += T*a*li;
    T *= 1.0 - a;
    // aerial perspective: thin, height-independent blue haze that stacks distant ridges into layers
    float hseg = min(seg, isSky ? 0.0 : 12000.0);
    float ah = 1.0 - exp(-hseg*uHaze*exp(-max(p0.y, 0.0)*0.0012));
    vec3 hazeCol = mix(uFogAmb, uFogHorizon, 0.5)*0.115*vec3(0.86, 0.97, 1.18) + uFogSun*(phase*0.5 + 0.012);
    scat += T*ah*hazeCol;
    T *= 1.0 - ah;
  }
  gl_FragColor = vec4(scat, T);
}
`;

const AO_FS = /* glsl */ `
${DEPTH_UTIL}
uniform vec2 uRes;
uniform float uFrame;
uniform float uAoOn;
varying vec2 vUv;
float ign(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
void main(){
  // Fetch exact depth texels: a half-res pixel centre sits on the boundary between two full-res rows,
  // where nearest filtering picks either one and whole rows of normals collapse.
  ivec2 sz = textureSize(tDepth, 0);
  ivec2 ip = min(ivec2(gl_FragCoord.xy)*2, sz - 1);
  vec2 pf = 1.0/vec2(sz);
  vec2 uvc = (vec2(ip) + 0.5)*pf;
  float d = texelFetch(tDepth, ip, 0).r;
  float z = linDepth(d);
  if (d >= 0.99999 || uAoOn < 0.5){ gl_FragColor = vec4(1.0, z, 0.0, 1.0); return; }
  vec3 P = viewAt(uvc, d);
  vec2 px = 1.0/uRes;
  ivec2 hi = sz - 1;
  // normal from the nearer of each pair of neighbours (two texels away)
  float dl = texelFetch(tDepth, clamp(ip - ivec2(2, 0), ivec2(0), hi), 0).r, dr = texelFetch(tDepth, clamp(ip + ivec2(2, 0), ivec2(0), hi), 0).r;
  float du = texelFetch(tDepth, clamp(ip + ivec2(0, 2), ivec2(0), hi), 0).r, dd = texelFetch(tDepth, clamp(ip - ivec2(0, 2), ivec2(0), hi), 0).r;
  vec3 dx = abs(dl - d) < abs(dr - d) ? P - viewAt(uvc - vec2(2.0*pf.x, 0.0), dl) : viewAt(uvc + vec2(2.0*pf.x, 0.0), dr) - P;
  vec3 dy = abs(dd - d) < abs(du - d) ? P - viewAt(uvc - vec2(0.0, 2.0*pf.y), dd) : viewAt(uvc + vec2(0.0, 2.0*pf.y), du) - P;
  vec3 N = normalize(cross(dx, dy));
  // metres; close to the eye only contact shading, or a twig of leaves blacks out everything behind it
  float radius = clamp(z*0.2, 0.10, 0.8);
  float rpx = radius*uRes.y*0.9/max(z, 0.2); // projected radius in pixels
  rpx = clamp(rpx, 3.0, 90.0);
  float phi = ign(gl_FragCoord.xy + 5.588238*mod(uFrame, 64.0))*6.2831853;
  float occ = 0.0;
  const int N_S = 12;
  for (int i = 0; i < N_S; i++){
    float r = (float(i) + 0.5)/float(N_S);
    float th = float(i)*2.39996 + phi;
    vec2 uv = uvc + vec2(cos(th), sin(th))*r*rpx*px;
    float ds = texture(tDepth, uv).r;
    vec3 S = viewAt(uv, ds);
    vec3 v = S - P;
    float vv = dot(v, v);
    float vn = dot(v, N);
    occ += max(vn - 0.02*z*0.05 - 0.012, 0.0)/(vv + 0.02)*smoothstep(radius*radius*4.0, radius*radius*0.6, vv);
  }
  float ao = clamp(1.0 - occ*(2.0*0.42/float(N_S))*3.4, 0.0, 1.0);
  ao = 0.14 + 0.86*ao*ao;
  gl_FragColor = vec4(ao, z, 0.0, 1.0);
}
`;

const COMP_FS = /* glsl */ `
${DEPTH_UTIL}
uniform sampler2D tColor;
uniform sampler2D tVol;
uniform sampler2D tAO;
uniform vec2 uHalfRes;
uniform float uExposure;
varying vec2 vUv;
void main(){
  vec3 col = texture(tColor, vUv).rgb;
  // a single NaN / inf pixel from any shader would be smeared over the whole frame by bloom and TAA
  if (any(isnan(col)) || any(isinf(col)) || max(col.r, max(col.g, col.b)) > 6.0e4) col = vec3(0.0);
  float d = texture(tDepth, vUv).r;
  float z = linDepth(d);
  // depth-aware upsample of half-res AO and volumetrics
  vec2 hp = vUv*uHalfRes - 0.5;
  vec2 base = (floor(hp) + 0.5)/uHalfRes;
  vec2 fr = fract(hp);
  vec4 vol = vec4(0.0); float ao = 0.0; float wsum = 0.0;
  float aw = 0.0;
  for (int j = -1; j < 3; j++) for (int i = -1; i < 3; i++){
    vec2 uv = base + vec2(float(i), float(j))/uHalfRes;
    vec4 a = texture(tAO, uv);
    float wd = 1.0/(0.02 + abs(a.g - z)/max(z, 0.5)*18.0);
    // the AO is noisy by construction: gather it from a 4x4 neighbourhood on the same surface
    vec2 dd = vec2(float(i), float(j)) - fr;
    float wa = exp(-dot(dd, dd)*0.45)*wd;
    ao += a.r*wa; aw += wa;
    if (i >= 0 && i < 2 && j >= 0 && j < 2){
      float wb = (i == 0 ? 1.0 - fr.x : fr.x)*(j == 0 ? 1.0 - fr.y : fr.y);
      float w = (wb + 0.03)*wd;
      vol += texture(tVol, uv)*w; wsum += w;
    }
  }
  vol /= wsum; ao /= aw;
  // AO mostly affects ambient: fade it out of brightly sunlit pixels
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722))*uExposure;
  float k = mix(1.0, ao, 1.0 - smoothstep(0.5, 2.2, lum)*0.7);
  col *= mix(vec3(k), vec3(1.0), 0.0);
  col = col*vol.a + vol.rgb;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;


const TAA_FS = /* glsl */ `
${DEPTH_UTIL}
uniform sampler2D tCur; uniform sampler2D tHist;
uniform mat4 uPrevViewProj; uniform vec2 uRes; uniform float uBlend; uniform float uReset;
varying vec2 vUv;
vec3 tm(vec3 c){ return c/(1.0 + max(c.r, max(c.g, c.b))); }
vec3 itm(vec3 c){ return c/max(1.0 - max(c.r, max(c.g, c.b)), 1e-4); }
// Catmull-Rom history sampling (5 taps) keeps the image crisp under sub-pixel jitter
vec3 histCR(vec2 uv){
  vec2 p = uv*uRes; vec2 tc = floor(p - 0.5) + 0.5; vec2 f = p - tc;
  vec2 w0 = f*(-0.5 + f*(1.0 - 0.5*f)); vec2 w1 = 1.0 + f*f*(-2.5 + 1.5*f);
  vec2 w2 = f*(0.5 + f*(2.0 - 1.5*f)); vec2 w3 = f*f*(-0.5 + 0.5*f);
  vec2 w12 = w1 + w2; vec2 t0 = (tc - 1.0)/uRes; vec2 t3 = (tc + 2.0)/uRes; vec2 t12 = (tc + w2/w12)/uRes;
  vec3 c = texture(tHist, vec2(t12.x, t0.y)).rgb*(w12.x*w0.y) + texture(tHist, vec2(t0.x, t12.y)).rgb*(w0.x*w12.y)
         + texture(tHist, vec2(t12.x, t12.y)).rgb*(w12.x*w12.y) + texture(tHist, vec2(t3.x, t12.y)).rgb*(w3.x*w12.y)
         + texture(tHist, vec2(t12.x, t3.y)).rgb*(w12.x*w3.y);
  float ws = w12.x*w0.y + w0.x*w12.y + w12.x*w12.y + w3.x*w12.y + w12.x*w3.y;
  return max(c/ws, 0.0);
}
void main(){
  vec2 px = 1.0/uRes;
  vec3 c = tm(texture(tCur, vUv).rgb);
  // closest depth in a cross for stable edges
  float d = texture(tDepth, vUv).r;
  d = min(d, min(min(texture(tDepth, vUv + vec2(px.x, 0.0)).r, texture(tDepth, vUv - vec2(px.x, 0.0)).r),
                 min(texture(tDepth, vUv + vec2(0.0, px.y)).r, texture(tDepth, vUv - vec2(0.0, px.y)).r)));
  vec3 wp = worldAt(vUv, d);
  vec4 pc = uPrevViewProj*vec4(wp, 1.0);
  vec2 huv = pc.xy/pc.w*0.5 + 0.5;
  // neighbourhood statistics (variance clipping)
  vec3 m1 = c, m2 = c*c;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    if (i == 0 && j == 0) continue;
    vec3 s = tm(texture(tCur, vUv + vec2(float(i), float(j))*px).rgb);
    m1 += s; m2 += s*s;
  }
  m1 /= 9.0; m2 /= 9.0;
  vec3 sig = sqrt(max(m2 - m1*m1, 0.0));
  vec3 lo = m1 - sig*1.35, hi = m1 + sig*1.35;
  float valid = step(0.0, huv.x)*step(huv.x, 1.0)*step(0.0, huv.y)*step(huv.y, 1.0)*(1.0 - uReset);
  vec3 h = clamp(tm(histCR(huv)), lo, hi);
  vec3 o = mix(c, h, valid*(1.0 - uBlend));
  gl_FragColor = vec4(itm(o), 1.0);
}
`;

const BLOOM_DOWN_FS = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold; uniform float uGain;
varying vec2 vUv;
vec3 pre(vec3 c){
  c *= uGain;
  if (uThreshold <= 0.0) return c;
  float l = max(c.r, max(c.g, c.b));
  float k = max(l - uThreshold, 0.0)/max(l, 1e-4);
  return c*k*k;
}
void main(){
  vec3 c = pre(texture(tSrc, vUv).rgb)*4.0;
  c += pre(texture(tSrc, vUv + uTexel*vec2(-1.0, -1.0)).rgb) + pre(texture(tSrc, vUv + uTexel*vec2(1.0, -1.0)).rgb);
  c += pre(texture(tSrc, vUv + uTexel*vec2(-1.0, 1.0)).rgb) + pre(texture(tSrc, vUv + uTexel*vec2(1.0, 1.0)).rgb);
  c = min(c/8.0, vec3(60.0));
  gl_FragColor = vec4(c, 1.0);
}
`;
const BLOOM_UP_FS = /* glsl */ `
uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uTexel; uniform float uMix;
varying vec2 vUv;
void main(){
  vec3 c = texture(tSrc, vUv + uTexel*vec2(-1.0, -1.0)).rgb + texture(tSrc, vUv + uTexel*vec2(1.0, -1.0)).rgb
         + texture(tSrc, vUv + uTexel*vec2(-1.0, 1.0)).rgb + texture(tSrc, vUv + uTexel*vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  gl_FragColor = vec4(mix(texture(tAdd, vUv).rgb, c, uMix), 1.0);
}
`;

const FINAL_FS = /* glsl */ `
uniform sampler2D tColor; uniform sampler2D tBloom;
uniform vec2 uRes; uniform float uTime; uniform float uBloom; uniform float uGrain; uniform float uVignette;
uniform float uSaturation; uniform float uContrast; uniform vec3 uTint; uniform float uSharpen; uniform float uExposure;
varying vec2 vUv;
// AgX (Troy Sobotka), fitted version by Benjamin Wrensch
vec3 agxDefaultContrastApprox(vec3 x){
  vec3 x2 = x*x; vec3 x4 = x2*x2;
  return + 15.5*x4*x2 - 40.14*x4*x + 31.96*x4 - 6.868*x2*x + 0.4298*x2 + 0.1191*x - 0.00232;
}
vec3 agx(vec3 val){
  const mat3 agx_mat = mat3(0.842479062253094, 0.0423282422610123, 0.0423756549057051,
                            0.0784335999999992, 0.878468636469772, 0.0784336,
                            0.0792237451477643, 0.0791661274605434, 0.879142973793104);
  const float min_ev = -12.47393, max_ev = 4.026069;
  val = agx_mat*val;
  val = clamp(log2(max(val, 1e-10)), min_ev, max_ev);
  val = (val - min_ev)/(max_ev - min_ev);
  return agxDefaultContrastApprox(val);
}
vec3 agxEotf(vec3 val){
  const mat3 agx_mat_inv = mat3(1.19687900512017, -0.0528968517574562, -0.0529716355144438,
                                -0.0980208811401368, 1.15190312990417, -0.0980434501171241,
                                -0.0990297440797205, -0.0989611768448433, 1.15107367264116);
  val = agx_mat_inv*val;
  return val; // already display-referred (sRGB-like 2.2)
}
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec3 filmCurve(vec3 x){ x *= 0.72; return clamp((x*(2.51*x + 0.03))/(x*(2.43*x + 0.59) + 0.14), 0.0, 1.0); }
// film-like response that keeps hue: blend a luminance-driven curve with the per-channel one
vec3 filmic(vec3 c){
  float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 byLum = c*(filmCurve(vec3(L)).r/max(L, 1e-5));
  vec3 perCh = filmCurve(c);
  // let only the very brightest light bleach toward white
  vec3 t = mix(byLum, perCh, 0.42 + 0.4*smoothstep(1.5, 8.0, L));
  return pow(clamp(t, 0.0, 1.0), vec3(1.0/2.2));
}
uniform float uToneMode;
void main(){
  vec2 px = 1.0/uRes;
  vec3 c = texture(tColor, vUv).rgb;
  if (uSharpen > 0.0){
    vec3 n = texture(tColor, vUv + vec2(0.0, px.y)).rgb + texture(tColor, vUv - vec2(0.0, px.y)).rgb
           + texture(tColor, vUv + vec2(px.x, 0.0)).rgb + texture(tColor, vUv - vec2(px.x, 0.0)).rgb;
    vec3 sharp = c + (c - n*0.25)*uSharpen;
    c = max(mix(c, sharp, 1.0/(1.0 + 0.5*uExposure*max(c.r, max(c.g, c.b)))), 0.0);
  }
  c *= uExposure;
  vec3 b = texture(tBloom, vUv).rgb;
  c = mix(c, b, uBloom);
  // vignette (subtle, optical)
  vec2 q = vUv - 0.5;
  c *= 1.0 - uVignette*dot(q, q)*1.6;
  c *= uTint;
  float l;
  if (uToneMode > 0.5){
    c = agx(c);
    c = pow(max(c, 0.0), vec3(uContrast));
    l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = l + uSaturation*(c - l);
    c = agxEotf(c);
  } else {
    c = filmic(c*1.05);
    // gentle S-curve around mid grey, then saturation
    c = mix(c, c*c*(3.0 - 2.0*c), uContrast - 1.0);
    l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = l + uSaturation*(c - l);
  }
  c = clamp(c, 0.0, 1.0);
  // AgX output is ~2.2 display encoded already
  float g = hash12(gl_FragCoord.xy + fract(uTime)*91.7) - 0.5;
  c += g*uGrain*(0.6 + 0.8*(1.0 - l));
  c += (hash12(gl_FragCoord.xy*1.37) - 0.5)/255.0;
  gl_FragColor = vec4(c, 1.0);
}
`;

const LUM_FS = /* glsl */ `
uniform sampler2D tSrc; varying vec2 vUv;
void main(){
  vec3 c = texture(tSrc, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // expose for the land: open sky (blue-dominant) is metered three stops down, as a photographer would let it run light
  float skyish = smoothstep(1.02, 1.3, c.b/max(max(c.r, c.g), 1e-4));
  l *= mix(1.0, 0.125, skyish);
  float e = clamp((log2(max(l, 1e-5)) + 14.0)/22.0, 0.0, 1.0);
  // centre weighting is applied in the 1x1 gather
  float hi = floor(e*255.0)/255.0; float lo = fract(e*255.0);
  gl_FragColor = vec4(hi, lo, 0.0, 1.0);
}
`;
const LUM1_FS = /* glsl */ `
uniform sampler2D tSrc; varying vec2 vUv;
void main(){
  float s = 0.0, w = 0.0;
  for (int j = 0; j < 16; j++) for (int i = 0; i < 16; i++){
    vec2 uv = (vec2(float(i), float(j)) + 0.5)/16.0;
    vec4 t = texture(tSrc, uv);
    float e = t.r + t.g/255.0;
    float ww = 1.0 - 0.6*length(uv - 0.5)*1.41;
    // meter the ground and the middle distance more than the top of the frame, where sky and backlit crowns live
    ww *= mix(1.0, 0.3, smoothstep(0.55, 0.92, uv.y));
    s += e*ww; w += ww;
  }
  float e = s/w;
  float hi = floor(e*255.0)/255.0; float lo = fract(e*255.0);
  gl_FragColor = vec4(hi, lo, 0.0, 1.0);
}
`;

export class Pipeline {
  constructor(renderer, sky, shadows) {
    this.r = renderer;
    this.sky = sky;
    this.shadows = shadows;
    this.exposure = 1.0;
    this.targetExposure = 1.0;
    this.autoExposure = true;
    this.evBias = 0;
    this.w = 0; this.h = 0;
    this._lumBuf = new Uint8Array(4);
    this._lumBusy = false;
    this.look = { bloom: 0.055, grain: 0.012, vignette: 0.22, saturation: 0.9, contrast: 1.07, sharpen: 0.3 };

    const q = G.quality;
    const depthU = () => ({ tDepth: { value: null }, uInvViewProj: { value: new THREE.Matrix4() }, uInvProj: { value: new THREE.Matrix4() }, uNearFar: { value: new THREE.Vector2(0.2, 4000) } });
    this.volPass = new FSPass(VOL_FS, {
      ...depthU(),
      uShadowFar: G.uniforms.uShadowFar, uShadowFarMat: G.uniforms.uShadowFarMat,
      uSunDir: G.uniforms.uSunDir, uTime: G.uniforms.uTime, uWind: G.uniforms.uWind,
      uCamPos: { value: new THREE.Vector3() },
      uFogSun: { value: sky.fog.sunScatter }, uFogAmb: { value: sky.fog.ambScatter }, uFogHorizon: { value: sky.fog.horizon },
      uFog: { value: new THREE.Vector4() }, uRes: { value: new THREE.Vector2() }, uFrame: { value: 0 }, uHaze: { value: 0.0003 },
    }, { defines: { VOL_STEPS: q.vol } });
    this.aoPass = new FSPass(AO_FS, { ...depthU(), uRes: { value: new THREE.Vector2() }, uFrame: { value: 0 }, uAoOn: { value: q.ao } });
    this.compPass = new FSPass(COMP_FS, {
      ...depthU(), tColor: { value: null }, tVol: { value: null }, tAO: { value: null },
      uHalfRes: { value: new THREE.Vector2() }, uExposure: { value: 1 },
    });
    this.taaPass = new FSPass(TAA_FS, {
      ...depthU(), tCur: { value: null }, tHist: { value: null }, uPrevViewProj: { value: new THREE.Matrix4() },
      uRes: { value: new THREE.Vector2() }, uBlend: { value: 0.1 }, uReset: { value: 1 },
    });
    this.taa = true;
    // planar reflection of the forest in the stream (rendered from low-detail proxies)
    this.reflect = G.quality.reflect !== false;
    this.reflCam = new THREE.PerspectiveCamera();
    this.reflCam.layers.set(3);
    this.reflMat = new THREE.Matrix4();
    this.reflInfo = { on: 0, level: 0 };
    this.prevViewProj = new THREE.Matrix4();
    this.jitterIndex = 0;
    this.downPass = new FSPass(BLOOM_DOWN_FS, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 0 }, uGain: { value: 1 } });
    this.upPass = new FSPass(BLOOM_UP_FS, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() }, uMix: { value: 0.6 } });
    this.finalPass = new FSPass(FINAL_FS, {
      tColor: { value: null }, tBloom: { value: null }, uRes: { value: new THREE.Vector2() }, uTime: G.uniforms.uTime,
      uBloom: { value: 0.05 }, uGrain: { value: 0.012 }, uVignette: { value: 0.2 }, uSaturation: { value: 1.1 },
      uContrast: { value: 1.1 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uSharpen: { value: 0.25 }, uExposure: { value: 1 }, uToneMode: { value: 0 },
    });
    this.lumPass = new FSPass(LUM_FS, { tSrc: { value: null } });
    this.lum1Pass = new FSPass(LUM1_FS, { tSrc: { value: null } });
    this.rtLum = new THREE.WebGLRenderTarget(16, 16, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
    this.rtLum1 = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  }

  resize(w, h) {
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    const q = G.quality;
    for (const t of ['rtMain', 'rtVol', 'rtAO', 'rtComp', 'rtTaaA', 'rtTaaB']) this[t]?.dispose();
    (this.bloom || []).forEach((t) => t.dispose());
    (this.bloomUp || []).forEach((t) => t.dispose());
    this.rtMain = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: HF,
      depthBuffer: true, stencilBuffer: false, samples: q.msaa,
    });
    this.rtMain.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
    this.rtMain.depthTexture.minFilter = THREE.NearestFilter;
    this.rtMain.depthTexture.magFilter = THREE.NearestFilter;
    const hw = Math.max(2, Math.floor(w / 2)), hh = Math.max(2, Math.floor(h / 2));
    this.rtVol = rt(hw, hh);
    this.rtAO = rt(hw, hh, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.rtComp = rt(w, h);
    this.rtTaaA = rt(w, h); this.rtTaaB = rt(w, h);
    this.rtRefl?.dispose();
    this.rtRefl = rt(Math.max(2, w >> 1), Math.max(2, h >> 1), { depthBuffer: true });
    this.taaReset = true;
    this.bloom = [];
    let bw = hw, bh = hh;
    for (let i = 0; i < 6; i++) {
      this.bloom.push(rt(bw, bh));
      bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1);
    }
    this.bloomUp = this.bloom.map((t) => rt(t.width, t.height));
    this.half = new THREE.Vector2(hw, hh);
  }

  render(scene, camera, dt) {
    const r = this.r;
    const sky = this.sky;
    this._renderReflection(scene, camera);
    // sub-pixel jitter (Halton 2,3) for temporal anti-aliasing
    const proj = camera.projectionMatrix;
    const p8 = proj.elements[8], p9 = proj.elements[9];
    const vpClean = new THREE.Matrix4().multiplyMatrices(proj, camera.matrixWorldInverse);
    if (this.taa) {
      const hal = (i, b) => { let f = 1, x = 0; while (i > 0) { f /= b; x += f * (i % b); i = Math.floor(i / b); } return x; };
      const k = (this.jitterIndex++ % 16) + 1;
      proj.elements[8] += (hal(k, 2) - 0.5) * 2 / this.w;
      proj.elements[9] += (hal(k, 3) - 0.5) * 2 / this.h;
      camera.projectionMatrixInverse.copy(proj).invert();
    }
    this.sky.setCamera(camera);
    // 1. scene
    r.setRenderTarget(this.rtMain);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    r.render(scene, camera);

    const depth = this.rtMain.depthTexture;
    const ivp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
    const ip = camera.projectionMatrixInverse;
    for (const p of [this.volPass, this.aoPass, this.compPass, this.taaPass]) {
      p.u.tDepth.value = depth;
      p.u.uInvViewProj.value.copy(ivp);
      p.u.uInvProj.value.copy(ip);
      p.u.uNearFar.value.set(camera.near, camera.far);
    }
    // 2. volumetrics
    const f = sky.fog;
    this.volPass.u.uCamPos.value.copy(camera.position);
    this.volPass.u.uFog.value.set(f.density, f.heightFalloff, f.baseHeight, f.mist);
    this.volPass.u.uRes.value.copy(this.half);
    this.volPass.u.uFrame.value = G.frame;
    this.volPass.u.uHaze.value = 0.00016 + 0.00055 * sky.w.haze;
    this.volPass.render(r, this.rtVol);
    // 3. AO
    this.aoPass.u.uRes.value.copy(this.half);
    this.aoPass.u.uFrame.value = G.frame;
    this.aoPass.render(r, this.rtAO);
    // 4. composite (exposed HDR)
    this._adapt(dt);
    const c = this.compPass.u;
    c.tColor.value = this.rtMain.texture; c.tVol.value = this.rtVol.texture; c.tAO.value = this.rtAO.texture;
    c.uHalfRes.value.copy(this.half); c.uExposure.value = this.exposure * Math.pow(2, this.evBias);
    this.compPass.render(r, this.rtComp);
    // 4b. temporal resolve
    const expNow = this.exposure * Math.pow(2, this.evBias);
    let resolved = this.rtComp;
    if (this.taa) {
      const tu = this.taaPass.u;
      tu.tCur.value = this.rtComp.texture; tu.tHist.value = this.rtTaaA.texture;
      tu.uPrevViewProj.value.copy(this.prevViewProj); tu.uRes.value.set(this.w, this.h);
      tu.uReset.value = this.taaReset ? 1 : 0;
      this.taaPass.render(r, this.rtTaaB);
      const t = this.rtTaaA; this.rtTaaA = this.rtTaaB; this.rtTaaB = t;
      resolved = this.rtTaaA;
      this.taaReset = false;
      // restore the un-jittered projection
      proj.elements[8] = p8; proj.elements[9] = p9;
      camera.projectionMatrixInverse.copy(proj).invert();
    }
    this.prevViewProj.copy(vpClean);
    // 5. bloom
    let src = resolved;
    for (let i = 0; i < this.bloom.length; i++) {
      const d = this.bloom[i];
      this.downPass.u.tSrc.value = src.texture;
      this.downPass.u.uTexel.value.set(1 / src.width, 1 / src.height);
      this.downPass.u.uThreshold.value = 0;
      this.downPass.u.uGain.value = i === 0 ? expNow : 1;
      this.downPass.render(r, d);
      src = d;
    }
    let up = this.bloom[this.bloom.length - 1];
    for (let i = this.bloom.length - 2; i >= 0; i--) {
      const d = this.bloomUp[i];
      this.upPass.u.tSrc.value = up.texture;
      this.upPass.u.tAdd.value = this.bloom[i].texture;
      this.upPass.u.uTexel.value.set(1 / up.width, 1 / up.height);
      this.upPass.u.uMix.value = 0.62;
      this.upPass.render(r, d);
      up = d;
    }
    // 6. metering
    this._meter(this.bloom[2]);
    // 7. film
    const fu = this.finalPass.u;
    const L = this.look;
    fu.tColor.value = resolved.texture; fu.tBloom.value = up.texture; fu.uExposure.value = expNow;
    fu.uRes.value.set(this.w, this.h);
    fu.uBloom.value = L.bloom + 0.05 * sky.w.mist; fu.uGrain.value = L.grain; fu.uVignette.value = L.vignette;
    fu.uSaturation.value = L.saturation; fu.uContrast.value = L.contrast; fu.uSharpen.value = L.sharpen;
    this.finalPass.render(r, null);
  }

  _renderReflection(scene, camera) {
    const info = this.reflInfo;
    info.on = 0;
    const terrain = G.terrain;
    if (!this.reflect || !terrain) return;
    const cp = camera.position;
    const sd = terrain.fields.streamDist.at(cp.x, cp.z);
    const level = terrain.fields.water.at(cp.x, cp.z);
    if (sd > 46 || cp.y < level + 0.05 || cp.y > level + 40) return;
    // mirror the camera in the water plane (as three's Reflector does)
    const vc = this.reflCam;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    vc.position.set(cp.x, 2 * level - cp.y, cp.z);
    vc.up.set(up.x, -up.y, up.z);
    vc.lookAt(vc.position.x + fwd.x, vc.position.y - fwd.y, vc.position.z + fwd.z);
    vc.near = camera.near; vc.far = camera.far;
    vc.projectionMatrix.copy(camera.projectionMatrix);
    vc.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    vc.updateMatrixWorld(true);
    vc.matrixWorldInverse.copy(vc.matrixWorld).invert();
    this.reflMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
    // The mirrored eye is under the bank: make the water plane its near plane (oblique frustum, Lengyel),
    // or it would see the underside of the ground instead of the forest above.
    const plane = (this._rp || (this._rp = new THREE.Plane())).setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, level - 0.04, 0));
    plane.applyMatrix4(vc.matrixWorldInverse);
    const cpl = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = vc.projectionMatrix, e = pm.elements;
    const qv = new THREE.Vector4((Math.sign(cpl.x) + e[8]) / e[0], (Math.sign(cpl.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
    cpl.multiplyScalar(2 / cpl.dot(qv));
    e[2] = cpl.x; e[6] = cpl.y; e[10] = cpl.z + 1; e[14] = cpl.w;
    vc.projectionMatrixInverse.copy(pm).invert();
    this.sky.setCamera(vc);
    const r = this.r;
    r.setRenderTarget(this.rtRefl);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    r.render(scene, vc);
    info.on = 1 - Math.min(1, Math.max(0, (sd - 34) / 12));
    info.level = level;
  }

  _adapt(dt) {
    if (!this.autoExposure) return;
    const k = 1 - Math.exp(-dt * (this.fastAdapt ? 12 : 1.6));
    this.exposure += (this.targetExposure - this.exposure) * k;
  }

  _meter(src) {
    if (!this.autoExposure || this._lumBusy || G.frame % 4 !== 0) return;
    const r = this.r;
    this.lumPass.u.tSrc.value = src.texture;
    this.lumPass.render(r, this.rtLum);
    this.lum1Pass.u.tSrc.value = this.rtLum.texture;
    this.lum1Pass.render(r, this.rtLum1);
    this._lumBusy = true;
    const expNow = this.exposure * Math.pow(2, this.evBias);
    r.readRenderTargetPixelsAsync(this.rtLum1, 0, 0, 1, 1, this._lumBuf).then(() => {
      const e = (this._lumBuf[0] + this._lumBuf[1] / 255) / 255;
      const logL = e * 22 - 14;           // log2 of exposed average luminance
      const sceneLog = logL - Math.log2(expNow);
      // aim the log-average at a mid grey that drifts darker for dark scenes (keeps night dark)
      const key = 0.115 * Math.pow(2, Math.max(-2.2, Math.min(0.3, sceneLog * 0.22 + 0.25)));
      const target = key / Math.pow(2, sceneLog);
      this.targetExposure = Math.min(40, Math.max(0.02, target));
      this._lumBusy = false;
    }).catch(() => { this._lumBusy = false; this.autoExposure = false; });
  }
}
