/* ============================================================
   АНИМЕ-БУНКО — particles.js (финальная версия)
   20 пресетов фоновой анимации + выключено.
   API: ArchiveParticles.apply(settings). Ползунки плотности,
   скорости и размера применяются плавно, без пересоздания.
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('fx-canvas');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) { window.ArchiveParticles = { apply() {} }; return; }

  /* ---------- Описания пресетов ---------- */
  const DEFS = {
    sakura:         { shape: 'petal',     mode: 'fall',   colors: ['#ffb7d5', '#ff9ec6', '#ffc9e0', '#ff8fb8'], vy: [0.55, 1.4], spin: 0.02, sway: 1.0 },
    'sakura-white': { shape: 'petal',     mode: 'fall',   colors: ['#fdfbff', '#f3ecf9', '#ffffff', '#efe6f4'], vy: [0.5, 1.2],  spin: 0.018, sway: 0.9 },
    'roses-red':    { shape: 'petal',     mode: 'fall',   colors: ['#e0244a', '#c81e3e', '#ff4d6d', '#a31630'], vy: [0.7, 1.6],  spin: 0.026, sway: 0.8 },
    'petals-white': { shape: 'petal',     mode: 'fall',   colors: ['#f5f0f5', '#ffffff', '#ece4ee'],             vy: [0.5, 1.2],  spin: 0.02,  sway: 1.0 },
    'petals-yellow':{ shape: 'petal',     mode: 'fall',   colors: ['#ffd44d', '#ffe38a', '#f7c948'],             vy: [0.6, 1.4],  spin: 0.02,  sway: 1.0 },
    snow:           { shape: 'circle',    mode: 'fall',   colors: ['#ffffff', '#eaf6ff', '#f0f8ff'],             vy: [0.35, 1.1], spin: 0,     sway: 0.7 },
    rain:           { shape: 'line',      mode: 'rain',   colors: ['#7fb2ff', '#9cc3ff', '#6ba3f5'],             vy: [13, 20],    wind: 2.4 },
    drizzle:        { shape: 'line',      mode: 'rain',   colors: ['#a9c8ff', '#c2d7ff', '#8fb3ea'],             vy: [3.5, 6.5],  wind: 0.9 },
    leaves:         { shape: 'leaf',      mode: 'fall',   colors: ['#e8823a', '#d9542b', '#c9a227', '#b34a1f', '#e0a13e'], vy: [0.6, 1.5], spin: 0.03, sway: 1.2 },
    fireflies:      { shape: 'circle',    mode: 'drift',  colors: ['#ffe97a', '#fff3b0', '#e8d16a'],             glow: true, twinkle: 0.06 },
    'stars-fall':   { shape: 'meteor',    mode: 'meteor', colors: ['#fff3c9', '#ffffff', '#ffe9a8'],             glow: true },
    stardust:       { shape: 'circle',    mode: 'drift',  colors: ['#cdb4ff', '#e4d6ff', '#b39dff', '#ffe6f7'],  glow: true, twinkle: 0.09, tiny: true },
    bubbles:        { shape: 'bubble',    mode: 'rise',   colors: ['#9adcff', '#c3ecff', '#8fd0f5'],             vy: [0.5, 1.4] },
    confetti:       { shape: 'rect',      mode: 'fall',   colors: ['#ff7ab8', '#7ad0ff', '#ffd44d', '#7ee39a', '#c39dff', '#ff9d6b'], vy: [1.0, 2.2], spin: 0.09, sway: 0.5 },
    feathers:       { shape: 'feather',   mode: 'fall',   colors: ['#f5efe3', '#efe6d6', '#fbf8f0'],             vy: [0.35, 0.9], spin: 0.012, sway: 1.4 },
    hearts:         { shape: 'heart',     mode: 'fall',   colors: ['#ff5d7d', '#ff7a99', '#e8466a'],             vy: [0.5, 1.2],  spin: 0.015, sway: 0.9 },
    butterflies:    { shape: 'butterfly', mode: 'fall',   colors: ['#7ee3c9', '#9fd8ff', '#d8b2ff', '#ffd9a8'],  vy: [0.4, 1.0],  spin: 0.01, sway: 1.6 },
    clover:         { shape: 'clover',    mode: 'fall',   colors: ['#4ade80', '#2fbf68', '#6ee7a0'],             vy: [0.6, 1.3],  spin: 0.025, sway: 1.0 },
    sparks:         { shape: 'spark',     mode: 'burst',  colors: ['#ffb84d', '#ffd97a', '#ff7a5c', '#ffe9b0', '#ff5d7d'], glow: true },
    'petals-night': { shape: 'petal',     mode: 'fall',   colors: ['#6f8fff', '#8ba3ff', '#5a76e8', '#a8bcff'],  vy: [0.5, 1.3],  spin: 0.02, sway: 1.0, glow: true },
  };

  /* ---------- Внутреннее состояние ---------- */
  let cfg = null;
  let presetKey = 'none';
  let opts = { density: 40, speed: 1, size: 1 };
  let theme = 'dark';
  let parts = [];
  let burstTimer = 0;
  let rafId = null;
  let W = 0, H = 0, DPR = 1;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];

  /* ---------- Цвет: лёгкое притемнение для светлой темы ---------- */
  function mix(hex, hex2, k) {
    const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const [r1, g1, b1] = p(hex), [r2, g2, b2] = p(hex2);
    const f = v => Math.round(v[0] + (v[1] - v[0]) * k);
    return `rgb(${f([r1, r2])},${f([g1, g2])},${f([b1, b2])})`;
  }
  const tone = c => (theme === 'light' ? mix(c, '#4a4458', 0.22) : c);

  /* ---------- Размеры холста ---------- */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', () => { resize(); if (cfg) adjustCount(); });

  function targetCount() {
    const area = Math.max(0.4, (W * H) / (1440 * 900));
    let n = Math.round(opts.density * area);
    if (cfg?.mode === 'meteor') n = Math.max(2, Math.round(n / 6));
    return Math.max(2, Math.min(220, n));
  }

  /* ---------- Создание частицы ---------- */
  function spawn(anywhere) {
    const color = pick(cfg.colors);
    const base = { color, size: rand(0.7, 1.35) };

    switch (cfg.mode) {
      case 'rain':
        return { ...base, x: rand(-40, W + 40), y: anywhere ? rand(0, H) : -30,
                 vy: rand(cfg.vy[0], cfg.vy[1]), vx: (cfg.wind || 1) * rand(0.6, 1) };
      case 'rise':
        return { ...base, x: rand(0, W), y: anywhere ? rand(0, H) : H + 20,
                 vy: rand(cfg.vy[0], cfg.vy[1]), phase: rand(0, Math.PI * 2), amp: rand(0.2, 0.9) };
      case 'drift':
        return { ...base, size: cfg.tiny ? rand(0.35, 0.9) : rand(0.8, 1.4),
                 x: rand(0, W), y: anywhere ? rand(0, H) : -10,
                 seed: rand(0, 100), seed2: rand(0, 100), ph: rand(0, Math.PI * 2) };
      case 'meteor':
        return { ...base, x: rand(-0.1 * W, W), y: -20,
                 vx: rand(2.5, 5.5), vy: rand(3, 6), len: rand(60, 140) };
      case 'burst':
        return null;               // искры рождаются пакетами (spawnBurst)
      default: // fall
        return { ...base, x: rand(0, W), y: anywhere ? rand(0, H) : -30,
                 vy: rand(cfg.vy[0], cfg.vy[1]),
                 phase: rand(0, Math.PI * 2), amp: rand(0.3, 1.1) * (cfg.sway || 1),
                 angle: rand(0, Math.PI * 2), spin: cfg.spin * rand(0.4, 1.6) };
    }
  }

  /* ---------- Пакет искр (фейерверк) ---------- */
  function spawnBurst() {
    const cx = rand(W * 0.1, W * 0.9), cy = rand(H * 0.08, H * 0.55);
    const n = Math.round(10 + opts.density / 6);
    const color = pick(cfg.colors);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + rand(-0.1, 0.1);
      const v = rand(0.8, 2.6);
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                   life: 1, decay: rand(0.008, 0.02), size: rand(0.6, 1.4),
                   color: Math.random() < 0.75 ? color : pick(cfg.colors) });
    }
  }

  function rebuild() {
    parts = [];
    const n = targetCount();
    for (let i = 0; i < n; i++) {
      const p = spawn(true);
      if (p) parts.push(p);   // ФИКС: burst-пресет отдаёт null — не пушим его
    }
  }

  // Плавная подстройка количества при движении ползунка плотности
  function adjustCount() {
    if (cfg.mode === 'burst') return;
    const n = targetCount();
    while (parts.length < n) parts.push(spawn(false));
    if (parts.length > n) parts.length = n;
  }

  /* ---------- Обновление ---------- */
  function update() {
    const spd = opts.speed;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      switch (cfg.mode) {
        case 'fall':
          p.phase += 0.021 * spd;
          p.x += Math.sin(p.phase) * p.amp * spd;
          p.y += p.vy * spd;
          p.angle += p.spin * spd;
          if (p.y > H + 40 || p.x < -60 || p.x > W + 60) parts[i] = spawn(false);
          break;
        case 'rain':
          p.x += p.vx * spd;
          p.y += p.vy * spd;
          if (p.y > H + 30) parts[i] = spawn(false);
          break;
        case 'rise':
          p.phase += 0.02 * spd;
          p.x += Math.sin(p.phase) * p.amp * spd;
          p.y -= p.vy * spd;
          if (p.y < -30) parts[i] = spawn(false);
          break;
        case 'drift':
          p.ph += 0.016 * spd;
          p.x += Math.sin(p.ph + p.seed * 0.1) * 0.5 * spd;
          p.y += (Math.sin(p.ph * 0.7 + p.seed2 * 0.13) * 0.3 + 0.16) * spd;
          if (p.y > H + 20 || p.x < -20 || p.x > W + 20) parts[i] = spawn(false);
          break;
        case 'meteor':
          p.x += p.vx * spd;
          p.y += p.vy * spd;
          if (p.y > H + 30 || p.x > W + 60) parts[i] = spawn(false);
          break;
        case 'burst':
          p.x += p.vx * spd;
          p.y += p.vy * spd;
          p.vy += 0.028 * spd;
          p.vx *= 0.985;
          p.life -= p.decay * spd;
          if (p.life <= 0) parts.splice(i, 1);
          break;
      }
    }
    if (cfg.mode === 'burst') {
      burstTimer -= spd;
      const maxSparks = targetCount() * 3;
      if (burstTimer <= 0 && parts.length < maxSparks) {
        spawnBurst();
        burstTimer = rand(30, 90);
      }
    } else {
      adjustCount();
    }
  }

  /* ---------- Фигуры ---------- */
  function drawPetal(s) {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.95, -s * 0.7, s * 0.85, s * 0.45, 0, s);
    ctx.bezierCurveTo(-s * 0.85, s * 0.45, -s * 0.95, -s * 0.7, 0, -s);
    ctx.fill();
  }
  function drawLeaf(s, color) {
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // прожилка тем же цветом с прозрачностью
    ctx.globalAlpha *= 0.3;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, 0);
    ctx.lineTo(s * 0.8, 0);
    ctx.stroke();
  }
  function drawHeart(s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.4);
    ctx.bezierCurveTo(s, -s * 0.3, s * 0.55, -s, 0, -s * 0.4);
    ctx.bezierCurveTo(-s * 0.55, -s, -s, -s * 0.3, 0, s * 0.4);
    ctx.fill();
  }
  function drawFeather(s) {
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.45, s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha *= 0.3;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.85);
    ctx.lineTo(0, s * 0.9);
    ctx.stroke();
  }
  function drawButterfly(p, s) {
    const flap = 0.45 + 0.55 * Math.abs(Math.sin(p.phase * 6));
    ctx.scale(flap, 1);
    ctx.beginPath();
    ctx.ellipse(-s * 0.6, -s * 0.2, s * 0.62, s * 0.42, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.6, -s * 0.2, s * 0.62, s * 0.42, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(1 / flap, 1);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.12, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawClover(s) {
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI * 2 * i) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawGlowCircle(s, color, alpha) {
    ctx.globalAlpha = alpha * 0.22;
    ctx.beginPath();
    ctx.arc(0, 0, s * 2.6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------- Отрисовка ---------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const sz = opts.size;

    for (const p of parts) {
      const alpha = (p.life ?? 1) * (theme === 'light' ? 0.8 : 1);
      const color = tone(p.color);

      // Дождь — линии
      if (cfg.shape === 'line') {
        ctx.globalAlpha = 0.38 * (theme === 'light' ? 0.7 : 1);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.1 * sz;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6);
        ctx.stroke();
        continue;
      }
      // Метеор — точка с хвостом
      if (cfg.shape === 'meteor') {
        const k = Math.hypot(p.vx, p.vy) || 1;
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6 * sz;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / k) * p.len * sz, p.y - (p.vy / k) * p.len * sz);
        ctx.stroke();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.1 * sz, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.angle) ctx.rotate(p.angle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      const s = 7 * p.size * sz;
      switch (cfg.shape) {
        case 'petal':     drawPetal(s); break;
        case 'leaf':      drawLeaf(s, color); break;
        case 'heart':     drawHeart(s); break;
        case 'feather':   drawFeather(s); break;
        case 'butterfly': drawButterfly(p, s); break;
        case 'clover':    drawClover(s); break;
        case 'rect':
          ctx.fillRect(-s / 2, -s * 0.3, s, s * 0.6);
          break;
        case 'bubble':
          ctx.globalAlpha = 0.5 * alpha;
          ctx.lineWidth = 1.3 * sz;
          ctx.beginPath();
          ctx.arc(0, 0, s, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 0.75 * alpha;
          ctx.beginPath();
          ctx.arc(-s * 0.35, -s * 0.35, s * 0.2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'circle':
          if (cfg.glow) {
            const tw = cfg.twinkle ? 0.55 + 0.45 * Math.sin(p.ph * 6 + p.seed) : 1;
            ctx.globalAlpha = alpha * tw;
            drawGlowCircle(cfg.tiny ? s * 0.32 : s * 0.55, color, alpha * tw);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case 'spark': {
          const tw = 0.6 + 0.4 * Math.sin(p.x * 0.5 + p.y * 0.3);
          ctx.globalAlpha = alpha * tw;
          drawGlowCircle(s * 0.28, color, alpha * tw);
          break;
        }
      }
      ctx.restore();
    }
  }

  /* ---------- Цикл ---------- */
  function tick() { update(); draw(); rafId = requestAnimationFrame(tick); }
  function start() { if (!rafId && cfg) rafId = requestAnimationFrame(tick); }
  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    ctx.clearRect(0, 0, W, H);
  }

  // Пауза на скрытой вкладке
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  /* ---------- Публичный API ---------- */
  window.ArchiveParticles = {
    apply(settings) {
      theme = settings.theme || 'dark';
      opts = settings.particles || opts;

      const key = opts.preset || 'none';
      const keyChanged = key !== presetKey;
      presetKey = key;
      cfg = DEFS[key] || null;

      resize();
      if (!cfg) { stop(); return; }
      if (keyChanged) rebuild();
      start();
    },
  };
})();
