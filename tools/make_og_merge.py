#!/usr/bin/env python3
"""生成星芒合成 OG 分享圖 (1200×630)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
OUT = Path(__file__).parent.parent / "merge" / "og-image.png"

BG = "#faf6ef"
FG = "#3d3226"
MUTED = "#8a7d6b"
ACCENT = "#ed9b3c"
BOARD = "#bbada0"
EMPTY = "rgba(238,228,218,0.35)"

TILE_COLORS = {
    2:("#eee4da","#776e65"), 4:("#ede0c8","#776e65"), 8:("#f2b179","#f9f6f2"),
    16:("#f59563","#f9f6f2"), 32:("#f67c5f","#f9f6f2"), 64:("#f65e3b","#f9f6f2"),
    128:("#edcf72","#f9f6f2"), 256:("#edcc61","#f9f6f2"), 512:("#edc850","#f9f6f2"),
    1024:("#edc53f","#f9f6f2"), 2048:("#edc22e","#f9f6f2")
}


def rgba(hex_color, alpha):
    h = hex_color.lstrip('#')
    if len(h) == 3:
        h = ''.join(ch * 2 for ch in h)
    r, g, b = int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)
    return (r, g, b, alpha)


def main():
    img = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # 裝飾光點
    import random
    random.seed(9)
    for _ in range(50):
        x, y = random.randint(0, W), random.randint(0, H)
        s = random.randint(2, 5)
        draw.ellipse([x, y, x+s, y+s], fill=rgba(ACCENT, random.randint(15, 45)))

    # 左側標題
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 58)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 28)
        font_card = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 20)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 15)
        font_num = ImageFont.truetype("C:/Windows/Fonts/msjhb.ttc", 40)
    except:
        font_title = font_sub = font_card = font_small = font_num = ImageFont.load_default()

    draw.text((70, 70), "星芒合成", font=font_title, fill=FG)
    draw.text((70, 145), "Star Merge", font=font_sub, fill=ACCENT)
    draw.line([(70, 195), (520, 195)], fill=rgba(ACCENT, 120), width=3)

    features = ["滑動合併 · 數字加倍", "撤銷 · 提示 · 最佳分數", "流暢動畫 · 粒子回饋", "Web Audio · 零外部素材"]
    for i, f in enumerate(features):
        y = 235 + i * 56
        draw.ellipse([72, y+6, 84, y+18], fill=ACCENT)
        draw.text((98, y), f, font=font_card, fill=FG)

    draw.text((70, H-50), "免註冊 · 免下載 · 開啟即玩", font=font_small, fill=MUTED)
    draw.text((70, H-24), "https://vip-4.github.io/star-game-hub/merge/", font=font_small, fill=rgba(ACCENT, 255))

    # 右側：4×4 遊戲板
    bx, by, cell, gap, pad = 660, 75, 108, 12, 16
    board_w = pad*2 + cell*4 + gap*3
    draw.rounded_rectangle([bx, by, bx+board_w, by+board_w], 16, fill=BOARD)

    grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2, 4],
        [0, 2, 0, 8]
    ]
    for r in range(4):
        for c in range(4):
            x = bx + pad + c*(cell+gap)
            y = by + pad + r*(cell+gap)
            v = grid[r][c]
            if v == 0:
                draw.rounded_rectangle([x, y, x+cell, y+cell], 10, fill=rgba("#eee4da", 90))
            else:
                bg, fg = TILE_COLORS.get(v, ("#3d3226", "#f9f6f2"))
                draw.rounded_rectangle([x, y, x+cell, y+cell], 10, fill=bg)
                txt = str(v)
                draw.text((x+cell/2, y+cell/2), txt, font=font_num, fill=fg, anchor="mm")

    # 2048 高亮標記
    x2048 = bx + pad + 3*(cell+gap)
    y2048 = by + pad + 1*(cell+gap)
    draw.rounded_rectangle([x2048-3, y2048-3, x2048+cell+3, y2048+cell+3], 12,
                           outline=rgba("#fff", 220), width=3)

    # 分數標記
    draw.rounded_rectangle([bx+board_w-160, by-45, bx+board_w, by-10], 10, fill=ACCENT)
    draw.text((bx+board_w-80, by-27), "2048 ✓", font=font_small, fill="#fff", anchor="mm")

    img.convert("RGB").save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")


if __name__ == "__main__":
    main()
