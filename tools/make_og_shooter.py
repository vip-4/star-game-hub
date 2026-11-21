#!/usr/bin/env python3
"""生成星際射手 OG 分享圖 (1200×630)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
OUT = Path(__file__).parent.parent / "shooter" / "og-image.png"

# 色系
BG_TOP = "#0a0818"
BG_BOTTOM = "#050310"
ACCENT = "#ff6b4a"      # 橙紅
ACCENT2 = "#4af5a8"     # 綠
ACCENT3 = "#ffd166"     # 金
WHITE = "#ffffff"
MUTED = "#7a70a0"

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

    # 星空
    import random
    random.seed(42)
    for _ in range(120):
        x = random.randint(0, W)
        y = random.randint(0, H)
        size = random.randint(1, 3)
        opacity = random.randint(80, 255)
        draw.ellipse([x, y, x+size, y+size], fill=(255, 255, 255, opacity))

    # 裝飾光暈
    for cx, cy, r, color_hex, alpha in [
        (150, 120, 280, ACCENT2, 25),
        (W-150, 500, 300, ACCENT, 20),
        (W//2, H//2, 400, ACCENT3, 10),
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
    draw.text((80, 60), "星際射手", font=font_title, fill=WHITE)
    draw.text((80, 130), "Star Shooter", font=font_sub, fill=ACCENT)

    # 分隔線
    draw.line([(80, 185), (W-80, 185)], fill=rgba(ACCENT, 80), width=2)

    # 遊戲特色卡片
    features = [
        ("程序生成波次", "無限關卡，難度遞增", ACCENT),
        ("粒子爆炸特效", "細緻視覺回饋", ACCENT2),
        ("Web Audio 音效", "即時合成，零素材", ACCENT3),
        ("鍵盤/觸控雙操作", "桌機手機皆宜", "#4ac8ff"),
    ]

    card_w = 250
    card_h = 280
    gap = 20
    start_x = 80
    start_y = 210

    for i, (title, desc, color) in enumerate(features):
        x = start_x + i * (card_w + gap)
        y = start_y

        # 卡片背景
        card_surf = Image.new("RGBA", (card_w, card_h), (0,0,0,0))
        cd = ImageDraw.Draw(card_surf)
        draw_rounded_rect(cd, (0, 0, card_w, card_h), 16,
                          fill=rgba("#1a1530", 255),
                          outline=rgba("#3a3050", 255), width=2)

        # 圖示區
        cd.ellipse([card_w//2 - 50, 20, card_w//2 + 50, 120],
                   fill=rgba(color, 30), outline=rgba(color, 100), width=2)
        # 繪製簡單圖示
        if i == 0:  # 敵機
            cd.polygon([(card_w//2, 50), (card_w//2 - 25, 85), (card_w//2 + 25, 85)], fill=color)
        elif i == 1:  # 爆炸
            for ang in range(0, 360, 45):
                import math
                x1 = card_w//2 + int(25 * math.cos(math.radians(ang)))
                y1 = 85 + int(25 * math.sin(math.radians(ang)))
                cd.line([(card_w//2, 85), (x1, y1)], fill=color, width=3)
        elif i == 2:  # 音波
            for r in [10, 20, 30]:
                cd.ellipse([card_w//2 - r, 85 - r, card_w//2 + r, 85 + r], outline=color, width=2)
        else:  # 觸控
            cd.rounded_rectangle([card_w//2 - 30, 60, card_w//2 + 30, 110], 8, outline=color, width=3)
            cd.ellipse([card_w//2 - 10, 75, card_w//2 + 10, 95], fill=color)

        # 標題
        cd.text((card_w//2, 150), title, font=font_card, fill=WHITE, anchor="mm")
        # 描述
        cd.text((card_w//2, 185), desc, font=font_card_sm, fill=MUTED, anchor="mm")

        # 底部標籤
        tag_y = 230
        cd.rounded_rectangle([card_w//2 - 70, tag_y, card_w//2 + 70, tag_y + 30],
                             radius=15, fill=rgba(color, 25), outline=rgba(color, 80), width=1)
        cd.text((card_w//2, tag_y + 15), "免費遊玩", font=font_small, fill=color, anchor="mm")

        img.paste(card_surf, (x, y), card_surf)

    # 底部：玩家戰機預覽
    # 繪製一個簡單的戰機
    ship_x, ship_y = W - 150, H - 100
    draw.polygon([(ship_x, ship_y - 30), (ship_x - 25, ship_y + 15), (ship_x - 10, ship_y + 15),
                  (ship_x - 15, ship_y + 30), (ship_x + 15, ship_y + 30), (ship_x + 10, ship_y + 15),
                  (ship_x + 25, ship_y + 15)], fill=ACCENT2)
    # 驅動器
    draw.ellipse([ship_x - 8, ship_y + 15, ship_x + 8, ship_y + 35], fill=rgba(ACCENT2, 180))

    # 幾發子彈
    for bx, by in [(ship_x - 15, ship_y - 40), (ship_x + 15, ship_y - 40), (ship_x, ship_y - 50)]:
        draw.rounded_rectangle([bx - 3, by - 12, bx + 3, by], 3, fill=ACCENT3)

    # 幾個敵機
    for ex, ey in [(180, H - 120), (300, H - 140), (420, H - 110)]:
        draw.polygon([(ex, ey + 20), (ex - 18, ey - 15), (ex + 18, ey - 15)], fill=ACCENT)

    # 爆炸粒子
    for px, py in [(250, H - 80), (350, H - 100), (480, H - 90)]:
        for r in [3, 6, 9]:
            draw.ellipse([px - r, py - r, px + r, py + r], outline=rgba(ACCENT3, 200 - r*15), width=2)

    # 底部品牌
    draw.text((W//2, H - 40), "零外部素材 · 免註冊 · 開啟即玩",
              font=font_small, fill=MUTED, anchor="mm")
    draw.text((W//2, H - 15), "https://vip-4.github.io/star-game-hub/shooter/",
              font=font_small, fill=rgba(ACCENT, 180), anchor="mm")

    img.save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")

if __name__ == "__main__":
    main()