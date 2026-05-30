/**
 * sync-images.js — Blog görseli üretici (kie.ai nano-banana-2)
 *
 * Kullanım:
 *   node scripts/sync-images.js
 *
 * Davranış:
 *   - Kalıcı cloudfront.net veya cdn.kie.ai URL'si olan yazıları ATLAR
 *   - Görseli olmayan veya geçici (tempfile/aiquickdraw) URL'si olan yazıları YENIDEN ÜRETIR
 *   - Her başarılı görsel sonrası blog-posts.json'u diske yazar (kırılmalara karşı)
 */

import { readFileSync, writeFileSync } from 'fs';

const KIE_API_KEY   = 'ab4be97736bdc31f675cd89a20258bea';
const SUBMIT_URL    = 'https://api.kie.ai/api/v1/jobs/createTask';
const STATUS_URL    = 'https://api.kie.ai/api/v1/jobs/recordInfo';
const MODEL         = 'nano-banana-2';
const BLOG_FILE     = new URL('../data/blog-posts.json', import.meta.url)
                        .pathname.replace(/^\/([A-Za-z]:)/, '$1');
const STYLE_SUFFIX  = 'photorealistic cinematic lighting, 4K, dark blue ocean tones, high contrast, professional';
const POLL_INTERVAL = 5000;   // ms — her 5 saniyede bir kontrol
const MAX_POLLS     = 36;     // maks 180 saniye bekle

// ─── Yardımcı fonksiyonlar ─────────────────────────────────────────────────

if (!KIE_API_KEY) {
  console.error('\n❌  KIE_API_KEY eksik.');
  process.exit(1);
}

function isExpiredUrl(url) {
  if (!url) return true;
  return url.includes('tempfile.aiquickdraw.com') || url.includes('aiquickdraw.com');
}

function isPermanentUrl(url) {
  if (!url) return false;
  return url.includes('cloudfront.net') || url.includes('cdn.kie.ai');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function submitJob(prompt) {
  const res = await fetch(SUBMIT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      input: {
        prompt:       `${prompt}, ${STYLE_SUFFIX}`,
        aspect_ratio: '16:9',
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.code !== 200) throw new Error(`API hatası: ${JSON.stringify(data)}`);
  return data?.data?.taskId ?? null;
}

async function pollForUrl(taskId) {
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL);
    const res = await fetch(`${STATUS_URL}?taskId=${taskId}`, {
      headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
    });
    if (!res.ok) continue;

    const data = await res.json();
    if (data.code !== 200) continue;

    const state = data?.data?.state;

    if (state === 'success') {
      // resultJson, URL içeren JSON string
      const resultJson = data?.data?.resultJson;
      if (resultJson) {
        try {
          const parsed = JSON.parse(resultJson);
          const url = parsed?.resultUrls?.[0];
          if (url) return url;
        } catch {
          throw new Error(`resultJson parse hatası: ${resultJson}`);
        }
      }
    }

    if (state === 'fail') {
      throw new Error(`Job ${taskId} başarısız: ${data?.data?.failMsg || JSON.stringify(data)}`);
    }

    process.stdout.write('.');
  }
  throw new Error(`Job ${taskId} zaman aşımına uğradı (${MAX_POLLS * POLL_INTERVAL / 1000}s)`);
}

// ─── Ana döngü ─────────────────────────────────────────────────────────────

const posts = JSON.parse(readFileSync(BLOG_FILE, 'utf8'));

let generated = 0;
let skipped   = 0;
let failed    = 0;

console.log(`\n🚀  ${posts.length} blog yazısı taranıyor...\n`);

for (const post of posts) {
  if (isPermanentUrl(post.image)) {
    console.log(`⏭   [${post.id}] Atlandı (kalıcı URL): ${post.title.substring(0, 50)}`);
    skipped++;
    continue;
  }

  if (!post.imagePrompt) {
    console.log(`⚠️   [${post.id}] imagePrompt eksik, atlanıyor: ${post.title.substring(0, 50)}`);
    skipped++;
    continue;
  }

  const reason = post.image ? 'geçici URL yenileniyor' : 'görsel yok';
  console.log(`\n🎨  [${post.id}] ${reason}: ${post.title.substring(0, 55)}`);
  console.log(`    Prompt: ${post.imagePrompt.substring(0, 70)}...`);

  try {
    // 1. Job gönder
    const taskId = await submitJob(post.imagePrompt);
    if (!taskId) throw new Error('Task ID alınamadı');
    console.log(`    Task ID: ${taskId} — bekleniyor`);

    // 2. Sonucu bekle
    const imageUrl = await pollForUrl(taskId);
    console.log(`\n    ✅  URL: ${imageUrl}`);

    // 3. JSON güncelle ve hemen kaydet
    post.image = imageUrl;
    writeFileSync(BLOG_FILE, JSON.stringify(posts, null, 2), 'utf8');
    generated++;

  } catch (err) {
    console.error(`\n    ❌  Hata: ${err.message}`);
    failed++;
  }

  // Rate limiting — ardışık istekler arası 2 saniye bekle
  await sleep(2000);
}

// ─── Özet ──────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(50));
console.log(`✅  Üretilen : ${generated}`);
console.log(`⏭   Atlanan  : ${skipped}`);
console.log(failed ? `❌  Başarısız: ${failed}` : `✨  Hata yok`);
console.log('─'.repeat(50));

if (generated > 0) {
  console.log('\n📦  Sonraki adım:');
  console.log('    git add data/blog-posts.json');
  console.log('    git commit -m "feat: blog görselleri güncellendi"');
  console.log('    git push\n');
}
