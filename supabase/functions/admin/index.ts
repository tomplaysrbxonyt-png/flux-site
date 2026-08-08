// Fonction Supabase Edge "admin" — liste / lit / répond aux conversations.
// Protégée par un code secret (ADMIN_CODE), pas par un compte.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_CODE = Deno.env.get('ADMIN_CODE')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
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
      const { data } = await db
        .from('messages')
        .select('*')
        .eq('conversation_id', body.conversationId)
        .order('created_at', { ascending: true })
      return json({ messages: data ?? [] })
    }

    if (body.action === 'reply') {
      const content = (body.message || '').trim()
      if (!content) return json({ error: 'empty message' }, 400)
      await db.from('messages').insert({ conversation_id: body.conversationId, sender: 'admin', content })
      await db.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', body.conversationId)
      return json({ ok: true })
    }

    if (body.action === 'resolve') {
      await db.from('conversations').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', body.conversationId)
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
