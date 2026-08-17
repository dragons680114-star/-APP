# Vercel 部署說明

此版本已將 AI Studio 匯出時遺失的元件引用移除，保留可用的核心功能：抽籤、名單管理、Excel 匯入、獎項、統計、歷史紀錄、系統設定與全螢幕抽籤。

## Vercel 設定
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

此版本不需要 Gemini API Key，也不需要 Google AI Studio 登入即可使用部署後的公開網址。

## 管理員 PIN
預設 PIN 為 `8888`。目前以瀏覽器提示框進行管理員驗證，不會送到伺服器。
