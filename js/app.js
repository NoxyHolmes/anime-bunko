/* ============================================================
   АНИМЕ-АРХИВ — app.js
   Ядро приложения: данные, настройки, рендер архива, drag&drop,
   поиск/фильтры, модалки, форма тайтла, календарь, настройки.
   Модули particles.js и stats.js загружены ДО этого файла
   и вызываются через window.ArchiveParticles / window.ArchiveStats.
   Админ-функции (admin.js) подписываются на события через App.on().
   ============================================================ */
'use strict';

/* ============================================================
   0. КОНСТАНТЫ
   ============================================================ */

// Тиры: сверху вниз по убыванию
const TIERS = [
  { key: 'SSS', name: 'Шедевр',      hint: 'Высшие творения' },
  { key: 'S',   name: 'Великолепно', hint: 'Очень сильно' },
  { key: 'A',   name: 'Отлично',     hint: 'Крепкий уровень' },
  { key: 'B',   name: 'Хорошо',      hint: 'С удовольствием' },
  { key: 'C',   name: 'Средне',      hint: 'Без ярких эмоций' },
  { key: 'D',   name: 'Слабо',       hint: 'Дотянул с трудом' },
  { key: 'E',   name: 'Плохо',       hint: 'Не зашло' },
];
const TIER_KEYS = TIERS.map(t => t.key);

// Типы тайтлов
const TYPES = ['TV-сериал', 'Фильм', 'OVA', 'ONA', 'Спешл', 'TV-спешл'];

// Виды составных частей
const ENTRY_KINDS = [
  'Сезон 1', 'Сезон 2', 'Сезон 3', 'Сезон 4', 'Сезон 5', 'Сезон 6',
  'Сезон 7', 'Сезон 8', 'Фильм', 'Спешл', 'TV-спешл', 'OVA', 'ONA',
];

// Полный список жанров (сортируем по алфавиту средствами локали)
const GENRES = [
  'Экшен/Боевик', 'Приключения', 'Комедия', 'Гэг-юмор', 'Пародия', 'Драма',
  'Фэнтези', 'Тёмное фэнтези', 'Ужасы', 'Мистика', 'Триллер', 'Саспенс',
  'Психологическое', 'Романтика', 'Романтическая комедия', 'Научная фантастика',
  'Киберпанк', 'Постапокалиптика', 'Дистопия', 'Стимпанк', 'Меха', 'Космос',
  'Повседневность', 'Спорт', 'Сверхъестественное', 'Вампиры', 'Зомби', 'Демоны',
  'Ангелы', 'Мифология', 'Магия', 'Сверхспособности', 'Военное', 'Полиция',
  'Детектив', 'Расследование', 'Самураи', 'Ниндзя', 'Боевые искусства',
  'Историческое', 'Исекай', 'Обратный исекай', 'Путешествия во времени',
  'Гарем', 'Обратный гарем', 'Этти', 'Школа', 'Университет', 'Офис/Работа',
  'Медицина', 'Кулинария', 'Музыка', 'Идолы', 'Танцы', 'Театр', 'Игра',
  'Видеоигры', 'Настольные игры', 'Карты', 'Гэмблинг', 'Стратегия', 'Гонки',
  'Авто/Мото', 'Выживание', 'Природа/Экология', 'Животные', 'ИИ и роботы',
  'Виртуальная реальность', 'Сёнэн', 'Сёдзё', 'Сэйнэн', 'Дзёсэй', 'Сёнэн-ай',
  'Сёдзё-ай', 'Авангард', 'Детское', 'Семейное',
].sort((a, b) => a.localeCompare(b, 'ru'));

// Пресеты фоновой анимации (ключи согласованы с particles.js)
const PRESETS = [
  { key: 'none',          name: 'Выключено',       color: '#807d92' },
  { key: 'sakura',        name: 'Сакура',          color: '#ff9ec6' },
  { key: 'sakura-white',  name: 'Белая сакура',    color: '#f3eefb' },
  { key: 'roses-red',     name: 'Красные розы',    color: '#e0244a' },
  { key: 'petals-white',  name: 'Белые лепестки',  color: '#efe7f2' },
  { key: 'petals-yellow', name: 'Жёлтые лепестки', color: '#ffd44d' },
  { key: 'snow',          name: 'Снег',            color: '#eaf6ff' },
  { key: 'rain',          name: 'Ливень',          color: '#7fb2ff' },
  { key: 'drizzle',       name: 'Морось',          color: '#a9c8ff' },
  { key: 'leaves',        name: 'Осенние листья',  color: '#e8823a' },
  { key: 'fireflies',     name: 'Светлячки',       color: '#ffe97a' },
  { key: 'stars-fall',    name: 'Падающие звёзды', color: '#fff3c9' },
  { key: 'stardust',      name: 'Звёздная пыль',   color: '#cdb4ff' },
  { key: 'bubbles',       name: 'Пузырьки',        color: '#9adcff' },
  { key: 'confetti',      name: 'Конфетти',        color: '#ff7ab8' },
  { key: 'feathers',      name: 'Пёрышки',         color: '#f0e8da' },
  { key: 'hearts',        name: 'Сердечки',        color: '#ff5d7d' },
  { key: 'butterflies',   name: 'Бабочки',         color: '#7ee3c9' },
  { key: 'clover',        name: 'Зелёный клевер',  color: '#4ade80' },
  { key: 'sparks',        name: 'Искры фейерверка', color: '#ffb84d' },
  { key: 'petals-night',  name: 'Ночные лепестки', color: '#6f8fff' },
];

// Ключи localStorage
const LS_DATA = 'animeArchive.data';
const LS_SET  = 'animeArchive.settings';

// Настройки по умолчанию
const DEFAULT_SETTINGS = {
  theme: 'dark',            // 'dark' | 'light'
  accent: '#ff4d6d',        // акцентный цвет сайта
  animations: true,         // все анимации вкл/выкл
  viewMode: 'grid',         // grid | list | compact
  cardSize: 1,              // множитель размера карточек
  columns: 'auto',          // 'auto' | 6..10 — колонки на десктопе
  avgEpisode: 24,           // средняя длительность серии, мин
  avgMovie: 110,            // средняя длительность фильма, мин
  calMode: 'grid',          // календарь | список
  particles: { preset: 'sakura', density: 40, speed: 1, size: 1 },
};

// Русские названия месяцев
const MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

/* ============================================================
   1. МИНИ-ХЕЛПЕРЫ
   ============================================================ */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Экранирование HTML — защита от injection через пользовательские строки
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Уникальный id тайтла
const uid = () => (crypto.randomUUID
  ? crypto.randomUUID()
  : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9));

// Глубокое слияние настроек с дефолтами
function deepMerge(base, extra) {
  const out = { ...base };
  for (const k in extra) {
    out[k] = (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]))
      ? deepMerge(base[k] ?? {}, extra[k])
      : extra[k];
  }
  return out;
}

// Локальная дата без сдвига таймзоны: 'YYYY-MM-DD' -> Date
function parseISODate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

// Разбор даты просмотра: одиночная дата или период «дата – дата».
// Событием считается ДАТА НАЧАЛА просмотра (для календаря и динамики).
function parseWatchDate(v) {
  if (!v) return null;
  const parts = String(v).split(/[–—]/).map(s => s.trim()).filter(Boolean);
  const start = parseISODate(parts[0]);
  if (!start) return null;
  const end = parseISODate(parts[1] || '') || start;
  return { start, end, label: String(v).trim() };
}

const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Форматирование минут: «12 ч 34 мин»
function fmtMin(min) {
  min = Math.round(Number(min) || 0);
  if (min <= 0) return '0 мин';
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} мин`;
  if (!m) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

const fmtDateRu = d => `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;

/* ---------- Вычисление времени просмотра ---------- */

// Минуты одной составной части
function entryMinutes(entry, settings, titleType) {
  const e = entry || {};
  if (e.durationMinutes != null) return Number(e.durationMinutes) || 0;
  const eps = Number(e.episodes) || 0;
  if (eps > 0) return eps * (e.minutesPerEpisode ?? settings.avgEpisode);
  // Нет ни серий, ни длительности: если это фильм — берём среднюю по фильму
  if (e.kind === 'Фильм' || titleType === 'Фильм') return settings.avgMovie;
  return 0;
}

// Суммарное время тайтла
const titleMinutes = (t, s) => (t.entries || []).reduce((sum, e) => sum + entryMinutes(e, s, t.type), 0);

// Суммарное количество серий тайтла
const totalEpisodes = t => (t.entries || []).reduce((n, e) => n + (Number(e.episodes) || 0), 0);

/* ---------- Цветовые утилиты (для акцента) ---------- */
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 77, b: 109 };
}
const rgba = (hex, a) => { const { r, g, b } = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = v => Math.min(255, Math.round(v + 255 * amt));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ============================================================
   2. СОСТОЯНИЕ ПРИЛОЖЕНИЯ
   ============================================================ */
const state = {
  titles: [],
  settings: deepMerge(DEFAULT_SETTINGS, {}),
  filters: { tiers: new Set(), types: new Set(), genres: new Set(), favOnly: false },
  search: '',
  tab: 'archive',
  calDate: new Date(),          // отображаемый месяц календаря
  events: new Map(),            // 'YYYY-MM-DD' -> [{ title, entry }]
  form: null,                   // состояние открытой формы
  popCell: null,                // ячейка календаря с открытым поповером
};

// Режим владельца: admin.html (data-owner="1") или index.html?mode=owner
const isOwner = document.body.dataset.owner === '1'
  || new URLSearchParams(location.search).get('mode') === 'owner';

/* ---------- Мини-шина событий (для admin.js / stats.js) ---------- */
const bus = {};
function on(evt, fn) { (bus[evt] ||= []).push(fn); }
function emit(evt, data) { (bus[evt] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }

/* ============================================================
   3. ЗАГРУЗКА И СОХРАНЕНИЕ ДАННЫХ
   ============================================================ */

// Загрузка каталога.
// Логика:
//  • Владелец: приоритет у localStorage — там лежит рабочая копия
//    (автосохранение), возможно более свежая, чем data.json на GitHub.
//  • Публичный режим: сначала data.json (свежее с сервера),
//    при неудаче (например, открытие с file://) — localStorage.
async function loadTitles() {
  const local = readLocalTitles();
  if (isOwner && local) { state.titles = local; return; }
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.titles = Array.isArray(data) ? data : (data.titles || []);
  } catch {
    state.titles = local || [];
    if (local) showToast('GitHub недоступен — показана локальная копия', 'info');
  }
}

function readLocalTitles() {
  try {
    const raw = localStorage.getItem(LS_DATA);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data?.titles) ? data.titles : null;
  } catch { return null; }
}

// Немедленная запись в localStorage
function saveToLocal() {
  try {
    localStorage.setItem(LS_DATA, JSON.stringify({
      titles: state.titles,
      savedAt: new Date().toISOString(),
    }));
    emit('local-saved');
  } catch (e) {
    showToast('Не удалось сохранить в localStorage: ' + e.message, 'err');
  }
}

// Автосохранение с debounce 500 мс (только владелец — публичный режим каталог не меняет)
let autosaveTimer = null;
function scheduleAutosave() {
  if (!isOwner) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveToLocal, 500);
}

// Принудительно взять свежий data.json с сервера (кнопка в админке)
async function forceRemoteLoad() {
  const res = await fetch('data.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  state.titles = Array.isArray(data) ? data : (data.titles || []);
  renderAll();
  showToast('Данные заново загружены с GitHub', 'ok');
}

/* ---------- Настройки ---------- */
function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SET);
    if (raw) state.settings = deepMerge(DEFAULT_SETTINGS, JSON.parse(raw));
  } catch { /* повреждённые настройки — используем дефолт */ }
}

function persistSettings() {
  try { localStorage.setItem(LS_SET, JSON.stringify(state.settings)); } catch { /* ignore */ }
}

/* ============================================================
   4. ПРИМЕНЕНИЕ НАСТРОЕК (мгновенно, без перезагрузки)
   ============================================================ */
function applySettings() {
  const s = state.settings;
  const root = document.documentElement;

  // Тема
  root.dataset.theme = s.theme;

  // Глобальное отключение анимаций
  root.classList.toggle('no-anim', !s.animations);

  // Акцентный цвет и его производные
  root.style.setProperty('--accent', s.accent);
  root.style.setProperty('--accent-2', lighten(s.accent, 0.16));
  root.style.setProperty('--accent-soft', rgba(s.accent, 0.15));

  // Параметры сетки карточек (наследуются всеми .cards)
  const sections = $('#tier-sections');
  if (sections) {
    sections.style.setProperty('--card-target', Math.round(150 * (s.cardSize || 1)) + 'px');
    sections.style.setProperty('--cols-fix', String(s.columns));
  }

  // Фоновые частицы
  if (window.ArchiveParticles) ArchiveParticles.apply(s);

  emit('settings-changed', s);
}

// Изменить настройку: сохранить + применить + оповестить
function setSetting(key, value) {
  state.settings[key] = value;
  persistSettings();
  applySettings();
}

/* ============================================================
   5. ФИЛЬТРАЦИЯ И ПОИСК
   ============================================================ */
function matchesFilters(t) {
  const f = state.filters;
  if (f.tiers.size && !f.tiers.has(t.tier)) return false;
  if (f.types.size && !f.types.has(t.type)) return false;
  if (f.genres.size && !(t.genres || []).some(g => f.genres.has(g))) return false;
  if (f.favOnly && !t.favorite) return false;
  if (state.search) {
    const q = state.search.toLowerCase();
    const hay = (t.title + ' ' + (t.titleOriginal || '')).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

const visibleTitles = () => state.titles.filter(matchesFilters);
const hasActiveFilters = () =>
  state.filters.tiers.size || state.filters.types.size || state.filters.genres.size || state.filters.favOnly;

/* ============================================================
   6. РЕНДЕР: ОБЛОЖКИ
   ============================================================ */
// HTML обложки: картинка или заглушка с первой буквой названия
function coverHTML(t, size) {
  const cls = size === 'lg' ? 'cover-fallback cover-fallback--lg' : 'cover-fallback cover-fallback--sm';
  if (!t.cover) {
    return `<div class="${cls}" data-tier="${esc(t.tier)}">${esc((t.title || '?').trim()[0] || '?')}</div>`;
  }
  return `<img class="cover-img" src="${esc(t.cover)}" alt="" loading="lazy" draggable="false">`;
}

// После каждого innerHTML: плавное появление картинок + заглушка при ошибке загрузки
function hydrateImages(root) {
  $$('img.cover-img', root).forEach(img => {
    img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    img.addEventListener('error', () => {
      const fb = document.createElement('div');
      fb.className = 'cover-fallback';
      fb.dataset.tier = img.closest('[data-tier]')?.dataset.tier || 'S';
      fb.textContent = '?';
      const card = img.closest('.title-card, .recent-card, .tm-cover');
      if (card) {
        const name = card.dataset.name || '';
        fb.textContent = name.trim()[0] || '?';
      }
      if (fb.classList && img.parentElement) {
        fb.classList.add(img.closest('.tm-cover') ? 'cover-fallback--lg' : 'cover-fallback--sm');
        img.replaceWith(fb);
      }
    }, { once: true });
    if (img.complete && img.naturalWidth > 0) img.classList.add('is-loaded');
  });
}

/* ============================================================
   7. РЕНДЕР: ЛЕНТА «ПОСЛЕДНИЕ ДОБАВЛЕННЫЕ»
   ============================================================ */
function renderRecentStrip() {
  const strip = $('#recent-strip');
  const recent = [...state.titles]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, 10);

  $('#recent-count').textContent = recent.length
    ? `${recent.length} из ${state.titles.length}` : '';

  strip.innerHTML = recent.map(t => `
    <div class="recent-card" data-id="${esc(t.id)}" data-tier="${esc(t.tier)}" data-name="${esc(t.title)}" title="${esc(t.title)}">
      <div class="recent-card__cover">${coverHTML(t, 'sm')}</div>
      <span class="recent-card__stripe"></span>
      <p class="recent-card__title">${esc(t.title)}</p>
    </div>`).join('');
  hydrateImages(strip);
}

/* ============================================================
   8. РЕНДЕР: ПАНЕЛЬ ТИРОВ (количество + проценты)
   ============================================================ */
function renderTierBar() {
  const total = state.titles.length;
  const bar = $('#tier-bar');
  bar.innerHTML = TIERS.map(({ key, name }, i) => {
    const count = state.titles.filter(t => t.tier === key).length;
    const pct = total ? Math.round(count / total * 100) : 0;
    const on = state.filters.tiers.has(key) ? ' is-on' : '';
    return `
      <button class="tier-chip${on}" data-tier="${key}" data-tier-filter="${key}"
              title="${esc(name)} — фильтр" aria-label="Тир ${key}: ${count} тайтлов, ${pct}%">
        <span class="tier-letter" data-tier="${key}" style="--letter-delay:${(-i * 0.9).toFixed(1)}s">${key}</span>
        <span class="tier-chip__stats">
          <span class="tier-chip__count">${count}</span>
          <span class="tier-chip__pct">${pct}%</span>
        </span>
      </button>`;
  }).join('');
}

/* ============================================================
   9. РЕНДЕР: КАРТОЧКИ ТАЙТЛОВ (3 вида)
   ============================================================ */
function titleCardHTML(t, view) {
  const s = state.settings;
  const min = titleMinutes(t, s);
  const eps = totalEpisodes(t);
  const timeIcon = '<svg class="icon"><use href="#i-clock"/></svg>';
  const meta = eps
    ? `${esc(t.type)} · ${eps} эп.`
    : esc(t.type);

  // Значки на обложке: корона SSS, сердечко любимого
  const badges = `
    <div class="title-card__badges">
      ${t.tier === 'SSS' ? '<span class="badge badge--crown" title="Шедевр"><svg class="icon"><use href="#i-crown"/></svg></span>' : ''}
      ${t.favorite ? '<span class="badge badge--heart" title="Любимый тайтл"><svg class="icon"><use href="#i-heart"/></svg></span>' : ''}
    </div>`;

  const time = `<span class="title-card__time">${timeIcon}${fmtMin(min)}</span>`;

  if (view === 'compact') {
    return `
      <article class="title-card title-card--compact" data-id="${esc(t.id)}" data-tier="${esc(t.tier)}" data-name="${esc(t.title)}">
        <div class="title-card__cover">${coverHTML(t, 'sm')}</div>
        <div class="title-card__body">
          <h4 class="title-card__title">${esc(t.title)}</h4>
          <span class="title-card__meta">${meta}</span>
          ${time}
        </div>
      </article>`;
  }

  if (view === 'list') {
    return `
      <article class="title-card title-card--list" data-id="${esc(t.id)}" data-tier="${esc(t.tier)}" data-name="${esc(t.title)}">
        <div class="title-card__cover">${coverHTML(t, 'sm')}${badges}</div>
        <div class="title-card__body">
          <h4 class="title-card__title">${esc(t.title)}</h4>
          <span class="title-card__meta">${meta}</span>
          ${time}
        </div>
      </article>`;
  }

  // Вид «сетка» (по умолчанию)
  return `
    <article class="title-card" data-id="${esc(t.id)}" data-tier="${esc(t.tier)}" data-name="${esc(t.title)}">
      <div class="title-card__cover">${coverHTML(t, 'sm')}${badges}</div>
      <div class="title-card__body">
        <h4 class="title-card__title">${esc(t.title)}</h4>
        <span class="title-card__meta">${meta}</span>
        ${time}
      </div>
    </article>`;
}

/* ============================================================
   10. РЕНДЕР: СЕКЦИИ ТИРОВ + DRAG & DROP
   ============================================================ */
function renderTierSections() {
  const s = state.settings;
  const wrap = $('#tier-sections');
  const list = visibleTitles();
  const anyFilter = hasActiveFilters() || !!state.search;

  // Параметры сетки
  wrap.style.setProperty('--card-target', Math.round(150 * (s.cardSize || 1)) + 'px');
  wrap.style.setProperty('--cols-fix', String(s.columns));

  wrap.innerHTML = TIERS.map(({ key, name, hint }, i) => {
    // При фильтре по тирам показываем только выбранные секции
    if (state.filters.tiers.size && !state.filters.tiers.has(key)) return '';

    const items = list.filter(t => t.tier === key);
    const totalMin = items.reduce((sum, t) => sum + titleMinutes(t, s), 0);

    const cards = items.length
      ? `<div class="cards${s.columns !== 'auto' ? ' cards--fixed' : ''}"
             data-tier="${key}"
             style="grid-template-columns:${s.columns !== 'auto'
                ? `repeat(${s.columns}, minmax(0,1fr))`
                : `repeat(auto-fill, minmax(${Math.round(150 * (s.cardSize || 1))}px, 1fr))`};">
           ${items.map(t => titleCardHTML(t, s.viewMode)).join('')}
         </div>`
      : `<div class="cards" data-tier="${key}" style="grid-template-columns:1fr;">
           <p class="empty-note" style="padding:26px 14px;text-align:center;border:1.5px dashed var(--border);border-radius:12px;">
             ${anyFilter ? 'По текущему фильтру здесь пусто' : 'Пока пусто — можно перетащить карточку сюда'}
           </p>
         </div>`;

    return `
      <section class="tier-section" data-tier="${key}">
        <header class="tier-section__head">
          <span class="tier-letter" data-tier="${key}" style="--letter-delay:${(-i * 1.1).toFixed(1)}s">${key}</span>
          <div class="tier-section__caption">
            <div class="tier-section__name">${esc(name)}</div>
            <div class="tier-section__hint">${esc(hint)}</div>
          </div>
          <div class="tier-section__meta">
            ${items.length} тайтл${items.length % 10 === 1 && items.length !== 11 ? '' : 'ов'} · ${fmtMin(totalMin)}
          </div>
        </header>
        ${cards}
      </section>`;
  }).join('');

  hydrateImages(wrap);
  $('#empty-state').hidden = !(list.length === 0);
  if (list.length === 0) {
    const es = $('#empty-state');
    if (!state.titles.length) {
      $('.empty-title', es).textContent = 'Каталог пуст';
      $('.empty-note', es).textContent = 'В data.json пока нет тайтлов';
    } else {
      $('.empty-title', es).textContent = 'Ничего не найдено';
      $('.empty-note', es).textContent = 'Попробуйте изменить запрос или сбросить фильтры';
    }
  }
  updateToolbar();
  if (isOwner && typeof Sortable !== 'undefined') initSortable();
}

// Обновить счётчик в тулбаре
function updateToolbar() {
  const shown = visibleTitles().length;
  $('#toolbar-count').textContent = state.search || hasActiveFilters()
    ? `Показано ${shown} из ${state.titles.length}`
    : `Всего: ${state.titles.length} тайтл(ов)`;
  // Подсветка активной кнопки вида
  $$('#view-switch .view-btn').forEach(b =>
    b.classList.toggle('is-active', b.dataset.view === state.settings.viewMode));
}

/* ---------- Инициализация SortableJS на всех сетках ---------- */
function initSortable() {
  $$('#tier-sections .cards').forEach(grid => {
    new Sortable(grid, {
      group: 'tiers',                 // общий буфер — перетаскивание между тирами
      animation: 220,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      delay: 140,                     // задержка перед драгом…
      delayOnTouchOnly: true,         // …только на таче (чтобы не мешать скроллу)
      fallbackTolerance: 4,
      // Подсветка секции-приёмника во время перетаскивания
      onMove(evt) {
        $$('.tier-section.is-drop').forEach(x => x.classList.remove('is-drop'));
        evt.to?.closest('.tier-section')?.classList.add('is-drop');
      },
      onEnd(evt) {
        $$('.tier-section.is-drop').forEach(x => x.classList.remove('is-drop'));
        handleDrop(evt);
      },
    });
  });
}

/* ---------- Обработка завершения перетаскивания ---------- */
function handleDrop(evt) {
  const item = evt.item;
  const id = item?.dataset.id;
  const sec = item?.closest('.tier-section');
  if (!id || !sec) return;

  const t = state.titles.find(x => x.id === id);
  if (!t) return;

  const oldTier = t.tier;
  const toTier = sec.dataset.tier;

  // DOM-порядок видимых карточек секции-приёмника
  const ids = $$('.title-card', sec).map(el => el.dataset.id);
  const pos = ids.indexOf(id);
  const nextId = pos >= 0 && pos < ids.length - 1 ? ids[pos + 1] : null;

  // Переставляем в массиве данных
  state.titles = state.titles.filter(x => x.id !== id);
  t.tier = toTier;

  let insertIdx;
  const nextT = nextId ? state.titles.find(x => x.id === nextId) : null;
  if (nextT) {
    insertIdx = state.titles.indexOf(nextT);            // перед следующей видимой карточкой
  } else {
    let lastIdx = -1;                                    // после последнего тайтла тира
    state.titles.forEach((x, i) => { if (x.tier === toTier) lastIdx = i; });
    if (lastIdx >= 0) insertIdx = lastIdx + 1;
    else {
      const rank = TIER_KEYS.indexOf(toTier);            // перед тиром ниже рангом
      insertIdx = state.titles.findIndex(x => TIER_KEYS.indexOf(x.tier) > rank);
      if (insertIdx < 0) insertIdx = state.titles.length;
    }
  }
  state.titles.splice(insertIdx, 0, t);

  // Если тир сменился — перерендер карточки на месте + плавная «перекраска»
  if (oldTier !== toTier) {
    item.outerHTML = titleCardHTML(t, state.settings.viewMode);
    hydrateImages(sec);
    const fresh = sec.querySelector(`.title-card[data-id="${CSS.escape(id)}"]`);
    fresh?.animate(
      [{ filter: 'brightness(2) saturate(1.7)' }, { filter: 'brightness(1) saturate(1)' }],
      { duration: 700, easing: 'cubic-bezier(.2,.8,.3,1)' }
    );
  }

  // Обновляем зависимые блоки и сохраняем
  renderTierBar();
  updateSectionMetas();
  scheduleAutosave();
  emit('data-changed');
}

// Обновить меты секций (количество · время) без полного ререндера
function updateSectionMetas() {
  const s = state.settings;
  $$('#tier-sections .tier-section').forEach(sec => {
    const items = state.titles.filter(t => t.tier === sec.dataset.tier);
    const total = items.reduce((sum, t) => sum + titleMinutes(t, s), 0);
    const meta = $('.tier-section__meta', sec);
    if (meta) meta.textContent = `${items.length} тайтл(ов) · ${fmtMin(total)}`;
  });
}

/* ============================================================
   11. МОДАЛЬНЫЕ ОКНА (закрытие: только крестик или Esc)
   ============================================================ */
function openModal(el) {
  el.classList.add('is-open');
  el.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  $('.modal-close', el)?.focus({ preventScroll: true });
}
function closeModal(el) {
  el.classList.remove('is-open');
  el.setAttribute('aria-hidden', 'true');
  if (!$('.modal.is-open')) document.body.style.overflow = '';
}

/* ---------- Модалка тайтла ---------- */
function openTitleModal(id) {
  const t = state.titles.find(x => x.id === id);
  if (!t) return;
  const s = state.settings;
  const total = titleMinutes(t, s);
  const body = $('#modal-title-body');

  const entriesHTML = (t.entries || []).map(e => {
    const mins = entryMinutes(e, s, t.type);
    const eps = Number(e.episodes) || 0;
    const epsInfo = eps
      ? `<span class="tm-entry__eps">${eps} эп. × ${e.minutesPerEpisode ?? s.avgEpisode} мин</span>`
      : `<span class="tm-entry__eps">фильм</span>`;
    const pd = parseWatchDate(e.watchDate);
    return `
      <div class="tm-entry" data-tier="${esc(t.tier)}">
        <span class="tm-entry__kind">${esc(e.kind)}</span>
        <span class="tm-entry__date">${pd ? esc(e.watchDate) : 'дата не указана'}</span>
        ${epsInfo}
        <span class="tm-entry__time"><svg class="icon"><use href="#i-clock"/></svg>${fmtMin(mins)}</span>
      </div>`;
  }).join('');

  body.innerHTML = `
    <div class="tm-head">
      <div class="tm-cover" data-tier="${esc(t.tier)}">${coverHTML(t, 'lg')}</div>
      <div class="tm-info">
        <div class="tm-tier" data-tier="${esc(t.tier)}">
          <span class="tier-letter" data-tier="${esc(t.tier)}" style="--letter-delay:-1.2s">${esc(t.tier)}</span>
          <span>${esc(TIERS.find(x => x.key === t.tier)?.name || '')}</span>
        </div>
        <h3 class="tm-title" id="modal-title-heading">${esc(t.title)}</h3>
        ${t.titleOriginal ? `<p class="tm-original">${esc(t.titleOriginal)}</p>` : ''}
        <div class="tm-tags">
          <span class="tm-tag tm-tag--type">${esc(t.type)}</span>
          ${t.favorite ? `<span class="tm-tag tm-tag--fav"><svg class="icon"><use href="#i-heart"/></svg>Любимый</span>` : ''}
          ${(t.genres || []).map(g => `<span class="tm-tag">${esc(g)}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="tm-subhead">Составные части</div>
    ${entriesHTML || '<p class="empty-note">Составные части не добавлены</p>'}
    <div class="tm-total">
      <span>Общее время просмотра</span>
      <span><svg class="icon"><use href="#i-clock"/></svg>${fmtMin(total)}</span>
    </div>
    ${isOwner ? `
      <div class="tm-actions">
        <button class="btn btn--accent" data-act="edit">
          <svg class="icon"><use href="#i-edit"/></svg>Редактировать
        </button>
        <button class="btn btn--danger" data-act="del">
          <svg class="icon"><use href="#i-trash"/></svg>Удалить
        </button>
      </div>` : ''}
  `;
  hydrateImages(body);
  body.dataset.titleId = id;
  openModal($('#modal-title'));
}

// Кнопки модалки тайтла (делегирование): редактировать / двухшаговое удаление
 $('#modal-title-body').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = $('#modal-title-body').dataset.titleId;
  if (btn.dataset.act === 'edit') {
    closeModal($('#modal-title'));
    openForm(id, { backToTitle: true });
  }
  if (btn.dataset.act === 'del') {
    // Первый клик — «взводим» кнопку, второй — удаляем (без системных confirm)
    if (btn.dataset.armed) {
      state.titles = state.titles.filter(x => x.id !== id);
      closeModal($('#modal-title'));
      renderAll();
      scheduleAutosave();
      emit('data-changed');
      showToast('Тайтл удалён из архива', 'ok');
    } else {
      btn.dataset.armed = '1';
      btn.textContent = 'Точно удалить?';
      setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.innerHTML = '<svg class="icon"><use href="#i-trash"/></svg>Удалить'; } }, 3000);
    }
  }
});

/* ============================================================
   12. ФОРМА ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ (только владелец)
   ============================================================ */
function openForm(editId = null, opts = {}) {
  const editing = editId ? state.titles.find(x => x.id === editId) : null;
  state.form = {
    editingId: editId,
    backToTitle: !!opts.backToTitle,
    genres: new Set(editing?.genres || []),
    genreQuery: '',
  };

  const s = state.settings;
  const t = editing || { title: '', titleOriginal: '', cover: '', type: 'TV-сериал', tier: 'A', favorite: false, entries: [] };
  const defaultEntries = (t.entries && t.entries.length)
    ? t.entries
    : [{ kind: t.type === 'Фильм' ? 'Фильм' : 'Сезон 1', episodes: t.type === 'Фильм' ? null : 12, minutesPerEpisode: null, durationMinutes: null, watchDate: '' }];

  $('#modal-form-body').innerHTML = `
    <h3 class="form-title" id="form-heading">${editing ? 'Редактировать тайтл' : 'Добавить тайтл'}</h3>

    <div class="form-grid">
      <div class="form-field form-field--full">
        <label class="form-label" for="f-title">Название (рус.) *</label>
        <input class="form-input" id="f-title" value="${esc(t.title)}" placeholder="Например: Стальной алхимик: Братство" maxlength="120">
      </div>
      <div class="form-field form-field--full">
        <label class="form-label" for="f-original">Оригинальное название</label>
        <input class="form-input" id="f-original" value="${esc(t.titleOriginal || '')}" placeholder="Hagane no Renkinjutsushi" maxlength="120">
      </div>
      <div class="form-field">
        <label class="form-label" for="f-type">Тип тайтла</label>
        <select class="form-select" id="f-type">
          ${TYPES.map(x => `<option value="${esc(x)}" ${x === t.type ? 'selected' : ''}>${esc(x)}</option>`).join('')}
        </select>
      </div>
      <div class="form-field">
        <label class="form-label">Тир</label>
        <div class="chip-row" id="f-tier">
          ${TIER_KEYS.map(k => `
            <button type="button" class="chip${k === t.tier ? ' is-on' : ''}" data-tier="${k}" data-tier-pick="${k}"
              title="${esc(TIERS.find(x => x.key === k).name)}">${k}</button>`).join('')}
        </div>
      </div>
      <div class="form-field form-field--full">
        <label class="form-label" for="f-cover">Обложка (URL)</label>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <input class="form-input" id="f-cover" value="${esc(t.cover || '')}" placeholder="https://…/poster.jpg" style="flex:1;">
          <img id="f-cover-preview" alt="" hidden
               style="width:56px;height:78px;object-fit:cover;border-radius:9px;border:1px solid var(--border);flex:none;">
        </div>
      </div>
      <div class="form-field form-field--full">
        <label class="check-row">
          <input type="checkbox" id="f-fav" ${t.favorite ? 'checked' : ''}>
          Любимый тайтл
        </label>
      </div>

      <div class="form-field form-field--full">
        <label class="form-label">Жанры <span id="f-genres-count" style="text-transform:none;"></span></label>
        <div class="gsearch">
          <input class="form-input" id="f-genre-search" placeholder="Поиск жанра…" autocomplete="off">
        </div>
        <div class="glist" id="f-genre-list"></div>
      </div>

      <div class="form-field form-field--full">
        <label class="form-label">Составные части (в порядке просмотра)</label>
        <div class="entries-editor" id="f-entries">
          ${defaultEntries.map(e => entryRowHTML(e)).join('')}
        </div>
        <div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap;">
          <button type="button" class="btn btn--ghost btn--small" id="f-add-entry">
            <svg class="icon"><use href="#i-plus"/></svg>Добавить часть
          </button>
          <span class="form-hint" style="margin:0;">Итого: <b id="f-total">—</b></span>
        </div>
        <p class="form-hint">Дата — «2025-05-10» или период «2025-05-01 – 2025-05-20». У фильмов указывается общая длительность; у сериалов — число серий (минуты на серию можно переопределить).</p>
      </div>
    </div>

    <div class="form-actions">
      <button class="btn btn--ghost" data-act="cancel">Отмена</button>
      <button class="btn btn--accent" data-act="save">
        <svg class="icon"><use href="#i-save"/></svg>${editing ? 'Сохранить' : 'Добавить в архив'}
      </button>
    </div>`;

  renderGenreList();
  recalcFormTotal();
  coverPreview();
  openModal($('#modal-form'));
  setTimeout(() => $('#f-title')?.focus(), 120);
}

/* ---------- Одна строка составной части ---------- */
function entryRowHTML(e = {}) {
  const isFilm = e.kind === 'Фильм';
  const opts = ENTRY_KINDS.map(k => `<option value="${esc(k)}" ${k === e.kind ? 'selected' : ''}>${esc(k)}</option>`).join('');
  return `
    <div class="entry-row">
      <div class="entry-row__num">
        <label class="form-label">Часть</label>
        <select class="form-select ent-kind">${opts}</select>
      </div>
      <div class="entry-row__num">
        <label class="form-label">Серии</label>
        <input type="number" class="form-input ent-eps" min="0" max="5000"
               value="${e.episodes ?? ''}" placeholder="${isFilm ? '—' : '12'}" ${isFilm ? 'disabled' : ''}>
      </div>
      <div class="entry-row__num">
        <label class="form-label ent-min-label">${isFilm ? 'Длительность, мин' : 'Мин/серия'}</label>
        <input type="number" class="form-input ent-min" min="1" max="2000"
               value="${isFilm ? (e.durationMinutes ?? '') : (e.minutesPerEpisode ?? '')}"
               placeholder="${isFilm ? state.settings.avgMovie + ' (среднее)' : state.settings.avgEpisode + ' (среднее)'}">
      </div>
      <div class="entry-row__num">
        <label class="form-label">Дата просмотра</label>
        <input type="text" class="form-input ent-date" value="${esc(e.watchDate || '')}"
               placeholder="2025-05-01 – 2025-05-20">
      </div>
      <button type="button" class="btn-icon-del" title="Удалить часть" aria-label="Удалить часть">
        <svg class="icon"><use href="#i-trash"/></svg>
      </button>
    </div>`;
}

/* ---------- Мультиселект жанров с поиском ---------- */
function renderGenreList() {
  const q = state.form.genreQuery.trim().toLowerCase();
  const list = GENRES.filter(g => !q || g.toLowerCase().includes(q));
  $('#f-genre-list').innerHTML = list.length
    ? list.map(g => `
        <button type="button" class="chip chip--genre${state.form.genres.has(g) ? ' is-on' : ''}" data-genre="${esc(g)}">
          ${state.form.genres.has(g) ? '<svg class="icon"><use href="#i-check"/></svg>' : ''}${esc(g)}
        </button>`).join('')
    : '<p class="glist-empty">Жанр не найден</p>';
  const n = state.form.genres.size;
  $('#f-genres-count').textContent = n ? `— выбрано: ${n}` : '';
}

/* ---------- Живой пересчёт итога формы ---------- */
function collectEntryFromRow(row) {
  const kind = $('.ent-kind', row).value;
  const isFilm = kind === 'Фильм';
  const epsRaw = $('.ent-eps', row).value;
  const minRaw = $('.ent-min', row).value;
  const date = $('.ent-date', row).value.trim();
  return {
    kind,
    episodes: isFilm ? null : (epsRaw === '' ? null : Number(epsRaw)),
    minutesPerEpisode: isFilm ? null : (minRaw === '' ? null : Number(minRaw)),
    durationMinutes: isFilm ? (minRaw === '' ? null : Number(minRaw)) : null,
    watchDate: date,
  };
}

function recalcFormTotal() {
  const s = state.settings;
  const type = $('#f-type')?.value || 'TV-сериал';
  const total = $$('#f-entries .entry-row').reduce(
    (sum, row) => sum + entryMinutes(collectEntryFromRow(row), s, type), 0);
  const el = $('#f-total');
  if (el) el.textContent = fmtMin(total);
}

/* ---------- Превью обложки в форме ---------- */
function coverPreview() {
  const url = $('#f-cover')?.value.trim();
  const img = $('#f-cover-preview');
  if (!url) { img.hidden = true; return; }
  img.hidden = false;
  img.onerror = () => { img.hidden = true; };
  img.src = url;
}

/* ---------- События формы (делегирование) ---------- */
const formBody = $('#modal-form-body');

formBody.addEventListener('click', e => {
  // Выбор тира
  const tierPick = e.target.closest('[data-tier-pick]');
  if (tierPick) {
    $$('#f-tier .chip').forEach(c => c.classList.toggle('is-on', c === tierPick));
    return;
  }
  // Тогл жанра
  const genreChip = e.target.closest('[data-genre]');
  if (genreChip) {
    const g = genreChip.dataset.genre;
    state.form.genres.has(g) ? state.form.genres.delete(g) : state.form.genres.add(g);
    renderGenreList();
    return;
  }
  // Удаление части
  const del = e.target.closest('.btn-icon-del');
  if (del) { del.closest('.entry-row').remove(); recalcFormTotal(); return; }
  // Добавить часть
  if (e.target.closest('#f-add-entry')) {
    const type = $('#f-type').value;
    const lastKind = $$('#f-entries .ent-kind').pop()?.value;
    let kind = 'Сезон 2';
    if (type === 'Фильм') kind = 'Фильм';
    else if (/^Сезон \d+$/.test(lastKind || '')) {
      kind = 'Сезон ' + (Number(lastKind.replace(/\D/g, '')) + 1);
    } else if (lastKind) kind = lastKind;
    $('#f-entries').insertAdjacentHTML('beforeend', entryRowHTML({ kind, episodes: kind === 'Фильм' ? null : 12 }));
    recalcFormTotal();
    return;
  }
  // Действия внизу
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'cancel') {
    closeModal($('#modal-form'));
    if (state.form?.backToTitle && state.form.editingId) openTitleModal(state.form.editingId);
  }
  if (act === 'save') saveForm();
});

formBody.addEventListener('input', e => {
  if (e.target.id === 'f-cover') coverPreview();
  if (e.target.id === 'f-genre-search') {
    state.form.genreQuery = e.target.value;
    renderGenreList();
  }
  if (e.target.closest('.entry-row')) recalcFormTotal();
});

formBody.addEventListener('change', e => {
  const kindSel = e.target.closest('.ent-kind');
  if (kindSel) {
    // Смена типа части: перестраиваем подписи и активность полей
    const row = kindSel.closest('.entry-row');
    const isFilm = kindSel.value === 'Фильм';
    const eps = $('.ent-eps', row), min = $('.ent-min', row);
    eps.disabled = isFilm;
    eps.placeholder = isFilm ? '—' : '12';
    if (isFilm) eps.value = '';
    $('.ent-min-label', row).textContent = isFilm ? 'Длительность, мин' : 'Мин/серия';
    min.placeholder = isFilm
      ? state.settings.avgMovie + ' (среднее)'
      : state.settings.avgEpisode + ' (среднее)';
    recalcFormTotal();
  }
});

/* ---------- Сохранение формы ---------- */
function saveForm() {
  const title = $('#f-title').value.trim();
  if (!title) {
    showToast('Укажите название тайтла', 'err');
    $('#f-title').focus();
    return;
  }

  const entries = $$('#f-entries .entry-row').map(collectEntryFromRow);
  const tier = $('#f-tier .chip.is-on')?.dataset.tierPick || 'A';
  const cover = $('#f-cover').value.trim();

  if (state.form.editingId) {
    // Редактирование: сохраняем id и дату добавления (порядок «последних» не ломается)
    const t = state.titles.find(x => x.id === state.form.editingId);
    if (t) Object.assign(t, {
      title, titleOriginal: $('#f-original').value.trim(), cover,
      type: $('#f-type').value, tier, favorite: $('#f-fav').checked,
      genres: [...state.form.genres], entries,
    });
    showToast('Изменения сохранены', 'ok');
  } else {
    const now = new Date();
    state.titles.push({
      id: uid(), title, titleOriginal: $('#f-original').value.trim(), cover,
      type: $('#f-type').value, tier, favorite: $('#f-fav').checked,
      genres: [...state.form.genres], entries,
      createdAt: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    });
    showToast('Тайтл добавлен в архив', 'ok');
  }

  const backId = state.form.editingId;
  closeModal($('#modal-form'));
  renderAll();
  scheduleAutosave();
  emit('data-changed');
  // Возврат в карточку тайтла, если форма открыта из неё
  if (state.form?.backToTitle && backId) openTitleModal(backId);
}

/* ============================================================
   13. КАЛЕНДАРЬ ПРОСМОТРА
   ============================================================ */

// Сбор событий: 'YYYY-MM-DD' -> [{ title, entry }] (по дате НАЧАЛА части)
function buildEvents() {
  const map = new Map();
  for (const t of state.titles) {
    for (const e of (t.entries || [])) {
      const pd = parseWatchDate(e.watchDate);
      if (!pd) continue;
      const key = isoDate(pd.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ title: t, entry: e });
    }
  }
  state.events = map;
}

function renderCalendar() {
  hideCalPop();
  const d = state.calDate;
  const y = d.getFullYear(), m = d.getMonth();
  $('#cal-title').textContent = `${MONTHS_NOM[m]} ${y}`;

  const firstPad = (new Date(y, m, 1).getDay() + 6) % 7;   // Пн = 0
  const days = new Date(y, m + 1, 0).getDate();
  const todayKey = isoDate(new Date());
  const grid = $('#cal-grid');
  let html = '';

  for (let i = 0; i < firstPad; i++) html += '<div class="cal-cell cal-cell--empty"></div>';

  for (let day = 1; day <= days; day++) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const evs = state.events.get(key) || [];
    const cls = [
      'cal-cell',
      evs.length ? 'cal-cell--active' : '',
      key === todayKey ? 'cal-cell--today' : '',
    ].join(' ');
    const dots = evs.slice(0, 7).map(ev =>
      `<span class="cal-dot" data-tier="${esc(ev.title.tier)}"></span>`).join('');
    const more = evs.length > 7 ? `<span class="cal-cell__more">+${evs.length - 7}</span>` : '';
    html += `
      <div class="${cls}" data-date="${key}" tabindex="${evs.length ? 0 : -1}">
        <span class="cal-cell__num">${day}</span>
        <div class="cal-cell__dots">${dots}${more}</div>
      </div>`;
  }
  grid.innerHTML = html;
}

/* ---------- Поповер дня ---------- */
function showCalPop(cell) {
  hideCalPop();
  const evs = state.events.get(cell.dataset.date) || [];
  if (!evs.length) return;
  const [y, m, d] = cell.dataset.date.split('-').map(Number);
  const pop = document.createElement('div');
  pop.className = 'cal-pop';
  pop.innerHTML = `
    <div class="cal-pop__date">${d} ${MONTHS_GEN[m - 1].toLowerCase()} ${y}</div>
    ${evs.map(ev => `
      <div class="cal-pop__item" data-tier="${esc(ev.title.tier)}">
        <i></i><span>${esc(ev.title.title)}</span>
        <span style="color:var(--text-3);font-size:11.5px;">${esc(ev.entry.kind)}</span>
      </div>`).join('')}`;
  cell.appendChild(pop);
  state.popCell = cell;
}
function hideCalPop() {
  if (state.popCell) { $('.cal-pop', state.popCell)?.remove(); state.popCell = null; }
}

/* ---------- Список просмотров по месяцам ---------- */
function renderCalList() {
  // Сортируем все события по дате по возрастанию
  const items = [];
  for (const [key, evs] of state.events) {
    const [y, m, d] = key.split('-').map(Number);
    evs.forEach(ev => items.push({ date: new Date(y, m - 1, d), ev }));
  }
  items.sort((a, b) => a.date - b.date);

  const byMonth = new Map();
  items.forEach(({ date, ev }) => {
    const mk = monthKey(date);
    if (!byMonth.has(mk)) byMonth.set(mk, []);
    byMonth.get(mk).push({ date, ev });
  });

  $('#calendar-list').innerHTML = byMonth.size
    ? [...byMonth.entries()].map(([mk, days]) => {
        const [y, m] = mk.split('-').map(Number);
        return `
          <div class="clist-month">
            <h4 class="clist-month-title">${MONTHS_NOM[m - 1]} ${y}</h4>
            ${days.map(({ date, ev }) => `
              <div class="clist-day">
                <span class="clist-day__date">${fmtDateRu(date)}</span>
                <div class="clist-day__items">
                  <p class="clist-item" data-tier="${esc(ev.title.tier)}">
                    <i></i>${esc(ev.title.title)}
                    <span>${esc(ev.entry.kind)}${ev.entry.episodes ? ` · ${ev.entry.episodes} эп.` : ''}</span>
                  </p>
                </div>
              </div>`).join('')}
          </div>`;
      }).join('')
    : '<div class="empty-state"><p class="empty-title">Пока нет записей</p><p class="empty-note">Добавьте даты просмотра в составных частях тайтлов</p></div>';
}

/* ============================================================
   14. ПАНЕЛЬ ФИЛЬТРОВ
   ============================================================ */
function renderFilters() {
  const f = state.filters;
  const usedGenres = [...new Set(state.titles.flatMap(t => t.genres || []))]
    .sort((a, b) => a.localeCompare(b, 'ru'));

  $('#filters-body').innerHTML = `
    <div class="filter-group">
      <p class="filter-group-title">Тиры</p>
      <div class="chip-row">
        ${TIER_KEYS.map(k => `
          <button class="chip${f.tiers.has(k) ? ' is-on' : ''}" data-tier="${k}" data-f="tier" data-v="${k}">
            ${f.tiers.has(k) ? '<svg class="icon"><use href="#i-check"/></svg>' : ''}${k}
          </button>`).join('')}
      </div>
    </div>
    <div class="filter-group">
      <p class="filter-group-title">Тип</p>
      <div class="chip-row">
        ${TYPES.map(x => `
          <button class="chip${f.types.has(x) ? ' is-on' : ''}" data-f="type" data-v="${esc(x)}"
            style="--tier-c: var(--accent);">
            ${f.types.has(x) ? '<svg class="icon"><use href="#i-check"/></svg>' : ''}${esc(x)}
          </button>`).join('')}
      </div>
    </div>
    <div class="filter-group">
      <p class="filter-group-title">Жанры</p>
      <div class="chip-row">
        ${usedGenres.length ? usedGenres.map(g => `
          <button class="chip chip--genre${f.genres.has(g) ? ' is-on' : ''}" data-f="genre" data-v="${esc(g)}">
            ${f.genres.has(g) ? '<svg class="icon"><use href="#i-check"/></svg>' : ''}${esc(g)}
          </button>`).join('')
        : '<p class="empty-note">Жанры появятся вместе с тайтлами</p>'}
      </div>
    </div>
    <div class="filter-group">
      <p class="filter-group-title">Прочее</p>
      <button class="chip${f.favOnly ? ' is-on' : ''}" data-f="fav" style="--tier-c: var(--accent);">
        ${f.favOnly ? '<svg class="icon"><use href="#i-check"/></svg>' : ''}Только любимые
      </button>
    </div>`;

  $('#filters-dot').hidden = !hasActiveFilters();
}

function resetFilters() {
  state.filters = { tiers: new Set(), types: new Set(), genres: new Set(), favOnly: false };
  state.search = '';
  $('#search-input').value = '';
  $('#search-clear').hidden = true;
  renderFilters();
  renderTierBar();
  renderTierSections();
}

/* ============================================================
   15. ПАНЕЛЬ НАСТРОЕК
   ============================================================ */
function renderSettings() {
  const s = state.settings;
  const p = s.particles;
  const ACCENTS = ['#ff4d6d', '#ff7a2e', '#ff3d55', '#22dd9a', '#35aaff', '#a86bff', '#ff4fa8', '#ffc233'];

  $('#settings-body').innerHTML = `
    <div class="settings-section">
      <h3 class="settings-section__title"><svg class="icon"><use href="#i-sliders"/></svg>Оформление</h3>
      <div class="set-row">
        <span class="set-row__label">Тема</span>
        <div class="set-row__control">
          <select class="set-select" data-set="theme">
            <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Тёмная</option>
            <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Светлая</option>
          </select>
        </div>
      </div>
      <div class="set-row">
        <span class="set-row__label">Акцентный цвет</span>
        <div class="set-row__control swatches">
          ${ACCENTS.map(c => `
            <button class="swatch${c === s.accent ? ' is-active' : ''}" data-set="accent" data-val="${c}"
              style="background:${c}" title="${c}" aria-label="Цвет ${c}"></button>`).join('')}
          <input type="color" value="${esc(s.accent)}" data-set="accent-custom"
            style="width:32px;height:32px;border:none;background:none;padding:0;cursor:pointer;"
            title="Свой цвет" aria-label="Свой акцентный цвет">
        </div>
      </div>
      <div class="set-row">
        <span class="set-row__label">Все анимации
          <span class="set-row__note">Останавливает 3D-буквы, параллакс и переходы (частицы управляются отдельно)</span>
        </span>
        <button class="tog${s.animations ? ' is-on' : ''}" data-set="animations" data-val="${!s.animations}"
          aria-label="Переключить анимации"></button>
      </div>
      <div class="set-row">
        <span class="set-row__label">Вид списка тайтлов</span>
        <div class="set-row__control">
          <select class="set-select" data-set="viewMode">
            <option value="grid" ${s.viewMode === 'grid' ? 'selected' : ''}>Сетка карточек</option>
            <option value="list" ${s.viewMode === 'list' ? 'selected' : ''}>Список</option>
            <option value="compact" ${s.viewMode === 'compact' ? 'selected' : ''}>Компактный список</option>
          </select>
        </div>
      </div>
      <div class="set-row">
        <span class="set-row__label">Размер карточек</span>
        <div class="set-row__control">
          <input type="range" class="range" min="0.8" max="1.4" step="0.05" value="${s.cardSize}" data-set="cardSize">
          <span class="set-row__value" data-val-label="cardSize">${Math.round(s.cardSize * 100)}%</span>
        </div>
      </div>
      <div class="set-row">
        <span class="set-row__label">Колонок на десктопе</span>
        <div class="set-row__control">
          <select class="set-select" data-set="columns">
            <option value="auto" ${s.columns === 'auto' ? 'selected' : ''}>Авто</option>
            ${[6, 7, 8, 9, 10].map(n => `<option value="${n}" ${String(s.columns) === String(n) ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title"><svg class="icon"><use href="#i-image"/></svg>Фоновая анимация</h3>
      <div class="set-row" style="border:none;padding-top:0;">
        <div class="presets">
          ${PRESETS.map(pr => `
            <button class="preset-btn${p.preset === pr.key ? ' is-active' : ''}" data-set="particle-preset" data-val="${pr.key}">
              <span class="preset-dot" style="--p-color:${pr.color}"></span>${esc(pr.name)}
            </button>`).join('')}
        </div>
      </div>
      <div class="set-row">
        <span class="set-row__label">Плотность (частиц)</span>
        <div class="set-row__control">
          <input type="range" class="range" min="5" max="120" step="1" value="${p.density}" data-set="particle-density">
          <span class="set-row__value" data-val-label="pd">${p.density}</span>
        </div>
      </div>
      <div class="set-row">
        <span class="set-row__label">Скорость падения</span>
        <div class="set-row__control">
          <input type="range" class="range" min="0.2" max="3" step="0.1" value="${p.speed}" data-set="particle-speed">
          <span class="set-row__value" data-val-label="ps">${p.speed}×</span>
        </div>
      </div>
      <div class="set-row">
        <span class="set-row__label">Размер частиц</span>
        <div class="set-row__control">
          <input type="range" class="range" min="0.4" max="2.2" step="0.1" value="${p.size}" data-set="particle-size">
          <span class="set-row__value" data-val-label="psz">${p.size}×</span>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title"><svg class="icon"><use href="#i-clock"/></svg>Длительность по умолчанию</h3>
      <div class="set-row">
        <span class="set-row__label">Средняя серия</span>
        <div class="set-row__control">
          <input type="range" class="range" min="15" max="40" step="1" value="${s.avgEpisode}" data-set="avgEpisode">
          <span class="set-row__value">${s.avgEpisode} мин</span>
        </div>
      </div>
      <div class="set-row">
        <span class="set-row__label">Средний фильм</span>
        <div class="set-row__control">
          <input type="range" class="range" min="60" max="240" step="5" value="${s.avgMovie}" data-set="avgMovie">
          <span class="set-row__value">${s.avgMovie} мин</span>
        </div>
      </div>
      <p class="set-row__note">Эти значения подставляются, когда у части не указана длительность вручную. Пересчёт времени происходит мгновенно.</p>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title"><svg class="icon"><use href="#i-trash"/></svg>Сброс</h3>
      <div class="set-row">
        <span class="set-row__label">Вернуть настройки по умолчанию</span>
        <button class="btn btn--ghost btn--small" id="btn-reset-settings">Сбросить</button>
      </div>
    </div>`;

  function hydrateSettings() {
  const root = $('#settings-body');
}

function hydrateSettings() {
  const root = $('#settings-body');

  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-set]');
    if (!btn) return;
    const key = btn.dataset.set;

    if (key === 'accent') { setSetting('accent', btn.dataset.val); }
    if (key === 'animations') { setSetting('animations', btn.dataset.val === 'true'); }
    if (key === 'particle-preset') {
      state.settings.particles.preset = btn.dataset.val;
      persistSettings(); applySettings(); renderSettings();
    }
    if (e.target.closest('#btn-reset-settings')) {
      state.settings = deepMerge(DEFAULT_SETTINGS, {});
      persistSettings(); applySettings(); renderSettings();
      renderTierSections();
      showToast('Настройки сброшены к значениям по умолчанию', 'ok');
    }
  });

  root.addEventListener('input', e => {
    const el = e.target.closest('[data-set]');
    if (!el) return;
    const key = el.dataset.set;

    if (key === 'accent-custom') { setSetting('accent', el.value); return; }

    if (['theme', 'viewMode', 'columns'].includes(key)) return;   // обрабатываются в change

    if (key === 'cardSize') {
      setSetting('cardSize', Number(el.value));
      root.querySelector('[data-val-label="cardSize"]').textContent = Math.round(el.value * 100) + '%';
      renderTierSections();
      return;
    }
    if (key.startsWith('particle-')) {
      const sub = key.replace('particle-', '');
      state.settings.particles[sub] = Number(el.value);
      persistSettings(); applySettings();
      const lbl = root.querySelector(`[data-val-label="${{ density: 'pd', speed: 'ps', size: 'psz' }[sub]}"]`);
      if (lbl) lbl.textContent = sub === 'density' ? el.value : el.value + '×';
      return;
    }
    if (key === 'avgEpisode' || key === 'avgMovie') {
      setSetting(key, Number(el.value));
      const row = el.closest('.set-row');
      $('.set-row__value', row).textContent = el.value + ' мин';
      // Средние длительности влияют на всё время — пересчитываем
      renderTierSections(); renderRecentStrip(); renderCalendar(); renderCalList();
      emit('data-changed');
      return;
    }
  });

  root.addEventListener('change', e => {
    const el = e.target.closest('[data-set]');
    if (!el) return;
    const key = el.dataset.set;
    if (key === 'theme') setSetting('theme', el.value);
    if (key === 'viewMode') { setSetting('viewMode', el.value); renderTierSections(); }
    if (key === 'columns') { setSetting('columns', el.value === 'auto' ? 'auto' : Number(el.value)); renderTierSections(); }
  });
}

/* ============================================================
   16. ТОСТЫ-УВЕДОМЛЕНИЯ
   ============================================================ */
function showToast(text, type = 'info', ms = 3400) {
  const wrap = $('#toasts');
  while (wrap.children.length >= 4) wrap.firstChild.remove();
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  const icon = type === 'ok' ? 'i-check' : type === 'err' ? 'i-alert' : 'i-alert';
  el.innerHTML = `<svg class="icon"><use href="#${icon}"/></svg><span>${esc(text)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-hiding');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, ms);
}

/* ============================================================
   17. ВКЛАДКИ, ПОИСК, ДЕЛЕГИРОВАНИЕ КЛИКОВ
   ============================================================ */
function switchTab(name) {
  state.tab = name;
  // ФИКС: обязательно снимаем атрибут hidden — класс is-active не побеждает
  // правило [hidden]{display:none!important}, и вкладки не открывались
  $$('.tab-panel').forEach(p => {
    const active = p.id === 'tab-' + name;
    p.classList.toggle('is-active', active);
    p.hidden = !active;
  });
  $$('.tab-btn, .drawer-link').forEach(b => b.classList.toggle('is-active', b.dataset.tab === name));
  closeDrawer();
  if (name === 'stats' && window.ArchiveStats) ArchiveStats.render();
  if (name === 'calendar') {
    // Восстанавливаем сохранённый режим «Календарь / Список»
    const mode = state.settings.calMode || 'grid';
    $$('#cal-switch .segment-btn').forEach(b => b.classList.toggle('is-active', b.dataset.cal === mode));
    $('#calendar-view').hidden = mode !== 'grid';
    $('#calendar-list').hidden = mode !== 'list';
    renderCalendar();
    renderCalList();
  }
  if (name === 'settings') renderSettings();
}

/* ---------- Модалка/дровер открытия ---------- */
function openDrawer() {
  $('#drawer').classList.add('is-open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  const ov = $('#drawer-overlay');
  ov.hidden = false;
  requestAnimationFrame(() => ov.classList.add('is-open'));
}
function closeDrawer() {
  const d = $('#drawer');
  if (!d.classList.contains('is-open')) return;
  d.classList.remove('is-open');
  d.setAttribute('aria-hidden', 'true');
  const ov = $('#drawer-overlay');
  ov.classList.remove('is-open');
  setTimeout(() => { ov.hidden = true; }, 300);
}

/* ---------- Полный ре-рендер ---------- */
function renderAll() {
  renderRecentStrip();
  renderTierBar();
  renderTierSections();
  buildEvents();
  if (state.tab === 'calendar') { renderCalendar(); renderCalList(); }
  emit('data-changed');
}

/* ============================================================
   18. ПАРЫЛЛАКС ФОНА (движение мыши -> --px/--py)
   ============================================================ */
function initParallax() {
  let tx = 0, ty = 0, px = 0, py = 0, raf = null;
  window.addEventListener('mousemove', e => {
    if (!state.settings.animations) return;
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
    if (!raf) loop();
  }, { passive: true });

  function loop() {
    px += (tx - px) * 0.05;
    py += (ty - py) * 0.05;
    document.body.style.setProperty('--px', (px * 16).toFixed(1));
    document.body.style.setProperty('--py', (py * 11).toFixed(1));
    raf = (Math.abs(tx - px) > 0.002 || Math.abs(ty - py) > 0.002)
      ? requestAnimationFrame(loop) : null;
  }
}

/* ============================================================
   19. ПРИВЯЗКА СОБЫТИЙ ИНТЕРФЕЙСА
   ============================================================ */
function bindUI() {
  // Табы (шапка + drawer)
  document.addEventListener('click', e => {
    const tabBtn = e.target.closest('.tab-btn, .drawer-link');
    if (tabBtn) { switchTab(tabBtn.dataset.tab); return; }

    // Карточка тайтла (архив и лента)
    const card = e.target.closest('.title-card, .recent-card');
    if (card?.dataset.id) { openTitleModal(card.dataset.id); return; }

    // Чип тира на панели тиров = фильтр
    const tierChip = e.target.closest('[data-tier-filter]');
    if (tierChip) {
      const k = tierChip.dataset.tierFilter;
      state.filters.tiers.has(k) ? state.filters.tiers.delete(k) : state.filters.tiers.add(k);
      renderTierBar();
      renderFilters();
      renderTierSections();
      return;
    }

    // Переключатель вида
    const viewBtn = e.target.closest('.view-btn');
    if (viewBtn) {
      state.settings.viewMode = viewBtn.dataset.view;
      persistSettings();
      renderTierSections();
      return;
    }

    // Кнопки шапки
    if (e.target.closest('#btn-settings')) { switchTab('settings'); return; }
    if (e.target.closest('#btn-add') || e.target.closest('#drawer-add')) { openForm(); return; }

    // Drawer
    if (e.target.closest('#btn-burger')) { openDrawer(); return; }
    if (e.target.closest('#drawer-close') || e.target.closest('#drawer-overlay')) { closeDrawer(); return; }

    // Фильтры
    if (e.target.closest('#btn-filters')) {
      const panel = $('#filters-panel');
      const open = panel.hidden;
      panel.hidden = !open;
      $('#btn-filters').setAttribute('aria-expanded', String(open));
      if (open) renderFilters();
      return;
    }
    if (e.target.closest('#btn-filters-reset')) { resetFilters(); return; }
    const fChip = e.target.closest('#filters-body [data-f]');
    if (fChip) {
      const { f, v } = fChip.dataset;
      if (f === 'tier') state.filters.tiers.has(v) ? state.filters.tiers.delete(v) : state.filters.tiers.add(v);
      if (f === 'type') state.filters.types.has(v) ? state.filters.types.delete(v) : state.filters.types.add(v);
      if (f === 'genre') state.filters.genres.has(v) ? state.filters.genres.delete(v) : state.filters.genres.add(v);
      if (f === 'fav') state.filters.favOnly = !state.filters.favOnly;
      renderFilters(); renderTierBar(); renderTierSections();
      return;
    }

    // Календарь: навигация
    if (e.target.closest('#cal-prev')) { state.calDate.setMonth(state.calDate.getMonth() - 1); renderCalendar(); return; }
    if (e.target.closest('#cal-next')) { state.calDate.setMonth(state.calDate.getMonth() + 1); renderCalendar(); return; }
    if (e.target.closest('#cal-today')) { state.calDate = new Date(); renderCalendar(); return; }
    const calMode = e.target.closest('#cal-switch .segment-btn');
    if (calMode) {
      state.settings.calMode = calMode.dataset.cal;
      persistSettings();
      $$('#cal-switch .segment-btn').forEach(b => b.classList.toggle('is-active', b === calMode));
      $('#calendar-view').hidden = calMode.dataset.cal !== 'grid';
      $('#calendar-list').hidden = calMode.dataset.cal !== 'list';
      return;
    }

    // Поповер дня: тап/клик по активной ячейке
    const cell = e.target.closest('.cal-cell--active');
    if (cell) {
      if (state.popCell === cell) hideCalPop(); else showCalPop(cell);
      e.stopPropagation();
      return;
    }
    hideCalPop();
  });

  // Esc: закрыть форму / модалку / drawer (только они, НЕ клик по фону)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const form = $('#modal-form'), title = $('#modal-title');
    if (form.classList.contains('is-open')) {
      closeModal(form);
      if (state.form?.backToTitle && state.form.editingId) openTitleModal(state.form.editingId);
    } else if (title.classList.contains('is-open')) {
      closeModal(title);
    } else {
      closeDrawer();
    }
  });

  // Крестики модалок
  $('#modal-title-close').addEventListener('click', () => closeModal($('#modal-title')));
  $('#modal-form-close').addEventListener('click', () => {
    closeModal($('#modal-form'));
    if (state.form?.backToTitle && state.form.editingId) openTitleModal(state.form.editingId);
  });

  // Поиск с лёгким debounce
  let searchTimer = null;
  $('#search-input').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      $('#search-clear').hidden = !state.search;
      renderTierSections();
    }, 130);
  });
  $('#search-clear').addEventListener('click', () => {
    $('#search-input').value = '';
    state.search = '';
    $('#search-clear').hidden = true;
    renderTierSections();
    $('#search-input').focus();
  });

  // Поповер календаря: наведение мыши
  const grid = $('#cal-grid');
  grid.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const cell = e.target.closest('.cal-cell--active');
    if (cell && cell !== state.popCell) showCalPop(cell);
  });
  grid.addEventListener('pointerout', e => {
    if (e.pointerType !== 'mouse') return;
    const cell = e.target.closest('.cal-cell');
    if (cell && !cell.contains(e.relatedTarget)) hideCalPop();
  });
}

/* ============================================================
   20. ЗАПУСК
   ============================================================ */
async function init() {
  // Режим владельца
  if (isOwner) {
    document.body.classList.add('owner-mode');
    $('#btn-add').hidden = false;
    $('#drawer-add').hidden = false;
    $('#mode-badge').hidden = false;
    $('#mode-badge').textContent = 'Режим владельца';
    $('#drawer-foot').textContent = 'Изменения сохраняются локально и на GitHub';
  } else {
    $('#mode-badge').hidden = false;
    $('#mode-badge').textContent = 'Режим просмотра';
    $('#drawer-foot').textContent = 'Каталог доступен только для чтения';
  }

  $('#footer-year').textContent = new Date().getFullYear();

  loadSettings();
  applySettings();
  bindUI();
  initParallax();

  await loadTitles();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);

/* ============================================================
   21. ПУБЛИЧНЫЙ API (используется admin.js и stats.js)
   ============================================================ */
window.App = {
  // Данные и состояние
  state,
  get titles() { return state.titles; },
  setTitles(arr) { state.titles = arr || []; renderAll(); },
  get settings() { return state.settings; },
  isOwner: () => isOwner,

  // Константы
  TIERS, TIER_KEYS, TYPES, GENRES, PRESETS, ENTRY_KINDS,

  // Вычисления
  entryMinutes, titleMinutes, totalEpisodes, fmtMin,
  parseWatchDate, isoDate, monthKey, fmtDateRu,

  // Перерисовка
  renderAll, renderTierSections, renderCalendar, renderCalList,
  renderSettings, renderFilters,

  // Настройки
  setSetting, applySettings, persistSettings,

  // Данные
  scheduleAutosave, saveToLocal, forceRemoteLoad,
  exportJSON: () => JSON.stringify({ titles: state.titles }, null, 2),

  // UI
  showToast, switchTab, openTitleModal, openForm,

  // Статистика фильмов: минуты всех частей-фильмов (в т.ч. внутри сериалов)
  movieStats() {
    const s = state.settings;
    let movieMin = 0, totalMin = 0, movieCount = 0;
    for (const t of state.titles) {
      totalMin += titleMinutes(t, s);
      if ((t.entries || []).some(e => e.kind === 'Фильм')) movieCount++;
      movieMin += (t.entries || [])
        .filter(e => e.kind === 'Фильм')
        .reduce((sum, e) => sum + entryMinutes(e, s, t.type), 0);
    }
    return { movieMin, totalMin, movieCount };
  },

  // События (мини-шина)
  on, emit,
};
