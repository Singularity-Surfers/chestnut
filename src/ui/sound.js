// Procedural ambience: wind in the canopy, the stream, rain. Off until the visitor asks for it.
export class Ambience {
  constructor(terrain, sky) { this.terrain = terrain; this.sky = sky; this.on = false; this.ctx = null; }
  _init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = this.ctx = new AC();
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; }
    const mk = (type, freq, q) => {
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.playbackRate.value = 0.8 + Math.random() * 0.4;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.master); src.start();
      return { f, g };
    };
    this.master = ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(ctx.destination);
    this.wind = mk('bandpass', 420, 0.5);
    this.leaves = mk('highpass', 2600, 0.3);
    this.stream = mk('bandpass', 1500, 0.9);
    this.streamLow = mk('lowpass', 380, 0.5);
    this.rain = mk('highpass', 4200, 0.2);
    this.t = 0;
    return true;
  }
  toggle() {
    if (!this.ctx && !this._init()) return false;
    this.on = !this.on;
    if (this.on) this.ctx.resume(); else this.ctx.suspend();
    return this.on;
  }
  update(dt, camera) {
    if (!this.on || !this.ctx) return;
    this.t += dt;
    const w = this.sky.w;
    const gust = 0.55 + 0.45 * Math.sin(this.t * 0.23) * Math.sin(this.t * 0.071 + 1.3);
    const now = this.ctx.currentTime;
    const set = (n, v) => n.g.gain.setTargetAtTime(v, now, 0.4);
    set(this.wind, (0.05 + 0.55 * w.wind) * gust);
    set(this.leaves, (0.01 + 0.16 * w.wind) * gust * gust);
    this.wind.f.frequency.setTargetAtTime(300 + 500 * w.wind * gust, now, 0.5);
    const sd = this.terrain.fields.streamDist.at(camera.position.x, camera.position.z);
    const near = 1 / (1 + Math.pow(sd / 7, 2));
    set(this.stream, 0.5 * near);
    set(this.streamLow, 0.35 * near);
    set(this.rain, 0.6 * w.rain);
  }
}
