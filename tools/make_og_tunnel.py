#!/usr/bin/env python3
"""生成星軌防衛 OG 分享圖 (1200×630)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1200, 630
OUT = Path(__file__).parent.parent / "tunnel" / "og-image.png"

BG_TOP = "#0a0a18"
BG_BOTTOM = "#05040e"
ACCENT = "#ff5e9c"
ACCENT2 = "#5ee0ff"
WHITE = "#ffffff"
MUTED = "#948db5"
GOLD = "#ffd166"

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
    random.seed(7)
    for _ in range(100):
        x, y = random.randint(0, W), random.randint(0, H)
        s = random.randint(1, 2)
        draw.ellipse([x, y, x+s, y+s], fill=(255,255,255,random.randint(60,200)))

    # 中央透視管道（右側）
    tcx, tcy = 880, 315
    r_near, r_far = 240, 14
    segments = 20
    rings = 9

    # 核心光暈
    for i in range(120, 0, -3):
        a = int(40 * (1 - i/120))
        draw.ellipse([tcx-i, tcy-i, tcx+i, tcy+i], fill=rgba(ACCENT, a))

    # 橫向環
    for r in range(rings + 1):
        t = r / rings
        rad = r_far * (r_near / r_far) ** t
        pts = []
        for s in range(segments + 1):
            ang = (s % segments) / segments * 2 * math.pi - math.pi / 2
            px = tcx + math.cos(ang) * rad
            py = tcy + math.sin(ang) * rad * 0.88
            pts.append((px, py))
        main_ring = r == rings
        col = rgba(ACCENT, 180) if main_ring else rgba(ACCENT2, int(30 + 60*t))
        draw.line(pts + [pts[0]], fill=col, width=3 if main_ring else 1)

    # 縱向軌道
    for s in range(segments):
        ang = s / segments * 2 * math.pi - math.pi / 2
        p0 = (tcx + math.cos(ang)*r_far, tcy + math.sin(ang)*r_far*0.88)
        p1 = (tcx + math.cos(ang)*r_near, tcy + math.sin(ang)*r_near*0.88)
        draw.line([p0, p1], fill=rgba(ACCENT2, 45), width=1)

    # 中心核心
    draw.ellipse([tcx-6, tcy-6, tcx+6, tcy+6], fill=WHITE)

    # 敵人（幾個在軌道上）
    for seg, depth, color in [(4, 0.45, ACCENT), (11, 0.6, GOLD), (16, 0.35, "#c77dff")]:
        t = depth
        rad = r_far * (r_near / r_far) ** t
        ang = seg / segments * 2 * math.pi - math.pi / 2
        px = tcx + math.cos(ang) * rad
        py = tcy + math.sin(ang) * rad * 0.88
        size = 6 + 10 * t
        draw.polygon([(px, py-size), (px+size*0.8, py), (px, py+size), (px-size*0.8, py)], fill=color, outline=WHITE)

    # 玩家戰機（近端邊緣）
    pseg, pdepth = 8, 1.0
    pang = pseg / segments * 2 * math.pi - math.pi / 2
    px = tcx + math.cos(pang) * r_near
    py = tcy + math.sin(pang) * r_near * 0.88
    draw.polygon([(px, py-18), (px-12, py+12), (px, py+6), (px+12, py+12)], fill=ACCENT2, outline=WHITE)
    draw.ellipse([px-6, py+6, px+6, py+22], fill=rgba(ACCENT2, 180))

    # 子彈
    for bseg, bdepth in [(8, 0.8), (8, 0.6), (12, 0.7)]:
        rad = r_far * (r_near / r_far) ** bdepth
        bang = bseg / segments * 2 * math.pi - math.pi / 2
        bx, by = tcx + math.cos(bang)*rad, tcy + math.sin(bang)*rad*0.88
        draw.ellipse([bx-4, by-4, bx+4, by+4], fill=ACCENT2)

    # 字型
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 56)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 28)
        font_card = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 20)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 14)
    except:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_card = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # 左側標題
    draw.text((70, 60), "星軌防衛", font=font_title, fill=WHITE)
    draw.text((70, 130), "Star Tunnel", font=font_sub, fill=ACCENT)
    draw.line([(70, 180), (540, 180)], fill=rgba(ACCENT, 90), width=2)

    features = ["透視管道 · 邊緣防守", "翻轉閃避 · 蜘蛛危機", "程序生成波次 · 首領戰", "Web Audio · 零外部素材"]
    for i, f in enumerate(features):
        y = 220 + i * 48
        draw.ellipse([72, y+4, 84, y+16], fill=ACCENT if i%2==0 else ACCENT2)
        draw.text((98, y), f, font=font_card, fill=WHITE)

    draw.text((70, H-45), "免註冊 · 免下載 · 開啟即玩", font=font_small, fill=MUTED)
    draw.text((70, H-20), "https://vip-4.github.io/star-game-hub/tunnel/", font=font_small, fill=rgba(ACCENT, 200))

    img.save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")

if __name__ == "__main__":
    main()