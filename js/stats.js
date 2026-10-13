/* ============================================================
   АНИМЕ-БУНКО — stats.js (финальная версия)
   Вкладка «Статистика»: сводные числа и три диаграммы Chart.js.
   Цвета тиров синхронизированы с новой палитрой styles.css.
   ============================================================ */
(function () {
  'use strict';

  const TIER_HEX = {
    SSS: '#f2c14e', S: '#ff9130', A: '#ff4d5e', B: '#2fd398',
    C: '#3fa9ff', D: '#a476ff', E: '#ff4d9d',
  };
  const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  const charts = {};

  function palette() {
    const cs = getComputedStyle(document.documentElement);
    const v = name => cs.getPropertyValue(name).trim();
    return {
      accent: v('--accent') || '#ff4d6d',
      text: v('--text') || '#efeaf4',
      text2: v('--text-2') || '#a79dbb',
      text3: v('--text-3') || '#6f6780',
      border: v('--border') || 'rgba(255,255,255,.075)',
    };
  }

  const isActive = () => document.getElementById('tab-stats')?.classList.contains('is-active');

  /* ---------- Заглушки «нет данных» (canvas не удаляем — чинится повторный рендер) ---------- */
  function showChartEmpty(card, msg) {
    const box = card.querySelector('.chart-box');
    if (!box) return;
    let note = box.querySelector('.chart-empty');
    if (!note) {
      note = document.createElement('p');
      note.className = 'chart-empty';
      note.style.cssText = 'padding:60px 0;text-align:center;color:var(--text-3);font-size:13px;margin:0;';
      box.appendChild(note);
    }
    note.textContent = msg;
    const cv = box.querySelector('canvas');
    if (cv) cv.style.display = 'none';
  }
  function hideChartEmpty(card) {
    const box = card.querySelector('.chart-box');
    const note = box?.querySelector('.chart-empty');
    if (note) note.remove();
    const cv = box?.querySelector('canvas');
    if (cv) cv.style.display = '';
  }

  /* ============================================================
     РЕНДЕР ВСЕЙ ВКЛАДКИ
     ============================================================ */
  function render() {
    if (!window.App || typeof Chart === 'undefined') return;

    const App = window.App;
    const titles = App.titles;
    const pal = palette();

    Chart.defaults.font.family = "'Manrope', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = pal.text2;

    renderHero(titles, App);
    renderGenresChart(titles, pal);
    renderTiersChart(titles, pal);
    renderMonthsChart(titles, pal, App);
  }

  /* ---------- Сводные числа ---------- */
  function renderHero(titles, App) {
    const serials = titles.filter(t => t.type === 'TV-сериал').length;
    // Фильмы — по частям: и отдельные тайтлы, и фильмы внутри сериалов
    const movieParts = titles.reduce((n, t) =>
      n + (t.entries || []).filter(e => e.kind === 'Фильм').length, 0);
    const episodes = titles.reduce((n, t) => n + App.totalEpisodes(t), 0);
    const { movieMin, totalMin } = App.movieStats();
    const avg = titles.length ? totalMin / titles.length : 0;

    const items = [
      [titles.length, 'Тайтлов'],
      [serials, 'Сериалов'],
      [movieParts, 'Фильмов'],
      [episodes, 'Серий'],
      [App.fmtMin(totalMin), 'Общее время'],
      [App.fmtMin(movieMin), 'Время фильмов'],
      [App.fmtMin(avg), 'В среднем на тайтл'],
    ];

    document.getElementById('stats-hero').innerHTML = items.map(([num, label]) => `
      <div class="stat-big">
        <div class="stat-big__num">${num}</div>
        <div class="stat-big__label">${label}</div>
      </div>`).join('');
  }

  /* ---------- Жанры: горизонтальные бары с процентами ---------- */
  function renderGenresChart(titles, pal) {
    const el = document.getElementById('chart-genres');
    if (!el) return;
    destroy('genres');
    const card = el.closest('.stat-card');

    const counts = new Map();
    titles.forEach(t => (t.genres || []).forEach(g => counts.set(g, (counts.get(g) || 0) + 1)));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const total = titles.length || 1;

    if (!top.length) { showChartEmpty(card, 'Нет данных о жанрах'); return; }
    hideChartEmpty(card);

    charts.genres = new Chart(el, {
      type: 'bar',
      data: {
        labels: top.map(([g]) => g),
        datasets: [{
          data: top.map(([, n]) => +(n / total * 100).toFixed(1)),
          backgroundColor: pal.accent,
          hoverBackgroundColor: pal.text,
          borderRadius: 6,
          maxBarThickness: 20,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 750, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const [, n] = top[ctx.dataIndex];
                return `${n} тайтл(ов) · ${ctx.parsed.x}%`;
              },
            },
          },
        },
        scales: {
          x: {
            max: 100,
            grid: { color: pal.border },
            title: { display: true, text: '% от всех тайтлов', color: pal.text3 },
            ticks: { callback: v => v + '%' },
          },
          y: { grid: { display: false }, ticks: { color: pal.text } },
        },
      },
    });
  }

  /* ---------- Тиры: donut с числом в центре ---------- */
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      if (chart.config.type !== 'doughnut') return;
      const meta = chart.getDatasetMeta(0);
      if (!meta.data.length) return;
      const { x, y } = meta.data[0];
      const pal = palette();
      const total = chart.$total ?? '';
      const ctx = chart.ctx;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = pal.text;
      ctx.font = "800 28px 'Unbounded', sans-serif";
      ctx.fillText(total, x, y + 2);
      ctx.fillStyle = pal.text3;
      ctx.font = "700 10px 'Manrope', sans-serif";
      ctx.fillText('ТАЙТЛОВ', x, y + 21);
      ctx.restore();
    },
  };

  function renderTiersChart(titles, pal) {
    const el = document.getElementById('chart-tiers');
    if (!el) return;
    destroy('tiers');
    const card = el.closest('.stat-card');

    const counts = window.App.TIER_KEYS.map(k => titles.filter(t => t.tier === k).length);
    const total = titles.length;

    if (!total) { showChartEmpty(card, 'Каталог пуст'); return; }
    hideChartEmpty(card);

    charts.tiers = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: window.App.TIER_KEYS,
        datasets: [{
          data: counts,
          backgroundColor: window.App.TIER_KEYS.map(k => TIER_HEX[k]),
          borderColor: 'rgba(0,0,0,0)',
          hoverOffset: 9,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        animation: { duration: 800, easing: 'easeOutQuart', animateRotate: true },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: pal.text,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 14,
              font: { weight: 700 },
              generateLabels: chart => {
                const data = chart.data.datasets[0].data;
                const sum = data.reduce((a, b) => a + b, 0) || 1;
                return chart.data.labels.map(lbl => ({
                  text: `${lbl} · ${Math.round(data[chart.data.labels.indexOf(lbl)] / sum * 100)}%`,
                  fillStyle: TIER_HEX[lbl],
                  index: chart.data.labels.indexOf(lbl),
                  fontColor: pal.text,
                }));
              },
            },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed} тайтл(ов) · ${Math.round(ctx.parsed / total * 100)}%`,
            },
          },
        },
      },
      plugins: [centerTextPlugin],
    });
    charts.tiers.$total = total;
  }

  /* ---------- Динамика по месяцам (линия) ---------- */
  function renderMonthsChart(titles, pal, App) {
    const el = document.getElementById('chart-months');
    if (!el) return;
    destroy('months');

    // Минуты по месяцу НАЧАЛА просмотра каждой части
    const byMonth = new Map();
    titles.forEach(t => (t.entries || []).forEach(e => {
      const pd = App.parseWatchDate(e.watchDate);
      if (!pd) return;
      const key = App.monthKey(pd.start);
      byMonth.set(key, (byMonth.get(key) || 0) + App.entryMinutes(e, App.settings, t.type));
    }));

    const now = new Date();
    let end = new Date(now.getFullYear(), now.getMonth(), 1);
    let start = new Date(end);
    const keys = [...byMonth.keys()].sort();
    if (keys.length) {
      const [y, m] = keys[0].split('-').map(Number);
      start = new Date(y, m - 1, 1);
    } else {
      start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
    }
    if (end - start > 36 * 31 * 864e5) start = new Date(end.getFullYear(), end.getMonth() - 35, 1);

    const labels = [], data = [];
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      labels.push(`${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`);
      data.push(Math.round(byMonth.get(App.monthKey(d)) || 0));
    }

    const note = document.getElementById('months-note');
    if (note) note.textContent = data.some(v => v > 0)
      ? `от ${labels[0]} до ${labels[labels.length - 1]}` : 'нет данных';

    const ctx2d = el.getContext('2d');
    const grad = ctx2d.createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0, pal.accent + '55');
    grad.addColorStop(1, pal.accent + '00');

    charts.months = new Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: pal.accent,
          backgroundColor: grad,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2.5,
          pointHoverRadius: 6,
          pointBackgroundColor: pal.accent,
          pointBorderColor: 'transparent',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 850, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` Просмотрено: ${App.fmtMin(ctx.parsed.y)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 18 } },
          y: {
            grid: { color: pal.border },
            ticks: { callback: v => v >= 60 ? (v / 60) + ' ч' : v + ' м' },
          },
        },
      },
    });
  }

  function destroy(name) {
    if (charts[name]) { charts[name].destroy(); delete charts[name]; }
  }

  /* ---------- Подписки ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.App) return;
    window.App.on('data-changed', () => { if (isActive()) render(); });
    window.App.on('settings-changed', () => { if (isActive()) render(); });
  });

  window.ArchiveStats = { render };
})();
