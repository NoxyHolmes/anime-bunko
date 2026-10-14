/* =====================================================================
   stats.js — расчёт и отрисовка статистики (Chart.js)
   Экспортирует window.Stats с методами render(archive).
   archive — массив тайтлов из app.js
   ===================================================================== */

(function () {
  'use strict';

  const charts = {};
  let avgEpisode = 24, avgMovie = 110;

  function setAverages(e, m) { avgEpisode = e || 24; avgMovie = m || 110; }

  /* -------- Утилиты -------- */
  const fmtTime = min => {
    min = Math.round(min);
    if (min < 60) return min + ' мин';
    const h = Math.floor(min / 60), m = min % 60;
    if (h < 24) return h + ' ч' + (m ? ' ' + m + ' мин' : '');
    const d = Math.floor(h / 24);
    return d + ' д ' + (h % 24) + ' ч';
  };
  const pct = (v, t) => t ? Math.round(v / t * 100) + '%' : '0%';

  /* -------- Время записи (сезон/фильм/спешл) -------- */
  function entryMinutes(entry) {
    if (entry.durationMinutes != null) return Number(entry.durationMinutes) || 0;
    const eps = Number(entry.episodes) || 0;
    if (!eps) return Number(avgMovie) || 110;
    const mpe = Number(entry.minutesPerEpisode) || avgEpisode;
    return eps * mpe;
  }
  window.calcEntryMinutes = entryMinutes;

  /* -------- Общее время тайтла -------- */
  function titleMinutes(t) {
    return (t.entries || []).reduce((s, e) => s + entryMinutes(e), 0);
  }
  window.calcTitleMinutes = titleMinutes;

  /* -------- Полный пересчёт метрик -------- */
  function compute(archive) {
    const total = archive.length;
    const totalMinutes = archive.reduce((s, t) => s + titleMinutes(t), 0);

    let films = 0, series = 0, episodes = 0, filmMinutes = 0;

    archive.forEach(t => {
      (t.entries || []).forEach(e => {
        const kind = (e.kind || '').toLowerCase();
        const eps = Number(e.episodes) || 0;
        const isFilm = kind.includes('фильм') || (!eps && e.durationMinutes != null);
        if (isFilm) {
          films++;
          filmMinutes += entryMinutes(e);
        } else {
          series++;
          episodes += eps;
        }
      });
    });

    const tierCounts = { SSS: 0, S: 0, A: 0, B: 0, C: 0, D: 0, E: 0 };
    archive.forEach(t => { if (tierCounts[t.tier] != null) tierCounts[t.tier]++; });

    // Жанры
    const genreCounts = {};
    archive.forEach(t => (t.genres || []).forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);

    // По месяцам (по дате начала просмотра)
    const monthCounts = {};
    archive.forEach(t => (t.entries || []).forEach(e => {
      const start = parseStartDate(e.watchDate);
      if (!start) return;
      const key = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0');
      const eps = Number(e.episodes) || 1;
      monthCounts[key] = (monthCounts[key] || 0) + eps;
    }));
    const monthsSorted = Object.keys(monthCounts).sort();
    const monthLabels = monthsSorted.map(k => {
      const [y, m] = k.split('-');
      return ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'][+m - 1] + ' ' + y.slice(2);
    });
    const monthData = monthsSorted.map(k => monthCounts[k]);

    return {
      total, totalMinutes, films, series, episodes, filmMinutes,
      avgPerTitle: total ? Math.round(totalMinutes / total) : 0,
      tierCounts, topGenres, monthLabels, monthData
    };
  }

  function parseStartDate(str) {
    if (!str) return null;
    const s = String(str).split(/[–—-]/)[0].trim();
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  window.parseStartDate = parseStartDate;

  /* -------- Сводные карточки -------- */
  function renderSummary(m) {
    const wrap = document.getElementById('summaryGrid');
    if (!wrap) return;
    const cards = [
      { v: m.total,            l: 'Всего тайтлов' },
      { v: m.series,           l: 'Сезонов/частей' },
      { v: m.episodes,         l: 'Серий' },
      { v: m.films,            l: 'Фильмов' },
      { v: fmtTime(m.totalMinutes), l: 'Общее время' },
      { v: fmtTime(m.filmMinutes),  l: 'Время фильмов', n: 'включая фильмы внутри сериалов' },
      { v: fmtTime(m.avgPerTitle),  l: 'Среднее на тайтл' }
    ];
    wrap.innerHTML = cards.map((c, i) => `
      <div class="summary-card" style="animation-delay:${i * 60}ms">
        <div class="sum-val">${c.v}</div>
        <div class="sum-lbl">${c.l}</div>
        ${c.n ? `<div class="sum-note">${c.n}</div>` : ''}
      </div>
    `).join('');
  }

  /* -------- Диаграммы -------- */
  const CHART_FONT = { family: 'Manrope', size: 12 };

  function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

  function renderGenreChart(m) {
    const el = document.getElementById('chartGenres'); if (!el) return;
    destroyChart('genres');
    const labels = m.topGenres.map(g => g[0]);
    const data = m.topGenres.map(g => g[1]);
    const total = m.total || 1;
    charts.genres = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: labels.map((_, i) =>
            `hsl(${(i * 47) % 360} 75% 62% / .82)`),
          borderRadius: 6,
          barThickness: 14
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: c => ` ${c.parsed.x} тайтл(ов) · ${pct(c.parsed.x, total)}` }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.06)' }, ticks: { color: '#9aa3c4', font: CHART_FONT } },
          y: { grid: { display: false }, ticks: { color: '#eef1ff', font: CHART_FONT } }
        }
      }
    });
  }

  function renderTierChart(m) {
    const el = document.getElementById('chartTiers'); if (!el) return;
    destroyChart('tiers');
    const order = ['SSS','S','A','B','C','D','E'];
    const labels = order;
    const data = order.map(k => m.tierCounts[k] || 0);
    const total = m.total || 1;
    const colors = ['#ffd700','#ff9a3c','#ff4d6d','#3ddc97','#4dabff','#b388ff','#ff5fbf'];

    charts.tiers = new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: 'rgba(0,0,0,.35)',
          borderWidth: 2,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        animation: { animateRotate: true, duration: 1000 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#eef1ff', font: CHART_FONT, padding: 14, usePointStyle: true, pointStyle: 'circle' }
          },
          tooltip: {
            callbacks: { label: c => ` ${c.label}: ${c.parsed} · ${pct(c.parsed, total)}` }
          }
        }
      }
    });
  }

  function renderMonthsChart(m) {
    const el = document.getElementById('chartMonths'); if (!el) return;
    destroyChart('months');
    charts.months = new Chart(el, {
      type: 'line',
      data: {
        labels: m.monthLabels,
        datasets: [{
          data: m.monthData,
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff5f9e',
          backgroundColor: 'rgba(255,95,158,.15)',
          fill: true, tension: .35,
          pointRadius: 4, pointHoverRadius: 7,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1100, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${c.parsed.y} серий/частей` } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#9aa3c4', font: CHART_FONT } },
          y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#9aa3c4', font: CHART_FONT }, beginAtZero: true }
        }
      }
    });
  }

  /* -------- Публичный API -------- */
  window.Stats = {
    setAverages,
    compute,
    render(archive) {
      const m = compute(archive);
      renderSummary(m);
      renderGenreChart(m);
      renderTierChart(m);
      renderMonthsChart(m);
    }
  };
})();
