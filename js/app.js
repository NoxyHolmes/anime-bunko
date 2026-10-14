/* =====================================================================
   app.js — логика публичной части «Аниме-Архив»
   Загружает data.json, рендерит тиры, карточки, модалку, календарь,
   настройки, drag&drop, фильтры. Работает и в owner-режиме (admin.html).
   ===================================================================== */

(function () {
  'use strict';

  /* ==================== Состояние ==================== */
  const LS = {
    data:   'anime-archive:data',
    settings: 'anime-archive:settings',
    github: 'anime-archive:github'
  };

  const DEFAULT_SETTINGS = {
    theme: 'dark',
    accent: '#ff5f9e',
    animations: true,
    parallax: true,
    preset: 'sakura',
    density: 35,
    speed: 1,
    size: 1,
    viewMode: 'grid',
    cardSize: 1,
    columns: 9,
    avgEpisode: 24,
    avgMovie: 110
  };

  const TIERS = ['SSS','S','A','B','C','D','E'];
  const TIER_LABELS = {
    SSS: 'Шедевр', S: 'Великолепно', A: 'Отлично', B: 'Хорошо',
    C: 'Средне', D: 'Слабо', E: 'Плохо'
  };

  const ALL_GENRES = [
    'Авангард','Авто/Мото','Ангелы','Боевые искусства','Вампиры','Видеоигры',
    'Виртуальная реальность','Военное','Выживание','Гарем','Гэг-юмор','Гэмблинг',
    'Гонки','Демоны','Детектив','Детское','Дистопия','Драма','Дзёсэй','Животные',
    'Зомби','Игра','Идолы','ИИ и роботы','Исекай','Историческое','Карты','Киберпанк',
    'Комедия','Космос','Кулинария','Магия','Медицина','Меха','Мистика','Мифология',
    'Музыка','Настольные игры','Научная фантастика','Ниндзя','Обратный гарем',
    'Обратный исекай','Офис/Работа','Пародия','Повседневность','Полиция',
    'Постапокалиптика','Приключения','Природа/Экология','Психологическое',
    'Путешествия во времени','Расследование','Романтика','Романтическая комедия',
    'Самураи','Саспенс','Сверхспособности','Сверхъестественное','Семейное',
    'Сёнэн','Сёнэн-ай','Сёдзё','Сёдзё-ай','Спорт','Стимпанк','Стратегия','Сэйнен',
    'Танцы','Театр','Тёмное фэнтези','Триллер','Ужасы','Университет','Фэнтези',
    'Школа','Экшен/Боевик','Этти'
  ].sort((a, b) => a.localeCompare(b, 'ru'));

  /* ==================== DOM-хелперы ==================== */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  /* ==================== Утилиты ==================== */
  const fmtDateRu = d => {
    if (!d) return '';
    const m = String(d).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return d;
    return `${m[3]}.${m[2]}.${m[1]}`;
  };
  const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const DOW_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  const fmtMinutes = min => {
    min = Math.round(min);
    if (min < 60) return min + ' мин';
    const h = Math.floor(min / 60), m = min % 60;
    if (h < 24) return h + ' ч' + (m ? ' ' + m + ' мин' : '');
    const d = Math.floor(h / 24);
    return d + ' д ' + (h % 24) + ' ч';
  };

  /* ==================== Состояние приложения ==================== */
  let data = { titles: [] };
  let settings = Object.assign({}, DEFAULT_SETTINGS);
  let filters = { q: '', tier: '', type: '', genre: '', fav: false };
  let sortables = [];
  let currentCalDate = new Date();
  let calMode = 'grid';
  let activeModalId = null;

  const IS_OWNER = document.body.dataset.owner === 'true' ||
    new URLSearchParams(location.search).get('mode') === 'owner';

  /* ==================== Загрузка данных ==================== */
  async function loadData() {
    // 1) локальная версия из localStorage (если есть и не пусто)
    try {
      const local = localStorage.getItem(LS.data);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && Array.isArray(parsed.titles)) { data = parsed; return; }
      }
    } catch (e) { console.warn('localStorage data битый', e); }

    // 2) data.json из репозитория
    try {
      const res = await fetch('data.json', { cache: 'no-store' });
      if (res.ok) {
        const parsed = await res.json();
        if (parsed && Array.isArray(parsed.titles)) data = parsed;
      }
    } catch (e) { console.warn('Не удалось загрузить data.json', e); }

    if (!data.titles.length) data = { titles: [] };
  }

  /* ==================== Настройки ==================== */
  function loadSettings() {
    try {
      const raw = localStorage.getItem(LS.settings);
      if (raw) settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
    } catch (e) {}
  }
  function saveSettings() {
    localStorage.setItem(LS.settings, JSON.stringify(settings));
  }
  function applySettings() {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty('--accent', settings.accent);
    document.body.classList.toggle('no-anim', !settings.animations);

    // Фон
    if (window.FX) {
      FX.apply({
        enabled: settings.animations,
        preset: settings.preset,
        density: settings.density,
        speed: settings.speed,
        size: settings.size
      });
    }
    // Колонки
    document.documentElement.style.setProperty('--cols', settings.columns);
    // Средние длительности для статистики
    if (window.Stats) Stats.setAverages(settings.avgEpisode, settings.avgMovie);
  }

  /* ==================== Сохранение данных ==================== */
  let saveTimer = null;
  function scheduleSaveLocal() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(LS.data, JSON.stringify(data));
        setSaveStatus('Сохранено локально', 'ok');
      } catch (e) {
        setSaveStatus('Ошибка локального сохранения', 'err');
      }
    }, 500);
  }

  function setSaveStatus(text, type) {
    const el = $('#saveStatus');
    if (!el) return;
    el.hidden = false;
    el.textContent = text;
    el.className = 'save-status' + (type ? ' ' + type : '');
    if (type === 'ok') setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* ==================== Тост-уведомления ==================== */
  function toast(msg, type = '') {
    const wrap = $('#toasts');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(30px)';
      setTimeout(() => el.remove(), 320);
    }, 3200);
  }
  window.toast = toast;

  /* ==================== Фильтрация ==================== */
  function passesFilters(t) {
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = (t.title + ' ' + (t.titleOriginal || '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.tier && t.tier !== filters.tier) return false;
    if (filters.type && t.type !== filters.type) return false;
    if (filters.genre && !(t.genres || []).includes(filters.genre)) return false;
    if (filters.fav && !t.favorite) return false;
    return true;
  }

  /* ==================== Рендер панели тиров ==================== */
  function renderTierPanel() {
    const wrap = $('#tierPanel');
    if (!wrap) return;
    const total = data.titles.length;
    wrap.innerHTML = TIERS.map(tier => {
      const count = data.titles.filter(t => t.tier === tier).length;
      const p = total ? Math.round(count / total * 100) : 0;
      return `
        <div class="tier-chip" data-tier="${tier}" title="${TIER_LABELS[tier]}">
          <div class="tier-letter">${tier}</div>
          <div class="tier-meta"><b>${count}</b> · ${p}%</div>
        </div>
      `;
    }).join('');

    // клик по тиру = фильтр
    $$('.tier-chip', wrap).forEach(chip => {
      chip.addEventListener('click', () => {
        filters.tier = filters.tier === chip.dataset.tier ? '' : chip.dataset.tier;
        $('#filterTier').value = filters.tier;
        renderAll();
      });
    });
  }

  /* ==================== Рендер ленты «Последние» ==================== */
  function renderLatest() {
    const strip = $('#latestStrip');
    const count = $('#latestCount');
    if (!strip) return;
    const sorted = data.titles
      .slice()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 10);
    if (count) count.textContent = sorted.length ? `${sorted.length} из ${data.titles.length}` : '';
    strip.innerHTML = sorted.map(t => `
      <div class="mini-card" data-id="${esc(t.id)}" title="${esc(t.title)}">
        <img src="${esc(t.cover || '')}" alt="" loading="lazy"
             onerror="this.style.background='#222';this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/>'">
        <div class="mini-title">${esc(t.title)}</div>
      </div>
    `).join('');
    strip.querySelectorAll('.mini-card').forEach(c => {
      c.addEventListener('click', () => openModal(c.dataset.id));
    });
  }

  /* ==================== Рендер секций тиров ==================== */
  function renderTierSections() {
    const wrap = $('#tierSections');
    if (!wrap) return;

    const cols = settings.columns;
    const viewClass = settings.viewMode === 'list' ? 'list-view'
                    : settings.viewMode === 'compact' ? 'compact-view' : '';

    wrap.innerHTML = TIERS.map(tier => {
      const list = data.titles.filter(t => t.tier === tier && passesFilters(t));
      return `
        <section class="tier-section" data-tier="${tier}">
          <header class="tier-head" data-tier="${tier}">
            <span class="tier-letter">${tier}</span>
            <span class="tier-name">${TIER_LABELS[tier]}</span>
            <span class="tier-count" data-count="${tier}">${list.length} тайтл(ов)</span>
          </header>
          <div class="tier-grid ${viewClass}" id="grid-${tier}"
               data-tier="${tier}" style="--cols:${cols}"></div>
        </section>
      `;
    }).join('');

    TIERS.forEach(tier => {
      const grid = document.getElementById('grid-' + tier);
      if (!grid) return;
      const list = data.titles.filter(t => t.tier === tier && passesFilters(t));
      grid.innerHTML = list.map((t, i) => cardHTML(t, i)).join('');
      grid.classList.toggle('empty', list.length === 0);
      grid.querySelectorAll('.card').forEach(c => {
        c.addEventListener('click', () => openModal(c.dataset.id));
      });
      initSortable(grid);
    });

    // Пустое состояние
    const anyVisible = data.titles.some(passesFilters);
    $('#emptyState').hidden = anyVisible || data.titles.length === 0 && !hasActiveFilters();
  }

  function hasActiveFilters() {
    return filters.q || filters.tier || filters.type || filters.genre || filters.fav;
  }

  /* ==================== HTML карточки ==================== */
  function cardHTML(t, idx = 0) {
    const crowns = t.tier === 'SSS' ? `<span class="badge crown">👑 SSS</span>` : '';
    const fav = t.favorite ? `<span class="badge fav">❤</span>` : '';
    const total = window.calcTitleMinutes ? calcTitleMinutes(t) : 0;

    return `
      <article class="card" data-id="${esc(t.id)}" style="animation-delay:${Math.min(idx * 22, 400)}ms">
        <div class="card-cover">
          <img src="${esc(t.cover || '')}" alt="${esc(t.title)}" loading="lazy"
               onerror="this.style.background='#1a1d2e'">
          <div class="card-badges">
            <div>${crowns}</div>
            <div>${fav}</div>
          </div>
        </div>
        <div class="card-info">
          <h3 class="card-title">${esc(t.title)}</h3>
          <div class="card-sub">
            <span>${esc(t.type || '')}</span>
            <span class="dot">•</span>
            <span>${fmtMinutes(total)}</span>
          </div>
        </div>
      </article>
    `;
  }

  /* ==================== SortableJS ==================== */
  function initSortable(grid) {
    if (!window.Sortable || !IS_OWNER) return;
    const s = Sortable.create(grid, {
      group: { name: 'titles', pull: true, put: true },
      animation: 220,
      ghostClass: 'is-dragging',
      delay: 120,
      delayOnTouchOnly: true,
      onEnd(evt) {
        const id = evt.item.dataset.id;
        const newTier = evt.to.dataset.tier;
        const title = data.titles.find(x => x.id === id);
        if (!title) return;

        // Позиция внутри нового тира
        const newIndex = Array.from(evt.to.children).indexOf(evt.item);
        const tierList = data.titles.filter(t => t.tier === newTier && t.id !== id);

        // Обновляем массив data.titles: убираем и вставляем
        const oldTier = title.tier;
        title.tier = newTier;
        // Плавная перекраска
        evt.item.animate([{ transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 260 });

        // Перестроим порядок в общей очереди (не критично, но пусть)
        if (oldTier !== newTier) {
          const oldCount = evt.from.querySelector('[data-count="' + oldTier + '"]');
        }

        scheduleSaveLocal();
        renderTierPanel();
        renderTierSections();
        renderStats();
        toast('Тир обновлён', 'ok');
      }
    });
    sortables.push(s);
  }

  function destroySortables() {
    sortables.forEach(s => { try { s.destroy(); } catch (e) {} });
    sortables = [];
  }

  /* ==================== Модальное окно тайтла ==================== */
  function openModal(id) {
    const t = data.titles.find(x => x.id === id);
    if (!t) return;
    activeModalId = id;

    const total = calcTitleMinutes(t);
    const entries = (t.entries || []).map(e => {
      const mins = window.calcEntryMinutes(e);
      const kind = e.kind || '';
      const isFilm = (kind.toLowerCase().includes('фильм')) || (!e.episodes && e.durationMinutes != null);
      return `
        <div class="entry-row">
          <span class="entry-kind">${esc(kind)}</span>
          <span class="entry-date">${esc(e.watchDate || '')}</span>
          <span class="entry-eps">${e.episodes ? esc(e.episodes) + ' сер.' : (isFilm ? 'Фильм' : '')}</span>
          <span class="entry-time">${fmtMinutes(mins)}</span>
        </div>`;
    }).join('') || '<div class="hint">Нет записей о просмотре</div>';

    const ownerActions = IS_OWNER ? `
      <div class="modal-actions">
        <button class="btn btn-primary" id="modalEdit">Редактировать</button>
        <button class="btn btn-danger" id="modalDelete">Удалить</button>
      </div>` : '';

    $('#modalBody').innerHTML = `
      <div class="modal-hero">
        <img src="${esc(t.cover || '')}" alt="" onerror="this.style.background='#222'">
        <div class="modal-info">
          <h2 id="modalTitleText">${esc(t.title)}</h2>
          <div class="orig">${esc(t.titleOriginal || '')}</div>
          <div class="modal-chips">
            <span class="chip chip-accent">${esc(t.tier)}</span>
            <span class="chip">${esc(t.type || '')}</span>
            ${t.favorite ? '<span class="chip chip-fav">❤ Любимый</span>' : ''}
            ${t.tier === 'SSS' ? '<span class="chip chip-crown">👑 Шедевр</span>' : ''}
            ${(t.genres || []).map(g => `<span class="chip">${esc(g)}</span>`).join('')}
          </div>
        </div>
      </div>

      <div class="modal-meta">
        <div class="meta-box"><div class="meta-val">${(t.entries || []).length}</div><div class="meta-lbl">Частей</div></div>
        <div class="meta-box"><div class="meta-val">${(t.entries || []).reduce((s, e) => s + (Number(e.episodes) || 0), 0)}</div><div class="meta-lbl">Серий</div></div>
        <div class="meta-box"><div class="meta-val">${fmtMinutes(total)}</div><div class="meta-lbl">Общее время</div></div>
      </div>

      <div class="entries-title">Составные части</div>
      <div class="entries-list">${entries}</div>

      <div class="modal-total">
        <span class="label">Итого по тайтлу</span>
        <span class="value">${fmtMinutes(total)}</span>
      </div>

      ${ownerActions}
    `;

    $('#titleModal').classList.add('is-open');
    document.body.style.overflow = 'hidden';

    if (IS_OWNER) {
      $('#modalEdit').addEventListener('click', () => { closeModal(); openEditor(t); });
      $('#modalDelete').addEventListener('click', () => {
        if (!confirm('Удалить тайтл «' + t.title + '»?')) return;
        data.titles = data.titles.filter(x => x.id !== t.id);
        scheduleSaveLocal();
        closeModal();
        renderAll();
        toast('Тайтл удалён', 'warn');
      });
    }
  }

  function closeModal() {
    $('#titleModal').classList.remove('is-open');
    document.body.style.overflow = '';
    activeModalId = null;
  }

  /* ==================== Календарь ==================== */
  function expandEntryDates(entry) {
    const out = [];
    if (!entry.watchDate) return out;
    const raw = String(entry.watchDate).trim();
    // Диапазон "2024-05-01 – 2024-05-20"
    const mRange = raw.match(/(\d{4})-(\d{2})-(\d{2})\s*[–—-]\s*(\d{4})-(\d{2})-(\d{2})/);
    if (mRange) {
      const start = new Date(+mRange[1], +mRange[2] - 1, +mRange[3]);
      const end   = new Date(+mRange[4], +mRange[5] - 1, +mRange[6]);
      const step = new Date(start);
      while (step <= end && out.length < 400) {
        out.push(step.toISOString().slice(0, 10));
        step.setDate(step.getDate() + 1);
      }
      return out;
    }
    // Одна дата
    const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) out.push(`${m[1]}-${m[2]}-${m[3]}`);
    return out;
  }

  function collectWatchesByDate() {
    const map = {};
    data.titles.forEach(t => (t.entries || []).forEach(e => {
      expandEntryDates(e).forEach(d => {
        (map[d] = map[d] || []).push({ title: t, entry: e });
      });
    }));
    return map;
  }

  function renderCalendar() {
    const grid = $('#calGrid');
    const list = $('#calList');
    if (!grid) return;

    const y = currentCalDate.getFullYear();
    const m = currentCalDate.getMonth();
    $('#calTitle').textContent = MONTHS_RU[m] + ' ' + y;

    const map = collectWatchesByDate();

    if (calMode === 'list') {
      grid.hidden = true; list.hidden = false;
      renderCalList(map);
      return;
    }
    grid.hidden = false; list.hidden = true;

    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7; // Пн = 0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();

    let html = DOW_RU.map(d => `<div class="cal-dow">${d}</div>`).join('');

    // пустые клетки до 1-го числа
    for (let i = 0; i < startDow; i++) html += '<div class="cal-day muted"></div>';

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const items = map[key] || [];
      const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
      const dots = items.slice(0, 6).map(() => '<span class="cal-dot"></span>').join('');
      html += `
        <div class="cal-day ${items.length ? 'has' : ''} ${isToday ? 'today' : ''}"
             data-date="${key}" data-count="${items.length}">
          <div class="cal-num">${d}</div>
          <div class="cal-dots">${dots}</div>
          ${items.length > 6 ? `<div class="cal-count">+${items.length - 6}</div>` : ''}
        </div>`;
    }

    // клетки после последнего дня — до полной недели
    const tail = (7 - ((startDow + daysInMonth) % 7)) % 7;
    for (let i = 0; i < tail; i++) html += '<div class="cal-day muted"></div>';

    grid.innerHTML = html;

    // тултип при наведении/тапе
    const tip = $('#calTooltip');
    grid.querySelectorAll('.cal-day.has').forEach(cell => {
      const show = ev => {
        const key = cell.dataset.date;
        const items = map[key] || [];
        if (!items.length) return;
        tip.innerHTML = `<b>${fmtDateRu(key)}</b><br>` +
          items.slice(0, 14).map(it =>
            `• ${esc(it.title.title)} — ${esc(it.entry.kind || '')}`
          ).join('<br>') +
          (items.length > 14 ? `<br>… ещё ${items.length - 14}` : '');
        tip.hidden = false;
        const r = cell.getBoundingClientRect();
        const tw = 260, th = 120;
        let left = r.left + r.width / 2 - tw / 2;
        let top  = r.top - th - 8;
        if (left < 8) left = 8;
        if (left + tw > innerWidth - 8) left = innerWidth - tw - 8;
        if (top < 8) top = r.bottom + 8;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
      };
      cell.addEventListener('mouseenter', show);
      cell.addEventListener('click', show);
      cell.addEventListener('mouseleave', () => { tip.hidden = true; });
      cell.addEventListener('touchstart', e => { e.preventDefault(); show(e); }, { passive: false });
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.cal-day') && !e.target.closest('#calTooltip')) tip.hidden = true;
    });
  }

  function renderCalList(map) {
    const list = $('#calList');
    const keys = Object.keys(map).sort().reverse();
    if (!keys.length) {
      list.innerHTML = '<div class="hint">Пока нет записей о просмотре.</div>';
      return;
    }
    // группировка по месяцам
    const byMonth = {};
    keys.forEach(k => {
      const [y, m] = k.split('-');
      const mk = `${y}-${m}`;
      (byMonth[mk] = byMonth[mk] || []).push(k);
    });
    list.innerHTML = Object.keys(byMonth).sort().reverse().map(mk => {
      const [y, m] = mk.split('-');
      const days = byMonth[mk];
      const rows = days.flatMap(d => {
        const items = map[d];
        return items.map(it => `
          <div class="cal-entry">
            <img src="${esc(it.title.cover || '')}" alt="" onerror="this.style.background='#222'">
            <div class="cal-entry-info">
              <div class="cal-entry-title">${esc(it.title.title)}</div>
              <div class="cal-entry-meta">${fmtDateRu(d)} · ${esc(it.entry.kind || '')}${it.entry.episodes ? ' · ' + it.entry.episodes + ' сер.' : ''}</div>
            </div>
          </div>
        `).join('');
      }).join('');
      return `
        <div>
          <div class="cal-month-title">${MONTHS_RU[+m - 1]} ${y}</div>
          ${rows}
        </div>`;
    }).join('');
  }

  /* ==================== Рендер статистики ==================== */
  function renderStats() {
    if (window.Stats) Stats.render(data.titles);
  }

  /* ==================== Общий рендер ==================== */
  function renderAll() {
    destroySortables();
    renderTierPanel();
    renderLatest();
    renderTierSections();
    renderCalendar();
    renderStats();

    // Футер
    const fs = $('#footerStats');
    if (fs) fs.textContent = `${data.titles.length} тайтлов · ${TIERS.reduce((s, t) => s + data.titles.filter(x => x.tier === t).length, 0)} в тирах`;
  }

  /* ==================== Инициализация фильтров ==================== */
  function initFilters() {
    const gSel = $('#filterGenre');
    if (gSel) {
      ALL_GENRES.forEach(g => {
        const o = document.createElement('option');
        o.value = g; o.textContent = g;
        gSel.appendChild(o);
      });
      gSel.addEventListener('change', () => { filters.genre = gSel.value; renderAll(); });
    }

    const search = $('#searchInput');
    let st = null;
    search.addEventListener('input', () => {
      clearTimeout(st);
      st = setTimeout(() => { filters.q = search.value.trim(); $('#searchClear').hidden = !filters.q; renderAll(); }, 180);
    });
    $('#searchClear').addEventListener('click', () => {
      search.value = ''; filters.q = ''; $('#searchClear').hidden = true; renderAll();
    });

    $('#filterTier').addEventListener('change', e => { filters.tier = e.target.value; renderAll(); });
    $('#filterType').addEventListener('change', e => { filters.type = e.target.value; renderAll(); });
    $('#filterFav').addEventListener('change', e => { filters.fav = e.target.checked; renderAll(); });
    $('#viewMode').addEventListener('change', e => {
      settings.viewMode = e.target.value; saveSettings(); applySettings(); renderAll();
    });
    $('#btnResetFilters').addEventListener('click', resetFilters);
    $('#btnEmptyReset').addEventListener('click', resetFilters);
  }

  function resetFilters() {
    filters = { q: '', tier: '', type: '', genre: '', fav: false };
    $('#searchInput').value = ''; $('#searchClear').hidden = true;
    $('#filterTier').value = ''; $('#filterType').value = ''; $('#filterGenre').value = '';
    $('#filterFav').checked = false;
    renderAll();
  }

  /* ==================== Настройки панели ==================== */
  function initSettings() {
    const panel = $('#settingsPanel');
    const backdrop = $('#settingsBackdrop');

    const open = () => { panel.classList.add('is-open'); backdrop.hidden = false; };
    const close = () => { panel.classList.remove('is-open'); backdrop.hidden = true; };

    $('#btnSettings').addEventListener('click', open);
    $('.tab-settings').addEventListener('click', open);
    $('#btnSettingsClose').addEventListener('click', close);
    backdrop.addEventListener('click', close);

    // ---- Тема ----
    const setTheme = $('#setTheme');
    setTheme.value = settings.theme;
    setTheme.addEventListener('change', () => { settings.theme = setTheme.value; saveSettings(); applySettings(); });

    // ---- Акцент ----
    const colorInput = $('#setAccent');
    colorInput.value = settings.accent;
    colorInput.addEventListener('input', () => {
      settings.accent = colorInput.value; saveSettings(); applySettings(); renderStats();
    });
    const accents = ['#ff5f9e','#ffb547','#7c5cff','#4dabff','#3ddc97','#ff4d6d','#c9184a','#ffe066'];
    $('#accentSwatches').innerHTML = accents.map(c =>
      `<div class="swatch" style="background:${c}" data-color="${c}"></div>`).join('');
    $$('#accentSwatches .swatch').forEach(s => {
      s.addEventListener('click', () => {
        settings.accent = s.dataset.color;
        colorInput.value = s.dataset.color;
        saveSettings(); applySettings(); renderStats();
      });
    });

    // ---- Анимации / параллакс ----
    const an = $('#setAnimations');
    an.checked = settings.animations;
    an.addEventListener('change', () => { settings.animations = an.checked; saveSettings(); applySettings(); });
    const px = $('#setParallax');
    px.checked = settings.parallax;
    px.addEventListener('change', () => { settings.parallax = px.checked; saveSettings(); });

    // ---- Пресеты частиц ----
    renderPresetGrid();

    // ---- Ползунки частиц ----
    const dEl = $('#setDensity'), sEl = $('#setSpeed'), zEl = $('#setSize');
    dEl.value = settings.density;
    sEl.value = settings.speed;
    zEl.value = settings.size;
    $('#valDensity').textContent = settings.density;
    $('#valSpeed').textContent = Number(settings.speed).toFixed(1);
    $('#valSize').textContent = Number(settings.size).toFixed(1);

    dEl.addEventListener('input', () => {
      settings.density = +dEl.value; $('#valDensity').textContent = dEl.value;
      saveSettings(); applySettings();
    });
    sEl.addEventListener('input', () => {
      settings.speed = +sEl.value; $('#valSpeed').textContent = Number(sEl.value).toFixed(1);
      saveSettings(); applySettings();
    });
    zEl.addEventListener('input', () => {
      settings.size = +zEl.value; $('#valSize').textContent = Number(zEl.value).toFixed(1);
      saveSettings(); applySettings();
    });

    // ---- Вид / размер / колонки ----
    const vm = $('#setViewMode');
    vm.value = settings.viewMode;
    vm.addEventListener('change', () => {
      settings.viewMode = vm.value; $('#viewMode').value = vm.value;
      saveSettings(); applySettings(); renderAll();
    });

    const cs = $('#setCardSize');
    cs.value = settings.cardSize;
    $('#valCardSize').textContent = Number(settings.cardSize).toFixed(2);
    cs.addEventListener('input', () => {
      settings.cardSize = +cs.value;
      $('#valCardSize').textContent = Number(cs.value).toFixed(2);
      document.documentElement.style.setProperty('--card-scale', settings.cardSize);
      saveSettings();
    });

    const colEl = $('#setColumns');
    colEl.value = settings.columns;
    $('#valColumns').textContent = settings.columns;
    colEl.addEventListener('input', () => {
      settings.columns = +colEl.value; $('#valColumns').textContent = colEl.value;
      saveSettings(); applySettings(); renderAll();
    });

    // ---- Длительности по умолчанию ----
    const ae = $('#setAvgEpisode'), am = $('#setAvgMovie');
    ae.value = settings.avgEpisode; am.value = settings.avgMovie;
    ae.addEventListener('change', () => { settings.avgEpisode = +ae.value || 24; saveSettings(); applySettings(); renderAll(); });
    am.addEventListener('change', () => { settings.avgMovie   = +am.value || 110; saveSettings(); applySettings(); renderAll(); });
  }

  function renderPresetGrid() {
    const grid = $('#presetGrid');
    if (!grid || !window.FX) return;
    grid.innerHTML = Object.keys(FX.presets).map(key => {
      const p = FX.presets[key];
      return `<button class="preset-btn ${settings.preset === key ? 'is-active' : ''}"
        data-preset="${key}" title="${p.label}" type="button">${p.icon}<small>${p.label}</small></button>`;
    }).join('');
    grid.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.preset = btn.dataset.preset;
        grid.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        saveSettings(); applySettings();
      });
    });
  }

  /* ==================== Модалка: закрытие ==================== */
  function initModal() {
    $('#modalClose').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if ($('#titleModal').classList.contains('is-open')) closeModal();
        if ($('#editorModal') && $('#editorModal').classList.contains('is-open')) closeEditor();
      }
    });
    // ВАЖНО: клик по оверлею НЕ закрывает модалку
  }

  /* ==================== Табы ==================== */
  function initTabs() {
    $$('.tab').forEach(t => {
      t.addEventListener('click', () => {
        const name = t.dataset.tab;
        if (name === 'settings') return; // открывает панель
        $$('.tab').forEach(x => x.classList.remove('is-active'));
        t.classList.add('is-active');
        $$('.view').forEach(v => v.classList.remove('is-active'));
        const view = document.getElementById('view-' + name);
        if (view) view.classList.add('is-active');
        if (name === 'stats') setTimeout(renderStats, 60);
        if (name === 'calendar') setTimeout(renderCalendar, 60);
        // закрыть бургер
        $('#mainTabs').classList.remove('is-open');
      });
    });
    $('#btnBurger').addEventListener('click', () => {
      $('#mainTabs').classList.toggle('is-open');
    });
  }

  /* ==================== Календарь: навигация ==================== */
  function initCalendarControls() {
    $('#calPrev').addEventListener('click', () => {
      currentCalDate.setMonth(currentCalDate.getMonth() - 1);
      renderCalendar();
    });
    $('#calNext').addEventListener('click', () => {
      currentCalDate.setMonth(currentCalDate.getMonth() + 1);
      renderCalendar();
    });
    $('#calToday').addEventListener('click', () => {
      currentCalDate = new Date();
      renderCalendar();
    });
    $$('#calModeSwitch .seg').forEach(btn => {
      btn.addEventListener('click', () => {
        calMode = btn.dataset.calmode;
        $$('#calModeSwitch .seg').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        renderCalendar();
      });
    });
  }

  /* ==================== Параллакс фона ==================== */
  function initParallax() {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', e => {
      if (!settings.parallax) return;
      tx = (e.clientX / innerWidth - 0.5) * 30;
      ty = (e.clientY / innerHeight - 0.5) * 30;
    });
    (function loop() {
      if (settings.parallax) {
        cx += (tx - cx) * 0.06;
        cy += (ty - cy) * 0.06;
        document.documentElement.style.setProperty('--par-x', cx.toFixed(2) + 'px');
        document.documentElement.style.setProperty('--par-y', cy.toFixed(2) + 'px');
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ==================== Owner: загрузка admin.js ==================== */
  async function ensureAdmin() {
    if (!IS_OWNER) return;
    document.body.dataset.owner = 'true';
    const badge = $('#ownerBadge'); if (badge) badge.hidden = false;
    $$('[data-owner-only]').forEach(el => el.hidden = false);
    $('#btnAddTitle').hidden = false;

    // Динамически подгружаем admin.js если его нет
    if (!window.Admin) {
      await new Promise(res => {
        const s = document.createElement('script');
        s.src = 'js/admin.js';
        s.onload = res;
        s.onerror = () => { console.warn('admin.js не найден'); res(); };
        document.body.appendChild(s);
      });
    }
    if (window.Admin && window.Admin.init) {
      window.Admin.init({
        getData: () => data,
        setData: (d) => { data = d; scheduleSaveLocal(); renderAll(); },
        saveLocal: scheduleSaveLocal,
        renderAll,
        renderStats,
        openEditor,
        closeEditor,
        toast
      });
    }
  }

  /* ==================== Редактор (используется admin.js) ==================== */
  function openEditor(t) { if (window.Admin) window.Admin.openEditor(t); }
  function closeEditor() { if (window.Admin) window.Admin.closeEditor(); }

  /* ==================== Старт ==================== */
  async function init() {
    loadSettings();
    applySettings();
    await loadData();

    initFilters();
    initSettings();
    initModal();
    initTabs();
    initCalendarControls();
    initParallax();

    renderAll();
    await ensureAdmin();

    // Слушаем изменение localStorage (например, из другой вкладки)
    window.addEventListener('storage', e => {
      if (e.key === LS.data) {
        try {
          const d = JSON.parse(e.newValue);
          if (d && Array.isArray(d.titles)) { data = d; renderAll(); }
        } catch (_) {}
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  /* ==================== Экспорт для admin.js ==================== */
  window.AppAPI = {
    get data() { return data; },
    set data(d) { data = d; },
    get settings() { return settings; },
    saveSettings,
    applySettings,
    renderAll,
    renderStats,
    renderCalendar,
    scheduleSaveLocal,
    setSaveStatus,
    toast,
    ALL_GENRES,
    TIERS,
    TIER_LABELS,
    esc,
    fmtMinutes,
    fmtDateRu,
    calcTitleMinutes,
    IS_OWNER
  };
})();
