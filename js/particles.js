/* =====================================================================
   particles.js — 20 пресетов фоновых анимаций на <canvas>
   Каждый пресет: { shape, colors, size, speed, drift, glow, gravity }
   ===================================================================== */

(function () {
  'use strict';

  const layer = document.getElementById('fxLayer');
  if (!layer) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  layer.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  let particles = [];
  let rafId = null;
  let cfg = { preset: 'sakura', density: 35, speed: 1, size: 1, enabled: true };

  /* ---------------- Описание 20 пресетов ---------------- */
  const PRESETS = {
    sakura:       { label: 'Сакура',        icon: '🌸', shape: 'petal',     colors: ['#ffb7d5','#ff8fbf','#ffc9e0','#ff7aae'], speed: 1.0, size: 1.0, drift: 1.2, glow: false },
    sakuraWhite:  { label: 'Белая сакура',  icon: '🤍', shape: 'petal',     colors: ['#ffffff','#f7f0f7','#ffeaf5'],            speed: 0.9, size: 1.0, drift: 1.1, glow: false },
    redRoses:     { label: 'Красные розы',  icon: '🌹', shape: 'petal',     colors: ['#c9184a','#a4133c','#ff4d6d'],            speed: 0.8, size: 1.4, drift: 0.9, glow: false },
    whiteRoses:   { label: 'Белые розы',    icon: '🌼', shape: 'petal',     colors: ['#ffffff','#f2f2f2','#e8e8e8'],            speed: 0.8, size: 1.3, drift: 0.9, glow: false },
    yellowPetals: { label: 'Жёлтые лепестки',icon:'💛', shape: 'petal',     colors: ['#ffe066','#ffd43b','#ffb703'],            speed: 1.0, size: 1.0, drift: 1.2, glow: false },
    snow:         { label: 'Снег',          icon: '❄️', shape: 'snowflake', colors: ['#ffffff','#e8f4ff','#d0e8ff'],            speed: 0.7, size: 0.9, drift: 0.8, glow: false },
    heavyRain:    { label: 'Ливень',        icon: '🌧️', shape: 'drop',      colors: ['#7db4ff','#a5c9ff','#5a8fd6'],            speed: 2.2, size: 1.0, drift: 0.2, glow: false },
    drizzle:      { label: 'Морось',        icon: '🌦️', shape: 'drop',      colors: ['#a5c9ff','#c8ddff'],                     speed: 1.1, size: 0.7, drift: 0.3, glow: false },
    autumnLeaves: { label: 'Осенние листья',icon: '🍂', shape: 'leaf',      colors: ['#d97706','#b45309','#ea580c','#92400e'],  speed: 1.1, size: 1.2, drift: 1.5, glow: false },
    fireflies:    { label: 'Светлячки',     icon: '✨', shape: 'glow',      colors: ['#e6ff7a','#b6ff5a','#a5ff8c'],            speed: 0.4, size: 1.0, drift: 2.0, glow: true },
    shootingStars:{ label: 'Падающие звёзды',icon:'🌠', shape: 'streak',    colors: ['#ffffff','#ffe9a8','#c9e8ff'],            speed: 2.4, size: 1.1, drift: 0.3, glow: true },
    starDust:     { label: 'Звёздная пыль', icon: '💫', shape: 'sparkle',   colors: ['#ffffff','#f0e8ff','#ffe9c9'],            speed: 0.5, size: 0.8, drift: 1.0, glow: true },
    bubbles:      { label: 'Пузырьки',      icon: '🫧', shape: 'bubble',    colors: ['#8ee5ff','#b5f0ff','#ffffff'],            speed: -0.8, size: 1.2, drift: 0.6, glow: false },
    confetti:     { label: 'Конфетти',      icon: '🎉', shape: 'confetti',  colors: ['#ff5f9e','#ffd166','#06d6a0','#4dabff','#b388ff'], speed: 1.6, size: 1.1, drift: 0.9, glow: false },
    feathers:     { label: 'Пёрышки',       icon: '🪶', shape: 'feather',   colors: ['#ffffff','#f0ecff','#e8e0f5'],            speed: 0.6, size: 1.2, drift: 1.6, glow: false },
    hearts:       { label: 'Сердечки',      icon: '💗', shape: 'heart',     colors: ['#ff5f9e','#ff3d6e','#ff8fbf'],            speed: 0.9, size: 1.0, drift: 0.9, glow: false },
    butterflies:  { label: 'Бабочки',       icon: '🦋', shape: 'butterfly', colors: ['#7c5cff','#4dabff','#ff5f9e','#ffd166'],  speed: 0.8, size: 1.2, drift: 1.8, glow: false },
    clover:       { label: 'Зелёный клевер',icon: '🍀', shape: 'clover',    colors: ['#4ade80','#22c55e','#16a34a'],            speed: 0.9, size: 1.0, drift: 1.2, glow: false },
    fireworks:    { label: 'Искры салюта',  icon: '🎆', shape: 'spark',     colors: ['#ffd166','#ff5f9e','#4dabff','#a5ff8c'],  speed: 1.6, size: 1.0, drift: 1.4, glow: true },
    nightPetals:  { label: 'Ночные лепестки',icon:'🌙', shape: 'petal',     colors: ['#3b4d9c','#5b6fc4','#7c5cff','#2d3a7a'],  speed: 0.9, size: 1.1, drift: 1.3, glow: false }
  };

  /* ---------------- Утилиты ---------------- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];

  /* ---------------- Рисование фигур ---------------- */
  function drawPetal(ctx, s) {
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.55, s * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawSnowflake(ctx, s) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
    }
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = Math.max(1, s * 0.12);
    ctx.stroke();
  }
  function drawDrop(ctx, s) {
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.22, s * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawLeaf(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.9);
    ctx.bezierCurveTo(s * 0.9, -s * 0.4, s * 0.9, s * 0.4, 0, s * 0.9);
    ctx.bezierCurveTo(-s * 0.9, s * 0.4, -s * 0.9, -s * 0.4, 0, -s * 0.9);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.9);
    ctx.lineTo(0, s * 0.9);
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  function drawGlow(ctx, s) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.4);
    g.addColorStop(0, ctx.fillStyle);
    g.addColorStop(0.4, ctx.fillStyle + 'aa');
    g.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(0, 0, s * 2.4, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
  function drawStreak(ctx, s) {
    const g = ctx.createLinearGradient(-s * 6, 0, s * 1.5, 0);
    g.addColorStop(0, 'transparent');
    g.addColorStop(0.8, ctx.fillStyle);
    g.addColorStop(1, '#fff');
    ctx.fillStyle = g;
    ctx.fillRect(-s * 6, -s * 0.25, s * 7.5, s * 0.5);
  }
  function drawSparkle(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.28, -s * 0.28);
    ctx.lineTo(s, 0);  ctx.lineTo(s * 0.28, s * 0.28);
    ctx.lineTo(0, s);  ctx.lineTo(-s * 0.28, s * 0.28);
    ctx.lineTo(-s, 0); ctx.lineTo(-s * 0.28, -s * 0.28);
    ctx.closePath(); ctx.fill();
  }
  function drawBubble(ctx, s) {
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha *= 0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.3, s * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.globalAlpha /= 0.7;
  }
  function drawConfetti(ctx, s) {
    ctx.fillRect(-s * 0.5, -s * 0.28, s, s * 0.56);
  }
  function drawFeather(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.7, -s * 0.3, s * 0.5, s * 0.6, 0, s);
    ctx.bezierCurveTo(-s * 0.5, s * 0.6, -s * 0.7, -s * 0.3, 0, -s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.15)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(0, s);
    ctx.stroke();
  }
  function drawHeart(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.75);
    ctx.bezierCurveTo(-s * 1.3, -s * 0.2, -s * 0.5, -s * 1.1, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.5, -s * 1.1, s * 1.3, -s * 0.2, 0, s * 0.75);
    ctx.fill();
  }
  function drawButterfly(ctx, s) {
    ctx.beginPath(); ctx.ellipse(-s * 0.5, 0, s * 0.6, s * 0.4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.5, 0, s * 0.6, s * 0.4, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(-s * 0.06, -s * 0.35, s * 0.12, s * 0.7);
  }
  function drawClover(ctx, s) {
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((Math.PI / 2) * i);
      ctx.beginPath();
      ctx.arc(0, -s * 0.5, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  function drawSpark(ctx, s) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.6);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, ctx.fillStyle);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, Math.PI * 2); ctx.fill();
  }

  const DRAW = {
    petal: drawPetal, snowflake: drawSnowflake, drop: drawDrop, leaf: drawLeaf,
    glow: drawGlow, streak: drawStreak, sparkle: drawSparkle, bubble: drawBubble,
    confetti: drawConfetti, feather: drawFeather, heart: drawHeart,
    butterfly: drawButterfly, clover: drawClover, spark: drawSpark
  };

  /* ---------------- Частицы ---------------- */
  function createParticle(preset) {
    const p = PRESETS[preset] || PRESETS.sakura;
    const sizeBase = rand(6, 16) * cfg.size * (p.size || 1);
    return {
      x: rand(-W * 0.1, W * 1.1),
      y: rand(-H * 0.2, H * 0.3),
      vx: rand(-0.4, 0.4) * (p.drift || 1),
      vy: rand(0.5, 1.6) * (p.speed || 1) * cfg.speed * (p.speed > 1.6 ? 1 : 1),
      size: sizeBase,
      color: pick(p.colors),
      rot: rand(0, Math.PI * 2),
      vrot: rand(-0.04, 0.04),
      shape: p.shape,
      glow: p.glow,
      sway: rand(0.5, 1.5),
      phase: rand(0, Math.PI * 2)
    };
  }

  function reset(p) {
    p.x = rand(-W * 0.1, W * 1.1);
    p.y = rand(-80, -20);
    p.vy = rand(0.5, 1.6) * (PRESETS[cfg.preset].speed || 1) * cfg.speed;
    p.vx = rand(-0.4, 0.4) * (PRESETS[cfg.preset].drift || 1);
  }

  /* ---------------- Основной цикл ---------------- */
  let last = 0;
  function loop(t) {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min((t - last) / 16.67, 3);
    last = t;

    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      p.phase += 0.02 * dt;
      p.x += (p.vx + Math.sin(p.phase) * 0.4 * (PRESETS[cfg.preset].drift || 1)) * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;

      if (p.y > H + 60 || p.x < -120 || p.x > W + 120) reset(p);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 14; }
      (DRAW[p.shape] || drawPetal)(ctx, p.size);
      ctx.restore();
    }
  }

  /* ---------------- Управление ---------------- */
  function resize() {
    W = canvas.width = layer.clientWidth * DPR;
    H = canvas.height = layer.clientHeight * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    W = layer.clientWidth;
    H = layer.clientHeight;
  }

  function rebuild() {
    particles = [];
    if (!cfg.enabled) return;
    const n = Math.max(0, Math.min(200, cfg.density | 0));
    for (let i = 0; i < n; i++) particles.push(createParticle(cfg.preset));
  }

  function start() { if (rafId == null) { last = performance.now(); rafId = requestAnimationFrame(loop); } }
  function stop()  { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } }

  /* ---------------- Публичный API ---------------- */
  window.FX = {
    presets: PRESETS,
    apply(newCfg) {
      cfg = Object.assign({}, cfg, newCfg || {});
      if (!cfg.enabled) { stop(); ctx.clearRect(0, 0, W, H); return; }
      start();
      rebuild();
    },
    getConfig() { return Object.assign({}, cfg); }
  };

  window.addEventListener('resize', () => { resize(); rebuild(); });
  resize();
  start();
  rebuild();
})();
