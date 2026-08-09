// =========================================================
// FLUX — widget de chat (v3 : saisie en direct, note, reset après clôture)
// =========================================================
// À REMPLIR une fois la fonction "chat" déployée sur Supabase (voir README) :
const CHAT_ENDPOINT = 'https://bvmovojwwieytjhszkfl.supabase.co/functions/v1/chat';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bW92b2p3d2lleXRqaHN6a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODI5NTUsImV4cCI6MjEwMTc1ODk1NX0.VjVLICZabfq7f2qwiV8RknHjODyjym0lT6viaHFBc7I';
// =========================================================

(function () {
  if (CHAT_ENDPOINT.includes('REMPLACE_PAR_TON_PROJET')) {
    console.warn('Flux chat: configure CHAT_ENDPOINT dans assets/js/chat-widget.js');
  }

  function getConversationId() {
    let id = localStorage.getItem('fluxConversationId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('fluxConversationId', id);
    }
    return id;
  }
  let conversationId = getConversationId();

  function hasRated() { return localStorage.getItem('fluxRated:' + conversationId) === '1'; }

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
  const body = root.querySelector('#fluxBody');
  const input = root.querySelector('#fluxMsgInput');
  const sendBtn = root.querySelector('#fluxSend');
  root.querySelector('#fluxClose').addEventListener('click', () => root.classList.remove('is-open'));

  let pollTimer = null;
  let opened = false;
  let pendingQuestion = null;
  let lastStatus = null;
  let aiPending = false;
  let peerTypingActive = false;
  let typingEl = null;
  const seen = new Set();

  // ---------- rendu ----------
  function appendMessage(msg) {
    if (seen.has(msg.id)) return;
    seen.add(msg.id);
    if (typingEl) typingEl.remove();
    const div = document.createElement('div');
    div.className = 'flux-chat__msg flux-chat__msg--' + msg.sender;
    div.textContent = msg.content;
    body.appendChild(div);
    if (typingEl) body.appendChild(typingEl);
    body.scrollTop = body.scrollHeight;
  }

  function syncTypingIndicator() {
    const shouldShow = aiPending || peerTypingActive;
    if (shouldShow && !typingEl) {
      typingEl = document.createElement('div');
      typingEl.className = 'flux-chat__typing';
      typingEl.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(typingEl);
    } else if (!shouldShow && typingEl) {
      typingEl.remove();
      typingEl = null;
    }
    body.scrollTop = body.scrollHeight;
  }

  function showWelcome() {
    appendMessage({ id: 'welcome', sender: 'bot', content: "Bonjour 👋 Posez-moi une question sur les voitures électriques, le solaire ou les économies d'énergie." });
  }

  function showEmailPrompt() {
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

  function showRatingPrompt() {
    const div = document.createElement('div');
    div.className = 'flux-chat__msg flux-chat__msg--bot';
    div.innerHTML = `
      <p style="margin:0 0 10px">Cette conversation est terminée. Comment évaluez-vous la réponse obtenue ?</p>
      <div class="flux-chat__stars">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" aria-label="${n} étoiles">★</button>`).join('')}</div>
    `;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    div.querySelectorAll('[data-star]').forEach((starBtn) => {
      starBtn.addEventListener('click', async () => {
        const rating = parseInt(starBtn.dataset.star, 10);
        const stars = [...div.querySelectorAll('[data-star]')];
        stars.forEach((b, i) => { b.classList.toggle('is-filled', i < rating); b.disabled = true; });
        await callFn({ action: 'rate', rating });
        localStorage.setItem('fluxRated:' + conversationId, '1');
        const thanks = document.createElement('p');
        thanks.style.cssText = 'margin-top:8px;font-size:12px;opacity:.75';
        thanks.textContent = 'Merci pour votre retour !';
        div.appendChild(thanks);
      });
    });
  }

  // ---------- ouverture / nouvelle conversation après clôture ----------
  toggleBtn.addEventListener('click', async () => {
    root.classList.toggle('is-open');
    if (!root.classList.contains('is-open') || opened) return;
    opened = true;

    const data = await callFn({ action: 'poll' }).catch(() => null);

    if (data && data.status === 'closed') {
      // l'ancienne conversation est terminée : on repart de zéro pour ce visiteur
      conversationId = crypto.randomUUID();
      localStorage.setItem('fluxConversationId', conversationId);
      seen.clear();
      body.innerHTML = '';
      lastStatus = null;
      showWelcome();
    } else if (data) {
      (data.messages || []).forEach(appendMessage);
      lastStatus = data.status;
      if (!body.children.length) showWelcome();
    } else {
      showWelcome();
    }

    pollTimer = setInterval(pollOnce, 3500);
  });

  // ---------- polling ----------
  async function pollOnce() {
    try {
      const data = await callFn({ action: 'poll' });
      (data.messages || []).forEach(appendMessage);
      peerTypingActive = !!data.adminTyping;
      syncTypingIndicator();
      if (data.status === 'closed' && lastStatus !== 'closed' && !hasRated()) {
        showRatingPrompt();
      }
      lastStatus = data.status;
    } catch (e) { /* silencieux : on retentera au prochain cycle */ }
  }

  // ---------- signal "en train d'écrire" (visiteur -> admin) ----------
  let lastTypingPing = 0;
  input.addEventListener('input', () => {
    const now = Date.now();
    if (now - lastTypingPing > 2000) {
      lastTypingPing = now;
      callFn({ action: 'typing' }).catch(() => {});
    }
  });

  // ---------- envoi ----------
  async function send() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    aiPending = true;
    syncTypingIndicator();
    pendingQuestion = text;
    try {
      const data = await callFn({ action: 'send', message: text });
      aiPending = false;
      // on ne dessine pas le message tout de suite : pollOnce() va le récupérer
      // depuis la base (avec son vrai identifiant) — ça évite tout doublon.
      await pollOnce();
      if (data.needEmail) showEmailPrompt();
    } catch (e) {
      aiPending = false;
      syncTypingIndicator();
      appendMessage({ id: 'err-' + Date.now(), sender: 'bot', content: 'Petit souci de connexion — réessayez dans un instant.' });
    }
  }
  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
})();
