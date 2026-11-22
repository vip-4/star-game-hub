#!/usr/bin/env python3
"""生成星際對決 OG 分享圖 (1200×630)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1200, 630
OUT = Path(__file__).parent.parent / "duel" / "og-image.png"

BG_TOP = "#0c1018"
BG_BOTTOM = "#070a12"
LEFT = "#4ae0c0"
RIGHT = "#ff7a9c"
GOLD = "#ffd166"
WHITE = "#ffffff"
MUTED = "#8b98ad"


def rgba(hex_color, alpha):
    h = hex_color.lstrip('#')
    if len(h) == 3: h = ''.join(c*2 for c in h)
    return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), alpha)


def main():
    img = Image.new("RGBA", (W, H), BG_TOP)
    draw = ImageDraw.Draw(img)

    # 漸層
    rt,gt,bt = hex_to = (12,16,24)
    rb,gb,bb = (7,10,18)
    for y in range(H):
        t = y/H
        draw.line([(0,y),(W,y)], fill=(int(rt*(1-t)+rb*t),int(gt*(1-t)+gb*t),int(bt*(1-t)+bb*t),255))

    # 星空
    import random
    random.seed(27)
    for _ in range(90):
        x,y = random.randint(0,W), random.randint(0,H)
        s = random.randint(1,2)
        draw.ellipse([x,y,x+s,y+s], fill=(255,255,255,random.randint(50,170)))

    # 右側對戰場地
    ax, ay, aw, ah = 620, 100, 530, 400
    draw.rounded_rectangle([ax,ay,ax+aw,ay+ah], 16, fill=(10,14,24,255), outline=rgba(WHITE,60), width=3)
    # 中線
    draw.line([(ax+aw/2,ay),(ax+aw/2,ay+ah)], fill=rgba(WHITE,35), width=2)
    for dy in range(10, ah, 30):
        draw.line([(ax+aw/2, ay+dy),(ax+aw/2, ay+dy+12)], fill=rgba(WHITE,90), width=2)
    # 中圈
    draw.ellipse([ax+aw/2-60, ay+ah/2-60, ax+aw/2+60, ay+ah/2+60], outline=rgba(WHITE,35), width=2)
    # 球門
    gh = 130
    gy = ay + (ah-gh)/2
    draw.line([(ax, gy),(ax, gy+gh)], fill=LEFT, width=8)
    draw.line([(ax+aw, gy),(ax+aw, gy+gh)], fill=RIGHT, width=8)
    draw.rectangle([ax, gy, ax+22, gy+gh], fill=rgba(LEFT,45))
    draw.rectangle([ax+aw-22, gy, ax+aw, gy+gh], fill=rgba(RIGHT,45))

    # 戰機
    lx, ly = ax+115, ay+170
    rx, ry = ax+aw-115, ay+330
    for (px,py,col,dark) in [(lx,ly,LEFT,(26,138,114)),(rx,ry,RIGHT,(168,51,89))]:
        for i in range(30,0,-2):
            a = int(90*(1-i/30))
            draw.ellipse([px-i,py-i,px+i,py+i], fill=rgba(col,a))
        draw.ellipse([px-30,py-30,px+30,py+30], fill=col, outline=WHITE, width=3)
        draw.ellipse([px-6,py-6,px+6,py+6], fill=rgba(WHITE,220))

    # 能量球
    px, py = ax+aw/2+40, ay+ah/2-30
    for i in range(26,0,-2):
        draw.ellipse([px-i,py-i,px+i,py+i], fill=rgba(GOLD,int(80*(1-i/26))))
    draw.ellipse([px-15,py-15,px+15,py+15], fill=GOLD, outline=WHITE, width=2)
    draw.ellipse([px-11,py-11,px-4,py-4], fill=rgba(WHITE,230))

    # 軌跡粒子
    for i in range(8):
        tx = px - 30 - i*14
        ty = py + i*6
        draw.ellipse([tx-3,ty-3,tx+3,ty+3], fill=rgba(GOLD, 180-i*18))

    # 字型
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 56)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 28)
        font_card = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 20)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 14)
        font_score = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 44)
    except:
        font_title = font_sub = font_card = font_small = font_score = ImageFont.load_default()

    # 左側標題
    draw.text((70, 55), "星際對決", font=font_title, fill=WHITE)
    draw.text((70, 125), "Star Duel", font=font_sub, fill=GOLD)
    draw.line([(70, 175), (540, 175)], fill=rgba(GOLD, 90), width=2)

    # 比分示意
    draw.text((120, 210), "3", font=font_score, fill=LEFT, anchor="mm")
    draw.text((245, 210), ":", font=font_score, fill=MUTED, anchor="mm")
    draw.text((370, 210), "2", font=font_score, fill=RIGHT, anchor="mm")
    draw.text((245, 245), "先得 7 分獲勝", font=font_small, fill=MUTED, anchor="mm")

    features = ["本地雙人 · 同屏對戰", "AI 對手 · 單人也能玩", "圓形碰撞 · 動量轉移", "Web Audio · 零外部素材"]
    for i, f in enumerate(features):
        y = 290 + i * 50
        draw.ellipse([72, y+5, 84, y+17], fill=[LEFT, RIGHT, GOLD, "#5eb8ff"][i])
        draw.text((98, y), f, font=font_card, fill=WHITE)

    draw.text((70, H-42), "免註冊 · 免下載 · 開啟即玩", font=font_small, fill=MUTED)
    draw.text((70, H-18), "https://vip-4.github.io/star-game-hub/duel/", font=font_small, fill=rgba(GOLD, 200))

    img.convert("RGB").save(OUT, "PNG")
    print(f"✅ OG 圖已生成：{OUT} ({W}×{H})")


if __name__ == "__main__":
    main()
