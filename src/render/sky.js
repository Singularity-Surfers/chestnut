// Sun, sky, clouds and weather. Mid-October at 35.6°N (Great Smoky Mountains).
import * as THREE from 'three';
import { G, fullscreenTriangle } from '../core/engine.js';
import { COMMON } from '../core/glsl.js';
import { clamp, lerp, smoothstep } from '../core/rng.js';

const LAT = 35.6 * Math.PI / 180;
const DECL = -8.6 * Math.PI / 180; // mid-October

export const WEATHER = {
  clear:    { label: 'Clear',          cover: 0.12, overcast: 0.0, fog: 0.0030, fogH: 30, mist: 0.0, rain: 0, wet: 0.0, wind: 0.30, gust: 0.5, haze: 0.5 },
  fair:     { label: 'Fair-weather clouds', cover: 0.45, overcast: 0.0, fog: 0.0022, fogH: 30, mist: 0.0, rain: 0, wet: 0.0, wind: 0.45, gust: 0.7, haze: 0.35 },
  overcast: { label: 'Overcast',       cover: 1.0,  overcast: 0.92, fog: 0.0045, fogH: 40, mist: 0.15, rain: 0, wet: 0.15, wind: 0.35, gust: 0.5, haze: 0.6 },
  mist:     { label: 'Morning mist',   cover: 0.25, overcast: 0.25, fog: 0.034, fogH: 20, mist: 1.0, rain: 0, wet: 0.35, wind: 0.10, gust: 0.3, haze: 0.9 },
  rain:     { label: 'Rain',           cover: 1.0,  overcast: 1.0, fog: 0.010, fogH: 45, mist: 0.5, rain: 1, wet: 1.0, wind: 0.60, gust: 0.9, haze: 0.8 },
  after:    { label: 'After the rain', cover: 0.5,  overcast: 0.1, fog: 0.008, fogH: 18, mist: 0.6, rain: 0, wet: 0.8, wind: 0.25, gust: 0.5, haze: 0.7 },
  breezy:   { label: 'Breezy',         cover: 0.35, overcast: 0.0, fog: 0.0018, fogH: 28, mist: 0.0, rain: 0, wet: 0.0, wind: 1.0, gust: 1.0, haze: 0.3 },
};

const v3 = (r, g, b) => new THREE.Vector3(r, g, b);

export class Sky {
  constructor() {
    this.hour = 15.5;          // solar time
    this.weatherName = 'clear';
    this.w = { ...WEATHER.clear };
    this.target = { ...WEATHER.clear };
    this.sunDir = new THREE.Vector3();
    this.lightDir = new THREE.Vector3();
    this.elev = 0;
    this.exposureBias = 0;
    this.u = {
      uSkyZenith: { value: v3(0.2, 0.4, 0.9) },
      uSkyHoriz: { value: v3(0.7, 0.8, 0.95) },
      uSunDisc: { value: v3(1, 1, 1) },
      uTrueSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uCloud: { value: new THREE.Vector4(0.2, 0, 0, 0) }, // cover, overcast, night, haze
      uCloudLit: { value: v3(1, 1, 1) },
      uCloudDark: { value: v3(0.5, 0.55, 0.6) },
      uInvViewProj: { value: new THREE.Matrix4() },
      uSkyTime: G.uniforms.uTime,
      uWindS: G.uniforms.uWind,
    };
    // fog uniforms consumed by the volumetric pass
    this.fog = {
      density: 0.002, heightFalloff: 1 / 26, baseHeight: 10, mist: 0,
      sunScatter: v3(1, 1, 1), ambScatter: v3(0.5, 0.6, 0.7), horizon: v3(0.7, 0.8, 0.9),
    };
    this.mesh = this._makeDome();
    this.setWeather('clear', true);
    this.update(0, true);
  }

  _makeDome() {
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: `varying vec2 vNdc; void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
      fragmentShader: SKY_FS,
      depthWrite: false,
      depthFunc: THREE.LessEqualDepth,
    });
    const m = new THREE.Mesh(fullscreenTriangle(), mat);
    m.frustumCulled = false;
    m.renderOrder = 1000;
    m.name = 'sky';
    return m;
  }

  setWeather(name, instant = false) {
    if (!WEATHER[name]) return;
    this.weatherName = name;
    this.target = { ...WEATHER[name] };
    if (instant) this.w = { ...WEATHER[name] };
  }

  setHour(h) { this.hour = ((h % 24) + 24) % 24; }

  /** Solar position for the configured hour. x east, y up, z south. */
  static sunVector(hour, out) {
    const ha = (hour - 12) * 15 * Math.PI / 180;
    const sinEl = Math.sin(LAT) * Math.sin(DECL) + Math.cos(LAT) * Math.cos(DECL) * Math.cos(ha);
    const el = Math.asin(sinEl);
    // azimuth from north, clockwise
    const y = -Math.sin(ha) * Math.cos(DECL);
    const x = Math.sin(DECL) * Math.cos(LAT) - Math.cos(DECL) * Math.sin(LAT) * Math.cos(ha);
    const az = Math.atan2(y, x);
    const c = Math.cos(el);
    out.set(c * Math.sin(az), Math.sin(el), -c * Math.cos(az));
    return el;
  }

  update(dt, instant = false) {
    const k = instant ? 1 : 1 - Math.exp(-dt * 0.5);
    for (const key of Object.keys(this.target)) {
      if (typeof this.target[key] === 'number') this.w[key] = lerp(this.w[key], this.target[key], k);
    }
    const w = this.w;
    const el = Sky.sunVector(this.hour, this.sunDir);
    this.elev = el;
    const elDeg = el * 180 / Math.PI;
    const day = smoothstep(-6, 4, elDeg);       // twilight ramp
    const night = 1 - smoothstep(-9, -3, elDeg);
    const dusk = smoothstep(-15, -5, elDeg) * (1 - day);   // the sky still glows long after the sun has gone

    // --- sun colour via optical depth ---
    const sinE = Math.max(Math.sin(el), 0.0);
    const airmass = 1 / (sinE + 0.15 * Math.pow(Math.max(elDeg, 0) + 3.885, -1.253));
    const tau = [0.085 + 0.07 * w.haze, 0.16 + 0.07 * w.haze, 0.34 + 0.08 * w.haze];
    const sunI = 30 * smoothstep(-1.2, 3, elDeg);
    let sun = tau.map((t) => sunI * Math.exp(-t * (airmass - 1) * 0.85 - t * 0.2));
    const direct = (1 - w.overcast) * (1 - 0.5 * w.mist) * lerp(1, 0.75, w.cover * 0.5);
    // moon
    const moonDir = this.u.uMoonDir.value.set(-this.sunDir.x * 0.6 + 0.3, Math.max(0.35, -this.sunDir.y * 0.9 + 0.2), -this.sunDir.z * 0.7 - 0.4).normalize();
    const moon = [0.05, 0.07, 0.115].map((c) => c * night * (1 - 0.8 * w.overcast));

    const useMoon = elDeg < -4;
    this.lightDir.copy(useMoon ? moonDir : this.sunDir);
    if (!useMoon && this.lightDir.y < 0.035) { this.lightDir.y = 0.035; this.lightDir.normalize(); }
    const light = useMoon ? moon : sun.map((c) => c * direct);
    G.uniforms.uSunDir.value.copy(this.lightDir);
    G.uniforms.uSunColor.value.set(light[0], light[1], light[2]);
    // softer shadows under thin cloud / mist
    G.uniforms.uSunSoft.value = lerp(0.022, 0.09, clamp(w.cover * 0.5 + w.mist * 0.6 + w.overcast));

    // --- sky colours ---
    const warm = smoothstep(14, 0, elDeg) * day; // sunset warmth
    // the blue dome dims as the sun sinks, so late light is carried by the low warm sun and what it strikes
    const skyK = 0.22 + 0.78 * Math.pow(Math.max(Math.sin(el), 0), 0.6);
    let zen = [lerp(0.10, 0.045, warm), lerp(0.24, 0.12, warm), lerp(0.62, 0.36, warm)].map((c) => c * (4.2 * day * skyK + 0.07 * dusk));
    let hor = [lerp(0.50, 0.95, warm), lerp(0.66, 0.50, warm), lerp(0.92, 0.33, warm)].map((c) => c * (4.4 * day * Math.sqrt(skyK) + 0.10 * dusk));
    // haze whitens the horizon
    const hz = w.haze * 0.5;
    hor = hor.map((c, i) => lerp(c, (hor[0] + hor[1] + hor[2]) / 3 * [1.04, 1.0, 0.96][i], hz));
    // overcast: grey luminous dome, brighter at the zenith
    const ocI = (2.4 * day) * lerp(1, 0.6, w.rain);
    const oz = [0.80, 0.83, 0.88].map((c) => c * ocI * 1.25), oh = [0.62, 0.66, 0.72].map((c) => c * ocI * 0.7);
    zen = zen.map((c, i) => lerp(c, oz[i], w.overcast));
    hor = hor.map((c, i) => lerp(c, oh[i], w.overcast));
    // night floor
    const nz = [0.004, 0.007, 0.016], nh = [0.006, 0.009, 0.017];
    zen = zen.map((c, i) => c + nz[i] * (0.4 + night));
    hor = hor.map((c, i) => c + nh[i] * (0.4 + night));
    this.u.uSkyZenith.value.set(zen[0], zen[1], zen[2]);
    this.u.uSkyHoriz.value.set(hor[0], hor[1], hor[2]);
    this.u.uTrueSunDir.value.copy(this.sunDir);
    const discI = (1 - w.overcast) * (1 - 0.7 * w.mist);
    this.u.uSunDisc.value.set(sun[0] * discI, sun[1] * discI, sun[2] * discI);
    this.u.uCloud.value.set(w.cover, w.overcast, night, w.haze);
    const cl = sun.map((c, i) => c * 0.20 * (1 - w.overcast) + zen[i] * 0.9 + hor[i] * 0.35);
    this.u.uCloudLit.value.set(cl[0], cl[1], cl[2]);
    const cd = zen.map((c, i) => c * 0.45 + hor[i] * 0.25);
    this.u.uCloudDark.value.set(cd[0], cd[1], cd[2]);

    // --- ambient for surfaces ---
    // cloud cover adds diffuse skylight while removing direct sun
    const cloudFill = w.cover * (1 - w.overcast) * 0.25;
    const top = zen.map((c, i) => c * 0.85 + sun[i] * 0.012 * cloudFill * 6);
    const hrz = hor.map((c, i) => c * 0.62 + zen[i] * 0.2);
    G.uniforms.uSkyTop.value.set(top[0], top[1], top[2]);
    G.uniforms.uSkyHorizon.value.set(hrz[0], hrz[1], hrz[2]);
    // bounce from sunlit leaf litter (warm) plus sky reaching the floor
    const litter = [0.30, 0.19, 0.085];
    const sunOnFloor = light.map((c) => c * Math.max(this.lightDir.y, 0) * 0.055);
    const gc = litter.map((a, i) => a * (sunOnFloor[i] + (top[i] + hrz[i]) * 0.16));
    G.uniforms.uGroundCol.value.set(gc[0], gc[1], gc[2]);
    // light transmitted and scattered by the sunlit canopy
    const glow = light.map((c) => c * (0.020 + 0.034 * Math.max(this.lightDir.y, 0)));
    const skyGlow = top.map((c) => c * 0.07);
    G.uniforms.uCanopyGlow.value.set(glow[0] + skyGlow[0], glow[1] + skyGlow[1], glow[2] + skyGlow[2]);

    // --- wind / wetness ---
    const wu = G.uniforms.uWind.value;
    wu.z = w.wind; wu.w = w.gust;
    G.uniforms.uWet.value = w.wet;

    // --- fog ---
    const f = this.fog;
    f.density = w.fog;
    f.heightFalloff = 1 / w.fogH;
    f.mist = w.mist;
    f.sunScatter.set(light[0], light[1], light[2]);
    f.ambScatter.set((top[0] + hrz[0]) * 0.5, (top[1] + hrz[1]) * 0.5, (top[2] + hrz[2]) * 0.5);
    f.horizon.set(hor[0], hor[1], hor[2]);

    // suggested exposure (EV-style), refined by metering in the pipeline
    this.day = day; this.night = night;
  }

  setCamera(camera) {
    this.u.uInvViewProj.value.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).invert();
  }
}

const SKY_FS = /* glsl */ `
${COMMON.replace(/uniform vec4 uWind;/, '').replace(/uniform float uTime;/, '')}
uniform float uSkyTime;
uniform vec4 uWindS;
uniform vec3 uSkyZenith, uSkyHoriz, uSunDisc, uTrueSunDir, uMoonDir, uCloudLit, uCloudDark;
uniform vec4 uCloud;
uniform mat4 uInvViewProj;
varying vec2 vNdc;

float cfbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++){ s += a*vnoise(p); p = p*2.07 + vec2(11.3, 7.1); a *= 0.5; }
  return s;
}
void main(){
  vec4 wp = uInvViewProj*vec4(vNdc, 1.0, 1.0);
  vec3 dir = normalize(wp.xyz/wp.w - cameraPosition);
  float y = dir.y;
  float up = max(y, 0.0);
  // gradient: thick air at the horizon
  float t = 1.0 - exp(-up*3.2);
  vec3 col = mix(uSkyHoriz, uSkyZenith, t);
  float cs = dot(dir, uTrueSunDir);
  float night = uCloud.z;
  // Mie forward glow + sun disc
  float g = 0.80;
  float mie = (1.0 - g*g)/pow(1.0 + g*g - 2.0*g*cs, 1.5)*0.035;
  col += uSunDisc*mie*(0.35 + 0.9*uCloud.w)*(1.0 - 0.6*t);
  float disc = smoothstep(0.99992, 0.99997, cs);
  col += uSunDisc*disc*45.0*step(0.0, y);
  // moon and stars
  float cm = dot(dir, uMoonDir);
  col += vec3(0.8, 0.85, 1.0)*smoothstep(0.99985, 0.99992, cm)*2.5*night;
  vec2 sp = dir.xz/(abs(y) + 0.35)*190.0;
  float st = pow(hash12(floor(sp)), 60.0)*step(0.0, y);
  col += vec3(st)*0.9*night*(1.0 - uCloud.x);
  // clouds on a plane
  if (y > 0.005){
    vec2 cuv = dir.xz/(y + 0.12)*1.35 + uWindS.xy*uSkyTime*0.004;
    float n = cfbm(cuv*1.1);
    float n2 = cfbm(cuv*3.3 + 9.0);
    float cov = uCloud.x;
    float dens = smoothstep(1.0 - cov*1.05, 1.25 - cov*0.85, n*0.75 + n2*0.32 + 0.12);
    // fake self-shadowing: sample toward the sun
    vec2 sdir = normalize(uTrueSunDir.xz + 1e-4)*0.09;
    float nl = cfbm((cuv + sdir)*1.1);
    float shade = sat(0.55 + (n - nl)*3.5);
    vec3 cc = mix(uCloudDark, uCloudLit, shade);
    cc += uSunDisc*0.05*pow(sat(cs), 6.0)*(1.0 - dens*0.6);
    float fade = smoothstep(0.005, 0.16, y);
    vec3 oc = mix(uSkyHoriz, uSkyZenith, t)*(0.86 + 0.28*n);
    cc = mix(cc, oc, uCloud.y);
    col = mix(col, cc, dens*fade*mix(0.94, 1.0, uCloud.y));
  }
  // below the horizon: distant haze
  col = mix(col, uSkyHoriz*0.55, smoothstep(0.0, -0.18, y));
  // range upon range of far ridges, each paler and bluer than the one in front
  float az = atan(dir.z, dir.x);
  for (int i = 4; i >= 0; i--){
    float fi = float(i);
    float hgt = 0.012 + 0.016*fi + (0.030 - 0.004*fi)*(cfbm(vec2(az*(2.2 + fi*0.9) + fi*13.7, fi*3.1)) - 0.35)
              + 0.006*vnoise(vec2(az*(19.0 + fi*7.0), fi));
    if (y < hgt){
      float far = fi/4.0;
      vec3 forest = mix(vec3(0.34, 0.20, 0.05), vec3(0.20, 0.13, 0.06), far)*(uSunDisc*0.035 + uSkyZenith*0.22 + uSkyHoriz*0.10);
      vec3 hazeC = mix(uSkyHoriz, uSkyZenith, 0.35)*vec3(0.80, 0.90, 1.06);
      col = mix(forest, hazeC, 0.50 + 0.42*far + 0.25*uCloud.w*(1.0 - far));
      // mist pooling in the valleys between ranges
      col = mix(col, hazeC*1.05, smoothstep(hgt, hgt - 0.02, y)*0.35);
    }
  }
  gl_FragColor = vec4(col, 1.0);
}
`;
