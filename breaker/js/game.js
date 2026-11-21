/**
 * Star Breaker - 原創打磚塊遊戲
 * 零外部依賴：Canvas 2D + 自製物理 + Web Audio 即時合成
 */
(() => {
  'use strict';

  // ========== 配置 ==========
  const CFG = {
    canvasId: 'game-canvas',
    paddle: { w: 96, h: 14, yOffset: 34, speed: 480, minW: 54, maxW: 160 },
    ball: { r: 7, speed: 300, speedPerWave: 22, maxSpeed: 560, minAngle: 0.22 },
    brick: { cols: 9, rows: 5, gap: 5, top: 62, side: 24, h: 26 },
    powerup: { chance: 0.14, speed: 130, size: 15, duration: 9 },
    startLives: 3,
    waveDelay: 1.6,
    starCount: 70
  };

  const BRICK_TYPES = {
    normal:   { hp: 1, score: 10, color: '#7c9cff', glow: '#a8bcff' },
    tough:    { hp: 2, score: 25, color: '#ff9f6b', glow: '#ffc4a0' },
    hard:     { hp: 3, score: 45, color: '#ff6b9c', glow: '#ffa8c6' },
    explosive:{ hp: 1, score: 15, color: '#ffd166', glow: '#ffe6a0', explode: true },
    bonus:    { hp: 1, score: 80, color: '#4ae0c0', glow: '#8affea', bonus: true }
  };

  const POWER_TYPES = {
    expand: { symbol: '↔', color: '#4ae0c0', label: '擴大光板' },
    multi:  { symbol: '×3', color: '#ff6b9c', label: '三球' },
    slow:   { symbol: '≈', color: '#7c9cff', label: '慢速' },
    life:   { symbol: '♥', color: '#ffd166', label: '加命' }
  };

  // ========== 狀態 ==========
  let canvas, ctx, width, height, dpr;
  let lastTime = 0, running = false, paused = false, gameOver = false;

  let paddle = null;
  let balls = [], bricks = [], powerups = [], particles = [], stars = [];
  let score = 0, wave = 1, lives = CFG.startLives;
  let waitingLaunch = true, waveTimer = 0, betweenWaves = false, shake = 0;
  let effects = { expand: 0, slow: 0 };

  const keys = { left: false, right: false };
  let pointerX = null;
  let audioCtx = null, audioUnlocked = false, muted = false;

  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-message');
  const btnStart = document.getElementById('btn-start');
  const btnMute = document.getElementById('btn-mute');
  const controlsHint = document.getElementById('controls-hint');
  const hudScore = document.getElementById('hud-score');
  const hudWave = document.getElementById('hud-wave');
  const hudLives = document.getElementById('hud-lives');
  const hudBalls = document.getElementById('hud-balls');

  // ========== 工具 ==========
  const rand = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
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
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (paddle) {
      paddle.x = clamp(paddle.x, paddle.w / 2, width - paddle.w / 2);
      paddle.y = height - CFG.paddle.yOffset;
    }
    initStars();
    if (bricks.length === 0) buildBricks();
  }
  function initStars() {
    stars = [];
    for (let i = 0; i < CFG.starCount; i++) {
      stars.push({ x: rand(0, width), y: rand(0, height), s: rand(1, 2.4), a: rand(0.15, 0.8), sp: rand(3, 12) });
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
  function tone(freq, dur, type = 'square', vol = 0.1, slideTo = null) {
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
    src.connect(g).connect(audioCtx.destination);
    src.start();
  }
  const SFX = {
    paddle: () => tone(440, 0.06, 'square', 0.09),
    wall: () => tone(300, 0.04, 'square', 0.06),
    brick: () => tone(720, 0.05, 'square', 0.08, 520),
    tough: () => tone(480, 0.06, 'sawtooth', 0.08),
    explode: () => { noise(0.18, 0.12); tone(160, 0.18, 'sine', 0.09, 50); },
    power: () => { tone(660, 0.08, 'sine', 0.1); tone(990, 0.1, 'sine', 0.08); },
    launch: () => tone(520, 0.1, 'sine', 0.08, 780),
    life: () => { tone(880, 0.12, 'sine', 0.1); tone(1320, 0.12, 'sine', 0.08); },
    lose: () => { tone(300, 0.2, 'sine', 0.1, 120); noise(0.2, 0.08); },
    win: () => { tone(523, 0.1, 'sine', 0.09); tone(659, 0.1, 'sine', 0.09); tone(784, 0.15, 'sine', 0.09); }
  };
  function toggleMute() {
    muted = !muted;
    btnMute.textContent = muted ? '取消靜音' : '靜音';
    btnMute.setAttribute('aria-pressed', muted);
  }

  // ========== 粒子 ==========
  function burst(x, y, color, count, speed, life, sizeRange = [2, 5]) {
    for (let i = 0; i < count && particles.length < 350; i++) {
      const a = rand(0, TAU), s = rand(speed * 0.25, speed);
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rand(sizeRange[0], sizeRange[1]),
        life: rand(life * 0.5, life), max: life, color
      });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 180 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }
  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ========== 磚塊關卡 ==========
  function buildBricks() {
    bricks = [];
    const cols = CFG.brick.cols;
    const rows = Math.min(CFG.brick.rows + Math.floor((wave - 1) / 2), 8);
    const bw = (width - CFG.brick.side * 2 - CFG.brick.gap * (cols - 1)) / cols;
    const bh = CFG.brick.h;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // 程序生成一些空缺，讓關卡有變化
        if (wave > 1 && Math.random() < 0.1) continue;
        let type = 'normal';
        const roll = Math.random() + wave * 0.02;
        if (r === 0 && roll > 0.7) type = 'bonus';
        else if (roll > 0.86) type = 'hard';
        else if (roll > 0.7) type = 'tough';
        else if (roll > 0.58) type = 'explosive';

        const T = BRICK_TYPES[type];
        bricks.push({
          x: CFG.brick.side + c * (bw + CFG.brick.gap),
          y: CFG.brick.top + r * (bh + CFG.brick.gap),
          w: bw, h: bh,
          type, hp: T.hp, maxHp: T.hp,
          score: T.score, color: T.color, glow: T.glow,
          explode: !!T.explode, bonus: !!T.bonus,
          alive: true, hitFlash: 0
        });
      }
    }
  }
  function drawBricks() {
    for (const b of bricks) {
      if (!b.alive) continue;
      const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
      grad.addColorStop(0, b.glow);
      grad.addColorStop(0.4, b.color);
      grad.addColorStop(1, b.color);
      ctx.fillStyle = b.hitFlash > 0 ? '#fff' : grad;
      ctx.shadowColor = b.glow; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 5);
      ctx.fill();
      ctx.shadowBlur = 0;
      // 受損軌跡
      if (b.hp < b.maxHp) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w*0.2, b.y + b.h*0.2);
        ctx.lineTo(b.x + b.w*0.5, b.y + b.h*0.55);
        ctx.lineTo(b.x + b.w*0.35, b.y + b.h*0.8);
        ctx.stroke();
      }
      // 符號標記
      if (b.explosive) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✸', b.x + b.w/2, b.y + b.h/2);
      } else if (b.bonus) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('★', b.x + b.w/2, b.y + b.h/2);
      }
    }
  }
  function damageBrick(index) {
    const b = bricks[index];
    b.hp -= 1;
    b.hitFlash = 0.08;
    score += b.hp > 0 ? 2 : b.score;
    updateHUD();
    burst(b.x + b.w/2, b.y + b.h/2, b.color, 6, 90, 0.3, [1.5, 3]);
    if (b.hp > 0) { SFX.tough(); return; }

    b.alive = false;
    if (b.explode) {
      // 連鎖清除周圍 3×3
      const col = index % CFG.brick.cols;
      const row = Math.floor(index / CFG.brick.cols);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const ni = (row + dr) * CFG.brick.cols + (col + dc);
          if (ni >= 0 && ni < bricks.length && bricks[ni].alive) {
            const nb = bricks[ni];
            nb.alive = false;
            score += nb.score;
            burst(nb.x + nb.w/2, nb.y + nb.h/2, nb.glow, 10, 140, 0.5);
          }
        }
      }
      SFX.explode();
      shake = 0.3;
    } else if (b.bonus) {
      SFX.power();
    } else {
      SFX.brick();
    }

    // 道具掉落
    if (!b.bonus && Math.random() < CFG.powerup.chance) {
      const types = Object.keys(POWER_TYPES);
      const t = types[Math.floor(Math.random() * types.length)];
      powerups.push({
        x: b.x + b.w/2, y: b.y + b.h/2,
        type: t, vy: CFG.powerup.speed, size: CFG.powerup.size,
        color: POWER_TYPES[t].color, symbol: POWER_TYPES[t].symbol,
        bob: rand(0, TAU)
      });
    }
  }

  // ========== 光板與球 ==========
  function createPaddle() {
    return { x: width / 2, y: height - CFG.paddle.yOffset, w: CFG.paddle.w, h: CFG.paddle.h, targetW: CFG.paddle.w };
  }
  function createBall(x, y, angle = -Math.PI / 2) {
    const sp = Math.min(CFG.ball.speed + (wave - 1) * CFG.ball.speedPerWave, CFG.ball.maxSpeed)
      * (effects.slow > 0 ? 0.68 : 1);
    return { x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, r: CFG.ball.r, stuck: false };
  }
  function resetBall() {
    balls = [createBall(paddle.x, paddle.y - 12)];
    balls[0].stuck = true;
    waitingLaunch = true;
  }
  function launchBalls() {
    for (const b of balls) {
      if (b.stuck) {
        b.stuck = false;
        const angle = -Math.PI / 2 + rand(-0.4, 0.4);
        const sp = Math.hypot(b.vx, b.vy) || CFG.ball.speed;
        b.vx = Math.cos(angle) * sp;
        b.vy = Math.sin(angle) * sp;
      }
    }
    waitingLaunch = false;
    SFX.launch();
  }
  function updatePaddle(dt) {
    if (!paddle) return;
    let dx = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (pointerX !== null) {
      // 拖曳模式：平滑靠近指標
      const diff = pointerX - paddle.x;
      dx = clamp(diff / 30, -1, 1);
    }
    paddle.x = clamp(paddle.x + dx * CFG.paddle.speed * dt, paddle.w / 2, width - paddle.w / 2);
    // 寬度平滑過渡
    paddle.w += (paddle.targetW - paddle.w) * Math.min(1, dt * 8);
  }
  function drawPaddle() {
    if (!paddle) return;
    const grad = ctx.createLinearGradient(paddle.x - paddle.w/2, 0, paddle.x + paddle.w/2, 0);
    grad.addColorStop(0, '#4ae0c0');
    grad.addColorStop(0.5, '#8affea');
    grad.addColorStop(1, '#4ae0c0');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#4ae0c0'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(paddle.x - paddle.w/2, paddle.y - paddle.h/2, paddle.w, paddle.h, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  function updateBalls(dt) {
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (b.stuck) {
        b.x = paddle.x; b.y = paddle.y - 12;
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // 牆壁反彈
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); SFX.wall(); }
      if (b.x + b.r > width) { b.x = width - b.r; b.vx = -Math.abs(b.vx); SFX.wall(); }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); SFX.wall(); }

      // 掉出底部
      if (b.y - b.r > height) {
        balls.splice(i, 1);
        continue;
      }

      // 光板碰撞（含角度控制）
      if (b.vy > 0 &&
          b.y + b.r >= paddle.y - paddle.h/2 &&
          b.y - b.r <= paddle.y + paddle.h/2 &&
          Math.abs(b.x - paddle.x) < paddle.w/2 + b.r) {
        b.y = paddle.y - paddle.h/2 - b.r;
        const hit = clamp((b.x - paddle.x) / (paddle.w/2), -1, 1);
        const angle = -Math.PI/2 + hit * 1.05; // 最大約 60°
        const sp = Math.min(Math.hypot(b.vx, b.vy) * 1.015, CFG.ball.maxSpeed);
        b.vx = Math.cos(angle) * sp;
        b.vy = Math.sin(angle) * sp;
        SFX.paddle();
        burst(b.x, b.y, '#4ae0c0', 5, 80, 0.25, [1.5, 3]);
      }

      // 磚塊碰撞
      for (let j = 0; j < bricks.length; j++) {
        const br = bricks[j];
        if (!br.alive) continue;
        if (b.x + b.r > br.x && b.x - b.r < br.x + br.w &&
            b.y + b.r > br.y && b.y - b.r < br.y + br.h) {
          // 判斷反彈方向（以重疊深度）
          const overlapX = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r));
          const overlapY = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
          if (overlapX < overlapY) b.vx = -b.vx;
          else b.vy = -b.vy;
          damageBrick(j);
          break;
        }
      }
    }

    // 所有球掉落 → 失去一命
    if (balls.length === 0 && !betweenWaves && !gameOver) {
      lives--;
      updateHUD();
      SFX.lose();
      shake = 0.3;
      if (lives <= 0) endGame();
      else resetBall();
    }

    // 關卡清空
    if (!betweenWaves && bricks.every(b => !b.alive)) {
      betweenWaves = true;
      waveTimer = CFG.waveDelay;
      score += 150 * wave;
      updateHUD();
      SFX.win();
    }
    if (betweenWaves) {
      waveTimer -= dt;
      if (waveTimer <= 0) { wave++; nextWave(); }
    }
  }
  function drawBalls() {
    for (const b of balls) {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#8affea'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  function nextWave() {
    buildBricks();
    powerups = [];
    effects.expand = 0; effects.slow = 0;
    paddle.targetW = CFG.paddle.w;
    resetBall();
    betweenWaves = false;
    updateHUD();
  }

  // ========== 道具 ==========
  function updatePowerups(dt) {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.vy * dt;
      p.bob += dt * 4;
      if (p.y > height + p.size) { powerups.splice(i, 1); continue; }
      if (paddle && Math.abs(p.x - paddle.x) < paddle.w/2 + p.size &&
          Math.abs(p.y - paddle.y) < paddle.h/2 + p.size) {
        applyPowerup(p);
        powerups.splice(i, 1);
      }
    }
  }
  function applyPowerup(p) {
    SFX.power();
    burst(p.x, p.y, p.color, 14, 140, 0.5);
    switch (p.type) {
      case 'expand':
        effects.expand = CFG.powerup.duration;
        paddle.targetW = CFG.paddle.maxW;
        break;
      case 'multi': {
        const base = balls[0] || createBall(paddle.x, paddle.y - 12);
        const angles = [-0.55, 0.55];
        for (const a of angles) {
          const sp = Math.hypot(base.vx, base.vy) || CFG.ball.speed;
          const nb = createBall(base.x, base.y);
          const ang = Math.atan2(base.vy, base.vx) + a;
          nb.vx = Math.cos(ang) * sp;
          nb.vy = Math.sin(ang) * sp;
          nb.stuck = base.stuck;
          balls.push(nb);
        }
        break;
      }
      case 'slow':
        effects.slow = CFG.powerup.duration;
        for (const b of balls) { b.vx *= 0.68; b.vy *= 0.68; }
        break;
      case 'life':
        lives = Math.min(5, lives + 1);
        SFX.life();
        break;
    }
    updateHUD();
  }
  function drawPowerups() {
    for (const p of powerups) {
      ctx.save();
      ctx.translate(p.x, p.y + Math.sin(p.bob) * 2);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 1.6);
      glow.addColorStop(0, p.color + '70');
      glow.addColorStop(1, p.color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, p.size * 1.6, 0, TAU); ctx.fill();
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, p.size, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0a0c1a';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.symbol, 0, 1);
      ctx.restore();
    }
  }

  // ========== HUD / 流程 ==========
  function updateHUD() {
    hudScore.textContent = score.toLocaleString();
    hudWave.textContent = wave;
    hudLives.textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, CFG.startLives - lives));
    hudBalls.textContent = '×' + balls.length;
  }
  function showOverlay(title, msg, btn) {
    overlayTitle.innerHTML = title;
    overlayMsg.innerHTML = msg;
    btnStart.textContent = btn;
    overlay.classList.remove('hidden');
  }
  function startGame() {
    score = 0; wave = 1; lives = CFG.startLives;
    powerups = []; particles = [];
    effects.expand = 0; effects.slow = 0;
    shake = 0; betweenWaves = false;
    gameOver = false; paused = false;
    paddle = createPaddle();
    buildBricks();
    resetBall();
    updateHUD();
    overlay.classList.add('hidden');
    running = true;
  }
  function endGame() {
    running = false; gameOver = true;
    showOverlay('遊戲結束', `最終分數：${score.toLocaleString()}<br>到達關卡：${wave}`, '再玩一次');
    btnStart.onclick = startGame;
    btnStart.focus();
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
    updateStars(dt);
    updatePaddle(dt);
    updateBalls(dt);
    updatePowerups(dt);
    updateParticles(dt);
    if (effects.expand > 0) {
      effects.expand -= dt;
      if (effects.expand <= 0) paddle.targetW = CFG.paddle.w;
    }
    if (effects.slow > 0) effects.slow -= dt;
    if (shake > 0) shake -= dt;
    for (const b of bricks) if (b.hitFlash > 0) b.hitFlash -= dt;
    hudBalls.textContent = '×' + balls.length;
  }
  function updateStars(dt) {
    for (const s of stars) {
      s.y += s.sp * dt;
      if (s.y > height) { s.y = -2; s.x = rand(0, width); }
    }
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, width, height);
    for (const s of stars) {
      ctx.globalAlpha = s.a; ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;
    if (shake > 0) ctx.translate(rand(-4, 4) * shake, rand(-4, 4) * shake);

    drawBricks();
    drawPowerups();
    drawPaddle();
    drawBalls();
    drawParticles();

    if (waitingLaunch && !betweenWaves) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('按 Space 或點擊發射球', width / 2, height * 0.62);
    }
    if (betweenWaves) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`關卡 ${wave + 1}！`, width / 2, height / 2);
    }
  }

  // ========== 輸入 ==========
  function setupInput() {
    window.addEventListener('keydown', e => {
      if (!audioUnlocked) unlockAudio();
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': keys.left = true; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': keys.right = true; e.preventDefault(); break;
        case 'Space':
          e.preventDefault();
          if (running && !paused && waitingLaunch) launchBalls();
          break;
        case 'KeyP': case 'Escape': togglePause(); break;
        case 'KeyM': toggleMute(); break;
      }
    }, { passive: false });
    window.addEventListener('keyup', e => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': keys.left = false; break;
        case 'ArrowRight': case 'KeyD': keys.right = false; break;
      }
    });

    // 畫面拖曳 / 點擊發射
    const wrap = canvas.parentElement;
    const toLocal = clientX => {
      const rect = canvas.getBoundingClientRect();
      return (clientX - rect.left) * (width / rect.width);
    };
    wrap.addEventListener('touchstart', e => {
      if (!audioUnlocked) unlockAudio();
      if (!running || paused || gameOver) return;
      pointerX = toLocal(e.touches[0].clientX);
      if (waitingLaunch) launchBalls();
      e.preventDefault();
    }, { passive: false });
    wrap.addEventListener('touchmove', e => {
      if (pointerX !== null) pointerX = toLocal(e.touches[0].clientX);
      e.preventDefault();
    }, { passive: false });
    wrap.addEventListener('touchend', () => { pointerX = null; });
    wrap.addEventListener('mousedown', e => {
      if (!audioUnlocked) unlockAudio();
      if (!running || paused || gameOver) return;
      pointerX = toLocal(e.clientX);
      if (waitingLaunch) launchBalls();
    });
    window.addEventListener('mousemove', e => { if (pointerX !== null) pointerX = toLocal(e.clientX); });
    window.addEventListener('mouseup', () => { pointerX = null; });

    bindHold('btn-left', () => keys.left = true, () => keys.left = false);
    bindHold('btn-right', () => keys.right = true, () => keys.right = false);
    document.getElementById('btn-launch').addEventListener('click', () => {
      if (!audioUnlocked) unlockAudio();
      if (running && !paused && waitingLaunch) launchBalls();
    });

    btnStart.addEventListener('click', () => {
      if (!audioUnlocked) unlockAudio();
      if (gameOver || !running) startGame(); else if (paused) resumeGame();
    });
    btnMute.addEventListener('click', toggleMute);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && running && !paused && !gameOver) togglePause();
    });
  }
  function bindHold(id, onDown, onUp) {
    const el = document.getElementById(id);
    if (!el) return;
    const down = e => { if (!audioUnlocked) unlockAudio(); el.classList.add('active'); onDown(); e.preventDefault(); };
    const up = e => { el.classList.remove('active'); onUp(); if (e) e.preventDefault(); };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    el.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);
  }

  // ========== 初始化 ==========
  function init() {
    initCanvas();
    initAudio();
    setupInput();
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    controlsHint.innerHTML = isMobile
      ? '拖曳畫面移動光板 · 點擊發射球'
      : '←/→ 或 A/D 移動 · Space 發射 · P 暫停 · M 靜音';
    showOverlay('星芒破塊 Star Breaker', '反彈能量球擊碎所有磚塊，收集道具衝高分數', '開始遊戲');
    btnStart.onclick = startGame;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();