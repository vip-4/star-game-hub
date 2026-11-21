# -*- coding: utf-8 -*-
"""產生整合首頁的 1200x630 Open Graph 分享圖。"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1200, 630
OUTPUT = Path(__file__).resolve().parents[1] / "og-image.png"
FONTS = ["C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/msyh.ttc", "C:/Windows/Fonts/arialbd.ttf"]


def font(size):
    for path in FONTS:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main():
    image = Image.new("RGB", (WIDTH, HEIGHT), "#16112f")
    draw = ImageDraw.Draw(image)
    for y in range(HEIGHT):
        for x in range(0, WIDTH, 4):
            t = (x / WIDTH + y / HEIGHT) / 2
            draw.rectangle([x, y, x + 4, y + 1],
                           fill=(int(0x2b * (1 - t) + 0x16 * t),
                                 int(0x23 * (1 - t) + 0x11 * t),
                                 int(0x50 * (1 - t) + 0x2f * t)))

    gold = "#f5c451"
    # 左側兩款遊戲的代表圖形
    draw.rounded_rectangle([90, 160, 330, 470], radius=24, fill="#241d43", outline="#b8860b", width=4)
    draw.text((210, 245), "7", font=font(96), fill=gold, anchor="mm")
    draw.text((210, 370), "SLOTS", font=font(30), fill="#ffffff", anchor="mm")

    draw.rounded_rectangle([365, 160, 605, 470], radius=24, fill="#241d43", outline="#4a90d9", width=4)
    for i, c in enumerate(["#e05c65", "#e6a23c", "#4a90d9", "#7b68ae"]):
        draw.rounded_rectangle([400 + i * 48, 230, 438 + i * 48, 330], radius=10, fill=c)
    draw.text((485, 370), "RHYTHM", font=font(30), fill="#ffffff", anchor="mm")

    draw.text((670, 205), "星遊戲樂園", font=font(72), fill="#ffffff")
    draw.text((674, 295), "S T A R   G A M E   H U B", font=font(26), fill=gold)
    draw.text((674, 360), "兩款原創靜態 H5 遊戲", font=font(32), fill="#dfe6f2")
    draw.text((674, 412), "零外部素材 · Canvas 2D · Web Audio", font=font(22), fill="#a9a3c4")
    draw.rounded_rectangle([670, 470, 1130, 542], radius=18, fill="#2b2350", outline=gold, width=2)
    draw.text((900, 506), "免註冊 · 免下載 · 立即遊玩", font=font(22), fill=gold, anchor="mm")

    image.save(OUTPUT, optimize=True)
    print(f"已產生：{OUTPUT}")


if __name__ == "__main__":
    main()
