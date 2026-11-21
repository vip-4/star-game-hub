# -*- coding: utf-8 -*-
"""產生 Star Runner 的 1200x630 Open Graph 分享圖。"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1200, 630
OUTPUT = Path(__file__).resolve().parents[1] / "runner" / "og-image.png"
FONTS = ["C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/msyh.ttc", "C:/Windows/Fonts/arialbd.ttf"]


def font(size):
    for path in FONTS:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main():
    image = Image.new("RGB", (WIDTH, HEIGHT), "#102b33")
    draw = ImageDraw.Draw(image)

    # 垂直漸層背景
    for y in range(HEIGHT):
        t = y / HEIGHT
        draw.line([(0, y), (WIDTH, y)], fill=(
            int(0x10 * (1 - t) + 0x0c * t),
            int(0x2b * (1 - t) + 0x20 * t),
            int(0x33 * (1 - t) + 0x28 * t),
        ))

    # 星星
    star_positions = [
        (80, 90, 3), (190, 160, 2), (310, 70, 4), (430, 210, 2), (560, 110, 3),
        (690, 190, 2), (830, 80, 4), (960, 170, 2), (1100, 100, 3), (1150, 260, 2),
        (140, 300, 2), (380, 340, 3), (1020, 360, 2),
    ]
    for x, y, r in star_positions:
        draw.ellipse([x - r, y - r, x + r, y + r], fill="#dff6f7")

    # 左側遊戲畫面意象：平台 + 角色 + 星芒 + 隕石
    draw.rounded_rectangle([90, 175, 600, 470], radius=28, fill="#153943", outline="#2bb3a3", width=4)
    draw.rounded_rectangle([120, 400, 390, 440], radius=10, fill="#2bb3a3")
    draw.rounded_rectangle([415, 425, 570, 465], radius=10, fill="#4f9dd9")
    draw.rounded_rectangle([150, 330, 196, 400], radius=18, fill="#ffd166")
    draw.polygon([(154, 350), (132, 372), (154, 388)], fill="#e07a5f")
    draw.ellipse([172, 348, 178, 356], fill="#17343c")
    draw.text((173, 310), "✦", font=font(34), fill="#fff6d2", anchor="mm")
    draw.text((300, 355), "✦", font=font(72), fill="#ffd166", anchor="mm")
    for i in range(8):
        import math
        angle = i * math.pi / 4
        r = 26 if i % 2 == 0 else 15
        x = 492 + math.cos(angle) * r
        y = 395 + math.sin(angle) * r
        draw.line([(492, 395), (x, y)], fill="#e05c65", width=5)

    draw.text((660, 200), "星際跑者", font=font(76), fill="#ffffff")
    draw.text((664, 292), "S T A R   R U N N E R", font=font(26), fill="#ffd166")
    draw.text((664, 360), "原創 HTML5 無限跑酷遊戲", font=font(32), fill="#dfeff1")
    draw.text((664, 412), "零外部素材 · Canvas 2D · Web Audio", font=font(22), fill="#9dc3c7")
    draw.rounded_rectangle([660, 470, 1130, 542], radius=18, fill="#17343c", outline="#ffd166", width=2)
    draw.text((895, 506), "免註冊 · 免下載 · 立即遊玩", font=font(22), fill="#ffd166", anchor="mm")

    image.save(OUTPUT, optimize=True)
    print(f"已產生：{OUTPUT}")


if __name__ == "__main__":
    main()
