/* guidance.js — the "What Tarot Can Illuminate" deck on the homepage.
 *
 * Four cards are dealt face down when the deck scrolls into view. Tapping one turns it
 * over (with a puff of embers, like the hero fire); "Turn all four over" reveals them all.
 * Under prefers-reduced-motion the deal, flip and embers are skipped.
 */
(function () {
  const deck = document.querySelector('.tr-deck');
  if (!deck) return;

  const section = deck.closest('section');
  const canvas = section.querySelector('.tr-burst');
  const allBtn = section.querySelector('.tr-all');
  const cards = [...deck.querySelectorAll('.tr-card')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isOpen = card => card.getAttribute('aria-expanded') === 'true';

  // ── deal: cards start hidden only once this script runs, so they still show without JS ──
  deck.setAttribute('data-deal', '');
  function deal() {
    deck.classList.add('dealt');
    setTimeout(() => deck.classList.add('settled'), reducedMotion ? 0 : cards.length * 90 + 700);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (!entries[entries.length - 1].isIntersecting) return;
      io.disconnect();
      deal();
    }, { threshold: 0.25 });
    io.observe(deck);
  } else {
    deal();
  }

  // ── embers that puff up from a card as it turns ──
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

  function puff(card) {
    if (reducedMotion) return;
    if (!W) fit();
    const c = canvas.getBoundingClientRect(), r = card.getBoundingClientRect();
    const cx = r.left - c.left + r.width / 2, cy = r.bottom - c.top;   // rise from the card's bottom edge, under the text
    for (let i = 0; i < 16; i++) {
      sparks.push({
        x: cx + (Math.random() - 0.5) * r.width * 0.7,
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

  // ── turning cards over ──
  function setOpen(card, open) {
    if (isOpen(card) === open) return;
    card.setAttribute('aria-expanded', open);
    card.querySelector('.tr-front').setAttribute('aria-hidden', !open);
    card.querySelector('.tr-back').setAttribute('aria-hidden', open);
    if (open) puff(card);
  }
  function syncAllLabel() {
    allBtn.textContent = cards.every(isOpen) ? 'Turn them back' : 'Turn all four over';
  }
  cards.forEach(card => card.addEventListener('click', () => {
    setOpen(card, !isOpen(card));
    syncAllLabel();
  }));
  allBtn.addEventListener('click', () => {
    const open = !cards.every(isOpen);
    cards.forEach((card, i) => setTimeout(() => setOpen(card, open), reducedMotion ? 0 : i * 70));
    allBtn.textContent = open ? 'Turn them back' : 'Turn all four over';
  });
})();
