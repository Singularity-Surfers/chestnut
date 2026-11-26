// Chestnut Cove — bootstrap.
import * as THREE from 'three';
import { G, QUALITY, WORLD, FSPass } from './core/engine.js';
import { Sky } from './render/sky.js';
import { Shadows } from './render/shadows.js';
import { Pipeline } from './render/pipeline.js';
import { buildTerrain } from './world/terrain.js';
import { buildGround } from './world/ground.js';
import { Controls } from './ui/controls.js';
import { Flora } from './flora/atlas.js';
import { BarkLibrary } from './flora/bark.js';
import { Vegetation } from './flora/forest.js';
import { populate } from './world/ecology.js';
import { buildWater } from './world/water.js';
import { buildRocks } from './world/rocks.js';
import { GroundFlora, buildFloatingLeaves } from './flora/groundflora.js';
import { buildDeadwood } from './world/deadwood.js';
import { buildBackdrop } from './world/backdrop.js';
import { buildWeatherFX } from './world/weatherfx.js';
import { findViews, speciesView, groundView } from './ui/views.js';
import { Panel } from './ui/panel.js';
import { identify } from './ui/identify.js';
import { Ambience } from './ui/sound.js';

const params = new URLSearchParams(location.search);
const status = (t) => { const el = document.getElementById('status'); if (el) el.textContent = t; };
const tick = () => new Promise((r) => setTimeout(r, 0));

async function boot() {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const qn = params.get('q') || (mobile ? 'low' : 'high');
  G.quality = QUALITY[qn] || QUALITY.high;
  G.qualityName = QUALITY[qn] ? qn : 'high';
  G.seed = parseInt(params.get('seed') || '1850', 10);

  const canvas = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: false });
  renderer.setPixelRatio(1);
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  G.renderer = renderer;
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  G.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
  console.log('GPU:', G.gpu);

  const scene = new THREE.Scene();
  G.scene = scene;
  const camera = new THREE.PerspectiveCamera(parseFloat(params.get('fov') || '58'), 16 / 9, 0.12, 9000);
  G.camera = camera;

  const T0 = performance.now();
  status('Shaping the cove…'); await tick();
  const terrain = buildTerrain(G.seed);
  G.terrain = terrain;
  scene.add(terrain.group);

  status('Painting leaves and bark…'); await tick();
  const flora = new Flora(renderer, G.seed, G.qualityName === 'low' ? 512 : 1024);
  const barkLib = new BarkLibrary(renderer, G.quality.bark);
  const veg = new Vegetation(flora, barkLib);
  G.flora = flora; G.veg = veg;
  const eco = await populate(terrain, veg, G.seed, (t) => status(t));
  G.eco = eco;
  veg.finalize();
  scene.add(veg.group);
  terrain.finalize();
  status('Laying down the leaf litter…'); await tick();
  G.ground = buildGround(terrain, flora, eco);
  // dev: window.__litterPNG('E') returns a litter texture as a PNG data URL (tools/dumplitter.mjs)
  window.__litterPNG = (k, size = 1024) => {
    const tex = G.ground.litters[k].albedo;
    const rt = new THREE.WebGLRenderTarget(size, size);
    const pass = new FSPass('uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(pow(texture2D(t, vUv).rgb, vec3(1.0/2.2)), 1.0); }', { t: { value: tex } });
    pass.render(G.renderer, rt);
    const px = new Uint8Array(size * size * 4);
    G.renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const id = cv.getContext('2d').createImageData(size, size);
    for (let y = 0; y < size; y++) id.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    cv.getContext('2d').putImageData(id, 0, 0);
    rt.dispose(); pass.material.dispose();
    return cv.toDataURL('image/png');
  };
  status('Filling the stream…'); await tick();
  const water = buildWater(terrain);
  G.water = water;
  scene.add(water.group);
  const rocks = buildRocks(terrain, eco, G.seed);
  G.rocks = rocks;
  scene.add(rocks.group);
  const dead = buildDeadwood(terrain, eco, veg, G.seed);
  G.deadwood = dead;
  scene.add(dead.group);
  status('Unfurling ferns and wildflowers…'); await tick();
  const gf = new GroundFlora(flora, terrain, eco, rocks, G.seed);
  G.groundFlora = gf;
  scene.add(gf.group);
  const floating = buildFloatingLeaves(flora, terrain, G.seed);
  scene.add(floating.group);
  const backdrop = buildBackdrop(terrain, G.seed);
  scene.add(backdrop.mesh);
  backdrop.mesh.layers.enable(3);

  const sky = new Sky();
  G.sky = sky;
  scene.add(sky.mesh);
  sky.mesh.layers.enable(3);
  sky.fog.baseHeight = terrain.junction.w + 2;
  const fx = buildWeatherFX(flora, G.seed);
  scene.add(fx.group);

  const shadows = new Shadows();
  shadows.worldMaxY = terrain.hMax + 55;
  G.shadows = shadows;
  const pipeline = new Pipeline(renderer, sky, shadows);
  G.pipeline = pipeline;

  const controls = new Controls(camera, canvas, { heightAt: terrain.heightAt, limit: WORLD / 2 - 32 });
  G.controls = controls;
  controls.colliders = veg.collide;
  const views = findViews(terrain, eco, water);

  let adaptFrames = 50;
  let panel = null;
  const ambience = new Ambience(terrain, sky);
  const app = {
    sky, pipeline, controls, camera, views, qualityName: G.qualityName, names: params.get('names') !== '0', lapse: false, soundOn: false,
    setHour(h) { sky.setHour(h); },
    setWeather(w) { sky.setWeather(w, false); },
    setFov(f) { camera.fov = f; camera.updateProjectionMatrix(); },
    goView(k) {
      const v = views[k];
      if (!v) return;
      controls.fly = !!v.fly;
      controls.eye = v.fly ? 1.68 : Math.max(0.3, v.pos[1] - terrain.heightAt(v.pos[0], v.pos[2]));
      controls.set(v.pos[0], v.pos[1], v.pos[2], v.yaw, v.pitch);
      if (v.hour !== undefined && !params.has('hour')) sky.setHour(v.hour);
      if (!params.has('fov')) this.setFov(v.fov || 58);
      pipeline.taaReset = true; pipeline.fastAdapt = true; adaptFrames = 40;
      panel?.sync();
    },
    toggleSound() { this.soundOn = ambience.toggle(); return this.soundOn; },
  };
  if (params.has('hour')) sky.setHour(parseFloat(params.get('hour')));
  if (params.has('weather')) sky.setWeather(params.get('weather'), true);
  if (params.has('ev')) pipeline.evBias = parseFloat(params.get('ev'));
  if (params.get('taa') === '0') pipeline.taa = false;
  if (params.get('refl') === '0') pipeline.reflect = false;
  if (params.has('debug')) { G.uniforms.uDebug.value = parseFloat(params.get('debug')); if (G.uniforms.uDebug.value < 5.5) { pipeline.autoExposure = false; pipeline.exposure = 1; } }
  if (params.has('sp')) { const v = speciesView(terrain, eco, params.get('sp'), params.get('cls'), params.get('spsolo') === '1'); if (v) views.__sp = v; }
  if (params.get('spsolo') === '1') veg.soloKey = params.get('sp');
  if (params.has('solo')) gf.solo(params.get('solo'));
  if (params.has('gf')) { const v = groundView(terrain, eco, gf, params.get('gf')); if (v) views.__sp = v; }
  app.goView(views.__sp ? '__sp' : params.get('view') && views[params.get('view')] ? params.get('view') : 'october');
  delete views.__sp;
  if (params.has('cam')) {
    const c = params.get('cam').split(',').map(Number);
    const y = c[1] < -500 ? terrain.heightAt(c[0], c[2]) + 1.68 : c[1];
    controls.fly = params.get('fly') === '1';
    controls.eye = 1.68;
    controls.set(c[0], y, c[2], c[3] || 0, c[4] || 0);
  }
  // walking resets the eye to standing height
  window.addEventListener('keydown', (e) => { if (/Key[WASD]|Arrow/.test(e.code) && !controls.fly) controls.eye = 1.68; });
  if (params.get('hud') !== '0') {
    panel = new Panel(app);
    const intro = document.getElementById('intro');
    if (intro && !params.has('view') && !params.has('cam')) {
      intro.style.display = 'flex';
      const close = () => { intro.remove(); };
      document.getElementById('enter').onclick = () => { close(); canvas.requestPointerLock?.(); };
      canvas.addEventListener('pointerdown', close, { once: true });
      window.addEventListener('keydown', close, { once: true });
    }
  } else document.getElementById('fps').style.display = 'none';
  G.app = app;

  // ?res=0.5..1 starts at a lower internal resolution (it is still raised or lowered automatically while the HUD is on)
  let dynScale = Math.min(1, Math.max(0.5, parseFloat(params.get('res')) || 1)), slow = 0, fast = 0, pendingResize = null, lastDown = -1e9, lastUp = -1e9, upLockUntil = 0;
  const winDt = [];
  const dynamicRes = params.get('hud') !== '0' && params.get('dyn') !== '0';
  const diag = params.has('diag');
  const dlog = (...a) => { if (diag) console.log('[diag] ' + (performance.now() / 1000).toFixed(2) + 's ' + a.join(' ')); };
  function resize(why = 'window') {
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    // The canvas keeps the display size; dynamic resolution only changes the internal render targets, which the
    // final pass scales up. Resizing the canvas itself wipes its drawing buffer, and if that happens after the
    // frame was drawn the browser shows an empty (black) frame.
    const w = Math.max(64, Math.floor(window.innerWidth * dpr * G.quality.scale));
    const h = Math.max(64, Math.floor(window.innerHeight * dpr * G.quality.scale));
    const iw = Math.max(64, Math.round(w * dynScale)), ih = Math.max(64, Math.round(h * dynScale));
    if (diag) dlog('resize', why, `canvas ${w}x${h}`, `internal ${pipeline.w || 0}x${pipeline.h || 0} -> ${iw}x${ih}`, 'fps', (G.fps || 0).toFixed(1), 'scale', dynScale.toFixed(2));
    if (renderer.domElement.width !== w || renderer.domElement.height !== h) renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pipeline.resize(iw, ih);
  }
  // apply at the start of the next frame, never between drawing a frame and the browser showing it
  window.addEventListener('resize', () => { pendingResize = 'window'; });
  resize();
  console.log('[info] world built in ' + ((performance.now() - T0) / 1000).toFixed(1) + ' s');

  document.getElementById('loading')?.remove();
  let last = performance.now();
  let warm = 0;
  pipeline.fastAdapt = true;
  const fpsEl = document.getElementById('fps');
  let fAcc = 0, fN = 0, idAcc = 0;
  const still = params.get('still') === '1';
  if (still) pipeline.look.grain = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (pendingResize) { resize(pendingResize); pendingResize = null; }
    const rawDt = (now - last) / 1000;
    const dt = Math.min(0.1, rawDt);
    last = now;
    // ?still=1 freezes animated time (wind, water, falling leaves) and film grain, so what is left
    // moving in a still view is render noise (tools/noise.mjs measures it)
    if (!still) G.time += dt;
    G.frame++;
    G.uniforms.uTime.value = G.time;
    G.uniforms.uFrameN.value = G.frame % 64;
    if (diag && params.has('walk')) {
      // autopilot for diagnostics: run forward, sweeping the view, turning away from walls
      controls.keys.add('KeyW'); controls.keys.add('ShiftLeft');
      controls.yaw += dt * 0.35 * Math.sin(G.time * 0.21);
      if (Math.abs(controls.pos.x) > WORLD / 2 - 45 || Math.abs(controls.pos.z) > WORLD / 2 - 45) controls.yaw = Math.atan2(controls.pos.x, controls.pos.z) + 0.4 * Math.sin(G.time);
    }
    if (diag && params.has('slow')) {
      // emulate a slower machine: stall the main thread for part of the run (diagnostics only)
      const ms = parseFloat(params.get('slow')), on = (G.time % 20) < 10;
      if (on) { const e = performance.now() + ms; while (performance.now() < e); }
    }
    controls.update(dt);
    if (app.lapse) { sky.setHour(sky.hour + dt * 0.12 > 19.6 ? 5.6 : sky.hour + dt * 0.12); panel?.syncHour(sky.hour); }
    sky.update(dt);
    // moonlight is too dim for colour vision: the night scene goes toward grey-blue
    pipeline.look.saturation = 0.9 * (1 - 0.55 * (sky.night || 0));
    fx.update(sky);
    veg.update(camera);
    gf.update(camera);
    ambience.update(dt, camera);
    shadows.update(camera, G.time);
    water.setReflection(pipeline);
    renderer.info.reset();
    pipeline.render(scene, camera, dt);
    warm++;
    if (diag) {
      const ms = rawDt * 1000;
      if (ms > 80 && warm > 70) dlog('long-frame', ms.toFixed(0) + 'ms', 'near', veg.stats.near, 'nearLive', veg.nearLive.length, 'programs', renderer.info.programs.length);
      if (warm % 300 === 0) {
        const m = renderer.info.memory, hp = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + 'MB' : '?';
        dlog('summary', 'fps', (G.fps || 0).toFixed(1), 'canvas', `${renderer.domElement.width}x${renderer.domElement.height}`, 'geoms', m.geometries, 'textures', m.textures, 'programs', renderer.info.programs.length, 'heap', hp, 'tris', (renderer.info.render.triangles / 1e6).toFixed(1) + 'M', 'nearLive', veg.nearLive.length, 'built', veg.nearBuilt || 0, 'evicted', veg.nearEvicted || 0, 'exp', pipeline.exposure.toFixed(3), 'cam', controls.pos.x.toFixed(0) + ',' + controls.pos.z.toFixed(0));
      }
    }
    if (--adaptFrames === 0) pipeline.fastAdapt = false;
    if (warm === 70) window.__READY = true;
    fAcc += rawDt; fN++; idAcc += dt;
    winDt.push(rawDt);
    if (fAcc > 0.5) {
      G.fps = fN / fAcc; fAcc = 0; fN = 0;
      // the median frame ignores one-off hitches (garbage collection, building a model): only a steadily slow GPU counts
      winDt.sort((a, b) => a - b);
      const fpsMed = 1 / Math.max(1e-4, winDt[winDt.length >> 1]);
      winDt.length = 0;
      // keep the walk smooth on slower GPUs by trading resolution
      if (dynamicRes && warm > 120) {
        slow = fpsMed < 27 ? slow + 1 : 0; fast = fpsMed > 55 ? fast + 1 : 0;
        if (slow >= 3 && dynScale > 0.5) {
          dynScale = Math.max(0.5, dynScale * 0.84); slow = 0; fast = 0; pendingResize = 'dyn-down';
          // stepped up and straight back down: that resolution is too much, so stop trying for a good while
          if (G.time - lastUp < 25) upLockUntil = G.time + 120;
          lastDown = G.time;
        } else if (fast >= 10 && dynScale < 1 && G.time > upLockUntil && G.time - lastDown > 10) {
          dynScale = Math.min(1, dynScale / 0.9); fast = 0; pendingResize = 'dyn-up'; lastUp = G.time;
        }
      }
      if (fpsEl) fpsEl.textContent = `${G.fps.toFixed(0)} fps · ${(renderer.info.render.triangles / 1e6).toFixed(1)}M tris · ${renderer.info.render.calls} calls`;
    }
    if (panel && idAcc > 0.2) {
      idAcc = 0;
      if (app.names) { const id = identify(camera, terrain, eco, gf); panel.setIdent(id?.name || '', id?.sci || '', id?.note || ''); }
      else panel.setIdent('', '', '');
    }
  }
  requestAnimationFrame(frame);
  window.__INFO = () => ({ fps: Math.round(G.fps || 0), tris: +(renderer.info.render.triangles / 1e6).toFixed(2), calls: renderer.info.render.calls, lod: veg.stats, gf: gf.count, cam: [controls.pos.x, controls.pos.y, controls.pos.z, controls.yaw, controls.pitch].map((v) => +v.toFixed(2)), exp: +pipeline.exposure.toFixed(3) });
}

boot().catch((e) => {
  console.error(e);
  status('Error: ' + e.message);
  window.__ERROR = String(e && e.stack || e);
});
