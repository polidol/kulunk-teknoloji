// Vercel Serverless Function — kie.ai Nano Banana 2 Async Proxy
// KIE_API_KEY: Vercel Dashboard > Settings > Environment Variables > KIE_API_KEY

const CREATE_URL  = 'https://api.kie.ai/api/v1/jobs/createTask';
const STATUS_URL  = 'https://api.kie.ai/api/v1/jobs/recordInfo';
const MODEL       = 'nano-banana-2';
const STYLE_SUFFIX =
  'photorealistic, cinematic lighting, 4K ultra detail, ' +
  'professional photography, deep blue ocean industrial tones, high contrast';

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS        = 30;   // 120 saniye max

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export default async function handler(req, res) {
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:8080';

  res.setHeader('Access-Control-Allow-Origin',  origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'API anahtarı yapılandırılmamış.',
      hint:  'Vercel Dashboard > Settings > Environment Variables > KIE_API_KEY'
    });
  }

  const { prompt, aspectRatio = '16:9' } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return res.status(400).json({ error: 'Geçerli bir prompt gerekli.' });
  }

  const safePrompt = prompt.trim().slice(0, 500);

  try {
    // ── 1. Görsel üretim görevi oluştur ────────────────────────────────────
    const createRes = await fetch(CREATE_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        input: {
          prompt:       `${safePrompt}, ${STYLE_SUFFIX}`,
          aspect_ratio: aspectRatio,
        }
      })
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      console.error('[generate-image] createTask hata:', createRes.status, errBody);
      return res.status(createRes.status).json({ error: 'Görsel servisi hatası.', status: createRes.status });
    }

    const createData = await createRes.json();
    if (createData.code !== 200) {
      console.error('[generate-image] createTask code!=200:', createData);
      return res.status(502).json({ error: 'Görev oluşturulamadı.', detail: createData.msg });
    }

    const taskId = createData?.data?.taskId;
    if (!taskId) {
      console.error('[generate-image] taskId alınamadı:', createData);
      return res.status(502).json({ error: 'Task ID alınamadı.' });
    }

    // ── 2. Sonuç hazır olana kadar polling ─────────────────────────────────
    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(POLL_INTERVAL_MS);

      const statusRes = await fetch(`${STATUS_URL}?taskId=${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      if (statusData.code !== 200) continue;

      const state = statusData?.data?.state;

      if (state === 'success') {
        const resultJson = statusData?.data?.resultJson;
        let imageUrl = null;
        try {
          imageUrl = JSON.parse(resultJson)?.resultUrls?.[0] ?? null;
        } catch {
          console.error('[generate-image] resultJson parse hatası:', resultJson);
        }

        if (!imageUrl) {
          return res.status(502).json({ error: 'Görsel URL alınamadı.' });
        }

        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).json({ image_url: imageUrl });
      }

      if (state === 'fail') {
        console.error('[generate-image] Görev başarısız:', statusData?.data?.failMsg);
        return res.status(502).json({ error: 'Görsel üretimi başarısız.', detail: statusData?.data?.failMsg });
      }
      // waiting / queuing / generating → döngü devam eder
    }

    return res.status(504).json({ error: 'Zaman aşımı: görsel üretimi tamamlanamadı.' });

  } catch (err) {
    console.error('[generate-image] İstek hatası:', err.message);
    return res.status(500).json({ error: 'Sunucu hatası.', detail: err.message });
  }
}
