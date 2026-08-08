// =========================================================
// FLUX — espace admin (v2 : code secret, pas de compte)
// =========================================================
// À REMPLIR une fois la fonction "admin" déployée sur Supabase (voir README) :
const ADMIN_ENDPOINT = 'https://bvmovojwwieytjhszkfl.supabase.co/functions/v1/chat';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bW92b2p3d2lleXRqaHN6a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODI5NTUsImV4cCI6MjEwMTc1ODk1NX0.VjVLICZabfq7f2qwiV8RknHjODyjym0lT6viaHFBc7I';
// =========================================================

(function () {
  const authEl = document.getElementById('adminAuth');
  const shellEl = document.getElementById('adminShell');
  const errorEl = document.getElementById('adminError');
  const codeInput = document.getElementById('adminCode');

  let ADMIN_CODE = sessionStorage.getItem('fluxAdminCode') || '';
  let conversations = [];
  let activeId = null;
  let listTimer = null;
  let threadTimer = null;

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
      document.getElementById('adminCount').textContent = conversations.length + ' conversation(s)';
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
      document.getElementById('adminCount').textContent = conversations.length + ' conversation(s)';
      renderList();
    } catch (e) { /* on retentera au prochain cycle */ }
  }

  function renderList() {
    const list = document.getElementById('adminList');
    list.innerHTML = conversations.map(c => `
      <button class="admin-convo ${c.id === activeId ? 'is-active' : ''}" data-id="${c.id}">
        <div class="admin-convo__row">
          <span class="admin-convo__email">${escapeHtml(c.visitor_email || 'Visiteur anonyme')}</span>
          <span class="admin-convo__badge ${c.status !== 'needs_human' ? 'is-open' : ''}">${c.status === 'needs_human' ? 'À répondre' : c.status === 'closed' ? 'Clôturé' : 'IA active'}</span>
        </div>
        <div class="admin-convo__preview">${new Date(c.updated_at).toLocaleString('fr-FR')}</div>
      </button>
    `).join('');
    list.querySelectorAll('.admin-convo').forEach(btn => {
      btn.addEventListener('click', () => openConversation(btn.dataset.id));
    });
  }

  const seenThreadIds = new Set();

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
          <p>${convo.status === 'needs_human' ? 'En attente de réponse humaine' : convo.status === 'closed' ? 'Clôturé' : "Géré par l'IA"}</p>
        </div>
        ${convo.status !== 'open' ? '<button class="admin-resolve" id="adminResolve">Repasser à l\'IA</button>' : ''}
      </div>
      <div class="admin-thread" id="adminThread"></div>
      <div class="admin-reply">
        <input type="text" id="adminReplyInput" placeholder="Répondre au visiteur…" autocomplete="off" />
        <button id="adminReplySend">Envoyer</button>
      </div>
    `;

    const resolveBtn = document.getElementById('adminResolve');
    if (resolveBtn) resolveBtn.addEventListener('click', async () => {
      await callFn({ action: 'resolve', conversationId: id });
      refreshList();
    });

    const input = document.getElementById('adminReplyInput');
    const sendBtn = document.getElementById('adminReplySend');
    async function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      await callFn({ action: 'reply', conversationId: id, message: text });
      refreshThread();
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
  if (ADMIN_CODE) tryEnter.call(null).catch ? null : (codeInput.value = ADMIN_CODE, tryEnter());
})();
