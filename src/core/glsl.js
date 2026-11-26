// Shared GLSL chunks. All world materials are ShaderMaterials built from these.

export const COMMON = /* glsl */ `
#define PI 3.14159265359
uniform float uTime;
uniform vec3 uSunDir;        // direction toward the main light (sun or moon)
uniform vec3 uSunColor;      // HDR radiance of the main light
uniform vec3 uSkyTop;        // ambient sky irradiance (zenith)
uniform vec3 uSkyHorizon;    // ambient near horizon
uniform vec3 uGroundCol;     // bounce from the forest floor
uniform vec3 uCanopyGlow;    // intensity of light scattered/transmitted by the lit canopy
uniform vec4 uWind;          // xy: wind direction in xz, z: strength (0..1.5), w: gust
uniform float uWet;          // 0 dry .. 1 soaked
uniform float uDebug;
uniform vec3 uWorld;         // x: world size (m), y: 1/size, z: max height
uniform sampler2D uHeightMap;  // r: terrain height (m)
uniform sampler2D uCanopyMap;  // rgb: canopy tint (linear), a: canopy cover
uniform sampler2D uSiteMap;    // r: moisture, g: stream proximity, b: trail, a: rockiness

float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973)); p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec3 hash32(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973)); p3 += dot(p3, p3.yxz+33.33); return fract((p3.xxy+p3.yzz)*p3.zyx); }
float hash13(vec3 p3){ p3 = fract(p3*0.1031); p3 += dot(p3, p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y);
}
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 u = f*f*(3.0-2.0*f);
  float a = mix(mix(hash13(i), hash13(i+vec3(1,0,0)), u.x), mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), u.x), u.y);
  float b = mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), u.x), mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), u.x), u.y);
  return mix(a, b, u.z);
}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++){ s += a*vnoise(p); p = p*2.03 + vec2(17.3, 9.1); a *= 0.5; }
  return s;
}
float fbm3(vec3 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++){ s += a*vnoise3(p); p = p*2.03 + vec3(17.3, 9.1, 4.7); a *= 0.5; }
  return s;
}
vec2 worldUV(vec3 p){ return p.xz*uWorld.y + 0.5; }
float terrainH(vec2 xz){ return texture(uHeightMap, xz*uWorld.y + 0.5).r; }
float sat(float x){ return clamp(x, 0.0, 1.0); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 saturateCol(vec3 c, float s){ float l = luma(c); return max(vec3(0.0), mix(vec3(l), c, s)); }
vec3 hueShift(vec3 c, float a){
  const vec3 k = vec3(0.57735);
  float ca = cos(a), sa = sin(a);
  return c*ca + cross(k, c)*sa + k*dot(k, c)*(1.0-ca);
}
`;

// Compact per-instance transform: iA = (x,y,z,scale), iB = (yaw, seed, slopeX, slopeZ)
export const INSTANCING = /* glsl */ `
attribute vec4 iA;
attribute vec4 iB;
uniform float uAlign;   // 1: conform flat geometry to the terrain slope
vec3 instRotate(vec3 p){
  float c = cos(iB.x), s = sin(iB.x);
  return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z);
}
vec3 instPos(vec3 p){
  p = instRotate(p*iA.w);
  p.y += uAlign*(p.x*iB.z + p.z*iB.w);
  return p + iA.xyz;
}
vec3 instNormal(vec3 n){
  n = instRotate(n);
  n.xz -= uAlign*n.y*iB.zw;
  return normalize(n);
}
`;

// Wind. flex: metres of sway at full strength (branch level), flutter: leaf level amplitude.
export const WIND = /* glsl */ `
vec3 windOffset(vec3 wpos, float flex, float flutter, float phase){
  vec2 wd = uWind.xy;
  float st = uWind.z;
  float t = uTime;
  // travelling gusts
  float g = vnoise(wpos.xz*0.035 - wd*t*0.45) * 0.75 + vnoise(wpos.xz*0.11 - wd*t*0.9 + 3.7)*0.25;
  g = mix(0.55, g*1.6, uWind.w);
  float sway = sin(t*(0.9 + 0.5*hash11(phase*7.31)) + phase*6.28 + wpos.x*0.05) * 0.5 + 0.35;
  vec3 o = vec3(wd.x, 0.0, wd.y) * (flex * st * g * (0.6 + sway));
  o.y -= 0.15*abs(flex)*st*g*sway;
  // leaf flutter
  float f1 = sin(t*(5.3 + 3.0*hash11(phase*3.1)) + phase*40.0 + wpos.y*3.0);
  float f2 = sin(t*(8.7 + 2.0*hash11(phase*9.7)) + phase*91.0 + wpos.x*4.0);
  o += vec3(f1, f2*0.7, f1*f2) * (flutter * st * (0.35 + g));
  return o;
}
`;

export const SHADOWS = /* glsl */ `
uniform highp sampler2D uShadowNear;
uniform highp sampler2D uShadowFar;
uniform mat4 uShadowNearMat;
uniform mat4 uShadowFarMat;
uniform vec4 uShadowNearInfo;  // x: uv per metre, y: depth range (m), z: texel uv, w: enabled
uniform vec4 uShadowFarInfo;
uniform float uSunSoft;        // tangent of the light's angular radius (artistically scaled)

vec2 vogel(int i, float n, float phi){
  float r = sqrt((float(i)+0.5)/n);
  float th = float(i)*2.39996323 + phi;
  return r*vec2(cos(th), sin(th));
}
uniform float uFrameN;
// Per-pixel kernel rotation for the shadow filters. It must NOT change from frame to frame: a rotation
// re-drawn every frame relies on temporal accumulation to average out, and wherever that fails
// (moving foliage, camera motion, history clamping) penumbrae and dappled shade crawl like dark static.
// A fixed interleaved-gradient pattern leaves at most a faint, still dither that TAA's jitter softens.
float ign(vec2 p){ return fract(52.9829189*fract(dot(floor(p), vec2(0.06711056, 0.00583715)))); }

float shadowPCSS(highp sampler2D map, vec3 sc, vec4 info, float rnd, float bias, float maxR, float minTexels, out float blockDist){
  float phi = rnd*6.2831853;
  float zb = 0.0, nb = 0.0;
  blockDist = 0.0;
  for (int i = 0; i < SHADOW_SEARCH; i++){
    vec2 o = vogel(i, float(SHADOW_SEARCH), phi)*maxR;
    float d = texture(map, sc.xy + o).r;
    if (d < sc.z - bias){ zb += d; nb += 1.0; }
  }
  if (nb < 0.5) return 1.0;
  zb /= nb;
  blockDist = (sc.z - zb)*info.y;
  float pen = blockDist*uSunSoft*info.x;
  float r = clamp(pen, info.z*minTexels, maxR);
  float s = 0.0;
  for (int i = 0; i < SHADOW_TAPS; i++){
    vec2 o = vogel(i, float(SHADOW_TAPS), phi + 1.7)*r;
    s += step(sc.z - bias, texture(map, sc.xy + o).r);
  }
  return s/float(SHADOW_TAPS);
}

// returns direct-light visibility in [0,1]
float sunShadow(vec3 wpos, vec3 N, float rnd){
  float ndl = dot(N, uSunDir);
  // (no animated offset here: a noise-driven wobble of the lookup made all distant shade swim)
  vec3 pf = wpos + N*(0.10 + 0.12*(1.0 - abs(ndl)));
  vec4 f4 = uShadowFarMat*vec4(pf, 1.0);
  vec3 fc = f4.xyz*0.5 + 0.5;
  float sFar = 1.0, bdFar = 0.0;
  if (fc.x > 0.001 && fc.x < 0.999 && fc.y > 0.001 && fc.y < 0.999 && fc.z < 1.0)
    sFar = shadowPCSS(uShadowFar, fc, uShadowFarInfo, rnd, 0.0006, uShadowFarInfo.x*1.6, 1.6, bdFar);
  if (uShadowNearInfo.w < 0.5) return sFar;
  vec3 pn = wpos + N*(0.02 + 0.03*(1.0 - abs(ndl)));
  vec4 n4 = uShadowNearMat*vec4(pn, 1.0);
  vec3 nc = n4.xyz*0.5 + 0.5;
  vec2 e = abs(nc.xy - 0.5)*2.0;
  float edge = max(e.x, e.y);
  if (edge >= 1.0 || nc.z >= 1.0 || nc.z <= 0.0) return sFar;
  float bdNear;
  float sNear = shadowPCSS(uShadowNear, nc, uShadowNearInfo, rnd, 0.00035, uShadowNearInfo.x*0.45, 1.0, bdNear);
  // inside the near cascade the detailed map is authoritative for anything close; the coarse world map
  // (low-detail proxies) contributes only shade from occluders far above or far away
  float sFarDistant = mix(1.0, sFar, smoothstep(9.0, 22.0, bdFar));
  float both = min(sNear, sFarDistant);
  return mix(both, sFar, smoothstep(0.8, 1.0, edge));
}
`;

export const LIGHTING = /* glsl */ `
struct Surf {
  vec3 albedo;
  vec3 N;        // shading normal, facing the viewer for two-sided surfaces
  float rough;
  float spec;    // dielectric specular scale (0..1) -> F0 = 0.04*spec
  float ao;
  float trans;   // translucency amount (thin foliage)
  vec3 transCol; // colour of transmitted light
  float above;   // 0 = on the forest floor, 1 = at/above the canopy top
};

vec3 skyAmbient(vec3 N){
  float up = N.y*0.5 + 0.5;
  vec3 sky = mix(uSkyHorizon, uSkyTop, up);
  return mix(uGroundCol, sky, smoothstep(0.15, 0.75, up));
}

float D_GGX(float NoH, float a){ float a2 = a*a; float d = NoH*NoH*(a2-1.0)+1.0; return a2/(PI*d*d + 1e-5); }
float V_Smith(float NoV, float NoL, float a){ float k = a*0.5; return 0.25/((NoV*(1.0-k)+k)*(NoL*(1.0-k)+k) + 1e-4); }

vec3 shadeSurface(Surf s, vec3 wpos, vec3 V, float shadow){
  vec3 L = uSunDir;
  float NoL = dot(s.N, L);
  float NoV = max(dot(s.N, V), 1e-3);
  vec4 cm = texture(uCanopyMap, worldUV(wpos));
  float cover = cm.a*(1.0 - s.above);
  if (uDebug > 0.5 && uDebug < 5.5){
    if (uDebug < 1.5) return vec3(shadow);
    if (uDebug < 2.5) return s.N*0.5 + 0.5;
    if (uDebug < 3.5) return s.albedo;
    if (uDebug < 4.5) return vec3(s.ao);
    return vec3(cover);
  }
  // wetness: darker, glossier
  // wetness: rain-soaked bark, stone and litter go dark; the film of water adds sheen but a rough surface stays rough
  vec3 alb = s.albedo*mix(1.0, 0.48, uWet*(1.0 - 0.6*s.trans));
  float rough = mix(s.rough, max(0.30, s.rough*0.66), uWet);
  float spec = mix(s.spec, max(s.spec, 0.85), uWet);

  // direct
  float diff = max(NoL, 0.0);
  vec3 col = alb*uSunColor*diff*shadow*(1.0/PI);
  // thin-leaf transmission: light arriving on the far side glows through
  if (s.trans > 0.0){
    float back = max(-NoL, 0.0);
    float vl = pow(sat(dot(V, -L)), 3.0);
    vec3 tc = s.transCol*uSunColor*shadow*(1.0/PI);
    col += tc*s.trans*(back*(0.75 + 1.5*vl) + 0.12*diff);
  }
  // specular
  vec3 H = normalize(L + V);
  float NoH = max(dot(s.N, H), 0.0);
  float a = max(rough*rough, 0.012);
  float F0 = 0.04*spec;
  float F = F0 + (1.0 - F0)*pow(1.0 - max(dot(V, H), 0.0), 5.0);
  col += uSunColor*shadow*diff*D_GGX(NoH, a)*V_Smith(NoV, max(NoL, 1e-3), a)*F;

  // ambient: open sky that leaks through gaps + light scattered by the glowing canopy
  float skyVis = 1.0 - cover*0.88;
  float upF = s.N.y*0.5 + 0.5;
  float wSky = smoothstep(0.15, 0.75, upF);
  vec3 amb = mix(uSkyHorizon, uSkyTop, upF)*wSky*skyVis + uGroundCol*(1.0 - wSky);
  vec3 ct = cm.rgb*cm.rgb;                       // stored sqrt-encoded
  ct /= max(max(ct.r, ct.g), max(ct.b, 0.05));
  vec3 glowTint = mix(vec3(1.0, 0.86, 0.5), ct, 0.7);
  amb += uCanopyGlow*glowTint*cover*(0.64 + 0.36*s.N.y);
  col += alb*amb*s.ao;
  if (s.trans > 0.0){
    // light arriving on the far side of a leaf: mostly canopy-filtered, not raw blue sky
    float upB = 0.5 - s.N.y*0.5;
    float wB = smoothstep(0.15, 0.75, upB);
    vec3 ambB = mix(uSkyHorizon, uSkyTop, upB)*wB*skyVis + uGroundCol*(1.0 - wB) + uCanopyGlow*glowTint*cover*(0.64 - 0.36*s.N.y);
    col += s.transCol*s.trans*ambB*s.ao*0.38;
  }
  // ambient specular (sky / canopy sheen)
  vec3 R = reflect(-V, s.N);
  // a rough surface never becomes a mirror at grazing angles (no chalky rims on bark)
  float Fa = F0 + (max(1.0 - rough, F0) - F0)*pow(1.0 - NoV, 5.0);
  // inside the forest a level ray meets trunks and foliage, not sky: only steep reflections find the gaps overhead
  float skyR = skyVis*mix(1.0, smoothstep(-0.05, 0.6, R.y), cm.a);
  vec3 envc = skyAmbient(R)*skyR + (uCanopyGlow*glowTint + uGroundCol*0.6)*cover;
  col += envc*Fa*(1.0 - rough)*s.ao*mix(1.0, 0.35, min(s.trans*2.0, 1.0));
  return col;
}
`;

export const FS_TRI_VS = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = position.xy*0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
