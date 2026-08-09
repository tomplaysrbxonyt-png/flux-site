// =========================================================
// FLUX — espace admin (v2 : code secret, dossiers, statuts)
// =========================================================
// À REMPLIR une fois la fonction "admin" déployée sur Supabase (voir README) :
const ADMIN_ENDPOINT = 'https://REMPLACE_PAR_TON_PROJET.supabase.co/functions/v1/admin';
const SUPABASE_ANON_KEY = 'REMPLACE_PAR_TA_CLE_ANON_PUBLIQUE';
// =========================================================

(function () {
  const authEl = document.getElementById('adminAuth');
  const shellEl = document.getElementById('adminShell');
  const errorEl = document.getElementById('adminError');
  const codeInput = document.getElementById('adminCode');

  let ADMIN_CODE = sessionStorage.getItem('fluxAdminCode') || '';
  let conversations = [];
  let activeId = null;
  let activeFolder = null; // null = "Toutes"
  let listTimer = null;
  let threadTimer = null;

  function getKnownFolders() {
    try { return JSON.parse(localStorage.getItem('fluxAdminFolders') || '[]'); }
    catch (e) { return []; }
  }
  function saveKnownFolder(name) {
    const folders = getKnownFolders();
    if (!folders.includes(name)) {
      folders.push(name);
      localStorage.setItem('fluxAdminFolders', JSON.stringify(folders));
    }
  }

  async function callFn(payload) {
    const res = await fetch(ADMIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ code: ADMIN_CODE, ...payload }),
    });
    if (res.status === 401) throw new Error('unauthorized');
    return res.json();
  }

  document.getElementById('adminEnter').addEventListener('click', tryEnter);
  codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryEnter(); });

  async function tryEnter() {
    const code = codeInput.value.trim();
    if (!code) return;
    ADMIN_CODE = code;
    errorEl.textContent = '';
    try {
      const data = await callFn({ action: 'list' });
      sessionStorage.setItem('fluxAdminCode', code);
      conversations = data.conversations || [];
      authEl.style.display = 'none';
      shellEl.classList.add('is-ready');
      renderFolderTabs();
      renderList();
      listTimer = setInterval(refreshList, 4000);
    } catch (e) {
      errorEl.textContent = 'Code incorrect.';
    }
  }

  async function refreshList() {
    try {
      const data = await callFn({ action: 'list' });
      conversations = data.conversations || [];
      renderFolderTabs();
      renderList();
    } catch (e) { /* on retentera au prochain cycle */ }
  }

  // ---------- onglets dossiers ----------
  function renderFolderTabs() {
    const dataFolders = [...new Set(conversations.map(c => c.folder).filter(Boolean))];
    const known = getKnownFolders();
    const allFolders = [...new Set([...dataFolders, ...known])].sort();

    const head = document.querySelector('.admin-sidebar__head');
    let tabsEl = document.getElementById('adminFolderTabs');
    if (!tabsEl) {
      tabsEl = document.createElement('div');
      tabsEl.id = 'adminFolderTabs';
      tabsEl.className = 'admin-folder-tabs';
      head.appendChild(tabsEl);
    }

    const countAll = conversations.length;
    const countNone = conversations.filter(c => !c.folder).length;

    let html = `<button class="admin-folder-tab ${activeFolder === null ? 'is-active' : ''}" data-folder="">Toutes (${countAll})</button>`;
    html += `<button class="admin-folder-tab ${activeFolder === '__none__' ? 'is-active' : ''}" data-folder="__none__">Sans dossier (${countNone})</button>`;
    allFolders.forEach(f => {
      const count = conversations.filter(c => c.folder === f).length;
      html += `<button class="admin-folder-tab ${activeFolder === f ? 'is-active' : ''}" data-folder="${escapeHtml(f)}">${escapeHtml(f)} (${count})</button>`;
    });
    html += `<button class="admin-folder-tab admin-folder-tab--new" id="adminNewFolder">+ Dossier</button>`;
    tabsEl.innerHTML = html;

    tabsEl.querySelectorAll('.admin-folder-tab[data-folder]').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.folder;
        activeFolder = f === '' ? null : f;
        renderFolderTabs();
        renderList();
      });
    });
    document.getElementById('adminNewFolder').addEventListener('click', () => {
      const name = prompt('Nom du nouveau dossier :');
      if (name && name.trim()) {
        saveKnownFolder(name.trim());
        activeFolder = name.trim();
        renderFolderTabs();
        renderList();
      }
    });
  }

  // ---------- liste des conversations ----------
  function renderList() {
    let filtered = conversations;
    if (activeFolder === '__none__') filtered = conversations.filter(c => !c.folder);
    else if (activeFolder) filtered = conversations.filter(c => c.folder === activeFolder);

    document.getElementById('adminCount').textContent = filtered.length + ' conversation(s)';

    const list = document.getElementById('adminList');
    const folderOptions = [...new Set([...conversations.map(c => c.folder).filter(Boolean), ...getKnownFolders()])].sort();

    list.innerHTML = filtered.map(c => `
      <div class="admin-convo ${c.id === activeId ? 'is-active' : ''}" data-id="${c.id}">
        <button class="admin-convo__main" data-open="${c.id}">
          <div class="admin-convo__row">
            <span class="admin-convo__email">${escapeHtml(c.visitor_email || 'Visiteur anonyme')}</span>
            <span class="admin-convo__badge ${c.status === 'needs_human' ? '' : c.status === 'closed' ? 'is-closed' : 'is-open'}">${c.status === 'needs_human' ? 'À répondre' : c.status === 'closed' ? 'Clôturé' : 'IA active'}</span>
          </div>
          <div class="admin-convo__preview">${new Date(c.updated_at).toLocaleString('fr-FR')}</div>
        </button>
        <select class="admin-convo__folder" data-move="${c.id}" title="Déplacer dans un dossier">
          <option value="">Sans dossier</option>
          ${folderOptions.map(f => `<option value="${escapeHtml(f)}" ${c.folder === f ? 'selected' : ''}>${escapeHtml(f)}</option>`).join('')}
          <option value="__new__">+ Nouveau dossier…</option>
        </select>
      </div>
    `).join('');

    list.querySelectorAll('[data-open]').forEach(btn => {
      btn.addEventListener('click', () => openConversation(btn.dataset.open));
    });
    list.querySelectorAll('[data-move]').forEach(sel => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', async (e) => {
        e.stopPropagation();
        const id = sel.dataset.move;
        let value = sel.value;
        if (value === '__new__') {
          const name = prompt('Nom du nouveau dossier :');
          if (!name || !name.trim()) { renderList(); return; }
          value = name.trim();
          saveKnownFolder(value);
        }
        await callFn({ action: 'set-folder', conversationId: id, folder: value });
        const convo = conversations.find(c => c.id === id);
        if (convo) convo.folder = value || null;
        renderFolderTabs();
        renderList();
      });
    });
  }

  // ---------- fil de discussion ----------
  const seenThreadIds = new Set();

  function statusLabel(status) {
    if (status === 'needs_human') return 'En attente de réponse humaine';
    if (status === 'closed') return 'Clôturé';
    return "Géré par l'IA";
  }

  function statusButtons(convo) {
    if (convo.status === 'needs_human') {
      return `
        <button class="admin-btn admin-btn--ghost" data-status="open">Repasser à l'IA</button>
        <button class="admin-btn admin-btn--solid" data-status="closed">Marquer terminé</button>
      `;
    }
    if (convo.status === 'open') {
      return `<button class="admin-btn admin-btn--solid" data-status="closed">Marquer terminé</button>`;
    }
    // closed
    return `<button class="admin-btn admin-btn--ghost" data-status="needs_human">Rouvrir</button>`;
  }

  async function openConversation(id) {
    activeId = id;
    seenThreadIds.clear();
    document.getElementById('adminShell').classList.add('thread-open');
    renderList();
    const convo = conversations.find(c => c.id === id);

    const main = document.getElementById('adminMain');
    main.innerHTML = `
      <div class="admin-main__head">
        <div>
          <h2>${escapeHtml(convo.visitor_email || 'Visiteur anonyme')}</h2>
          <p id="adminStatusLabel">${statusLabel(convo.status)}</p>
        </div>
        <div class="admin-main__actions" id="adminActions">${statusButtons(convo)}</div>
      </div>
      <div class="admin-thread" id="adminThread"></div>
      <div class="admin-reply">
        <input type="text" id="adminReplyInput" placeholder="Répondre au visiteur…" autocomplete="off" />
        <button id="adminReplySend">Envoyer</button>
      </div>
    `;

    document.getElementById('adminActions').querySelectorAll('[data-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await callFn({ action: 'set-status', conversationId: id, status: btn.dataset.status });
        await refreshList();
        openConversation(id); // ré-affiche l'en-tête avec les bons boutons pour le nouveau statut
      });
    });

    const input = document.getElementById('adminReplyInput');
    const sendBtn = document.getElementById('adminReplySend');
    async function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      await callFn({ action: 'reply', conversationId: id, message: text });
      await refreshThread();
      await refreshList();
    }
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

    await refreshThread();
    if (threadTimer) clearInterval(threadTimer);
    threadTimer = setInterval(refreshThread, 3000);
  }

  async function refreshThread() {
    if (!activeId) return;
    const data = await callFn({ action: 'thread', conversationId: activeId });
    const thread = document.getElementById('adminThread');
    if (!thread) return;
    (data.messages || []).forEach(msg => {
      if (seenThreadIds.has(msg.id)) return;
      seenThreadIds.add(msg.id);
      const div = document.createElement('div');
      div.className = 'admin-msg admin-msg--' + msg.sender;
      div.textContent = msg.content;
      const time = document.createElement('small');
      time.textContent = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      div.appendChild(time);
      thread.appendChild(div);
    });
    thread.scrollTop = thread.scrollHeight;
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // reprise automatique si le code est déjà en mémoire pour cet onglet
  if (ADMIN_CODE) {
    codeInput.value = ADMIN_CODE;
    tryEnter();
  }
})();
