/* guidance.js — the "What Tarot Can Illuminate" deck on the homepage.
 *
 * Four cards are dealt face down when the deck scrolls into view. Tapping one turns it
 * over (with a puff of embers, like the hero fire); "Turn all four over" reveals them all.
 * Under prefers-reduced-motion the deal, flip and embers are skipped. Needs assets/embers.js.
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

  // ── embers that puff up from a card as it turns (assets/embers.js) ──
  const embers = Embers(canvas);

  // ── turning cards over ──
  function setOpen(card, open) {
    if (isOpen(card) === open) return;
    card.setAttribute('aria-expanded', open);
    card.querySelector('.tr-front').setAttribute('aria-hidden', !open);
    card.querySelector('.tr-back').setAttribute('aria-hidden', open);
    if (open) embers.puff(card);
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
