# -*- coding: utf-8 -*-
"""同步 llms.txt / sitemap.xml / README.md 至九款遊戲"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ===== llms.txt =====
llms = (ROOT / "llms.txt").read_text(encoding="utf-8")
llms = llms.replace("八款原創輕量靜態 H5 遊戲入口", "九款原創輕量靜態 H5 遊戲入口", 1)
llms = llms.replace(
    "8. **星芒破塊 Star Breaker** (breaker/)\n"
    "   - 類型：打磚塊遊戲（Breakout 類經典街機）\n"
    "   - 操作：←/→ 移動光板、Space 發射、觸控拖曳光板與點擊發射\n"
    "   - 特色：5 種磚塊（堅硬/爆炸/加分）、4 類道具（擴板/多球/慢速/加命）、反射角度控制、程序生成關卡",
    "8. **星芒破塊 Star Breaker** (breaker/)\n"
    "   - 類型：打磚塊遊戲（Breakout 類經典街機）\n"
    "   - 操作：←/→ 移動光板、Space 發射、觸控拖曳光板與點擊發射\n"
    "   - 特色：5 種磚塊（堅硬/爆炸/加分）、4 類道具（擴板/多球/慢速/加命）、反射角度控制、程序生成關卡\n\n"
    "9. **星脈分支 Star Branch** (branch/)\n"
    "   - 類型：分支防守遊戲（多線分裂／合併 + 顏色匹配）\n"
    "   - 操作：1-4 或 A/S/D/F 切換分支顏色、Space 分裂／合併模式、觸控分支按鈕\n"
    "   - 特色：四色能量分支、同色吸收、連擊倍率、合併模式雙倍得分、星星與炸彈道具",
    1,
)
llms = llms.replace("八款遊戲皆不包含第三方遊戲素材", "九款遊戲皆不包含第三方遊戲素材", 1)
(ROOT / "llms.txt").write_text(llms, encoding="utf-8")

# ===== sitemap.xml =====
sm = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
branch_url = """  <url>
    <loc>https://vip-4.github.io/star-game-hub/branch/</loc>
    <lastmod>2026-11-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>"""
sm = sm.replace("</urlset>", branch_url, 1)
(ROOT / "sitemap.xml").write_text(sm, encoding="utf-8")

# ===== README.md =====
rm = (ROOT / "README.md").read_text(encoding="utf-8")
rm = rm.replace("八款原創輕量靜態 H5 遊戲入口", "九款原創輕量靜態 H5 遊戲入口", 1)
rm = rm.replace(
    "| 星芒破塊 Star Breaker | 打磚塊 | ←/→ 移動、Space 發射 / 拖曳 | [breaker/](breaker/) |",
    "| 星芒破塊 Star Breaker | 打磚塊 | ←/→ 移動、Space 發射 / 拖曳 | [breaker/](breaker/) |\n"
    "| 星脈分支 Star Branch | 分支防守 | 1-4 切色、Space 分裂合併 / 觸控 | [branch/](branch/) |",
    1,
)
rm = rm.replace("# 首頁（含八款遊戲卡片、比較表、FAQ、JSON-LD）", "# 首頁（含九款遊戲卡片、比較表、FAQ、JSON-LD）", 1)
rm = rm.replace(
    "├── breaker/            # 星芒破塊\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    "├── breaker/            # 星芒破塊\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "├── branch/             # 星脈分支\n"
    "│   ├── index.html\n"
    "│   ├── css/style.css\n"
    "│   └── js/game.js\n"
    "└── tools/",
    1,
)
rm = rm.replace("八款遊戲皆**不包含任何第三方遊戲素材**", "九款遊戲皆**不包含任何第三方遊戲素材**", 1)
(ROOT / "README.md").write_text(rm, encoding="utf-8")

print("✅ llms.txt / sitemap.xml / README.md 已同步至九款遊戲")
