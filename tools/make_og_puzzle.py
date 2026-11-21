# -*- coding: utf-8 -*-
"""產生 Star Puzzle 的 1200x630 Open Graph 分享圖。"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1200, 630
OUTPUT = Path(__file__).resolve().parents[1] / "puzzle" / "og-image.png"
FONTS = ["C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/msyh.ttc", "C:/Windows/Fonts/arialbd.ttf"]


def font(size):
    for path in FONTS:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main():
    image = Image.new("RGB", (WIDTH, HEIGHT), "#1b1636")
    draw = ImageDraw.Draw(image)
    for y in range(HEIGHT):
        t = y / HEIGHT
        draw.line([(0, y), (WIDTH, y)], fill=(
            int(0x1b * (1 - t) + 0x15 * t),
            int(0x16 * (1 - t) + 0x11 * t),
            int(0x36 * (1 - t) + 0x2c * t),
        ))

    for x in range(0, WIDTH, 48):
        draw.line([(x, 0), (x, HEIGHT)], fill="#28214c", width=1)
    for y in range(0, HEIGHT, 48):
        draw.line([(0, y), (WIDTH, y)], fill="#28214c", width=1)

    # 左側遊戲意象：地面、壓力板、雷射、分身、主角、星星
    draw.rounded_rectangle([80, 175, 600, 470], radius=26, fill="#241e48", outline="#6b4fbf", width=4)
    draw.rounded_rectangle([100, 410, 580, 450], radius=8, fill="#4a4275")
    draw.rounded_rectangle([190, 400, 250, 412], radius=4, fill="#5ad19a")
    draw.rectangle([380, 230, 392, 410], fill="#ff5d6c")
    draw.rounded_rectangle([225, 366, 255, 410], radius=8, fill="#b8a2ff")
    draw.rounded_rectangle([300, 366, 330, 410], radius=8, fill="#7ee0d2")
    draw.text((315, 335), "✦", font=font(44), fill="#ffd166", anchor="mm")

    draw.text((655, 200), "星影解謎", font=font(76), fill="#ffffff")
    draw.text((659, 292), "S T A R   P U Z Z L E", font=font(26), fill="#b8a2ff")
    draw.text((659, 360), "原創 HTML5 分身解謎平台遊戲", font=font(32), fill="#e8e2ff")
    draw.text((659, 412), "零外部素材 · Canvas 2D · Web Audio", font=font(22), fill="#a79fd0")
    draw.rounded_rectangle([655, 470, 1130, 542], radius=18, fill="#2b2350", outline="#ffd166", width=2)
    draw.text((892, 506), "免註冊 · 免下載 · 立即遊玩", font=font(22), fill="#ffd166", anchor="mm")

    image.save(OUTPUT, optimize=True)
    print(f"已產生：{OUTPUT}")


if __name__ == "__main__":
    main()
