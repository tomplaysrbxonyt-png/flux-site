// Fonction Supabase Edge : reçoit un message visiteur, répond avec l'IA (Groq, gratuit),
// et si l'IA ne peut pas répondre, bascule la conversation en "needs_human"
// + envoie un email à l'admin avec la question complète (via Resend, gratuit).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { conversationId, message } = await req.json()
    if (!conversationId || !message) {
      return new Response(JSON.stringify({ error: 'missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // client "service role" pour écrire sans être bloqué par les policies (déjà validées via userClient plus haut)
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    await db.from('messages').insert({ conversation_id: conversationId, sender: 'visitor', content: message })

    const { data: convo } = await db
      .from('conversations')
      .select('status, visitor_email')
      .eq('id', conversationId)
      .single()

    // si un humain gère déjà la conversation, l'IA ne répond plus
    if (convo?.status === 'needs_human') {
      return new Response(JSON.stringify({ answer: null, escalated: true, human: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: history } = await db
      .from('messages')
      .select('sender, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    const groqMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history ?? []).map((h) => ({
        role: h.sender === 'visitor' ? 'user' : 'assistant',
        content: h.content,
      })),
    ]

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: groqMessages,
        temperature: 0.3,
        max_tokens: 350,
      }),
    })
    const groqData = await groqRes.json()
    const answer = (groqData.choices?.[0]?.message?.content ?? 'ESCALATE').trim()

    if (answer.toUpperCase().startsWith('ESCALATE')) {
      await db
        .from('conversations')
        .update({ status: 'needs_human', updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      const botMsg = "Je transmets votre question à un membre de l'équipe — vous recevrez une réponse ici même très bientôt."
      await db.from('messages').insert({ conversation_id: conversationId, sender: 'bot', content: botMsg })

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Flux Chat <onboarding@resend.dev>',
          to: [ADMIN_EMAIL],
          subject: 'Nouvelle question sans réponse — Flux chat',
          text: `Email visiteur : ${convo?.visitor_email ?? 'inconnu'}\nID conversation : ${conversationId}\n\nQuestion :\n${message}\n\nRépondre depuis l'espace admin du site.`,
        }),
      })

      return new Response(JSON.stringify({ answer: botMsg, escalated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await db.from('messages').insert({ conversation_id: conversationId, sender: 'bot', content: answer })

    return new Response(JSON.stringify({ answer, escalated: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
