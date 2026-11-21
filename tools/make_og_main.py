#!/usr/bin/env python3
"""生成星遊戲樂園首頁 OG 分享圖 (1200×630)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1200, 630
OUT = Path(__file__).parent.parent / "og-image.png"

# 色系（全用 hex）
BG_TOP = "#1a162e"
BG_BOTTOM = "#0d0a1a"
ACCENT = "#f5c451"      # 金黃
ACCENT2 = "#7c5cff"     # 紫
WHITE = "#ffffff"
MUTED = "#a8a0c8"
CARD_BG = "#1e1a3a"
BORDER = "#3a3260"
GREEN = "#5cff7c"
RED = "#ff6b5c"
BLUE = "#4ac8ff"
ACCENT3 = "#ffd166"      # 金色（爆炸特效）

GAME_COLORS = [ACCENT, GREEN, RED, ACCENT2, BLUE]

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def rgba(h, a):
    r, g, b = hex_to_rgb(h)
    return (r, g, b, a)

def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=0):
    draw.rounded_rectangle(xy, radius, fill=fill, outline=outline, width=width)

def main():
    img = Image.new("RGBA", (W, H), BG_TOP)
    draw = ImageDraw.Draw(img)

    # 漸層背景
    rt, gt, bt = hex_to_rgb(BG_TOP)
    rb, gb, bb = hex_to_rgb(BG_BOTTOM)
    for y in range(H):
        t = y / H
        r = int(rt * (1-t) + rb * t)
        g = int(gt * (1-t) + gb * t)
        b = int(bt * (1-t) + bb * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

    # 星空裝飾
    import random
    random.seed(42)
    for _ in range(80):
        x = random.randint(0, W)
        y = random.randint(0, H)
        size = random.randint(1, 2)
        opacity = random.randint(60, 180)
        draw.ellipse([x, y, x+size, y+size], fill=(255, 255, 255, opacity))

    # 裝飾光暈
    for cx, cy, r, color_hex, alpha in [
        (180, 120, 280, ACCENT2, 25),
        (W-180, 500, 300, ACCENT, 20),
        (W//2, H//2, 380, ACCENT2, 12),
    ]:
        overlay = Image.new("RGBA", (W, H), (0,0,0,0))
        od = ImageDraw.Draw(overlay)
        for i in range(r, 0, -5):
            a = int(alpha * (1 - i/r) * 0.5)
            od.ellipse([cx-i, cy-i, cx+i, cy+i], fill=rgba(color_hex, a))
        img = Image.alpha_composite(img, overlay)
        draw = ImageDraw.Draw(img)

    # 字型
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 56)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 28)
        font_card = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 20)
        font_card_sm = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 15)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 13)
    except:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_card = ImageFont.load_default()
        font_card_sm = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # 主標題
    draw.text((80, 50), "星遊戲樂園", font=font_title, fill=WHITE)
    draw.text((80, 120), "Star Game Hub", font=font_sub, fill=ACCENT)

    # 分隔線
    draw.line([(80, 170), (W-80, 170)], fill=rgba(ACCENT, 80), width=2)

    # 五款遊戲卡片：兩行佈局 (3 + 2)
    games = [
        ("星耀拉霸", "Star Spin", "🎰", "三轉輪老虎機·虛擬幣"),
        ("星節奏", "Star Beat", "🎵", "四軌節奏·原創譜面"),
        ("星際跑者", "Star Runner", "🏃", "無限跑酷·程序生成"),
        ("星影解謎", "Star Puzzle", "🧩", "分身平台解謎·三星評價"),
        ("星際射手", "Star Shooter", "🚀", "太空射擊·程序波次"),
    ]

    card_w = 220
    card_h = 260
    gap = 18
    start_x = 80
    start_y = 195

    for i, (name, en, icon, desc) in enumerate(games):
        row = i // 3
        col = i % 3
        x = start_x + col * (card_w + gap)
        y = start_y + row * (card_h + gap + 10)
        color = GAME_COLORS[i]

        # 卡片背景
        card_surf = Image.new("RGBA", (card_w, card_h), (0,0,0,0))
        cd = ImageDraw.Draw(card_surf)
        draw_rounded_rect(cd, (0, 0, card_w, card_h), 14,
                          fill=rgba(CARD_BG, 255),
                          outline=rgba(BORDER, 255), width=2)

        # 圖示區
        cd.ellipse([card_w//2 - 42, 18, card_w//2 + 42, 102],
                   fill=rgba(color, 35), outline=rgba(color, 110), width=2)
        try:
            icon_font = ImageFont.truetype("C:/Windows/Fonts/seguiemj.ttf", 44)
        except:
            icon_font = ImageFont.load_default()
        cd.text((card_w//2, 60), icon, font=icon_font, fill=color, anchor="mm")

        # 遊戲名
        cd.text((card_w//2, 130), name, font=font_card, fill=WHITE, anchor="mm")
        cd.text((card_w//2, 158), en, font=font_card_sm, fill=MUTED, anchor="mm")

        # 描述
        cd.text((card_w//2, 190), desc, font=font_small, fill=MUTED, anchor="mm")

        # 底部標籤
        tag_y = 220
        cd.rounded_rectangle([card_w//2 - 55, tag_y, card_w//2 + 55, tag_y + 26],
                             radius=13, fill=rgba(color, 25), outline=rgba(color, 80), width=1)
        cd.text((card_w//2, tag_y + 13), "免費遊玩", font=font_small, fill=color, anchor="mm")

        img.paste(card_surf, (x, y), card_surf)

    # 底部：玩家戰機與敵機裝飾
    # 玩家戰機 (右下)
    ship_x, ship_y = W - 120, H - 80
    draw.polygon([(ship_x, ship_y - 25), (ship_x - 20, ship_y + 10), (ship_x - 8, ship_y + 10),
                  (ship_x - 12, ship_y + 22), (ship_x + 12, ship_y + 22), (ship_x + 8, ship_y + 10),
                  (ship_x + 20, ship_y + 10)], fill=ACCENT2)
    draw.ellipse([ship_x - 6, ship_y + 10, ship_x + 6, ship_y + 25], fill=rgba(ACCENT2, 180))

    # 子彈
    for bx, by in [(ship_x - 12, ship_y - 35), (ship_x + 12, ship_y - 35), (ship_x, ship_y - 45)]:
        draw.rounded_rectangle([bx - 2, by - 10, bx + 2, by], 2, fill=ACCENT)

    # 敵機 (左下區域)
    for ex, ey in [(160, H - 90), (260, H - 110), (360, H - 85)]:
        draw.polygon([(ex, ey + 15), (ex - 14, ey - 12), (ex + 14, ey - 12)], fill=ACCENT)

    # 爆炸粒子
    for px, py in [(210, H - 70), (310, H - 90), (410, H - 65)]:
        for r in [2, 5, 8]:
            draw.ellipse([px - r, py - r, px + r, py + r], outline=rgba(ACCENT3, 200 - r*15), width=2)

    # 底部品牌
    draw.text((W//2, H - 35), "零外部素材 · 免註冊 · 開啟即玩",
              font=font_small, fill=MUTED, anchor="mm")
    draw.text((W//2, H - 12), "https://vip-4.github.io/star-game-hub/",
              font=font_small, fill=rgba(ACCENT, 180), anchor="mm")

    img.save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")

if __name__ == "__main__":
    main()