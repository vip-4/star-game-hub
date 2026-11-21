/**
 * Star Asteroids - 原創小行星射擊遊戲
 * 零外部依賴：Canvas 2D + 慣性物理 + Web Audio 即時合成
 */
(() => {
  'use strict';

  // ========== 配置 ==========
  const CFG = {
    canvasId: 'game-canvas',
    ship: {
      radius: 14,
      rotSpeed: 4.2,        // rad/s
      thrust: 320,          // px/s²
      maxSpeed: 420,
      friction: 0.99,       // 每幀阻尼
      fireRate: 0.16,
      bulletSpeed: 560,
      bulletLife: 1.1,
      invulnTime: 2.4
    },
    asteroid: {
      speeds: [40, 70, 110, 160],
      sizes: [52, 34, 20, 12],   // 等級 0(大)~3(小)
      scores: [20, 50, 100, 200],
      hp: [3, 2, 1, 1]
    },
    ufo: {
      interval: [18, 30],   // 生成間隔秒
      speed: 130,
      fireInterval: [1.4, 2.4],
      score: 500,
      radius: 18
    },
    startLives: 3,
    waveDelay: 1.8,
    starCount: 90
  };

  // ========== 狀態 ==========
  let canvas, ctx, width, height, dpr;
  let lastTime = 0, running = false, paused = false, gameOver = false;

  let ship = null;
  let bullets = [], asteroids = [], ufos = [], ufoBullets = [], particles = [], stars = [];

  let score = 0, wave = 1, lives = CFG.startLives, best = 0;
  let ufoTimer = 0, waveTimer = 0, betweenWaves = false, shake = 0;

  const keys = { left: false, right: false, thrust: false, fire: false };
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
  const hudBest = document.getElementById('hud-best');

  // ========== 工具 ==========
  const rand = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;

  try { best = parseInt(localStorage.getItem('star-asteroids-best') || '0', 10) || 0; }
  catch (e) { best = 0; }

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
      stars.push({ x: rand(0, width), y: rand(0, height), s: rand(1, 2.4), a: rand(0.15, 0.85), tw: rand(0.5, 2) });
    }
  }
  function wrap(o, pad = 0) {
    if (o.x < -pad) o.x = width + pad;
    if (o.x > width + pad) o.x = -pad;
    if (o.y < -pad) o.y = height + pad;
    if (o.y > height + pad) o.y = -pad;
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
  function tone(freq, dur, type = 'square', vol = 0.1, slideTo = null) {
    if (!audioCtx || muted || !audioUnlocked) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
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
    const src = audioCtx.createBufferSource();
    const g = audioCtx.createGain();
    src.buffer = buf; g.gain.value = vol;
    src.connect(g).connect(audioCtx.destination);
    src.start();
  }
  const SFX = {
    shoot: () => tone(880, 0.08, 'square', 0.08, 300),
    thrust: () => tone(90, 0.12, 'sawtooth', 0.05, 60),
    hit: () => { noise(0.15, 0.1); tone(160, 0.15, 'sine', 0.08, 60); },
    bigHit: () => { noise(0.25, 0.14); tone(120, 0.25, 'sine', 0.1, 40); },
    ufo: () => tone(440, 0.3, 'sine', 0.06, 220),
    ufoShoot: () => tone(620, 0.12, 'sawtooth', 0.07, 200),
    death: () => { noise(0.4, 0.14); tone(300, 0.5, 'sine', 0.12, 40); },
    wave: () => { tone(523, 0.1, 'sine', 0.09); tone(784, 0.15, 'sine', 0.08); }
  };
  function toggleMute() {
    muted = !muted;
    btnMute.textContent = muted ? '取消靜音' : '靜音';
    btnMute.setAttribute('aria-pressed', muted);
  }

  // ========== 粒子 ==========
  function burst(x, y, color, count, speed, life, sizeRange = [2, 5]) {
    for (let i = 0; i < count && particles.length < 400; i++) {
      const a = rand(0, TAU), s = rand(speed * 0.2, speed);
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
      p.vx *= 0.98; p.vy *= 0.98;
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

  // ========== 飛船 ==========
  function createShip() {
    return {
      x: width / 2, y: height / 2,
      vx: 0, vy: 0,
      angle: -Math.PI / 2,
      radius: CFG.ship.radius,
      fireTimer: 0,
      invuln: CFG.ship.invulnTime,
      thrusting: false
    };
  }
  function updateShip(dt) {
    if (!ship) return;
    const S = CFG.ship;
    if (keys.left) ship.angle -= S.rotSpeed * dt;
    if (keys.right) ship.angle += S.rotSpeed * dt;

    ship.thrusting = keys.thrust;
    if (keys.thrust) {
      ship.vx += Math.cos(ship.angle) * S.thrust * dt;
      ship.vy += Math.sin(ship.angle) * S.thrust * dt;
      // 尾焰粒子
      if (Math.random() < 0.7) {
        const bx = ship.x - Math.cos(ship.angle) * ship.radius;
        const by = ship.y - Math.sin(ship.angle) * ship.radius;
        particles.push({
          x: bx + rand(-3, 3), y: by + rand(-3, 3),
          vx: -Math.cos(ship.angle) * rand(60, 140) + rand(-20, 20),
          vy: -Math.sin(ship.angle) * rand(60, 140) + rand(-20, 20),
          size: rand(1.5, 3.5), life: rand(0.15, 0.35), max: 0.35, color: '#ffb84a'
        });
      }
      if (Math.random() < 0.15) SFX.thrust();
    }

    // 阻尼與限速
    ship.vx *= S.friction; ship.vy *= S.friction;
    const sp = Math.hypot(ship.vx, ship.vy);
    if (sp > S.maxSpeed) {
      ship.vx = (ship.vx / sp) * S.maxSpeed;
      ship.vy = (ship.vy / sp) * S.maxSpeed;
    }
    ship.x += ship.vx * dt; ship.y += ship.vy * dt;
    wrap(ship, ship.radius);

    if (ship.invuln > 0) ship.invuln -= dt;

    if (ship.fireTimer > 0) ship.fireTimer -= dt;
    if (keys.fire && ship.fireTimer <= 0) {
      fireBullet();
      ship.fireTimer = S.fireRate;
    }
  }
  function fireBullet() {
    const S = CFG.ship;
    const nx = Math.cos(ship.angle), ny = Math.sin(ship.angle);
    bullets.push({
      x: ship.x + nx * ship.radius,
      y: ship.y + ny * ship.radius,
      vx: ship.vx + nx * S.bulletSpeed,
      vy: ship.vy + ny * S.bulletSpeed,
      life: S.bulletLife
    });
    // 後座力
    ship.vx -= nx * 12; ship.vy -= ny * 12;
    SFX.shoot();
  }
  function drawShip() {
    if (!ship) return;
    if (ship.invuln > 0 && Math.floor(ship.invuln * 10) % 2 === 0) return;

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle + Math.PI / 2);
    ctx.strokeStyle = '#4ae0c0';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#4ae0c0';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -ship.radius);
    ctx.lineTo(ship.radius * 0.8, ship.radius * 0.85);
    ctx.lineTo(0, ship.radius * 0.45);
    ctx.lineTo(-ship.radius * 0.8, ship.radius * 0.85);
    ctx.closePath();
    ctx.stroke();
    // 駕駛艙
    ctx.fillStyle = 'rgba(74,224,192,0.3)';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ========== 小行星 ==========
  function createAsteroid(x, y, level, vx = null, vy = null) {
    const size = CFG.asteroid.sizes[level] || 12;
    const speed = CFG.asteroid.speeds[level] || 60;
    const a = rand(0, TAU);
    // 生成不規則多邊形頂點
    const verts = [];
    const n = Math.floor(rand(8, 12));
    for (let i = 0; i < n; i++) {
      verts.push(rand(0.7, 1.15));
    }
    return {
      x, y,
      vx: vx !== null ? vx : Math.cos(a) * speed * rand(0.7, 1.3),
      vy: vy !== null ? vy : Math.sin(a) * speed * rand(0.7, 1.3),
      angle: rand(0, TAU),
      spin: rand(-1.5, 1.5),
      level,
      radius: size,
      hp: CFG.asteroid.hp[level] || 1,
      verts,
      hitFlash: 0
    };
  }
  function spawnWave() {
    betweenWaves = false;
    const count = Math.min(3 + wave, 11);
    for (let i = 0; i < count; i++) {
      let x, y, tries = 0;
      do {
        x = rand(0, width); y = rand(0, height);
        tries++;
      } while (ship && Math.hypot(x - ship.x, y - ship.y) < 140 && tries < 20);
      asteroids.push(createAsteroid(x, y, 0));
    }
    ufoTimer = rand(CFG.ufo.interval[0], CFG.ufo.interval[1]);
    updateHUD();
    SFX.wave();
  }
  function updateAsteroids(dt) {
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.x += a.vx * dt; a.y += a.vy * dt;
      a.angle += a.spin * dt;
      wrap(a, a.radius);
      if (a.hitFlash > 0) a.hitFlash -= dt;
    }
    if (!betweenWaves && asteroids.length === 0 && ufos.length === 0) {
      betweenWaves = true;
      waveTimer = CFG.waveDelay;
      score += 100 * wave;
      updateHUD();
      SFX.wave();
    }
    if (betweenWaves) {
      waveTimer -= dt;
      if (waveTimer <= 0) { wave++; spawnWave(); }
    }
  }
  function drawAsteroids() {
    for (const a of asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.strokeStyle = a.hitFlash > 0 ? '#fff' : '#b8c2d9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const n = a.verts.length;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU;
        const r = a.radius * a.verts[i];
        const px = Math.cos(ang) * r, py = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      // 表面紋理（小坑）
      ctx.fillStyle = 'rgba(184,194,217,0.25)';
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * TAU + a.angle;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * a.radius * 0.4, Math.sin(ang) * a.radius * 0.4, a.radius * 0.12, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  function splitAsteroid(index) {
    const a = asteroids[index];
    asteroids.splice(index, 1);
    score += CFG.asteroid.scores[a.level] || 20;
    updateHUD();
    burst(a.x, a.y, '#d8e0f0', 12 + a.level * 4, 160, 0.6, [2, 5]);
    if (a.level < 3) {
      // 分裂成 2 個更小的小行星
      for (let k = 0; k < 2; k++) {
        const ang = a.angle + (k === 0 ? 0.6 : -0.6);
        const speed = Math.hypot(a.vx, a.vy) * 1.35;
        asteroids.push(createAsteroid(
          a.x + Math.cos(ang) * 8, a.y + Math.sin(ang) * 8,
          a.level + 1,
          Math.cos(ang) * speed + a.vx * 0.3,
          Math.sin(ang) * speed + a.vy * 0.3
        ));
      }
      SFX.hit();
    } else {
      SFX.bigHit();
    }
  }

  // ========== 幽浮 ==========
  function spawnUFO() {
    const fromLeft = Math.random() < 0.5;
    const y = rand(height * 0.12, height * 0.88);
    ufos.push({
      x: fromLeft ? -CFG.ufo.radius : width + CFG.ufo.radius,
      y,
      vx: fromLeft ? CFG.ufo.speed : -CFG.ufo.speed,
      vy: rand(-20, 20),
      radius: CFG.ufo.radius,
      fireTimer: rand(CFG.ufo.fireInterval[0], CFG.ufo.fireInterval[1])
    });
    SFX.ufo();
  }
  function updateUFOs(dt) {
    ufoTimer -= dt;
    if (ufoTimer <= 0 && ufos.length === 0) {
      spawnUFO();
      ufoTimer = rand(CFG.ufo.interval[0], CFG.ufo.interval[1]);
    }
    for (let i = ufos.length - 1; i >= 0; i--) {
      const u = ufos[i];
      u.x += u.vx * dt; u.y += u.vy * dt;
      // 來回切換垂直方向
      if (u.y < height * 0.1) u.vy = Math.abs(u.vy);
      if (u.y > height * 0.9) u.vy = -Math.abs(u.vy);

      u.fireTimer -= dt;
      if (u.fireTimer <= 0 && ship) {
        const ang = Math.atan2(ship.y - u.y, ship.x - u.x) + rand(-0.2, 0.2);
        ufoBullets.push({
          x: u.x, y: u.y,
          vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260,
          life: 2.4
        });
        u.fireTimer = rand(CFG.ufo.fireInterval[0], CFG.ufo.fireInterval[1]);
        SFX.ufoShoot();
      }
      if (u.x < -60 || u.x > width + 60) ufos.splice(i, 1);
    }
  }
  function drawUFOs() {
    for (const u of ufos) {
      ctx.save();
      ctx.translate(u.x, u.y);
      ctx.strokeStyle = '#ff6b9c';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff6b9c'; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.ellipse(0, 0, u.radius, u.radius * 0.45, 0, 0, TAU);
      ctx.moveTo(-u.radius * 0.5, 0);
      ctx.lineTo(-u.radius * 0.3, -u.radius * 0.55);
      ctx.lineTo(u.radius * 0.3, -u.radius * 0.55);
      ctx.lineTo(u.radius * 0.5, 0);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
  function destroyUFO(index) {
    const u = ufos[index];
    ufos.splice(index, 1);
    score += CFG.ufo.score;
    updateHUD();
    burst(u.x, u.y, '#ff6b9c', 24, 200, 0.7, [2, 6]);
    SFX.bigHit();
  }

  // ========== 子彈 ==========
  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      wrap(b, 2);
      if (b.life <= 0) { bullets.splice(i, 1); continue; }

      let consumed = false;
      // vs 小行星
      for (let j = asteroids.length - 1; j >= 0; j--) {
        const a = asteroids[j];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.radius) {
          bullets.splice(i, 1);
          a.hp -= 1;
          a.hitFlash = 0.08;
          burst(b.x, b.y, '#fff', 5, 90, 0.25, [1.5, 3]);
          if (a.hp <= 0) splitAsteroid(j);
          else SFX.hit();
          consumed = true;
          break;
        }
      }
      if (consumed) continue;
      // vs 幽浮
      for (let j = ufos.length - 1; j >= 0; j--) {
        const u = ufos[j];
        if (Math.hypot(b.x - u.x, b.y - u.y) < u.radius) {
          bullets.splice(i, 1);
          destroyUFO(j);
          break;
        }
      }
    }

    for (let i = ufoBullets.length - 1; i >= 0; i--) {
      const b = ufoBullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      wrap(b, 2);
      if (b.life <= 0) { ufoBullets.splice(i, 1); continue; }
      if (ship && ship.invuln <= 0 && Math.hypot(b.x - ship.x, b.y - ship.y) < ship.radius) {
        ufoBullets.splice(i, 1);
        killShip();
      }
    }
  }
  function drawBullets() {
    ctx.fillStyle = '#4ae0c0';
    ctx.shadowColor = '#4ae0c0'; ctx.shadowBlur = 6;
    for (const b of bullets) {
      ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, TAU); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff6b9c';
    ctx.shadowColor = '#ff6b9c'; ctx.shadowBlur = 6;
    for (const b of ufoBullets) {
      ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, TAU); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // ========== 碰撞（飛船） ==========
  function checkShipCollision() {
    if (!ship || ship.invuln > 0) return;
    for (const a of asteroids) {
      if (Math.hypot(ship.x - a.x, ship.y - a.y) < ship.radius + a.radius * 0.8) {
        killShip();
        return;
      }
    }
    for (const u of ufos) {
      if (Math.hypot(ship.x - u.x, ship.y - u.y) < ship.radius + u.radius) {
        killShip();
        return;
      }
    }
  }
  function killShip() {
    burst(ship.x, ship.y, '#4ae0c0', 30, 240, 0.9, [2, 6]);
    SFX.death();
    shake = 0.4;
    lives--;
    updateHUD();
    if (lives <= 0) {
      endGame();
    } else {
      ship = createShip();
    }
  }

  // ========== HUD / 流程 ==========
  function updateHUD() {
    hudScore.textContent = score.toLocaleString();
    hudWave.textContent = wave;
    hudLives.textContent = '▲'.repeat(Math.max(0, lives)) + '△'.repeat(Math.max(0, CFG.startLives - lives));
    hudBest.textContent = Math.max(best, score).toLocaleString();
  }
  function saveBest() {
    if (score > best) {
      best = score;
      try { localStorage.setItem('star-asteroids-best', String(best)); } catch (e) {}
    }
  }
  function showOverlay(title, msg, btn) {
    overlayTitle.innerHTML = title;
    overlayMsg.innerHTML = msg;
    btnStart.textContent = btn;
    overlay.classList.remove('hidden');
  }
  function startGame() {
    score = 0; wave = 1; lives = CFG.startLives;
    bullets = []; asteroids = []; ufos = []; ufoBullets = []; particles = [];
    betweenWaves = false; shake = 0;
    gameOver = false; paused = false;
    ship = createShip();
    updateHUD();
    overlay.classList.add('hidden');
    running = true;
    spawnWave();
  }
  function endGame() {
    running = false; gameOver = true;
    saveBest();
    updateHUD();
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
    updateShip(dt);
    updateBullets(dt);
    updateAsteroids(dt);
    updateUFOs(dt);
    updateParticles(dt);
    checkShipCollision();
    if (shake > 0) shake -= dt;
  }
  function updateStars(dt) {
    for (const s of stars) s.tw += dt;
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05060d';
    ctx.fillRect(0, 0, width, height);

    // 星空
    for (const s of stars) {
      ctx.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(s.tw));
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    if (shake > 0) ctx.translate(rand(-5, 5) * shake, rand(-5, 5) * shake);

    drawAsteroids();
    drawUFOs();
    drawBullets();
    drawShip();
    drawParticles();

    if (betweenWaves) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`關卡 ${wave + 1} 即將開始`, width / 2, height / 2);
    }
  }

  // ========== 輸入 ==========
  function setupInput() {
    window.addEventListener('keydown', e => {
      if (!audioUnlocked) unlockAudio();
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': keys.left = true; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': keys.right = true; e.preventDefault(); break;
        case 'ArrowUp': case 'KeyW': keys.thrust = true; e.preventDefault(); break;
        case 'Space': keys.fire = true; e.preventDefault(); break;
        case 'KeyP': case 'Escape': togglePause(); break;
        case 'KeyM': toggleMute(); break;
      }
    }, { passive: false });
    window.addEventListener('keyup', e => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': keys.left = false; break;
        case 'ArrowRight': case 'KeyD': keys.right = false; break;
        case 'ArrowUp': case 'KeyW': keys.thrust = false; break;
        case 'Space': keys.fire = false; break;
      }
    });

    bindHold('btn-left', () => keys.left = true, () => keys.left = false);
    bindHold('btn-right', () => keys.right = true, () => keys.right = false);
    bindHold('btn-thrust', () => keys.thrust = true, () => keys.thrust = false);
    bindHold('btn-fire', () => keys.fire = true, () => keys.fire = false);

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
      ? '↺ ↻ 旋轉 · ▲ 推進 · ● 發射'
      : '←/→ 或 A/D 旋轉 · ↑/W 推進 · Space 發射 · P 暫停 · M 靜音';
    showOverlay('星塵危機 Star Asteroids', '擊碎所有小行星，小心分裂的碎片與幽浮', '開始遊戲');
    btnStart.onclick = startGame;
    updateHUD();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();