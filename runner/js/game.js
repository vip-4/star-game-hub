/* ============================================================
   星際跑者 Star Runner — 原創無限跑酷遊戲
   零外部依賴：Canvas 2D 繪圖 + Web Audio 合成音效
   ============================================================
   狀態機：IDLE → PLAYING ⇄ PAUSED → RESULT → (PLAYING)
   ============================================================ */
'use strict';

(function () {
  // ---------- DOM 與常數 ----------
  const canvas = document.getElementById('runner-canvas');
  const ctx = canvas.getContext('2d');
  const el = {
    score: document.getElementById('score'),
    crystals: document.getElementById('crystals'),
    distance: document.getElementById('distance'),
    best: document.getElementById('best'),
    statusText: document.getElementById('status-text'),
    live: document.getElementById('live-region'),
    start: document.getElementById('start-button'),
    pause: document.getElementById('pause-button'),
    reset: document.getElementById('reset-button'),
    sound: document.getElementById('sound-button'),
    jump: document.getElementById('jump-button')
  };

  const W = 960;               // 邏輯畫面寬度
  const H = 540;               // 邏輯畫面高度
  const GRAVITY = 0.62;        // 每幀重力加速度（以 60fps 為基準）
  const JUMP_VELOCITY = -11.6; // 起跳初速
  const HOLD_LIFT = -0.42;     // 按住跳躍鍵時的額外上升力
  const MAX_FALL = 17;         // 終端速度
  const POOL_SIZE = 120;       // 粒子物件池大小
  const BEST_KEY = 'star-runner-best';

  const STATE = {
    IDLE: 'IDLE',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    RESULT: 'RESULT'
  };

  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const platformColors = ['#2bb3a3', '#4f9dd9', '#8a6fd1', '#e0a33c', '#d4677a'];

  // ---------- 執行期狀態 ----------
  let state = STATE.IDLE;
  let rafId = 0;
  let lastTime = 0;
  let nextBeat = 0;
  let seed = 20261122;
  let cameraX = 0;
  let distance = 0;
  let speed = 4.2;
  let score = 0;
  let crystals = 0;
  let best = loadBest();
  let shake = 0;
  let jumpHeld = false;
  let muted = true;
  let audioCtx = null;
  let platforms = [];
  let obstacles = [];
  let pickups = [];
  let particles = [];
  let particleIndex = 0;
  let player = null;
  let endReason = '';

  // 背景星星使用獨立種子，避免影響關卡隨機序列
  const bgStars = (function () {
    let s = 77123;
    const rnd = function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const list = [];
    for (let i = 0; i < 90; i += 1) {
      list.push({ x: rnd() * W, y: rnd() * H * 0.78, r: rnd() * 1.7 + 0.5, a: rnd() * 0.6 + 0.25 });
    }
    return list;
  }());

  /* ---------- 工具函式 ---------- */
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function randRange(min, max) {
    return min + random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function loadBest() {
    try {
      if (typeof localStorage === 'undefined') return 0;
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(BEST_KEY, String(value));
    } catch (error) {
      // 隱私模式或儲存空間不可用時靜默略過，不影響遊戲
    }
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  /* ---------- 音效：Web Audio 即時合成 ---------- */
  function ensureAudio() {
    if (muted) return null;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!audioCtx) audioCtx = new AudioCtor();
    if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume().catch(function () {});
    return audioCtx;
  }

  function tone(freq, duration, type, volume, slide) {
    const ac = ensureAudio();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume || 0.05, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  function soundJump() { tone(340, 0.16, 'sine', 0.07, 280); }
  function soundPickup() {
    tone(660, 0.09, 'triangle', 0.06);
    window.setTimeout(function () { tone(880, 0.12, 'triangle', 0.05); }, 70);
  }
  function soundHit() { tone(220, 0.45, 'sawtooth', 0.09, -170); }
  function soundStart() { tone(523, 0.13, 'triangle', 0.05); }

  function playBackgroundBeat(now) {
    if (muted || state !== STATE.PLAYING || now < nextBeat) return;
    const notes = [262, 330, 392, 523, 392, 330];
    const index = Math.floor(distance / 200) % notes.length;
    tone(notes[index], 0.2, 'triangle', 0.022);
    nextBeat = now + 380;
  }

  /* ---------- 粒子物件池 ---------- */
  for (let i = 0; i < POOL_SIZE; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, size: 0, life: 0, color: '#fff' });
  }

  function spawnParticle(x, y, color, vx, vy, size) {
    const p = particles[particleIndex % POOL_SIZE];
    particleIndex += 1;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.size = size;
    p.life = 1;
    p.color = color;
  }

  function burst(x, y, color, count, power) {
    if (reduceMotion) count = Math.ceil(count / 3);
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const force = randRange(power * 0.35, power);
      spawnParticle(x, y, color, Math.cos(angle) * force, Math.sin(angle) * force, randRange(3, 7));
    }
  }

  /* ---------- 關卡產生 ---------- */
  function addPlatform(x, y, width) {
    const platform = {
      x: x,
      y: y,
      w: width,
      h: H - y + 90,
      color: platformColors[Math.floor(random() * platformColors.length)]
    };
    platforms.push(platform);
    return platform;
  }

  function generateNext() {
    const last = platforms[platforms.length - 1];
    // 難度隨距離上升：間距由 90 逐漸增加到 210，但仍保持在可跳躍範圍
    const gap = randRange(90, 145) + Math.min(65, distance / 90);
    const width = randRange(215, 350);
    const y = clamp(last.y + randRange(-88, 88), 265, 440);
    const platform = addPlatform(last.x + last.w + gap, y, width);
    const worldX = platform.x;

    if (distance > 480 && random() < 0.34) {
      obstacles.push({
        x: worldX + width * 0.58,
        y: y - 20,
        r: randRange(13, 19),
        spin: random() * Math.PI * 2
      });
    }

    if (random() < 0.72) {
      pickups.push({
        x: worldX + width * 0.32,
        y: y - 62,
        r: 10,
        phase: random() * Math.PI * 2,
        taken: false
      });
    }
  }

  function resetWorld() {
    seed = 20261122;
    cameraX = 0;
    distance = 0;
    speed = 4.2;
    score = 0;
    crystals = 0;
    shake = 0;
    jumpHeld = false;
    nextBeat = 0;
    endReason = '';
    platforms = [];
    obstacles = [];
    pickups = [];
    for (let i = 0; i < particles.length; i += 1) particles[i].active = false;

    // 起跳平台刻意加寬，讓玩家有時間適應
    addPlatform(-260, 430, 760);
    while (platforms[platforms.length - 1].x < W + 600) generateNext();

    player = {
      x: 180,
      y: platforms[0].y - 40,
      w: 34,
      h: 40,
      vy: 0,
      onGround: true,
      runPhase: 0
    };
    updateHud();
  }

  /* ---------- 更新邏輯 ---------- */
  function update(dt) {
    distance += speed * dt;
    cameraX += speed * dt;
    speed = Math.min(8.6, 4.2 + distance / 1500);
    score = Math.floor(distance / 12) + crystals * 50;

    // 玩家垂直物理
    const previousBottom = player.y + player.h;
    player.vy = Math.min(MAX_FALL, player.vy + GRAVITY * dt);
    if (jumpHeld && player.vy < -3) player.vy += HOLD_LIFT * dt;
    player.y += player.vy * dt;
    player.onGround = false;

    if (player.vy >= 0) {
      for (let i = 0; i < platforms.length; i += 1) {
        const p = platforms[i];
        const screenX = p.x - cameraX;
        const overlapX = player.x + player.w > screenX && player.x < screenX + p.w;
        if (overlapX && previousBottom <= p.y + 3 && player.y + player.h >= p.y) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
          break;
        }
      }
    }

    if (player.onGround) player.runPhase += speed * dt * 0.08;

    // 隕石碰撞（圓形與矩形近似判定）
    for (let i = 0; i < obstacles.length; i += 1) {
      const o = obstacles[i];
      const sx = o.x - cameraX;
      const nearestX = clamp(sx, player.x, player.x + player.w);
      const nearestY = clamp(o.y, player.y, player.y + player.h);
      const dx = sx - nearestX;
      const dy = o.y - nearestY;
      if (dx * dx + dy * dy < o.r * o.r) {
        endGame('撞上隕石');
        return;
      }
      o.spin += 0.06 * dt;
    }

    // 星芒收集
    for (let i = 0; i < pickups.length; i += 1) {
      const item = pickups[i];
      if (item.taken) continue;
      const sx = item.x - cameraX;
      const cx = player.x + player.w / 2;
      const cy = player.y + player.h / 2;
      const dx = sx - cx;
      const dy = item.y - cy;
      if (dx * dx + dy * dy < (item.r + 22) * (item.r + 22)) {
        item.taken = true;
        crystals += 1;
        burst(sx, item.y, '#ffd166', 14, 4);
        soundPickup();
        if (crystals % 5 === 0) announce('已收集 ' + crystals + ' 枚星芒');
      }
      item.phase += 0.08 * dt;
    }

    // 粒子更新
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.14 * dt;
      p.size *= Math.pow(0.94, dt);
      p.life -= 0.028 * dt;
      if (p.life <= 0 || p.size < 0.6) p.active = false;
    }

    // 清除已離開畫面的物件，並持續往前生成
    while (platforms.length && platforms[0].x - cameraX + platforms[0].w < -120) platforms.shift();
    obstacles = obstacles.filter(function (o) { return o.x - cameraX > -80; });
    pickups = pickups.filter(function (p) { return !p.taken && p.x - cameraX > -80; });
    while (platforms[platforms.length - 1].x - cameraX < W + 500) generateNext();

    if (shake > 0) shake = Math.max(0, shake - 0.9 * dt);

    // 跌落檢查
    if (player.y > H + 70) {
      endGame('跌落星海');
      return;
    }

    playBackgroundBeat(performance.now());
  }

  /* ---------- 繪圖 ---------- */
  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#102b33');
    gradient.addColorStop(0.55, '#1b4650');
    gradient.addColorStop(1, '#0c2028');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // 視差星空
    const offset = (cameraX * 0.16) % W;
    for (let i = 0; i < bgStars.length; i += 1) {
      const s = bgStars[i];
      const x = (s.x - offset + W) % W;
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#e8fbff';
      ctx.fillRect(x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // 遠景山巒（兩層不同速度）
    drawHills(cameraX * 0.1, 430, 60, '#17414a');
    drawHills(cameraX * 0.22, 468, 42, '#12343d');
  }

  function drawHills(offset, baseY, amplitude, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) {
      const y = baseY + Math.sin((x + offset) / 118) * amplitude * 0.55
                      + Math.sin((x + offset) / 57) * amplitude * 0.25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawPlatform(p) {
    const x = p.x - cameraX;
    if (x > W + 60 || x + p.w < -60) return;
    ctx.fillStyle = p.color;
    roundedRect(x, p.y, p.w, p.h, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    roundedRect(x + 8, p.y + 6, Math.max(0, p.w - 16), 7, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (let gx = x + 30; gx < x + p.w - 20; gx += 56) {
      ctx.fillRect(gx, p.y + 28, 3, 12);
    }
  }

  function drawObstacle(o) {
    const x = o.x - cameraX;
    if (x < -50 || x > W + 50) return;
    ctx.save();
    ctx.translate(x, o.y);
    ctx.rotate(o.spin);
    ctx.fillStyle = '#e05c65';
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2;
      const radius = i % 2 === 0 ? o.r : o.r * 0.68;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(-o.r * 0.25, -o.r * 0.3, o.r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPickup(item) {
    if (item.taken) return;
    const x = item.x - cameraX;
    if (x < -40 || x > W + 40) return;
    const y = item.y + Math.sin(item.phase) * 5;
    const r = item.r;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.42;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const bob = player.onGround ? Math.sin(player.runPhase) * 1.6 : 0;

    // 移到角色後方的能量尾跡
    ctx.fillStyle = 'rgba(255, 209, 102, 0.22)';
    roundedRect(x - 16, y + 10, 22, 18, 8);
    ctx.fill();

    ctx.fillStyle = '#ffd166';
    roundedRect(x, y + bob, player.w, player.h, 12);
    ctx.fill();

    // 披風
    ctx.fillStyle = '#e07a5f';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 12 + bob);
    ctx.lineTo(x - 14, y + 26 + bob);
    ctx.lineTo(x + 4, y + 32 + bob);
    ctx.closePath();
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#17343c';
    ctx.fillRect(x + 20, y + 13 + bob, 4, 5);
    ctx.fillRect(x + 27, y + 13 + bob, 4, 5);

    // 頭頂星光
    ctx.fillStyle = '#fff6d2';
    ctx.beginPath();
    ctx.arc(x + 17, y - 6 + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles() {
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawOverlay(title, subtitle) {
    ctx.fillStyle = 'rgba(8, 24, 30, 0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 46px system-ui, "Noto Sans TC", sans-serif';
    ctx.fillText(title, W / 2, H / 2 - 18);
    ctx.fillStyle = '#e8fbff';
    ctx.font = '22px system-ui, "Noto Sans TC", sans-serif';
    ctx.fillText(subtitle, W / 2, H / 2 + 28);
    ctx.textAlign = 'start';
  }

  function draw() {
    ctx.save();
    if (shake > 0 && !reduceMotion) {
      // 使用 Math.random 而非關卡種子，避免繪圖消耗隨機序列而影響關卡重現性
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    drawBackground();
    for (let i = 0; i < platforms.length; i += 1) drawPlatform(platforms[i]);
    for (let i = 0; i < pickups.length; i += 1) drawPickup(pickups[i]);
    for (let i = 0; i < obstacles.length; i += 1) drawObstacle(obstacles[i]);
    drawParticles();
    if (player) drawPlayer();
    ctx.restore();

    if (state === STATE.IDLE) {
      drawOverlay('星際跑者 Star Runner', '按空白鍵或「開始遊戲」出發');
    } else if (state === STATE.PAUSED) {
      drawOverlay('已暫停', '按 P 或「暫停」按鈕繼續');
    } else if (state === STATE.RESULT) {
      drawOverlay('旅程結束 · ' + endReason, '分數 ' + score + ' · 按 R 或「再玩一次」重新挑戰');
    }
  }

  /* ---------- 介面同步 ---------- */
  function updateHud() {
    el.score.textContent = String(score);
    el.crystals.textContent = String(crystals);
    el.distance.textContent = Math.floor(distance / 10) + ' m';
    el.best.textContent = String(best);
  }

  function announce(message) {
    el.live.textContent = message;
  }

  function setState(next) {
    state = next;
    if (next === STATE.IDLE) {
      el.start.disabled = false;
      el.start.textContent = '開始遊戲';
      el.pause.disabled = true;
      el.pause.textContent = '暫停';
      el.statusText.textContent = '等待開始 · 按空白鍵或「開始遊戲」';
      canvas.setAttribute('aria-label', '無限跑酷遊戲畫面，目前尚未開始');
    } else if (next === STATE.PLAYING) {
      el.start.disabled = true;
      el.start.textContent = '遊戲中';
      el.pause.disabled = false;
      el.pause.textContent = '暫停';
      el.statusText.textContent = '遊戲中 · 空白鍵跳躍，P 暫停';
      canvas.setAttribute('aria-label', '無限跑酷遊戲畫面，遊戲進行中');
    } else if (next === STATE.PAUSED) {
      el.start.disabled = true;
      el.pause.disabled = false;
      el.pause.textContent = '繼續';
      el.statusText.textContent = '已暫停 · 按 P 繼續';
      canvas.setAttribute('aria-label', '無限跑酷遊戲畫面，已暫停');
    } else if (next === STATE.RESULT) {
      el.start.disabled = false;
      el.start.textContent = '再玩一次';
      el.pause.disabled = true;
      el.pause.textContent = '暫停';
      el.statusText.textContent = '旅程結束 · ' + endReason + ' · 按 R 再玩一次';
      canvas.setAttribute('aria-label', '無限跑酷遊戲畫面，演出結束，分數 ' + score);
    }
    draw();
    updateHud();
  }

  /* ---------- 流程控制 ---------- */
  function startGame() {
    if (rafId) window.cancelAnimationFrame(rafId);
    resetWorld();
    setState(STATE.PLAYING);
    announce('遊戲開始，按空白鍵跳躍');
    soundStart();
    lastTime = performance.now();
    rafId = window.requestAnimationFrame(loop);
  }

  function loop(now) {
    if (state !== STATE.PLAYING) return;
    const frameScale = 1000 / 60;
    const dt = clamp((now - lastTime) / frameScale, 0.2, 2.2);
    lastTime = now;
    update(dt);
    if (state !== STATE.PLAYING) return;
    draw();
    updateHud();
    rafId = window.requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state === STATE.PLAYING) {
      if (rafId) window.cancelAnimationFrame(rafId);
      setState(STATE.PAUSED);
      announce('遊戲已暫停');
    } else if (state === STATE.PAUSED) {
      setState(STATE.PLAYING);
      lastTime = performance.now();
      announce('遊戲繼續');
      rafId = window.requestAnimationFrame(loop);
    }
  }

  function endGame(reason) {
    endReason = reason;
    if (score > best) {
      best = score;
      saveBest(best);
    }
    if (rafId) window.cancelAnimationFrame(rafId);
    shake = reduceMotion ? 0 : 10;
    setState(STATE.RESULT);
    soundHit();
    announce('旅程結束，原因：' + reason + '，分數 ' + score + '，最佳 ' + best);
  }

  function jump() {
    if (state === STATE.IDLE || state === STATE.RESULT) {
      startGame();
      return;
    }
    if (state !== STATE.PLAYING || !player.onGround) return;
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
    burst(player.x + player.w / 2, player.y + player.h, '#bfe9e4', 7, 2.4);
    soundJump();
  }

  function toggleSound() {
    muted = !muted;
    el.sound.setAttribute('aria-pressed', muted ? 'false' : 'true');
    el.sound.setAttribute('aria-label', muted ? '開啟音效' : '關閉音效');
    el.sound.textContent = muted ? '🔇 音效' : '🔊 音效';
    announce(muted ? '音效已關閉' : '音效已開啟');
    if (!muted) ensureAudio();
  }

  /* ---------- 事件綁定 ---------- */
  el.start.addEventListener('click', startGame);
  el.reset.addEventListener('click', startGame);
  el.pause.addEventListener('click', togglePause);
  el.sound.addEventListener('click', toggleSound);

  function bindJumpTarget(target) {
    target.addEventListener('pointerdown', function (event) {
      jumpHeld = true;
      target.classList.add('is-active');
      if (target.setPointerCapture) {
        try { target.setPointerCapture(event.pointerId); } catch (error) { /* 忽略不支援的瀏覽器 */ }
      }
      jump();
    });
    const release = function () {
      jumpHeld = false;
      target.classList.remove('is-active');
    };
    target.addEventListener('pointerup', release);
    target.addEventListener('pointercancel', release);
    target.addEventListener('pointerleave', release);
  }

  bindJumpTarget(canvas);
  bindJumpTarget(el.jump);

  document.addEventListener('keydown', function (event) {
    const target = event.target;
    if (target && target.closest && target.closest('button') && (event.code === 'Space' || event.code === 'Enter')) return;

    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
      event.preventDefault();
      if (!event.repeat) {
        jumpHeld = true;
        jump();
      }
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      event.preventDefault();
      togglePause();
    } else if (event.code === 'KeyR') {
      event.preventDefault();
      startGame();
    } else if (event.code === 'KeyM') {
      toggleSound();
    }
  });

  document.addEventListener('keyup', function (event) {
    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') jumpHeld = false;
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === STATE.PLAYING) togglePause();
  });

  /* ---------- 初始化 ---------- */
  function resizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  window.addEventListener('resize', resizeCanvas);
  resetWorld();
  resizeCanvas();
  setState(STATE.IDLE);
  el.best.textContent = String(best);
}());
