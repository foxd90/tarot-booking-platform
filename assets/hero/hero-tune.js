/* hero-tune.js — tuning panel for the homepage hero. Loaded by hero.js only when the URL
 * has ?tune. Sliders change window.HERO_CONFIG live; "Copy settings" copies the result so
 * it can be pasted into hero-config.js. Paint mode repaints the wind map (white = sways):
 * strokes are kept in this browser until you press "Save wind map" and replace
 * assets/hero/wind-map.png with the downloaded file.
 */
(function () {
  const S = window.heroScene;
  if (!S) return;
  const C = S.config;
  const hero = document.getElementById('hero');

  // [config group, key, label, min, max, step, what to refresh]
  const SLIDERS = [
    ['Look'],
    ['look', 'tint', 'Warm tint', 0, 1, 0.05, 'look'],
    ['look', 'grain', 'Grain', 0, 0.3, 0.01, 'look'],
    ['Phone fades'],
    ['mobileFade', 'start', 'Bottom fade starts (%)', 25, 65, 1, 'look'],
    ['mobileFade', 'topStart', 'Video at very top', 0, 1, 0.05, 'look'],
    ['mobileFade', 'topLength', 'Top fade length (%)', 5, 40, 1, 'look'],
    ['Scene positions'],
    ['scene.fire', 'x', 'Fire across (0–1)', 0, 1, 0.005, 'layout'],
    ['scene.fire', 'y', 'Fire down (0–1)', 0, 1, 0.005, 'layout'],
    ['Fireflies'],
    ['fireflies', 'count', 'Count', 0, 60, 1, 'flies'],
    ['fireflies', 'size', 'Size', 0.4, 2.5, 0.05],
    ['fireflies', 'speed', 'Speed', 0.2, 3, 0.05],
    ['fireflies', 'glow', 'Glow', 0.2, 2, 0.05],
    ['fireflies', 'blink', 'Blink speed', 0.2, 3, 0.05],
    ['fireflies', 'warmth', 'Warmth', 0, 1, 0.05, 'colour'],
    ['fireflies', 'pull', 'Drawn to cursor (desktop)', 0, 3, 0.05],
    ['Wind (leaf ripple)'],
    ['wind', 'strength', 'Strength', 0, 30, 0.25],
    ['wind', 'speed', 'Speed', 0, 3, 0.05],
    ['wind', 'rippleSize', 'Ripple size', 1, 14, 0.25],
    ['wind', 'gustiness', 'Gustiness', 0, 1, 0.05],
    ['Lantern (desktop)'],
    ['lantern', 'radius', 'Light size', 100, 700, 10],
    ['lantern', 'dim', 'Darken outside', 0, 0.8, 0.05],
    ['lantern', 'warmth', 'Warmth', 0, 1, 0.05],
    ['lantern', 'flicker', 'Flicker', 0, 1, 0.05],
    ['lantern', 'lag', 'Follow lag', 0, 1, 0.05],
    ['lantern', 'reveal', 'Light up left side', 0, 1, 0.05],
    ['Fire embers'],
    ['embers', 'reach', 'Reach (desktop)', 60, 400, 10],
    ['embers', 'sparks', 'Sparks when flaring', 0, 60, 1],
    ['embers', 'idle', 'Idle embers', 0, 5, 0.1],
    ['embers', 'warmth', 'Ember warmth', 0, 1, 0.05, 'colour'],
    ['embers', 'lift', 'Spark rise', 0.3, 2.5, 0.05],
  ];
  const REFRESH = { look: S.applyLook, layout: S.layout, flies: S.syncFlies, colour: S.recolour };
  const group = path => path.split('.').reduce((o, k) => o[k], C);

  const style = document.createElement('style');
  style.textContent = `
#hero-tune { position: fixed; right: 12px; bottom: 12px; z-index: 200; width: 240px;
  background: rgba(14,11,9,0.94); border: 1px solid var(--gold-dim); border-radius: 6px;
  font: 12px/1.4 var(--font-body); color: var(--cream); }
#hero-tune summary { padding: 10px 12px; cursor: pointer; letter-spacing: 0.1em; text-transform: uppercase; }
#hero-tune .rows { padding: 0 12px 12px; display: grid; gap: 10px; max-height: 65vh; overflow-y: auto; }
#hero-tune h3 { font: 500 11px var(--font-body); letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); margin-top: 8px; }
#hero-tune label { display: grid; gap: 4px; }
#hero-tune label.check { grid-template-columns: auto 1fr; align-items: center; gap: 8px; }
#hero-tune input[type=range] { width: 100%; accent-color: var(--gold); }
#hero-tune .btns { display: flex; flex-wrap: wrap; gap: 6px; }
#hero-tune button { font: inherit; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cream);
  background: rgba(201,169,108,0.12); border: 1px solid var(--gold-dim); border-radius: 3px; padding: 7px 8px; cursor: pointer; }
#hero-tune button[aria-pressed="true"] { background: var(--gold); color: var(--obsidian); }
#hero-tune .note { color: var(--sand); font-size: 11px; }
#hero-brush { position: fixed; left: 0; top: 0; z-index: 190; border: 1px solid var(--gold-light); border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(14,11,9,0.6); pointer-events: none; display: none; }
body.hero-painting #hero-brush { display: block; }`;
  document.head.appendChild(style);

  const panel = document.createElement('details');
  panel.id = 'hero-tune';
  panel.open = true;
  panel.innerHTML = '<summary>Tune hero</summary><div class="rows"></div>';
  const rows = panel.querySelector('.rows');
  const add = html => { rows.insertAdjacentHTML('beforeend', html); return rows.lastElementChild; };

  add('<div class="btns"><button type="button" data-act="copy">Copy settings</button></div>');
  add('<p class="note">Paste copied settings into assets/hero/hero-config.js (or send them to Claude).</p>');

  for (const [path, key, label, min, max, step, refresh] of SLIDERS) {
    if (!key) { add(`<h3>${path}</h3>`); continue; }
    const el = add(`<label>${label} <span></span><input type="range" min="${min}" max="${max}" step="${step}"></label>`);
    const input = el.querySelector('input'), out = el.querySelector('span');
    input.value = group(path)[key];
    out.textContent = input.value;
    input.addEventListener('input', () => {
      group(path)[key] = +input.value;
      out.textContent = input.value;
      if (refresh) REFRESH[refresh]();
    });
  }

  // ── wind map painting ──
  add('<h3>Wind map</h3>');
  add('<label class="check"><input type="checkbox" data-act="show"> Show marked areas (green)</label>');
  add('<label class="check"><input type="checkbox" data-act="paint"> Paint mode</label>');
  add('<div class="btns"><button type="button" data-mode="paint" aria-pressed="true">Mark (moves)</button><button type="button" data-mode="erase" aria-pressed="false">Erase</button></div>');
  const brush = { mode: 'paint', size: 4, soft: 0.5 };   // size: % of frame width
  for (const [key, label, min, max, step] of [['size', 'Brush size', 0.5, 20, 0.5], ['soft', 'Brush softness', 0, 1, 0.05]]) {
    const el = add(`<label>${label} <span>${brush[key]}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${brush[key]}"></label>`);
    el.querySelector('input').addEventListener('input', e => { brush[key] = +e.target.value; el.querySelector('span').textContent = e.target.value; });
  }
  add('<div class="btns"><button type="button" data-act="undo">Undo</button><button type="button" data-act="clear">Clear all</button><button type="button" data-act="save">Save wind map</button><button type="button" data-act="revert">Back to site map</button></div>');
  add('<p class="note">Your strokes stay in this browser. "Save wind map" downloads wind-map.png; replace assets/hero/wind-map.png with it to publish.</p>');
  document.body.appendChild(panel);

  const ring = document.createElement('div');
  ring.id = 'hero-brush';
  document.body.appendChild(ring);

  const M = S.windMap, wm = M.ctx;
  const undo = [];
  const KEY = 'hero-wind-map';
  const saveLocal = () => { try { localStorage.setItem(KEY, M.canvas.toDataURL('image/png')); } catch {} };

  function dab(x, y) {
    const rad = brush.size / 100 * M.width / 2;
    const col = brush.mode === 'paint' ? '255,255,255' : '0,0,0';
    const g = wm.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${col},1)`);
    g.addColorStop(Math.max(0.01, 1 - brush.soft), `rgba(${col},1)`);
    g.addColorStop(1, `rgba(${col},0)`);
    wm.fillStyle = g;
    wm.beginPath();
    wm.arc(x, y, rad, 0, Math.PI * 2);
    wm.fill();
  }
  const toMap = e => { const [u, v] = S.eventToScene(e); return [u * M.width, v * M.height]; };

  let lastPt = null;
  hero.addEventListener('pointerdown', e => {
    if (!S.state.painting) return;
    e.preventDefault();
    try { hero.setPointerCapture(e.pointerId); } catch {}
    undo.push(wm.getImageData(0, 0, M.width, M.height));
    if (undo.length > 15) undo.shift();
    lastPt = toMap(e);
    dab(...lastPt);
    M.markDirty();
  });
  hero.addEventListener('pointermove', e => {
    if (!S.state.painting) return;
    const d = brush.size / 100 * S.sceneScale();
    ring.style.width = ring.style.height = d + 'px';
    ring.style.transform = `translate(${e.clientX - d / 2}px, ${e.clientY - d / 2}px)`;
    if (!lastPt) return;
    const p = toMap(e);
    const step = Math.max(1, brush.size / 100 * M.width * 0.15);
    const dist = Math.hypot(p[0] - lastPt[0], p[1] - lastPt[1]);
    for (let i = 1; i <= Math.ceil(dist / step); i++) {
      const k = Math.min(1, i * step / dist);
      dab(lastPt[0] + (p[0] - lastPt[0]) * k, lastPt[1] + (p[1] - lastPt[1]) * k);
    }
    lastPt = p;
    M.markDirty();
  });
  const endStroke = () => { if (lastPt) { lastPt = null; saveLocal(); } };
  hero.addEventListener('pointerup', endStroke);
  hero.addEventListener('pointercancel', endStroke);

  panel.addEventListener('change', e => {
    const act = e.target.dataset.act;
    if (act === 'show') S.state.showMap = e.target.checked;
    if (act === 'paint') {
      S.state.painting = e.target.checked;
      hero.classList.toggle('painting', S.state.painting);
      document.body.classList.toggle('hero-painting', S.state.painting);
      if (S.state.painting) scrollTo({ top: 0 });
    }
  });
  panel.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.mode) {
      brush.mode = btn.dataset.mode;
      panel.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b === btn));
      return;
    }
    const act = btn.dataset.act;
    if (act === 'undo' && undo.length) { wm.putImageData(undo.pop(), 0, 0); M.markDirty(); saveLocal(); }
    if (act === 'clear') {
      undo.push(wm.getImageData(0, 0, M.width, M.height));
      wm.fillStyle = '#000';
      wm.fillRect(0, 0, M.width, M.height);
      M.markDirty();
      saveLocal();
    }
    if (act === 'save') {
      const a = document.createElement('a');
      a.download = 'wind-map.png';
      a.href = M.canvas.toDataURL('image/png');
      a.click();
    }
    if (act === 'revert') {
      try { localStorage.removeItem(KEY); } catch {}
      location.reload();
    }
    if (act === 'copy') {
      const text = 'window.HERO_CONFIG = ' + JSON.stringify(C, null, 2) + ';\n';
      const done = () => { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy settings'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt('Copy these settings:', text));
      else prompt('Copy these settings:', text);
    }
  });
})();
