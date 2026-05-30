const HeroWaves = (() => {
  'use strict';

  const SELECTORS = { particles: '#hero-particles' };
  const CONFIG = {
    particleCount: 50,
    minSize: 2,
    maxSize: 6,
    minDuration: 4,
    maxDuration: 10,
    minDelay: 0,
    maxDelay: 8
  };

  let _state = { initialized: false };

  function _rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function _createParticles() {
    const container = document.querySelector(SELECTORS.particles);
    if (!container) return;

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < CONFIG.particleCount; i++) {
      const el = document.createElement('span');
      el.className = 'particle';

      const size     = _rand(CONFIG.minSize, CONFIG.maxSize);
      const x        = _rand(0, 100);
      const y        = _rand(0, 100);
      const duration = _rand(CONFIG.minDuration, CONFIG.maxDuration);
      const delay    = _rand(CONFIG.minDelay, CONFIG.maxDelay);
      const opacity  = _rand(0.1, 0.5);

      el.style.cssText = `
        width:${size}px;
        height:${size}px;
        left:${x}%;
        top:${y}%;
        opacity:${opacity};
        animation-duration:${duration}s;
        animation-delay:-${delay}s;
      `;

      fragment.appendChild(el);
    }

    container.appendChild(fragment);
  }

  function init() {
    if (_state.initialized) return;

    _createParticles();
    _state.initialized = true;
  }

  function destroy() {
    const container = document.querySelector(SELECTORS.particles);
    if (container) container.innerHTML = '';
    _state.initialized = false;
  }

  return { init, destroy };
})();

export default HeroWaves;
