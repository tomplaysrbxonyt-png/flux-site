// =========================================================
// FLUX — widget de chat (v2 : pas de connexion visiteur)
// =========================================================
// À REMPLIR une fois la fonction "chat" déployée sur Supabase (voir README) :
const CHAT_ENDPOINT = 'https://bvmovojwwieytjhszkfl.supabase.co/functions/v1/chat';
const SUPABASE_ANON_KEY = 'sb_publishable_LJw7_zIoFr5fbRPoiWcK5w_49tNDqZx';
// =========================================================

(function () {
  if (CHAT_ENDPOINT.includes('REMPLACE_PAR_TON_PROJET')) {
    console.warn('Flux chat: configure CHAT_ENDPOINT dans assets/js/chat-widget.js');
  }

  // identifiant de conversation propre à ce navigateur (pas de compte)
  function getConversationId() {
    let id = localStorage.getItem('fluxConversationId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('fluxConversationId', id);
    }
    return id;
  }
  const conversationId = getConversationId();

  async function callFn(payload) {
    const res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
     'Content-Type': 'application/json',
     'apikey': SUPABASE_ANON_KEY,
     'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
   },
      body: JSON.stringify({ conversationId, ...payload }),
    });
    return res.json();
  }

  // ---------- build DOM ----------
  const root = document.createElement('div');
  root.className = 'flux-chat';
  root.innerHTML = `
    <button class="flux-chat__bubble" id="fluxChatToggle" aria-label="Ouvrir le chat">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    </button>
    <div class="flux-chat__panel" id="fluxChatPanel">
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
    </div>
  `;
  document.body.appendChild(root);

  const toggleBtn = root.querySelector('#fluxChatToggle');
  const panel = root.querySelector('#fluxChatPanel');
  const body = root.querySelector('#fluxBody');
  const input = root.querySelector('#fluxMsgInput');
  const sendBtn = root.querySelector('#fluxSend');
  root.querySelector('#fluxClose').addEventListener('click', () => root.classList.remove('is-open'));

  let pollTimer = null;
  let opened = false;
  let pendingQuestion = null; // question en attente d'un email pour être transmise

  toggleBtn.addEventListener('click', () => {
    root.classList.toggle('is-open');
    if (root.classList.contains('is-open') && !opened) {
      opened = true;
      appendMessage({ id: 'welcome', sender: 'bot', content: "Bonjour 👋 Posez-moi une question sur les voitures électriques, le solaire ou les économies d'énergie." });
      pollOnce();
      pollTimer = setInterval(pollOnce, 3500);
    }
  });

  // ---------- rendu des messages ----------
  const seen = new Set(['welcome']);
  let typingEl = null;

  function appendMessage(msg) {
    if (seen.has(msg.id)) return;
    seen.add(msg.id);
    removeTyping();
    const div = document.createElement('div');
    div.className = 'flux-chat__msg flux-chat__msg--' + msg.sender;
    div.textContent = msg.content;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'flux-chat__typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(typingEl);
    body.scrollTop = body.scrollHeight;
  }
  function removeTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  function showEmailPrompt() {
    removeTyping();
    const div = document.createElement('div');
    div.className = 'flux-chat__msg flux-chat__msg--bot';
    div.innerHTML = `
      <p style="margin:0 0 8px">Je ne suis pas certain de bien répondre — laissez votre email, un membre de l'équipe vous répondra ici même.</p>
      <input type="email" placeholder="vous@exemple.com" style="width:100%;margin-bottom:8px;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:#0B0D10;color:#F6F5F1;font-size:13px;" />
      <button style="width:100%;padding:8px;border:none;border-radius:8px;background:#3D8BFF;color:#06070A;font-weight:600;font-size:13px;cursor:pointer;">Envoyer</button>
    `;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    const emailInput = div.querySelector('input');
    const btn = div.querySelector('button');
    emailInput.focus();
    function submit() {
      const email = emailInput.value.trim();
      if (!email || !email.includes('@')) return;
      btn.disabled = true; btn.textContent = 'Envoi…';
      callFn({ action: 'provide-email', email, question: pendingQuestion }).then(() => {
        localStorage.setItem('fluxVisitorEmail', email);
        div.remove();
        pollOnce();
      });
    }
    btn.addEventListener('click', submit);
    emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }

  // ---------- polling ----------
  async function pollOnce() {
    try {
      const data = await callFn({ action: 'poll' });
      (data.messages || []).forEach((m) => appendMessage(m));
    } catch (e) { /* silencieux : on retentera au prochain cycle */ }
  }

  // ---------- envoi ----------
  async function send() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    appendMessage({ id: 'local-' + Date.now(), sender: 'visitor', content: text });
    showTyping();
    pendingQuestion = text;
    try {
      const data = await callFn({ action: 'send', message: text });
      removeTyping();
      if (data.needEmail) {
        showEmailPrompt();
      } else {
        pollOnce();
      }
    } catch (e) {
      removeTyping();
      appendMessage({ id: 'err-' + Date.now(), sender: 'bot', content: 'Petit souci de connexion — réessayez dans un instant.' });
    }
  }
  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
})();
