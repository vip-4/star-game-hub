#!/usr/bin/env python3
"""生成星塵危機 OG 分享圖 (1200×630)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1200, 630
OUT = Path(__file__).parent.parent / "asteroids" / "og-image.png"

BG_TOP = "#080a14"
BG_BOTTOM = "#05060d"
ACCENT = "#4ae0c0"
ACCENT2 = "#ffb84a"
PINK = "#ff6b9c"
WHITE = "#ffffff"
MUTED = "#8b93ad"
ROCK = "#b8c2d9"


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def rgba(h, a):
    r, g, b = hex_to_rgb(h)
    return (r, g, b, a)


def draw_rock(draw, cx, cy, r, seed):
    """繪製不規則小行星"""
    import random
    random.seed(seed)
    n = random.randint(8, 11)
    verts = [(cx + math.cos(i/n*2*math.pi)*r*random.uniform(0.72, 1.12),
              cy + math.sin(i/n*2*math.pi)*r*random.uniform(0.72, 1.12)) for i in range(n)]
    draw.polygon(verts, outline=ROCK, width=3)
    # 表面坑洞
    for _ in range(3):
        a = random.uniform(0, 2*math.pi)
        pr = random.uniform(0.15, 0.4) * r
        px, py = cx + math.cos(a)*pr, cy + math.sin(a)*pr
        cr = r * random.uniform(0.08, 0.16)
        draw.ellipse([px-cr, py-cr, px+cr, py+cr], fill=rgba(ROCK, 70))


def draw_ship(draw, cx, cy, size, angle=-math.pi/2):
    """繪製飛船（指向 angle）"""
    pts = []
    for (rx, ry) in [(0, -size), (size*0.8, size*0.85), (0, size*0.45), (-size*0.8, size*0.85)]:
        px = cx + rx*math.cos(angle) - ry*math.sin(angle)
        py = cy + rx*math.sin(angle) + ry*math.cos(angle)
        pts.append((px, py))
    draw.line(pts + [pts[0]], fill=ACCENT, width=3)


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
    random.seed(11)
    for _ in range(140):
        x, y = random.randint(0, W), random.randint(0, H)
        s = random.randint(1, 3)
        draw.ellipse([x, y, x+s, y+s], fill=(255, 255, 255, random.randint(60, 220)))

    # 右側遊戲場景
    # 大中小小行星
    draw_rock(draw, 850, 180, 62, 3)
    draw_rock(draw, 1030, 390, 48, 7)
    draw_rock(draw, 760, 470, 36, 12)
    draw_rock(draw, 960, 130, 22, 19)
    draw_rock(draw, 690, 330, 18, 23)

    # 飛船（中央偏右）
    draw_ship(draw, 900, 335, 28, angle=-0.5)

    # 尾焰粒子
    for i in range(8):
        bx = 900 - math.cos(-0.5) * (30 + i*7)
        by = 335 - math.sin(-0.5) * (30 + i*7)
        draw.ellipse([bx-3, by-3, bx+3, by+3], fill=rgba(ACCENT2, 220 - i*22))

    # 雷射束
    draw.line([(915, 320), (1000, 260)], fill=ACCENT, width=3)
    draw.ellipse([997, 257, 1005, 265], fill=WHITE)

    # 幽浮
    draw.ellipse([725, 170, 815, 205], outline=PINK, width=3)
    draw.arc([735, 145, 805, 195], 200, 340, fill=PINK, width=3)

    # 爆炸粒子
    for a in range(0, 360, 30):
        r = random.randint(18, 38)
        px = 850 + math.cos(math.radians(a))*r
        py = 180 + math.sin(math.radians(a))*r
        draw.ellipse([px-3, py-3, px+3, py+3], fill=rgba(ACCENT2, 200))

    # 字型
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 56)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 28)
        font_card = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 20)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 14)
    except:
        font_title = font_sub = font_card = font_small = ImageFont.load_default()

    # 左側標題
    draw.text((70, 60), "星塵危機", font=font_title, fill=WHITE)
    draw.text((70, 130), "Star Asteroids", font=font_sub, fill=ACCENT)
    draw.line([(70, 180), (540, 180)], fill=rgba(ACCENT, 90), width=2)

    features = ["旋轉推進 · 慣性漂移", "小行星分裂 · 關卡遞增", "幽浮敵機 · 粒子爆炸", "Web Audio · 零外部素材"]
    for i, f in enumerate(features):
        y = 215 + i * 52
        draw.ellipse([72, y+5, 84, y+17], fill=ACCENT if i%2==0 else ACCENT2)
        draw.text((98, y), f, font=font_card, fill=WHITE)

    draw.text((70, H-45), "免註冊 · 免下載 · 開啟即玩", font=font_small, fill=MUTED)
    draw.text((70, H-20), "https://vip-4.github.io/star-game-hub/asteroids/", font=font_small, fill=rgba(ACCENT, 200))

    img.save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")


if __name__ == "__main__":
    main()
