#!/usr/bin/env python3
"""生成星遊戲樂園首頁 OG 分享圖 (1200×630) - 六款遊戲 3×2 網格"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
OUT = Path(__file__).parent.parent / "og-image.png"

BG_TOP = "#1a162e"
BG_BOTTOM = "#0d0a1a"
ACCENT = "#f5c451"
ACCENT2 = "#7c5cff"
WHITE = "#ffffff"
MUTED = "#a8a0c8"
CARD_BG = "#1e1a3a"
BORDER = "#3a3260"
GAME_COLORS = ["#f5c451", "#5cff7c", "#ff6b5c", "#7c5cff", "#4ac8ff", "#ff5e9c"]


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def rgba(h, a):
    r, g, b = hex_to_rgb(h)
    return (r, g, b, a)


def main():
    img = Image.new("RGBA", (W, H), BG_TOP)
    draw = ImageDraw.Draw(img)

    # 漸層背景
    rt, gt, bt = hex_to_rgb(BG_TOP)
    rb, gb, bb = hex_to_rgb(BG_BOTTOM)
    for y in range(H):
        t = y / H
        draw.line([(0, y), (W, y)], fill=(int(rt*(1-t)+rb*t), int(gt*(1-t)+gb*t), int(bt*(1-t)+bb*t), 255))

    # 星空
    import random
    random.seed(42)
    for _ in range(70):
        x, y = random.randint(0, W), random.randint(0, H)
        s = random.randint(1, 2)
        draw.ellipse([x, y, x+s, y+s], fill=(255, 255, 255, random.randint(50, 150)))

    # 裝飾光暈
    for cx, cy, r, ch, alpha in [(180, 110, 250, ACCENT2, 22), (W-180, 520, 260, ACCENT, 18)]:
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        for i in range(r, 0, -6):
            od.ellipse([cx-i, cy-i, cx+i, cy+i], fill=rgba(ch, int(alpha*(1-i/r)*0.5)))
        img = Image.alpha_composite(img, overlay)
        draw = ImageDraw.Draw(img)

    # 字型
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 50)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 24)
        font_card = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 19)
        font_card_sm = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 13)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 12)
        icon_font = ImageFont.truetype("C:/Windows/Fonts/seguiemj.ttf", 36)
    except:
        font_title = font_sub = font_card = font_card_sm = font_small = icon_font = ImageFont.load_default()

    # 標題（左側）
    draw.text((60, 42), "星遊戲樂園", font=font_title, fill=WHITE)
    draw.text((60, 105), "Star Game Hub · 六款原創遊戲", font=font_sub, fill=ACCENT)

    # 六款遊戲卡片：3×2 緊湊網格（右側）
    games = [
        ("星耀拉霸", "Star Spin", "🎰", "三轉輪老虎機"),
        ("星節奏", "Star Beat", "🎵", "四軌節奏"),
        ("星際跑者", "Star Runner", "🏃", "無限跑酷"),
        ("星影解謎", "Star Puzzle", "🧩", "分身解謎"),
        ("星際射手", "Star Shooter", "🚀", "太空射擊"),
        ("星軌防衛", "Star Tunnel", "◎", "管狀射擊"),
    ]

    card_w, card_h, gap = 200, 178, 14
    grid_x, grid_y = 555, 45

    for i, (name, en, icon, desc) in enumerate(games):
        row, col = i // 3, i % 3
        x = grid_x + col * (card_w + gap)
        y = grid_y + row * (card_h + gap)
        color = GAME_COLORS[i]

        card = Image.new("RGBA", (card_w, card_h), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.rounded_rectangle((0, 0, card_w, card_h), 12,
                             fill=rgba(CARD_BG, 255), outline=rgba(BORDER, 255), width=2)

        # 圖示
        cd.ellipse([card_w//2 - 32, 12, card_w//2 + 32, 76],
                   fill=rgba(color, 35), outline=rgba(color, 110), width=2)
        cd.text((card_w//2, 44), icon, font=icon_font, fill=color, anchor="mm")

        # 名稱 / 英文
        cd.text((card_w//2, 98), name, font=font_card, fill=WHITE, anchor="mm")
        cd.text((card_w//2, 124), en, font=font_card_sm, fill=MUTED, anchor="mm")
        cd.text((card_w//2, 150), desc, font=font_small, fill=rgba(color, 220), anchor="mm")

        img.paste(card, (x, y), card)

    # 左側特色列表
    features = ["零外部素材 · 純靜態", "鍵盤與觸控雙操作", "SEO / GEO 友善", "免註冊 · 開啟即玩"]
    for i, f in enumerate(features):
        y = 185 + i * 58
        draw.ellipse([62, y+6, 76, y+20], fill=GAME_COLORS[i])
        draw.text((90, y), f, font=font_card_sm, fill=WHITE)

    # 底部網址
    draw.line([(60, H-45), (W-60, H-45)], fill=rgba(ACCENT, 60), width=1)
    draw.text((60, H-30), "https://vip-4.github.io/star-game-hub/", font=font_small, fill=rgba(ACCENT, 200))

    img.save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")


if __name__ == "__main__":
    main()
