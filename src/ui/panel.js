// On-screen controls: time of day, weather, viewpoints, quality, and a small field-guide readout.
import { WEATHER } from '../render/sky.js';

const CSS = `
#ui, #ui * { box-sizing: border-box; }
#ui { position: fixed; inset: 0; pointer-events: none; z-index: 6; font-family: Georgia, 'Times New Roman', serif; color: #efe8d6; }
#ui .card { pointer-events: auto; position: absolute; right: 12px; top: 12px; width: 286px; max-height: calc(100vh - 24px); overflow: auto;
  background: rgba(18, 15, 10, 0.72); backdrop-filter: blur(8px); border: 1px solid rgba(230, 200, 130, 0.22); border-radius: 10px; padding: 12px 14px; font-size: 13px; }
#ui .card.closed { display: none; }
#ui h2 { font-weight: normal; font-size: 16px; margin: 0 0 2px; letter-spacing: 0.03em; }
#ui .sub { opacity: 0.65; font-style: italic; margin-bottom: 8px; font-size: 12px; }
#ui label { display: block; margin: 9px 0 3px; opacity: 0.8; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
#ui input[type=range] { width: 100%; accent-color: #d9a441; }
#ui .row { display: flex; flex-wrap: wrap; gap: 5px; }
#ui button { pointer-events: auto; font: inherit; font-size: 12px; color: #efe8d6; background: rgba(255, 240, 200, 0.08); border: 1px solid rgba(230, 200, 130, 0.25);
  border-radius: 6px; padding: 4px 8px; cursor: pointer; }
#ui button:hover { background: rgba(255, 220, 140, 0.2); }
#ui button.on { background: rgba(217, 164, 65, 0.42); border-color: rgba(240, 200, 120, 0.7); }
#ui .toggle { position: absolute; right: 12px; top: 12px; font-size: 18px; padding: 3px 10px; background: rgba(18, 15, 10, 0.72); backdrop-filter: blur(8px); }
#ui .toggle:hover { background: rgba(60, 46, 22, 0.85); }
#ui .min { position: absolute; right: 8px; top: 8px; width: 26px; height: 24px; padding: 0; font-size: 16px; line-height: 1; }
#ui .ident { position: absolute; left: 50%; bottom: 34px; transform: translateX(-50%); text-align: center; text-shadow: 0 1px 6px #000, 0 0 2px #000; font-size: 16px; transition: opacity 0.4s; white-space: nowrap; }
#ui .ident i { display: block; font-size: 13px; opacity: 0.85; }
#ui .cross { position: absolute; left: 50%; top: 50%; width: 5px; height: 5px; margin: -2.5px; border-radius: 50%; background: rgba(255,255,255,0.45); }
#ui .help { opacity: 0.72; font-size: 12px; line-height: 1.5; margin-top: 10px; border-top: 1px solid rgba(230,200,130,0.2); padding-top: 8px; }
#ui .val { float: right; opacity: 0.9; text-transform: none; letter-spacing: 0; }
#ui select { width: 100%; background: rgba(0,0,0,0.4); color: #efe8d6; border: 1px solid rgba(230,200,130,0.3); border-radius: 6px; padding: 3px; font: inherit; font-size: 12px; }
`;

const fmtHour = (h) => {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  const ap = hh >= 12 ? 'pm' : 'am';
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
};

export class Panel {
  constructor(app) {
    this.app = app;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const root = document.createElement('div'); root.id = 'ui';
    root.innerHTML = `
      <div class="cross"></div>
      <div class="ident" id="ident"></div>
      <button class="toggle" id="uiToggle" title="Settings (Tab)">☰</button>
      <div class="card closed" id="card">
        <button class="min" id="uiMin" title="Minimize (Tab)" aria-label="Minimize settings">–</button>
        <h2 style="padding-right:30px">Chestnut Cove</h2>
        <div class="sub">Southern Appalachians · mid-October · c. 1850</div>
        <label>Time of day <span class="val" id="hourVal"></span></label>
        <input type="range" id="hour" min="5.5" max="19.5" step="0.05">
        <div class="row" style="margin-top:5px"><button id="lapse">▶ Let the day pass</button></div>
        <label>Weather</label><div class="row" id="weather"></div>
        <label>Places</label><div class="row" id="views"></div>
        <label>Exposure <span class="val" id="evVal"></span></label>
        <input type="range" id="ev" min="-2" max="2" step="0.1" value="0">
        <label>Field of view <span class="val" id="fovVal"></span></label>
        <input type="range" id="fov" min="25" max="95" step="1">
        <label>Detail</label>
        <select id="quality"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="ultra">Ultra</option></select>
        <div class="row" style="margin-top:9px"><button id="fly">Fly (F)</button><button id="names" class="on">Names (N)</button><button id="sound">Sound (M)</button><button id="shot">Hide UI (H)</button></div>
        <div class="help">Click the scene to look around · <b>W A S D</b> walk · <b>Shift</b> run · <b>F</b> fly (E/Q up/down) · <b>1–9</b> places · <b>T</b> time-lapse · <b>Tab</b> this panel<br>Touch: drag left side to walk, right side to look.</div>
      </div>`;
    document.body.appendChild(root);
    this.root = root;
    const $ = (id) => root.querySelector('#' + id);
    this.card = $('card'); this.ident = $('ident');
    $('uiToggle').onclick = () => this.card.classList.toggle('closed');
    $('uiMin').onclick = () => this.card.classList.add('closed');
    const hour = $('hour'), hourVal = $('hourVal');
    hour.oninput = () => { app.setHour(parseFloat(hour.value)); };
    this.syncHour = (h) => { hour.value = h; hourVal.textContent = fmtHour(h); };
    const lapse = $('lapse');
    lapse.onclick = () => { app.lapse = !app.lapse; this.sync(); };
    const wrow = $('weather');
    this.wbtn = {};
    for (const [k, w] of Object.entries(WEATHER)) {
      const b = document.createElement('button'); b.textContent = w.label; b.onclick = () => { app.setWeather(k); this.sync(); };
      wrow.appendChild(b); this.wbtn[k] = b;
    }
    const vrow = $('views');
    Object.entries(app.views).forEach(([k, v], i) => {
      const b = document.createElement('button'); b.textContent = `${i + 1} · ${v.label}`; b.onclick = () => app.goView(k);
      vrow.appendChild(b);
    });
    const ev = $('ev'), evVal = $('evVal');
    ev.oninput = () => { app.pipeline.evBias = parseFloat(ev.value); evVal.textContent = (ev.value > 0 ? '+' : '') + parseFloat(ev.value).toFixed(1) + ' EV'; };
    evVal.textContent = '0.0 EV';
    const fov = $('fov'), fovVal = $('fovVal');
    fov.oninput = () => { app.setFov(parseFloat(fov.value)); fovVal.textContent = fov.value + '°'; };
    this.syncFov = (f) => { fov.value = f; fovVal.textContent = Math.round(f) + '°'; };
    const q = $('quality'); q.value = app.qualityName;
    q.onchange = () => { const u = new URL(location.href); u.searchParams.set('q', q.value); location.href = u.toString(); };
    this.flyBtn = $('fly'); this.flyBtn.onclick = () => { app.controls.fly = !app.controls.fly; this.sync(); };
    this.namesBtn = $('names'); this.namesBtn.onclick = () => { app.names = !app.names; this.sync(); };
    this.soundBtn = $('sound'); this.soundBtn.onclick = () => { app.toggleSound(); this.sync(); };
    $('shot').onclick = () => this.setHidden(true);
    this.lapseBtn = lapse;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') { e.preventDefault(); this.card.classList.toggle('closed'); if (!this.card.classList.contains('closed')) document.exitPointerLock?.(); }
      else if (e.code === 'KeyH') this.setHidden(!this.hidden);
      else if (e.code === 'KeyN') { app.names = !app.names; this.sync(); }
      else if (e.code === 'KeyT') { app.lapse = !app.lapse; this.sync(); }
      else if (e.code === 'KeyM') { app.toggleSound(); this.sync(); }
      else if (/^Digit[1-9]$/.test(e.code)) { const k = Object.keys(app.views)[parseInt(e.code.slice(5), 10) - 1]; if (k) app.goView(k); }
    });
    this.sync();
  }
  setHidden(h) { this.hidden = h; this.root.style.display = h ? 'none' : ''; const f = document.getElementById('fps'); if (f) f.style.display = h ? 'none' : ''; }
  sync() {
    const a = this.app;
    for (const [k, b] of Object.entries(this.wbtn)) b.classList.toggle('on', a.sky.weatherName === k);
    this.flyBtn.classList.toggle('on', a.controls.fly);
    this.namesBtn.classList.toggle('on', a.names);
    this.soundBtn.classList.toggle('on', !!a.soundOn);
    this.lapseBtn.classList.toggle('on', a.lapse);
    this.lapseBtn.textContent = a.lapse ? '❚❚ Pause the day' : '▶ Let the day pass';
    this.syncHour(a.sky.hour);
    this.syncFov(a.camera.fov);
  }
  setIdent(common, sci, note) {
    const key = common + sci + (note || '');
    if (key === this._ik) return;
    this._ik = key;
    this.ident.innerHTML = common ? `${common}${note ? ' · ' + note : ''}<i>${sci || ''}</i>` : '';
  }
}
