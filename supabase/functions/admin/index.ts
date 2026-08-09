// Fonction Supabase Edge "admin" — v3 : dossiers, statuts, saisie en direct.
// Protégée par un code secret (ADMIN_CODE).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_CODE = Deno.env.get('ADMIN_CODE')!
const TYPING_WINDOW_MS = 4000

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
}

const VALID_STATUS = ['open', 'needs_human', 'closed']

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

function isRecent(ts: string | null) {
  if (!ts) return false
  return Date.now() - new Date(ts).getTime() < TYPING_WINDOW_MS
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    if (!ADMIN_CODE || body.code !== ADMIN_CODE) {
      return json({ error: 'unauthorized' }, 401)
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    if (body.action === 'list') {
      const { data } = await db.from('conversations').select('*').order('updated_at', { ascending: false })
      return json({ conversations: data ?? [] })
    }

    if (body.action === 'thread') {
      const { data: messages } = await db
        .from('messages')
        .select('*')
        .eq('conversation_id', body.conversationId)
        .order('created_at', { ascending: true })
      const { data: convo } = await db
        .from('conversations')
        .select('visitor_typing_at, status, rating')
        .eq('id', body.conversationId)
        .maybeSingle()
      return json({
        messages: messages ?? [],
        visitorTyping: isRecent(convo?.visitor_typing_at ?? null),
        status: convo?.status,
        rating: convo?.rating,
      })
    }

    // l'admin est en train de taper
    if (body.action === 'typing') {
      await db.from('conversations').update({ admin_typing_at: new Date().toISOString() }).eq('id', body.conversationId)
      return json({ ok: true })
    }

    if (body.action === 'reply') {
      const content = (body.message || '').trim()
      if (!content) return json({ error: 'empty message' }, 400)
      await db.from('messages').insert({ conversation_id: body.conversationId, sender: 'admin', content })
      // dès qu'un humain répond, l'IA ne reprend plus la main automatiquement
      await db
        .from('conversations')
        .update({ status: 'needs_human', updated_at: new Date().toISOString() })
        .eq('id', body.conversationId)
      return json({ ok: true })
    }

    // 'open' (repasser à l'IA), 'needs_human' (rouvrir), 'closed' (terminé)
    if (body.action === 'set-status') {
      if (!VALID_STATUS.includes(body.status)) return json({ error: 'invalid status' }, 400)
      const update: Record<string, unknown> = { status: body.status, updated_at: new Date().toISOString() }
      // en clôturant, on efface une éventuelle ancienne note pour permettre une nouvelle évaluation
      if (body.status === 'closed') update.rating = null
      await db.from('conversations').update(update).eq('id', body.conversationId)
      return json({ ok: true })
    }

    if (body.action === 'set-folder') {
      await db.from('conversations').update({ folder: body.folder || null }).eq('id', body.conversationId)
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
