/**
 * Star Branch - 原創分支防守遊戲
 * 靈感：Avabranch 的多線分裂/合併與顏色匹配概念（原創實作）
 * 零外部依賴：Canvas 2D + Web Audio 即時合成
 */
(() => {
  'use strict';

  // ========== 配置 ==========
  const CFG = {
    canvasId: 'game-canvas',
    colors: [
      { main: '#ff5e7e', glow: '#ffa0b4', name: '紅' },
      { main: '#ffd166', glow: '#ffe6a0', name: '黃' },
      { main: '#5ee0a0', glow: '#a0f0c8', name: '綠' },
      { main: '#5eb8ff', glow: '#a0d8ff', name: '藍' }
    ],
    lanes: 4,
    coreMax: 5,
    block: { size: 34, baseSpeed: 90, speedPerWave: 16, maxSpeed: 260 },
    spawn: { baseInterval: 1.1, minInterval: 0.42 },
    comboWindow: 3.2,
    starCount: 70
  };

  // ========== 狀態 ==========
  let canvas, ctx, width, height, dpr;
  let lastTime = 0, running = false, paused = false, gameOver = false;

  let branches = [];       // 4 條分支 { color }
  let blocks = [];         // 掉落方塊 { lane, color, y, type }
  let particles = [], stars = [], pulses = [];
  let merged = false;      // 合併模式
  let mergeColor = 0;

  let score = 0, wave = 1, core = CFG.coreMax;
  let combo = 0, comboTimer = 0, absorbed = 0;
  let spawnTimer = 0, waveTimer = 0, betweenWaves = false;
  let shield = 0, slow = 0, shake = 0, flash = 0;
  let lastLaneColors = [0, 1, 2, 3]; // 供合併前記還原

  let audioCtx = null, audioUnlocked = false, muted = false;

  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-message');
  const btnStart = document.getElementById('btn-start');
  const btnMute = document.getElementById('btn-mute');
  const controlsHint = document.getElementById('controls-hint');
  const hudScore = document.getElementById('hud-score');
  const hudWave = document.getElementById('hud-wave');
  const hudCore = document.getElementById('hud-core');
  const hudMode = document.getElementById('hud-mode');
  const branchBtns = Array.from(document.querySelectorAll('.branch-btn[data-lane]'));
  const btnMerge = document.getElementById('btn-merge');

  // ========== 工具 ==========
  const rand = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const laneX = i => width * (i + 0.5) / CFG.lanes;
  const nodeY = () => height - 78;

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
    initStars();
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
    src.connect(g).connect(audioCtx.destination);
    src.start();
  }
  const SFX = {
    switch: c => tone(440 + c * 110, 0.06, 'sine', 0.07),
    absorb: () => tone(660, 0.07, 'sine', 0.09, 990),
    combo: n => tone(520 + Math.min(n, 10) * 45, 0.09, 'triangle', 0.08),
    miss: () => { tone(180, 0.18, 'sawtooth', 0.1, 80); noise(0.12, 0.07); },
    merge: () => { tone(330, 0.15, 'sine', 0.1, 660); },
    split: () => { tone(660, 0.15, 'sine', 0.1, 330); },
    power: () => { tone(880, 0.1, 'sine', 0.1); tone(1320, 0.1, 'sine', 0.08); },
    heal: () => tone(520, 0.2, 'sine', 0.1, 880),
    wave: () => { tone(523, 0.1, 'sine', 0.09); tone(784, 0.15, 'sine', 0.09); },
    gameover: () => { tone(300, 0.2, 'sine', 0.1); tone(180, 0.3, 'sine', 0.1); }
  };
  function toggleMute() {
    muted = !muted;
    btnMute.textContent = muted ? '取消靜音' : '靜音';
    btnMute.setAttribute('aria-pressed', muted);
  }

  // ========== 粒子 ==========
  function burst(x, y, color, count, speed, life, sizeRange = [2, 5]) {
    for (let i = 0; i < count && particles.length < 300; i++) {
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
      p.vy += 120 * dt;
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

  // ========== 分支 ==========
  function activeColor(lane) { return merged ? mergeColor : branches[lane].color; }
  function cycleLane(lane) {
    if (merged) {
      mergeColor = (mergeColor + 1) % CFG.colors.length;
      SFX.switch(mergeColor);
      const y = nodeY();
      for (let i = 0; i < CFG.lanes; i++) burst(laneX(i), y, CFG.colors[mergeColor].main, 4, 70, 0.3, [1.5, 3]);
    } else {
      branches[lane].color = (branches[lane].color + 1) % CFG.colors.length;
      SFX.switch(branches[lane].color);
      burst(laneX(lane), nodeY(), CFG.colors[branches[lane].color].main, 6, 90, 0.35, [1.5, 3]);
    }
    syncBranchButtons();
  }
  function toggleMerge() {
    if (merged) {
      // 分裂：還原各分支純色
      merged = false;
      for (let i = 0; i < CFG.lanes; i++) branches[i].color = i;
      SFX.split();
    } else {
      // 合併：記住原色，統一為目前第一條Color
      for (let i = 0; i < CFG.lanes; i++) lastLaneColors[i] = branches[i].color;
      mergeColor = branches[0].color;
      merged = true;
      SFX.merge();
    }
    flash = 0.35;
    updateHUD();
    syncBranchButtons();
  }
  function syncBranchButtons() {
    branchBtns.forEach((btn, i) => {
      const c = CFG.colors[activeColor(i)].main;
      btn.querySelector('.lane-swatch').style.background = c;
      btn.style.borderColor = c;
    });
    const text = btnMerge.querySelector('.lane-text');
    if (text) text.textContent = merged ? '合併 ×2' : '分裂';
  }
  function drawBranches() {
    const y = nodeY();
    // 底部核心連線
    ctx.strokeStyle = 'rgba(185,140,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, height - 12);
    ctx.lineTo(width - 20, height - 12);
    ctx.stroke();

    for (let i = 0; i < CFG.lanes; i++) {
      const x = laneX(i);
      const color = CFG.colors[activeColor(i)];
      // 能量線
      const grad = ctx.createLinearGradient(x, y, x, height);
      grad.addColorStop(0, color.main);
      grad.addColorStop(1, 'rgba(185,140,255,0.1)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = merged ? 7 : 4;
      ctx.shadowColor = color.main; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, height - 12);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 節點
      ctx.fillStyle = color.main;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, TAU);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(x - 4, y - 4, 4, 0, TAU); ctx.fill();
    }

    // 合併模式的橫向連線
    if (merged) {
      ctx.strokeStyle = CFG.colors[mergeColor].main + 'aa';
      ctx.lineWidth = 5;
      ctx.shadowColor = CFG.colors[mergeColor].main; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(laneX(0), y);
      ctx.lineTo(laneX(CFG.lanes - 1), y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // ========== 掉落方塊 ==========
  function spawnBlock() {
    const lane = Math.floor(rand(0, CFG.lanes));
    const color = Math.floor(rand(0, CFG.colors.length));
    const roll = Math.random();
    let type = 'normal';
    if (roll > 0.94) type = 'star';        // 道具
    else if (roll > 0.88) type = 'bomb';   // 炸彈
    const speed = Math.min(CFG.block.baseSpeed + (wave - 1) * CFG.block.speedPerWave, CFG.block.maxSpeed)
      * (slow > 0 ? 0.6 : 1);
    blocks.push({ lane, color, type, y: -CFG.block.size, speed, rot: rand(0, TAU) });
  }
  function updateBlocks(dt) {
    // 生成
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !betweenWaves) {
      spawnBlock();
      const interval = Math.max(CFG.spawn.minInterval, CFG.spawn.baseInterval - wave * 0.06);
      spawnTimer = interval * rand(0.75, 1.25);
    }

    const hitY = nodeY();
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      b.y += b.speed * dt;
      b.rot += dt * 0.8;
      const x = laneX(b.lane);

      // 抵達分支節點
      if (b.y >= hitY - CFG.block.size / 2 && b.y <= hitY + CFG.block.size) {
        handleCatch(b, x, hitY);
        blocks.splice(i, 1);
        continue;
      }
      if (b.y > height + CFG.block.size) blocks.splice(i, 1);
    }
  }
  function handleCatch(b, x, y) {
    if (b.type === 'star') {
      // 星星道具：隨機正面效果
      const effect = Math.floor(rand(0, 3));
      if (effect === 0) { core = Math.min(CFG.coreMax, core + 1); SFX.heal(); }
      else if (effect === 1) { shield = Math.max(shield, 2); SFX.power(); }
      else { blocks = []; SFX.power(); flash = 0.5; }
      burst(x, y, '#fff', 20, 180, 0.7, [2, 5]);
      updateHUD();
      return;
    }
    if (b.type === 'bomb') {
      // 炸彈：永遠傷害（除非護盾）
      damageCore(x, y);
      return;
    }
    // 一般方塊：顏色匹配
    const need = activeColor(b.lane);
    if (b.color === need) {
      combo++;
      comboTimer = CFG.comboWindow;
      absorbed++;
      const mult = merged ? 2 : 1;
      const gained = (10 + Math.min(combo, 20) * 2) * mult;
      score += gained;
      updateHUD();
      const col = CFG.colors[b.color];
      burst(x, y, col.main, 12, 140, 0.5, [2, 5]);
      pulses.push({ x, y, t: 0, color: col.main });
      if (combo > 0 && combo % 5 === 0) SFX.combo(combo); else SFX.absorb();
    } else {
      combo = 0; comboTimer = 0;
      damageCore(x, y);
    }
  }
  function damageCore(x, y) {
    if (shield > 0) {
      shield--;
      burst(x, y, '#5eb8ff', 14, 150, 0.5);
      SFX.power();
      updateHUD();
      return;
    }
    core--;
    shake = 0.4; flash = 0.5;
    SFX.miss();
    burst(x, y, '#ff5e7e', 18, 180, 0.6, [2, 5]);
    updateHUD();
    if (core <= 0) endGame();
  }
  function drawBlocks() {
    const s = CFG.block.size;
    for (const b of blocks) {
      const x = laneX(b.lane);
      ctx.save();
      ctx.translate(x, b.y);
      ctx.rotate(b.rot * (b.type === 'star' ? 1 : 0.15));
      if (b.type === 'star') {
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 16;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * TAU - Math.PI / 2;
          const r = k % 2 === 0 ? s * 0.62 : s * 0.28;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
      } else if (b.type === 'bomb') {
        ctx.fillStyle = '#2a2030';
        ctx.strokeStyle = '#ff5e7e'; ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff5e7e'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff5e7e';
        ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 1);
      } else {
        const c = CFG.colors[b.color];
        const grad = ctx.createLinearGradient(-s/2, -s/2, s/2, s/2);
        grad.addColorStop(0, c.glow); grad.addColorStop(1, c.main);
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.shadowColor = c.main; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(-s/2, -s/2, s, s, 7);
        ctx.fill(); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // ==========  absorbed energy pulses ==========
  function updatePulses(dt) {
    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].t += dt * 2.2;
      if (pulses[i].t >= 1) pulses.splice(i, 1);
    }
  }
  function drawPulses() {
    for (const p of pulses) {
      const y = p.y + (height - 12 - p.y) * p.t;
      ctx.globalAlpha = 1 - p.t;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, y, 5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ========== HUD / 流程 ==========
  function updateHUD() {
    hudScore.textContent = score.toLocaleString();
    hudWave.textContent = wave;
    hudCore.textContent = '♥'.repeat(Math.max(0, core)) + '♡'.repeat(Math.max(0, CFG.coreMax - core));
    hudMode.textContent = merged ? '合併 ×2' : '分裂';
    syncBranchButtons();
  }
  function showOverlay(title, msg, btn) {
    overlayTitle.innerHTML = title;
    overlayMsg.innerHTML = msg;
    btnStart.textContent = btn;
    overlay.classList.remove('hidden');
  }
  function startGame() {
    score = 0; wave = 1; core = CFG.coreMax;
    combo = 0; comboTimer = 0; absorbed = 0;
    shield = 0; slow = 0; shake = 0; flash = 0;
    blocks = []; particles = []; pulses = [];
    merged = false; mergeColor = 0;
    branches = [];
    for (let i = 0; i < CFG.lanes; i++) branches.push({ color: i });
    betweenWaves = false;
    spawnTimer = 0.8;
    gameOver = false; paused = false;
    updateHUD();
    overlay.classList.add('hidden');
    running = true;
  }
  function endGame() {
    running = false; gameOver = true;
    SFX.gameover();
    showOverlay('遊戲結束', `最終分數：${score.toLocaleString()}<br>到達波次：${wave}`, '再玩一次');
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
    updateBlocks(dt);
    updateParticles(dt);
    updatePulses(dt);

    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 0;
    }
    // shield 為次數制（非計時），僅 slow 隨時間遞減
    if (slow > 0) slow -= dt;
    if (shake > 0) shake -= dt;
    if (flash > 0) flash -= dt;

    // 波次推進（每吸收 12 個）
    if (!betweenWaves && absorbed >= wave * 12) {
      betweenWaves = true;
      waveTimer = 1.6;
      score += 100 * wave;
      updateHUD();
      SFX.wave();
    }
    if (betweenWaves) {
      waveTimer -= dt;
      if (waveTimer <= 0) { wave++; betweenWaves = false; updateHUD(); }
    }
  }
  function updateStars(dt) {
    for (const s of stars) {
      s.y += s.sp * dt;
      if (s.y > height) { s.y = -2; s.x = rand(0, width); }
    }
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#06040f';
    ctx.fillRect(0, 0, width, height);

    // 星空
    for (const s of stars) {
      ctx.globalAlpha = s.a; ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    if (shake > 0) ctx.translate(rand(-5, 5) * shake, rand(-5, 5) * shake);

    // 車道分隔線
    ctx.strokeStyle = 'rgba(185,140,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < CFG.lanes; i++) {
      const x = width * i / CFG.lanes;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }

    drawBlocks();
    drawBranches();
    drawPulses();
    drawParticles();

    // 連擊提示
    if (combo >= 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${combo} 連擊${merged ? ' ×2' : ''}`, width / 2, 34);
    }
    // 護盾/減速提示
    let sy = 58;
    ctx.font = '13px system-ui, sans-serif';
    if (shield > 0) { ctx.fillStyle = '#5eb8ff'; ctx.fillText(`護盾 ${Math.ceil(shield)}`, width / 2, sy); sy += 18; }
    if (slow > 0) { ctx.fillStyle = '#ffd166'; ctx.fillText(`減速 ${Math.ceil(slow)}`, width / 2, sy); }

    if (betweenWaves) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`波次 ${wave + 1}！`, width / 2, height / 2);
    }

    if (flash > 0) {
      ctx.globalAlpha = flash * 0.4;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }

  // ========== 輸入 ==========
  function setupInput() {
    window.addEventListener('keydown', e => {
      if (!audioUnlocked) unlockAudio();
      const k = e.code;
      let lane = -1;
      if (k === 'Digit1' || k === 'KeyA') lane = 0;
      else if (k === 'Digit2' || k === 'KeyS') lane = 1;
      else if (k === 'Digit3' || k === 'KeyD') lane = 2;
      else if (k === 'Digit4' || k === 'KeyF') lane = 3;
      else if (k === 'Space') { e.preventDefault(); if (running && !paused && !gameOver && !e.repeat) toggleMerge(); }
      else if (k === 'KeyP' || k === 'Escape') togglePause();
      else if (k === 'KeyM') toggleMute();
      if (lane >= 0 && running && !paused && !gameOver && !e.repeat) cycleLane(lane);
    });

    branchBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!audioUnlocked) unlockAudio();
        if (running && !paused && !gameOver) cycleLane(parseInt(btn.dataset.lane, 10));
      });
    });
    btnMerge.addEventListener('click', () => {
      if (!audioUnlocked) unlockAudio();
      if (running && !paused && !gameOver) toggleMerge();
    });

    // 點擊畫面分支切色
    canvas.addEventListener('click', e => {
      if (!audioUnlocked) unlockAudio();
      if (!running || paused || gameOver) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (width / rect.width);
      const y = (e.clientY - rect.top) * (height / rect.height);
      if (y > nodeY() - 60) {
        const lane = clamp(Math.floor(x / (width / CFG.lanes)), 0, CFG.lanes - 1);
        cycleLane(lane);
      }
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

  // ========== 初始化 ==========
  function init() {
    initCanvas();
    initAudio();
    setupInput();
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    controlsHint.innerHTML = isMobile
      ? '點擊分支按鈕切色 · ⇄ 切換分裂／合併'
      : '1-4 或 A/S/D/F 切色 · Space 分裂／合併 · P 暫停 · M 靜音';
    showOverlay('星脈分支 Star Branch', '切換分支顏色吸收同色方塊，合併可雙倍得分', '開始遊戲');
    btnStart.onclick = startGame;
    branches = [];
    for (let i = 0; i < CFG.lanes; i++) branches.push({ color: i });
    updateHUD();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();