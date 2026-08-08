// =========================================================
// FLUX — espace admin (utilise les MÊMES identifiants Supabase que le widget)
// =========================================================
const SUPABASE_URL = 'https://bvmovojwwieytjhszkfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bW92b2p3d2lleXRqaHN6a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODI5NTUsImV4cCI6MjEwMTc1ODk1NX0.VjVLICZabfq7f2qwiV8RknHjODyjym0lT6viaHFBc7I';
const ADMIN_EMAIL = 'devt23773@gmail.com';
// =========================================================

(function () {
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const authEl = document.getElementById('adminAuth');
  const shellEl = document.getElementById('adminShell');
  const step1 = document.getElementById('adminAuthStep1');
  const step2 = document.getElementById('adminAuthStep2');
  const errorEl = document.getElementById('adminError');
  const authText = document.getElementById('adminAuthText');

  let pendingEmail = '';

  document.getElementById('adminSendCode').addEventListener('click', async () => {
    const email = document.getElementById('adminEmail').value.trim();
    if (!email) return (errorEl.textContent = 'Entrez un email.');
    errorEl.textContent = '';
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) return (errorEl.textContent = "Impossible d'envoyer le code.");
    pendingEmail = email;
    authText.textContent = `Code envoyé à ${email}`;
    step1.style.display = 'none';
    step2.style.display = 'block';
  });

  document.getElementById('adminVerify').addEventListener('click', async () => {
    const token = document.getElementById('adminCode').value.trim();
    const { error } = await sb.auth.verifyOtp({ email: pendingEmail, token, type: 'email' });
    if (error) return (errorEl.textContent = 'Code incorrect ou expiré.');
    boot();
  });

  // ---------- state ----------
  let conversations = [];
  let activeId = null;
  let msgChannel = null;

  async function boot() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user || user.email !== ADMIN_EMAIL) {
      errorEl.textContent = "Ce compte n'a pas accès à l'espace admin.";
      await sb.auth.signOut();
      return;
    }
    authEl.style.display = 'none';
    shellEl.classList.add('is-ready');
    await loadConversations();

    sb.channel('admin-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, loadConversations)
      .subscribe();
  }

  async function loadConversations() {
    const { data } = await sb
      .from('conversations')
      .select('id, visitor_email, status, updated_at')
      .order('updated_at', { ascending: false });
    conversations = data || [];
    document.getElementById('adminCount').textContent = conversations.length + ' conversation(s)';
    renderList();
  }

  function renderList() {
    const list = document.getElementById('adminList');
    list.innerHTML = conversations.map(c => `
      <button class="admin-convo ${c.id === activeId ? 'is-active' : ''}" data-id="${c.id}">
        <div class="admin-convo__row">
          <span class="admin-convo__email">${escapeHtml(c.visitor_email)}</span>
          <span class="admin-convo__badge ${c.status !== 'needs_human' ? 'is-open' : ''}">${c.status === 'needs_human' ? 'À répondre' : c.status === 'closed' ? 'Clôturé' : 'IA active'}</span>
        </div>
        <div class="admin-convo__preview">${new Date(c.updated_at).toLocaleString('fr-FR')}</div>
      </button>
    `).join('');
    list.querySelectorAll('.admin-convo').forEach(btn => {
      btn.addEventListener('click', () => openConversation(btn.dataset.id));
    });
  }

  async function openConversation(id) {
    activeId = id;
    document.getElementById('adminShell').classList.add('thread-open');
    renderList();
    const convo = conversations.find(c => c.id === id);

    const main = document.getElementById('adminMain');
    main.innerHTML = `
      <div class="admin-main__head">
        <div>
          <h2>${escapeHtml(convo.visitor_email)}</h2>
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
      await sb.from('conversations').update({ status: 'open' }).eq('id', id);
    });

    const input = document.getElementById('adminReplyInput');
    const sendBtn = document.getElementById('adminReplySend');
    async function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      await sb.from('messages').insert({ conversation_id: id, sender: 'admin', content: text });
    }
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

    const { data: messages } = await sb
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    const thread = document.getElementById('adminThread');
    thread.innerHTML = '';
    (messages || []).forEach(appendThreadMessage);

    if (msgChannel) sb.removeChannel(msgChannel);
    msgChannel = sb
      .channel('admin-messages-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => appendThreadMessage(payload.new))
      .subscribe();
  }

  function appendThreadMessage(msg) {
    const thread = document.getElementById('adminThread');
    if (!thread) return;
    const div = document.createElement('div');
    div.className = 'admin-msg admin-msg--' + msg.sender;
    div.textContent = msg.content;
    const time = document.createElement('small');
    time.textContent = new Date(msg.created_at || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    div.appendChild(time);
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // reprise de session si déjà connecté
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session) boot();
  });
})();
