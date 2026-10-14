/* =====================================================================
   admin.js — режим владельца: сохранение в GitHub Contents API,
   редактор тайтла, экспорт/импорт JSON.
   ===================================================================== */

(function () {
  'use strict';

  const LS = { github: 'anime-archive:github' };
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const API = {
    getData: null, setData: null, saveLocal: null,
    renderAll: null, renderStats: null, toast: null
  };

  let gh = { token: '', repo: '', branch: 'main', path: 'data.json' };
  let editorId = null;             // id редактируемого тайтла (null = новый)
  let editorGenres = new Set();
  let editorEntries = [];

  /* ==================== Инициализация ==================== */
  function init(api) {
    Object.assign(API, api);

    // Загружаем сохранённые настройки GitHub
    try {
      const raw = localStorage.getItem(LS.github);
      if (raw) gh = Object.assign(gh, JSON.parse(raw));
    } catch (e) {}

    $('#setToken').value  = gh.token;
    $('#setRepo').value   = gh.repo;
    $('#setBranch').value = gh.branch;
    $('#setPath').value   = gh.path;

    ['setToken','setRepo','setBranch','setPath'].forEach(id => {
      $('#' + id).addEventListener('change', saveGhSettings);
    });

    $('#btnSaveGithub').addEventListener('click', saveToGithub);
    $('#btnExportJson').addEventListener('click', exportJson);
    $('#btnImportJson').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', importJson);

    $('#btnAddTitle').addEventListener('click', () => openEditor(null));

    injectEditorModal();
  }

  function saveGhSettings() {
    gh = {
      token:  $('#setToken').value.trim(),
      repo:   $('#setRepo').value.trim(),
      branch: $('#setBranch').value.trim() || 'main',
      path:   $('#setPath').value.trim() || 'data.json'
    };
    localStorage.setItem(LS.github, JSON.stringify(gh));
  }

  /* ==================== Модалка-редактор (вставляется в DOM) ==================== */
  function injectEditorModal() {
    if ($('#editorModal')) return;
    const div = document.createElement('div');
    div.className = 'modal';
    div.id = 'editorModal';
    div.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-window glass" role="dialog" aria-modal="true">
        <button class="modal-close" id="editorClose" type="button" aria-label="Закрыть">✕</button>
        <div class="modal-body">
          <h2 id="editorTitle" style="font-size:20px;margin-bottom:18px">Новый тайтл</h2>

          <div class="editor-field">
            <label class="editor-label">Название (рус.)</label>
            <input class="input" id="edTitle" placeholder="Например: Атака титанов">
          </div>

          <div class="editor-field">
            <label class="editor-label">Оригинальное название</label>
            <input class="input" id="edOriginal" placeholder="Shingeki no Kyojin">
          </div>

          <div class="editor-field">
            <label class="editor-label">Тип тайтла</label>
            <select class="select" id="edType" style="width:100%">
              <option>TV-сериал</option><option>Фильм</option>
              <option>OVA</option><option>ONA</option>
              <option>Спешл</option><option>TV-спешл</option>
            </select>
          </div>

          <div class="editor-field">
            <label class="editor-label">Тир</label>
            <select class="select" id="edTier" style="width:100%">
              <option value="SSS">SSS — шедевр</option>
              <option value="S">S — великолепно</option>
              <option value="A">A — отлично</option>
              <option value="B">B — хорошо</option>
              <option value="C">C — средне</option>
              <option value="D">D — слабо</option>
              <option value="E">E — плохо</option>
            </select>
          </div>

          <div class="editor-field">
            <label class="editor-label">Обложка (URL)</label>
            <input class="input" id="edCover" placeholder="https://…/cover.jpg">
          </div>

          <div class="editor-field">
            <label class="editor-label">Жанры</label>
            <div class="genre-picker">
              <input class="genre-search" id="edGenreSearch" placeholder="Поиск жанра…">
              <div class="genre-chips" id="edGenreChips"></div>
            </div>
          </div>

          <div class="editor-field">
            <label class="field-row" style="justify-content:flex-start;gap:10px">
              <input type="checkbox" id="edFav" class="toggle" style="width:22px;height:22px">
              <span class="editor-label" style="margin:0">Любимый тайтл</span>
            </label>
          </div>

          <div class="editor-field">
            <label class="editor-label">Составные части (в порядке просмотра)</label>
            <div class="entries-editor" id="edEntries"></div>
            <button class="btn btn-ghost" id="edAddEntry" type="button" style="margin-top:10px">+ Добавить часть</button>
          </div>

          <div class="modal-actions" style="margin-top:20px">
            <button class="btn btn-primary" id="edSave" type="button">Сохранить тайтл</button>
            <button class="btn btn-ghost" id="edCancel" type="button">Отмена</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div);

    $('#editorClose').addEventListener('click', closeEditor);
    $('#edCancel').addEventListener('click', closeEditor);
    $('#edSave').addEventListener('click', saveEditor);
    $('#edAddEntry').addEventListener('click', () => { editorEntries.push(defaultEntry()); renderEntries(); });
    $('#edGenreSearch').addEventListener('input', renderGenreChips);

    renderGenreChips();
  }

  /* ==================== Открыть / закрыть редактор ==================== */
  function openEditor(t) {
    injectEditorModal();
    editorId = t ? t.id : null;
    $('#editorTitle').textContent = t ? 'Редактирование тайтла' : 'Новый тайтл';

    $('#edTitle').value    = t ? (t.title || '') : '';
    $('#edOriginal').value = t ? (t.titleOriginal || '') : '';
    $('#edType').value     = t ? (t.type || 'TV-сериал') : 'TV-сериал';
    $('#edTier').value     = t ? (t.tier || 'A') : 'A';
    $('#edCover').value    = t ? (t.cover || '') : '';
    $('#edFav').checked    = !!(t && t.favorite);

    editorGenres = new Set(t ? (t.genres || []) : []);
    editorEntries = t && t.entries ? JSON.parse(JSON.stringify(t.entries)) : [defaultEntry()];

    renderGenreChips();
    renderEntries();

    $('#editorModal').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeEditor() {
    const m = $('#editorModal');
    if (m) m.classList.remove('is-open');
    document.body.style.overflow = '';
    editorId = null;
  }

  function defaultEntry() {
    return { kind: 'Сезон 1', episodes: 12, minutesPerEpisode: 24, durationMinutes: null, watchDate: '' };
  }

  /* ==================== Жанры ==================== */
  function renderGenreChips() {
    const wrap = $('#edGenreChips');
    const q = ($('#edGenreSearch').value || '').toLowerCase();
    const list = API.ALL_GENRES.filter(g => !q || g.toLowerCase().includes(q));
    wrap.innerHTML = list.map(g => `
      <button type="button" class="genre-chip ${editorGenres.has(g) ? 'is-on' : ''}" data-g="${g}">${g}</button>
    `).join('');
    wrap.querySelectorAll('.genre-chip').forEach(b => {
      b.addEventListener('click', () => {
        const g = b.dataset.g;
        if (editorGenres.has(g)) editorGenres.delete(g); else editorGenres.add(g);
        b.classList.toggle('is-on');
      });
    });
  }

  /* ==================== Части (entries) ==================== */
  const KINDS = ['Сезон 1','Сезон 2','Сезон 3','Сезон 4','Фильм','Спешл','OVA','ONA','TV-спешл','Клип'];

  function renderEntries() {
    const wrap = $('#edEntries');
    wrap.innerHTML = editorEntries.map((e, i) => `
      <div class="entry-edit" data-i="${i}">
        <select data-f="kind">${KINDS.map(k =>
          `<option ${k === e.kind ? 'selected' : ''}>${k}</option>`).join('')}</select>
        <input type="number" min="0" placeholder="Серий" data-f="episodes" value="${e.episodes ?? ''}">
        <input type="number" min="0" placeholder="Мин/сер." data-f="minutesPerEpisode" value="${e.minutesPerEpisode ?? ''}">
        <input type="number" min="0" placeholder="Длит. фильма" data-f="durationMinutes" value="${e.durationMinutes ?? ''}">
        <input type="text" placeholder="Дата или период (2024-05-01 – 2024-05-20)" data-f="watchDate" value="${API.esc(e.watchDate || '')}">
        <button class="remove-entry" type="button" data-remove="${i}">✕</button>
      </div>
    `).join('');

    wrap.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('change', () => {
        const i = +el.closest('.entry-edit').dataset.i;
        const f = el.dataset.f;
        let v = el.value;
        if (['episodes','minutesPerEpisode','durationMinutes'].includes(f)) {
          v = v === '' ? null : Number(v);
        }
        editorEntries[i][f] = v;
      });
    });
    wrap.querySelectorAll('[data-remove]').forEach(b => {
      b.addEventListener('click', () => {
        editorEntries.splice(+b.dataset.remove, 1);
        renderEntries();
      });
    });
  }

  /* ==================== Сохранить тайтл ==================== */
  function saveEditor() {
    const title = $('#edTitle').value.trim();
    if (!title) { API.toast('Введите название', 'err'); return; }

    const d = API.getData();
    const id = editorId || ('t' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));

    const item = {
      id,
      title,
      titleOriginal: $('#edOriginal').value.trim(),
      cover: $('#edCover').value.trim(),
      type: $('#edType').value,
      genres: Array.from(editorGenres),
      tier: $('#edTier').value,
      favorite: $('#edFav').checked,
      createdAt: editorId
        ? (d.titles.find(t => t.id === editorId)?.createdAt || new Date().toISOString().slice(0, 10))
        : new Date().toISOString().slice(0, 10),
      entries: editorEntries.filter(e => e && (e.episodes || e.durationMinutes || e.watchDate || e.kind))
    };

    if (editorId) {
      const i = d.titles.findIndex(t => t.id === editorId);
      if (i >= 0) d.titles[i] = item; else d.titles.push(item);
    } else {
      d.titles.push(item);
    }

    API.setData(d);
    API.saveLocal();
    API.renderAll();
    closeEditor();
    API.toast('Тайтл сохранён', 'ok');
  }

  /* ==================== GitHub Contents API ==================== */
  async function saveToGithub() {
    saveGhSettings();
    const status = $('#syncStatus');
    const set = (txt, cls) => {
      status.textContent = txt;
      status.className = 'sync-status' + (cls ? ' ' + cls : '');
    };

    if (!gh.token || !gh.repo) {
      set('Укажите GitHub-токен и репозиторий', 'err');
      API.setSaveStatus('Ошибка: нет токена/репозитория', 'err');
      return;
    }

    set('Получаем SHA текущего файла…', 'busy');
    API.setSaveStatus('Отправка на GitHub…', 'busy');

    const api = `https://api.github.com/repos/${gh.repo}/contents/${gh.path}`;
    const headers = {
      'Authorization': `Bearer ${gh.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    try {
      // 1) получаем текущий SHA
      let sha = null;
      const getRes = await fetch(`${api}?ref=${encodeURIComponent(gh.branch)}`, { headers });
      if (getRes.ok) {
        const j = await getRes.json();
        sha = j.sha;
      } else if (getRes.status !== 404) {
        const err = await getRes.json().catch(() => ({}));
        throw new Error(`Не удалось получить файл: ${getRes.status} ${err.message || ''}`);
      }

      // 2) формируем контент (utf-8 → base64 с поддержкой кириллицы)
      const json = JSON.stringify(API.getData(), null, 2);
      const b64 = btoa(unescape(encodeURIComponent(json)));

      // 3) PUT
      const body = {
        message: `Обновление Аниме-Архива (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`,
        content: b64,
        branch: gh.branch
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(api, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(`${putRes.status}: ${err.message || 'Ошибка GitHub API'}`);
      }

      set('Отправлено на GitHub ✓', 'ok');
      API.setSaveStatus('Отправлено на GitHub', 'ok');
      API.toast('Данные отправлены на GitHub', 'ok');
    } catch (e) {
      console.error(e);
      set('Ошибка: ' + e.message, 'err');
      API.setSaveStatus('Ошибка GitHub: ' + e.message, 'err');
      API.toast('Ошибка сохранения на GitHub', 'err');
    }
  }

  /* ==================== Экспорт / импорт ==================== */
  function exportJson() {
    const blob = new Blob([JSON.stringify(API.getData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(a.href);
    API.toast('Файл data.json выгружен', 'ok');
  }

  function importJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        if (!parsed || !Array.isArray(parsed.titles)) throw new Error('Ожидается { titles: [...] }');
        API.setData(parsed);
        API.saveLocal();
        API.renderAll();
        API.toast('Импортировано тайтлов: ' + parsed.titles.length, 'ok');
      } catch (err) {
        API.toast('Ошибка импорта: ' + err.message, 'err');
      }
      e.target.value = '';
    };
    r.readAsText(file);
  }

  window.Admin = { init, openEditor, closeEditor };
})();
