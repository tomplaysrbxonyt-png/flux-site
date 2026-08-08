// =========================================================
// FLUX — widget de chat (IA + bascule humaine + auth par code email)
// =========================================================
// À REMPLIR une fois le projet Supabase créé (voir README section "Chatbot") :
const SUPABASE_URL = 'https://bvmovojwwieytjhszkfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bW92b2p3d2lleXRqaHN6a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODI5NTUsImV4cCI6MjEwMTc1ODk1NX0.VjVLICZabfq7f2qwiV8RknHjODyjym0lT6viaHFBc7I';
// =========================================================

(function () {
  if (!window.supabase || SUPABASE_URL.startsWith('REMPLACE')) {
    console.warn('Flux chat: configure SUPABASE_URL / SUPABASE_ANON_KEY dans assets/js/chat-widget.js');
  }
  const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  // ---------- build DOM ----------
  const root = document.createElement('div');
  root.className = 'flux-chat';
  root.innerHTML = `
    <button class="flux-chat__bubble" id="fluxChatToggle" aria-label="Ouvrir le chat">
      <span class="dot-badge"></span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    </button>
    <div class="flux-chat__panel" id="fluxChatPanel"></div>
  `;
  document.body.appendChild(root);

  const toggleBtn = root.querySelector('#fluxChatToggle');
  const panel = root.querySelector('#fluxChatPanel');

  toggleBtn.addEventListener('click', () => {
    const willOpen = !root.classList.contains('is-open');
    root.classList.toggle('is-open');
    if (willOpen) init();
  });

  // ---------- state ----------
  let conversationId = null;
  let channel = null;
  let initialized = false;
  let pendingEmail = '';

  function render(html) { panel.innerHTML = html; }

  function renderLoading() {
    render(`<div class="flux-chat__loading">Chargement…</div>`);
  }

  function renderAuthEmail(error) {
    render(`
      <div class="flux-chat__head">
        <div><h4>Une question ?</h4><p>Connectez-vous pour discuter avec nous</p></div>
        <button class="flux-chat__close" id="fluxClose">✕</button>
      </div>
      <div class="flux-chat__auth">
        <p>Entrez votre email : on vous envoie un code à 6 chiffres, pas de mot de passe à retenir.</p>
        <input type="email" id="fluxEmail" placeholder="vous@exemple.com" autocomplete="email" />
        <div class="flux-chat__auth-error">${error || ''}</div>
        <button id="fluxSendCode">Recevoir mon code</button>
      </div>
    `);
    bindClose();
    const emailInput = panel.querySelector('#fluxEmail');
    const btn = panel.querySelector('#fluxSendCode');
    emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
    btn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email || !email.includes('@')) return renderAuthEmail('Entrez un email valide.');
      btn.disabled = true; btn.textContent = 'Envoi du code…';
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) { renderAuthEmail("Impossible d'envoyer le code — réessayez."); return; }
      pendingEmail = email;
      renderAuthCode();
    });
  }

  function renderAuthCode(error) {
    render(`
      <div class="flux-chat__head">
        <div><h4>Vérification</h4><p>${pendingEmail}</p></div>
        <button class="flux-chat__close" id="fluxClose">✕</button>
      </div>
      <div class="flux-chat__auth">
        <p>Entrez le code à 6 chiffres reçu par email (valable quelques minutes).</p>
        <input type="text" id="fluxCode" inputmode="numeric" maxlength="6" placeholder="123456" />
        <div class="flux-chat__auth-error">${error || ''}</div>
        <button id="fluxVerify">Valider</button>
        <button id="fluxResend" class="flux-chat__auth-link">Renvoyer le code</button>
      </div>
    `);
    bindClose();
    const codeInput = panel.querySelector('#fluxCode');
    const btn = panel.querySelector('#fluxVerify');
    codeInput.focus();
    codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
    btn.addEventListener('click', async () => {
      const token = codeInput.value.trim();
      if (token.length < 6) return renderAuthCode('Le code fait 6 chiffres.');
      btn.disabled = true; btn.textContent = 'Vérification…';
      const { error } = await sb.auth.verifyOtp({ email: pendingEmail, token, type: 'email' });
      if (error) { renderAuthCode('Code incorrect ou expiré.'); return; }
      await loadConversation();
    });
    panel.querySelector('#fluxResend').addEventListener('click', async () => {
      await sb.auth.signInWithOtp({ email: pendingEmail, options: { shouldCreateUser: true } });
      renderAuthCode('Nouveau code envoyé.');
    });
  }

  function renderChat() {
    render(`
      <div class="flux-chat__head">
        <div><h4>Assistant Flux</h4><p>Réponses instantanées, ou par un humain si besoin</p></div>
        <button class="flux-chat__close" id="fluxClose">✕</button>
      </div>
      <div class="flux-chat__body" id="fluxBody"></div>
      <div class="flux-chat__input">
        <input type="text" id="fluxMsgInput" placeholder="Posez votre question…" autocomplete="off" />
        <button id="fluxSend" aria-label="Envoyer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    `);
    bindClose();
    const input = panel.querySelector('#fluxMsgInput');
    const sendBtn = panel.querySelector('#fluxSend');
    input.focus();
    function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      sendMessage(text);
    }
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  function bindClose() {
    const closeBtn = panel.querySelector('#fluxClose');
    if (closeBtn) closeBtn.addEventListener('click', () => root.classList.remove('is-open'));
  }

  // ---------- messages rendering ----------
  const seenMessageIds = new Set();
  let typingEl = null;

  function appendMessage(msg) {
    if (seenMessageIds.has(msg.id)) return;
    seenMessageIds.add(msg.id);
    const body = panel.querySelector('#fluxBody');
    if (!body) return;
    removeTyping();
    const div = document.createElement('div');
    div.className = 'flux-chat__msg flux-chat__msg--' + msg.sender;
    div.textContent = msg.content;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    const body = panel.querySelector('#fluxBody');
    if (!body || typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'flux-chat__typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(typingEl);
    body.scrollTop = body.scrollHeight;
  }
  function removeTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  // ---------- conversation lifecycle ----------
  async function loadConversation() {
    renderLoading();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return renderAuthEmail();

    let { data: convos } = await sb
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(1);

    let convo = convos && convos[0];
    if (!convo) {
      const { data: created, error } = await sb
        .from('conversations')
        .insert({ user_id: user.id, visitor_email: user.email })
        .select('id')
        .single();
      if (error) { renderChat(); return; }
      convo = created;
    }
    conversationId = convo.id;

    renderChat();

    const { data: history } = await sb
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (history && history.length) {
      history.forEach(appendMessage);
    } else {
      appendMessage({ id: 'welcome', sender: 'bot', content: "Bonjour 👋 Posez-moi une question sur les voitures électriques, le solaire ou les économies d'énergie." });
    }

    if (channel) sb.removeChannel(channel);
    channel = sb
      .channel('messages-' + conversationId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => { if (payload.new.sender !== 'visitor') appendMessage(payload.new); })
      .subscribe();
  }

  async function sendMessage(text) {
    appendMessage({ id: 'local-' + Date.now(), sender: 'visitor', content: text });
    showTyping();
    const { error } = await sb.functions.invoke('chat', { body: { conversationId, message: text } });
    if (error) {
      removeTyping();
      appendMessage({ id: 'err-' + Date.now(), sender: 'bot', content: "Petit souci de connexion — réessayez dans un instant." });
    }
  }

  // ---------- init on first open ----------
  async function init() {
    if (initialized || !sb) return;
    initialized = true;
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await loadConversation();
    } else {
      renderAuthEmail();
    }
  }
})();
