# -*- coding: utf-8 -*-
"""將首頁從五款更新為六款遊戲（加入星軌防衛 Star Tunnel）"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")

replacements = [
    # === Head meta ===
    ("<title>星遊戲樂園 Star Game Hub｜五款原創輕量靜態 H5 遊戲入口</title>",
     "<title>星遊戲樂園 Star Game Hub｜六款原創輕量靜態 H5 遊戲入口</title>"),
    ("星遊戲樂園整合五款原創靜態 H5 遊戲：星耀拉霸老虎機、星節奏四軌節奏、星際跑者無限跑酷、星影解謎分身平台與星際射手太空射擊。無後端",
     "星遊戲樂園整合六款原創靜態 H5 遊戲：星耀拉霸老虎機、星節奏四軌節奏、星際跑者無限跑酷、星影解謎分身平台、星際射手太空射擊與星軌防衛管狀射擊。無後端"),
    ("分身遊戲,太空射擊,STG,射擊遊戲,Canvas 遊戲",
     "分身遊戲,太空射擊,STG,射擊遊戲,管狀射擊,Tempest,復古街機,Canvas 遊戲"),
    ('<meta property="og:title" content="星遊戲樂園 Star Game Hub｜五款原創輕量靜態 H5 遊戲入口">',
     '<meta property="og:title" content="星遊戲樂園 Star Game Hub｜六款原創輕量靜態 H5 遊戲入口">'),
    ('<meta property="og:description" content="一次玩五款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎與星際射手。無外部素材、免註冊、免下載。">',
     '<meta property="og:description" content="一次玩六款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手與星軌防衛。無外部素材、免註冊、免下載。">'),
    ('content="星遊戲樂園首頁預覽，收錄老虎機、節奏、跑酷、解謎與射擊五款作品"',
     'content="星遊戲樂園首頁預覽，收錄老虎機、節奏、跑酷、解謎、射擊與管狀射擊六款作品"'),
    ('<meta name="twitter:title" content="星遊戲樂園 Star Game Hub｜五款原創輕量靜態 H5 遊戲入口">',
     '<meta name="twitter:title" content="星遊戲樂園 Star Game Hub｜六款原創輕量靜態 H5 遊戲入口">'),
    ('<meta name="twitter:description" content="五款原創靜態 H5 遊戲，支援手機與桌機，免註冊即可玩。">',
     '<meta name="twitter:description" content="六款原創靜態 H5 遊戲，支援手機與桌機，免註冊即可玩。">'),

    # === JSON-LD ===
    ('"description": "整合五款原創輕量靜態 H5 遊戲的入口首頁。"',
     '"description": "整合六款原創輕量靜態 H5 遊戲的入口首頁。"'),
    ('"name": "星遊戲樂園 Star Game Hub｜五款原創輕量靜態 H5 遊戲入口",',
     '"name": "星遊戲樂園 Star Game Hub｜六款原創輕量靜態 H5 遊戲入口",'),

    # ItemList: add 6th after the shooter (position 5) item's closing
    ('''            "url": "https://vip-4.github.io/star-game-hub/shooter/",
              "applicationCategory": "GameApplication",
              "operatingSystem": "任何支援 HTML5 的瀏覽器",
              "isAccessibleForFree": true,
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TWD" }
            }
          }
        ]''',
     '''            "url": "https://vip-4.github.io/star-game-hub/shooter/",
              "applicationCategory": "GameApplication",
              "operatingSystem": "任何支援 HTML5 的瀏覽器",
              "isAccessibleForFree": true,
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TWD" }
            }
          },
          {
            "@type": "ListItem",
            "position": 6,
            "item": {
              "@type": "GameApplication",
              "name": "星軌防衛 Star Tunnel",
              "description": "原創管狀射擊遊戲，在透視管道邊緣移動，射擊從深處沿軌道爬出的敵人，使用翻轉閃避危機。Canvas 2D 透視投影、Web Audio 即時合成音效、零外部素材。",
              "url": "https://vip-4.github.io/star-game-hub/tunnel/",
              "applicationCategory": "GameApplication",
              "operatingSystem": "任何支援 HTML5 的瀏覽器",
              "isAccessibleForFree": true,
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TWD" }
            }
          }
        ]'''),

    # FAQ JSON-LD answers
    ('目前收錄五款原創靜態遊戲：星耀拉霸 Star Spin（三轉輪老虎機，使用虛擬幣）、星節奏 Star Beat（四軌節奏遊戲）、星際跑者 Star Runner（無限跑酷遊戲）、星影解謎 Star Puzzle（分身平台解謎）與星際射手 Star Shooter（太空射擊）。五款都可在此頁直接進入遊玩。',
     '目前收錄六款原創靜態遊戲：星耀拉霸 Star Spin（三轉輪老虎機，使用虛擬幣）、星節奏 Star Beat（四軌節奏遊戲）、星際跑者 Star Runner（無限跑酷遊戲）、星影解謎 Star Puzzle（分身平台解謎）、星際射手 Star Shooter（太空射擊）與星軌防衛 Star Tunnel（管狀射擊）。六款都可在此頁直接進入遊玩。'),
    ('不需要。五款遊戲都是純前端靜態網頁，免註冊、免下載、無內購、無現金交易。星耀拉霸使用的是不具現金價值的虛擬幣，僅供娛樂。',
     '不需要。六款遊戲都是純前端靜態網頁，免註冊、免下載、無內購、無現金交易。星耀拉霸使用的是不具現金價值的虛擬幣，僅供娛樂。'),
    ('可以。五款遊戲都採用響應式設計。星耀拉霸提供觸控按鈕與高 DPI 畫面調整；星節奏提供四個觸控軌道按鈕；星際跑者提供大型觸控跳躍按鈕；星影解謎提供移動、跳躍、分身與回收觸控按鈕；星際射手提供滑動移動與點擊發射觸控操作。音效需由使用者首次點擊後才會解鎖。',
     '可以。六款遊戲都採用響應式設計。星耀拉霸提供觸控按鈕與高 DPI 畫面調整；星節奏提供四個觸控軌道按鈕；星際跑者提供大型觸控跳躍按鈕；星影解謎提供移動、跳躍、分身與回收觸控按鈕；星際射手提供滑動移動與點擊發射；星軌防衛提供移動、發射與翻轉觸控按鈕。音效需由使用者首次點擊後才會解鎖。'),
    ('沒有。五款遊戲的圖形都由 Canvas 2D 繪製，音效由 Web Audio API 合成，沒有外部圖片、音檔、字型或遊戲引擎套件，因此載入快速，也避免素材授權問題。',
     '沒有。六款遊戲的圖形都由 Canvas 2D 繪製，音效由 Web Audio API 合成，沒有外部圖片、音檔、字型或遊戲引擎套件，因此載入快速，也避免素材授權問題。'),

    # === Hero ===
    ('<p class="eyebrow">五款原創遊戲 · 單一靜態入口</p>',
     '<p class="eyebrow">六款原創遊戲 · 單一靜態入口</p>'),
    ('<h1 id="page-title">星遊戲樂園：在瀏覽器裡玩五款輕量 H5 遊戲</h1>',
     '<h1 id="page-title">星遊戲樂園：在瀏覽器裡玩六款輕量 H5 遊戲</h1>'),
    ('星遊戲樂園將「星耀拉霸」、「星節奏」、「星際跑者」、「星影解謎」與「星際射手」整合在同一個靜態站台。\n        五款遊戲都以原生 JavaScript 與 Canvas 2D 製作',
     '星遊戲樂園將「星耀拉霸」、「星節奏」、「星際跑者」、「星影解謎」、「星際射手」與「星軌防衛」整合在同一個靜態站台。\n        六款遊戲都以原生 JavaScript 與 Canvas 2D 製作'),
    ('<div><dt>收錄遊戲</dt><dd>5 款原創靜態 H5 遊戲</dd></div>',
     '<div><dt>收錄遊戲</dt><dd>6 款原創靜態 H5 遊戲</dd></div>'),
    ('<p>點擊卡片即可進入完整遊戲頁面，五個子頁都支援鍵盤與觸控操作。</p>',
     '<p>點擊卡片即可進入完整遊戲頁面，六個子頁都支援鍵盤與觸控操作。</p>'),

    # === Game card: add tunnel after shooter card ===
    ('''          <a class="play-link" href="shooter/">進入星際射手 <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>''',
     '''          <a class="play-link" href="shooter/">進入星際射手 <span aria-hidden="true">→</span></a>
        </article>

        <article class="game-card" aria-labelledby="tunnel-title">
          <div class="card-art tunnel-art" aria-hidden="true"><span>◎</span><span>◇</span><span>◈</span></div>
          <p class="card-tag">管狀射擊 · 復古街機</p>
          <h3 id="tunnel-title">星軌防衛 Star Tunnel</h3>
          <p>沿著透視管道邊緣移動，射擊從深處沿軌道爬出的敵人。敵人抵達邊緣會變成蜘蛛，可用翻轉瞬間到對側避開危機，守住核心。</p>
          <ul class="feature-list">
            <li>←/→ 移動、Space 發射、Shift 翻轉</li>
            <li>透視管道、蜘蛛危機、首領波次</li>
            <li>鍵盤與觸控雙操作、核心防守</li>
          </ul>
          <a class="play-link" href="tunnel/">進入星軌防衛 <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>'''),

    # === Compare table ===
    ('<h2 id="compare-heading">五款遊戲比較</h2>',
     '<h2 id="compare-heading">六款遊戲比較</h2>'),
    ('<p>下表提供可索引的結構化資訊，方便快速理解五款作品的差異。</p>',
     '<p>下表提供可索引的結構化資訊，方便快速理解六款作品的差異。</p>'),
    ('<caption>星耀拉霸、星節奏、星際跑者、星影解謎與星際射手的技術與操作比較</caption>',
     '<caption>星耀拉霸、星節奏、星際跑者、星影解謎、星際射手與星軌防衛的技術與操作比較</caption>'),
    ('<tr><th scope="col">項目</th><th scope="col">星耀拉霸</th><th scope="col">星節奏</th><th scope="col">星際跑者</th><th scope="col">星影解謎</th><th scope="col">星際射手</th></tr>',
     '<tr><th scope="col">項目</th><th scope="col">星耀拉霸</th><th scope="col">星節奏</th><th scope="col">星際跑者</th><th scope="col">星影解謎</th><th scope="col">星際射手</th><th scope="col">星軌防衛</th></tr>'),
    ('<tr><td>類型</td><td>三轉輪老虎機</td><td>四軌節奏遊戲</td><td>無限跑酷遊戲</td><td>分身平台解謎</td><td>太空射擊 (STG)</td></tr>',
     '<tr><td>類型</td><td>三轉輪老虎機</td><td>四軌節奏遊戲</td><td>無限跑酷遊戲</td><td>分身平台解謎</td><td>太空射擊 (STG)</td><td>管狀射擊</td></tr>'),
    ('<tr><td>主要操作</td><td>滑鼠／觸控按鈕、空白鍵</td><td>D F J K、方向鍵、觸控按鈕</td><td>空白鍵／上鍵／W、觸控跳躍</td><td>A/D、跳躍、C 分身、X 回收</td><td>←/→ 移動、Space 發射、P 暫停</td></tr>',
     '<tr><td>主要操作</td><td>滑鼠／觸控按鈕、空白鍵</td><td>D F J K、方向鍵、觸控按鈕</td><td>空白鍵／上鍵／W、觸控跳躍</td><td>A/D、跳躍、C 分身、X 回收</td><td>←/→ 移動、Space 發射、P 暫停</td><td>←/→ 移動、Space 發射、Shift 翻轉</td></tr>'),
    ('<tr><td>關卡來源</td><td>加權抽樣結果</td><td>固定種子譜面</td><td>固定種子程序生成</td><td>三關原創靜態資料</td><td>程序生成波次 + 首領</td></tr>',
     '<tr><td>關卡來源</td><td>加權抽樣結果</td><td>固定種子譜面</td><td>固定種子程序生成</td><td>三關原創靜態資料</td><td>程序生成波次 + 首領</td><td>程序生成波次 + 首領</td></tr>'),
    ('<tr><td>音效</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td></tr>',
     '<tr><td>音效</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td></tr>'),
    ('<tr><td>素材請求</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td></tr>',
     '<tr><td>素材請求</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td></tr>'),

    # === Features ===
    ('<article class="info-card"><h3>載入速度快</h3><p>五款遊戲都不依賴外部圖片、音檔或前端框架。',
     '<article class="info-card"><h3>載入速度快</h3><p>六款遊戲都不依賴外部圖片、音檔或前端框架。'),

    # === FAQ HTML ===
    ('<details><summary>星遊戲樂園收錄哪些遊戲？</summary><p>目前收錄五款原創靜態遊戲：星耀拉霸 Star Spin（三轉輪老虎機，使用虛擬幣）、星節奏 Star Beat（四軌節奏遊戲）、星際跑者 Star Runner（無限跑酷遊戲）、星影解謎 Star Puzzle（分身平台解謎）與星際射手 Star Shooter（太空射擊）。五款都可在此頁直接進入遊玩。</p></details>',
     '<details><summary>星遊戲樂園收錄哪些遊戲？</summary><p>目前收錄六款原創靜態遊戲：星耀拉霸 Star Spin（三轉輪老虎機，使用虛擬幣）、星節奏 Star Beat（四軌節奏遊戲）、星際跑者 Star Runner（無限跑酷遊戲）、星影解謎 Star Puzzle（分身平台解謎）、星際射手 Star Shooter（太空射擊）與星軌防衛 Star Tunnel（管狀射擊）。六款都可在此頁直接進入遊玩。</p></details>'),
    ('<details><summary>玩這些遊戲需要註冊或付費嗎？</summary><p>不需要。五款遊戲都是純前端靜態網頁',
     '<details><summary>玩這些遊戲需要註冊或付費嗎？</summary><p>不需要。六款遊戲都是純前端靜態網頁'),
    ('<details><summary>這些遊戲可以在手機上玩嗎？</summary><p>可以。五款遊戲都採用響應式設計。星耀拉霸提供觸控按鈕與高 DPI 畫面調整；星節奏提供四個觸控軌道按鈕；星際跑者提供大型觸控跳躍按鈕；星影解謎提供移動、跳躍、分身與回收觸控按鈕；星際射手提供滑動移動與點擊發射觸控操作。音效需由使用者首次點擊後才會解鎖。</p></details>',
     '<details><summary>這些遊戲可以在手機上玩嗎？</summary><p>可以。六款遊戲都採用響應式設計。星耀拉霸提供觸控按鈕與高 DPI 畫面調整；星節奏提供四個觸控軌道按鈕；星際跑者提供大型觸控跳躍按鈕；星影解謎提供移動、跳躍、分身與回收觸控按鈕；星際射手提供滑動移動與點擊發射；星軌防衛提供移動、發射與翻轉觸控按鈕。音效需由使用者首次點擊後才會解鎖。</p></details>'),
    ('<details><summary>遊戲使用了哪些第三方素材？</summary><p>沒有。五款遊戲的圖形都由 Canvas 2D 繪製',
     '<details><summary>遊戲使用了哪些第三方素材？</summary><p>沒有。六款遊戲的圖形都由 Canvas 2D 繪製'),

    # === Tech aside & footer ===
    ('<dt>站台結構</dt><dd>單一首頁 + slots/、rhythm/、runner/、puzzle/、shooter/ 五個子遊戲頁</dd>',
     '<dt>站台結構</dt><dd>單一首頁 + slots/、rhythm/、runner/、puzzle/、shooter/、tunnel/ 六個子遊戲頁</dd>'),
    ('五款遊戲皆不包含第三方遊戲素材。</p>',
     '六款遊戲皆不包含第三方遊戲素材。</p>'),
]

failed = []
for old, new in replacements:
    if old not in html:
        failed.append(old[:80])
        continue
    html = html.replace(old, new, 1)

(ROOT / "index.html").write_text(html, encoding="utf-8")

if failed:
    print("⚠️ 以下替換未找到：")
    for f in failed:
        print(" -", f)
else:
    print("✅ 所有替換成功")
