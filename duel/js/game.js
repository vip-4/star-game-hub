/**
 * Star Duel - 原創雙人同屏對戰（空中曲棍球風格）
 * 零外部依賴：Canvas 2D + 圓形碰撞物理 + Web Audio 即時合成
 */
(() => {
  'use strict';

  // ========== 配置（邏輯座標）==========
  const CFG = {
    W: 900, H: 540,
    winScore: 7,
    paddle: { r: 30, speed: 460, maxSpeed: 900 },
    puck: { r: 15, maxSpeed: 900, damping: 0.86, serveSpeed: 300 },
    goal: { height: 180 },     // 球門開口高度
    ai: { speed: 320, reaction: 0.12, error: 26 },
    starCount: 60
  };
  const GOAL_TOP = (CFG.H - CFG.goal.height) / 2;
  const GOAL_BOTTOM = GOAL_TOP + CFG.goal.height;

  // ========== 狀態 ==========
  let canvas, ctx, dpr, cssW, scale;
  let lastTime = 0, running = false, paused = false, gameOver = false;
  let mode = 'pvp'; // 'pvp' | 'ai'

  let leftP, rightP, puck;
  let scoreL = 0, scoreR = 0;
  let particles = [], stars = [], shake = 0, flash = 0;
  let serveTimer = 0, scoring = false;
  let audioCtx = null, audioUnlocked = false, muted = false;

  const keys = {
    w:false, a:false, s:false, d:false,
    up:false, down:false, left:false, right:false
  };
  const touch = { left: null, right: null }; // {x,y}

  const hudLeft = document.getElementById('hud-left');
  const hudRight = document.getElementById('hud-right');
  const hudMode = document.getElementById('hud-mode');
  const hudTarget = document.getElementById('hud-target');
  const rightLabel = document.getElementById('right-label');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-message');
  const btnStart = document.getElementById('btn-start');
  const btnMute = document.getElementById('btn-mute');
  const btnNew = document.getElementById('btn-new');
  const btnPause = document.getElementById('btn-pause');
  const btnPvp = document.getElementById('btn-mode-pvp');
  const btnAi = document.getElementById('btn-mode-ai');
  const liveStatus = document.getElementById('live-status');

  // ========== 工具 ==========
  const rand = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const len = (x, y) => Math.hypot(x, y);

  // ========== Canvas ==========
  function initCanvas() {
    canvas = document.getElementById(CFG.canvasId);
    ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width || CFG.W;
    const cssH = cssW * CFG.H / CFG.W;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.height = cssH + 'px';
    scale = (cssW / CFG.W) * dpr;
    initStars();
    draw();
  }
  function initStars() {
    stars = [];
    for (let i = 0; i < CFG.starCount; i++) {
      stars.push({ x: rand(0, CFG.W), y: rand(0, CFG.H), s: rand(1, 2.5), a: rand(0.15, 0.75) });
    }
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
  function tone(freq, dur, type='sine', vol=0.1, slideTo=null) {
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
  const SFX = {
    hitPaddle: sp => tone(360 + Math.min(sp, 700) * 0.4, 0.07, 'square', 0.09),
    hitWall: () => tone(240, 0.05, 'sine', 0.06),
    score: () => { tone(523,0.1,'sine',0.1); tone(659,0.1,'sine',0.1); tone(784,0.18,'sine',0.1); },
    win: () => { tone(523,0.12,'sine',0.1); tone(659,0.12,'sine',0.1); tone(784,0.12,'sine',0.1); tone(1046,0.25,'sine',0.1); },
    serve: () => tone(440, 0.1, 'sine', 0.07, 660)
  };
  function toggleMute() {
    muted = !muted;
    btnMute.textContent = muted ? '音效：關' : '音效：開';
    btnMute.setAttribute('aria-pressed', muted);
  }

  // ========== 粒子 ==========
  function burst(x, y, color, count, speed, life) {
    for (let i = 0; i < count && particles.length < 240; i++) {
      const a = rand(0, TAU), s = rand(speed*0.25, speed);
      particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, size: rand(2,5), life: rand(life*0.5,life), max: life, color });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length-1; i>=0; i--) {
      const p = particles[i];
      p.x += p.vx*dt; p.y += p.vy*dt;
      p.vx *= 0.98; p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i,1);
    }
  }

  // ========== 物件 ==========
  function makePaddle(side) {
    const r = CFG.paddle.r;
    return {
      side,
      x: side === 'left' ? CFG.W*0.22 : CFG.W*0.78,
      y: CFG.H/2,
      vx: 0, vy: 0,
      r,
      color: side === 'left' ? '#4ae0c0' : '#ff7a9c'
    };
  }
  function resetPuck(direction) {
    const sp = CFG.puck.serveSpeed;
    const ang = direction === 'left' ? Math.PI + rand(-0.3,0.3) : rand(-0.3,0.3);
    puck = {
      x: CFG.W/2, y: CFG.H/2,
      vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp,
      r: CFG.puck.r
    };
    scoring = false;
    serveTimer = 0.9;
    SFX.serve();
  }
  function startGame() {
    scoreL = 0; scoreR = 0;
    leftP = makePaddle('left');
    rightP = makePaddle('right');
    particles = [];
    shake = 0; flash = 0;
    gameOver = false; paused = false;
    updateHUD();
    overlay.classList.add('hidden');
    resetPuck(Math.random() < 0.5 ? 'left' : 'right');
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
    announce('遊戲開始');
  }

  // ========== 物理 ==========
  function updatePaddle(p, dt) {
    let dx = 0, dy = 0;
    if (p.side === 'left') {
      if (keys.a) dx -= 1; if (keys.d) dx += 1;
      if (keys.w) dy -= 1; if (keys.s) dy += 1;
      if (touch.left) {
        const tdx = touch.left.x - p.x, tdy = touch.left.y - p.y;
        const d = len(tdx, tdy);
        if (d > 2) { dx = clamp(tdx/30,-1,1); dy = clamp(tdy/30,-1,1); }
      }
    } else if (mode === 'pvp') {
      if (keys.left) dx -= 1; if (keys.right) dx += 1;
      if (keys.up) dy -= 1; if (keys.down) dy += 1;
      if (touch.right) {
        const tdx = touch.right.x - p.x, tdy = touch.right.y - p.y;
        const d = len(tdx, tdy);
        if (d > 2) { dx = clamp(tdx/30,-1,1); dy = clamp(tdy/30,-1,1); }
      }
    } else {
      // AI：追蹤球的 y（含反應延遲與誤差）
      const targetY = clamp(puck.y + Math.sin(performance.now()/700)*CFG.ai.error, p.r, CFG.H-p.r);
      const targetX = clamp(puck.x + 30, CFG.W/2 + p.r, CFG.W - p.r);
      const tdy = targetY - p.y, tdx = targetX - p.x;
      const d = len(tdx, tdy);
      if (d > 4) { dx = clamp(tdx/40,-1,1); dy = clamp(tdy/40,-1,1); }
      // 速度上限（AI 稍慢，公平）
      dx *= CFG.ai.speed / CFG.paddle.speed;
      dy *= CFG.ai.speed / CFG.paddle.speed;
    }
    const mag = len(dx, dy) || 1;
    if (mag > 1) { dx/=mag; dy/=mag; }
    const oldX = p.x, oldY = p.y;
    p.x += dx * CFG.paddle.speed * dt;
    p.y += dy * CFG.paddle.speed * dt;
    // 限制在己方半場
    p.x = p.side === 'left'
      ? clamp(p.x, p.r, CFG.W/2 - p.r)
      : clamp(p.x, CFG.W/2 + p.r, CFG.W - p.r);
    p.y = clamp(p.y, p.r, CFG.H - p.r);
    p.vx = (p.x - oldX)/dt || 0;
    p.vy = (p.y - oldY)/dt || 0;
  }

  function collidePaddle(p) {
    const dx = puck.x - p.x, dy = puck.y - p.y;
    const d = len(dx, dy);
    const minD = puck.r + p.r;
    if (d >= minD || d === 0) return;

    const nx = dx/d, ny = dy/d;
    // 推出重疊
    puck.x = p.x + nx * minD;
    puck.y = p.y + ny * minD;

    // 相對速度沿法線反射 + 槳動量轉移
    const rvx = puck.vx - p.vx, rvy = puck.vy - p.vy;
    const along = rvx*nx + rvy*ny;
    if (along < 0) {
      puck.vx -= 2 * along * nx;
      puck.vy -= 2 * along * ny;
    }
    // 加入槳速度
    puck.vx += p.vx * 0.45;
    puck.vy += p.vy * 0.45;
    // 最小反彈速度
    const sp = len(puck.vx, puck.vy);
    if (sp < 220) {
      puck.vx = (puck.vx/sp||1) * 220;
      puck.vy = (puck.vy/sp||0) * 220;
    }
    capPuck();
    SFX.hitPaddle(len(puck.vx, puck.vy));
    burst(puck.x, puck.y, p.color, 10, 140, 0.4);
  }

  function capPuck() {
    const sp = len(puck.vx, puck.vy);
    if (sp > CFG.puck.maxSpeed) {
      puck.vx = puck.vx/sp * CFG.puck.maxSpeed;
      puck.vy = puck.vy/sp * CFG.puck.maxSpeed;
    }
  }

  function updatePuck(dt) {
    if (scoring) return;
    puck.x += puck.vx * dt;
    puck.y += puck.vy * dt;

    // 上下牆反彈
    if (puck.y - puck.r < 0) { puck.y = puck.r; puck.vy = Math.abs(puck.vy); SFX.hitWall(); }
    if (puck.y + puck.r > CFG.H) { puck.y = CFG.H - puck.r; puck.vy = -Math.abs(puck.vy); SFX.hitWall(); }

    // 左右邊界：球門開口判定
    if (puck.x - puck.r < 0) {
      if (puck.y > GOAL_TOP && puck.y < GOAL_BOTTOM) { score('right'); return; }
      puck.x = puck.r; puck.vx = Math.abs(puck.vx); SFX.hitWall();
    }
    if (puck.x + puck.r > CFG.W) {
      if (puck.y > GOAL_TOP && puck.y < GOAL_BOTTOM) { score('left'); return; }
      puck.x = CFG.W - puck.r; puck.vx = -Math.abs(puck.vx); SFX.hitWall();
    }

    // 阻尼
    const damp = Math.pow(CFG.puck.damping, dt);
    puck.vx *= damp; puck.vy *= damp;

    collidePaddle(leftP);
    collidePaddle(rightP);
  }

  function score(side) {
    scoring = true;
    shake = 0.4; flash = 0.45;
    if (side === 'left') scoreL++; else scoreR++;
    updateHUD();
    SFX.score();
    burst(puck.x, puck.y, side === 'left' ? '#4ae0c0' : '#ff7a9c', 40, 260, 0.9);
    announce((side === 'left' ? '玩家一' : (mode === 'ai' ? 'AI' : '玩家二')) + '得分');

    if (scoreL >= CFG.winScore || scoreR >= CFG.winScore) {
      setTimeout(() => endGame(scoreL > scoreR ? 'left' : 'right'), 500);
    } else {
      setTimeout(() => { if (running) resetPuck(side === 'left' ? 'right' : 'left'); }, 800);
    }
  }

  function endGame(winner) {
    running = false; gameOver = true;
    SFX.win();
    const name = winner === 'left' ? '玩家 1' : (mode === 'ai' ? 'AI' : '玩家 2');
    showOverlay('對決結束', `${name} 獲勝！<br>比分 ${scoreL} : ${scoreR}`, '再來一局');
    btnStart.onclick = startGame;
    announce(name + '獲勝');
  }

  // ========== HUD / UI ==========
  function updateHUD() {
    hudLeft.textContent = scoreL;
    hudRight.textContent = scoreR;
    hudMode.textContent = mode === 'ai' ? '對戰 AI' : '雙人';
    rightLabel.textContent = mode === 'ai' ? 'AI 對手' : '玩家 2';
    hudTarget.textContent = '先得 ' + CFG.winScore + ' 分';
  }
  function showOverlay(title, msg, btn) {
    overlayTitle.innerHTML = title;
    overlayMsg.innerHTML = msg;
    btnStart.textContent = btn;
    overlay.classList.remove('hidden');
  }
  function announce(t) { liveStatus.textContent = t; }
  function setMode(m) {
    mode = m;
    btnPvp.setAttribute('aria-pressed', m === 'pvp');
    btnAi.setAttribute('aria-pressed', m === 'ai');
    btnPvp.classList.toggle('primary', m === 'pvp');
    btnPvp.classList.toggle('secondary', m !== 'pvp');
    btnAi.classList.toggle('primary', m === 'ai');
    btnAi.classList.toggle('secondary', m !== 'ai');
    updateHUD();
    announce(m === 'ai' ? '已切換為對戰 AI 模式' : '已切換為雙人對戰模式');
  }

  function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    btnPause.textContent = paused ? '繼續' : '暫停 / 繼續';
    if (paused) {
      showOverlay('暫停中', '對決已暫停', '繼續');
      btnStart.onclick = resumeGame;
    } else resumeGame();
  }
  function resumeGame() {
    paused = false;
    btnPause.textContent = '暫停 / 繼續';
    overlay.classList.add('hidden');
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  // ========== 主迴圈 ==========
  function gameLoop(ts) {
    if (!running) return;
    const dt = Math.min((ts - lastTime)/1000, 1/30);
    lastTime = ts;
    if (!paused) update(dt);
    draw();
    requestAnimationFrame(gameLoop);
  }
  function update(dt) {
    updatePaddle(leftP, dt);
    updatePaddle(rightP, dt);
    if (serveTimer > 0) serveTimer -= dt;
    updatePuck(dt);
    updateParticles(dt);
    if (shake > 0) shake -= dt;
    if (flash > 0) flash -= dt;
  }

  function draw() {
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const W = CFG.W, H = CFG.H;

    // 背景
    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      ctx.globalAlpha = s.a; ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    if (shake > 0) ctx.translate(rand(-5,5)*shake, rand(-5,5)*shake);

    // 場地邊框
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, W-6, H-6);

    // 中線與中圈
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(W/2, H/2, 70, 0, TAU); ctx.stroke();

    // 球門
    drawGoal('left');
    drawGoal('right');

    // 戰機
    drawPaddle(leftP);
    drawPaddle(rightP);

    // 能量球
    if (puck) drawPuck();

    // 粒子
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life/p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 發球倒數提示
    if (serveTimer > 0 && !gameOver) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('準備發球…', W/2, H*0.3);
    }

    if (flash > 0) {
      ctx.globalAlpha = flash * 0.4;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  function drawGoal(side) {
    const x = side === 'left' ? 0 : CFG.W;
    ctx.fillStyle = side === 'left' ? 'rgba(74,224,192,0.18)' : 'rgba(255,122,156,0.18)';
    ctx.fillRect(side==='left'?0:CFG.W-24, GOAL_TOP, 24, CFG.goal.height);
    ctx.strokeStyle = side === 'left' ? '#4ae0c0' : '#ff7a9c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, GOAL_TOP); ctx.lineTo(x, GOAL_BOTTOM);
    ctx.stroke();
  }

  function drawPaddle(p) {
    const g = ctx.createRadialGradient(p.x-8, p.y-8, 2, p.x, p.y, p.r);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.35, p.color);
    g.addColorStop(1, p.side==='left' ? '#1a8a72' : '#a83359');
    ctx.fillStyle = g;
    ctx.shadowColor = p.color; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    // 中心標記
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill();
  }

  function drawPuck() {
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(puck.x, puck.y, puck.r, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(puck.x-4, puck.y-4, 3, 0, TAU); ctx.fill();
  }

  // ========== 輸入 ==========
  function toLocal(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) * CFG.W / r.width,
      y: (clientY - r.top) * CFG.H / r.height
    };
  }
  function setupInput() {
    window.addEventListener('keydown', e => {
      unlockAudio();
      let handled = true;
      switch (e.code) {
        case 'KeyW': keys.w = true; break;
        case 'KeyA': keys.a = true; break;
        case 'KeyS': keys.s = true; break;
        case 'KeyD': keys.d = true; break;
        case 'ArrowUp': keys.up = true; break;
        case 'ArrowDown': keys.down = true; break;
        case 'ArrowLeft': keys.left = true; break;
        case 'ArrowRight': keys.right = true; break;
        case 'KeyP': case 'Escape': togglePause(); break;
        case 'KeyM': toggleMute(); break;
        case 'Space':
          if (!running || gameOver) { startGame(); }
          else if (paused) resumeGame();
          break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    }, { passive: false });
    window.addEventListener('keyup', e => {
      switch (e.code) {
        case 'KeyW': keys.w = false; break;
        case 'KeyA': keys.a = false; break;
        case 'KeyS': keys.s = false; break;
        case 'KeyD': keys.d = false; break;
        case 'ArrowUp': keys.up = false; break;
        case 'ArrowDown': keys.down = false; break;
        case 'ArrowLeft': keys.left = false; break;
        case 'ArrowRight': keys.right = false; break;
      }
    });

    // 觸控：依半場指派
    const setTouch = e => {
      if (!running || paused || gameOver) return;
      for (const t of e.touches) {
        const p = toLocal(t.clientX, t.clientY);
        if (p.x < CFG.W/2) touch.left = p;
        else if (mode === 'pvp') touch.right = p;
      }
      e.preventDefault();
    };
    canvas.addEventListener('touchstart', e => { unlockAudio(); setTouch(e); }, { passive: false });
    canvas.addEventListener('touchmove', setTouch, { passive: false });
    canvas.addEventListener('touchend', e => {
      if (!e.touches.length) { touch.left = null; touch.right = null; }
      else setTouch(e);
    });

    // 滑鼠拖曳（桌機也可）
    let mouseDown = false;
    canvas.addEventListener('mousedown', e => {
      unlockAudio();
      if (!running || paused || gameOver) return;
      mouseDown = true;
      const p = toLocal(e.clientX, e.clientY);
      if (p.x < CFG.W/2) touch.left = p; else if (mode === 'pvp') touch.right = p;
    });
    canvas.addEventListener('mousemove', e => {
      if (!mouseDown) return;
      const p = toLocal(e.clientX, e.clientY);
      if (p.x < CFG.W/2) touch.left = p; else if (mode === 'pvp') touch.right = p;
    });
    window.addEventListener('mouseup', () => { mouseDown = false; touch.left = null; touch.right = null; });

    btnStart.addEventListener('click', () => { unlockAudio(); if (gameOver || !running) startGame(); else if (paused) resumeGame(); });
    btnNew.addEventListener('click', () => { unlockAudio(); startGame(); });
    btnPause.addEventListener('click', togglePause);
    btnMute.addEventListener('click', toggleMute);
    btnPvp.addEventListener('click', () => { unlockAudio(); setMode('pvp'); });
    btnAi.addEventListener('click', () => { unlockAudio(); setMode('ai'); });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && running && !paused && !gameOver) togglePause();
    });
  }

  // ========== 初始化 ==========
  function init() {
    initCanvas();
    initAudio();
    setupInput();
    leftP = makePaddle('left');
    rightP = makePaddle('right');
    puck = { x: CFG.W/2, y: CFG.H/2, vx:0, vy:0, r: CFG.puck.r };
    updateHUD();
    showOverlay('星際對決 Star Duel', '選擇模式，把能量球送入對方球門', '開始遊戲');
    draw();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();