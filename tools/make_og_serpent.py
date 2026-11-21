#!/usr/bin/env python3
"""生成星蛇尋跡 OG 分享圖 (1200×630)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1200, 630
OUT = Path(__file__).parent.parent / "serpent" / "og-image.png"

BG_TOP = "#0c1410"
BG_BOTTOM = "#060c08"
ACCENT = "#5ee08a"
GOLD = "#ffd166"
PINK = "#ff5e7e"
WHITE = "#ffffff"
MUTED = "#8ba396"
WALL = "#4a5560"


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def rgba(h, a):
    r, g, b = hex_to_rgb(h)
    return (r, g, b, a)


def main():
    img = Image.new("RGBA", (W, H), BG_TOP)
    draw = ImageDraw.Draw(img)

    # 漸層
    rt, gt, bt = hex_to_rgb(BG_TOP)
    rb, gb, bb = hex_to_rgb(BG_BOTTOM)
    for y in range(H):
        t = y / H
        draw.line([(0, y), (W, y)], fill=(int(rt*(1-t)+rb*t), int(gt*(1-t)+gb*t), int(bt*(1-t)+bb*t), 255))

    # 右側：網格棋盤
    gx0, gy0, cell = 640, 90, 52
    cols, rows = 9, 8
    # 棋盤底
    draw.rectangle([gx0, gy0, gx0 + cols*cell, gy0 + rows*cell], fill=rgba(ACCENT, 12), outline=rgba(ACCENT, 80), width=2)
    for r in range(rows):
        for c in range(cols):
            if (r + c) % 2 == 0:
                draw.rectangle([gx0 + c*cell, gy0 + r*cell, gx0 + (c+1)*cell, gy0 + (r+1)*cell], fill=rgba(ACCENT, 8))

    # 障礙牆
    for (wc, wr) in [(2, 2), (3, 2), (6, 5), (7, 5), (4, 6)]:
        x, y = gx0 + wc*cell, gy0 + wr*cell
        draw.rounded_rectangle([x+3, y+3, x+cell-3, y+cell-3], 4, fill=WALL, outline="#788896", width=2)

    # 蛇身（S 形）
    snake_cells = [(1,6),(2,6),(3,6),(4,6),(4,5),(4,4),(3,4),(2,4),(2,3),(2,2),(3,2),(4,2),(5,2)]
    for i, (sc, sr) in enumerate(snake_cells):
        x, y = gx0 + sc*cell, gy0 + sr*cell
        r = cell*0.38
        cx, cy = x + cell/2, y + cell/2
        t = i / len(snake_cells)
        col = ACCENT if i < 3 else rgba(ACCENT, int(230 - t*90))
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=col)
        if i == 0:
            # 眼睛
            draw.ellipse([cx-9, cy-10, cx-4, cy-5], fill="#08140c")
            draw.ellipse([cx+4, cy-10, cx+9, cy-5], fill="#08140c")

    # 金色果實
    fx, fy = gx0 + 7*cell + cell/2, gy0 + 2*cell + cell/2
    for k in range(8):
        a = (k/8)*2*math.pi
        px, py = fx + math.cos(a)*19, fy + math.sin(a)*19
        draw.line([(fx, fy), (px, py)], fill=rgba(GOLD, 150), width=2)
    draw.ellipse([fx-13, fy-13, fx+13, fy+13], fill=GOLD, outline=WHITE, width=2)

    # 普通果實
    nx, ny = gx0 + 0*cell + cell/2, gy0 + 6*cell + cell/2
    draw.ellipse([nx-11, ny-11, nx+11, ny+11], fill=ACCENT, outline=WHITE, width=2)

    # 炸彈
    bx, by = gx0 + 8*cell + cell/2, gy0 + 7*cell + cell/2
    draw.ellipse([bx-13, by-13, bx+13, by+13], fill="#1a1018", outline=PINK, width=3)
    draw.text((bx, by+1), "!", font=ImageFont.load_default(), fill=PINK, anchor="mm")

    # 粒子
    import random
    random.seed(33)
    for _ in range(14):
        a = random.uniform(0, 2*math.pi)
        r = random.uniform(14, 40)
        px, py = fx + math.cos(a)*r, fy + math.sin(a)*r
        draw.ellipse([px-3, py-3, px+3, py+3], fill=rgba(GOLD, random.randint(120, 220)))

    # 字型
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 56)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 28)
        font_card = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 20)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 14)
    except:
        font_title = font_sub = font_card = font_small = ImageFont.load_default()

    draw.text((70, 60), "星蛇尋跡", font=font_title, fill=WHITE)
    draw.text((70, 130), "Star Serpent", font=font_sub, fill=ACCENT)
    draw.line([(70, 180), (540, 180)], fill=rgba(ACCENT, 90), width=2)

    features = ["覓食成長 · 經典再現", "金色加倍 · 炸彈危機", "障礙迷宮 · 關卡遞增", "Web Audio · 零外部素材"]
    for i, f in enumerate(features):
        y = 215 + i * 52
        draw.ellipse([72, y+5, 84, y+17], fill=[ACCENT, GOLD, PINK, "#5eb8ff"][i])
        draw.text((98, y), f, font=font_card, fill=WHITE)

    draw.text((70, H-45), "免註冊 · 免下載 · 開啟即玩", font=font_small, fill=MUTED)
    draw.text((70, H-20), "https://vip-4.github.io/star-game-hub/serpent/", font=font_small, fill=rgba(ACCENT, 200))

    img.save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")


if __name__ == "__main__":
    main()
