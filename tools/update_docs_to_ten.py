# -*- coding: utf-8 -*-
"""同步 llms.txt / sitemap.xml / README.md 至十款遊戲"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ===== llms.txt =====
llms = (ROOT / "llms.txt").read_text(encoding="utf-8")
llms = llms.replace("九款原創輕量靜態 H5 遊戲入口", "十款原創輕量靜態 H5 遊戲入口", 1)
llms = llms.replace(
    "9. **星脈分支 Star Branch** (branch/)\n"
    "   - 類型：分支防守遊戲（多線分裂／合併 + 顏色匹配）\n"
    "   - 操作：1-4 或 A/S/D/F 切換分支顏色、Space 分裂／合併模式、觸控分支按鈕\n"
    "   - 特色：四色能量分支、同色吸收、連擊倍率、合併模式雙倍得分、星星與炸彈道具",
    "9. **星脈分支 Star Branch** (branch/)\n"
    "   - 類型：分支防守遊戲（多線分裂／合併 + 顏色匹配）\n"
    "   - 操作：1-4 或 A/S/D/F 切換分支顏色、Space 分裂／合併模式、觸控分支按鈕\n"
    "   - 特色：四色能量分支、同色吸收、連擊倍率、合併模式雙倍得分、星星與炸彈道具\n\n"
    "10. **星蛇尋跡 Star Serpent** (serpent/)\n"
    "    - 類型：貪吃蛇遊戲（經典 Snake 類益智）\n"
    "    - 操作：方向鍵 / WASD 轉向、觸控方向按鈕與滑動手勢\n"
    "    - 特色：三種食物（普通/金色/炸彈）、程序生成障礙牆、關卡目標、localStorage 最高分",
    1,
)
llms = llms.replace("九款遊戲皆不包含第三方遊戲素材", "十款遊戲皆不包含第三方遊戲素材", 1)
(ROOT / "llms.txt").write_text(llms, encoding="utf-8")

# ===== sitemap.xml =====
sm = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
serpent_url = """  <url>
    <loc>https://vip-4.github.io/star-game-hub/serpent/</loc>
    <lastmod>2026-11-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>"""
sm = sm.replace("</urlset>", serpent_url, 1)
(ROOT / "sitemap.xml").write_text(sm, encoding="utf-8")

# ===== README.md =====
rm = (ROOT / "README.md").read_text(encoding="utf-8")
rm = rm.replace("九款原創輕量靜態 H5 遊戲入口", "十款原創輕量靜態 H5 遊戲入口", 1)
rm = rm.replace(
    "| 星脈分支 Star Branch | 分支防守 | 1-4 切色、Space 分裂合併 / 觸控 | [branch/](branch/) |",
    "| 星脈分支 Star Branch | 分支防守 | 1-4 切色、Space 分裂合併 / 觸控 | [branch/](branch/) |\n"
    "| 星蛇尋跡 Star Serpent | 貪吃蛇 | 方向鍵 / WASD / 滑動 | [serpent/](serpent/) |",
    1,
)
rm = rm.replace("# 首頁（含九款遊戲卡片、比較表、FAQ、JSON-LD）", "# 首頁（含十款遊戲卡片、比較表、FAQ、JSON-LD）", 1)
rm = rm.replace(
    "├── branch/             # 星脈分支\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    "├── branch/             # 星脈分支\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "├── serpent/            # 星蛇尋跡\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    1,
)
rm = rm.replace("九款遊戲皆**不包含任何第三方遊戲素材**", "十款遊戲皆**不包含任何第三方遊戲素材**", 1)
(ROOT / "README.md").write_text(rm, encoding="utf-8")

print("✅ llms.txt / sitemap.xml / README.md 已同步至十款遊戲")
