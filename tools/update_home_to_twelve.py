# -*- coding: utf-8 -*-
"""將首頁從十一款更新為十二款遊戲（加入星際對決 Star Duel）"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")

replacements = [
    ("<title>星遊戲樂園 Star Game Hub｜十一款原創輕量靜態 H5 遊戲入口</title>",
     "<title>星遊戲樂園 Star Game Hub｜十二款原創輕量靜態 H5 遊戲入口</title>"),
    ("星遊戲樂園整合十一款原創靜態 H5 遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支、星蛇尋跡與星芒合成。無後端",
     "星遊戲樂園整合十二款原創靜態 H5 遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支、星蛇尋跡、星芒合成與雙人對決星際對決。無後端"),
    ("2048,數字合成,益智,復古街機,Canvas 遊戲",
     "2048,數字合成,益智,雙人對戰,同屏遊戲,空中曲棍球,復古街機,Canvas 遊戲"),
    ('<meta property="og:title" content="星遊戲樂園 Star Game Hub｜十一款原創輕量靜態 H5 遊戲入口">',
     '<meta property="og:title" content="星遊戲樂園 Star Game Hub｜十二款原創輕量靜態 H5 遊戲入口">'),
    ('<meta property="og:description" content="一次玩十一款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支、星蛇尋跡與星芒合成。無外部素材、免註冊、免下載。">',
     '<meta property="og:description" content="一次玩十二款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支、星蛇尋跡、星芒合成與星際對決。無外部素材、免註冊、免下載。">'),
    ('content="星遊戲樂園首頁預覽，收錄老虎機、節奏、跑酷、解謎、射擊、管狀射擊、小行星射擊、打磚塊、分支防守、貪吃蛇與 2048 十一款作品"',
     'content="星遊戲樂園首頁預覽，收錄老虎機、節奏、跑酷、解謎、射擊、管狀射擊、小行星射擊、打磚塊、分支防守、貪吃蛇、2048 與雙人對決十二款作品"'),
    ('<meta name="twitter:title" content="星遊戲樂園 Star Game Hub｜十一款原創輕量靜態 H5 遊戲入口">',
     '<meta name="twitter:title" content="星遊戲樂園 Star Game Hub｜十二款原創輕量靜態 H5 遊戲入口">'),
    ('<meta name="twitter:description" content="十一款原創靜態 H5 遊戲，支援手機與桌機，免註冊即可玩。">',
     '<meta name="twitter:description" content="十二款原創靜態 H5 遊戲，包含雙人同屏對戰，支援手機與桌機，免註冊即可玩。">'),
    ('"description": "整合十一款原創輕量靜態 H5 遊戲的入口首頁。"',
     '"description": "整合十二款原創輕量靜態 H5 遊戲的入口首頁。"'),
    ('"name": "星遊戲樂園 Star Game Hub｜十一款原創輕量靜態 H5 遊戲入口",',
     '"name": "星遊戲樂園 Star Game Hub｜十二款原創輕量靜態 H5 遊戲入口",'),

    # ItemList 12th
    ('''            "url": "https://vip-4.github.io/star-game-hub/merge/",
              "applicationCategory": "GameApplication",
              "operatingSystem": "任何支援 HTML5 的瀏覽器",
              "isAccessibleForFree": true,
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TWD" }
            }
          }
        ]''',
     '''            "url": "https://vip-4.github.io/star-game-hub/merge/",
              "applicationCategory": "GameApplication",
              "operatingSystem": "任何支援 HTML5 的瀏覽器",
              "isAccessibleForFree": true,
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TWD" }
            }
          },
          {
            "@type": "ListItem",
            "position": 12,
            "item": {
              "@type": "GameApplication",
              "name": "星際對決 Star Duel",
              "description": "原創雙人同屏對戰遊戲，空中曲棍球風格。兩位玩家操控圓形戰機在各自半場二維移動，撞擊能量球射入對方球門，先得七分獲勝，另提供 AI 對手模式。Canvas 2D 程序繪圖、Web Audio 即時合成音效、零外部素材。",
              "url": "https://vip-4.github.io/star-game-hub/duel/",
              "applicationCategory": "GameApplication",
              "operatingSystem": "任何支援 HTML5 的瀏覽器",
              "isAccessibleForFree": true,
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TWD" }
            }
          }
        ]'''),

    # FAQ
    ('目前收錄十一款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支、星蛇尋跡與星芒合成 Star Merge（2048）。十一款都可在此頁直接進入遊玩。',
     '目前收錄十二款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支、星蛇尋跡、星芒合成 Star Merge（2048）與星際對決 Star Duel（雙人對戰）。十二款都可在此頁直接進入遊玩。'),
    ('不需要。十一款遊戲都是純前端靜態網頁，免註冊、免下載、無內購、無現金交易。星耀拉霸使用的是不具現金價值的虛擬幣，僅供娛樂。',
     '不需要。十二款遊戲都是純前端靜態網頁，免註冊、免下載、無內購、無現金交易。星耀拉霸使用的是不具現金價值的虛擬幣，僅供娛樂。'),
    ('可以。十一款遊戲都採用響應式設計，提供鍵盤與觸控完整操作，包括星芒合成的滑動合併、撤銷與提示。音效需由使用者首次點擊後才會解鎖。',
     '可以。十二款遊戲都採用響應式設計，提供鍵盤與觸控完整操作，包括星際對決的本地雙人同屏與 AI 對手模式。音效需由使用者首次點擊後才會解鎖。'),
    ('沒有。十一款遊戲的圖形都由 Canvas 2D 繪製，音效由 Web Audio API 合成，沒有外部圖片、音檔、字型或遊戲引擎套件，因此載入快速，也避免素材授權問題。',
     '沒有。十二款遊戲的圖形都由 Canvas 2D 繪製，音效由 Web Audio API 合成，沒有外部圖片、音檔、字型或遊戲引擎套件，因此載入快速，也避免素材授權問題。'),

    # Hero
    ('<p class="eyebrow">十一款原創遊戲 · 單一靜態入口</p>',
     '<p class="eyebrow">十二款原創遊戲 · 單一靜態入口</p>'),
    ('<h1 id="page-title">星遊戲樂園：在瀏覽器裡玩十一款輕量 H5 遊戲</h1>',
     '<h1 id="page-title">星遊戲樂園：在瀏覽器裡玩十二款輕量 H5 遊戲</h1>'),
    ('星遊戲樂園將「星耀拉霸」、「星節奏」、「星際跑者」、「星影解謎」、「星際射手」、「星軌防衛」、「星塵危機」、「星芒破塊」、「星脈分支」、「星蛇尋跡」與「星芒合成」整合在同一個靜態站台。\n        十一款遊戲都以原生 JavaScript 與 Canvas 2D 製作',
     '星遊戲樂園將「星耀拉霸」、「星節奏」、「星際跑者」、「星影解謎」、「星際射手」、「星軌防衛」、「星塵危機」、「星芒破塊」、「星脈分支」、「星蛇尋跡」、「星芒合成」與「星際對決」整合在同一個靜態站台。\n        十二款遊戲都以原生 JavaScript 與 Canvas 2D 製作'),
    ('<div><dt>收錄遊戲</dt><dd>11 款原創靜態 H5 遊戲</dd></div>',
     '<div><dt>收錄遊戲</dt><dd>12 款原創靜態 H5 遊戲</dd></div>'),
    ('<p>點擊卡片即可進入完整遊戲頁面，十一個子頁都支援鍵盤與觸控操作。</p>',
     '<p>點擊卡片即可進入完整遊戲頁面，十二個子頁都支援鍵盤與觸控操作。</p>'),

    # Game card
    ('''          <a class="play-link" href="merge/">進入星芒合成 <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>''',
     '''          <a class="play-link" href="merge/">進入星芒合成 <span aria-hidden="true">→</span></a>
        </article>

        <article class="game-card" aria-labelledby="duel-title">
          <div class="card-art duel-art" aria-hidden="true"><span>●</span><span>◆</span><span>●</span></div>
          <p class="card-tag">雙人對戰 · 同屏競技</p>
          <h3 id="duel-title">星際對決 Star Duel</h3>
          <p>空中曲棍球風格的雙人同屏對戰。操控圓形戰機在半場二維移動，撞擊能量球射入對方球門，先得七分獲勝，也可單人挑戰 AI。</p>
          <ul class="feature-list">
            <li>玩家 1 WASD、玩家 2 方向鍵</li>
            <li>本地雙人 / AI 對手、球門得分</li>
            <li>圓形碰撞物理、觸控拖曳</li>
          </ul>
          <a class="play-link" href="duel/">進入星際對決 <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>'''),

    # Compare table
    ('<h2 id="compare-heading">十一款遊戲比較</h2>',
     '<h2 id="compare-heading">十二款遊戲比較</h2>'),
    ('<p>下表提供可索引的結構化資訊，方便快速理解十一款作品的差異。</p>',
     '<p>下表提供可索引的結構化資訊，方便快速理解十二款作品的差異。</p>'),
    ('<caption>十一款原創遊戲的技術與操作比較</caption>',
     '<caption>十二款原創遊戲的技術與操作比較</caption>'),
    ('<tr><th scope="col">項目</th><th scope="col">星耀拉霸</th><th scope="col">星節奏</th><th scope="col">星際跑者</th><th scope="col">星影解謎</th><th scope="col">星際射手</th><th scope="col">星軌防衛</th><th scope="col">星塵危機</th><th scope="col">星芒破塊</th><th scope="col">星脈分支</th><th scope="col">星蛇尋跡</th><th scope="col">星芒合成</th></tr>',
     '<tr><th scope="col">項目</th><th scope="col">星耀拉霸</th><th scope="col">星節奏</th><th scope="col">星際跑者</th><th scope="col">星影解謎</th><th scope="col">星際射手</th><th scope="col">星軌防衛</th><th scope="col">星塵危機</th><th scope="col">星芒破塊</th><th scope="col">星脈分支</th><th scope="col">星蛇尋跡</th><th scope="col">星芒合成</th><th scope="col">星際對決</th></tr>'),
    ('<tr><td>類型</td><td>三轉輪老虎機</td><td>四軌節奏遊戲</td><td>無限跑酷遊戲</td><td>分身平台解謎</td><td>太空射擊 (STG)</td><td>管狀射擊</td><td>小行星射擊</td><td>打磚塊</td><td>分支防守</td><td>貪吃蛇</td><td>數字合成 (2048)</td></tr>',
     '<tr><td>類型</td><td>三轉輪老虎機</td><td>四軌節奏遊戲</td><td>無限跑酷遊戲</td><td>分身平台解謎</td><td>太空射擊 (STG)</td><td>管狀射擊</td><td>小行星射擊</td><td>打磚塊</td><td>分支防守</td><td>貪吃蛇</td><td>數字合成 (2048)</td><td>雙人對戰</td></tr>'),
    ('<tr><td>主要操作</td><td>滑鼠／觸控按鈕、空白鍵</td><td>D F J K、方向鍵、觸控按鈕</td><td>空白鍵／上鍵／W、觸控跳躍</td><td>A/D、跳躍、C 分身、X 回收</td><td>←/→ 移動、Space 發射、P 暫停</td><td>←/→ 移動、Space 發射、Shift 翻轉</td><td>←/→ 旋轉、↑ 推進、Space 發射</td><td>←/→ 移動、Space 發射、拖曳</td><td>1-4 / A-F 切色、Space 模式</td><td>方向鍵 / WASD、滑動</td><td>方向鍵 / WASD、滑動合併</td></tr>',
     '<tr><td>主要操作</td><td>滑鼠／觸控按鈕、空白鍵</td><td>D F J K、方向鍵、觸控按鈕</td><td>空白鍵／上鍵／W、觸控跳躍</td><td>A/D、跳躍、C 分身、X 回收</td><td>←/→ 移動、Space 發射、P 暫停</td><td>←/→ 移動、Space 發射、Shift 翻轉</td><td>←/→ 旋轉、↑ 推進、Space 發射</td><td>←/→ 移動、Space 發射、拖曳</td><td>1-4 / A-F 切色、Space 模式</td><td>方向鍵 / WASD、滑動</td><td>方向鍵 / WASD、滑動合併</td><td>玩家1 WASD、玩家2 方向鍵</td></tr>'),
    ('<tr><td>關卡來源</td><td>加權抽樣結果</td><td>固定種子譜面</td><td>固定種子程序生成</td><td>三關原創靜態資料</td><td>程序生成波次 + 首領</td><td>程序生成波次 + 首領</td><td>程序生成小行星 + 幽浮</td><td>程序生成磚塊關卡</td><td>程序生成彩色方塊</td><td>程序生成食物 + 障礙牆</td><td>隨機生成數字方塊</td></tr>',
     '<tr><td>關卡來源</td><td>加權抽樣結果</td><td>固定種子譜面</td><td>固定種子程序生成</td><td>三關原創靜態資料</td><td>程序生成波次 + 首領</td><td>程序生成波次 + 首領</td><td>程序生成小行星 + 幽浮</td><td>程序生成磚塊關卡</td><td>程序生成彩色方塊</td><td>程序生成食物 + 障礙牆</td><td>隨機生成數字方塊</td><td>即時對戰 + AI</td></tr>'),
    ('<tr><td>音效</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td></tr>',
     '<tr><td>音效</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td></tr>'),
    ('<tr><td>素材請求</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td></tr>',
     '<tr><td>素材請求</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td></tr>'),
    ('<article class="info-card"><h3>載入速度快</h3><p>十一款遊戲都不依賴外部圖片、音檔或前端框架。',
     '<article class="info-card"><h3>載入速度快</h3><p>十二款遊戲都不依賴外部圖片、音檔或前端框架。'),
    ('<details><summary>星遊戲樂園收錄哪些遊戲？</summary><p>目前收錄十一款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支、星蛇尋跡與星芒合成 Star Merge（2048）。十一款都可在此頁直接進入遊玩。</p></details>',
     '<details><summary>星遊戲樂園收錄哪些遊戲？</summary><p>目前收錄十二款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支、星蛇尋跡、星芒合成 Star Merge（2048）與星際對決 Star Duel（雙人對戰）。十二款都可在此頁直接進入遊玩。</p></details>'),
    ('<details><summary>玩這些遊戲需要註冊或付費嗎？</summary><p>不需要。十一款遊戲都是純前端靜態網頁',
     '<details><summary>玩這些遊戲需要註冊或付費嗎？</summary><p>不需要。十二款遊戲都是純前端靜態網頁'),
    ('<details><summary>這些遊戲可以在手機上玩嗎？</summary><p>可以。十一款遊戲都採用響應式設計，提供鍵盤與觸控完整操作，包括星芒合成的滑動合併、撤銷與提示。音效需由使用者首次點擊後才會解鎖。</p></details>',
     '<details><summary>這些遊戲可以在手機上玩嗎？</summary><p>可以。十二款遊戲都採用響應式設計，提供鍵盤與觸控完整操作，包括星際對決的本地雙人同屏與 AI 對手模式。音效需由使用者首次點擊後才會解鎖。</p></details>'),
    ('<details><summary>遊戲使用了哪些第三方素材？</summary><p>沒有。十一款遊戲的圖形都由 Canvas 2D 繪製',
     '<details><summary>遊戲使用了哪些第三方素材？</summary><p>沒有。十二款遊戲的圖形都由 Canvas 2D 繪製'),
    ('<dt>站台結構</dt><dd>單一首頁 + slots/、rhythm/、runner/、puzzle/、shooter/、tunnel/、asteroids/、breaker/、branch/、serpent/、merge/ 十一個子遊戲頁</dd>',
     '<dt>站台結構</dt><dd>單一首頁 + slots/、rhythm/、runner/、puzzle/、shooter/、tunnel/、asteroids/、breaker/、branch/、serpent/、merge/、duel/ 十二個子遊戲頁</dd>'),
    ('十一款遊戲皆不包含第三方遊戲素材。</p>',
     '十二款遊戲皆不包含第三方遊戲素材。</p>'),
]

failed = []
for old, new in replacements:
    if old not in html:
        failed.append(old[:90])
        continue
    html = html.replace(old, new, 1)

(ROOT / "index.html").write_text(html, encoding="utf-8")

if failed:
    print("⚠️ 以下替換未找到：")
    for f in failed:
        print(" -", f)
else:
    print("✅ 所有替換成功")
