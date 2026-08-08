-- =========================================================
-- Flux — schéma du chatbot (à coller dans Supabase → SQL Editor)
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  visitor_email text not null,
  status text not null default 'open' check (status in ('open','needs_human','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender text not null check (sender in ('visitor','bot','admin')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- Sécurité (RLS) ----------
-- Un visiteur ne voit / n'écrit que dans SES conversations.
-- L'admin (ton email) voit et écrit dans TOUT, automatiquement,
-- grâce à ces mêmes règles (pas besoin d'une page "protégée" côté code,
-- la sécurité est faite au niveau de la base de données).

alter table conversations enable row level security;
alter table messages enable row level security;

create policy "select own or admin - conversations"
on conversations for select
using (auth.uid() = user_id or auth.jwt() ->> 'email' = 'devt23773@gmail.com');

create policy "insert own - conversations"
on conversations for insert
with check (auth.uid() = user_id);

create policy "update own or admin - conversations"
on conversations for update
using (auth.uid() = user_id or auth.jwt() ->> 'email' = 'devt23773@gmail.com');

create policy "select own or admin - messages"
on messages for select
using (
  exists (
    select 1 from conversations c
    where c.id = conversation_id
    and (c.user_id = auth.uid() or auth.jwt() ->> 'email' = 'devt23773@gmail.com')
  )
);

create policy "insert own or admin - messages"
on messages for insert
with check (
  exists (
    select 1 from conversations c
    where c.id = conversation_id
    and (c.user_id = auth.uid() or auth.jwt() ->> 'email' = 'devt23773@gmail.com')
  )
);

-- ---------- Temps réel (pour le live chat) ----------
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
