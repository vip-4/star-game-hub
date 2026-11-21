# -*- coding: utf-8 -*-
"""同步 llms.txt / sitemap.xml / README.md 至七款遊戲"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ===== llms.txt =====
llms = (ROOT / "llms.txt").read_text(encoding="utf-8")
llms = llms.replace("六款原創輕量靜態 H5 遊戲入口", "七款原創輕量靜態 H5 遊戲入口", 1)
llms = llms.replace(
    "6. **星軌防衛 Star Tunnel** (tunnel/)\n"
    "   - 類型：管狀射擊遊戲（Tempest 類復古街機）\n"
    "   - 操作：←/→ 沿邊緣移動、Space 發射、Shift 翻轉對側、觸控移動/發射/翻轉按鈕\n"
    "   - 特色：Canvas 2D 透視管道投影、從深處爬出的敵人、蜘蛛危機、核心防守、程序生成波次與首領",
    "6. **星軌防衛 Star Tunnel** (tunnel/)\n"
    "   - 類型：管狀射擊遊戲（Tempest 類復古街機）\n"
    "   - 操作：←/→ 沿邊緣移動、Space 發射、Shift 翻轉對側、觸控移動/發射/翻轉按鈕\n"
    "   - 特色：Canvas 2D 透視管道投影、從深處爬出的敵人、蜘蛛危機、核心防守、程序生成波次與首領\n\n"
    "7. **星塵危機 Star Asteroids** (asteroids/)\n"
    "   - 類型：小行星射擊遊戲（Asteroids 類復古街機）\n"
    "   - 操作：←/→ 旋轉、↑/W 推進、Space 發射、觸控旋轉/推進/發射按鈕\n"
    "   - 特色：慣性漂移物理、小行星分裂系統、幽浮敵機、粒子爆炸、畫面環繞、localStorage 最高分",
    1,
)
llms = llms.replace("六款遊戲皆不包含第三方遊戲素材", "七款遊戲皆不包含第三方遊戲素材", 1)
(ROOT / "llms.txt").write_text(llms, encoding="utf-8")

# ===== sitemap.xml =====
sm = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
asteroids_url = """  <url>
    <loc>https://vip-4.github.io/star-game-hub/asteroids/</loc>
    <lastmod>2026-11-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>"""
sm = sm.replace("</urlset>", asteroids_url, 1)
(ROOT / "sitemap.xml").write_text(sm, encoding="utf-8")

# ===== README.md =====
rm = (ROOT / "README.md").read_text(encoding="utf-8")
rm = rm.replace("六款原創輕量靜態 H5 遊戲入口", "七款原創輕量靜態 H5 遊戲入口", 1)
rm = rm.replace(
    "| 星軌防衛 Star Tunnel | 管狀射擊 | ←/→ 移動、Space 發射、Shift 翻轉 / 觸控 | [tunnel/](tunnel/) |",
    "| 星軌防衛 Star Tunnel | 管狀射擊 | ←/→ 移動、Space 發射、Shift 翻轉 / 觸控 | [tunnel/](tunnel/) |\n"
    "| 星塵危機 Star Asteroids | 小行星射擊 | ←/→ 旋轉、↑ 推進、Space 發射 / 觸控 | [asteroids/](asteroids/) |",
    1,
)
rm = rm.replace("# 首頁（含六款遊戲卡片、比較表、FAQ、JSON-LD）", "# 首頁（含七款遊戲卡片、比較表、FAQ、JSON-LD）", 1)
rm = rm.replace(
    "├── tunnel/             # 星軌防衛\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    "├── tunnel/             # 星軌防衛\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "├── asteroids/          # 星塵危機\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    1,
)
rm = rm.replace("六款遊戲皆**不包含任何第三方遊戲素材**", "七款遊戲皆**不包含任何第三方遊戲素材**", 1)
(ROOT / "README.md").write_text(rm, encoding="utf-8")

print("✅ llms.txt / sitemap.xml / README.md 已同步至七款遊戲")
