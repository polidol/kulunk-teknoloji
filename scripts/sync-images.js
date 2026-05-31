/**
 * sync-images.js — Blog görseli üretici + yerel indirici (kie.ai nano-banana-2)
 *
 * Kullanım:
 *   node scripts/sync-images.js
 *
 * Davranış:
 *   - Yerel /assets/images/blog/post-{id}.jpg dosyası varsa ATLAR
 *   - Görseli olmayan veya geçici (tempfile/aiquickdraw) URL'si olan yazıları ÜRETIR
 *   - Üretilen görseli assets/images/blog/ klasörüne indirir
 *   - blog-posts.json'a yerel yolu (/assets/images/blog/post-{id}.jpg) yazar
 *   - Her başarılı görsel sonrası JSON'u diske yazar (kırılmalara karşı)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join }    from 'path';
import { fileURLToPath } from 'url';

const __dirname     = fileURLToPath(new URL('.', import.meta.url));
const ROOT          = join(__dirname, '..');
const KIE_API_KEY   = 'ab4be97736bdc31f675cd89a20258bea';
const SUBMIT_URL    = 'https://api.kie.ai/api/v1/jobs/createTask';
const STATUS_URL    = 'https://api.kie.ai/api/v1/jobs/recordInfo';
const MODEL         = 'nano-banana-2';
const BLOG_FILE     = join(ROOT, 'data', 'blog-posts.json');
const IMAGES_DIR    = join(ROOT, 'assets', 'images', 'blog');
const STYLE_SUFFIX  = 'photorealistic cinematic lighting, 4K, dark blue ocean tones, high contrast, professional';
const POLL_INTERVAL = 5000;   // ms
const MAX_POLLS     = 36;     // maks 180 saniye

// ─── Klasörü oluştur ───────────────────────────────────────────────────────
if (!existsSync(IMAGES_DIR)) {
  mkdirSync(IMAGES_DIR, { recursive: true });
  console.log(`📁  Klasör oluşturuldu: assets/images/blog/`);
}

// ─── Yardımcı fonksiyonlar ─────────────────────────────────────────────────

function localPath(postId) {
  return join(IMAGES_DIR, `post-${postId}.jpg`);
}

function localUrl(postId) {
  return `/assets/images/blog/post-${postId}.jpg`;
}

function isLocalUrl(url) {
  if (!url) return false;
  return url.startsWith('/assets/images/blog/');
}

function needsUpdate(post) {
  // Yerel dosya zaten varsa atla
  if (isLocalUrl(post.image) && existsSync(localPath(post.id))) return false;
  return true;
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
      throw new Error(`Job başarısız: ${data?.data?.failMsg || JSON.stringify(data)}`);
    }

    process.stdout.write('.');
  }
  throw new Error(`Zaman aşımı (${MAX_POLLS * POLL_INTERVAL / 1000}s)`);
}

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`İndirme hatası HTTP ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buffer);
  return buffer.length;
}

// ─── Ana döngü ─────────────────────────────────────────────────────────────

const posts = JSON.parse(readFileSync(BLOG_FILE, 'utf8'));

let generated = 0;
let skipped   = 0;
let failed    = 0;

console.log(`\n🚀  ${posts.length} blog yazısı taranıyor...\n`);

for (const post of posts) {
  if (!needsUpdate(post)) {
    console.log(`⏭   [${post.id}] Atlandı (yerel dosya mevcut): ${post.title.substring(0, 50)}`);
    skipped++;
    continue;
  }

  if (!post.imagePrompt) {
    console.log(`⚠️   [${post.id}] imagePrompt eksik, atlanıyor: ${post.title.substring(0, 50)}`);
    skipped++;
    continue;
  }

  const reason = post.image ? 'geçici URL → yerel dosyaya dönüştürülüyor' : 'görsel yok';
  console.log(`\n🎨  [${post.id}] ${reason}`);
  console.log(`    Başlık : ${post.title.substring(0, 55)}`);
  console.log(`    Prompt : ${post.imagePrompt.substring(0, 70)}...`);

  try {
    // 1. Görsel üret
    const taskId = await submitJob(post.imagePrompt);
    if (!taskId) throw new Error('Task ID alınamadı');
    console.log(`    Task ID: ${taskId} — bekleniyor`);

    // 2. URL'yi al
    const imageUrl = await pollForUrl(taskId);
    console.log(`\n    🌐  Üretildi: ${imageUrl.substring(0, 70)}...`);

    // 3. Dosyayı indir
    const destPath = localPath(post.id);
    const bytes    = await downloadImage(imageUrl, destPath);
    const kb       = (bytes / 1024).toFixed(1);
    console.log(`    💾  İndirildi: assets/images/blog/post-${post.id}.jpg (${kb} KB)`);

    // 4. JSON'a yerel yolu yaz
    post.image = localUrl(post.id);
    writeFileSync(BLOG_FILE, JSON.stringify(posts, null, 2), 'utf8');
    generated++;

  } catch (err) {
    console.error(`\n    ❌  Hata: ${err.message}`);
    failed++;
  }

  await sleep(2000);
}

// ─── Özet ──────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(50));
console.log(`✅  İndirilen : ${generated}`);
console.log(`⏭   Atlanan   : ${skipped}`);
console.log(failed ? `❌  Başarısız : ${failed}` : `✨  Hata yok`);
console.log('─'.repeat(50));

if (generated > 0) {
  console.log('\n📦  Sonraki adım:');
  console.log('    git add assets/images/blog/ data/blog-posts.json');
  console.log('    git commit -m "feat: blog görselleri yerel klasöre indirildi"');
  console.log('    git push\n');
}
