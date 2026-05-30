const CardTilt = (() => {
  'use strict';

  const SELECTORS = { cards: '[data-tilt]' };
  const CONFIG = { maxTilt: 8, perspective: 800, scale: 1.02, speed: 400 };

  let _cards  = [];
  let _state  = { initialized: false };

  function _onMouseMove(e) {
    const card   = e.currentTarget;
    const rect   = card.getBoundingClientRect();
    const cx     = rect.left + rect.width / 2;
    const cy     = rect.top  + rect.height / 2;
    const dx     = (e.clientX - cx) / (rect.width  / 2);
    const dy     = (e.clientY - cy) / (rect.height / 2);
    const tiltX  = -dy * CONFIG.maxTilt;
    const tiltY  =  dx * CONFIG.maxTilt;

    card.style.transform =
      `perspective(${CONFIG.perspective}px) ` +
      `rotateX(${tiltX}deg) rotateY(${tiltY}deg) ` +
      `scale3d(${CONFIG.scale},${CONFIG.scale},${CONFIG.scale})`;
    card.style.transition = `transform ${CONFIG.speed * 0.1}ms ease`;
  }

  function _onMouseLeave(e) {
    const card = e.currentTarget;
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    card.style.transition = `transform ${CONFIG.speed}ms cubic-bezier(0.34,1.56,0.64,1)`;
  }

  function _onMouseEnter(e) {
    const card = e.currentTarget;
    card.style.transition = `transform ${CONFIG.speed * 0.1}ms ease`;
  }

  function init() {
    if (_state.initialized) return;

    if (window.matchMedia('(hover: none)').matches) return;

    _cards = Array.from(document.querySelectorAll(SELECTORS.cards));
    _cards.forEach(card => {
      card.addEventListener('mousemove',  _onMouseMove);
      card.addEventListener('mouseleave', _onMouseLeave);
      card.addEventListener('mouseenter', _onMouseEnter);
    });

    _state.initialized = true;
  }

  function destroy() {
    _cards.forEach(card => {
      card.removeEventListener('mousemove',  _onMouseMove);
      card.removeEventListener('mouseleave', _onMouseLeave);
      card.removeEventListener('mouseenter', _onMouseEnter);
    });
    _cards = [];
    _state.initialized = false;
  }

  return { init, destroy };
})();

export default CardTilt;
