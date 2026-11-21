/* ============================================================
   星節奏 Star Beat — 遊戲主程式
   - 原創圖形：Canvas 2D 即時繪製
   - 原創音效：Web Audio API 即時合成
   - 狀態機：IDLE → PLAYING ⇄ PAUSED → RESULT
   - 無外部素材、無相依套件
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 常數 ---------------- */
  const LOGICAL_WIDTH = 800;
  const LOGICAL_HEIGHT = 480;
  const LANE_COUNT = 4;
  const HIT_Y = 388;
  const NOTE_SPEED = 280;          // px / 秒
  const BEAT_MS = 480;             // 合成音樂的拍長
  const PERFECT_MS = 70;
  const GOOD_MS = 140;
  const MISS_MS = 180;
  const MAX_PARTICLES = 40;

  const LANE_COLORS = ['#e05c65', '#e6a23c', '#4a90d9', '#7b68ae'];
  const KEY_TO_LANE = {
    KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3,
    ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3
  };

  const STATE = Object.freeze({
    IDLE: 'IDLE',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    RESULT: 'RESULT'
  });

  const reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- DOM ---------------- */
  const canvas = document.getElementById('rhythm-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scoreEl = document.getElementById('score');
  const comboEl = document.getElementById('combo');
  const accuracyEl = document.getElementById('accuracy');
  const statusEl = document.getElementById('status');
  const liveRegion = document.getElementById('live-region');
  const startButton = document.getElementById('start-button');
  const pauseButton = document.getElementById('pause-button');
  const resetButton = document.getElementById('reset-button');
  const soundButton = document.getElementById('sound-button');
  const pads = Array.from(document.querySelectorAll('.pad'));

  if (!ctx) {
    liveRegion.textContent = '此瀏覽器不支援 Canvas 2D，無法顯示遊戲。';
    return;
  }

  /* ---------------- 狀態 ---------------- */
  let state = STATE.IDLE;
  let elapsed = 0;
  let lastFrameTime = 0;
  let rafId = null;
  let notes = [];
  let endTime = 0;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let hits = 0;
  let misses = 0;
  let nextBeat = 0;
  let beatIndex = 0;
  let muted = true;
  let audioContext = null;
  let flash = null;

  const particles = Array.from({ length: MAX_PARTICLES }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff', size: 3
  }));

  /* ---------------- 工具 ---------------- */
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const laneX = (lane) => 110 + lane * 145;   // 軌道中心 x

  function announce(message) {
    liveRegion.textContent = message;
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    comboEl.textContent = String(combo);
    const total = hits + misses;
    accuracyEl.textContent = total ? Math.round((hits / total) * 100) + '%' : '—';
    const labels = {
      IDLE: '等待開始', PLAYING: '遊戲中', PAUSED: '已暫停', RESULT: '結算完成'
    };
    statusEl.textContent = labels[state];
  }

  /** 以 LINEAR CONGRUENTIAL 產生固定譜面，每次遊戲節奏一致。 */
  function buildChart() {
    let seed = 20261122;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    notes = [];
    let t = 1200;
    while (t < 30000) {
      const lane = Math.floor(random() * LANE_COUNT);
      notes.push({ lane, time: t, status: 'pending' });
      if (random() > 0.84) {
        notes.push({ lane: (lane + 2) % LANE_COUNT, time: t, status: 'pending' });
      }
      t += random() > 0.78 ? BEAT_MS : BEAT_MS / 2;
    }
    notes.sort((a, b) => a.time - b.time);
    endTime = notes[notes.length - 1].time + 1400;
  }

  /* ---------------- 音效（Web Audio） ---------------- */
  function ensureAudio() {
    if (!muted && !audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
  }

  function tone(frequency, duration, type, volume) {
    if (muted || !audioContext) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume || 0.06, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function playBeat(index) {
    if (index % 2 === 0) tone(110, 0.14, 'sine', 0.13);       // 低頻鼓點
    tone(760, 0.03, 'square', 0.025);                          // 高頻節拍
    const bass = [220, 261.6, 293.7, 196][index % 4];
    tone(bass, 0.18, 'triangle', 0.05);
  }

  /* ---------------- 粒子池 ---------------- */
  function spawnParticles(lane) {
    if (reducedMotion) return;
    const x = laneX(lane);
    let count = 0;
    for (const particle of particles) {
      if (particle.active || count >= 12) continue;
      particle.active = true;
      particle.x = x + (Math.random() - 0.5) * 60;
      particle.y = HIT_Y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.18;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 0.06;
      particle.maxLife = 500 + Math.random() * 300;
      particle.life = particle.maxLife;
      particle.color = LANE_COLORS[lane];
      particle.size = 3 + Math.random() * 3;
      count += 1;
    }
  }

  function updateParticles(dt) {
    for (const particle of particles) {
      if (!particle.active) continue;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 0.0005 * dt;
      particle.life -= dt;
      if (particle.life <= 0) particle.active = false;
    }
  }

  /* ---------------- 繪製 ---------------- */
  function resizeCanvas() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    canvas.width = Math.round(LOGICAL_WIDTH * dpr);
    canvas.height = Math.round(LOGICAL_HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame();
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function drawFrame() {
    const bg = ctx.createLinearGradient(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    bg.addColorStop(0, '#2b2350');
    bg.addColorStop(1, '#16112f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // 軌道背景與分隔線
    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      const x = laneX(lane);
      ctx.fillStyle = lane % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.015)';
      ctx.fillRect(x - 66, 0, 132, LOGICAL_HEIGHT);
      ctx.fillStyle = LANE_COLORS[lane];
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x - 66, HIT_Y + 12, 132, 4);
      ctx.globalAlpha = 1;
    }

    // 判定線
    ctx.strokeStyle = '#f5c451';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, HIT_Y);
    ctx.lineTo(LOGICAL_WIDTH - 40, HIT_Y);
    ctx.stroke();

    // 音符
    for (const note of notes) {
      if (note.status !== 'pending') continue;
      const y = HIT_Y - ((note.time - elapsed) / 1000) * NOTE_SPEED;
      if (y < -30 || y > LOGICAL_HEIGHT + 20) continue;
      const x = laneX(note.lane);
      ctx.fillStyle = LANE_COLORS[note.lane];
      roundRect(x - 52, y - 11, 104, 22, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      roundRect(x - 46, y - 7, 92, 5, 3);
      ctx.fill();
    }

    // 粒子
    for (const particle of particles) {
      if (!particle.active) continue;
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 判定提示
    if (flash && elapsed - flash.time < 450) {
      const age = elapsed - flash.time;
      ctx.globalAlpha = 1 - age / 450;
      ctx.fillStyle = flash.color;
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(flash.text, LOGICAL_WIDTH / 2, HIT_Y - 58);
      ctx.globalAlpha = 1;
    }

    // 標題與進度
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('STAR BEAT  ·  ORIGINAL RHYTHM', 28, 30);

    if (endTime > 0) {
      const progress = clamp(elapsed / endTime, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(28, 42, LOGICAL_WIDTH - 56, 4);
      ctx.fillStyle = '#f5c451';
      ctx.fillRect(28, 42, (LOGICAL_WIDTH - 56) * progress, 4);
    }

    // 狀態覆蓋層
    if (state === STATE.IDLE || state === STATE.PAUSED || state === STATE.RESULT) {
      ctx.fillStyle = 'rgba(12,9,28,0.66)';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 36px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const title = state === STATE.IDLE ? '星節奏 Star Beat'
        : state === STATE.PAUSED ? '已暫停' : '演出結束';
      ctx.fillText(title, LOGICAL_WIDTH / 2, 215);
      ctx.font = '500 17px system-ui, sans-serif';
      const subtitle = state === STATE.IDLE ? '按下「開始遊戲」進入節奏'
        : state === STATE.PAUSED ? '按下「繼續」回到遊戲'
        : '分數 ' + score + ' · 最大連擊 ' + maxCombo;
      ctx.fillText(subtitle, LOGICAL_WIDTH / 2, 255);
    }
  }

  /* ---------------- 遊戲流程 ---------------- */
  function resetGame() {
    state = STATE.IDLE;
    elapsed = 0;
    notes = [];
    endTime = 0;
    score = 0;
    combo = 0;
    maxCombo = 0;
    hits = 0;
    misses = 0;
    nextBeat = 0;
    beatIndex = 0;
    flash = null;
    particles.forEach((p) => { p.active = false; });
    startButton.textContent = '開始遊戲';
    pauseButton.textContent = '暫停';
    pauseButton.disabled = true;
    canvas.setAttribute('aria-label', '四軌節奏遊戲畫面，目前尚未開始');
    updateHud();
    drawFrame();
  }

  function startGame() {
    if (state === STATE.RESULT || state === STATE.IDLE) {
      buildChart();
      elapsed = 0;
      score = 0;
      combo = 0;
      maxCombo = 0;
      hits = 0;
      misses = 0;
      nextBeat = 0;
      beatIndex = 0;
    }
    ensureAudio();
    state = STATE.PLAYING;
    startButton.textContent = '重新開始';
    pauseButton.textContent = '暫停';
    pauseButton.disabled = false;
    canvas.setAttribute('aria-label', '四軌節奏遊戲畫面，遊戲進行中');
    announce('遊戲開始，請在音符到達判定線時按下對應軌道。');
    updateHud();

    if (rafId === null) {
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  function togglePause() {
    if (state === STATE.PLAYING) {
      state = STATE.PAUSED;
      pauseButton.textContent = '繼續';
      announce('遊戲已暫停。');
    } else if (state === STATE.PAUSED) {
      state = STATE.PLAYING;
      pauseButton.textContent = '暫停';
      announce('遊戲繼續。');
    }
    updateHud();
    drawFrame();
  }

  function finishGame() {
    state = STATE.RESULT;
    startButton.textContent = '再玩一次';
    pauseButton.disabled = true;
    const total = hits + misses;
    const accuracy = total ? Math.round((hits / total) * 100) : 0;
    canvas.setAttribute('aria-label',
      '演出結束，分數 ' + score + '，最大連擊 ' + maxCombo + '，準確率 ' + accuracy + '%');
    announce('演出結束。分數 ' + score + '，最大連擊 ' + maxCombo + '，準確率 ' + accuracy + '%。');
    updateHud();
  }

  function hitLane(lane) {
    if (state !== STATE.PLAYING) return;
    ensureAudio();

    let target = null;
    let bestDiff = Infinity;
    for (const note of notes) {
      if (note.lane !== lane || note.status !== 'pending') continue;
      const diff = Math.abs(note.time - elapsed);
      if (diff < bestDiff) {
        bestDiff = diff;
        target = note;
      }
    }

    if (!target || bestDiff > MISS_MS) {
      tone(160, 0.05, 'sine', 0.02);
      return;
    }

    if (bestDiff <= PERFECT_MS) {
      target.status = 'hit';
      score += 300;
      combo += 1;
      hits += 1;
      maxCombo = Math.max(maxCombo, combo);
      flash = { text: 'PERFECT', color: '#f5c451', time: elapsed };
      spawnParticles(lane);
      tone(880, 0.08, 'sine', 0.08);
    } else if (bestDiff <= GOOD_MS) {
      target.status = 'hit';
      score += 100;
      combo += 1;
      hits += 1;
      maxCombo = Math.max(maxCombo, combo);
      flash = { text: 'GOOD', color: '#8fd694', time: elapsed };
      spawnParticles(lane);
      tone(660, 0.07, 'sine', 0.06);
    } else {
      target.status = 'miss';
      combo = 0;
      misses += 1;
      flash = { text: 'MISS', color: '#ff8a9b', time: elapsed };
      tone(180, 0.09, 'sawtooth', 0.05);
    }
    updateHud();
  }

  function tick(now) {
    const dt = Math.min(now - lastFrameTime, 50);
    lastFrameTime = now;

    if (state === STATE.PLAYING) {
      elapsed += dt;

      while (elapsed >= nextBeat) {
        playBeat(beatIndex);
        beatIndex += 1;
        nextBeat += BEAT_MS;
      }

      for (const note of notes) {
        if (note.status === 'pending' && elapsed > note.time + MISS_MS) {
          note.status = 'miss';
          combo = 0;
          misses += 1;
          flash = { text: 'MISS', color: '#ff8a9b', time: elapsed };
          updateHud();
        }
      }

      if (elapsed >= endTime) {
        finishGame();
      }
    }

    updateParticles(dt);
    drawFrame();

    // 待機與結算且無殘留特效時停止迴圈，避免背景空轉耗電
    const hasParticles = particles.some((p) => p.active);
    const hasFlash = flash && elapsed - flash.time < 450;
    if ((state === STATE.IDLE || state === STATE.RESULT) && !hasParticles && !hasFlash) {
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  /* ---------------- 事件綁定 ---------------- */
  startButton.addEventListener('click', startGame);
  pauseButton.addEventListener('click', togglePause);
  resetButton.addEventListener('click', () => {
    if (state === STATE.PLAYING || state === STATE.PAUSED) {
      announce('遊戲已重置。');
    }
    resetGame();
  });

  soundButton.addEventListener('click', () => {
    muted = !muted;
    soundButton.setAttribute('aria-pressed', String(!muted));
    soundButton.setAttribute('aria-label', muted ? '開啟音效' : '關閉音效');
    soundButton.textContent = (muted ? '🔇' : '🔊') + ' 音效';
    ensureAudio();
    tone(720, 0.08, 'sine', 0.07);
  });

  pads.forEach((pad) => {
    const lane = Number(pad.dataset.lane);
    pad.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      pad.classList.add('is-active');
      hitLane(lane);
    });
    const clear = () => pad.classList.remove('is-active');
    pad.addEventListener('pointerup', clear);
    pad.addEventListener('pointercancel', clear);
    pad.addEventListener('pointerleave', clear);
  });

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const lane = KEY_TO_LANE[event.code];
    if (lane !== undefined) {
      const target = event.target;
      if (target && target.closest && target.closest('input, textarea, select')) return;
      event.preventDefault();
      hitLane(lane);
      const pad = pads[lane];
      if (pad) {
        pad.classList.add('is-active');
        window.setTimeout(() => pad.classList.remove('is-active'), 100);
      }
      return;
    }
    if (event.code === 'Space') {
      const target = event.target;
      if (target && target.closest && target.closest('button, a, summary')) return;
      event.preventDefault();
      if (state === STATE.PLAYING || state === STATE.PAUSED) togglePause();
      else startGame();
    }
  });

  window.addEventListener('resize', resizeCanvas, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!audioContext) return;
    if (document.hidden) audioContext.suspend().catch(() => {});
    else if (!muted) audioContext.resume().catch(() => {});
  });

  /* ---------------- 初始化 ---------------- */
  resizeCanvas();
  resetGame();
})();
