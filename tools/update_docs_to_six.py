# -*- coding: utf-8 -*-
"""同步 llms.txt / sitemap.xml / README.md 至六款遊戲"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ===== llms.txt =====
llms = (ROOT / "llms.txt").read_text(encoding="utf-8")
llms = llms.replace("五款原創輕量靜態 H5 遊戲入口", "六款原創輕量靜態 H5 遊戲入口", 1)
llms = llms.replace(
    "5. **星際射手 Star Shooter** (shooter/)\n"
    "   - 類型：太空射擊遊戲 (STG)\n"
    "   - 操作：←/→ 移動、Space 發射、P 暫停、觸控滑動移動與點擊發射\n"
    "   - 特色：程序生成敵群波次、5 類敵機與首領戰、粒子爆炸特效、火力升級系統",
    "5. **星際射手 Star Shooter** (shooter/)\n"
    "   - 類型：太空射擊遊戲 (STG)\n"
    "   - 操作：←/→ 移動、Space 發射、P 暫停、觸控滑動移動與點擊發射\n"
    "   - 特色：程序生成敵群波次、5 類敵機與首領戰、粒子爆炸特效、火力升級系統\n\n"
    "6. **星軌防衛 Star Tunnel** (tunnel/)\n"
    "   - 類型：管狀射擊遊戲（Tempest 類復古街機）\n"
    "   - 操作：←/→ 沿邊緣移動、Space 發射、Shift 翻轉對側、觸控移動/發射/翻轉按鈕\n"
    "   - 特色：Canvas 2D 透視管道投影、從深處爬出的敵人、蜘蛛危機、核心防守、程序生成波次與首領",
    1,
)
llms = llms.replace("五款遊戲皆不包含第三方遊戲素材", "六款遊戲皆不包含第三方遊戲素材", 1)
(ROOT / "llms.txt").write_text(llms, encoding="utf-8")

# ===== sitemap.xml =====
sm = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
tunnel_url = """  <url>
    <loc>https://vip-4.github.io/star-game-hub/tunnel/</loc>
    <lastmod>2026-11-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>"""
sm = sm.replace("</urlset>", tunnel_url, 1)
(ROOT / "sitemap.xml").write_text(sm, encoding="utf-8")

# ===== README.md =====
rm = (ROOT / "README.md").read_text(encoding="utf-8")
rm = rm.replace("五款原創輕量靜態 H5 遊戲入口", "六款原創輕量靜態 H5 遊戲入口", 1)
rm = rm.replace(
    "| 星際射手 Star Shooter | 太空射擊 (STG) | ←/→ 移動、Space 發射、P 暫停 / 觸控 | [shooter/](shooter/) |",
    "| 星際射手 Star Shooter | 太空射擊 (STG) | ←/→ 移動、Space 發射、P 暫停 / 觸控 | [shooter/](shooter/) |\n"
    "| 星軌防衛 Star Tunnel | 管狀射擊 | ←/→ 移動、Space 發射、Shift 翻轉 / 觸控 | [tunnel/](tunnel/) |",
    1,
)
rm = rm.replace("# 首頁（含五款遊戲卡片、比較表、FAQ、JSON-LD）", "# 首頁（含六款遊戲卡片、比較表、FAQ、JSON-LD）", 1)
rm = rm.replace(
    "├── shooter/            # 星際射手\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    "├── shooter/            # 星際射手\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "├── tunnel/             # 星軌防衛\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    1,
)
rm = rm.replace("五款遊戲皆**不包含任何第三方遊戲素材**", "六款遊戲皆**不包含任何第三方遊戲素材**", 1)
(ROOT / "README.md").write_text(rm, encoding="utf-8")

print("✅ llms.txt / sitemap.xml / README.md 已同步至六款遊戲")
