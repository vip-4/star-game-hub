/**
 * Star Tunnel - 原創管狀射擊遊戲 (Tempest-style)
 * 零外部依賴：Canvas 2D 透視投影 + Web Audio 即時合成
 */
(() => {
  'use strict';

  // ========== 配置 ==========
  const CFG = {
    canvasId: 'game-canvas',
    segments: 20,          // 管道分段數
    fireRate: 0.11,
    bulletSpeed: 1.55,     // 深度/秒
    enemyBulletSpeed: 0.62,
    playerFlipInvuln: 0.5,
    playerHitInvuln: 1.2,
    coreMax: 5,
    startLives: 3,
    spawnIntervalBase: 1.4,
    waveBreak: 2200,
    starCount: 60
  };

  const ENEMY_TYPES = {
    crawler: { hp: 1, score: 50,  speed: 0.085, color: '#ff5e9c', shape: 'diamond', size: 13 },
    zigzag:  { hp: 1, score: 100, speed: 0.095, color: '#ffb35e', shape: 'triangle', size: 13, zigzag: true },
    spitter: { hp: 2, score: 150, speed: 0.055, color: '#c77dff', shape: 'hexagon', size: 15, spitter: true },
    flier:   { hp: 1, score: 200, speed: 0.19,  color: '#5ee0ff', shape: 'arrow', size: 12 },
    boss:    { hp: 40, score: 2500, speed: 0.018, color: '#ff3b3b', shape: 'boss', size: 30, boss: true }
  };

  // ========== 狀態 ==========
  let canvas, ctx, width, height, dpr, cx, cy, rNear, rFar;
  let lastTime = 0, running = false, paused = false, gameOver = false;

  let player = null;
  let enemies = [], bullets = [], enemyBullets = [], spiders = [], particles = [], stars = [];

  let score = 0, wave = 1, lives = CFG.startLives, core = CFG.coreMax;
  let spawnQueue = 0, spawnTimer = 0, waveTimer = 0, betweenWaves = false;
  let shake = 0, flash = 0;

  const keys = { left: false, right: false, fire: false, flip: false };
  let audioCtx = null, audioUnlocked = false, muted = false;

  // DOM
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-message');
  const btnStart = document.getElementById('btn-start');
  const btnMute = document.getElementById('btn-mute');
  const controlsHint = document.getElementById('controls-hint');
  const hudScore = document.getElementById('hud-score');
  const hudWave = document.getElementById('hud-wave');
  const hudLives = document.getElementById('hud-lives');
  const hudCore = document.getElementById('hud-core');

  // ========== 工具 ==========
  const rand = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;

  // ========== Canvas / 透視 ==========
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

    cx = width / 2;
    cy = height * 0.46;
    rNear = Math.min(width, height) * 0.47;
    rFar = rNear * 0.055;
    initStars();
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < CFG.starCount; i++) {
      stars.push({ x: rand(0, width), y: rand(0, height), s: rand(1, 2.4), a: rand(0.2, 0.9), sp: rand(4, 18) });
    }
  }

  /** 將 (軌道分段 seg, 深度 depth 0遠~1近) 投影到螢幕 */
  function project(seg, depth) {
    const t = clamp(depth, 0, 1);
    const angle = (seg / CFG.segments) * TAU - Math.PI / 2;
    const r = rFar * Math.pow(rNear / rFar, t);
    // 輕微隧道彎曲，營造立體感
    const bendX = Math.sin(t * Math.PI) * width * 0.045;
    const bendY = -Math.sin(t * Math.PI) * height * 0.035;
    return {
      x: cx + bendX + Math.cos(angle) * r,
      y: cy + bendY + Math.sin(angle) * r * 0.88,
      r,
      angle,
      scale: 0.35 + 0.65 * t
    };
  }

  // ========== 音效 ==========
  function initAudio() {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { /* 不支援則靜默 */ }
  }
  function unlockAudio() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    audioUnlocked = true;
  }
  function tone(freq, dur, type = 'square', vol = 0.1, delay = 0) {
    if (!audioCtx || muted || !audioUnlocked) return;
    const now = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }
  function noise(dur, vol = 0.08) {
    if (!audioCtx || muted || !audioUnlocked) return;
    const n = Math.floor(audioCtx.sampleRate * dur);
    const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = audioCtx.createBufferSource();
    const g = audioCtx.createGain();
    src.buffer = buf; g.gain.value = vol;
    src.connect(g).connect(audioCtx.destination);
    src.start();
  }
  const SFX = {
    shoot: () => tone(920, 0.05, 'square', 0.07),
    flip: () => { tone(300, 0.08, 'sine', 0.1); tone(600, 0.08, 'sine', 0.08, 0.04); },
    hit: () => tone(520, 0.05, 'square', 0.09),
    kill: () => { noise(0.12, 0.1); tone(180, 0.12, 'sine', 0.07); },
    hurt: () => { tone(200, 0.25, 'sawtooth', 0.12); noise(0.2, 0.1); },
    wave: () => { tone(660, 0.1, 'sine', 0.09); tone(990, 0.12, 'sine', 0.08, 0.08); },
    boss: () => { tone(120, 0.3, 'sawtooth', 0.13); noise(0.3, 0.1); },
    gameover: () => { tone(330, 0.2, 'sine', 0.1); tone(220, 0.3, 'sine', 0.1, 0.15); }
  };
  function toggleMute() {
    muted = !muted;
    btnMute.textContent = muted ? '取消靜音' : '靜音';
    btnMute.setAttribute('aria-pressed', muted);
  }

  // ========== 粒子 ==========
  function burst(x, y, color, count, speed, life) {
    for (let i = 0; i < count && particles.length < 320; i++) {
      const a = rand(0, TAU), s = rand(speed * 0.3, speed);
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rand(1.5, 4), life: rand(life * 0.5, life), max: life, color
      });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
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

  // ========== 玩家 ==========
  function createPlayer() {
    return { seg: CFG.segments / 2, fireTimer: 0, invuln: 0, blink: false };
  }
  function segStep(dt) {
    // 沿邊緣移動：每秒約 6 段
    const speed = 6.5;
    if (keys.left) player.seg -= speed * dt;
    if (keys.right) player.seg += speed * dt;
    player.seg = ((player.seg % CFG.segments) + CFG.segments) % CFG.segments;
  }
  function flip() {
    if (player && player.invuln <= 0.35) {
      player.seg = (player.seg + CFG.segments / 2) % CFG.segments;
      player.invuln = Math.max(player.invuln, CFG.playerFlipInvuln);
      SFX.flip();
      const p = project(player.seg, 1);
      burst(p.x, p.y, '#5ee0ff', 12, 120, 0.4);
    }
  }
  function updatePlayer(dt) {
    if (!player) return;
    if (player.invuln > 0) {
      player.invuln -= dt;
      player.blink = Math.floor(player.invuln / 0.08) % 2 === 0;
    } else player.blink = false;

    segStep(dt);

    if (player.fireTimer > 0) player.fireTimer -= dt;
    if (keys.fire && player.fireTimer <= 0) {
      fire();
      player.fireTimer = CFG.fireRate;
    }
    if (keys.flip) { flip(); keys.flip = false; }
  }
  function fire() {
    // 先檢查近端蜘蛛（同軌道附近）
    let hitSpider = false;
    for (let i = spiders.length - 1; i >= 0; i--) {
      const s = spiders[i];
      if (segDist(s.seg, player.seg) < 0.9) {
        spiders.splice(i, 1);
        const p = project(s.seg, 1);
        burst(p.x, p.y, '#ffffff', 14, 150, 0.5);
        score += 100; updateHUD();
        SFX.hit(); hitSpider = true;
      }
    }
    bullets.push({ seg: player.seg, depth: 0.99, alive: true });
    if (!hitSpider) SFX.shoot();
  }
  function drawPlayer() {
    if (!player || (player.blink && player.invuln > 0)) return;
    const p = project(player.seg, 1);
    ctx.save();
    ctx.translate(p.x, p.y);
    // 指向中心（內側）
    const inward = p.angle + Math.PI;
    ctx.rotate(inward + Math.PI / 2);
    const grad = ctx.createLinearGradient(0, -16, 0, 12);
    grad.addColorStop(0, '#5ee0ff'); grad.addColorStop(1, '#1a8fbf');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(-11, 10); ctx.lineTo(-4, 6);
    ctx.lineTo(0, 10); ctx.lineTo(4, 6); ctx.lineTo(11, 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 引擎光
    ctx.fillStyle = 'rgba(94,224,255,0.7)';
    ctx.beginPath(); ctx.ellipse(0, 12, 5, 8, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ========== 敵人 ==========
  function segDist(a, b) {
    let d = Math.abs(a - b) % CFG.segments;
    return Math.min(d, CFG.segments - d);
  }
  function spawnEnemy(typeKey, seg, depth) {
    const T = ENEMY_TYPES[typeKey];
    enemies.push({
      type: typeKey, seg, depth,
      hp: T.hp, maxHp: T.hp, score: T.score,
      speed: T.speed * (1 + (wave - 1) * 0.06),
      color: T.color, shape: T.shape, size: T.size,
      zig: T.zigzag || false, zigTimer: rand(0.4, 1.2), zigDir: Math.random() < 0.5 ? 1 : -1,
      spit: T.spitter || false, spitTimer: rand(1, 2.5),
      boss: T.boss || false, bossTimer: 0,
      hitFlash: 0, alive: true
    });
  }
  function spawnWave() {
    betweenWaves = false;
    spawnQueue = Math.min(6 + wave * 2, 26);
    spawnTimer = 0.6;
    if (wave % 5 === 0) {
      spawnEnemy('boss', CFG.segments / 2, 0.02);
      spawnQueue = Math.max(0, spawnQueue - 4);
      SFX.boss();
    }
    updateHUD();
  }
  function updateEnemies(dt) {
    // 生成佇列
    if (spawnQueue > 0 && !betweenWaves) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        const pool = wave < 2 ? ['crawler', 'crawler', 'flier']
          : wave < 4 ? ['crawler', 'zigzag', 'flier', 'spitter']
          : ['crawler', 'zigzag', 'flier', 'spitter', 'spitter'];
        const t = pool[Math.floor(Math.random() * pool.length)];
        spawnEnemy(t, Math.floor(rand(0, CFG.segments)), 0.01);
        spawnQueue--;
        spawnTimer = Math.max(0.35, CFG.spawnIntervalBase - wave * 0.06) * rand(0.7, 1.3);
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];

      if (e.boss) {
        e.bossTimer += dt;
        // 缓慢 spanout + 横移
        e.seg = (e.seg + dt * 0.35) % CFG.segments;
        e.depth = 0.05 + Math.sin(e.bossTimer * 0.6) * 0.03;
        // 環形彈幕
        if (Math.floor(e.bossTimer / 1.1) > Math.floor((e.bossTimer - dt) / 1.1)) {
          const count = 8;
          for (let k = 0; k < count; k++) {
            enemyBullets.push({
              seg: (e.seg + k * (CFG.segments / count)) % CFG.segments,
              depth: e.depth, alive: true, color: '#ff5e5e'
            });
          }
          SFX.boss();
        }
      } else {
        e.depth += e.speed * dt;
        if (e.zig) {
          e.zigTimer -= dt;
          if (e.zigTimer <= 0) {
            e.seg = (e.seg + e.zigDir + CFG.segments) % CFG.segments;
            e.zigTimer = rand(0.5, 1.1);
            // 偶爾反向
            if (Math.random() < 0.25) e.zigDir *= -1;
          }
        }
        if (e.spit) {
          e.spitTimer -= dt;
          if (e.spitTimer <= 0 && e.depth < 0.85 && player) {
            enemyBullets.push({ seg: player.seg, depth: e.depth, alive: true, color: '#c77dff' });
            e.spitTimer = rand(1.8, 3.2);
            tone(260, 0.08, 'sawtooth', 0.06);
          }
        }
      }

      if (e.hitFlash > 0) e.hitFlash -= dt;

      // 抵達近端 → 變成蜘蛛
      if (e.depth >= 1) {
        spiders.push({ seg: e.seg, speed: e.boss ? 1.0 : 1.4, color: e.color, alive: true });
        const p = project(e.seg, 1);
        burst(p.x, p.y, e.color, 16, 160, 0.6);
        enemies.splice(i, 1);
        SFX.hurt();
        continue;
      }
    }

    // 蜘蛛沿邊緣朝玩家爬行
    for (let i = spiders.length - 1; i >= 0; i--) {
      const s = spiders[i];
      if (!player) break;
      const diff = ((player.seg - s.seg + CFG.segments * 1.5) % CFG.segments) - CFG.segments / 2;
      const dir = Math.sign(diff) || 1;
      s.seg = (s.seg + dir * s.speed * dt + CFG.segments) % CFG.segments;
      if (segDist(s.seg, player.seg) < 0.45 && player.invuln <= 0) {
        spiders.splice(i, 1);
        hitCore();
      }
    }

    // 檢查波次完成
    if (!betweenWaves && spawnQueue === 0 && enemies.length === 0 && spiders.length === 0) {
      betweenWaves = true;
      waveTimer = CFG.waveBreak / 1000;
      score += 200 + wave * 50;
      updateHUD();
      SFX.wave();
    }
    if (betweenWaves) {
      waveTimer -= dt;
      if (waveTimer <= 0) { wave++; spawnWave(); }
    }
  }

  function drawEnemies() {
    // 由遠到近繪製
    const sorted = enemies.slice().sort((a, b) => a.depth - b.depth);
    for (const e of sorted) drawEnemyShape(e);
    for (const s of spiders) drawSpider(s);
  }

  function drawEnemyShape(e) {
    const p = project(e.seg, e.depth);
    const size = e.size * p.scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle + Math.PI / 2);
    if (e.hitFlash > 0) ctx.globalAlpha = 0.5 + 0.5 * Math.sin(e.hitFlash * 60);
    const grad = ctx.createLinearGradient(0, -size, 0, size);
    grad.addColorStop(0, '#fff'); grad.addColorStop(0.35, e.color); grad.addColorStop(1, '#000');
    ctx.fillStyle = grad; ctx.strokeStyle = '#fff'; ctx.lineWidth = e.boss ? 2.5 : 1.2;

    ctx.beginPath();
    switch (e.shape) {
      case 'diamond':
        ctx.moveTo(0, -size); ctx.lineTo(size * 0.8, 0); ctx.lineTo(0, size); ctx.lineTo(-size * 0.8, 0); break;
      case 'triangle':
        ctx.moveTo(0, -size); ctx.lineTo(size * 0.9, size * 0.8); ctx.lineTo(-size * 0.9, size * 0.8); break;
      case 'hexagon':
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU - Math.PI / 2;
          ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
        } break;
      case 'arrow':
        ctx.moveTo(0, -size * 1.2); ctx.lineTo(size * 0.7, 0); ctx.lineTo(size * 0.35, 0);
        ctx.lineTo(size * 0.35, size); ctx.lineTo(-size * 0.35, size); ctx.lineTo(-size * 0.35, 0);
        ctx.lineTo(-size * 0.7, 0); break;
      case 'boss':
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * TAU - Math.PI / 2;
          const r = k % 2 === 0 ? size : size * 0.6;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        } break;
      default:
        ctx.arc(0, 0, size, 0, TAU);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    if (e.boss) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, size * 0.35, 0, TAU); ctx.fill();
      // 血條
      const bw = size * 2.4;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-bw / 2, -size - 12, bw, 5);
      ctx.fillStyle = '#ff5e5e'; ctx.fillRect(-bw / 2, -size - 12, bw * (e.hp / e.maxHp), 5);
    }
    ctx.restore();
  }

  function drawSpider(s) {
    const p = project(s.seg, 1);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = s.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
    // 腳
    ctx.strokeStyle = s.color; ctx.lineWidth = 2;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath(); ctx.moveTo(k * 7, 5); ctx.lineTo(k * 10, 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k * 7, -5); ctx.lineTo(k * 10, -15); ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-4, -2, 2, 0, TAU); ctx.arc(4, -2, 2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ========== 子彈 ==========
  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.depth -= CFG.bulletSpeed * dt;
      if (b.depth <= 0) { bullets.splice(i, 1); continue; }
      // 命中敵人
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (segDist(b.seg, e.seg) < 0.55 && Math.abs(b.depth - e.depth) < 0.06) {
          bullets.splice(i, 1);
          e.hp -= 1; e.hitFlash = 0.1;
          const p = project(e.seg, e.depth);
          burst(p.x, p.y, e.color, 6, 90, 0.3);
          SFX.hit();
          if (e.hp <= 0) {
            enemies.splice(j, 1);
            score += e.score; updateHUD();
            burst(p.x, p.y, e.color, e.boss ? 60 : 18, 200, 0.8);
            SFX.kill();
            if (e.boss) { shake = 0.5; flash = 0.4; }
          }
          break;
        }
      }
    }
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.depth += CFG.enemyBulletSpeed * dt;
      if (b.depth >= 1) {
        enemyBullets.splice(i, 1);
        if (player && segDist(b.seg, player.seg) < 0.5 && player.invuln <= 0) hitCore();
      }
    }
  }
  function drawBullets() {
    for (const b of bullets) {
      const p = project(b.seg, b.depth);
      ctx.fillStyle = '#5ee0ff';
      ctx.shadowColor = '#5ee0ff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.5 * p.scale + 1, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
    for (const b of enemyBullets) {
      const p = project(b.seg, b.depth);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, 5 * p.scale + 1, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function hitCore() {
    if (player.invuln > 0) return;
    core--;
    player.invuln = CFG.playerHitInvuln;
    shake = 0.35; flash = 0.5;
    SFX.hurt();
    updateHUD();
    if (core <= 0) {
      lives--;
      core = CFG.coreMax;
      if (lives <= 0) endGame();
    }
  }

  // ========== 管狀網格 ==========
  function drawTube() {
    // 深處核心光暈
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rFar * 6);
    coreGrad.addColorStop(0, 'rgba(255,94,156,0.5)');
    coreGrad.addColorStop(0.4, 'rgba(94,224,255,0.18)');
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(cx, cy, rFar * 6, 0, TAU); ctx.fill();

    const rings = 9;
    // 橫向環
    for (let r = 0; r <= rings; r++) {
      const d = r / rings;
      ctx.beginPath();
      for (let s = 0; s <= CFG.segments; s++) {
        const p = project(s % CFG.segments, d);
        if (s === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      const main = r === rings;
      ctx.strokeStyle = main ? 'rgba(255,94,156,0.75)' : `rgba(94,224,255,${0.12 + 0.25 * d})`;
      ctx.lineWidth = main ? 2.5 : 1;
      ctx.stroke();
    }
    // 縱向軌道
    for (let s = 0; s < CFG.segments; s++) {
      const p0 = project(s, 0), p1 = project(s, 1);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = `rgba(94,224,255,${0.1 + 0.12 * (s % 2)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // 中心點
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, TAU); ctx.fill();
  }

  // ========== HUD / 流程 ==========
  function updateHUD() {
    hudScore.textContent = score.toLocaleString();
    hudWave.textContent = wave;
    hudLives.textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, CFG.startLives - lives));
    hudCore.textContent = '▮'.repeat(Math.max(0, core)) + '▯'.repeat(Math.max(0, CFG.coreMax - core));
  }
  function showOverlay(title, msg, btn) {
    overlayTitle.innerHTML = title;
    overlayMsg.innerHTML = msg;
    btnStart.textContent = btn;
    overlay.classList.remove('hidden');
  }
  function startGame() {
    score = 0; wave = 1; lives = CFG.startLives; core = CFG.coreMax;
    enemies = []; bullets = []; enemyBullets = []; spiders = []; particles = [];
    betweenWaves = false; shake = 0; flash = 0;
    gameOver = false; paused = false;
    player = createPlayer();
    updateHUD();
    overlay.classList.add('hidden');
    running = true;
    spawnWave();
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
    updatePlayer(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updateParticles(dt);
    if (shake > 0) shake -= dt;
    if (flash > 0) flash -= dt;
  }
  function updateStars(dt) {
    for (const s of stars) {
      s.y += s.sp * dt;
      if (s.y > height) { s.y = -2; s.x = rand(0, width); }
    }
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 背景
    ctx.fillStyle = '#05040e';
    ctx.fillRect(0, 0, width, height);
    // 星空
    for (const s of stars) {
      ctx.globalAlpha = s.a; ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // 畫面抖動
    if (shake > 0) {
      ctx.translate(rand(-6, 6) * shake, rand(-6, 6) * shake);
    }

    drawTube();
    drawBullets();
    drawEnemies();
    drawPlayer();
    drawParticles();

    // 波次提示
    if (betweenWaves) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`波次 ${wave + 1} 即將來襲`, cx, cy - 20);
    }

    // 閃白
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.5;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }

  // ========== 輸入 ==========
  function setupInput() {
    window.addEventListener('keydown', e => {
      if (!audioUnlocked) unlockAudio();
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': keys.left = true; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': keys.right = true; e.preventDefault(); break;
        case 'Space': case 'ArrowUp': case 'KeyW': keys.fire = true; e.preventDefault(); break;
        case 'ShiftLeft': case 'ShiftRight': case 'ArrowDown': case 'KeyS':
          if (!e.repeat) keys.flip = true; e.preventDefault(); break;
        case 'KeyP': case 'Escape': togglePause(); break;
        case 'KeyM': toggleMute(); break;
      }
    }, { passive: false });
    window.addEventListener('keyup', e => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': keys.left = false; break;
        case 'ArrowRight': case 'KeyD': keys.right = false; break;
        case 'Space': case 'ArrowUp': case 'KeyW': keys.fire = false; break;
      }
    });

    // 觸控按鈕
    bindHold('btn-left', () => keys.left = true, () => keys.left = false);
    bindHold('btn-right', () => keys.right = true, () => keys.right = false);
    bindHold('btn-fire', () => keys.fire = true, () => keys.fire = false);
    document.getElementById('btn-flip').addEventListener('click', () => {
      if (!audioUnlocked) unlockAudio();
      if (running && !paused && !gameOver) flip();
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
      ? '◀ ▶ 移動 · 按住 ● 發射 · ⇄ 翻轉對側'
      : '←/→ 或 A/D 移動 · Space 發射 · Shift 翻轉 · P 暫停 · M 靜音';
    showOverlay('星軌防衛 Star Tunnel', '守住管道核心，射擊向外爬行的敵人', '開始遊戲');
    btnStart.onclick = startGame;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();