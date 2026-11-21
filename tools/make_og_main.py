#!/usr/bin/env python3
"""生成星遊戲樂園首頁 OG 分享圖 (1200×630)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

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

GAME_COLORS = [ACCENT, GREEN, RED, ACCENT2]

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

    # 裝飾光暈
    for cx, cy, r, color_hex, alpha in [
        (200, 150, 300, ACCENT2, 30),
        (W-200, 480, 280, ACCENT, 25),
        (W//2, H//2, 400, ACCENT2, 15),
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
        font_card = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 22)
        font_card_sm = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 16)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 14)
    except:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_card = ImageFont.load_default()
        font_card_sm = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # 主標題
    draw.text((80, 60), "星遊戲樂園", font=font_title, fill=WHITE)
    draw.text((80, 130), "Star Game Hub", font=font_sub, fill=ACCENT)

    # 分隔線
    draw.line([(80, 185), (W-80, 185)], fill=rgba(ACCENT, 80), width=2)

    # 四張遊戲卡片
    games = [
        ("星耀拉霸", "Star Spin", "🎰", "三轉輪老虎機·虛擬幣"),
        ("星節奏", "Star Beat", "🎵", "四軌節奏·原創譜面"),
        ("星際跑者", "Star Runner", "🏃", "無限跑酷·程序生成"),
        ("星影解謎", "Star Puzzle", "🧩", "分身平台解謎·三星評價"),
    ]

    card_w = 250
    card_h = 300
    gap = 20
    start_x = 80
    start_y = 210

    for i, (name, en, icon, desc) in enumerate(games):
        x = start_x + i * (card_w + gap)
        y = start_y
        color = GAME_COLORS[i]

        # 卡片背景
        card_surf = Image.new("RGBA", (card_w, card_h), (0,0,0,0))
        cd = ImageDraw.Draw(card_surf)
        draw_rounded_rect(cd, (0, 0, card_w, card_h), 16,
                          fill=rgba(CARD_BG, 255),
                          outline=rgba(BORDER, 255), width=2)

        # 圖示區
        cd.ellipse([card_w//2 - 45, 25, card_w//2 + 45, 115],
                   fill=rgba(color, 40), outline=rgba(color, 120), width=2)
        try:
            icon_font = ImageFont.truetype("C:/Windows/Fonts/seguiemj.ttf", 48)
        except:
            icon_font = ImageFont.load_default()
        cd.text((card_w//2, 70), icon, font=icon_font, fill=color, anchor="mm")

        # 遊戲名
        cd.text((card_w//2, 145), name, font=font_card, fill=WHITE, anchor="mm")
        cd.text((card_w//2, 175), en, font=font_card_sm, fill=MUTED, anchor="mm")

        # 描述
        cd.text((card_w//2, 210), desc, font=font_small, fill=MUTED, anchor="mm")

        # 底部標籤
        tag_y = 250
        cd.rounded_rectangle([card_w//2 - 60, tag_y, card_w//2 + 60, tag_y + 30],
                             radius=15, fill=rgba(color, 30), outline=rgba(color, 100), width=1)
        cd.text((card_w//2, tag_y + 15), "免費遊玩", font=font_small, fill=color, anchor="mm")

        img.paste(card_surf, (x, y), card_surf)

    # 底部品牌
    draw.text((W//2, H - 40), "零外部素材 · 免註冊 · 開啟即玩",
              font=font_small, fill=MUTED, anchor="mm")
    draw.text((W//2, H - 15), "https://vip-4.github.io/star-game-hub/",
              font=font_small, fill=rgba(ACCENT, 180), anchor="mm")

    img.save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")

if __name__ == "__main__":
    main()