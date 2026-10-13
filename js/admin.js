/* ============================================================
   АНИМЕ-АРХИВ — admin.js
   Модуль владельца: сохранение каталога на GitHub через
   Contents API (PUT data.json с обязательным SHA текущего файла),
   Personal Access Token в localStorage, экспорт/импорт JSON,
   строка статуса «Сохранено локально / Отправлено на GitHub».

   Модуль подключается на всех страницах, но активируется
   ТОЛЬКО в режиме владельца (App.isOwner()). Сам по себе URL
   admin.html прав ничего не даёт: без токена изменить data.json
   в репозитории невозможно.
   ============================================================ */
(function () {
  'use strict';

  const LS_GH = 'animeArchive.github';   // { token, repo, branch, path }
  const LS_DATA = 'animeArchive.data';   // ключ автосохранения app.js

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.App || !App.isOwner()) return;   // публичный режим — выходим
    boot();
  });

  /* ============================================================
     ПАНЕЛЬ ВЛАДЕЛЬЦА (вкладка «Настройки», над остальными секциями)
     ============================================================ */
  function boot() {
    const cfg = loadGhCfg();

    document.getElementById('tab-settings')
      .insertAdjacentHTML('afterbegin', `
      <div class="admin-panel" id="admin-panel">
        <h3><svg class="icon"><use href="#i-key"/></svg>Панель владельца — синхронизация с GitHub</h3>

        <div class="admin-row">
          <input type="password" class="form-input" id="gh-token"
                 placeholder="Personal Access Token (права repo / Contents: write)"
                 autocomplete="off">
          <button class="btn btn--accent" id="gh-check">
            <svg class="icon"><use href="#i-check"/></svg>Проверить
          </button>
        </div>

        <div class="admin-row">
          <input class="form-input" id="gh-repo" placeholder="владелец/репозиторий" style="flex:1.4 1 180px;">
          <input class="form-input" id="gh-branch" placeholder="ветка (main)">
          <input class="form-input" id="gh-path" placeholder="путь к data.json">
        </div>

        <div class="admin-row">
          <button class="btn btn--accent" id="gh-put">
            <svg class="icon"><use href="#i-save"/></svg>Отправить на GitHub
          </button>
          <button class="btn btn--ghost" id="gh-pull">
            <svg class="icon"><use href="#i-download"/></svg>Взять с GitHub
          </button>
          <button class="btn btn--ghost" id="btn-export">
            <svg class="icon"><use href="#i-download"/></svg>Экспорт JSON
          </button>
          <button class="btn btn--ghost" id="btn-import">
            <svg class="icon"><use href="#i-upload"/></svg>Импорт JSON
          </button>
          <button class="btn btn--danger btn--small" id="gh-wipe-local">Сбросить локальную копию</button>
          <input type="file" id="imp-file" accept=".json,application/json" hidden>
        </div>

        <label class="drop-zone" id="drop-zone">
          …или перетащите файл <code>data.json</code> сюда — каталог будет заменён его содержимым
        </label>

        <div class="status-line" id="gh-status">
          <span class="status-dot"></span><span id="gh-status-text">Готово к работе</span>
        </div>

        <p class="token-hint">
          Токен хранится только в localStorage вашего браузера и отправляется исключительно
          в API GitHub. Репозиторий и ветка определяются автоматически по адресу страницы
          (можно исправить вручную). Публичная страница ничего не знает о токене.
        </p>
      </div>`);

    // Предзаполнение и автоопределение
    $('#gh-repo').value = cfg.repo || autoDetectRepo() || '';
    $('#gh-branch').value = cfg.branch || '';
    $('#gh-path').value = cfg.path || 'data.json';
    if (cfg.token) $('#gh-token').placeholder = 'Токен сохранён — введите новый, чтобы заменить';

    bind();
    setStatus('ok', `Локально: ${App.titles.length} тайтл(ов)`);

    // Если есть несохранённая локальная копия — сразу предупредим
    if (localStorage.getItem(LS_DATA)) {
      setStatus('warn', 'Есть локальные правки — не отправлено на GitHub');
    }
  }

  const $ = sel => document.querySelector(sel);

  /* ============================================================
     КОНФИГУРАЦИЯ GITHUB (localStorage)
     ============================================================ */
  function loadGhCfg() {
    try { return JSON.parse(localStorage.getItem(LS_GH)) || {}; } catch { return {}; }
  }
  function saveGhCfg(patch) {
    localStorage.setItem(LS_GH, JSON.stringify({ ...loadGhCfg(), ...patch }));
  }

  // Автоопределение: https://<owner>.github.io/<repo>/… или <owner>.github.io
  function autoDetectRepo() {
    try {
      const url = new URL(location.href);
      if (!/\.github\.io$/.test(url.hostname)) return '';
      const owner = url.hostname.replace(/\.github\.io$/, '');
      const seg = url.pathname.split('/').filter(Boolean)[0];
      return seg ? `${owner}/${seg}` : `${owner}/${owner}.github.io`;
    } catch { return ''; }
  }

  const apiHeaders = token => ({
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  });

  /* ============================================================
     СТАТУСНАЯ СТРОКА
     ============================================================ */
  function setStatus(kind, text) {
    const line = $('#gh-status');
    if (!line) return;
    line.className = `status-line status-line--${kind}`;
    $('#gh-status-text').textContent = text;
  }

  /* ============================================================
     UTF-8 → base64 (для Contents API), безопасно для больших строк
     ============================================================ */
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }

  /* ============================================================
     ГЛАВНОЕ: ОТПРАВКА data.json НА GITHUB (PUT с SHA)
     ============================================================ */
  async function saveToGitHub() {
    const token = $('#gh-token').value.trim() || loadGhCfg().token;
    const repo = $('#gh-repo').value.trim();
    const branch = $('#gh-branch').value.trim() || 'main';
    const path = ($('#gh-path').value.trim() || 'data.json').replace(/^\/+/, '');

    if (!token) { setStatus('err', 'Введите Personal Access Token'); App.showToast('Сначала вставьте токен', 'err'); return; }
    if (!repo || !/^[^/]+\/[^/]+$/.test(repo)) { setStatus('err', 'Укажите репозиторий в формате «владелец/имя»'); return; }

    saveGhCfg({ token, repo, branch, path });
    setStatus('warn', 'Отправка на GitHub…');
    $('#gh-put').disabled = true;

    try {
      // 1. Определяем ветку по умолчанию (если поле пустовало) и SHA текущего файла
      let sha = null;
      const fileUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;

      const head = await fetch(fileUrl, { headers: apiHeaders(token), cache: 'no-store' });
      if (head.ok) {
        const info = await head.json();
        sha = info.sha;
      } else if (head.status !== 404) {
        throw await ghError(head, `не удалось прочитать текущий ${path}`);
      }
      // 404 — файла ещё нет: создадим его без SHA

      // 2. PUT с обновлённым содержимым
      const content = utf8ToBase64(App.exportJSON());
      const message = `Каталог: ${App.titles.length} тайтл(ов) — ${new Date().toLocaleString('ru-RU')}`;

      let put = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, content, sha, branch }),
      });

      // 3. Ретрай при конфликте (файл изменился с момента чтения SHA)
      if (put.status === 409 || put.status === 422) {
        const retryHead = await fetch(fileUrl, { headers: apiHeaders(token), cache: 'no-store' });
        if (retryHead.ok) {
          sha = (await retryHead.json()).sha;
          put = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, content, sha, branch }),
          });
        }
      }

      if (!put.ok) throw await ghError(put, 'коммит не прошёл');

      // 4. Успех: синхронизируем локальную копию с отправленной
      App.saveToLocal();
      setStatus('ok', `Отправлено на GitHub (${branch}) — появится на сайте через минуту-две`);
      App.showToast('data.json закоммичен на GitHub', 'ok', 4200);
    } catch (e) {
      setStatus('err', e.message);
      App.showToast('Ошибка сохранения: ' + e.message, 'err', 5000);
    } finally {
      $('#gh-put').disabled = false;
    }
  }

  // Человекочитаемая ошибка из ответа API
  async function ghError(res, prefix) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j.message || '';
    } catch { /* тело не JSON — игнорируем */ }
    if (res.status === 401) return new Error(`${prefix}: токен недействителен или истёк (401)`);
    if (res.status === 403 && /rate limit/i.test(detail)) return new Error(`${prefix}: превышен лимит запросов API, подождите пару минут`);
    if (res.status === 404) return new Error(`${prefix}: проверьте «владелец/репозиторий», ветку и путь к файлу (404)`);
    if (res.status === 409) return new Error(`${prefix}: конфликт версий файла (409) — попробуйте ещё раз`);
    return new Error(`${prefix}: ${detail || 'HTTP ' + res.status}`);
  }

  /* ============================================================
     ПРОВЕРКА ТОКЕНА: заодно узнаём ветку по умолчанию
     ============================================================ */
  async function checkToken() {
    const token = $('#gh-token').value.trim();
    const repo = $('#gh-repo').value.trim();
    if (!token) { setStatus('err', 'Вставьте токен в поле выше'); return; }
    if (!repo) { setStatus('err', 'Укажите репозиторий «владелец/имя»'); return; }

    setStatus('warn', 'Проверяю доступ…');
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: apiHeaders(token), cache: 'no-store',
      });
      if (!res.ok) throw await ghError(res, 'проверка не прошла');

      const info = await res.json();
      const branch = $('#gh-branch').value.trim() || info.default_branch;
      $('#gh-branch').value = branch;
      saveGhCfg({ token, repo, branch, path: $('#gh-path').value.trim() || 'data.json' });
      setStatus('ok', `Токен работает · репозиторий: ${info.full_name} · ветка: ${branch}`);
      App.showToast('Подключение к GitHub установлено', 'ok');
    } catch (e) {
      setStatus('err', e.message);
      App.showToast(e.message, 'err');
    }
  }

  /* ============================================================
     ЭКСПОРТ / ИМПОРТ JSON
     ============================================================ */
  function exportJSON() {
    const blob = new Blob([App.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(a.href);
    App.showToast('Файл data.json скачан', 'ok');
  }

  async function importFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const titles = Array.isArray(parsed) ? parsed : parsed.titles;
      if (!Array.isArray(titles)) throw new Error('в файле нет массива тайтлов');
      App.setTitles(titles);
      App.scheduleAutosave();
      setStatus('warn', 'Импортировано локально — не забудьте «Отправить на GitHub»');
      App.showToast(`Импортировано тайтлов: ${titles.length}`, 'ok');
    } catch (e) {
      App.showToast('Не удалось прочитать файл: ' + e.message, 'err', 5000);
    }
  }

  /* ============================================================
     СОБЫТИЯ
     ============================================================ */
  function bind() {
    $('#gh-check').addEventListener('click', checkToken);
    $('#gh-put').addEventListener('click', saveToGitHub);

    $('#gh-pull').addEventListener('click', async () => {
      try {
        await App.forceRemoteLoad();          // свежий data.json с сервера
        App.saveToLocal();                   // локальная копия = серверной
        setStatus('ok', 'Загружено с GitHub — локальная копия синхронизирована');
      } catch (e) {
        setStatus('err', 'Не удалось загрузить: ' + e.message);
      }
    });

    $('#btn-export').addEventListener('click', exportJSON);

    $('#btn-import').addEventListener('click', () => $('#imp-file').click());
    $('#imp-file').addEventListener('change', e => {
      importFile(e.target.files[0]);
      e.target.value = '';
    });

    // Перетаскивание файла в дроп-зону
    const dz = $('#drop-zone');
    ['dragenter', 'dragover'].forEach(ev =>
      dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach(ev =>
      dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('is-over'); }));
    dz.addEventListener('drop', e => importFile(e.dataTransfer.files[0]));

    // Сброс локальной копии (вернуться к версии с GitHub)
    $('#gh-wipe-local').addEventListener('click', () => {
      localStorage.removeItem(LS_DATA);
      App.showToast('Локальная копия сброшена — перезагрузка…', 'info');
      setTimeout(() => location.reload(), 900);
    });

    // Любое локальное автосохранение = есть неотправленные правки
    App.on('local-saved', () => {
      setStatus('warn', 'Сохранено локально · не отправлено на GitHub');
    });
  }
})();
