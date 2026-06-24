# HautCoiffure 高奢髮藝展館

沉浸式沙龍藝術 Web App，包含橫向藝術展廳、207 幅本地 AI 髮藝 Lookbook、背景音樂沙龍、PWA 安裝提醒、桌面圖標與分享預覽圖。

## 開發

```bash
npm install
npm run dev
```

## 驗證

```bash
npm run build
npm run preview
```

## 主要資產

- PWA manifest: `public/manifest.webmanifest`
- Service Worker: `public/sw.js`
- App icons: `public/icons/`
- Share preview image: `public/share-card.png`
- Icon generator: `scripts/generate_brand_assets.py`

## 部署

此專案使用 Vite，可直接部署到 Vercel。Production build 指令為 `npm run build`，輸出資料夾為 `dist`。
