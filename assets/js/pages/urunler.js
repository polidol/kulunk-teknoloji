const UrunlerPage = (() => {
  'use strict';

  const SELECTORS = { grid: '#urunler-page-grid' };

  let _state = { initialized: false };

  function _escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Gyro ring sizes per product (outer → inner radius pairs)
  const _gyroConfig = {
    'km-1': { rings: [60, 46, 32], accent: '#0099CC', glow: '0066CC', speed: [8, 5, 3.5] },
    'km-3': { rings: [72, 55, 38], accent: '#00AADD', glow: '0099CC', speed: [10, 7, 4.5] },
    'km-7': { rings: [84, 65, 44], accent: '#00CCFF', glow: '00AADD', speed: [12, 8, 5.5] },
  };

  function _renderGyro(product) {
    const cfg = _gyroConfig[product.id] || _gyroConfig['km-3'];
    const [r1, r2, r3] = cfg.rings;
    const cx = 90, cy = 90;
    const size = 180;
    return `
      <div class="product-card-visual" aria-hidden="true">
        <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" class="product-gyro-svg">
          <defs>
            <radialGradient id="gyro-glow-${product.id}" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#${cfg.glow}" stop-opacity="0.18"/>
              <stop offset="100%" stop-color="#${cfg.glow}" stop-opacity="0"/>
            </radialGradient>
            <filter id="gyro-blur-${product.id}" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5"/>
            </filter>
          </defs>
          <!-- Ambient glow -->
          <circle cx="${cx}" cy="${cy}" r="${r1 + 14}" fill="url(#gyro-glow-${product.id})"/>
          <!-- Ring 1 (outer, horizontal orbit) -->
          <ellipse cx="${cx}" cy="${cy}" rx="${r1}" ry="${Math.round(r1 * 0.28)}"
            stroke="${cfg.accent}" stroke-width="2.5" fill="none" opacity="0.75"
            style="animation:gyroRingH ${cfg.speed[0]}s linear infinite;transform-box:fill-box;transform-origin:center;"/>
          <!-- Ring 2 (mid, counter-orbit) -->
          <ellipse cx="${cx}" cy="${cy}" rx="${r2}" ry="${Math.round(r2 * 0.42)}"
            stroke="${cfg.accent}" stroke-width="2" fill="none" opacity="0.55"
            style="animation:gyroRingD ${cfg.speed[1]}s linear infinite;transform-box:fill-box;transform-origin:center;"/>
          <!-- Ring 3 (inner, near-vertical orbit) -->
          <ellipse cx="${cx}" cy="${cy}" rx="${Math.round(r3 * 0.22)}" ry="${r3}"
            stroke="${cfg.accent}" stroke-width="1.8" fill="none" opacity="0.45"
            style="animation:gyroRingV ${cfg.speed[2]}s linear infinite;transform-box:fill-box;transform-origin:center;"/>
          <!-- Core sphere -->
          <circle cx="${cx}" cy="${cy}" r="12" fill="rgba(0,102,204,0.35)" stroke="${cfg.accent}" stroke-width="1.5" opacity="0.9"/>
          <circle cx="${cx - 4}" cy="${cy - 4}" r="4" fill="rgba(255,255,255,0.2)"/>
          <!-- Spoke indicators -->
          <line x1="${cx - r1}" y1="${cy}" x2="${cx - r1 + 8}" y2="${cy}" stroke="${cfg.accent}" stroke-width="1.5" opacity="0.5"/>
          <line x1="${cx + r1 - 8}" y1="${cy}" x2="${cx + r1}" y2="${cy}" stroke="${cfg.accent}" stroke-width="1.5" opacity="0.5"/>
        </svg>
        <div class="product-gyro-label">${_escapeHtml(product.series)}</div>
      </div>`;
  }

  function _renderProduct(product) {
    const badgeHtml = product.badge
      ? `<span class="product-card-badge">${_escapeHtml(product.badge)}</span>`
      : '';

    const featuresHtml = product.features.map(f =>
      `<li class="feature-item">${_escapeHtml(f)}</li>`
    ).join('');

    const useCasesHtml = product.use_cases.map(u =>
      `<li class="feature-item">${_escapeHtml(u)}</li>`
    ).join('');

    const specsHtml = Object.entries(product.specs).map(([k, v]) => `
      <tr>
        <td style="padding:var(--space-2) var(--space-4);color:var(--color-text-muted);font-family:var(--font-label);font-size:var(--text-sm);text-transform:uppercase;letter-spacing:var(--tracking-wide);">${_escapeHtml(k.replace(/_/g,' '))}</td>
        <td style="padding:var(--space-2) var(--space-4);color:var(--color-text-primary);font-family:var(--font-mono);font-size:var(--text-sm);">${_escapeHtml(v)}</td>
      </tr>
    `).join('');

    return `
      <article class="card product-card" id="${_escapeHtml(product.id)}" ${product.featured ? 'style="border-color:var(--color-primary-500);box-shadow:var(--shadow-glow-sm);"' : ''} data-tilt>
        ${badgeHtml}
        ${_renderGyro(product)}
        <div class="product-card-header">
          <div class="product-card-series">${_escapeHtml(product.series)}</div>
          <div class="product-card-name">${_escapeHtml(product.name)}</div>
          <div class="product-card-target">${_escapeHtml(product.target)}</div>
        </div>

        <p style="font-size:var(--text-sm);color:var(--color-text-secondary);line-height:var(--leading-relaxed);margin-bottom:var(--space-6);">${_escapeHtml(product.description)}</p>

        <div class="product-card-specs" style="grid-template-columns:repeat(2,1fr);">
          <div class="spec-item">
            <span class="spec-value">${_escapeHtml(product.specs.moment)}</span>
            <span class="spec-label">Stabilizasyon Momenti</span>
          </div>
          <div class="spec-item">
            <span class="spec-value">${_escapeHtml(product.specs.weight)}</span>
            <span class="spec-label">Sistem Ağırlığı</span>
          </div>
          <div class="spec-item">
            <span class="spec-value">${_escapeHtml(product.specs.idle_power)}</span>
            <span class="spec-label">Bekleme Gücü</span>
          </div>
          <div class="spec-item">
            <span class="spec-value">${_escapeHtml(product.specs.ip_rating)}</span>
            <span class="spec-label">Su Koruma Sınıfı</span>
          </div>
        </div>

        <!-- Full spec table -->
        <details style="margin-bottom:var(--space-6);">
          <summary style="cursor:pointer;font-family:var(--font-label);font-size:var(--text-sm);font-weight:600;color:var(--color-accent-400);letter-spacing:var(--tracking-wide);text-transform:uppercase;margin-bottom:var(--space-3);">
            Tam Teknik Özellikler
          </summary>
          <table style="width:100%;border-collapse:collapse;margin-top:var(--space-3);">
            <tbody>${specsHtml}</tbody>
          </table>
        </details>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);margin-bottom:var(--space-6);">
          <div>
            <div style="font-family:var(--font-label);font-size:var(--text-xs);font-weight:700;letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--color-text-muted);margin-bottom:var(--space-3);">Özellikler</div>
            <ul class="product-card-features">${featuresHtml}</ul>
          </div>
          <div>
            <div style="font-family:var(--font-label);font-size:var(--text-xs);font-weight:700;letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--color-text-muted);margin-bottom:var(--space-3);">Kullanım Senaryoları</div>
            <ul class="product-card-features">${useCasesHtml}</ul>
          </div>
        </div>

        <a href="/iletisim/" class="btn ${product.featured ? 'btn-primary' : 'btn-outline'} btn-md" style="width:100%;justify-content:center;">
          Teklif Al →
        </a>
      </article>
    `;
  }

  async function init() {
    if (_state.initialized) return;

    const grid = document.querySelector(SELECTORS.grid);
    if (!grid) return;

    try {
      const res = await fetch('/data/products.json');
      if (!res.ok) throw new Error('JSON yüklenemedi');
      const products = await res.json();

      grid.innerHTML = products.map(_renderProduct).join('');

      // Handle hash navigation
      const hash = window.location.hash;
      if (hash) {
        const target = document.querySelector(hash);
        if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
      }

      // Init CardTilt for rendered products
      const { default: CardTilt } = await import('../components/card-tilt.js');
      CardTilt.init();

    } catch (err) {
      console.error('[Urunler] Hata:', err.message);
      grid.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:4rem 0;">Ürünler yüklenirken bir hata oluştu.</p>';
    }

    _state.initialized = true;
  }

  return { init };
})();

export default UrunlerPage;
