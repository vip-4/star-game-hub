# -*- coding: utf-8 -*-
"""將首頁從九款更新為十款遊戲（加入星蛇尋跡 Star Serpent）"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")

replacements = [
    ("<title>星遊戲樂園 Star Game Hub｜九款原創輕量靜態 H5 遊戲入口</title>",
     "<title>星遊戲樂園 Star Game Hub｜十款原創輕量靜態 H5 遊戲入口</title>"),
    ("星遊戲樂園整合九款原創靜態 H5 遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊與星脈分支。無後端",
     "星遊戲樂園整合十款原創靜態 H5 遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支與星蛇尋跡。無後端"),
    ("分支遊戲,顏色匹配,復古街機,Canvas 遊戲",
     "分支遊戲,顏色匹配,貪吃蛇,Snake,復古街機,Canvas 遊戲"),
    ('<meta property="og:title" content="星遊戲樂園 Star Game Hub｜九款原創輕量靜態 H5 遊戲入口">',
     '<meta property="og:title" content="星遊戲樂園 Star Game Hub｜十款原創輕量靜態 H5 遊戲入口">'),
    ('<meta property="og:description" content="一次玩九款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊與星脈分支。無外部素材、免註冊、免下載。">',
     '<meta property="og:description" content="一次玩十款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支與星蛇尋跡。無外部素材、免註冊、免下載。">'),
    ('content="星遊戲樂園首頁預覽，收錄老虎機、節奏、跑酷、解謎、射擊、管狀射擊、小行星射擊、打磚塊與分支防守九款作品"',
     'content="星遊戲樂園首頁預覽，收錄老虎機、節奏、跑酷、解謎、射擊、管狀射擊、小行星射擊、打磚塊、分支防守與貪吃蛇十款作品"'),
    ('<meta name="twitter:title" content="星遊戲樂園 Star Game Hub｜九款原創輕量靜態 H5 遊戲入口">',
     '<meta name="twitter:title" content="星遊戲樂園 Star Game Hub｜十款原創輕量靜態 H5 遊戲入口">'),
    ('<meta name="twitter:description" content="九款原創靜態 H5 遊戲，支援手機與桌機，免註冊即可玩。">',
     '<meta name="twitter:description" content="十款原創靜態 H5 遊戲，支援手機與桌機，免註冊即可玩。">'),
    ('"description": "整合九款原創輕量靜態 H5 遊戲的入口首頁。"',
     '"description": "整合十款原創輕量靜態 H5 遊戲的入口首頁。"'),
    ('"name": "星遊戲樂園 Star Game Hub｜九款原創輕量靜態 H5 遊戲入口",',
     '"name": "星遊戲樂園 Star Game Hub｜十款原創輕量靜態 H5 遊戲入口",'),

    # ItemList 10th
    ('''            "url": "https://vip-4.github.io/star-game-hub/branch/",
              "applicationCategory": "GameApplication",
              "operatingSystem": "任何支援 HTML5 的瀏覽器",
              "isAccessibleForFree": true,
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TWD" }
            }
          }
        ]''',
     '''            "url": "https://vip-4.github.io/star-game-hub/branch/",
              "applicationCategory": "GameApplication",
              "operatingSystem": "任何支援 HTML5 的瀏覽器",
              "isAccessibleForFree": true,
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TWD" }
            }
          },
          {
            "@type": "ListItem",
            "position": 10,
            "item": {
              "@type": "GameApplication",
              "name": "星蛇尋跡 Star Serpent",
              "description": "原創貪吃蛇遊戲，操控星蛇在網格中覓食成長。普通果實加分、金色果實加倍、炸彈扣分縮短，並有程序生成障礙牆與關卡進度。Canvas 2D 程序繪圖、Web Audio 即時合成音效、零外部素材。",
              "url": "https://vip-4.github.io/star-game-hub/serpent/",
              "applicationCategory": "GameApplication",
              "operatingSystem": "任何支援 HTML5 的瀏覽器",
              "isAccessibleForFree": true,
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TWD" }
            }
          }
        ]'''),

    # FAQ
    ('目前收錄九款原創靜態遊戲：星耀拉霸 Star Spin、星節奏 Star Beat、星際跑者 Star Runner、星影解謎 Star Puzzle、星際射手 Star Shooter、星軌防衛 Star Tunnel、星塵危機 Star Asteroids、星芒破塊 Star Breaker 與星脈分支 Star Branch（分支防守）。九款都可在此頁直接進入遊玩。',
     '目前收錄十款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支與星蛇尋跡 Star Serpent（貪吃蛇）。十款都可在此頁直接進入遊玩。'),
    ('不需要。九款遊戲都是純前端靜態網頁，免註冊、免下載、無內購、無現金交易。星耀拉霸使用的是不具現金價值的虛擬幣，僅供娛樂。',
     '不需要。十款遊戲都是純前端靜態網頁，免註冊、免下載、無內購、無現金交易。星耀拉霸使用的是不具現金價值的虛擬幣，僅供娛樂。'),
    ('可以。九款遊戲都採用響應式設計，提供鍵盤與觸控完整操作，包括星脈分支的四色分支切換與分裂／合併按鈕。音效需由使用者首次點擊後才會解鎖。',
     '可以。十款遊戲都採用響應式設計，提供鍵盤與觸控完整操作，包括星蛇尋跡的方向鍵與滑動手勢。音效需由使用者首次點擊後才會解鎖。'),
    ('沒有。九款遊戲的圖形都由 Canvas 2D 繪製，音效由 Web Audio API 合成，沒有外部圖片、音檔、字型或遊戲引擎套件，因此載入快速，也避免素材授權問題。',
     '沒有。十款遊戲的圖形都由 Canvas 2D 繪製，音效由 Web Audio API 合成，沒有外部圖片、音檔、字型或遊戲引擎套件，因此載入快速，也避免素材授權問題。'),

    # Hero
    ('<p class="eyebrow">九款原創遊戲 · 單一靜態入口</p>',
     '<p class="eyebrow">十款原創遊戲 · 單一靜態入口</p>'),
    ('<h1 id="page-title">星遊戲樂園：在瀏覽器裡玩九款輕量 H5 遊戲</h1>',
     '<h1 id="page-title">星遊戲樂園：在瀏覽器裡玩十款輕量 H5 遊戲</h1>'),
    ('星遊戲樂園將「星耀拉霸」、「星節奏」、「星際跑者」、「星影解謎」、「星際射手」、「星軌防衛」、「星塵危機」、「星芒破塊」與「星脈分支」整合在同一個靜態站台。\n        九款遊戲都以原生 JavaScript 與 Canvas 2D 製作',
     '星遊戲樂園將「星耀拉霸」、「星節奏」、「星際跑者」、「星影解謎」、「星際射手」、「星軌防衛」、「星塵危機」、「星芒破塊」、「星脈分支」與「星蛇尋跡」整合在同一個靜態站台。\n        十款遊戲都以原生 JavaScript 與 Canvas 2D 製作'),
    ('<div><dt>收錄遊戲</dt><dd>9 款原創靜態 H5 遊戲</dd></div>',
     '<div><dt>收錄遊戲</dt><dd>10 款原創靜態 H5 遊戲</dd></div>'),
    ('<p>點擊卡片即可進入完整遊戲頁面，九個子頁都支援鍵盤與觸控操作。</p>',
     '<p>點擊卡片即可進入完整遊戲頁面，十個子頁都支援鍵盤與觸控操作。</p>'),

    # Game card
    ('''          <a class="play-link" href="branch/">進入星脈分支 <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>''',
     '''          <a class="play-link" href="branch/">進入星脈分支 <span aria-hidden="true">→</span></a>
        </article>

        <article class="game-card" aria-labelledby="serpent-title">
          <div class="card-art serpent-art" aria-hidden="true"><span>◉</span><span>●</span><span>◆</span></div>
          <p class="card-tag">貪吃蛇 · 經典益智</p>
          <h3 id="serpent-title">星蛇尋跡 Star Serpent</h3>
          <p>操控星蛇在網格中覓食成長。普通果實加分、金色果實加倍、炸彈會縮短身體，還有程序生成障礙牆與關卡目標考驗路線規劃。</p>
          <ul class="feature-list">
            <li>方向鍵 / WASD 轉向、滑動觸控</li>
            <li>三種食物、障礙迷宮、關卡遞增</li>
            <li>最高分記錄、粒子特效、ARIA 支援</li>
          </ul>
          <a class="play-link" href="serpent/">進入星蛇尋跡 <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>'''),

    # Compare table
    ('<h2 id="compare-heading">九款遊戲比較</h2>',
     '<h2 id="compare-heading">十款遊戲比較</h2>'),
    ('<p>下表提供可索引的結構化資訊，方便快速理解九款作品的差異。</p>',
     '<p>下表提供可索引的結構化資訊，方便快速理解十款作品的差異。</p>'),
    ('<caption>星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊與星脈分支的技術與操作比較</caption>',
     '<caption>十款原創遊戲的技術與操作比較</caption>'),
    ('<tr><th scope="col">項目</th><th scope="col">星耀拉霸</th><th scope="col">星節奏</th><th scope="col">星際跑者</th><th scope="col">星影解謎</th><th scope="col">星際射手</th><th scope="col">星軌防衛</th><th scope="col">星塵危機</th><th scope="col">星芒破塊</th><th scope="col">星脈分支</th></tr>',
     '<tr><th scope="col">項目</th><th scope="col">星耀拉霸</th><th scope="col">星節奏</th><th scope="col">星際跑者</th><th scope="col">星影解謎</th><th scope="col">星際射手</th><th scope="col">星軌防衛</th><th scope="col">星塵危機</th><th scope="col">星芒破塊</th><th scope="col">星脈分支</th><th scope="col">星蛇尋跡</th></tr>'),
    ('<tr><td>類型</td><td>三轉輪老虎機</td><td>四軌節奏遊戲</td><td>無限跑酷遊戲</td><td>分身平台解謎</td><td>太空射擊 (STG)</td><td>管狀射擊</td><td>小行星射擊</td><td>打磚塊</td><td>分支防守</td></tr>',
     '<tr><td>類型</td><td>三轉輪老虎機</td><td>四軌節奏遊戲</td><td>無限跑酷遊戲</td><td>分身平台解謎</td><td>太空射擊 (STG)</td><td>管狀射擊</td><td>小行星射擊</td><td>打磚塊</td><td>分支防守</td><td>貪吃蛇</td></tr>'),
    ('<tr><td>主要操作</td><td>滑鼠／觸控按鈕、空白鍵</td><td>D F J K、方向鍵、觸控按鈕</td><td>空白鍵／上鍵／W、觸控跳躍</td><td>A/D、跳躍、C 分身、X 回收</td><td>←/→ 移動、Space 發射、P 暫停</td><td>←/→ 移動、Space 發射、Shift 翻轉</td><td>←/→ 旋轉、↑ 推進、Space 發射</td><td>←/→ 移動、Space 發射、拖曳</td><td>1-4 / A-F 切色、Space 模式</td></tr>',
     '<tr><td>主要操作</td><td>滑鼠／觸控按鈕、空白鍵</td><td>D F J K、方向鍵、觸控按鈕</td><td>空白鍵／上鍵／W、觸控跳躍</td><td>A/D、跳躍、C 分身、X 回收</td><td>←/→ 移動、Space 發射、P 暫停</td><td>←/→ 移動、Space 發射、Shift 翻轉</td><td>←/→ 旋轉、↑ 推進、Space 發射</td><td>←/→ 移動、Space 發射、拖曳</td><td>1-4 / A-F 切色、Space 模式</td><td>方向鍵 / WASD、滑動</td></tr>'),
    ('<tr><td>關卡來源</td><td>加權抽樣結果</td><td>固定種子譜面</td><td>固定種子程序生成</td><td>三關原創靜態資料</td><td>程序生成波次 + 首領</td><td>程序生成波次 + 首領</td><td>程序生成小行星 + 幽浮</td><td>程序生成磚塊關卡</td><td>程序生成彩色方塊</td></tr>',
     '<tr><td>關卡來源</td><td>加權抽樣結果</td><td>固定種子譜面</td><td>固定種子程序生成</td><td>三關原創靜態資料</td><td>程序生成波次 + 首領</td><td>程序生成波次 + 首領</td><td>程序生成小行星 + 幽浮</td><td>程序生成磚塊關卡</td><td>程序生成彩色方塊</td><td>程序生成食物 + 障礙牆</td></tr>'),
    ('<tr><td>音效</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td></tr>',
     '<tr><td>音效</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td><td>Web Audio 即時合成</td></tr>'),
    ('<tr><td>素材請求</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td></tr>',
     '<tr><td>素材請求</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td><td>無</td></tr>'),
    ('<article class="info-card"><h3>載入速度快</h3><p>九款遊戲都不依賴外部圖片、音檔或前端框架。',
     '<article class="info-card"><h3>載入速度快</h3><p>十款遊戲都不依賴外部圖片、音檔或前端框架。'),
    ('<details><summary>星遊戲樂園收錄哪些遊戲？</summary><p>目前收錄九款原創靜態遊戲：星耀拉霸 Star Spin、星節奏 Star Beat、星際跑者 Star Runner、星影解謎 Star Puzzle、星際射手 Star Shooter、星軌防衛 Star Tunnel、星塵危機 Star Asteroids、星芒破塊 Star Breaker 與星脈分支 Star Branch（分支防守）。九款都可在此頁直接進入遊玩。</p></details>',
     '<details><summary>星遊戲樂園收錄哪些遊戲？</summary><p>目前收錄十款原創靜態遊戲：星耀拉霸、星節奏、星際跑者、星影解謎、星際射手、星軌防衛、星塵危機、星芒破塊、星脈分支與星蛇尋跡 Star Serpent（貪吃蛇）。十款都可在此頁直接進入遊玩。</p></details>'),
    ('<details><summary>玩這些遊戲需要註冊或付費嗎？</summary><p>不需要。九款遊戲都是純前端靜態網頁',
     '<details><summary>玩這些遊戲需要註冊或付費嗎？</summary><p>不需要。十款遊戲都是純前端靜態網頁'),
    ('<details><summary>这些遊戲可以在手機上玩嗎？</summary>', '<details><summary>這些遊戲可以在手機上玩嗎？</summary>'),
    ('<details><summary>這些遊戲可以在手機上玩嗎？</summary><p>可以。九款遊戲都採用響應式設計，提供鍵盤與觸控完整操作，包括星脈分支的四色分支切換與分裂／合併按鈕。音效需由使用者首次點擊後才會解鎖。</p></details>',
     '<details><summary>這些遊戲可以在手機上玩嗎？</summary><p>可以。十款遊戲都採用響應式設計，提供鍵盤與觸控完整操作，包括星蛇尋跡的方向鍵與滑動手勢。音效需由使用者首次點擊後才會解鎖。</p></details>'),
    ('<details><summary>遊戲使用了哪些第三方素材？</summary><p>沒有。九款遊戲的圖形都由 Canvas 2D 繪製',
     '<details><summary>遊戲使用了哪些第三方素材？</summary><p>沒有。十款遊戲的圖形都由 Canvas 2D 繪製'),
    ('<dt>站台結構</dt><dd>單一首頁 + slots/、rhythm/、runner/、puzzle/、shooter/、tunnel/、asteroids/、breaker/、branch/ 九個子遊戲頁</dd>',
     '<dt>站台結構</dt><dd>單一首頁 + slots/、rhythm/、runner/、puzzle/、shooter/、tunnel/、asteroids/、breaker/、branch/、serpent/ 十個子遊戲頁</dd>'),
    ('九款遊戲皆不包含第三方遊戲素材。</p>',
     '十款遊戲皆不包含第三方遊戲素材。</p>'),
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
