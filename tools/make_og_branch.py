#!/usr/bin/env python3
"""生成星脈分支 OG 分享圖 (1200×630)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1200, 630
OUT = Path(__file__).parent.parent / "branch" / "og-image.png"

BG_TOP = "#0e0a1c"
BG_BOTTOM = "#06040f"
ACCENT = "#b98cff"
WHITE = "#ffffff"
MUTED = "#948bb5"
COLORS = ["#ff5e7e", "#ffd166", "#5ee0a0", "#5eb8ff"]


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
    random.seed(15)
    for _ in range(110):
        x, y = random.randint(0, W), random.randint(0, H)
        s = random.randint(1, 2)
        draw.ellipse([x, y, x+s, y+s], fill=(255, 255, 255, random.randint(50, 190)))

    # 右側：四條分支與掉落方塊
    lane_xs = [640, 790, 940, 1090]
    node_y = 480

    # 核心連線
    draw.line([(610, 585), (1120, 585)], fill=rgba(ACCENT, 90), width=2)

    for i, lx in enumerate(lane_xs):
        color = COLORS[i]
        # 能量線
        grad_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(grad_img)
        for y in range(node_y, 585):
            t = (y - node_y) / (585 - node_y)
            c = rgba(color, int(200 * (1 - t) + 30))
            gd.line([(lx, y), (lx, y+1)], fill=c)
        img = Image.alpha_composite(img, grad_img)
        draw = ImageDraw.Draw(img)
        # 節點
        draw.ellipse([lx-24, node_y-24, lx+24, node_y+24], fill=color, outline=WHITE, width=3)
        draw.ellipse([lx-30, node_y-30, lx+30, node_y+30], outline=rgba(color, 120), width=2)
        draw.ellipse([lx-6, node_y-8, lx+2, node_y], fill=rgba(WHITE, 220))

        # 掉落方塊（同色）
        by = 140 + (i % 2) * 70
        draw.rounded_rectangle([lx-22, by-22, lx+22, by+22], 8, fill=color, outline=WHITE, width=3)
        draw.rounded_rectangle([lx-16, by-16, lx+16, by-6], 4, fill=rgba(WHITE, 45))

    # 一個不同色的方塊（展示匹配挑戰）
    draw.rounded_rectangle([lane_xs[1]-22, 300-22, lane_xs[1]+22, 300+22], 8,
                           fill=COLORS[3], outline=WHITE, width=3)
    draw.line([lane_xs[1]-10, 300-10, lane_xs[1]+10, 300+10], fill=rgba(WHITE, 200), width=2)
    draw.line([lane_xs[1]+10, 300-10, lane_xs[1]-10, 300+10], fill=rgba(WHITE, 200), width=2)

    # 合併連線示意（上方）
    draw.line([(lane_xs[0], 90), (lane_xs[-1], 90)], fill=rgba(ACCENT, 140), width=6)
    draw.text(((lane_xs[0]+lane_xs[-1])//2, 62), "合併 ×2", font=ImageFont.load_default(), fill=WHITE, anchor="mm")

    # 吸收粒子
    for k in range(10):
        a = (k / 10) * 2 * math.pi
        px = lane_xs[2] + math.cos(a) * 34
        py = node_y + math.sin(a) * 34
        draw.ellipse([px-4, py-4, px+4, py+4], fill=rgba(COLORS[2], 220))

    # 字型
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 56)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 28)
        font_card = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 20)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 14)
    except:
        font_title = font_sub = font_card = font_small = ImageFont.load_default()

    draw.text((70, 60), "星脈分支", font=font_title, fill=WHITE)
    draw.text((70, 130), "Star Branch", font=font_sub, fill=ACCENT)
    draw.line([(70, 180), (540, 180)], fill=rgba(ACCENT, 90), width=2)

    features = ["四色分支 · 顏色匹配", "分裂／合併策略", "連擊倍率 · 道具系統", "Web Audio · 零外部素材"]
    for i, f in enumerate(features):
        y = 215 + i * 52
        draw.ellipse([72, y+5, 84, y+17], fill=COLORS[i])
        draw.text((98, y), f, font=font_card, fill=WHITE)

    draw.text((70, H-45), "免註冊 · 免下載 · 開啟即玩", font=font_small, fill=MUTED)
    draw.text((70, H-20), "https://vip-4.github.io/star-game-hub/branch/", font=font_small, fill=rgba(ACCENT, 200))

    img.save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")


if __name__ == "__main__":
    main()
