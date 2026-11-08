/* embers.js — the puff of embers (like the hero fire) used when a homepage card turns or is drawn.
 *
 * Embers(canvas) returns { puff(el, opts) }: sparks rise from el's bottom edge (or its top,
 * with { from: 'top' }) and drift up across the canvas. Skipped under prefers-reduced-motion.
 */
window.Embers = function (canvas) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  const ember = document.createElement('canvas');
  ember.width = ember.height = 32;
  (function paintEmber() {
    const g = ember.getContext('2d');
    const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, 'rgba(255,250,230,1)');
    r.addColorStop(0.2, 'rgba(245,225,170,0.9)');
    r.addColorStop(0.5, 'rgba(226,201,138,0.3)');
    r.addColorStop(1, 'rgba(201,169,108,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 32, 32);
  })();

  let W = 0, H = 0, sparks = [], raf = 0, last = 0;
  function fit() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', () => { W = 0; });   // refit on the next puff

  function puff(el, { count = 16, from = 'bottom', spread = 0.7 } = {}) {
    if (reducedMotion) return;
    if (!W) fit();
    const c = canvas.getBoundingClientRect(), r = el.getBoundingClientRect();
    const cx = r.left - c.left + r.width / 2, cy = (from === 'top' ? r.top : r.bottom) - c.top;
    for (let i = 0; i < count; i++) {
      sparks.push({
        x: cx + (Math.random() - 0.5) * r.width * spread,
        y: cy + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 60,
        vy: -60 - Math.random() * 100,
        life: 0,
        span: 0.45 + Math.random() * 0.35,
        size: 6 + Math.random() * 8,
        seed: Math.random() * 6.28,
      });
    }
    if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    sparks = sparks.filter(p => (p.life += dt / p.span) < 1);
    for (const p of sparks) {
      p.vx += Math.sin(t * 6 + p.seed) * 40 * dt;   // a little drift as they rise
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = Math.sin(Math.PI * p.life) * 0.9;
      ctx.drawImage(ember, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    raf = sparks.length ? requestAnimationFrame(tick) : 0;
  }

  return { puff };
};
