const Navbar = (() => {
  'use strict';

  const SELECTORS = {
    navbar:    '#navbar',
    toggle:    '.nav-toggle',
    overlay:   '#nav-mobile-overlay',
    links:     '.nav-link',
    mobileLinks: '.nav-mobile-link',
    sections:  'section[id]'
  };

  const CONFIG = { scrollThreshold: 60 };

  let _navbar  = null;
  let _toggle  = null;
  let _overlay = null;
  let _isOpen  = false;
  let _state   = { initialized: false };

  function _onScroll() {
    if (window.scrollY > CONFIG.scrollThreshold) {
      _navbar.classList.add('navbar--scrolled');
    } else {
      _navbar.classList.remove('navbar--scrolled');
    }
  }

  function _toggleMenu() {
    _isOpen = !_isOpen;
    _toggle.classList.toggle('is-active', _isOpen);
    _overlay.classList.toggle('is-open',  _isOpen);
    _toggle.setAttribute('aria-expanded', String(_isOpen));
    document.body.style.overflow = _isOpen ? 'hidden' : '';
  }

  function _closeMenu() {
    if (!_isOpen) return;
    _isOpen = false;
    _toggle.classList.remove('is-active');
    _overlay.classList.remove('is-open');
    _toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function _setupActiveLinks() {
    const sections = document.querySelectorAll(SELECTORS.sections);
    const navLinks = document.querySelectorAll(SELECTORS.links);

    if (!sections.length || !navLinks.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach(link => {
          const href = link.getAttribute('href');
          const isActive = href === `#${id}`;
          link.classList.toggle('nav-link--active', isActive);
        });
      });
    }, { threshold: 0.4 });

    sections.forEach(section => observer.observe(section));
  }

  function _onKeydown(e) {
    if (e.key === 'Escape' && _isOpen) _closeMenu();
  }

  function init() {
    if (_state.initialized) return;

    _navbar  = document.querySelector(SELECTORS.navbar);
    _toggle  = document.querySelector(SELECTORS.toggle);
    _overlay = document.querySelector(SELECTORS.overlay);

    if (!_navbar) return;

    window.addEventListener('scroll', _onScroll, { passive: true });
    _onScroll();

    if (_toggle && _overlay) {
      _toggle.addEventListener('click', _toggleMenu);
      document.querySelectorAll(SELECTORS.mobileLinks).forEach(link => {
        link.addEventListener('click', _closeMenu);
      });
    }

    document.addEventListener('keydown', _onKeydown);
    _setupActiveLinks();

    _state.initialized = true;
  }

  function destroy() {
    window.removeEventListener('scroll', _onScroll);
    document.removeEventListener('keydown', _onKeydown);
    if (_toggle) _toggle.removeEventListener('click', _toggleMenu);
    _state.initialized = false;
  }

  return { init, destroy };
})();

export default Navbar;
