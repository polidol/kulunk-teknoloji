const Modal = (() => {
  'use strict';

  const SELECTORS = {
    modal:    '#video-modal',
    close:    '#modal-close',
    iframe:   '#modal-iframe',
    playBtn:  '#demo-play-btn'
  };

  const CONFIG = { videoSrc: '' };

  let _modal   = null;
  let _close   = null;
  let _iframe  = null;
  let _playBtn = null;
  let _state   = { initialized: false, open: false };

  function _open() {
    if (!_modal) return;
    _iframe.src = CONFIG.videoSrc || 'about:blank';
    _modal.classList.add('is-open');
    _state.open = true;
    document.body.style.overflow = 'hidden';
    _close.focus();
  }

  function _close_modal() {
    if (!_modal) return;
    _modal.classList.remove('is-open');
    _iframe.src = '';
    _state.open = false;
    document.body.style.overflow = '';
    if (_playBtn) _playBtn.focus();
  }

  function _onBackdropClick(e) {
    if (e.target === _modal) _close_modal();
  }

  function _onKeydown(e) {
    if (e.key === 'Escape' && _state.open) _close_modal();
  }

  function _onPlayKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      _open();
    }
  }

  function init() {
    if (_state.initialized) return;

    _modal   = document.querySelector(SELECTORS.modal);
    _close   = document.querySelector(SELECTORS.close);
    _iframe  = document.querySelector(SELECTORS.iframe);
    _playBtn = document.querySelector(SELECTORS.playBtn);

    if (!_modal) return;

    if (_playBtn) {
      _playBtn.addEventListener('click', _open);
      _playBtn.addEventListener('keydown', _onPlayKeydown);
    }
    if (_close)  _close.addEventListener('click', _close_modal);
    _modal.addEventListener('click', _onBackdropClick);
    document.addEventListener('keydown', _onKeydown);

    _state.initialized = true;
  }

  function destroy() {
    if (_playBtn) {
      _playBtn.removeEventListener('click', _open);
      _playBtn.removeEventListener('keydown', _onPlayKeydown);
    }
    if (_close) _close.removeEventListener('click', _close_modal);
    if (_modal) _modal.removeEventListener('click', _onBackdropClick);
    document.removeEventListener('keydown', _onKeydown);
    _state.initialized = false;
  }

  return { init, destroy, open: _open };
})();

export default Modal;
