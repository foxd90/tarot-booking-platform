/* offerings.js — the "Choose Your Reading" spread on the homepage.
 *
 * The three readings are tarot cards dealt into a fan when the section scrolls into view.
 * Drawing one (tap, or arrow keys — the spread is a tablist) lifts it out of the fan with a
 * puff of embers and shows its reading underneath. Sunlit Sojourn starts drawn.
 * Without JS every reading shows, stacked. Needs assets/embers.js.
 */
(function () {
  const spread = document.querySelector('.sp-spread');
  if (!spread) return;

  const section = spread.closest('section');
  const tabs = [...spread.querySelectorAll('.sp-card')];
  const readings = section.querySelector('.sp-readings');
  const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const embers = Embers(section.querySelector('.sp-burst'));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');

  // readings share one grid cell from here on, so switching never shifts the page below
  readings.setAttribute('data-tabs', '');
  panels.forEach((p, i) => { p.hidden = i !== current; });

  function draw(i, { focus = false, puff = true } = {}) {
    if (i === current) return;
    current = i;
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', j === i);
      t.tabIndex = j === i ? 0 : -1;
    });
    panels.forEach((p, j) => { p.hidden = j !== i; });
    if (!reducedMotion) {
      panels[i].animate(
        [{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none' }],
        { duration: 380, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' }
      );
    }
    if (focus) tabs[i].focus();
    if (puff) embers.puff(tabs[i], { from: 'top', spread: 0.8 });
  }

  tabs.forEach((t, i) => t.addEventListener('click', () => draw(i)));
  spread.addEventListener('keydown', e => {
    const n = tabs.length;
    const to = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    draw((to + n) % n, { focus: true, puff: false });
  });

  // ── deal: cards start stacked only once this script runs, so they still show without JS ──
  spread.setAttribute('data-deal', '');
  function deal() {
    spread.classList.add('dealt');
    setTimeout(() => {
      spread.classList.add('settled');
      embers.puff(tabs[current], { from: 'top', spread: 0.8 });
    }, reducedMotion ? 0 : tabs.length * 110 + 650);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (!entries[entries.length - 1].isIntersecting) return;
      io.disconnect();
      deal();
    }, { threshold: 0.25 });
    io.observe(spread);
  } else {
    deal();
  }
})();
