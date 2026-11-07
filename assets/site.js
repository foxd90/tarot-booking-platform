/* site.js — shared progressive enhancement. Loaded in <head>, before page scripts. */
(function () {
  /* Hero canvas loops opt in via window.heroRaf: under prefers-reduced-motion they
     draw one frame (and redraw after a resize clears the canvas), and they park
     while #hero is scrolled out of view. Other rAF users are untouched. */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var loops = new Set();
  var drawn = new WeakSet();
  var parked = new Set();
  var heroVisible = true;

  window.heroRaf = function (cb) {
    loops.add(cb);
    if (reduce.matches) {
      if (drawn.has(cb)) return 0;
      drawn.add(cb);
      return requestAnimationFrame(cb);
    }
    if (!heroVisible) { parked.add(cb); return 0; }
    return requestAnimationFrame(cb);
  };

  var resizeTimer;
  window.addEventListener('resize', function () {
    if (!reduce.matches) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      drawn = new WeakSet();
      loops.forEach(function (cb) { window.heroRaf(cb); });
    }, 150);
  });

  document.addEventListener('DOMContentLoaded', function () {
    var hero = document.getElementById('hero');
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[entries.length - 1].isIntersecting;
        if (heroVisible) {
          var resume = Array.from(parked);
          parked.clear();
          resume.forEach(function (cb) { requestAnimationFrame(cb); });
        }
      }).observe(hero);
    }

    /* Tabs (service pages): roles, aria-selected, roving tabindex, arrow keys. */
    document.querySelectorAll('.tab-toggle').forEach(function (group) {
      var list = group.querySelector('.tab-buttons');
      var tabs = Array.from(group.querySelectorAll('.tab-btn'));
      if (!list || !tabs.length) return;
      list.setAttribute('role', 'tablist');

      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
          var p = document.getElementById('tab-' + t.dataset.tab);
          if (p) p.classList.toggle('active', on);
        });
        if (focus) tab.focus();
      }

      tabs.forEach(function (tab, i) {
        var pane = document.getElementById('tab-' + tab.dataset.tab);
        if (!pane) return;
        tab.id = 'tabbtn-' + tab.dataset.tab;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', pane.id);
        pane.setAttribute('role', 'tabpanel');
        pane.setAttribute('aria-labelledby', tab.id);
        tab.addEventListener('click', function () { select(tab, false); });
        tab.addEventListener('keydown', function (e) {
          var next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
          if (next === undefined) return;
          e.preventDefault();
          select(tabs[(next + tabs.length) % tabs.length], true);
        });
      });
      select(tabs.find(function (t) { return t.classList.contains('active'); }) || tabs[0], false);
    });
  });
})();
