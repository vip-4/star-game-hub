/* 輕量煙測：以 Node 模擬 DOM/Canvas，驗證跑酷遊戲可從開始跑到結算。
   執行：node tools/smoke-test-runner.js                              */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const handlers = {};
const rafQueue = [];
const gradient = { addColorStop() {} };
const ctx2d = new Proxy({}, {
  get(target, prop) {
    if (prop === 'createLinearGradient') return () => gradient;
    if (prop in target) return target[prop];
    return () => {};
  },
  set(target, prop, value) { target[prop] = value; return true; }
});

function makeElement(id) {
  return {
    id,
    textContent: '',
    disabled: false,
    attributes: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key]; },
    addEventListener(type, fn) { handlers[`${id}:${type}`] = fn; },
    getContext() { return ctx2d; }
  };
}

const ids = ['runner-canvas', 'score', 'crystals', 'distance', 'best',
  'status-text', 'live-region', 'start-button', 'pause-button',
  'reset-button', 'sound-button', 'jump-button'];
const elements = {};
for (const id of ids) elements[id] = makeElement(id);

let currentTime = 0;
const sandbox = {
  console,
  performance: { now: () => currentTime },
  Math, JSON, Number, Array, String, Object, Date,
  setTimeout: (fn) => fn(),
  clearTimeout() {},
  requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame() {},
  document: {
    getElementById: (id) => elements[id],
    addEventListener(type, fn) { handlers['document:' + type] = fn; },
    hidden: false
  },
  window: {
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    setTimeout: (fn) => fn(),
    cancelAnimationFrame() {},
    requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; },
    AudioContext: undefined,
    webkitAudioContext: undefined
  }
};
sandbox.window.document = sandbox.document;
sandbox.globalThis = sandbox;

const source = fs.readFileSync(path.join(__dirname, '..', 'runner', 'js', 'game.js'), 'utf8');
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

function pump(totalMs) {
  const step = 16;
  for (let elapsed = 0; elapsed < totalMs; elapsed += step) {
    currentTime += step;
    const frame = rafQueue.shift();
    if (frame) frame(currentTime);
  }
}

if (elements['status-text'].textContent.indexOf('等待開始') < 0) {
  throw new Error('初始狀態不正確：' + elements['status-text'].textContent);
}

handlers['start-button:click']();
if (elements['status-text'].textContent.indexOf('遊戲中') < 0) {
  throw new Error('開始後狀態不正確：' + elements['status-text'].textContent);
}

// 模擬按住空白鍵跳躍，確認角色能起跳並延遲跌落
handlers['document:keydown']({
  code: 'Space', repeat: false, target: { closest() { return null; } }, preventDefault() {}
});
pump(600);
if (Number(elements['distance'].textContent.replace(' m', '')) <= 0) {
  throw new Error('距離未增加');
}
handlers['document:keyup']({ code: 'Space' });

// 暫停／繼續流程
handlers['document:keydown']({
  code: 'KeyP', repeat: false, target: { closest() { return null; } }, preventDefault() {}
});
if (elements['status-text'].textContent.indexOf('已暫停') < 0) {
  throw new Error('暫停失敗');
}
handlers['document:keydown']({
  code: 'KeyP', repeat: false, target: { closest() { return null; } }, preventDefault() {}
});
if (elements['status-text'].textContent.indexOf('遊戲中') < 0) {
  throw new Error('繼續失敗');
}

// 不操作，讓角色最終跌落並進入結算
pump(20000);
if (elements['status-text'].textContent.indexOf('旅程結束') < 0) {
  throw new Error('未進入結算：' + elements['status-text'].textContent);
}
if (elements['start-button'].textContent !== '再玩一次') {
  throw new Error('結算後按鈕文字不正確：' + elements['start-button'].textContent);
}
if (!elements['runner-canvas'].getAttribute('aria-label').includes('演出結束')) {
  throw new Error('Canvas aria-label 未更新');
}
if (!elements['live-region'].textContent.includes('旅程結束')) {
  throw new Error('ARIA 即時區域未播報結算');
}

console.log('煙測通過：狀態', elements['status-text'].textContent);
console.log('分數', elements['score'].textContent,
  '· 星芒', elements['crystals'].textContent,
  '· 距離', elements['distance'].textContent,
  '· 最佳', elements['best'].textContent);
console.log('播報內容：', elements['live-region'].textContent);
