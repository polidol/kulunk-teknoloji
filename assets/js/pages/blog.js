const BlogPage = (() => {
  'use strict';

  const SELECTORS = {
    grid:       '#blog-grid',
    filters:    '#blog-filters',
    search:     '#blog-search',
    pagination: '#blog-pagination',
    sidebar:    '#blog-sidebar',
    count:      '#post-count'
  };

  const CONFIG = { perPage: 6, debounceMs: 300 };

  let _allPosts    = [];
  let _filtered    = [];
  let _currentPage = 1;
  let _activeCategory = 'Tümü';
  let _searchQuery = '';
  let _debounceTimer = null;
  let _state = { initialized: false };

  // Utilities
  function _debounce(fn, ms) {
    return (...args) => {
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(() => fn(...args), ms);
    };
  }

  function _escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _highlight(text, query) {
    if (!query) return _escapeHtml(text);
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return _escapeHtml(text).replace(re, '<mark style="background:rgba(0,102,204,0.3);color:inherit;border-radius:2px;">$1</mark>');
  }

  // Render card
  function _renderCard(post, query) {
    const initials = post.author.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    const imgHtml  = post.image
      ? `<img src="${_escapeHtml(post.image)}" alt="${_escapeHtml(post.title)}" loading="lazy" onerror="this.classList.add('blog-card-image-placeholder');this.removeAttribute('src');">`
      : `<div class="blog-card-image-placeholder" data-image-prompt="${_escapeHtml(post.imagePrompt)}" style="height:100%;min-height:200px;"></div>`;

    return `
      <article class="blog-card reveal is-visible">
        <a href="/blog/post/?slug=${_escapeHtml(post.slug)}" aria-label="Yazıyı oku: ${_escapeHtml(post.title)}">
          <div class="blog-card-image">
            ${imgHtml}
            <div class="blog-card-category" data-cat="${_escapeHtml(post.category)}">${_escapeHtml(post.category)}</div>
          </div>
        </a>
        <div class="blog-card-body">
          <h2 class="blog-card-title">
            <a href="/blog/post/?slug=${_escapeHtml(post.slug)}" style="color:inherit;">${_highlight(post.title, query)}</a>
          </h2>
          <p class="blog-card-summary">${_highlight(post.summary, query)}</p>
          <div class="blog-card-footer">
            <div class="blog-card-avatar" aria-hidden="true">${initials}</div>
            <div class="blog-card-meta">
              <span class="blog-card-author">${_escapeHtml(post.author)}</span>
              <span class="blog-card-info">${_escapeHtml(post.date)} · ${_escapeHtml(post.readTime)}</span>
            </div>
            <a href="/blog/post/?slug=${_escapeHtml(post.slug)}" class="blog-card-read-more" aria-label="Okumaya devam et">→</a>
          </div>
        </div>
      </article>
    `;
  }

  // Pagination buttons
  function _renderPagination(total) {
    const container = document.querySelector(SELECTORS.pagination);
    if (!container) return;

    const pages = Math.ceil(total / CONFIG.perPage);
    if (pages <= 1) { container.innerHTML = ''; return; }

    let html = '<div class="pagination">';
    if (_currentPage > 1) {
      html += `<button class="page-btn" data-page="${_currentPage - 1}">← Önceki</button>`;
    }
    for (let i = 1; i <= pages; i++) {
      html += `<button class="page-btn ${i === _currentPage ? 'page-btn--active' : ''}" data-page="${i}">${i}</button>`;
    }
    if (_currentPage < pages) {
      html += `<button class="page-btn" data-page="${_currentPage + 1}">Sonraki →</button>`;
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _currentPage = parseInt(btn.dataset.page, 10);
        _render();
        document.querySelector(SELECTORS.grid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // Render grid
  function _render() {
    const grid = document.querySelector(SELECTORS.grid);
    if (!grid) return;

    const start  = (_currentPage - 1) * CONFIG.perPage;
    const page   = _filtered.slice(start, start + CONFIG.perPage);

    const count = document.querySelector(SELECTORS.count);
    if (count) count.textContent = `${_filtered.length} yazı`;

    if (!page.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);padding:4rem 0;">Bu kriterlere uygun yazı bulunamadı.</p>';
      _renderPagination(0);
      return;
    }

    grid.innerHTML = page.map(p => _renderCard(p, _searchQuery)).join('');
    _renderPagination(_filtered.length);
  }

  // Filter + search
  function _applyFilters() {
    _currentPage = 1;
    const q = _searchQuery.toLowerCase().trim();

    _filtered = _allPosts.filter(post => {
      const catMatch = _activeCategory === 'Tümü' || post.category === _activeCategory;
      const qMatch   = !q ||
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q) ||
        (post.tags || []).some(t => t.toLowerCase().includes(q));
      return catMatch && qMatch;
    });

    _render();
  }

  // Sidebar: popular posts + tag cloud
  function _renderSidebar() {
    const sidebar = document.querySelector(SELECTORS.sidebar);
    if (!sidebar) return;

    const popular = _allPosts.filter(p => p.featured).slice(0, 3);
    const allTags = [...new Set(_allPosts.flatMap(p => p.tags || []))];
    const cats    = [...new Set(_allPosts.map(p => p.category))];
    const catCounts = Object.fromEntries(cats.map(c => [c, _allPosts.filter(p => p.category === c).length]));

    sidebar.innerHTML = `
      <div class="sidebar-widget">
        <div class="sidebar-title">Popüler Yazılar</div>
        ${popular.map(p => `
          <a href="/blog/post/?slug=${_escapeHtml(p.slug)}" class="sidebar-post">
            <div class="sidebar-post-title">${_escapeHtml(p.title)}</div>
            <div class="sidebar-post-meta">${_escapeHtml(p.date)} · ${_escapeHtml(p.readTime)}</div>
          </a>
        `).join('')}
      </div>
      <div class="sidebar-widget">
        <div class="sidebar-title">Kategoriler</div>
        ${cats.map(c => `
          <div class="sidebar-cat" data-filter="${_escapeHtml(c)}">
            <span>${_escapeHtml(c)}</span>
            <span class="sidebar-cat-count">${catCounts[c]}</span>
          </div>
        `).join('')}
      </div>
      <div class="sidebar-widget">
        <div class="sidebar-title">Etiketler</div>
        <div class="tag-cloud">
          ${allTags.map(t => `<button class="tag-btn" data-tag="${_escapeHtml(t)}">${_escapeHtml(t)}</button>`).join('')}
        </div>
      </div>
    `;

    sidebar.querySelectorAll('.sidebar-cat').forEach(el => {
      el.addEventListener('click', () => {
        _activeCategory = el.dataset.filter;
        _applyFilters();
        _updateFilterButtons();
      });
    });

    sidebar.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const searchEl = document.querySelector(SELECTORS.search);
        if (searchEl) {
          searchEl.value = btn.dataset.tag;
          _searchQuery   = btn.dataset.tag;
          _applyFilters();
        }
      });
    });
  }

  // Filter button UI
  function _updateFilterButtons() {
    document.querySelectorAll('[data-filter-btn]').forEach(btn => {
      btn.classList.toggle('filter-btn--active', btn.dataset.filterBtn === _activeCategory);
    });
  }

  // URL hash category
  function _readHashFilter() {
    const hash = window.location.hash.replace('#', '');
    const catMap = { teknoloji: 'Teknoloji', sektor: 'Sektör', firma: 'Firma', teknik: 'Teknik', surdurulebilirlik: 'Sürdürülebilirlik' };
    if (catMap[hash]) _activeCategory = catMap[hash];
  }

  async function init() {
    if (_state.initialized) return;

    try {
      const res = await fetch('/data/blog-posts.json');
      if (!res.ok) throw new Error('JSON yüklenemedi');
      _allPosts = await res.json();
      _filtered = [..._allPosts];
    } catch (err) {
      console.error('[Blog] Hata:', err.message);
      return;
    }

    _readHashFilter();
    _renderSidebar();
    _applyFilters();

    // Filter buttons
    const filtersEl = document.querySelector(SELECTORS.filters);
    if (filtersEl) {
      filtersEl.addEventListener('click', e => {
        const btn = e.target.closest('[data-filter-btn]');
        if (!btn) return;
        _activeCategory = btn.dataset.filterBtn;
        _applyFilters();
        _updateFilterButtons();
      });
      _updateFilterButtons();
    }

    // Search
    const searchEl = document.querySelector(SELECTORS.search);
    if (searchEl) {
      const debouncedSearch = _debounce((val) => {
        _searchQuery = val;
        _applyFilters();
      }, CONFIG.debounceMs);
      searchEl.addEventListener('input', e => debouncedSearch(e.target.value));
    }

    _state.initialized = true;
  }

  return { init };
})();

export default BlogPage;
