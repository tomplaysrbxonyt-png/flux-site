// Fonction Supabase Edge "chat" — v2, sans authentification visiteur.
// Le visiteur est identifié uniquement par un identifiant de conversation
// aléatoire généré dans son navigateur (localStorage). L'IA répond ;
// si elle ne peut pas, on demande l'email au visiteur puis on prévient l'admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_EMAIL = 'devt23773@gmail.com'

const SYSTEM_PROMPT = `Tu es l'assistant du site "Flux", qui informe sur trois sujets uniquement :
1. Les voitures électriques (autonomie, recharge, coûts, environnement)
2. Les panneaux solaires (fonctionnement, rendement, aides en France)
3. Les économies d'énergie (gestes, isolation, chauffage)

Réponds en français, de façon concise (5 phrases maximum), factuelle, sans jargon.
Si la question sort de ces 3 sujets, si tu n'es pas sûr de la réponse, ou si la
personne demande explicitement à parler à quelqu'un, réponds UNIQUEMENT avec le mot :
ESCALATE
(rien d'autre, pas de phrase autour).`

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

async function notifyAdmin(email: string, conversationId: string, question: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Flux Chat <onboarding@resend.dev>',
      to: [ADMIN_EMAIL],
      subject: 'Nouvelle question sans réponse — Flux chat',
      text: `Email visiteur : ${email}\nID conversation : ${conversationId}\n\nQuestion :\n${question}\n\nRépondre depuis /admin.html`,
    }),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    const { action, conversationId } = body
    if (!conversationId) return json({ error: 'missing conversationId' }, 400)

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let { data: convo } = await db.from('conversations').select('*').eq('id', conversationId).maybeSingle()
    if (!convo) {
      const { data: created } = await db
        .from('conversations')
        .insert({ id: conversationId })
        .select('*')
        .single()
      convo = created
    }

    // ---- le widget récupère l'historique / les nouveaux messages ----
    if (action === 'poll') {
      const { data: messages } = await db
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      return json({ messages: messages ?? [], status: convo.status })
    }

    // ---- le visiteur vient de donner son email pour qu'on le rappelle ----
    if (action === 'provide-email') {
      const email = (body.email || '').trim()
      const question = body.question || ''
      if (!email) return json({ error: 'missing email' }, 400)
      await db.from('conversations').update({ visitor_email: email, status: 'needs_human', updated_at: new Date().toISOString() }).eq('id', conversationId)
      const botMsg = "Merci ! Je transmets votre question à un membre de l'équipe — vous recevrez une réponse ici même très bientôt."
      await db.from('messages').insert({ conversation_id: conversationId, sender: 'bot', content: botMsg })
      await notifyAdmin(email, conversationId, question)
      return json({ ok: true })
    }

    // ---- envoi d'un message ----
    const message = (body.message || '').trim()
    if (!message) return json({ error: 'empty message' }, 400)

    await db.from('messages').insert({ conversation_id: conversationId, sender: 'visitor', content: message })

    // un humain gère déjà cette conversation : l'IA ne répond plus
    if (convo.status === 'needs_human') {
      return json({ human: true })
    }

    const { data: history } = await db
      .from('messages')
      .select('sender, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    const groqMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history ?? []).map((h) => ({ role: h.sender === 'visitor' ? 'user' : 'assistant', content: h.content })),
    ]

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: groqMessages, temperature: 0.3, max_tokens: 350 }),
    })
    const groqData = await groqRes.json()
    const answer = (groqData.choices?.[0]?.message?.content ?? 'ESCALATE').trim()

    if (answer.toUpperCase().startsWith('ESCALATE')) {
      // si on a déjà l'email du visiteur (échange précédent), on transmet tout de suite
      if (convo.visitor_email) {
        await db.from('conversations').update({ status: 'needs_human', updated_at: new Date().toISOString() }).eq('id', conversationId)
        const botMsg = "Je transmets votre question à un membre de l'équipe — vous recevrez une réponse ici même très bientôt."
        await db.from('messages').insert({ conversation_id: conversationId, sender: 'bot', content: botMsg })
        await notifyAdmin(convo.visitor_email, conversationId, message)
        return json({ answer: botMsg, escalated: true })
      }
      // sinon on demande l'email au visiteur avant de transmettre
      return json({ needEmail: true })
    }

    await db.from('messages').insert({ conversation_id: conversationId, sender: 'bot', content: answer })
    return json({ answer, escalated: false })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
