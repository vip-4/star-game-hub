#!/usr/bin/env python3
"""生成星芒破塊 OG 分享圖 (1200×630)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1200, 630
OUT = Path(__file__).parent.parent / "breaker" / "og-image.png"

BG_TOP = "#0a0c1a"
BG_BOTTOM = "#05060f"
ACCENT = "#ffd166"
ACCENT2 = "#7c9cff"
MINT = "#4ae0c0"
WHITE = "#ffffff"
MUTED = "#8b93ad"
COLORS = ["#7c9cff", "#ff9f6b", "#ff6b9c", "#ffd166", "#4ae0c0"]


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

    # 星空
    import random
    random.seed(21)
    for _ in range(110):
        x, y = random.randint(0, W), random.randint(0, H)
        s = random.randint(1, 2)
        draw.ellipse([x, y, x+s, y+s], fill=(255, 255, 255, random.randint(50, 190)))

    # 右側：磚塊牆
    bx0, by0 = 620, 90
    bw, bh, gap = 62, 28, 7
    for r in range(4):
        for c in range(8):
            if r == 3 and c in (2, 5):
                continue
            color = COLORS[(r + c) % len(COLORS)]
            x, y = bx0 + c*(bw+gap), by0 + r*(bh+gap)
            draw.rounded_rectangle([x, y, x+bw, y+bh], 6, fill=color, outline=rgba(color, 255))
            # 光澤
            draw.rounded_rectangle([x+3, y+3, x+bw-3, y+9], 3, fill=rgba(WHITE, 55))

    # 光板
    px, py, pw, ph = 880, 470, 150, 16
    draw.rounded_rectangle([px-pw/2, py-ph/2, px+pw/2, py+ph/2], 7, fill=MINT)
    draw.ellipse([px-pw/2-8, py-8, px-pw/2+8, py+8], fill=rgba(MINT, 90))
    draw.ellipse([px+pw/2-8, py-8, px+pw/2+8, py+8], fill=rgba(MINT, 90))

    # 能量球
    for (cx, cy) in [(820, 350), (960, 300), (900, 240)]:
        draw.ellipse([cx-9, cy-9, cx+9, cy+9], fill=WHITE)
        for r in [14, 19]:
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=rgba(MINT, 120), width=2)

    # 道具
    for (ix, iy, color, sym) in [(700, 320, MINT, '↔'), (1030, 400, '#ff6b9c', '×3'), (760, 420, ACCENT2, '≈')]:
        draw.ellipse([ix-18, iy-18, ix+18, iy+18], fill=color, outline=WHITE, width=2)

    # 爆炸粒子
    for a in range(0, 360, 40):
        r = random.randint(12, 30)
        ex = 760 + math.cos(math.radians(a))*r
        ey = 146 + math.sin(math.radians(a))*r
        draw.ellipse([ex-3, ey-3, ex+3, ey+3], fill=ACCENT)

    # 字型
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 56)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 28)
        font_card = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 20)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 14)
    except:
        font_title = font_sub = font_card = font_small = ImageFont.load_default()

    draw.text((70, 60), "星芒破塊", font=font_title, fill=WHITE)
    draw.text((70, 130), "Star Breaker", font=font_sub, fill=ACCENT)
    draw.line([(70, 180), (540, 180)], fill=rgba(ACCENT, 90), width=2)

    features = ["反彈能量球 · 擊碎磚塊", "堅硬/爆炸/加分磚", "擴板 · 多球 · 慢速道具", "關卡遞增 · 粒子特效"]
    for i, f in enumerate(features):
        y = 215 + i * 52
        draw.ellipse([72, y+5, 84, y+17], fill=COLORS[i])
        draw.text((98, y), f, font=font_card, fill=WHITE)

    draw.text((70, H-45), "免註冊 · 免下載 · 開啟即玩", font=font_small, fill=MUTED)
    draw.text((70, H-20), "https://vip-4.github.io/star-game-hub/breaker/", font=font_small, fill=rgba(ACCENT, 200))

    img.save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")


if __name__ == "__main__":
    main()
