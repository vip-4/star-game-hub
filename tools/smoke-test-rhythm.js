/* 輕量煙測：以 Node 模擬 DOM/Canvas，驗證節奏遊戲可從開始跑到結算。
   執行：node tools/smoke-test.js                                   */
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
    dataset: {},
    attributes: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key]; },
    addEventListener(type, fn) { handlers[`${id}:${type}`] = fn; },
    getContext() { return ctx2d; },
    closest() { return null; }
  };
}

const elements = {};
for (const id of ['rhythm-canvas', 'score', 'combo', 'accuracy', 'status',
                  'live-region', 'start-button', 'pause-button', 'reset-button', 'sound-button']) {
  elements[id] = makeElement(id);
}
const pads = [0, 1, 2, 3].map((lane) => {
  const el = makeElement('pad-' + lane);
  el.dataset.lane = String(lane);
  return el;
});

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
    querySelectorAll: () => pads,
    addEventListener(type, fn) { handlers['document:' + type] = fn; },
    hidden: false
  },
  window: {
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    setTimeout: (fn) => fn(),
    AudioContext: undefined,
    webkitAudioContext: undefined
  }
};
sandbox.window.document = sandbox.document;
sandbox.globalThis = sandbox;

const source = fs.readFileSync(path.join(__dirname, '..', 'rhythm', 'js', 'game.js'), 'utf8');
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

if (elements['status'].textContent !== '等待開始') {
  throw new Error('初始狀態不正確：' + elements['status'].textContent);
}

handlers['start-button:click']();
if (elements['status'].textContent !== '遊戲中') {
  throw new Error('開始後狀態不正確：' + elements['status'].textContent);
}

// 以相同種子推算第一個音符，驗證擊打判定是否真的能得分
let seed = 20261122;
seed = (seed * 1664525 + 1013904223) >>> 0;
const firstLane = Math.floor((seed / 4294967296) * 4);
const firstTime = 1200;
pump(firstTime - 8);
const codeByLane = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
handlers['document:keydown']({ code: codeByLane[firstLane], repeat: false,
  target: { closest() { return null; } }, preventDefault() {} });
if (Number(elements['score'].textContent) <= 0) {
  throw new Error('擊打第一個音符後未得分：' + elements['score'].textContent);
}

pump(40000);

if (elements['status'].textContent !== '結算完成') {
  throw new Error('未進入結算：' + elements['status'].textContent);
}
if (elements['start-button'].textContent !== '再玩一次') {
  throw new Error('結算後按鈕文字不正確：' + elements['start-button'].textContent);
}
if (!elements['rhythm-canvas'].getAttribute('aria-label').includes('演出結束')) {
  throw new Error('Canvas aria-label 未更新');
}
if (!elements['live-region'].textContent.includes('演出結束')) {
  throw new Error('ARIA 即時區域未播報結算');
}

console.log('煙測通過：狀態', elements['status'].textContent,
  '· 分數', elements['score'].textContent,
  '· 連擊', elements['combo'].textContent,
  '· 準確率', elements['accuracy'].textContent);
console.log('播報內容：', elements['live-region'].textContent);
