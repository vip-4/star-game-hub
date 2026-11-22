# -*- coding: utf-8 -*-
"""同步 llms.txt / sitemap.xml / README.md 至十一款遊戲"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ===== llms.txt =====
llms = (ROOT / "llms.txt").read_text(encoding="utf-8")
llms = llms.replace("十款原創輕量靜態 H5 遊戲入口", "十一款原創輕量靜態 H5 遊戲入口", 1)
llms = llms.replace(
    "10. **星蛇尋跡 Star Serpent** (serpent/)\n"
    "    - 類型：貪吃蛇遊戲（經典 Snake 類益智）\n"
    "    - 操作：方向鍵 / WASD 轉向、觸控方向按鈕與滑動手勢\n"
    "    - 特色：三種食物（普通/金色/炸彈）、程序生成障礙牆、關卡目標、localStorage 最高分",
    "10. **星蛇尋跡 Star Serpent** (serpent/)\n"
    "    - 類型：貪吃蛇遊戲（經典 Snake 類益智）\n"
    "    - 操作：方向鍵 / WASD 轉向、觸控方向按鈕與滑動手勢\n"
    "    - 特色：三種食物（普通/金色/炸彈）、程序生成障礙牆、關卡目標、localStorage 最高分\n\n"
    "11. **星芒合成 Star Merge** (merge/)\n"
    "    - 類型：2048 數字合成遊戲（益智策略）\n"
    "    - 操作：方向鍵 / WASD / 滑動合併、Z 撤銷、H 提示\n"
    "    - 特色：4×4 網格合成、撤銷與提示、最佳分數、流暢動畫與粒子回饋",
    1,
)
llms = llms.replace("十款遊戲皆不包含第三方遊戲素材", "十一款遊戲皆不包含第三方遊戲素材", 1)
(ROOT / "llms.txt").write_text(llms, encoding="utf-8")

# ===== sitemap.xml =====
sm = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
merge_url = """  <url>
    <loc>https://vip-4.github.io/star-game-hub/merge/</loc>
    <lastmod>2026-11-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>"""
sm = sm.replace("</urlset>", merge_url, 1)
(ROOT / "sitemap.xml").write_text(sm, encoding="utf-8")

# ===== README.md =====
rm = (ROOT / "README.md").read_text(encoding="utf-8")
rm = rm.replace("十款原創輕量靜態 H5 遊戲入口", "十一款原創輕量靜態 H5 遊戲入口", 1)
rm = rm.replace(
    "| 星蛇尋跡 Star Serpent | 貪吃蛇 | 方向鍵 / WASD / 滑動 | [serpent/](serpent/) |",
    "| 星蛇尋跡 Star Serpent | 貪吃蛇 | 方向鍵 / WASD / 滑動 | [serpent/](serpent/) |\n"
    "| 星芒合成 Star Merge | 2048 數字合成 | 方向鍵 / 滑動 / Z 撤銷 / H 提示 | [merge/](merge/) |",
    1,
)
rm = rm.replace("# 首頁（含十款遊戲卡片、比較表、FAQ、JSON-LD）", "# 首頁（含十一款遊戲卡片、比較表、FAQ、JSON-LD）", 1)
rm = rm.replace(
    "├── serpent/            # 星蛇尋跡\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    "├── serpent/            # 星蛇尋跡\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "├── merge/              # 星芒合成\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    1,
)
rm = rm.replace("十款遊戲皆**不包含任何第三方遊戲素材**", "十一款遊戲皆**不包含任何第三方遊戲素材**", 1)
(ROOT / "README.md").write_text(rm, encoding="utf-8")

print("✅ llms.txt / sitemap.xml / README.md 已同步至十一款遊戲")
