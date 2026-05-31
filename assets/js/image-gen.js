/**
 * Külünk Teknoloji — Görsel Üretim İstemcisi
 * Vercel serverless function üzerinden Nano Banana 2 çağırır.
 * API anahtarı yalnızca sunucu tarafında saklanır.
 */
const ImageGen = (() => {
  'use strict';

  // Vercel → /api/generate-image (Node.js)
  // cPanel  → /api/generate-image.php (PHP)
  // Otomatik algıla: PHP dosyası varsa onu kullan
  const ENDPOINT = '/api/generate-image';

  async function generate(prompt, aspectRatio = '16:9') {
    try {
      // Proxy polling yapıyor — max ~120s sürebilir, timeout 150s
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 150_000);

      const res = await fetch(ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt, aspectRatio }),
        signal:  controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (res.status === 503) {
        console.warn('[ImageGen] API anahtarı henüz yapılandırılmadı — placeholder kullanılıyor.');
        return null;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[ImageGen] Hata:', res.status, err.error ?? '');
        return null;
      }

      const data = await res.json();
      return data.image_url ?? null;

    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('[ImageGen] Zaman aşımı (150s) — görsel üretilemedi.');
      } else {
        console.error('[ImageGen] Ağ hatası:', err.message);
      }
      return null;
    }
  }

  async function fillMissingImages() {
    const els = document.querySelectorAll('[data-image-prompt]:not([data-img-loaded])');
    for (const el of els) {
      const url = await generate(el.dataset.imagePrompt);
      if (url) {
        if (el.tagName === 'IMG') {
          el.src = url;
          el.onload = () => el.classList.replace('img-placeholder', 'img-loaded');
        } else {
          el.style.backgroundImage = `url(${url})`;
          el.classList.replace('img-placeholder', 'img-loaded');
        }
        el.setAttribute('data-img-loaded', 'true');
      }
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  async function generateAllBlogImages() {
    const res   = await fetch('/data/blog-posts.json');
    const posts = await res.json();
    let count = 0;
    for (const post of posts) {
      if (!post.image && post.imagePrompt) {
        console.log(`[ImageGen] Üretiliyor: ${post.title}`);
        const url = await generate(post.imagePrompt);
        if (url) { post.image = url; count++; }
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    console.log(`[ImageGen] Tamamlandı: ${count} görsel üretildi.`);
    return posts;
  }

  return { generate, fillMissingImages, generateAllBlogImages };
})();

export default ImageGen;
