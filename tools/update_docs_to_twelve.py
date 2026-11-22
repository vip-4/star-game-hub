# -*- coding: utf-8 -*-
"""同步 llms.txt / sitemap.xml / README.md 至十二款遊戲"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ===== llms.txt =====
llms = (ROOT / "llms.txt").read_text(encoding="utf-8")
llms = llms.replace("十一款原創輕量靜態 H5 遊戲入口", "十二款原創輕量靜態 H5 遊戲入口", 1)
llms = llms.replace(
    "11. **星芒合成 Star Merge** (merge/)\n"
    "    - 類型：2048 數字合成遊戲（益智策略）\n"
    "    - 操作：方向鍵 / WASD / 滑動合併、Z 撤銷、H 提示\n"
    "    - 特色：4×4 網格合成、撤銷與提示、最佳分數、流暢動畫與粒子回饋",
    "11. **星芒合成 Star Merge** (merge/)\n"
    "    - 類型：2048 數字合成遊戲（益智策略）\n"
    "    - 操作：方向鍵 / WASD / 滑動合併、Z 撤銷、H 提示\n"
    "    - 特色：4×4 網格合成、撤銷與提示、最佳分數、流暢動畫與粒子回饋\n\n"
    "12. **星際對決 Star Duel** (duel/)\n"
    "    - 類型：雙人同屏對戰遊戲（空中曲棍球風格）\n"
    "    - 操作：玩家 1 用 WASD、玩家 2 用方向鍵、觸控拖曳各自半場戰機\n"
    "    - 特色：本地雙人 / AI 對手、圓形碰撞物理、動量轉移、球門得分、先得 7 分獲勝",
    1,
)
llms = llms.replace("十一款遊戲皆不包含第三方遊戲素材", "十二款遊戲皆不包含第三方遊戲素材", 1)
(ROOT / "llms.txt").write_text(llms, encoding="utf-8")

# ===== sitemap.xml =====
sm = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
duel_url = """  <url>
    <loc>https://vip-4.github.io/star-game-hub/duel/</loc>
    <lastmod>2026-11-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>"""
sm = sm.replace("</urlset>", duel_url, 1)
(ROOT / "sitemap.xml").write_text(sm, encoding="utf-8")

# ===== README.md =====
rm = (ROOT / "README.md").read_text(encoding="utf-8")
rm = rm.replace("十一款原創輕量靜態 H5 遊戲入口", "十二款原創輕量靜態 H5 遊戲入口", 1)
rm = rm.replace(
    "| 星芒合成 Star Merge | 2048 數字合成 | 方向鍵 / 滑動 / Z 撤銷 / H 提示 | [merge/](merge/) |",
    "| 星芒合成 Star Merge | 2048 數字合成 | 方向鍵 / 滑動 / Z 撤銷 / H 提示 | [merge/](merge/) |\n"
    "| 星際對決 Star Duel | 雙人同屏對戰 | 玩家1 WASD / 玩家2 方向鍵 / 觸控 | [duel/](duel/) |",
    1,
)
rm = rm.replace("# 首頁（含十一款遊戲卡片、比較表、FAQ、JSON-LD）", "# 首頁（含十二款遊戲卡片、比較表、FAQ、JSON-LD）", 1)
rm = rm.replace(
    "├── merge/              # 星芒合成\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    "├── merge/              # 星芒合成\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "├── duel/               # 星際對決\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    1,
)
rm = rm.replace("十一款遊戲皆**不包含任何第三方遊戲素材**", "十二款遊戲皆**不包含任何第三方遊戲素材**", 1)
(ROOT / "README.md").write_text(rm, encoding="utf-8")

print("✅ llms.txt / sitemap.xml / README.md 已同步至十二款遊戲")
