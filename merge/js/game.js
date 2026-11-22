/**
 * Star Merge - 原創 2048 數字合成遊戲
 * 零外部依賴：Canvas 2D + Web Audio 即時合成
 */
(() => {
  'use strict';

  // ========== 配置 ==========
  const CFG = {
    canvasId: 'game-canvas',
    size: 4,
    boardCss: 480,
    padding: 12,
    gap: 10,
    animMs: 130,
    winValue: 2048,
    starCount: 0
  };

  const TILE_COLORS = {
    0:    { bg: '#eee4da', fg: '#776e65' },
    2:    { bg: '#eee4da', fg: '#776e65' },
    4:    { bg: '#ede0c8', fg: '#776e65' },
    8:    { bg: '#f2b179', fg: '#f9f6f2' },
    16:   { bg: '#f59563', fg: '#f9f6f2' },
    32:   { bg: '#f67c5f', fg: '#f9f6f2' },
    64:   { bg: '#f65e3b', fg: '#f9f6f2' },
    128:  { bg: '#edcf72', fg: '#f9f6f2' },
    256:  { bg: '#edcc61', fg: '#f9f6f2' },
    512:  { bg: '#edc850', fg: '#f9f6f2' },
    1024: { bg: '#edc53f', fg: '#f9f6f2' },
    2048: { bg: '#edc22e', fg: '#f9f6f2' },
    super:{ bg: '#3d3226', fg: '#f9f6f2' }
  };

  // ========== 狀態 ==========
  let canvas, ctx, dpr, cssSize, cell, tilePad;
  let grid = [];                 // 值矩陣
  let letScore = 0;
  let best = 0;
  let history = [];              // 撤銷堆疊
  let animating = false;
  let won = false, gameOver = false;
  let hintCells = [];            // 提示高亮
  let particles = [];
  let muted = false, audioCtx = null, audioUnlocked = false;

  const hudScore = document.getElementById('hud-score');
  const hudBest = document.getElementById('hud-best');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-message');
  const btnStart = document.getElementById('btn-start');
  const btnMute = document.getElementById('btn-mute');
  const controlsHint = document.getElementById('controls-hint');
  const btnNew = document.getElementById('btn-new');
  const btnUndo = document.getElementById('btn-undo');
  const btnHint = document.getElementById('btn-hint');
  const liveStatus = document.getElementById('live-status');

  try { best = parseInt(localStorage.getItem('star-merge-best') || '0', 10) || 0; }
  catch (e) { best = 0; }

  // ========== 工具 ==========
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => Math.random() * (b - a) + a;
  const keyOf = (r, c) => r + ',' + c;

  // ========== Canvas ==========
  function initCanvas() {
    canvas = document.getElementById(CFG.canvasId);
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    cssSize = rect.width || CFG.boardCss;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const inner = cssSize - CFG.padding * 2 - CFG.gap * (CFG.size - 1);
    cell = inner / CFG.size;
    tilePad = Math.max(3, cell * 0.06);
    draw();
  }

  // ========== 音效 ==========
  function initAudio() {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { /* 靜默 */ }
  }
  function unlockAudio() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    audioUnlocked = true;
  }
  function tone(freq, dur, type = 'sine', vol = 0.08, slideTo = null) {
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
  function toggleMute() {
    muted = !muted;
    btnMute.textContent = muted ? '音效：關' : '音效：開';
    btnMute.setAttribute('aria-pressed', muted);
  }
  const SFX = {
    move: () => tone(440, 0.04, 'sine', 0.03),
    merge: v => tone(360 + Math.log2(v) * 45, 0.1, 'sine', 0.07),
    spawn: () => tone(660, 0.05, 'sine', 0.04),
    undo: () => tone(500, 0.08, 'sine', 0.06, 300),
    win: () => { tone(523, 0.1, 'sine', 0.08); tone(659, 0.1, 'sine', 0.08); tone(784, 0.2, 'sine', 0.08); },
    lose: () => { tone(300, 0.2, 'sine', 0.08, 120); }
  };

  // ========== 遊戲邏輯 ==========
  function emptyGrid() {
    return Array.from({ length: CFG.size }, () => Array(CFG.size).fill(0));
  }
  function cloneGrid(g) { return g.map(row => row.slice()); }

  function spawnTile() {
    const empty = [];
    for (let r = 0; r < CFG.size; r++) {
      for (let c = 0; c < CFG.size; c++) {
        if (grid[r][c] === 0) empty.push({ r, c });
      }
    }
    if (!empty.length) return;
    const spot = empty[Math.floor(Math.random() * empty.length)];
    grid[spot.r][spot.c] = Math.random() < 0.9 ? 2 : 4;
    return spot;
  }

  function startGame() {
    grid = emptyGrid();
    letScore = 0;
    history = [];
    won = false; gameOver = false;
    hintCells = []; particles = [];
    spawnTile(); spawnTile();
    updateHUD();
    overlay.classList.add('hidden');
    announce('新遊戲開始');
    draw();
  }

  function snapshot() {
    history.push({ grid: cloneGrid(grid), score: letScore });
    if (history.length > 20) history.shift();
    updateButtons();
  }

  /** 核心合併：回傳 { moved, scoreGain, mergedCells } */
  function move(dir) {
    if (animating || gameOver) return;
    unlockAudio();
    const g = cloneGrid(grid);
    const prev = JSON.stringify(g);
    let gain = 0;
    const mergedCells = [];

    const lines = [];
    // 為每個方向建立「處理順序」的座標線
    for (let i = 0; i < CFG.size; i++) {
      const line = [];
      for (let j = 0; j < CFG.size; j++) {
        if (dir === 'left')  line.push([i, j]);
        if (dir === 'right') line.push([i, CFG.size - 1 - j]);
        if (dir === 'up')    line.push([j, i]);
        if (dir === 'down')  line.push([CFG.size - 1 - j, i]);
      }
      lines.push(line);
    }

    for (const line of lines) {
      const vals = line.map(([r, c]) => g[r][c]).filter(v => v !== 0);
      const out = [];
      for (let k = 0; k < vals.length; k++) {
        if (k + 1 < vals.length && vals[k] === vals[k + 1]) {
          const nv = vals[k] * 2;
          out.push(nv);
          gain += nv;
          // 記錄合併位置（該線的第 out.length 個）
          const [rr, cc] = line[out.length];
          mergedCells.push({ r: rr, c: cc, value: nv });
          k++;
        } else {
          out.push(vals[k]);
        }
      }
      // 寫回
      for (let k = 0; k < CFG.size; k++) {
        const [r, c] = line[k];
        g[r][c] = out[k] || 0;
      }
    }

    const moved = JSON.stringify(g) !== prev;
    if (!moved) return;

    snapshot();
    grid = g;
    letScore += gain;

    // 合併粒子
    for (const mc of mergedCells) {
      const cx = CFG.padding + mc.c * (cell + CFG.gap) + cell/2;
      const cy = CFG.padding + mc.r * (cell + CFG.gap) + cell/2;
      for (let p = 0; p < 10; p++) {
        const a = rand(0, Math.PI * 2), s = rand(30, 90);
        particles.push({ x: cx, y: cy, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 0.4, max: 0.4, color: colorOf(mc.value).bg });
      }
    }

    hintCells = [];
    const spot = spawnTile();
    updateHUD();

    if (gain > 0) SFX.merge(Math.max(...mergedCells.map(m => m.value), 4));
    else SFX.move();

    // win 檢查
    if (!won && grid.some(row => row.some(v => v >= CFG.winValue))) {
      won = true;
      SFX.win();
      showOverlay('恭喜達成 2048！', `分數 ${letScore.toLocaleString()}<br>可繼續挑戰更高數字`, '繼續遊戲');
      btnStart.onclick = () => { overlay.classList.add('hidden'); draw(); };
      announce('恭喜達成 2048');
    }

    if (!canMove()) {
      gameOver = true;
      SFX.lose();
      saveBest();
      showOverlay('遊戲結束', `最終分數 ${letScore.toLocaleString()}`, '再玩一次');
      btnStart.onclick = startGame;
      announce('遊戲結束');
    }

    // 動畫：短暫縮放
    animating = true;
    draw();
    setTimeout(() => { animating = false; draw(); }, CFG.animMs);
  }

  function canMove() {
    for (let r = 0; r < CFG.size; r++) {
      for (let c = 0; c < CFG.size; c++) {
        const v = grid[r][c];
        if (v === 0) return true;
        if (c + 1 < CFG.size && grid[r][c + 1] === v) return true;
        if (r + 1 < CFG.size && grid[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  function undo() {
    if (!history.length || animating) return;
    const prev = history.pop();
    grid = prev.grid;
    letScore = prev.score;
    gameOver = false;
    hintCells = [];
    SFX.undo();
    updateHUD();
    updateButtons();
    draw();
    overlay.classList.add('hidden');
    announce('已撤銷一步');
  }

  function hint() {
    if (gameOver || animating) return;
    // 找一個能合併的位置
    for (let r = 0; r < CFG.size; r++) {
      for (let c = 0; c < CFG.size; c++) {
        const v = grid[r][c];
        if (v === 0) continue;
        if (c + 1 < CFG.size && grid[r][c + 1] === v) {
          hintCells = [keyOf(r, c), keyOf(r, c + 1)];
          break;
        }
        if (r + 1 < CFG.size && grid[r + 1][c] === v) {
          hintCells = [keyOf(r, c), keyOf(r + 1, c)];
          break;
        }
      }
      if (hintCells.length) break;
    }
    if (!hintCells.length) {
      // 找空格
      outer: for (let r = 0; r < CFG.size; r++) {
        for (let c = 0; c < CFG.size; c++) {
          if (grid[r][c] === 0) { hintCells = [keyOf(r, c)]; break outer; }
        }
      }
    }
    SFX.move();
    draw();
    announce(hintCells.length > 1 ? '提示：合併這兩個相同數字' : '提示：可在此處放置');
    setTimeout(() => { hintCells = []; draw(); }, 2000);
  }

  function colorOf(v) {
    return TILE_COLORS[v] || TILE_COLORS.super;
  }

  // ========== HUD / UI ==========
  function updateHUD() {
    hudScore.textContent = letScore.toLocaleString();
    hudBest.textContent = Math.max(best, letScore).toLocaleString();
  }
  function saveBest() {
    if (letScore > best) {
      best = letScore;
      try { localStorage.setItem('star-merge-best', String(best)); } catch (e) {}
    }
    updateHUD();
  }
  function updateButtons() {
    btnUndo.disabled = history.length === 0;
  }
  function showOverlay(title, msg, btn) {
    overlayTitle.innerHTML = title;
    overlayMsg.innerHTML = msg;
    btnStart.textContent = btn;
    overlay.classList.remove('hidden');
  }
  function announce(text) {
    liveStatus.textContent = text;
  }

  // ========== 繪製 ==========
  function draw() {
    if (!ctx || !cell) return;
    ctx.clearRect(0, 0, cssSize, cssSize);

    // 底板
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-elevated').trim() || '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, cssSize, cssSize, CFG.padding + 6);
    ctx.fill();

    // 空格
    for (let r = 0; r < CFG.size; r++) {
      for (let c = 0; c < CFG.size; c++) {
        const x = CFG.padding + c * (cell + CFG.gap);
        const y = CFG.padding + r * (cell + CFG.gap);
        ctx.fillStyle = 'rgba(128,110,85,0.13)';
        ctx.beginPath();
        ctx.roundRect(x, y, cell, cell, cell * 0.1);
        ctx.fill();
      }
    }

    // 方塊
    for (let r = 0; r < CFG.size; r++) {
      for (let c = 0; c < CFG.size; c++) {
        const v = grid[r][c];
        if (!v) continue;
        drawTile(r, c, v);
      }
    }

    // 提示高亮
    for (const k of hintCells) {
      const [r, c] = k.split(',').map(Number);
      const x = CFG.padding + c * (cell + CFG.gap);
      const y = CFG.padding + r * (cell + CFG.gap);
      ctx.strokeStyle = '#e07a2f';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.roundRect(x, y, cell, cell, cell * 0.1);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 粒子
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTile(r, c, v) {
    const x = CFG.padding + c * (cell + CFG.gap);
    const y = CFG.padding + r * (cell + CFG.gap);
    const col = colorOf(v);
    let scale = 1;
    if (animating) scale = 1 + 0.06 * Math.sin((Date.now() % CFG.animMs) / CFG.animMs * Math.PI);

    ctx.save();
    if (scale !== 1) {
      ctx.translate(x + cell/2, y + cell/2);
      ctx.scale(scale, scale);
      ctx.translate(-(x + cell/2), -(y + cell/2));
    }
    ctx.fillStyle = col.bg;
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.roundRect(x + tilePad, y + tilePad, cell - tilePad*2, cell - tilePad*2, cell * 0.1);
    ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    ctx.fillStyle = col.fg;
    const digits = String(v).length;
    const fontSize = Math.floor(cell * (digits <= 2 ? 0.42 : digits === 3 ? 0.35 : 0.29));
    ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(v), x + cell/2, y + cell/2 + 1);
    ctx.restore();
  }

  function updateParticles(dt) {
    let changed = false;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
      changed = true;
    }
    if (changed) draw();
  }

  // ========== 輸入 ==========
  function setupInput() {
    window.addEventListener('keydown', e => {
      unlockAudio();
      let d = null;
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': d = 'left'; break;
        case 'ArrowRight': case 'KeyD': d = 'right'; break;
        case 'ArrowUp': case 'KeyW': d = 'up'; break;
        case 'ArrowDown': case 'KeyS': d = 'down'; break;
        case 'KeyZ': undo(); return;
        case 'KeyH': hint(); return;
        case 'KeyR': startGame(); return;
        case 'KeyM': toggleMute(); return;
      }
      if (d) { e.preventDefault(); move(d); }
    }, { passive: false });

    // 觸控滑動
    let sx = 0, sy = 0, active = false;
    canvas.addEventListener('touchstart', e => {
      unlockAudio();
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY; active = true;
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchend', e => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    }, { passive: true });

    // 滑鼠拖曳（桌機也能滑）
    let mDown = false;
    canvas.addEventListener('mousedown', e => { unlockAudio(); mDown = true; sx = e.clientX; sy = e.clientY; });
    window.addEventListener('mouseup', e => {
      if (!mDown) return;
      mDown = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });

    btnStart.addEventListener('click', () => { unlockAudio(); startGame(); });
    btnNew.addEventListener('click', () => { unlockAudio(); startGame(); });
    btnUndo.addEventListener('click', () => { unlockAudio(); undo(); });
    btnHint.addEventListener('click', () => { unlockAudio(); hint(); });
    btnMute.addEventListener('click', toggleMute);
  }

  // ========== 初始化 ==========
  function init() {
    initCanvas();
    initAudio();
    setupInput();
    grid = emptyGrid();
    spawnTile(); spawnTile();
    updateHUD();
    updateButtons();
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    controlsHint.innerHTML = isMobile
      ? '滑動合併相同數字 · 目標 2048'
      : '方向鍵 / WASD 合併 · Z 撤銷 · H 提示 · R 重來 · M 音效';
    showOverlay('星芒合成 Star Merge', '合併相同數字，挑戰 2048', '開始遊戲');
    draw();

    // 粒子動畫迴圈
    let last = performance.now();
    const loop = ts => {
      const dt = (ts - last) / 1000;
      last = ts;
      if (particles.length) updateParticles(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();