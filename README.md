# Külünk Teknoloji — Web Sitesi

Deniz Stabilizasyon Sistemleri | İstanbul Teknopark | Yerli Teknoloji

## Hızlı Başlangıç

Build adımı gerekmez. Yerel sunucu başlat:

```bash
python -m http.server 8080
# veya
npx serve .
```

Tarayıcı: http://localhost:8080

## AI Görsel Üretimi (kie.ai / Nano Banana 2)

### Yöntem 1 — Tarayıcı Konsolu (lokal test)

```js
import('/assets/js/image-gen.js')
  .then(m => m.default.generateAllBlogImages())
```

### Yöntem 2 — Node.js scripti (deploy öncesi)

```bash
KIE_API_KEY=ab4be97736bdc31f675cd89a20258bea node scripts/sync-images.js
git add data/blog-posts.json
git commit -m "feat: blog görselleri eklendi"
git push
```

API anahtarı olmadan site tam çalışır — blog kartlarında CSS shimmer placeholder gösterilir.

## Vercel Deployment

### İlk Kurulum

```bash
npm install -g vercel
vercel link
vercel env add KIE_API_KEY
# → Production seç, API anahtarını gir: ab4be97736bdc31f675cd89a20258bea
vercel --prod
```

### GitHub Actions Otomatik Deploy

`Settings > Secrets` altına şunları ekle:

| Secret | Kaynak |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `vercel whoami` veya `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `vercel link` sonrası `.vercel/project.json` |

### Custom Domain

```bash
vercel domains add kulunkmakine.com
```

## Proje Yapısı

```
├── index.html              Ana sayfa
├── blog/index.html         Blog listesi
├── urunler/index.html      Ürün katalogu
├── hakkimizda/index.html   Hakkımızda
├── iletisim/index.html     İletişim formu
├── api/generate-image.js   Vercel serverless (API proxy)
├── assets/css/             Token + component + section CSS
├── assets/js/              Vanilla ES6 modülleri
├── data/                   JSON veri dosyaları
├── scripts/sync-images.js  Görsel üretim scripti
└── vercel.json             Routing + CSP headers
```

## Teknoloji

- Vanilla HTML5 / CSS3 / ES6+ — framework yok
- CSS token sistemi (colors, typography, spacing, animations)
- Vanilla JS IIFE modülleri
- kie.ai Nano Banana 2 görsel üretimi
- Vercel serverless function (API proxy)
- GitHub Actions CI/CD
