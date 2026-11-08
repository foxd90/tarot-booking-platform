/* hero.js — homepage hero scene.
 *
 * The <video> is drawn through WebGL so leaves marked white in wind-map.png sway in the
 * wind. On top: fireflies, embers rising from the fire, and (desktop) a lantern that
 * follows the cursor. All tuned values live in hero-config.js. Add ?tune to the URL to
 * load hero-tune.js: sliders for every value and a brush to repaint the wind map.
 *
 * Runs through window.heroRaf (site.js): parks while the hero is off screen and draws a
 * single still frame under prefers-reduced-motion.
 */
(function () {
  const C = window.HERO_CONFIG;
  const hero = document.getElementById('hero');
  if (!C || !hero) return;

  const video = hero.querySelector('.hero-media video');
  const glCanvas = hero.querySelector('.hero-media canvas');
  const sparkCanvas = hero.querySelector('.hero-sparks');
  const lanternEl = hero.querySelector('.hero-lantern');
  const isDesktop = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const REF_W = 2016;   // wind strength is measured in pixels of a frame this wide

  const state = { painting: false, showMap: false };

  // ── look: tuned CSS values ──
  function applyLook() {
    const s = hero.style;
    s.setProperty('--tint', C.look.tint);
    s.setProperty('--grain', C.look.grain);
    s.setProperty('--fade-start', C.mobileFade.start + '%');
    s.setProperty('--top-start', C.mobileFade.topStart);
    s.setProperty('--top-len', C.mobileFade.topLength + '%');
    centreFire();
  }

  // ── framing: on phones, crop the video so the fire sits in the middle of the screen ──
  function videoSize() {
    return [video.videoWidth || REF_W, video.videoHeight || 1024];
  }
  function centreFire() {
    const box = video.getBoundingClientRect();
    const [vw, vh] = videoSize();
    const scaled = Math.max(box.width / vw, box.height / vh) * vw;   // rendered width under object-fit: cover
    const overflow = scaled - box.width;
    const p = overflow > 0 ? (C.scene.fire.x * scaled - box.width / 2) / overflow : 0.5;
    hero.style.setProperty('--focus-x', (Math.min(1, Math.max(0, p)) * 100).toFixed(2) + '%');
    readFraming();
  }

  // object-position the <video> currently has (desktop 68%, phones fire-centred)
  let objPos = [0.68, 0.5];
  function readFraming() {
    objPos = getComputedStyle(video).objectPosition.split(' ').map(v => parseFloat(v) / 100);
  }

  // where a point of the video frame (0–1 fractions) lands inside the hero, in px
  function sceneToHero(fx, fy) {
    const r = video.getBoundingClientRect(), h = hero.getBoundingClientRect();
    const [vw, vh] = videoSize();
    const s = Math.max(r.width / vw, r.height / vh);
    return [r.left - h.left + (r.width - vw * s) * objPos[0] + fx * vw * s,
            r.top - h.top + (r.height - vh * s) * objPos[1] + fy * vh * s];
  }
  // a pointer event's position as video-frame fractions
  function eventToScene(e) {
    const r = video.getBoundingClientRect();
    const [vw, vh] = videoSize();
    const s = Math.max(r.width / vw, r.height / vh);
    return [(e.clientX - r.left - (r.width - vw * s) * objPos[0]) / (vw * s),
            (e.clientY - r.top - (r.height - vh * s) * objPos[1]) / (vh * s)];
  }

  // ── sizes and hit areas ──
  const ctx = sparkCanvas.getContext('2d');
  let W = 0, H = 0, avoidRects = [], firePx = [-999, -999];
  function layout() {
    centreFire();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const rect = hero.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    sparkCanvas.width = W * dpr;
    sparkCanvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // fireflies and embers fade out over the headline, button, links and brand
    avoidRects = ['.hero-heading', '.btn-gold', '.hero-links', '.hero-brand'].map(sel => {
      const el = hero.querySelector(sel);
      if (!el || !el.offsetParent) return null;
      const r = el.getBoundingClientRect();
      return { l: r.left - rect.left, t: r.top - rect.top, r: r.right - rect.left, b: r.bottom - rect.top };
    }).filter(Boolean);
    firePx = sceneToHero(C.scene.fire.x, C.scene.fire.y);
    lanternEl.style.setProperty('--fx', firePx[0].toFixed(1) + 'px');
    lanternEl.style.setProperty('--fy', firePx[1].toFixed(1) + 'px');
    syncFlies();
    resizeGL();
  }
  function textFade(x, y) {
    let f = 1;
    for (const a of avoidRects) {
      const d = Math.hypot(Math.max(a.l - x, 0, x - a.r), Math.max(a.t - y, 0, y - a.b));
      f = Math.min(f, 0.08 + 0.92 * Math.min(1, d / 48));
    }
    return f;
  }

  // ── cursor ──
  let cursor = null;
  hero.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    cursor = [e.clientX - r.left, e.clientY - r.top];
  });
  hero.addEventListener('pointerleave', () => { cursor = null; });

  // ── glow sprites ──
  const FLY_COLOURS = {
    cool: [[245, 255, 235], [215, 245, 170], [170, 215, 120], [140, 190, 100]],
    gold: [[255, 250, 225], [252, 236, 170], [226, 201, 138], [201, 169, 108]],
    warm: [[255, 235, 200], [255, 190, 110], [235, 140, 60], [210, 100, 40]],
  };
  const flySprite = document.createElement('canvas');
  flySprite.width = flySprite.height = 64;
  const emberSprite = document.createElement('canvas');
  emberSprite.width = emberSprite.height = 32;

  function paintSprite(canvas, stops) {
    const n = canvas.width, g = canvas.getContext('2d');
    g.clearRect(0, 0, n, n);
    const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    for (const [at, rgb, a] of stops) r.addColorStop(at, `rgba(${rgb.join(',')},${a})`);
    g.fillStyle = r;
    g.fillRect(0, 0, n, n);
  }
  const lerp = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  function recolour() {
    // fireflies: 0 = cool green-white, 0.5 = brand gold, 1 = amber
    const w = C.fireflies.warmth;
    const [from, to, k] = w < 0.5 ? [FLY_COLOURS.cool, FLY_COLOURS.gold, w * 2] : [FLY_COLOURS.gold, FLY_COLOURS.warm, (w - 0.5) * 2];
    const c = i => lerp(from[i], to[i], k);
    paintSprite(flySprite, [[0, c(0), 1], [0.1, c(1), 0.95], [0.3, c(2), 0.4], [0.6, c(3), 0.1], [1, c(3), 0]]);
    // embers: 0 = pale gold, 1 = deep orange-red
    const e = C.embers.warmth;
    paintSprite(emberSprite, [
      [0, lerp([255, 250, 230], [255, 225, 170], e), 1],
      [0.2, lerp([245, 225, 170], [255, 120, 40], e), 0.9],
      [0.5, lerp([226, 201, 138], [220, 70, 20], e), 0.3],
      [1, lerp([201, 169, 108], [180, 40, 10], e), 0],
    ]);
  }

  // ── fireflies ──
  const flies = [];
  const flyZoneH = () => isDesktop ? H : H * 0.62;   // on phones they stay above the text
  function flyCount() { return reducedMotion ? Math.min(6, C.fireflies.count) : C.fireflies.count; }
  function makeFly() {
    return {
      x: Math.random() * W,
      y: Math.random() * flyZoneH(),
      depth: 0.45 + Math.random() * 0.95,       // near flies are bigger, faster, brighter
      heading: Math.random() * Math.PI * 2,
      seed: Math.random() * 1000,
      blinkRate: 0.18 + Math.random() * 0.3,
      blinkPhase: Math.random(),
      curious: Math.random() < 0.65,            // only some are drawn to the cursor
      orbit: 30 + Math.random() * 70,
      vx: 0, vy: 0,
    };
  }
  function syncFlies() {
    while (flies.length < flyCount()) flies.push(makeFly());
    flies.length = flyCount();
  }
  function stepFlies(dt, t) {
    const F = C.fireflies, zoneH = flyZoneH();
    const speedK = reducedMotion ? 0.35 : F.speed;
    for (const f of flies) {
      // lazy wandering: heading drifts on two slow, out-of-step waves
      f.heading += (Math.sin(t * 0.6 + f.seed) * 0.7 + Math.sin(t * 0.21 + f.seed * 1.7) * 0.9) * dt;
      const speed = 16 * f.depth * speedK;
      let tvx = Math.cos(f.heading) * speed;
      let tvy = Math.sin(f.heading) * speed - 3 * speedK;   // faint upward float
      let ease = 1.5;
      if (cursor && f.curious && isDesktop && F.pull > 0) {
        // circle loosely around the cursor rather than piling onto it
        const a = t * 0.5 + f.seed;
        const dx = cursor[0] + Math.cos(a) * f.orbit - f.x;
        const dy = cursor[1] + Math.sin(a) * f.orbit * 0.7 - f.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 280) {
          const k = (1 - d / 280) * F.pull;
          tvx += dx / d * speed * 2.2 * k;
          tvy += dy / d * speed * 2.2 * k;
          ease = 1.5 + k;
        }
      }
      f.vx += (tvx - f.vx) * Math.min(1, dt * ease);
      f.vy += (tvy - f.vy) * Math.min(1, dt * ease);
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < -40) f.x = W + 40; else if (f.x > W + 40) f.x = -40;
      if (f.y < -40) f.y = zoneH + 20; else if (f.y > zoneH + 40) f.y = -20;

      // a faint ember most of the time, a soft bloom now and then
      const wave = (Math.sin((t * f.blinkRate * F.blink + f.blinkPhase) * Math.PI * 2) + 1) / 2;
      const bright = 0.12 + 0.88 * Math.pow(wave, 4);
      const zoneFade = isDesktop ? 1 : Math.min(1, Math.max(0, (zoneH + 20 - f.y) / 80));
      const alpha = bright * F.glow * (0.45 + 0.55 * Math.min(1, f.depth)) * textFade(f.x, f.y) * zoneFade;
      if (alpha <= 0.01) continue;
      const s = 30 * f.depth * F.size * (0.8 + 0.4 * wave);
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(flySprite, f.x - s / 2, f.y - s / 2, s, s);
    }
  }

  // ── embers: a few always rise from the fire, more when the cursor comes near or on a tap ──
  const embers = [];
  let fireNear = 0, fireKick = 0, fireFlare = 0, emberDebt = 0;
  const fireDist = e => {
    const r = hero.getBoundingClientRect();
    return Math.hypot(e.clientX - r.left - firePx[0], e.clientY - r.top - firePx[1]);
  };
  hero.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') fireNear = Math.max(0, 1 - fireDist(e) / C.embers.reach);
  });
  hero.addEventListener('pointerleave', () => { fireNear = 0; });
  hero.addEventListener('pointerdown', e => {
    if (state.painting || reducedMotion || fireDist(e) > Math.max(90, C.embers.reach * 0.6)) return;
    fireKick = 1;
    for (let i = 0; i < 10; i++) spawnEmber(1.4);
  });
  function spawnEmber(boost) {
    embers.push({
      x: firePx[0] + (Math.random() - 0.5) * 22,
      y: firePx[1] - 10 - Math.random() * 14,
      vx: (Math.random() - 0.5) * 30,
      vy: -(45 + Math.random() * 70) * C.embers.lift * boost,
      life: 0,
      max: 1 + Math.random() * 1.6,
      size: 5 + Math.random() * 8,
      seed: Math.random() * 100,
    });
  }
  function stepEmbers(dt, t) {
    if (reducedMotion) return;
    fireKick = Math.max(0, fireKick - dt * 0.7);
    const target = state.painting ? 0 : Math.max(fireNear, fireKick);
    // stokes up quickly, dies down slowly
    fireFlare += (target - fireFlare) * Math.min(1, dt * (target > fireFlare ? 6 : 1.2));
    emberDebt += (C.embers.idle + C.embers.sparks * fireFlare) * dt;
    while (emberDebt >= 1) { spawnEmber(1 + fireFlare * 0.5); emberDebt -= 1; }

    for (let i = embers.length - 1; i >= 0; i--) {
      const p = embers[i];
      p.life += dt;
      if (p.life > p.max) { embers.splice(i, 1); continue; }
      p.vx += Math.sin(t * 3 + p.seed) * 40 * dt;   // drifts on the heat
      p.vy *= 1 - dt * 0.4;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.life / p.max;
      const a = (1 - k) * (1 - k) * (0.7 + 0.3 * Math.sin(t * 25 + p.seed)) * textFade(p.x, p.y);
      if (a <= 0.01) continue;
      const sz = p.size * (1 - k * 0.6);
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(emberSprite, p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
  }

  // ── lantern (desktop): warm light trails the cursor, the scene dims a touch around it ──
  let lanternPos = null, lanternOn = 0;
  function stepLantern(dt, t) {
    if (!isDesktop || reducedMotion) return;
    const L = C.lantern;
    if (cursor) {
      if (!lanternPos) lanternPos = cursor.slice();
      // a lantern is carried, not glued to the cursor: it trails a little behind
      const k = Math.min(1, dt * (2 + (1 - L.lag) * 18));
      lanternPos[0] += (cursor[0] - lanternPos[0]) * k;
      lanternPos[1] += (cursor[1] - lanternPos[1]) * k;
    }
    lanternOn += ((cursor && !state.painting ? 1 : 0) - lanternOn) * Math.min(1, dt * 3);
    if (!lanternPos) return;
    // flame flicker: three out-of-step waves nudge size and warmth
    const fl = 1 + L.flicker * 0.09 * (Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.1 + 1.7) * 0.3 + Math.sin(t * 2.1) * 0.2);
    // set on the hero so the lantern and the text-column shade can both read them
    const s = hero.style;
    s.setProperty('--lx', lanternPos[0].toFixed(1) + 'px');
    s.setProperty('--ly', lanternPos[1].toFixed(1) + 'px');
    s.setProperty('--lr', (L.radius * fl).toFixed(1) + 'px');
    s.setProperty('--ldim', L.dim);
    s.setProperty('--lwarm', (L.warmth * fl).toFixed(3));
    s.setProperty('--lon', lanternOn.toFixed(3));
    s.setProperty('--lreveal', L.reveal);
    lanternEl.style.opacity = lanternOn.toFixed(3);
  }

  // ── wind map: white = sways, black = still ──
  const MAP_W = 1008, MAP_H = 512;
  const windMap = document.createElement('canvas');
  windMap.width = MAP_W;
  windMap.height = MAP_H;
  const wm = windMap.getContext('2d', { willReadFrequently: true });
  wm.fillStyle = '#000';
  wm.fillRect(0, 0, MAP_W, MAP_H);
  let windMapDirty = true;
  function loadWindMap(src) {
    return new Promise((ok, fail) => {
      const img = new Image();
      img.onload = () => { wm.drawImage(img, 0, 0, MAP_W, MAP_H); windMapDirty = true; ok(); };
      img.onerror = fail;
      img.src = src;
    });
  }

  // ── WebGL: the video as a texture, displaced by the wind where the map is white ──
  const VERT = `
attribute vec2 aPos;
uniform vec2 uRes;
varying vec2 vPx;
void main() {
  vPx = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5) * uRes;   // pixel coords, origin top-left
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
  const FRAG = `
precision highp float;
uniform sampler2D uVideo, uMask;
uniform vec2 uRes, uVid, uPos;
uniform float uTime, uAmp, uScale, uSpeed, uGust, uShowMap;
varying vec2 vPx;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  // object-fit: cover + object-position, same framing as the <video>
  float s = max(uRes.x / uVid.x, uRes.y / uVid.y);
  vec2 size = uVid * s;
  vec2 uv = (vPx - (uRes - size) * uPos) / size;

  float m = texture2D(uMask, clamp(uv, 0.0, 1.0)).r;
  float t = uTime * uSpeed;

  // gusts roll across the scene left to right; between gusts the leaves only breathe
  float g = smoothstep(0.25, 0.9, noise(vec2(uv.x * 1.6 - t * 0.35, 3.7)));
  float gust = mix(1.0, 0.3 + 0.7 * g, uGust);

  // low-frequency noise so whole leaf clusters move together instead of shimmering
  vec2 p = uv * uScale * vec2(2.0, 1.0);
  vec2 d = vec2(noise(p + vec2(t * 0.6, t * 0.2)) - 0.5,
                noise(p + vec2(5.2 - t * 0.4, 1.3 + t * 0.5)) - 0.5);
  d.x += 0.25 * sin(t * 1.3 + noise(p * 0.5) * 6.2831);   // gentle side-to-side sway

  // uAmp is peak movement in pixels of a ${REF_W}px-wide frame, whatever the encode size
  vec2 disp = d * 1.4 * uAmp * gust * m / (vec2(1.0, uVid.y / uVid.x) * ${REF_W}.0);
  vec4 c = texture2D(uVideo, uv + disp);
  if (uShowMap > 0.5) c.rgb = mix(c.rgb, vec3(0.2, 0.85, 0.4), m * 0.45);
  gl_FragColor = c;
}`;

  let gl = null, U = {}, videoTex = null, maskTex = null, hasFrame = false;
  function startGL() {
    gl = glCanvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    // one oversized triangle covers the viewport
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    for (const name of ['uRes', 'uVid', 'uPos', 'uTime', 'uAmp', 'uScale', 'uSpeed', 'uGust', 'uShowMap', 'uVideo', 'uMask']) {
      U[name] = gl.getUniformLocation(prog, name);
    }
    const makeTex = unit => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
                            [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) {
        gl.texParameteri(gl.TEXTURE_2D, k, v);
      }
      return tex;
    };
    maskTex = makeTex(1);
    videoTex = makeTex(0);   // leave unit 0 active for the per-frame video upload
    gl.uniform1i(U.uVideo, 0);
    gl.uniform1i(U.uMask, 1);
    resizeGL();
  }
  function resizeGL() {
    if (!gl) return;
    const dpr = Math.min(devicePixelRatio || 1, isDesktop ? 2 : 1.5);
    const r = glCanvas.getBoundingClientRect();
    glCanvas.width = Math.round(r.width * dpr);
    glCanvas.height = Math.round(r.height * dpr);
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  }
  function drawGL(now) {
    if (!gl) return;
    if (video.readyState >= 2) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      if (!hasFrame) { hasFrame = true; hero.classList.add('gl-on'); }
    }
    if (!hasFrame) return;
    if (windMapDirty) {
      gl.activeTexture(gl.TEXTURE1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, windMap);
      gl.activeTexture(gl.TEXTURE0);
      windMapDirty = false;
    }
    const Wn = C.wind;
    gl.uniform2f(U.uRes, glCanvas.width, glCanvas.height);
    gl.uniform2f(U.uVid, ...videoSize());
    gl.uniform2f(U.uPos, objPos[0], objPos[1]);
    gl.uniform1f(U.uTime, now / 1000);
    gl.uniform1f(U.uAmp, reducedMotion ? 0 : Wn.strength);
    gl.uniform1f(U.uScale, Wn.rippleSize);
    gl.uniform1f(U.uSpeed, Wn.speed);
    gl.uniform1f(U.uGust, Wn.gustiness);
    gl.uniform1f(U.uShowMap, state.showMap || state.painting ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ── main loop ──
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    if (!state.painting) {
      stepFlies(dt, t);
      stepEmbers(dt, t);
    }
    ctx.globalAlpha = 1;
    stepLantern(dt, t);
    drawGL(now);
    window.heroRaf(frame);
  }

  // ── main nav: hidden while the hero (with its own brand and links) is on screen ──
  const nav = document.getElementById('main-nav');
  if (nav) {
    const placeNav = () => nav.classList.toggle('over-hero', scrollY < hero.offsetHeight * 0.85);
    addEventListener('scroll', placeNav, { passive: true });
    placeNav();
  }
  const menuBtn = hero.querySelector('.hero-menu-btn');
  const navMenuBtn = document.getElementById('hamburger');
  if (menuBtn && navMenuBtn) menuBtn.addEventListener('click', () => navMenuBtn.click());

  // ── start ──
  if (reducedMotion) {
    video.removeAttribute('autoplay');
    video.pause();
  }
  try { startGL(); }
  catch (err) { console.warn('[hero] WebGL off, plain video instead:', err); gl = null; }

  const tuning = new URLSearchParams(location.search).has('tune');
  let saved = null;
  if (tuning) { try { saved = localStorage.getItem('hero-wind-map'); } catch {} }
  (saved ? loadWindMap(saved) : loadWindMap('assets/hero/wind-map.png')).catch(() => {});

  applyLook();
  recolour();
  layout();
  addEventListener('resize', layout);
  video.addEventListener('loadedmetadata', layout);
  document.fonts && document.fonts.ready.then(layout);
  window.heroRaf(frame);

  // everything the tune panel needs
  window.heroScene = {
    config: C, state, isDesktop,
    applyLook, recolour, syncFlies, layout,
    windMap: { canvas: windMap, ctx: wm, width: MAP_W, height: MAP_H, markDirty: () => { windMapDirty = true; } },
    eventToScene,
    sceneScale: () => {
      const r = video.getBoundingClientRect(), [vw, vh] = videoSize();
      return Math.max(r.width / vw, r.height / vh) * vw;   // rendered frame width, px
    },
  };
  if (tuning) {
    const s = document.createElement('script');
    s.src = 'assets/hero/hero-tune.js';
    document.body.appendChild(s);
  }
})();
