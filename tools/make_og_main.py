#!/usr/bin/env python3
"""生成星遊戲樂園首頁 OG 分享圖 (1200×630) - 十一款遊戲網格"""
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
GAME_COLORS = ["#f5c451", "#5cff7c", "#ff6b5c", "#7c5cff", "#4ac8ff", "#ff5e9c", "#4ae0c0", "#ffd166", "#b98cff", "#5ee08a", "#ed9b3c"]


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
        font_title = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 46)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 21)
        font_card = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 13)
        font_card_sm = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 9)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 9)
        icon_font = ImageFont.truetype("C:/Windows/Fonts/seguiemj.ttf", 24)
    except:
        font_title = font_sub = font_card = font_card_sm = font_small = icon_font = ImageFont.load_default()

    # 標題（左側）
    draw.text((55, 40), "星遊戲樂園", font=font_title, fill=WHITE)
    draw.text((55, 100), "Star Game Hub", font=font_sub, fill=ACCENT)
    draw.text((55, 132), "十一款原創遊戲 · 單一靜態入口", font=font_small, fill=MUTED)

    # 十一款遊戲卡片：6×2 網格（右側）
    games = [
        ("星耀拉霸", "Star Spin", "🎰", "三轉輪老虎機"),
        ("星節奏", "Star Beat", "🎵", "四軌節奏"),
        ("星際跑者", "Star Runner", "🏃", "無限跑酷"),
        ("星影解謎", "Star Puzzle", "🧩", "分身解謎"),
        ("星際射手", "Star Shooter", "🚀", "太空射擊"),
        ("星軌防衛", "Star Tunnel", "◎", "管狀射擊"),
        ("星塵危機", "Star Asteroids", "▲", "小行星射擊"),
        ("星芒破塊", "Star Breaker", "▤", "打磚塊"),
        ("星脈分支", "Star Branch", "║", "分支防守"),
        ("星蛇尋跡", "Star Serpent", "◉", "貪吃蛇"),
        ("星芒合成", "Star Merge", "▦", "2048 合成"),
    ]

    card_w, card_h, gap = 99, 240, 7
    cols = 6
    grid_x, grid_y = 495, 42

    for i, (name, en, icon, desc) in enumerate(games):
        row, col = i // cols, i % cols
        x = grid_x + col * (card_w + gap)
        y = grid_y + row * (card_h + gap)
        color = GAME_COLORS[i]

        card = Image.new("RGBA", (card_w, card_h), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.rounded_rectangle((0, 0, card_w, card_h), 11,
                             fill=rgba(CARD_BG, 255), outline=rgba(BORDER, 255), width=2)

        # 圖示
        cd.ellipse([card_w//2 - 24, 14, card_w//2 + 24, 62],
                   fill=rgba(color, 35), outline=rgba(color, 110), width=2)
        cd.text((card_w//2, 38), icon, font=icon_font, fill=color, anchor="mm")

        # 名稱 / 英文 / 描述
        cd.text((card_w//2, 92), name, font=font_card, fill=WHITE, anchor="mm")
        # 英文過長則換行
        if len(en) > 12:
            en_display = en.replace(' ', '\n', 1)
        else:
            en_display = en
        cd.multiline_text((card_w//2, 122), en_display, font=font_card_sm,
                          fill=MUTED, anchor="mm", align="center", spacing=2)
        cd.text((card_w//2, 158), desc, font=font_small, fill=rgba(color, 220), anchor="mm")

        # 免費標籤
        cd.rounded_rectangle([card_w//2 - 42, 195, card_w//2 + 42, 220],
                             radius=12, fill=rgba(color, 25), outline=rgba(color, 80), width=1)
        cd.text((card_w//2, 207), "免費遊玩", font=font_small, fill=color, anchor="mm")

        img.paste(card, (x, y), card)

    # 左側特色列表
    features = ["零外部素材 · 純靜態", "鍵盤與觸控雙操作", "SEO / GEO 友善", "免註冊 · 開啟即玩"]
    for i, f in enumerate(features):
        y = 195 + i * 56
        draw.ellipse([57, y+5, 69, y+17], fill=GAME_COLORS[i])
        draw.text((82, y), f, font=font_card_sm, fill=WHITE)

    # 底部網址
    draw.line([(55, H-42), (460, H-42)], fill=rgba(ACCENT, 60), width=1)
    draw.text((55, H-28), "https://vip-4.github.io/star-game-hub/", font=font_small, fill=rgba(ACCENT, 200))

    img.save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")


if __name__ == "__main__":
    main()
