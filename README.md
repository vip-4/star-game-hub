# 星遊戲樂園 Star Game Hub

單一靜態網站入口，收錄兩款原創 H5 遊戲：

- **星耀拉霸 Star Spin**（`/slots/`）：三轉輪老虎機，使用加密隨機數加權抽樣與虛擬幣，僅供娛樂。
- **星節奏 Star Beat**（`/rhythm/`）：四軌節奏遊戲，圖形與音效全部由程式即時產生。

兩款遊戲都不使用外部圖片、音檔、字型或遊戲引擎套件，無後端、無資料庫，可直接部署到任何靜態托管平台。

> 星耀拉霸的虛擬幣不具現金價值，不得兌換現金或有價物品。兩款遊戲皆非任何既有商業遊戲的移植或仿作。

---

## 目錄結構

```
game-hub-static/
├── index.html               # 整合入口首頁
├── css/style.css
├── slots/                   # 星耀拉霸遊戲
│   ├── index.html
│   ├── css/style.css
│   ├── js/game.js
│   └── og-image.png
├── rhythm/                  # 星節奏遊戲
│   ├── index.html
│   ├── css/style.css
│   ├── js/game.js
│   └── og-image.png
├── og-image.png             # 整合站分享圖
├── .nojekyll
├── _headers                 # Cloudflare Pages 標頭
├── robots.txt
├── sitemap.xml
├── llms.txt
└── tools/                   # 部署與測試腳本
```

---

## SEO / GEO

- 語意化 HTML、完整 meta、canonical、Open Graph、Twitter Card
- JSON-LD：`WebSite`、`Organization`、`WebPage`、`ItemList`（兩款遊戲）、`FAQPage`（5 題）
- 兩個遊戲子頁的 canonical 與社群中繼資料已指向整合站對應路徑
- `sitemap.xml` 收錄首頁與兩個遊戲頁；`llms.txt` 提供生成式引擎友善摘要

正式網址：https://vip-4.github.io/star-game-hub/

原始碼備份：
- GitHub：https://github.com/vip-4/star-game-hub
- Gitee：https://gitee.com/vip882/star-game-hub
- AtomGit：https://atomgit.com/zzw1208/star-game-hub

---

## 本機驗證

```bash
node tools/smoke-test-slots.js
node tools/smoke-test-rhythm.js
python -m http.server 8080 -d .
```

---

## 部署

```bash
# GitHub Pages
GH_TOKEN=<token> GH_REPO=star-game-hub python tools/github_pages_deploy.py

# Cloudflare Pages
CF_ACCOUNT_ID=<account> CF_PROJECT_NAME=star-game-hub CF_API_TOKEN=<token> \
  python tools/cloudflare_pages_deploy.py

# Gitee / AtomGit
GITEE_TOKEN=<token> ATOMGIT_TOKEN=<token> python tools/gitee_atomgit_sync.py
```

憑證僅由環境變數傳入，請勿寫入任何檔案。
