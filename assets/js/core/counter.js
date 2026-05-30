const Counter = (() => {
  'use strict';

  const SELECTORS = { counters: '[data-target]' };
  const CONFIG    = { duration: 2000, easing: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t };

  let _observer = null;
  let _state    = { initialized: false };

  function _animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix ?? '';
    const start  = performance.now();

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / CONFIG.duration, 1);
      const eased    = CONFIG.easing(progress);
      const value    = Math.floor(eased * target);
      el.textContent = value + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    }

    requestAnimationFrame(step);
  }

  function init() {
    if (_state.initialized) return;

    const counters = document.querySelectorAll(SELECTORS.counters);
    if (!counters.length) return;

    _observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          _animateCounter(entry.target);
          _observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => _observer.observe(el));
    _state.initialized = true;
  }

  function destroy() {
    if (_observer) { _observer.disconnect(); _observer = null; }
    _state.initialized = false;
  }

  return { init, destroy };
})();

export default Counter;
