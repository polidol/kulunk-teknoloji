const Scroll = (() => {
  'use strict';

  const SELECTORS = {
    reveal: '.reveal',
    steps:  '.step-item',
    navbar: '#navbar',
    sections: 'section[id]'
  };

  const CONFIG = {
    revealThreshold: 0.12,
    stepThreshold: 0.2
  };

  let _revealObserver = null;
  let _stepObserver   = null;
  let _state = { initialized: false };

  function _createRevealObserver() {
    _revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          _revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: CONFIG.revealThreshold });

    document.querySelectorAll(SELECTORS.reveal).forEach(el => {
      _revealObserver.observe(el);
    });
  }

  function _createStepObserver() {
    _stepObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: CONFIG.stepThreshold });

    document.querySelectorAll(SELECTORS.steps).forEach(el => {
      _stepObserver.observe(el);
    });
  }

  function init() {
    if (_state.initialized) return;

    _createRevealObserver();
    _createStepObserver();

    _state.initialized = true;
  }

  function destroy() {
    if (_revealObserver) { _revealObserver.disconnect(); _revealObserver = null; }
    if (_stepObserver)   { _stepObserver.disconnect();   _stepObserver   = null; }
    _state.initialized = false;
  }

  return { init, destroy };
})();

export default Scroll;
