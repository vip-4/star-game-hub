# 星遊戲樂園 Star Game Hub

七款原創輕量靜態 H5 遊戲入口，無後端、無外部素材、免註冊、免下載。

## 線上體驗

- **GitHub Pages**：https://vip-4.github.io/star-game-hub/
- **Cloudflare Pages**：(部署後填入)

## 遊戲清單

| 遊戲 | 類型 | 操作 | 連結 |
|------|------|------|------|
| 星耀拉霸 Star Spin | 三轉輪老虎機 | 滑鼠/觸控、空白鍵 | [slots/](slots/) |
| 星節奏 Star Beat | 四軌節奏 | D F J K / 方向鍵 / 觸控 | [rhythm/](rhythm/) |
| 星際跑者 Star Runner | 無限跑酷 | 空白鍵/上鍵/W / 觸控 | [runner/](runner/) |
| 星影解謎 Star Puzzle | 分身平台解謎 | A/D、空白鍵、C/X / 觸控 | [puzzle/](puzzle/) |
| 星際射手 Star Shooter | 太空射擊 (STG) | ←/→ 移動、Space 發射、P 暫停 / 觸控 | [shooter/](shooter/) |
| 星軌防衛 Star Tunnel | 管狀射擊 | ←/→ 移動、Space 發射、Shift 翻轉 / 觸控 | [tunnel/](tunnel/) |
| 星塵危機 Star Asteroids | 小行星射擊 | ←/→ 旋轉、↑ 推進、Space 發射 / 觸控 | [asteroids/](asteroids/) |

## 技術特色

- **零外部依賴**：所有圖形由 Canvas 2D 程式繪製，所有音效由 Web Audio API 即時合成，無圖片、音檔、字型、遊戲引擎請求
- **純靜態部署**：單一目錄即可部署到 GitHub Pages、Cloudflare Pages、Netlify、Vercel 等任意靜態空間
- **無障礙優先**：語意化 HTML、ARIA 標籤、鍵盤完整操作、支援 `prefers-reduced-motion`
- **SEO/GEO 就緒**：完整 JSON-LD 結構化資料、Open Graph、Twitter Card、llms.txt、sitemap.xml
- **隱私友善**：無追蹤、無 Cookie、無個資蒐集、無後端資料庫
- **響應式設計**：支援桌機、平板、手機，自動適應裝置像素比

## 本機開發

```bash
# 直接用靜態伺服器即可（無建置步驟）
npx serve .
# 或
python -m http.server 8000
```

然後開啟 `http://localhost:8000` 或 `http://localhost:3000`。

## 目錄結構

```
game-hub-static/
├── index.html          # 首頁（含七款遊戲卡片、比較表、FAQ、JSON-LD）
├── css/style.css       # 共用樣式
├── llms.txt            # LLM 友善摘要
├── sitemap.xml         # 網站地圖
├── og-image.png        # 社群分享圖（1200×630）
├── slots/              # 星耀拉霸
│   ├── index.html
│   ├── css/style.css
│   └── js/game.js
├── rhythm/             # 星節奏
│   ├── index.html
│   ├── css/style.css
│   └── js/game.js
├── runner/             # 星際跑者
│   ├── index.html
│   ├── css/style.css
│   └── js/game.js
├── puzzle/             # 星影解謎
│   ├── index.html
│   ├── css/style.css
│   └── js/game.js
├── shooter/            # 星際射手
│   ├── index.html
│   ├── css/style.css
│   └── js/game.js
├── tunnel/             # 星軌防衛
│   ├── index.html
│   ├── css/style.css
│   └── js/game.js
├── asteroids/          # 星塵危機
│   ├── index.html
│   ├── css/style.css
│   └── js/game.js
└── tools/              # 開發工具（煙測、OG 圖生成）
```

## 部署指南

### GitHub Pages
1. 將 `game-hub-static/` 內容推送到 `gh-pages` 分支或 `main` 分支的 `/docs` 資料夾
2. 在 Repository Settings → Pages 設定來源
3. 自訂網域可設定 CNAME 指向 `vip-4.github.io`

### Cloudflare Pages
1. 連接 GitHub 儲存庫
2. Build command: (留空)
3. Build output directory: `game-hub-static` (或專案根目錄)
4. 部署完成後獲得 `*.pages.dev` 網域

## 授權聲明

本專案所有程式碼、遊戲設計、關卡資料、圖形繪製邏輯與音效合成邏輯均為原創開發。

**星耀拉霸**使用虛擬幣系統，不具現金價值，不得兌換現金或有價物品，僅供娛樂展示用途。

七款遊戲皆**不包含任何第三方遊戲素材**（圖片、音檔、字型、引擎等），避免素材授權風險。

## 致謝

- 開發工具：VS Code、Node.js、Python
- 部署平台：GitHub Pages、Cloudflare Pages
- 規格參考：Schema.org GameApplication、Open Graph Protocol、llms.txt 標準