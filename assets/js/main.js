import Navbar    from './core/navbar.js';
import Scroll    from './core/scroll.js';
import Counter   from './core/counter.js';
import HeroWaves from './components/hero-waves.js';
import CardTilt  from './components/card-tilt.js';
import Modal     from './components/modal.js';

// Toast notification system
const Toast = (() => {
  'use strict';

  const container = document.getElementById('toast-container');

  function show({ title, message, type = 'success', duration = 4000 }) {
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <div class="toast-icon" aria-hidden="true">${type === 'success' ? '✅' : '❌'}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('is-visible'));
    });
    setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
  }

  return { show };
})();

// Contact form handler
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const originalText = btn.textContent;

    btn.textContent = 'Gönderiliyor...';
    btn.disabled = true;

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        form.reset();
        Toast.show({
          title: 'Mesajınız İletildi!',
          message: 'Ekibimiz 24 saat içinde size ulaşacak.',
          type: 'success'
        });
      } else {
        throw new Error('Sunucu hatası');
      }
    } catch {
      Toast.show({
        title: 'Gönderim Başarısız',
        message: 'Lütfen tekrar deneyin veya doğrudan e-posta gönderin.',
        type: 'error'
      });
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// Featured blog posts loader
async function initFeaturedBlog() {
  const grid = document.getElementById('blog-featured-grid');
  if (!grid) return;

  try {
    const res   = await fetch('/data/blog-posts.json');
    if (!res.ok) return;
    const posts = await res.json();
    const featured = posts.filter(p => p.featured).slice(0, 3);

    if (!featured.length) return;

    grid.innerHTML = featured.map(post => {
      const initials = post.author.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const imgHtml  = post.image
        ? `<img src="${post.image}" alt="${post.title}" loading="lazy" onerror="this.classList.add('blog-card-image-placeholder');this.removeAttribute('src');">`
        : `<div class="blog-card-image-placeholder" data-image-prompt="${post.imagePrompt}" aria-hidden="true"></div>`;

      return `
        <article class="blog-card reveal">
          <div class="blog-card-image">
            ${imgHtml}
            <div class="blog-card-category" data-cat="${post.category}">${post.category}</div>
          </div>
          <div class="blog-card-body">
            <h3 class="blog-card-title">
              <a href="/blog/post/?slug=${post.slug}" style="color:inherit;">${post.title}</a>
            </h3>
            <p class="blog-card-summary">${post.summary}</p>
            <div class="blog-card-footer">
              <div class="blog-card-avatar" aria-hidden="true">${initials}</div>
              <div class="blog-card-meta">
                <span class="blog-card-author">${post.author}</span>
                <span class="blog-card-info">${post.date} · ${post.readTime}</span>
              </div>
              <span class="blog-card-read-more" aria-hidden="true">→</span>
            </div>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('.reveal').forEach(el => {
      el.classList.add('is-visible');
    });

  } catch (err) {
    console.warn('[Blog] Yazılar yüklenemedi:', err.message);
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  Navbar.init();
  Scroll.init();
  Counter.init();
  HeroWaves.init();
  CardTilt.init();
  Modal.init();
  initContactForm();
  initFeaturedBlog();
});
