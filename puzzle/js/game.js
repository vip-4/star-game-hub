/* ============================================================
   星際跑者系列 — 星影解謎 Star Puzzle
   原創平台解謎遊戲：分身壓板 → 關閉雷射 → 收集星星 → 抵達出口
   零外部依賴：Canvas 2D 繪圖 + Web Audio 合成音效
   ============================================================
   狀態機：IDLE → PLAYING ⇄ PAUSED → LEVEL_CLEAR → RESULT
   ============================================================ */
'use strict';

(function () {
  // ---------- DOM ----------
  const canvas = document.getElementById('puzzle-canvas');
  const ctx = canvas.getContext('2d');
  const el = {
    level: document.getElementById('level'),
    stars: document.getElementById('stars'),
    totalStars: document.getElementById('total-stars'),
    clones: document.getElementById('clones'),
    statusText: document.getElementById('status-text'),
    live: document.getElementById('live-region'),
    start: document.getElementById('start-button'),
    restart: document.getElementById('restart-button'),
    sound: document.getElementById('sound-button')
  };
  const touchButtons = document.querySelectorAll('.touch-button');

  // ---------- 常數 ----------
  const W = 960;
  const H = 540;
  const GRAVITY = 0.55;
  const JUMP_VELOCITY = -10.8;
  const MOVE_SPEED = 3.6;
  const MAX_FALL = 15;
  const BODY_W = 26;
  const BODY_H = 34;

  const STATE = {
    IDLE: 'IDLE',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    LEVEL_CLEAR: 'LEVEL_CLEAR',
    RESULT: 'RESULT'
  };

  // ---------- 關卡資料（原創設計） ----------
  const LEVELS = [
    {
      name: '第一關 · 啟動',
      clonesAllowed: 1,
      spawn: { x: 70, y: 436 },
      platforms: [
        { x: 0, y: 470, w: 960, h: 70 },
        { x: 730, y: 400, w: 120, h: 70 }
      ],
      plates: [{ x: 270, y: 462, w: 56, h: 8, group: 'A' }],
      lasers: [{ x: 560, y: 250, w: 10, h: 220, group: 'A' }],
      stars: [{ x: 180, y: 425 }, { x: 650, y: 425 }, { x: 790, y: 365 }],
      goal: { x: 885, y: 400, w: 50, h: 70 }
    },
    {
      name: '第二關 · 跨越',
      clonesAllowed: 1,
      spawn: { x: 60, y: 436 },
      platforms: [
        { x: 0, y: 470, w: 400, h: 70 },
        { x: 520, y: 470, w: 440, h: 70 },
        { x: 180, y: 380, w: 150, h: 20 }
      ],
      plates: [{ x: 230, y: 372, w: 56, h: 8, group: 'B' }],
      lasers: [{ x: 400, y: 410, w: 120, h: 10, group: 'B' }],
      stars: [{ x: 255, y: 340 }, { x: 460, y: 350 }, { x: 800, y: 425 }],
      goal: { x: 885, y: 400, w: 50, h: 70 }
    },
    {
      name: '第三關 · 雙重封鎖',
      clonesAllowed: 2,
      spawn: { x: 50, y: 436 },
      platforms: [
        { x: 0, y: 470, w: 960, h: 70 },
        { x: 330, y: 390, w: 130, h: 20 },
        { x: 640, y: 380, w: 130, h: 20 }
      ],
      plates: [
        { x: 170, y: 462, w: 56, h: 8, group: 'A' },
        { x: 520, y: 462, w: 56, h: 8, group: 'B' }
      ],
      lasers: [
        { x: 420, y: 250, w: 10, h: 220, group: 'A' },
        { x: 780, y: 230, w: 10, h: 240, group: 'B' }
      ],
      stars: [{ x: 395, y: 350 }, { x: 705, y: 340 }, { x: 870, y: 425 }],
      goal: { x: 895, y: 400, w: 48, h: 70 }
    }
  ];

  // ---------- 執行期狀態 ----------
  let state = STATE.IDLE;
  let rafId = 0;
  let lastTime = 0;
  let levelIndex = 0;
  let player = null;
  let clones = [];
  let platforms = [];
  let plates = [];
  let lasers = [];
  let stars = [];
  let goal = null;
  let collected = 0;
  let totalStars = 0;
  let bankedThisLevel = false;
  let muted = true;
  let audioCtx = null;
  let flash = 0;
  const input = { left: false, right: false, jump: false };
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- 工具 ----------
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function roundedRect(x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function announce(message) {
    el.live.textContent = message;
  }

  /* ---------- 音效 ---------- */
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

  function soundJump() { tone(300, 0.14, 'sine', 0.06, 220); }
  function soundClone() { tone(520, 0.16, 'triangle', 0.06, -160); }
  function soundPlate() { tone(660, 0.18, 'triangle', 0.05); }
  function soundStar() {
    tone(784, 0.09, 'triangle', 0.05);
    window.setTimeout(function () { tone(1046, 0.13, 'triangle', 0.05); }, 65);
  }
  function soundFail() { tone(200, 0.35, 'sawtooth', 0.08, -130); }
  function soundClear() {
    tone(523, 0.14, 'triangle', 0.05);
    window.setTimeout(function () { tone(659, 0.14, 'triangle', 0.05); }, 120);
    window.setTimeout(function () { tone(784, 0.24, 'triangle', 0.05); }, 240);
  }

  /* ---------- 關卡載入 ---------- */
  function loadLevel(index) {
    const source = LEVELS[index];
    levelIndex = index;
    platforms = source.platforms.map(function (p) { return Object.assign({}, p); });
    plates = source.plates.map(function (p) { return Object.assign({}, p, { active: false }); });
    lasers = source.lasers.map(function (l) { return Object.assign({}, l, { on: true }); });
    stars = source.stars.map(function (s) { return { x: s.x, y: s.y, r: 11, taken: false, phase: 0 }; });
    goal = Object.assign({}, source.goal);
    clones = [];
    collected = 0;
    bankedThisLevel = false;
    flash = 0;
    input.left = false;
    input.right = false;
    input.jump = false;
    player = {
      x: source.spawn.x,
      y: source.spawn.y,
      w: BODY_W,
      h: BODY_H,
      vy: 0,
      onGround: false,
      phase: 0
    };
    updateHud();
  }

  function platePressed(plate) {
    const bodies = [player].concat(clones);
    for (let i = 0; i < bodies.length; i += 1) {
      const body = bodies[i];
      if (!body) continue;
      const bottom = body.y + body.h;
      const horizontal = body.x < plate.x + plate.w && body.x + body.w > plate.x;
      if (horizontal && bottom >= plate.y - 3 && bottom <= plate.y + plate.h + 10) return true;
    }
    return false;
  }

  function groupEnabled(group) {
    const groupPlates = plates.filter(function (p) { return p.group === group; });
    return groupPlates.length > 0 && groupPlates.every(function (p) { return p.active; });
  }

  /* ---------- 更新 ---------- */
  function update(dt) {
    // 水平移動
    let dx = 0;
    if (input.left) dx -= MOVE_SPEED * dt;
    if (input.right) dx += MOVE_SPEED * dt;
    player.x = clamp(player.x + dx, 0, W - player.w);

    // 垂直物理
    const previousBottom = player.y + player.h;
    player.vy = Math.min(MAX_FALL, player.vy + GRAVITY * dt);
    player.y += player.vy * dt;
    player.onGround = false;

    if (player.vy >= 0) {
      for (let i = 0; i < platforms.length; i += 1) {
        const p = platforms[i];
        const horizontal = player.x + player.w > p.x && player.x < p.x + p.w;
        if (horizontal && previousBottom <= p.y + 4 && player.y + player.h >= p.y) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
          break;
        }
      }
    }
    if (player.onGround) player.phase += 0.12 * dt;

    // 壓力板與雷射狀態
    let plateChanged = false;
    for (let i = 0; i < plates.length; i += 1) {
      const plate = plates[i];
      const nowActive = platePressed(plate);
      if (nowActive !== plate.active) plateChanged = true;
      plate.active = nowActive;
    }
    for (let i = 0; i < lasers.length; i += 1) {
      lasers[i].on = !groupEnabled(lasers[i].group);
    }
    if (plateChanged) soundPlate();

    // 雷射致命判定
    for (let i = 0; i < lasers.length; i += 1) {
      if (lasers[i].on && overlaps(player, lasers[i])) {
        failLevel('碰到雷射');
        return;
      }
    }

    // 跌落判定
    if (player.y > H + 40) {
      failLevel('跌落 void');
      return;
    }

    // 星星收集
    for (let i = 0; i < stars.length; i += 1) {
      const star = stars[i];
      if (star.taken) continue;
      star.phase += 0.08 * dt;
      const box = { x: star.x - star.r, y: star.y - star.r, w: star.r * 2, h: star.r * 2 };
      if (overlaps(player, box)) {
        star.taken = true;
        collected += 1;
        soundStar();
        announce('收集星星，本關已取得 ' + collected + ' 顆');
      }
    }

    // 抵達出口
    if (overlaps(player, goal)) {
      clearLevel();
    }

    if (flash > 0) flash = Math.max(0, flash - 0.06 * dt);
  }

  function placeClone() {
    if (state !== STATE.PLAYING) return;
    if (clones.length >= LEVELS[levelIndex].clonesAllowed) {
      announce('分身已用盡，可按 X 回收最後一個');
      return;
    }
    clones.push({ x: player.x, y: player.y, w: BODY_W, h: BODY_H, phase: 0 });
    soundClone();
    announce('已放置分身，剩餘 ' + (LEVELS[levelIndex].clonesAllowed - clones.length) + ' 個');
  }

  function recallClone() {
    if (state !== STATE.PLAYING || clones.length === 0) return;
    clones.pop();
    soundClone();
    announce('已回收分身，剩餘 ' + (LEVELS[levelIndex].clonesAllowed - clones.length) + ' 個');
  }

  function jump() {
    if (state !== STATE.PLAYING || !player.onGround) return;
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
    soundJump();
  }

  function failLevel(reason) {
    if (flash <= 0) soundFail();
    flash = reduceMotion ? 0 : 8;
    announce('失敗：' + reason + '，重新開始本關');
    loadLevel(levelIndex);
  }

  function clearLevel() {
    if (!bankedThisLevel) {
      totalStars += collected;
      bankedThisLevel = true;
    }
    if (levelIndex === LEVELS.length - 1) {
      setState(STATE.RESULT);
      announce('全部關卡完成，累計星星 ' + totalStars + ' 顆');
    } else {
      setState(STATE.LEVEL_CLEAR);
      announce('通關，本關星星 ' + collected + ' 顆，按 Enter 前往下一關');
    }
    soundClear();
  }

  /* ---------- 繪圖 ---------- */
  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#1b1636');
    gradient.addColorStop(0.6, '#26204c');
    gradient.addColorStop(1, '#15112c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(184,162,255,0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  function drawPlatform(p) {
    ctx.fillStyle = '#4a4275';
    roundedRect(p.x, p.y, p.w, p.h, 8);
    ctx.fill();
    ctx.fillStyle = '#8d7fc4';
    ctx.fillRect(p.x + 6, p.y + 4, Math.max(0, p.w - 12), 5);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let x = p.x + 24; x < p.x + p.w - 12; x += 44) {
      ctx.fillRect(x, p.y + 18, 3, 10);
    }
  }

  function drawPlate(plate) {
    ctx.fillStyle = plate.active ? '#5ad19a' : '#c8891c';
    roundedRect(plate.x, plate.y, plate.w, plate.h, 4);
    ctx.fill();
    ctx.fillStyle = plate.active ? '#d8ffe9' : '#ffe9b8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(plate.group, plate.x + plate.w / 2, plate.y - 4);
    ctx.textAlign = 'start';
  }

  function drawLaser(laser) {
    if (laser.on) {
      ctx.fillStyle = 'rgba(224,92,101,0.22)';
      ctx.fillRect(laser.x - 5, laser.y - 5, laser.w + 10, laser.h + 10);
      ctx.fillStyle = '#ff5d6c';
      ctx.fillRect(laser.x, laser.y, laser.w, laser.h);
      ctx.fillStyle = '#ffd9dd';
      if (laser.w > laser.h) ctx.fillRect(laser.x, laser.y + laser.h / 2 - 1, laser.w, 2);
      else ctx.fillRect(laser.x + laser.w / 2 - 1, laser.y, 2, laser.h);
    } else {
      ctx.fillStyle = 'rgba(120,140,170,0.32)';
      ctx.fillRect(laser.x, laser.y, laser.w, laser.h);
    }
    ctx.fillStyle = laser.on ? '#e05c65' : '#5d6382';
    if (laser.w > laser.h) {
      ctx.fillRect(laser.x - 4, laser.y - 5, 6, laser.h + 10);
      ctx.fillRect(laser.x + laser.w - 2, laser.y - 5, 6, laser.h + 10);
    } else {
      ctx.fillRect(laser.x - 5, laser.y - 4, laser.w + 10, 6);
      ctx.fillRect(laser.x - 5, laser.y + laser.h - 2, laser.w + 10, 6);
    }
  }

  function drawStar(star) {
    if (star.taken) return;
    const y = star.y + Math.sin(star.phase) * 3;
    ctx.save();
    ctx.translate(star.x, y);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? star.r : star.r * 0.44;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGoal(goalBox) {
    ctx.fillStyle = '#2f8a86';
    roundedRect(goalBox.x, goalBox.y, goalBox.w, goalBox.h, 12);
    ctx.fill();
    ctx.fillStyle = '#7ee0d2';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⇥', goalBox.x + goalBox.w / 2, goalBox.y + 44);
    ctx.textAlign = 'start';
  }

  function drawBody(body, isClone) {
    ctx.fillStyle = isClone ? 'rgba(184,162,255,0.55)' : '#7ee0d2';
    roundedRect(body.x, body.y, body.w, body.h, 9);
    ctx.fill();
    if (isClone) {
      ctx.strokeStyle = '#c9b8ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      roundedRect(body.x, body.y, body.w, body.h, 9);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#1b1636';
    ctx.fillRect(body.x + 15, body.y + 10, 5, 6);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(body.x + body.w / 2, body.y - 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawOverlay(title, subtitle) {
    ctx.fillStyle = 'rgba(15, 11, 32, 0.76)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 44px system-ui, "Noto Sans TC", sans-serif';
    ctx.fillText(title, W / 2, H / 2 - 20);
    ctx.fillStyle = '#e8e2ff';
    ctx.font = '22px system-ui, "Noto Sans TC", sans-serif';
    ctx.fillText(subtitle, W / 2, H / 2 + 30);
    ctx.textAlign = 'start';
  }

  function draw() {
    drawBackground();
    for (let i = 0; i < platforms.length; i += 1) drawPlatform(platforms[i]);
    if (goal) drawGoal(goal);
    for (let i = 0; i < plates.length; i += 1) drawPlate(plates[i]);
    for (let i = 0; i < lasers.length; i += 1) drawLaser(lasers[i]);
    for (let i = 0; i < stars.length; i += 1) drawStar(stars[i]);
    for (let i = 0; i < clones.length; i += 1) drawBody(clones[i], true);
    if (player) drawBody(player, false);

    if (flash > 0 && !reduceMotion) {
      ctx.fillStyle = 'rgba(224,92,101,' + (flash / 40) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    if (state === STATE.IDLE) {
      drawOverlay('星影解謎 Star Puzzle', '按 Enter 或「開始遊戲」出發');
    } else if (state === STATE.PAUSED) {
      drawOverlay('已暫停', '按 P 繼續');
    } else if (state === STATE.LEVEL_CLEAR) {
      drawOverlay('通關！', '本關星星 ' + collected + ' / 3 · 按 Enter 前往下一關');
    } else if (state === STATE.RESULT) {
      drawOverlay('全部關卡完成', '累計星星 ' + totalStars + ' / ' + (LEVELS.length * 3) + ' · 按 Enter 再玩一次');
    }
  }

  /* ---------- 介面 ---------- */
  function updateHud() {
    el.level.textContent = (levelIndex + 1) + ' / ' + LEVELS.length;
    el.stars.textContent = collected + ' / 3';
    el.totalStars.textContent = String(totalStars);
    el.clones.textContent = String(LEVELS[levelIndex].clonesAllowed - clones.length);
  }

  function setState(next) {
    state = next;
    if (next === STATE.IDLE) {
      el.start.disabled = false;
      el.start.textContent = '開始遊戲';
      el.statusText.textContent = '等待開始 · 按 Enter 或「開始遊戲」';
      canvas.setAttribute('aria-label', '分身解謎遊戲畫面，目前尚未開始');
    } else if (next === STATE.PLAYING) {
      el.start.disabled = true;
      el.start.textContent = '遊戲中';
      el.statusText.textContent = '遊戲中 · A/D 移動、空白鍵跳、C 分身、P 暫停';
      canvas.setAttribute('aria-label', '分身解謎遊戲畫面，遊戲進行中');
    } else if (next === STATE.PAUSED) {
      el.start.disabled = true;
      el.statusText.textContent = '已暫停 · 按 P 繼續';
      canvas.setAttribute('aria-label', '分身解謎遊戲畫面，已暫停');
    } else if (next === STATE.LEVEL_CLEAR) {
      el.start.disabled = false;
      el.start.textContent = '下一關';
      el.statusText.textContent = '通關 · 按 Enter 前往下一關';
      canvas.setAttribute('aria-label', '分身解謎遊戲畫面，通關');
    } else if (next === STATE.RESULT) {
      el.start.disabled = false;
      el.start.textContent = '再玩一次';
      el.statusText.textContent = '全部完成 · 累計 ' + totalStars + ' 顆星星';
      canvas.setAttribute('aria-label', '分身解謎遊戲畫面，全部關卡完成');
    }
    draw();
    updateHud();
  }

  /* ---------- 流程 ---------- */
  function startGame() {
    if (rafId) window.cancelAnimationFrame(rafId);
    totalStars = 0;
    loadLevel(0);
    setState(STATE.PLAYING);
    announce('遊戲開始，站在壓力板上按 C 放置分身');
    lastTime = performance.now();
    rafId = window.requestAnimationFrame(loop);
  }

  function nextLevel() {
    if (rafId) window.cancelAnimationFrame(rafId);
    loadLevel(levelIndex + 1);
    setState(STATE.PLAYING);
    announce(LEVELS[levelIndex].name + ' 開始');
    lastTime = performance.now();
    rafId = window.requestAnimationFrame(loop);
  }

  function loop(now) {
    if (state !== STATE.PLAYING) return;
    const dt = clamp((now - lastTime) / (1000 / 60), 0.2, 2.2);
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

  function restartLevel() {
    if (bankedThisLevel) totalStars -= collected;
    loadLevel(levelIndex);
    if (state === STATE.IDLE) {
      setState(STATE.PLAYING);
      lastTime = performance.now();
      rafId = window.requestAnimationFrame(loop);
    } else {
      setState(STATE.PLAYING);
    }
    announce(LEVELS[levelIndex].name + ' 重新開始');
  }

  function toggleSound() {
    muted = !muted;
    el.sound.setAttribute('aria-pressed', muted ? 'false' : 'true');
    el.sound.setAttribute('aria-label', muted ? '開啟音效' : '關閉音效');
    el.sound.textContent = muted ? '🔇 音效' : '🔊 音效';
    announce(muted ? '音效已關閉' : '音效已開啟');
    if (!muted) ensureAudio();
  }

  /* ---------- 事件 ---------- */
  el.start.addEventListener('click', function () {
    if (state === STATE.LEVEL_CLEAR) nextLevel();
    else if (state === STATE.RESULT) startGame();
    else startGame();
  });
  el.restart.addEventListener('click', restartLevel);
  el.sound.addEventListener('click', toggleSound);

  function bindTouch(button) {
    const action = button.getAttribute('data-action');
    const press = function (event) {
      if (button.setPointerCapture) {
        try { button.setPointerCapture(event.pointerId); } catch (error) { /* 忽略 */ }
      }
      button.classList.add('is-active');
      if (action === 'left') input.left = true;
      else if (action === 'right') input.right = true;
      else if (action === 'jump') { input.jump = true; jump(); }
      else if (action === 'clone') placeClone();
      else if (action === 'recall') recallClone();
    };
    const release = function () {
      button.classList.remove('is-active');
      if (action === 'left') input.left = false;
      else if (action === 'right') input.right = false;
      else if (action === 'jump') input.jump = false;
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
  }
  for (let i = 0; i < touchButtons.length; i += 1) bindTouch(touchButtons[i]);

  document.addEventListener('keydown', function (event) {
    const target = event.target;
    if (target && target.closest && target.closest('button')) return;
    const code = event.code;
    if (code === 'KeyA' || code === 'ArrowLeft') { event.preventDefault(); input.left = true; }
    else if (code === 'KeyD' || code === 'ArrowRight') { event.preventDefault(); input.right = true; }
    else if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') {
      event.preventDefault();
      if (!event.repeat) { input.jump = true; jump(); }
    } else if (code === 'KeyC') { placeClone(); }
    else if (code === 'KeyX') { recallClone(); }
    else if (code === 'KeyR') { restartLevel(); }
    else if (code === 'KeyP' || code === 'Escape') { togglePause(); }
    else if (code === 'Enter') {
      event.preventDefault();
      if (state === STATE.IDLE || state === STATE.RESULT) startGame();
      else if (state === STATE.LEVEL_CLEAR) nextLevel();
    }
  });

  document.addEventListener('keyup', function (event) {
    const code = event.code;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = false;
    else if (code === 'KeyD' || code === 'ArrowRight') input.right = false;
    else if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') input.jump = false;
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === STATE.PLAYING) togglePause();
  });

  function resizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  window.addEventListener('resize', resizeCanvas);

  // 測試用掛鉤：僅在測試環境注入，正式瀏覽器不會產生
  if (window.__PUZZLE_TEST__) {
    window.__puzzleDebug = {
      state: function () { return state; },
      level: function () { return levelIndex; },
      player: function () { return { x: player.x, y: player.y }; },
      cloneCount: function () { return clones.length; },
      collected: function () { return collected; },
      totalStars: function () { return totalStars; },
      lasersOn: function () { return lasers.filter(function (l) { return l.on; }).length; },
      platesOn: function () { return plates.filter(function (p) { return p.active; }).length; },
      placeClone: placeClone,
      setPlayer: function (x, y) { player.x = x; player.y = y; player.vy = 0; }
    };
  }

  loadLevel(0);
  resizeCanvas();
  setState(STATE.IDLE);
}());
