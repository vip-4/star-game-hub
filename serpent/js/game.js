/**
 * Star Serpent - 原創貪吃蛇遊戲
 * 零外部依賴：Canvas 2D + Web Audio 即時合成
 */
(() => {
  'use strict';

  // ========== 配置 ==========
  const CFG = {
    canvasId: 'game-canvas',
    cols: 20,
    rows: 20,
    baseStep: 0.14,        // 每步時間（秒）
    minStep: 0.055,
    stepPerWave: 0.008,
    startLength: 3,
    targetBase: 5,         // 每關需吃果實數
    foods: {
      normal: { score: 10, color: '#5ee08a', glow: '#9af5b8', grow: 1 },
      golden: { score: 50, color: '#ffd166', glow: '#ffe6a0', grow: 2 },
      bomb:   { score: -20, color: '#ff5e7e', glow: '#ffa0b4', grow: -2 }
    },
    goldenChance: 0.16,
    bombChance: 0.09,
    stars: 40
  };

  const DIRS = {
    up:    { x: 0, y: -1 },
    down:  { x: 0, y: 1 },
    left:  { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  // ========== 狀態 ==========
  let canvas, ctx, width, height, dpr, cell, offsetX, offsetY;
  let lastTime = 0, running = false, paused = false, gameOver = false, started = false;

  let snake = [], dir = 'right', nextDir = 'right';
  let food = null, walls = [], particles = [], floaters = [];
  let score = 0, wave = 1, length = CFG.startLength, best = 0;
  let eaten = 0, target = CFG.targetBase, stepTimer = 0, shake = 0, flash = 0;
  let goldenTimer = 0;

  let audioCtx = null, audioUnlocked = false, muted = false;

  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-message');
  const btnStart = document.getElementById('btn-start');
  const btnMute = document.getElementById('btn-mute');
  const controlsHint = document.getElementById('controls-hint');
  const hudScore = document.getElementById('hud-score');
  const hudWave = document.getElementById('hud-wave');
  const hudLength = document.getElementById('hud-length');
  const hudBest = document.getElementById('hud-best');

  try { best = parseInt(localStorage.getItem('star-serpent-best') || '0', 10) || 0; }
  catch (e) { best = 0; }

  // ========== 工具 ==========
  const rand = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const key = (x, y) => x + ',' + y;
  const TAU = Math.PI * 2;

  // ========== Canvas ==========
  function initCanvas() {
    canvas = document.getElementById(CFG.canvasId);
    ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = Math.floor(Math.min(width, height) / Math.max(CFG.cols, CFG.rows));
    offsetX = Math.floor((width - cell * CFG.cols) / 2);
    offsetY = Math.floor((height - cell * CFG.rows) / 2);
  }
  const cellX = x => offsetX + x * cell;
  const cellY = y => offsetY + y * cell;

  // ========== 音效 ==========
  function initAudio() {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { /* 靜默 */ }
  }
  function unlockAudio() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    audioUnlocked = true;
  }
  function tone(freq, dur, type = 'sine', vol = 0.1, slideTo = null) {
    if (!audioCtx || muted || !audioUnlocked) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(now); osc.stop(now + dur);
  }
  function noise(dur, vol = 0.08) {
    if (!audioCtx || muted || !audioUnlocked) return;
    const n = Math.floor(audioCtx.sampleRate * dur);
    const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = audioCtx.createBufferSource(), g = audioCtx.createGain();
    src.buffer = buf; g.gain.value = vol;
    src.connect(g).connect(audioCtx.destination); src.start();
  }
  const SFX = {
    eat: () => tone(520, 0.08, 'sine', 0.09, 780),
    golden: () => { tone(660, 0.08, 'sine', 0.1); tone(990, 0.12, 'sine', 0.09); },
    bomb: () => { noise(0.2, 0.12); tone(200, 0.2, 'sawtooth', 0.1, 60); },
    wave: () => { tone(523, 0.1, 'sine', 0.09); tone(659, 0.1, 'sine', 0.09); tone(784, 0.15, 'sine', 0.09); },
    death: () => { noise(0.3, 0.12); tone(300, 0.4, 'sine', 0.12, 80); },
    turn: () => tone(440, 0.03, 'sine', 0.04)
  };
  function toggleMute() {
    muted = !muted;
    btnMute.textContent = muted ? '取消靜音' : '靜音';
    btnMute.setAttribute('aria-pressed', muted);
  }

  // ========== 粒子 ==========
  function burst(x, y, color, count, speed, life) {
    for (let i = 0; i < count && particles.length < 200; i++) {
      const a = rand(0, TAU), s = rand(speed * 0.3, speed);
      particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, size: rand(2,4), life: rand(life*0.5, life), max: life, color });
    }
  }
  function addFloater(x, y, text, color) {
    floaters.push({ x, y, text, color, life: 0.9, max: 0.9 });
  }
  function updateEffects(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.y -= 24 * dt; f.life -= dt;
      if (f.life <= 0) floaters.splice(i, 1);
    }
  }
  function drawEffects() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    for (const f of floaters) {
      ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  // ========== 蛇與食物 ==========
  function resetSnake() {
    const sx = Math.floor(CFG.cols / 2), sy = Math.floor(CFG.rows / 2);
    snake = [];
    for (let i = 0; i < CFG.startLength; i++) snake.push({ x: sx - i, y: sy });
    dir = 'right'; nextDir = 'right';
    length = CFG.startLength;
  }
  function occupied(x, y) {
    if (snake.some(s => s.x === x && s.y === y)) return true;
    if (walls.some(w => w.x === x && w.y === y)) return true;
    if (food && food.x === x && food.y === y) return true;
    return false;
  }
  function spawnFood() {
    let x, y, tries = 0;
    do {
      x = Math.floor(rand(0, CFG.cols));
      y = Math.floor(rand(0, CFG.rows));
      tries++;
    } while (occupied(x, y) && tries < 200);
    if (tries >= 200) return; // 畫面滿了

    const roll = Math.random();
    let type = 'normal';
    if (goldenTimer <= 0 && roll < CFG.goldenChance) type = 'golden';
    else if (roll > 1 - CFG.bombChance) type = 'bomb';
    const F = CFG.foods[type];
    food = { x, y, type, color: F.color, glow: F.glow, score: F.score, grow: F.grow, bob: rand(0, TAU) };
    if (type === 'golden') goldenTimer = 6;
  }
  function buildWalls() {
    walls = [];
    if (wave === 1) return;
    const count = Math.min(3 + wave * 2, 20);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rand(2, CFG.cols - 2));
      const y = Math.floor(rand(2, CFG.rows - 2));
      // 不在中心安全區生成
      if (Math.abs(x - CFG.cols/2) < 4 && Math.abs(y - CFG.rows/2) < 4) continue;
      if (snake.some(s => s.x === x && s.y === y)) continue;
      if (walls.some(w => w.x === x && w.y === y)) continue;
      walls.push({ x, y });
    }
  }

  // ========== 移動 ==========
  function changeDir(d) {
    if (!running || paused || gameOver) return;
    if (OPPOSITE[d] === dir && snake.length > 1) return;
    nextDir = d;
    SFX.turn();
  }
  function step() {
    dir = nextDir;
    const d = DIRS[dir];
    const head = { x: snake[0].x + d.x, y: snake[0].y + d.y };

    // 撞牆（邊界）
    if (head.x < 0 || head.x >= CFG.cols || head.y < 0 || head.y >= CFG.rows) return die();
    // 撞自己（尾巴即將移開的位置可通過）
    const bodyToCheck = snake.slice(0, snake.length - (food ? 0 : 1));
    if (bodyToCheck.some(s => s.x === head.x && s.y === head.y)) return die();
    // 撞障礙
    if (walls.some(w => w.x === head.x && w.y === head.y)) return die();

    snake.unshift(head);

    if (food && head.x === food.x && head.y === food.y) {
      eatFood();
    } else {
      while (snake.length > length) snake.pop();
    }
  }
  function eatFood() {
    const f = food;
    score += f.score;
    length = Math.max(1, length + f.grow);
    eaten++;
    const cx = cellX(f.x) + cell/2, cy = cellY(f.y) + cell/2;
    burst(cx, cy, f.color, f.type === 'golden' ? 22 : 12, 130, 0.5);

    if (f.type === 'bomb') {
      addFloater(cx, cy, f.score + '', '#ff5e7e');
      SFX.bomb(); shake = 0.3; flash = 0.4;
    } else if (f.type === 'golden') {
      addFloater(cx, cy, '+' + f.score, '#ffd166');
      SFX.golden();
    } else {
      addFloater(cx, cy, '+' + f.score, '#9af5b8');
      SFX.eat();
    }

    food = null;
    updateHUD();

    if (eaten >= target) {
      wave++;
      eaten = 0;
      target = CFG.targetBase + wave * 2;
      score += 100 * wave;
      buildWalls();
      SFX.wave();
      flash = 0.4;
      addFloater(width/2, height/2, `關卡 ${wave}!`, '#ffffff');
    }
  }
  function die() {
    running = false; gameOver = true;
    if (score > best) {
      best = score;
      try { localStorage.setItem('star-serpent-best', String(best)); } catch (e) {}
    }
    SFX.death();
    const h = snake[0];
    burst(cellX(h.x) + cell/2, cellY(h.y) + cell/2, '#5ee08a', 30, 200, 0.9);
    updateHUD();
    setTimeout(() => {
      showOverlay('遊戲結束', `最終分數：${score.toLocaleString()}<br>到達關卡：${wave}`, '再玩一次');
      btnStart.onclick = startGame;
      btnStart.focus();
    }, 600);
  }

  // ========== HUD / 流程 ==========
  function updateHUD() {
    hudScore.textContent = score.toLocaleString();
    hudWave.textContent = wave;
    hudLength.textContent = length;
    hudBest.textContent = Math.max(best, score).toLocaleString();
  }
  function showOverlay(title, msg, btn) {
    overlayTitle.innerHTML = title;
    overlayMsg.innerHTML = msg;
    btnStart.textContent = btn;
    overlay.classList.remove('hidden');
  }
  function startGame() {
    score = 0; wave = 1; eaten = 0;
    target = CFG.targetBase;
    goldenTimer = 0;
    walls = []; particles = []; floaters = [];
    shake = 0; flash = 0;
    gameOver = false; paused = false; started = true;
    resetSnake();
    spawnFood();
    updateHUD();
    overlay.classList.add('hidden');
    running = true;
    stepTimer = 0;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
  function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    if (paused) {
      showOverlay('暫停中', '按繼續鍵或點擊畫面繼續', '繼續');
      btnStart.onclick = resumeGame;
      btnStart.focus();
    } else resumeGame();
  }
  function resumeGame() {
    paused = false;
    overlay.classList.add('hidden');
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  // ========== 主迴圈 ==========
  function gameLoop(ts) {
    if (!running) return;
    const dt = Math.min((ts - lastTime) / 1000, 1 / 30);
    lastTime = ts;
    if (!paused) update(dt);
    draw();
    requestAnimationFrame(gameLoop);
  }
  function update(dt) {
    const stepTime = Math.max(CFG.minStep, CFG.baseStep - (wave - 1) * CFG.stepPerWave);
    stepTimer += dt;
    while (stepTimer >= stepTime) {
      stepTimer -= stepTime;
      step();
      if (!running) break;
    }
    if (goldenTimer > 0) goldenTimer -= dt;
    if (!food) spawnFood();
    if (food) food.bob += dt * 4;
    updateEffects(dt);
    if (shake > 0) shake -= dt;
    if (flash > 0) flash -= dt;
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#060c08';
    ctx.fillRect(0, 0, width, height);

    // 棋盤格
    ctx.fillStyle = 'rgba(94,224,138,0.025)';
    for (let y = 0; y < CFG.rows; y++) {
      for (let x = 0; x < CFG.cols; x++) {
        if ((x + y) % 2 === 0) ctx.fillRect(cellX(x), cellY(y), cell, cell);
      }
    }
    // 邊框
    ctx.strokeStyle = 'rgba(94,224,138,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, cell * CFG.cols, cell * CFG.rows);

    if (shake > 0) ctx.translate(rand(-4, 4) * shake, rand(-4, 4) * shake);

    // 障礙牆
    for (const w of walls) {
      const x = cellX(w.x), y = cellY(w.y);
      const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
      grad.addColorStop(0, '#4a5560'); grad.addColorStop(1, '#2a333c');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, cell - 4, cell - 4, 3);
      ctx.fill();
      ctx.strokeStyle = '#788896'; ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 食物
    if (food) drawFood();

    // 蛇
    drawSnake();

    // 粒子與浮字
    drawEffects();

    // 進度提示
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`果實 ${eaten}/${target}`, offsetX + 6, offsetY - 8 > 10 ? offsetY - 8 : 20);

    if (flash > 0) {
      ctx.globalAlpha = flash * 0.35;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }
  function drawFood() {
    const cx = cellX(food.x) + cell/2;
    const cy = cellY(food.y) + cell/2 + Math.sin(food.bob) * 2;
    const r = cell * 0.34;
    ctx.save();
    if (food.type === 'bomb') {
      ctx.fillStyle = '#1a1018';
      ctx.strokeStyle = food.color; ctx.lineWidth = 2;
      ctx.shadowColor = food.color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = food.color;
      ctx.font = `bold ${Math.floor(r)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', cx, cy + 1);
    } else {
      const grad = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.1, cx, cy, r);
      grad.addColorStop(0, '#fff'); grad.addColorStop(0.3, food.glow); grad.addColorStop(1, food.color);
      ctx.fillStyle = grad;
      ctx.shadowColor = food.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      if (food.type === 'golden') {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k/8)*TAU + food.bob*0.3;
          const rr = r + 4;
          const px = cx + Math.cos(a)*rr, py = cy + Math.sin(a)*rr;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawSnake() {
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const x = cellX(s.x), y = cellY(s.y);
      const t = i / Math.max(1, snake.length - 1);
      const r = Math.max(2, cell*0.42 - t * cell*0.1);
      const grad = ctx.createRadialGradient(x + cell/2 - r*0.3, y + cell/2 - r*0.3, r*0.1,
                                            x + cell/2, y + cell/2, r);
      grad.addColorStop(0, i === 0 ? '#d8ffe6' : '#9af5b8');
      grad.addColorStop(1, i === 0 ? '#5ee08a' : `hsl(${140 + t*30}, 60%, ${42 - t*12}%)`);
      ctx.fillStyle = grad;
      ctx.shadowColor = '#5ee08a'; ctx.shadowBlur = i === 0 ? 14 : 5;
      ctx.beginPath();
      ctx.roundRect(x + cell/2 - r, y + cell/2 - r, r*2, r*2, r*0.5);
      ctx.fill();
      ctx.shadowBlur = 0;
      // 眼睛
      if (i === 0) {
        ctx.fillStyle = '#08140c';
        const dv = DIRS[dir];
        const ex = dv.x !== 0 ? cell/2 + dv.x * r*0.45 : 0;
        const ey = dv.y !== 0 ? cell/2 + dv.y * r*0.45 : 0;
        const perp = dv.x !== 0 ? 1 : 0;
        for (const sgn of [-1, 1]) {
          const px = x + cell/2 + ex + (perp ? 0 : sgn * r*0.42);
          const py = y + cell/2 + ey + (perp ? sgn * r*0.42 : 0);
          ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, r*0.14), 0, TAU); ctx.fill();
        }
      }
    }
  }

  // ========== 輸入 ==========
  function setupInput() {
    window.addEventListener('keydown', e => {
      if (!audioUnlocked) unlockAudio();
      let d = null;
      switch (e.code) {
        case 'ArrowUp': case 'KeyW': d = 'up'; break;
        case 'ArrowDown': case 'KeyS': d = 'down'; break;
        case 'ArrowLeft': case 'KeyA': d = 'left'; break;
        case 'ArrowRight': case 'KeyD': d = 'right'; break;
        case 'Space':
          e.preventDefault();
          if (!started || gameOver) { startGame(); return; }
          if (paused) resumeGame();
          break;
        case 'KeyP': case 'Escape': togglePause(); break;
        case 'KeyM': toggleMute(); break;
      }
      if (d) { e.preventDefault(); changeDir(d); }
    }, { passive: false });

    const bindDir = (id, d) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => {
        if (!audioUnlocked) unlockAudio();
        changeDir(d);
      });
    };
    bindDir('btn-up', 'up');
    bindDir('btn-down', 'down');
    bindDir('btn-left', 'left');
    bindDir('btn-right', 'right');

    // 滑動手勢
    let touchStart = null;
    const wrap = canvas.parentElement;
    wrap.addEventListener('touchstart', e => {
      if (!audioUnlocked) unlockAudio();
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    wrap.addEventListener('touchend', e => {
      if (!touchStart) return;
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
        changeDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      }
      touchStart = null;
    }, { passive: true });

    btnStart.addEventListener('click', () => {
      if (!audioUnlocked) unlockAudio();
      if (gameOver || !running) startGame(); else if (paused) resumeGame();
    });
    btnMute.addEventListener('click', toggleMute);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && running && !paused && !gameOver) togglePause();
    });
  }

  // ========== 初始化 ==========
  function init() {
    initCanvas();
    initAudio();
    setupInput();
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    controlsHint.innerHTML = isMobile
      ? '滑動或方向鍵轉向 · 避開牆壁與自己'
      : '方向鍵 / WASD 轉向 · Space 開始 · P 暫停 · M 靜音';
    showOverlay('星蛇尋跡 Star Serpent', '吃果實成長，金色加倍，小心炸彈與障礙', '開始遊戲');
    btnStart.onclick = startGame;
    resetSnake();
    updateHUD();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();