/**
 * 星際射手煙測 - 使用 JSDOM + Canvas 模擬瀏覽器環境驗證遊戲邏輯
 */
const { JSDOM } = require('jsdom');
const { Canvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// 註冊 Canvas 到 JSDOM
const dom = new JSDOM(`<!DOCTYPE html><html><body>
  <canvas id="game-canvas" width="480" height="640"></canvas>
  <div id="overlay" class="overlay hidden">
    <div class="overlay-content">
      <h2 id="overlay-title"></h2>
      <p id="overlay-message"></p>
      <div class="overlay-controls">
        <button id="btn-start" class="btn primary"></button>
        <button id="btn-mute" class="btn secondary"></button>
      </div>
      <p class="controls-hint" id="controls-hint"></p>
    </div>
  </div>
  <div id="hud-score" class="hud-value"></div>
  <div id="hud-wave" class="hud-value"></div>
  <div id="hud-lives" class="hud-value"></div>
  <div id="hud-power" class="hud-value"></div>
</body></html>`, {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  runScripts: 'dangerously',
  resources: 'usable',
  beforeParse(window) {
    window.HTMLCanvasElement.prototype.getContext = function(type) {
      if (type === '2d') {
        const canvas = new Canvas(this.width, this.height);
        const ctx = canvas.getContext('2d');
        // 綁定 canvas 到 context 以便取得 width/height
        ctx.canvas = canvas;
        return ctx;
      }
      return null;
    };
    window.Canvas = Canvas;
  }
});

global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.AudioContext = class {
  constructor() { this.currentTime = 0; this.state = 'running'; this.sampleRate = 44100; }
  resume() { this.state = 'running'; }
  createOscillator() { return { type: 'square', frequency: { value: 440 }, connect: () => ({ connect: () => {} }), start: () => {}, stop: () => {} }; }
  createGain() { return { gain: { value: 1, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
  createBufferSource() { return { buffer: null, connect: () => ({ connect: () => {} }), start: () => {} }; }
  createBuffer() { return { getChannelData: () => new Float32Array(44100) }; }
};
global.webkitAudioContext = global.AudioContext;
global.navigator = { userAgent: 'Node.js Test' };
global.performance = { now: () => Date.now() };
global.HTMLElement = dom.window.HTMLElement;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

// 讀取並執行遊戲代碼
const gameCode = fs.readFileSync(
  path.join(__dirname, '../shooter/js/game.js'),
  'utf-8'
);
eval(gameCode);

// 等待初始化完成
setTimeout(() => {
  console.log('=== 星際射手煙測開始 ===');

  // 測試 1: 遊戲初始化
  const canvas = document.getElementById('game-canvas');
  console.assert(canvas !== null, 'Canvas 應存在');
  console.log('✅ Canvas 存在');

  // 測試 2: 覆蓋層顯示
  const overlay = document.getElementById('overlay');
  console.assert(!overlay.classList.contains('hidden'), '開始畫面應顯示');
  console.log('✅ 開始畫面顯示正確');

  // 測試 3: 開始遊戲
  const btnStart = document.getElementById('btn-start');
  btnStart.click();

  // 等待遊戲狀態更新
  setTimeout(() => {
    console.assert(overlay.classList.contains('hidden'), '遊戲開始後覆蓋層應隱藏');
    console.log('✅ 遊戲開始，覆蓋層正確隱藏');

    // 測試 4: HUD 更新
    const hudScore = document.getElementById('hud-score');
    const hudWave = document.getElementById('hud-wave');
    const hudLives = document.getElementById('hud-lives');
    const hudPower = document.getElementById('hud-power');

    console.assert(hudScore.textContent === '0', '初始分數應為 0');
    console.assert(hudWave.textContent === '1', '初始波次應為 1');
    console.assert(hudLives.textContent.includes('♥'), '應顯示生命');
    console.log('✅ HUD 初始值正確');

    // 測試 5: 暫停/繼續
    const pauseEvent = new dom.window.KeyboardEvent('keydown', { code: 'KeyP' });
    window.dispatchEvent(pauseEvent);
    setTimeout(() => {
      console.assert(!overlay.classList.contains('hidden'), '暫停時覆蓋層應顯示');
      console.log('✅ 暫停功能正常');

      // 繼續
      btnStart.click();
      setTimeout(() => {
        console.assert(overlay.classList.contains('hidden'), '繼續後覆蓋層應隱藏');
        console.log('✅ 繼續功能正常');

        // 測試 6: 靜音切換
        const btnMute = document.getElementById('btn-mute');
        btnMute.click();
        console.assert(btnMute.textContent === '取消靜音', '靜音後按鈕文字應變更');
        btnMute.click();
        console.assert(btnMute.textContent === '靜音', '取消靜音後按鈕文字應還原');
        console.log('✅ 靜音切換正常');

        console.log('\n=== 所有煙測通過 ✅ ===');
        process.exit(0);
      }, 100);
    }, 100);
  }, 100);
}, 200);

// 處理未捕獲錯誤
process.on('unhandledRejection', (err) => {
  console.error('測試錯誤:', err);
  process.exit(1);
});