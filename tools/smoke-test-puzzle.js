/* 輕量煙測：模擬 DOM/Canvas，驗證三關皆可用分身解謎並通關。
   執行：node tools/smoke-test-puzzle.js                          */
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

function makeElement(id, attrs) {
  return {
    id,
    textContent: '',
    disabled: false,
    attributes: attrs || {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key]; },
    addEventListener(type, fn) { handlers[`${id}:${type}`] = fn; },
    getContext() { return ctx2d; }
  };
}

const ids = ['puzzle-canvas', 'level', 'stars', 'total-stars', 'clones',
  'status-text', 'live-region', 'start-button', 'restart-button', 'sound-button'];
const elements = {};
for (const id of ids) elements[id] = makeElement(id);

const actions = ['left', 'right', 'jump', 'clone', 'recall'];
const touchButtons = actions.map((action) => makeElement('touch-' + action, { 'data-action': action }));

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
    querySelectorAll: (selector) => selector === '.touch-button' ? touchButtons : [],
    addEventListener(type, fn) { handlers['document:' + type] = fn; },
    hidden: false
  },
  window: {
    __PUZZLE_TEST__: true,
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

const source = fs.readFileSync(path.join(__dirname, '..', 'puzzle', 'js', 'game.js'), 'utf8');
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const debug = sandbox.window.__puzzleDebug;
if (!debug) throw new Error('測試掛鉤未注入');

function pump(ms) {
  const step = 16;
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    currentTime += step;
    const frame = rafQueue.shift();
    if (frame) frame(currentTime);
  }
}

function key(code) {
  handlers['document:keydown']({
    code, repeat: false, target: { closest() { return null; } }, preventDefault() {}
  });
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(debug.state() === 'IDLE', '初始狀態不正確');
key('Enter');
expect(debug.state() === 'PLAYING', '開始後狀態不正確');
expect(debug.lasersOn() === 1, '第一關雷射初始應為開啟');

// 第一關：站上壓力板 → 放置分身 → 雷射關閉 → 走到出口
debug.setPlayer(290, 436);
pump(40);
expect(debug.platesOn() === 1, '壓力板未被壓住');
expect(debug.lasersOn() === 0, '雷射未關閉');
debug.placeClone();
expect(debug.cloneCount() === 1, '分身未放置');
debug.setPlayer(900, 436);
pump(60);
expect(debug.state() === 'LEVEL_CLEAR', '第一關未通關：' + debug.state());

// 第二關：高台壓力板
key('Enter');
expect(debug.level() === 1, '未進入第二關');
debug.setPlayer(250, 346);
pump(40);
expect(debug.platesOn() === 1, '第二關壓力板未被壓住');
debug.placeClone();
debug.setPlayer(900, 436);
pump(60);
expect(debug.state() === 'LEVEL_CLEAR', '第二關未通關：' + debug.state());

// 第三關：兩個壓力板需要兩個分身
key('Enter');
expect(debug.level() === 2, '未進入第三關');
debug.setPlayer(190, 436);
pump(40);
debug.placeClone();
debug.setPlayer(540, 436);
pump(40);
expect(debug.platesOn() === 2, '第三關兩個壓力板未同時啟動');
expect(debug.lasersOn() === 0, '第三關雷射未全部關閉');
debug.setPlayer(910, 436);
pump(60);
expect(debug.state() === 'RESULT', '第三關未進入總結：' + debug.state());

expect(elements['puzzle-canvas'].getAttribute('aria-label').includes('全部關卡完成'), 'Canvas aria-label 未更新');
expect(elements['live-region'].textContent.includes('全部關卡完成'), 'ARIA 即時區域未播報總結');

console.log('煙測通過：三關皆完成');
console.log('狀態', debug.state(), '· 關卡', debug.level() + 1,
  '· 累計星星', debug.totalStars(), '· 分身', debug.cloneCount());
console.log('播報內容：', elements['live-region'].textContent);
