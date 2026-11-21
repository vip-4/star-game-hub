# -*- coding: utf-8 -*-
"""同步 llms.txt / sitemap.xml / README.md 至八款遊戲"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ===== llms.txt =====
llms = (ROOT / "llms.txt").read_text(encoding="utf-8")
llms = llms.replace("七款原創輕量靜態 H5 遊戲入口", "八款原創輕量靜態 H5 遊戲入口", 1)
llms = llms.replace(
    "7. **星塵危機 Star Asteroids** (asteroids/)\n"
    "   - 類型：小行星射擊遊戲（Asteroids 類復古街機）\n"
    "   - 操作：←/→ 旋轉、↑/W 推進、Space 發射、觸控旋轉/推進/發射按鈕\n"
    "   - 特色：慣性漂移物理、小行星分裂系統、幽浮敵機、粒子爆炸、畫面環繞、localStorage 最高分",
    "7. **星塵危機 Star Asteroids** (asteroids/)\n"
    "   - 類型：小行星射擊遊戲（Asteroids 類復古街機）\n"
    "   - 操作：←/→ 旋轉、↑/W 推進、Space 發射、觸控旋轉/推進/發射按鈕\n"
    "   - 特色：慣性漂移物理、小行星分裂系統、幽浮敵機、粒子爆炸、畫面環繞、localStorage 最高分\n\n"
    "8. **星芒破塊 Star Breaker** (breaker/)\n"
    "   - 類型：打磚塊遊戲（Breakout 類經典街機）\n"
    "   - 操作：←/→ 移動光板、Space 發射、觸控拖曳光板與點擊發射\n"
    "   - 特色：5 種磚塊（堅硬/爆炸/加分）、4 類道具（擴板/多球/慢速/加命）、反射角度控制、程序生成關卡",
    1,
)
llms = llms.replace("七款遊戲皆不包含第三方遊戲素材", "八款遊戲皆不包含第三方遊戲素材", 1)
(ROOT / "llms.txt").write_text(llms, encoding="utf-8")

# ===== sitemap.xml =====
sm = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
breaker_url = """  <url>
    <loc>https://vip-4.github.io/star-game-hub/breaker/</loc>
    <lastmod>2026-11-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>"""
sm = sm.replace("</urlset>", breaker_url, 1)
(ROOT / "sitemap.xml").write_text(sm, encoding="utf-8")

# ===== README.md =====
rm = (ROOT / "README.md").read_text(encoding="utf-8")
rm = rm.replace("七款原創輕量靜態 H5 遊戲入口", "八款原創輕量靜態 H5 遊戲入口", 1)
rm = rm.replace(
    "| 星塵危機 Star Asteroids | 小行星射擊 | ←/→ 旋轉、↑ 推進、Space 發射 / 觸控 | [asteroids/](asteroids/) |",
    "| 星塵危機 Star Asteroids | 小行星射擊 | ←/→ 旋轉、↑ 推進、Space 發射 / 觸控 | [asteroids/](asteroids/) |\n"
    "| 星芒破塊 Star Breaker | 打磚塊 | ←/→ 移動、Space 發射 / 拖曳 | [breaker/](breaker/) |",
    1,
)
rm = rm.replace("# 首頁（含七款遊戲卡片、比較表、FAQ、JSON-LD）", "# 首頁（含八款遊戲卡片、比較表、FAQ、JSON-LD）", 1)
rm = rm.replace(
    "├── asteroids/          # 星塵危機\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    "├── asteroids/          # 星塵危機\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "├── breaker/            # 星芒破塊\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    1,
)
rm = rm.replace("七款遊戲皆**不包含任何第三方遊戲素材**", "八款遊戲皆**不包含任何第三方遊戲素材**", 1)
(ROOT / "README.md").write_text(rm, encoding="utf-8")

print("✅ llms.txt / sitemap.xml / README.md 已同步至八款遊戲")
