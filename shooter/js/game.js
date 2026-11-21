/**
 * Star Shooter - 原創太空射擊遊戲
 * 零外部依賴：Canvas 2D 程序繪圖 + Web Audio 即時合成
 */
(() => {
  'use strict';

  // ========== 遊戲配置 ==========
  const CFG = {
    canvasId: 'game-canvas',
    designWidth: 480,
    designHeight: 640,
    targetFPS: 60,
    player: {
      speed: 320,
      fireRate: 0.12,
      maxPower: 4,
      invincibleTime: 2,
      blinkInterval: 0.08
    },
    enemy: {
      baseSpeed: 60,
      speedPerWave: 8,
      maxSpeed: 200,
      shootChance: 0.0015,
      shootChancePerWave: 0.0003
    },
    boss: {
      hpBase: 30,
      hpPerCycle: 15,
      speed: 40,
      shootInterval: 1.2
    },
    powerup: {
      spawnChance: 0.12,
      fallSpeed: 80,
      types: ['power', 'shield', 'life']
    },
    particle: {
      maxCount: 300,
      explosionCount: 18,
      smallExplosionCount: 8
    },
    starCount: 80
  };

  // ========== 全域狀態 ==========
  let canvas, ctx, dpr;
  let width, height;
  let lastTime = 0;
  let running = false;
  let paused = false;
  let gameOver = false;

  // 遊戲資料
  let player = null;
  let enemies = [];
  let bullets = [];
  let enemyBullets = [];
  let powerups = [];
  let particles = [];
  let stars = [];

  let score = 0;
  let wave = 1;
  let waveTimer = 0;
  let waveInterval = 3000;
  let enemiesThisWave = 0;
  let enemiesKilledThisWave = 0;
  let bossActive = false;
  let boss = null;

  // 輸入
  const keys = { left: false, right: false, fire: false, pause: false, mute: false };
  const touch = { x: null, firing: false };

  // 音效
  let audioCtx = null;
  let audioUnlocked = false;
  let muted = false;

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
  const hudPower = document.getElementById('hud-power');

  // ========== 工具函式 ==========
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ========== Canvas 初始化 ==========
  function initCanvas() {
    canvas = document.getElementById(CFG.canvasId);
    ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.floor(rect.width);
    height = Math.floor(rect.height);
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
      stars.push({
        x: rand(0, width),
        y: rand(0, height),
        speed: rand(20, 120),
        size: rand(1, 2.5),
        opacity: rand(0.3, 1)
      });
    }
  }

  // ========== 音效系統 ==========
  function initAudio() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio 不支援:', e);
    }
  }

  function unlockAudio() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    audioUnlocked = true;
  }

  function playTone(freq, duration, type = 'square', volume = 0.12, startTime = 0) {
    if (!audioCtx || muted || !audioUnlocked) return;
    const now = audioCtx.currentTime + startTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playNoise(duration, volume = 0.08) {
    if (!audioCtx || muted || !audioUnlocked) return;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain).connect(audioCtx.destination);
    source.start();
  }

  // 音效定義
  const SFX = {
    shoot: () => playTone(880, 0.06, 'square', 0.08),
    shootPower: () => { playTone(880, 0.05, 'square', 0.08); playTone(1320, 0.05, 'square', 0.06); },
    enemyShoot: () => playTone(220, 0.08, 'sawtooth', 0.06),
    hit: () => playTone(440, 0.05, 'square', 0.1),
    explosion: () => { playNoise(0.15, 0.12); playTone(150, 0.15, 'sine', 0.08); },
    bossHit: () => { playTone(300, 0.08, 'square', 0.1); playNoise(0.1, 0.1); },
    powerup: () => { playTone(660, 0.08, 'sine', 0.1); playTone(990, 0.08, 'sine', 0.08); },
    shield: () => { playTone(520, 0.1, 'sine', 0.12); playTone(780, 0.1, 'sine', 0.08); },
    life: () => { playTone(880, 0.1, 'sine', 0.12); playTone(1320, 0.1, 'sine', 0.08); },
    gameOver: () => { playTone(330, 0.2, 'sine', 0.1); playTone(220, 0.3, 'sine', 0.1); },
    waveClear: () => { playTone(520, 0.1, 'sine', 0.1); playTone(780, 0.1, 'sine', 0.1); }
  };

  function toggleMute() {
    muted = !muted;
    btnMute.textContent = muted ? '取消靜音' : '靜音';
    btnMute.setAttribute('aria-pressed', muted);
  }

  // ========== 粒子系統 ==========
  function spawnParticles(x, y, color, count, speedRange, sizeRange, lifeRange, gravity = 0) {
    for (let i = 0; i < count && particles.length < CFG.particle.maxCount; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(...speedRange);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(...sizeRange),
        life: rand(...lifeRange),
        maxLife: 0,
        color,
        gravity
      });
      particles[particles.length - 1].maxLife = particles[particles.length - 1].life;
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ========== 星空背景 ==========
  function updateStars(dt) {
    for (const s of stars) {
      s.y += s.speed * dt;
      if (s.y > height) {
        s.y = -s.size;
        s.x = rand(0, width);
      }
    }
  }

  function drawStars() {
    for (const s of stars) {
      ctx.globalAlpha = s.opacity;
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  // ========== 玩家 ==========
  function createPlayer() {
    return {
      x: width / 2,
      y: height - 60,
      w: 36,
      h: 40,
      speed: CFG.player.speed,
      fireRate: CFG.player.fireRate,
      fireTimer: 0,
      power: 1,
      maxPower: CFG.player.maxPower,
      lives: 3,
      invincible: 0,
      blinking: false,
      shield: 0,
      shieldMax: 0
    };
  }

  function updatePlayer(dt) {
    if (!player) return;

    // 無敵閃爍
    if (player.invincible > 0) {
      player.invincible -= dt;
      player.blinking = Math.floor(player.invincible / CFG.player.blinkInterval) % 2 === 0;
    } else {
      player.blinking = false;
    }

    // 移動
    let dx = 0;
    if (keys.left || touch.x !== null && touch.x < player.x - 20) dx -= 1;
    if (keys.right || touch.x !== null && touch.x > player.x + 20) dx += 1;
    player.x = clamp(player.x + dx * player.speed * dt, player.w / 2, width - player.w / 2);

    // 觸控發射
    if (touch.firing) keys.fire = true;

    // 射擊
    if (player.fireTimer > 0) player.fireTimer -= dt;
    if (keys.fire && player.fireTimer <= 0) {
      playerFire();
      player.fireTimer = player.fireRate;
    }
    keys.fire = false; // 避免長按過快
    touch.firing = false;
  }

  function playerFire() {
    if (!player) return;
    const cx = player.x;
    const topY = player.y - player.h / 2 - 10;

    if (player.power === 1) {
      bullets.push(createBullet(cx, topY, 0, -550, 'player', '#4af5a8', 4, 16));
      SFX.shoot();
    } else if (player.power === 2) {
      bullets.push(createBullet(cx - 12, topY, 0, -550, 'player', '#4af5a8', 4, 16));
      bullets.push(createBullet(cx + 12, topY, 0, -550, 'player', '#4af5a8', 4, 16));
      SFX.shootPower();
    } else if (player.power === 3) {
      bullets.push(createBullet(cx, topY, 0, -550, 'player', '#4af5a8', 5, 18));
      bullets.push(createBullet(cx - 18, topY, -80, -520, 'player', '#4af5a8', 4, 14));
      bullets.push(createBullet(cx + 18, topY, 80, -520, 'player', '#4af5a8', 4, 14));
      SFX.shootPower();
    } else {
      // power 4: 雙重直射 + 散射 + 追蹤感
      bullets.push(createBullet(cx, topY, 0, -600, 'player', '#4af5a8', 6, 20));
      bullets.push(createBullet(cx - 20, topY, 0, -580, 'player', '#4af5a8', 4, 16));
      bullets.push(createBullet(cx + 20, topY, 0, -580, 'player', '#4af5a8', 4, 16));
      bullets.push(createBullet(cx - 30, topY, -120, -500, 'player', '#ffd166', 3, 12));
      bullets.push(createBullet(cx + 30, topY, 120, -500, 'player', '#ffd166', 3, 12));
      SFX.shootPower();
    }
  }

  function drawPlayer() {
    if (!player || player.blinking) return;

    ctx.save();
    ctx.translate(player.x, player.y);

    // 機身主體
    const gradient = ctx.createLinearGradient(0, -player.h/2, 0, player.h/2);
    gradient.addColorStop(0, '#4af5a8');
    gradient.addColorStop(0.5, '#2ec47a');
    gradient.addColorStop(1, '#1a8a52');

    // 機翼
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -player.h/2);
    ctx.lineTo(-player.w/2, player.h/3);
    ctx.lineTo(-player.w/3, player.h/3);
    ctx.lineTo(-player.w/4, player.h/2);
    ctx.lineTo(player.w/4, player.h/2);
    ctx.lineTo(player.w/3, player.h/3);
    ctx.lineTo(player.w/2, player.h/3);
    ctx.closePath();
    ctx.fill();

    // 機身中心
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(0, 0, player.w/4, player.h/3, 0, 0, Math.PI*2);
    ctx.fill();

    // 驅動器光暈
    const time = Date.now() * 0.005;
    const glowSize = 8 + Math.sin(time) * 3;
    const glowGrad = ctx.createRadialGradient(0, player.h/3, 0, 0, player.h/3, glowSize);
    glowGrad.addColorStop(0, 'rgba(74,245,168,0.8)');
    glowGrad.addColorStop(1, 'rgba(74,245,168,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, player.h/3, glowSize, 0, Math.PI*2);
    ctx.fill();

    // 護盾
    if (player.shield > 0) {
      ctx.strokeStyle = 'rgba(74,200,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(player.w, player.h) * 0.6, 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#4ac8ff';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(player.w, player.h) * 0.6, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ========== 子彈 ==========
  function createBullet(x, y, vx, vy, type, color, radius, length) {
    return { x, y, vx, vy, type, color, radius, length, alive: true };
  }

  function updateBullets(dt) {
    // 玩家子彈
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -b.length || b.x < -b.radius || b.x > width + b.radius) {
        bullets.splice(i, 1);
      }
    }
    // 敵人子彈
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y > height + b.length || b.x < -b.radius || b.x > width + b.radius) {
        enemyBullets.splice(i, 1);
      }
    }
  }

  function drawBullets() {
    for (const b of bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x - b.radius, b.y - b.length/2, b.radius*2, b.length, b.radius);
      ctx.fill();
      // 光暈
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(b.x - b.radius/2, b.y - b.length/2, b.radius, b.length, b.radius/2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const b of enemyBullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius/2, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ========== 敵機 ==========
  const ENEMY_TYPES = [
    { name: 'drone', w: 36, h: 30, hp: 1, score: 50, color: '#ff6b4a', color2: '#e85d3a', shape: 'triangle', speedMul: 1.2 },
    { name: 'fighter', w: 40, h: 34, hp: 2, score: 100, color: '#ff9e7d', color2: '#ff6b4a', shape: 'diamond', speedMul: 1.0 },
    { name: 'heavy', w: 50, h: 40, hp: 4, score: 200, color: '#ff4a4a', color2: '#cc3333', shape: 'hexagon', speedMul: 0.7 },
    { name: 'zigzag', w: 34, h: 28, hp: 1, score: 150, color: '#ffd166', color2: '#e8b84a', shape: 'arrow', speedMul: 1.3, zigzag: true },
    { name: 'sniper', w: 38, h: 32, hp: 2, score: 180, color: '#ff4aff', color2: '#cc33cc', shape: 'cross', speedMul: 0.5, sniper: true }
  ];

  function createEnemy(typeIdx, x, y, waveNum) {
    const t = ENEMY_TYPES[typeIdx];
    const speed = clamp(CFG.enemy.baseSpeed + waveNum * CFG.enemy.speedPerWave, 30, CFG.enemy.maxSpeed) * t.speedMul;
    return {
      x, y,
      w: t.w, h: t.h,
      hp: t.hp,
      maxHp: t.hp,
      score: t.score,
      color: t.color,
      color2: t.color2,
      shape: t.shape,
      speed,
      vx: 0,
      vy: speed,
      type: t.name,
      zigzag: t.zigzag || false,
      zigzagTime: rand(0, Math.PI*2),
      zigzagAmp: rand(40, 80),
      zigzagFreq: rand(1.5, 3),
      sniper: t.sniper || false,
      shootTimer: rand(0, 2),
      shootChance: CFG.enemy.shootChance + waveNum * CFG.enemy.shootChancePerWave,
      alive: true,
      hitFlash: 0
    };
  }

  function spawnWave() {
    const count = clamp(3 + wave * 1.5, 3, 12);
    const typesAvailable = Math.min(ENEMY_TYPES.length, 1 + Math.floor(wave / 2));
    enemiesThisWave = count;
    enemiesKilledThisWave = 0;

    for (let i = 0; i < count; i++) {
      const typeIdx = randInt(0, typesAvailable - 1);
      const x = rand(40, width - 40);
      const y = rand(-200, -50);
      const delay = i * (waveInterval / count);
      setTimeout(() => {
        if (running && !gameOver && !bossActive) {
          enemies.push(createEnemy(typeIdx, x, y, wave));
        }
      }, delay);
    }
  }

  function createBoss() {
    const hp = CFG.boss.hpBase + Math.floor((wave - 5) / 5) * CFG.boss.hpPerCycle;
    boss = {
      x: width / 2,
      y: -120,
      w: 120,
      h: 90,
      hp, maxHp: hp,
      speed: CFG.boss.speed,
      phase: 0,
      shootTimer: 0,
      shootInterval: CFG.boss.shootInterval,
      pattern: 0,
      patternTimer: 0,
      alive: true,
      hitFlash: 0,
      entering: true,
      score: 2000
    };
    bossActive = true;
  }

  function updateEnemies(dt) {
    // 普通敵機
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.y += e.vy * dt;
      e.x += e.vx * dt;

      if (e.zigzag) {
        e.zigzagTime += dt * e.zigzagFreq;
        e.vx = Math.sin(e.zigzagTime) * e.zigzagAmp * e.zigzagFreq;
      }

      if (e.sniper) {
        // 瞄準玩家
        if (player) {
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            e.vx = (dx / dist) * e.speed * 0.3;
          }
        }
      }

      // 射擊
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && Math.random() < e.shootChance * 60 * dt) {
        enemyFire(e);
        e.shootTimer = rand(0.5, 2);
      }

      // 受擊閃爍
      if (e.hitFlash > 0) e.hitFlash -= dt;

      // 移出螢幕
      if (e.y > height + e.h || e.x < -e.w || e.x > width + e.w) {
        enemies.splice(i, 1);
        continue;
      }
    }

    // 首領
    if (bossActive && boss) {
      updateBoss(dt);
    }

    // 檢查波次完成
    if (!bossActive && enemies.length === 0 && enemiesThisWave > 0 && enemiesKilledThisWave >= enemiesThisWave) {
      waveComplete();
    }
  }

  function updateBoss(dt) {
    if (boss.entering) {
      boss.y += boss.speed * dt;
      if (boss.y >= 100) {
        boss.y = 100;
        boss.entering = false;
        boss.patternTimer = 0;
      }
      return;
    }

    boss.patternTimer += dt;

    // 模式切換
    if (boss.patternTimer > 8) {
      boss.pattern = (boss.pattern + 1) % 4;
      boss.patternTimer = 0;
    }

    switch (boss.pattern) {
      case 0: // 左右移動 + 散彈
        boss.x += Math.sin(boss.patternTimer * 0.8) * boss.speed * 1.5 * dt;
        boss.x = clamp(boss.x, boss.w/2 + 20, width - boss.w/2 - 20);
        boss.shootTimer -= dt;
        if (boss.shootTimer <= 0) {
          for (let i = -2; i <= 2; i++) {
            const angle = (i * 0.3) + Math.PI/2;
            enemyFireAtAngle(boss.x, boss.y + boss.h/2, angle, 250, '#ff6b4a', 8);
          }
          boss.shootTimer = boss.shootInterval;
        }
        break;
      case 1: // 定點 + 追蹤彈
        if (player) {
          const dx = player.x - boss.x;
          const dist = Math.abs(dx);
          boss.x += Math.sign(dx) * Math.min(boss.speed * dt, dist * 0.5);
        }
        boss.shootTimer -= dt;
        if (boss.shootTimer <= 0 && player) {
          const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
          enemyFireAtAngle(boss.x, boss.y + boss.h/2, angle, 300, '#ff4aff', 10);
          boss.shootTimer = boss.shootInterval * 0.7;
        }
        break;
      case 2: // 圓形彈幕
        boss.shootTimer -= dt;
        if (boss.shootTimer <= 0) {
          const count = 12;
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + boss.patternTimer;
            enemyFireAtAngle(boss.x, boss.y + boss.h/3, angle, 200, '#ffd166', 6);
          }
          boss.shootTimer = boss.shootInterval * 1.5;
        }
        break;
      case 3: // 高速衝刺
        boss.y += boss.speed * 3 * dt;
        if (boss.y > height - 150) boss.y = height - 150;
        boss.shootTimer -= dt;
        if (boss.shootTimer <= 0) {
          enemyFireAtAngle(boss.x, boss.y + boss.h/2, Math.PI/2, 400, '#ff6b4a', 12);
          boss.shootTimer = 0.3;
        }
        break;
    }

    if (boss.hitFlash > 0) boss.hitFlash -= dt;

    // 首領死亡
    if (boss.hp <= 0) {
      bossDeath();
    }
  }

  function enemyFire(enemy) {
    if (!player) return;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    const vx = (dx / dist) * 280;
    const vy = (dy / dist) * 280;
    enemyBullets.push(createBullet(enemy.x, enemy.y + enemy.h/2, vx, vy, 'enemy', '#ff6b4a', 6, 0));
    SFX.enemyShoot();
  }

  function enemyFireAtAngle(x, y, angle, speed, color, radius) {
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    enemyBullets.push(createBullet(x, y, vx, vy, 'enemy', color, radius, 0));
    SFX.enemyShoot();
  }

  function drawEnemies() {
    for (const e of enemies) {
      drawEnemy(e);
    }
    if (bossActive && boss) {
      drawBoss();
    }
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.hitFlash > 0) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(e.hitFlash * 50);
    }

    const grad = ctx.createLinearGradient(0, -e.h/2, 0, e.h/2);
    grad.addColorStop(0, e.color);
    grad.addColorStop(1, e.color2);
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;

    switch (e.shape) {
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -e.h/2);
        ctx.lineTo(-e.w/2, e.h/2);
        ctx.lineTo(e.w/2, e.h/2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -e.h/2);
        ctx.lineTo(e.w/2, 0);
        ctx.lineTo(0, e.h/2);
        ctx.lineTo(-e.w/2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'hexagon':
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI/2;
          const r = i % 2 === 0 ? e.w/2 : e.w/3;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * e.h/e.w * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(0, -e.h/2);
        ctx.lineTo(-e.w/2, 0);
        ctx.lineTo(-e.w/4, 0);
        ctx.lineTo(-e.w/4, e.h/2);
        ctx.lineTo(e.w/4, e.h/2);
        ctx.lineTo(e.w/4, 0);
        ctx.lineTo(e.w/2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'cross':
        ctx.beginPath();
        ctx.moveTo(0, -e.h/2);
        ctx.lineTo(e.w/4, -e.h/2);
        ctx.lineTo(e.w/4, -e.h/4);
        ctx.lineTo(e.w/2, -e.h/4);
        ctx.lineTo(e.w/2, e.h/4);
        ctx.lineTo(e.w/4, e.h/4);
        ctx.lineTo(e.w/4, e.h/2);
        ctx.lineTo(-e.w/4, e.h/2);
        ctx.lineTo(-e.w/4, e.h/4);
        ctx.lineTo(-e.w/2, e.h/4);
        ctx.lineTo(-e.w/2, -e.h/4);
        ctx.lineTo(-e.w/4, -e.h/4);
        ctx.lineTo(-e.w/4, -e.h/2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
    }

    // 血條
    if (e.hp < e.maxHp) {
      const bw = e.w * 0.8;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-bw/2, -e.h/2 - 8, bw, 4);
      ctx.fillStyle = '#4af5a8';
      ctx.fillRect(-bw/2, -e.h/2 - 8, bw * (e.hp / e.maxHp), 4);
    }

    ctx.restore();
  }

  function drawBoss() {
    ctx.save();
    ctx.translate(boss.x, boss.y);
    if (boss.hitFlash > 0) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(boss.hitFlash * 50);
    }

    // 主體
    const grad = ctx.createLinearGradient(0, -boss.h/2, 0, boss.h/2);
    grad.addColorStop(0, '#ff6b4a');
    grad.addColorStop(0.5, '#cc3333');
    grad.addColorStop(1, '#880000');
    ctx.fillStyle = grad;

    // 複雜形狀
    ctx.beginPath();
    ctx.moveTo(0, -boss.h/2);
    ctx.bezierCurveTo(boss.w/2, -boss.h/3, boss.w/2, boss.h/3, 0, boss.h/2);
    ctx.bezierCurveTo(-boss.w/2, boss.h/3, -boss.w/2, -boss.h/3, 0, -boss.h/2);
    ctx.fill();

    // 核心
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, boss.w/3);
    coreGrad.addColorStop(0, '#fff');
    coreGrad.addColorStop(0.5, '#ffd166');
    coreGrad.addColorStop(1, '#ff6b4a');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, boss.w/4, 0, Math.PI*2);
    ctx.fill();

    // 砲台
    ctx.fillStyle = '#333';
    for (const tx of [-boss.w/3, 0, boss.w/3]) {
      ctx.beginPath();
      ctx.roundRect(tx - 6, boss.h/3 - 10, 12, 14, 3);
      ctx.fill();
    }

    // 血條
    const bw = boss.w * 1.2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-bw/2, -boss.h/2 - 14, bw, 8);
    const hpGrad = ctx.createLinearGradient(-bw/2, 0, bw/2, 0);
    hpGrad.addColorStop(0, '#4af5a8');
    hpGrad.addColorStop(0.5, '#ffd166');
    hpGrad.addColorStop(1, '#ff6b4a');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(-bw/2, -boss.h/2 - 14, bw * (boss.hp / boss.maxHp), 8);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-bw/2, -boss.h/2 - 14, bw, 8);

    ctx.restore();
  }

  // ========== 道具 ==========
  function createPowerup(x, y, type) {
    const colors = {
      power: { main: '#4af5a8', glow: '#2ec47a', symbol: 'P' },
      shield: { main: '#4ac8ff', glow: '#2ea8ff', symbol: 'S' },
      life: { main: '#ffd166', glow: '#e8b84a', symbol: '♥' }
    };
    const c = colors[type];
    return { x, y, type, r: 14, vy: CFG.powerup.fallSpeed, color: c.main, glow: c.glow, symbol: c.symbol, alive: true, bob: rand(0, Math.PI*2) };
  }

  function updatePowerups(dt) {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.vy * dt;
      p.bob += dt * 3;
      if (p.y > height + p.r) {
        powerups.splice(i, 1);
      }
    }
  }

  function drawPowerups() {
    for (const p of powerups) {
      ctx.save();
      ctx.translate(p.x, p.y + Math.sin(p.bob) * 4);

      // 光暈
      const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 1.5);
      glowGrad.addColorStop(0, p.glow + '80');
      glowGrad.addColorStop(1, p.glow + '00');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 1.5, 0, Math.PI*2);
      ctx.fill();

      // 本體
      const grad = ctx.createLinearGradient(-p.r, -p.r, p.r, p.r);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.5, p.color);
      grad.addColorStop(1, p.glow);
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();

      // 符號
      ctx.fillStyle = '#000';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.symbol, 0, 1);

      ctx.restore();
    }
  }

  // ========== 碰撞檢測 ==========
  function checkCollisions() {
    // 玩家子彈 vs 敵機
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (circleRectCollide(b.x, b.y, b.radius, e.x, e.y, e.w, e.h)) {
          bullets.splice(bi, 1);
          enemyHit(e, b.type === 'player' ? 1 : 2);
          break;
        }
      }
    }

    // 玩家子彈 vs 首領
    if (bossActive && boss) {
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (circleRectCollide(b.x, b.y, b.radius, boss.x, boss.y, boss.w, boss.h)) {
          bullets.splice(bi, 1);
          bossHit(1);
          break;
        }
      }
    }

    // 敵人子彈 vs 玩家
    if (player && player.invincible <= 0) {
      for (let bi = enemyBullets.length - 1; bi >= 0; bi--) {
        const b = enemyBullets[bi];
        if (circleRectCollide(b.x, b.y, b.radius, player.x, player.y, player.w * 0.6, player.h * 0.6)) {
          enemyBullets.splice(bi, 1);
          playerHit();
          break;
        }
      }
    }

    // 敵機 vs 玩家 (撞擊)
    if (player && player.invincible <= 0) {
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (rectRectCollide(player.x, player.y, player.w * 0.6, player.h * 0.6, e.x, e.y, e.w, e.h)) {
          enemyHit(e, 999); // 瞬間消滅敵機
          playerHit();
          break;
        }
      }
      if (bossActive && boss && !boss.entering) {
        if (rectRectCollide(player.x, player.y, player.w * 0.6, player.h * 0.6, boss.x, boss.y, boss.w * 0.7, boss.h * 0.7)) {
          playerHit();
        }
      }
    }

    // 道具 vs 玩家
    if (player) {
      for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        const dx = p.x - player.x;
        const dy = p.y - player.y;
        if (dx*dx + dy*dy < (p.r + 20)*(p.r + 20)) {
          collectPowerup(p);
          powerups.splice(i, 1);
        }
      }
    }
  }

  function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
    const dx = Math.abs(cx - rx);
    const dy = Math.abs(cy - ry);
    if (dx > rw/2 + cr || dy > rh/2 + cr) return false;
    if (dx <= rw/2 || dy <= rh/2) return true;
    const corner = (dx - rw/2)**2 + (dy - rh/2)**2;
    return corner <= cr*cr;
  }

  function rectRectCollide(x1, y1, w1, h1, x2, y2, w2, h2) {
    return Math.abs(x1 - x2) < (w1 + w2)/2 && Math.abs(y1 - y2) < (h1 + h2)/2;
  }

  function enemyHit(enemy, dmg) {
    enemy.hp -= dmg;
    enemy.hitFlash = 0.1;
    SFX.hit();
    if (enemy.hp <= 0) {
      enemyDestroyed(enemy);
    }
  }

  function enemyDestroyed(enemy) {
    spawnParticles(enemy.x, enemy.y, enemy.color, CFG.particle.smallExplosionCount, [60, 180], [2, 5], [0.3, 0.6], 50);
    score += enemy.score;
    updateHUD();
    enemiesKilledThisWave++;
    // 掉落道具
    if (Math.random() < CFG.powerup.spawnChance) {
      const type = CFG.powerup.types[randInt(0, CFG.powerup.types.length - 1)];
      powerups.push(createPowerup(enemy.x, enemy.y, type));
    }
  }

  function bossHit(dmg) {
    boss.hp -= dmg;
    boss.hitFlash = 0.1;
    SFX.bossHit();
    spawnParticles(boss.x, boss.y, '#ff6b4a', CFG.particle.explosionCount, [80, 200], [3, 7], [0.4, 0.8], 30);
  }

  function bossDeath() {
    spawnParticles(boss.x, boss.y, '#ff6b4a', CFG.particle.explosionCount * 3, [100, 300], [4, 10], [0.6, 1.2], 50);
    score += boss.score;
    updateHUD();
    SFX.explosion();
    bossActive = false;
    boss = null;
    // 首領必掉道具
    powerups.push(createPowerup(boss.x, boss.y, 'power'));
    powerups.push(createPowerup(boss.x, boss.y, 'shield'));
    waveComplete();
  }

  function playerHit() {
    if (player.shield > 0) {
      player.shield--;
      SFX.shield();
      spawnParticles(player.x, player.y, '#4ac8ff', CFG.particle.smallExplosionCount, [50, 120], [2, 4], [0.2, 0.4]);
      return;
    }
    player.lives--;
    player.invincible = CFG.player.invincibleTime;
    player.power = Math.max(1, player.power - 1);
    SFX.explosion();
    spawnParticles(player.x, player.y, '#ff6b4a', CFG.particle.explosionCount, [80, 200], [3, 7], [0.4, 0.8], 50);
    updateHUD();
    if (player.lives <= 0) {
      endGame();
    }
  }

  function collectPowerup(p) {
    switch (p.type) {
      case 'power':
        player.power = Math.min(player.maxPower, player.power + 1);
        SFX.powerup();
        break;
      case 'shield':
        player.shield = Math.min(3, player.shield + 1);
        SFX.shield();
        break;
      case 'life':
        player.lives = Math.min(5, player.lives + 1);
        SFX.life();
        break;
    }
    spawnParticles(p.x, p.y, p.color, CFG.particle.smallExplosionCount, [60, 150], [2, 5], [0.3, 0.5]);
    updateHUD();
  }

  // ========== 波次管理 ==========
  function waveComplete() {
    wave++;
    waveTimer = 0;
    SFX.waveClear();
    spawnParticles(width/2, height/2, '#4af5a8', CFG.particle.explosionCount, [50, 150], [3, 8], [0.5, 1]);
    if (wave % 5 === 0) {
      setTimeout(() => { if (running && !gameOver) createBoss(); }, 1500);
    } else {
      setTimeout(() => { if (running && !gameOver) spawnWave(); }, 1500);
    }
  }

  function updateHUD() {
    hudScore.textContent = score.toLocaleString();
    hudWave.textContent = wave;
    hudLives.textContent = '♥'.repeat(player.lives) + '♡'.repeat(5 - player.lives);
    hudPower.textContent = '●'.repeat(player.power) + '○'.repeat(player.maxPower - player.power);
  }

  // ========== 遊戲流程 ==========
  function startGame() {
    // 重置狀態
    score = 0;
    wave = 1;
    waveTimer = 0;
    enemies = [];
    bullets = [];
    enemyBullets = [];
    powerups = [];
    particles = [];
    bossActive = false;
    boss = null;
    gameOver = false;
    paused = false;

    player = createPlayer();
    updateHUD();

    overlay.classList.add('hidden');
    running = true;
    spawnWave();
  }

  function endGame() {
    running = false;
    gameOver = true;
    SFX.gameOver();
    showOverlay('遊戲結束', `最終分數: ${score.toLocaleString()}<br>到達波次: ${wave}`, '再玩一次');
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
    } else {
      resumeGame();
    }
  }

  function resumeGame() {
    paused = false;
    overlay.classList.add('hidden');
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function showOverlay(title, msg, btnText) {
    overlayTitle.innerHTML = title;
    overlayMsg.innerHTML = msg;
    btnStart.textContent = btnText;
    overlay.classList.remove('hidden');
  }

  // ========== 主迴圈 ==========
  function gameLoop(timestamp) {
    if (!running) return;

    const dt = Math.min((timestamp - lastTime) / 1000, 1/30);
    lastTime = timestamp;

    if (!paused) {
      update(dt);
    }
    draw();

    requestAnimationFrame(gameLoop);
  }

  function update(dt) {
    updateStars(dt);
    updatePlayer(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updatePowerups(dt);
    updateParticles(dt);
    checkCollisions();
  }

  function draw() {
    // 清除
    ctx.fillStyle = '#050310';
    ctx.fillRect(0, 0, width, height);

    // 星空
    drawStars();

    // 遊戲物件
    drawEnemies();
    drawBullets();
    drawPowerups();
    drawPlayer();
    drawParticles();

    // 暫停遮罩
    if (paused && !gameOver) {
      ctx.fillStyle = 'rgba(13,10,26,0.7)';
      ctx.fillRect(0, 0, width, height);
    }
  }

  // ========== 輸入處理 ==========
  function setupInput() {
    // 鍵盤
    window.addEventListener('keydown', e => {
      if (!audioUnlocked) unlockAudio();
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': keys.left = true; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': keys.right = true; e.preventDefault(); break;
        case 'Space': case 'ArrowUp': case 'KeyW': keys.fire = true; e.preventDefault(); break;
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

    // 觸控
    const canvasWrap = document.querySelector('.canvas-wrap');
    canvasWrap.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasWrap.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasWrap.addEventListener('touchend', handleTouchEnd);

    // 滑鼠 (桌機也可拖曳)
    canvasWrap.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // 按鈕
    btnStart.addEventListener('click', () => {
      if (!audioUnlocked) unlockAudio();
      if (gameOver || !running) startGame();
      else if (paused) resumeGame();
    });
    btnMute.addEventListener('click', toggleMute);

    // 頁面可見性
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && running && !paused && !gameOver) togglePause();
    });
  }

  function handleTouchStart(e) {
    if (!audioUnlocked) unlockAudio();
    if (!running || gameOver || paused) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touch.x = (touch.clientX - rect.left) * (width / rect.width);
    touch.firing = true;
    e.preventDefault();
  }

  function handleTouchMove(e) {
    if (!running || gameOver || paused) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touch.x = (touch.clientX - rect.left) * (width / rect.width);
    e.preventDefault();
  }

  function handleTouchEnd(e) {
    touch.x = null;
    touch.firing = false;
  }

  let mouseDown = false;
  function handleMouseDown(e) {
    if (!audioUnlocked) unlockAudio();
    if (!running || gameOver || paused) return;
    mouseDown = true;
    const rect = canvas.getBoundingClientRect();
    touch.x = (e.clientX - rect.left) * (width / rect.width);
    touch.firing = true;
  }

  function handleMouseMove(e) {
    if (!mouseDown) return;
    const rect = canvas.getBoundingClientRect();
    touch.x = (e.clientX - rect.left) * (width / rect.width);
  }

  function handleMouseUp() {
    mouseDown = false;
    touch.x = null;
    touch.firing = false;
  }

  // ========== 初始化 ==========
  function init() {
    initCanvas();
    initAudio();
    setupInput();

    // 顯示操作提示
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    controlsHint.innerHTML = isMobile
      ? '滑動移動戰機 · 點擊畫面發射 · 雙指或暫停鈕暫停'
      : '←/→ 或 A/D 移動 · Space/W/↑ 發射 · P/Esc 暫停 · M 靜音';

    // 顯示開始畫面
    showOverlay('星際射手 Star Shooter', '操控戰機穿越敵群波次，收集強化道具，擊敗首領', '開始遊戲');
    btnStart.onclick = startGame;
  }

  // 啟動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();