-- =========================================================
-- Flux — schéma du chatbot (v2 : sans connexion visiteur)
-- À coller dans Supabase → SQL Editor → Run.
-- Sans danger si tu avais déjà exécuté l'ancienne version avant.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- nettoyage de l'ancienne version (sans risque si elle n'existe pas) ----------
drop policy if exists "select own or admin - conversations" on conversations;
drop policy if exists "insert own - conversations" on conversations;
drop policy if exists "update own or admin - conversations" on conversations;
drop policy if exists "select own or admin - messages" on messages;
drop policy if exists "insert own or admin - messages" on messages;

-- ---------- tables ----------
create table if not exists conversations (
  id uuid primary key,
  visitor_email text,
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

-- si la table existait déjà depuis l'ancienne version : on retire la dépendance aux comptes
alter table conversations drop column if exists user_id;
alter table conversations alter column visitor_email drop not null;

-- dossiers pour organiser les conversations dans l'espace admin (texte libre)
alter table conversations add column if not exists folder text;

-- indicateur "en train d'écrire", des deux côtés
alter table conversations add column if not exists visitor_typing_at timestamptz;
alter table conversations add column if not exists admin_typing_at timestamptz;

-- note laissée par le visiteur (1 à 5) après une conversation terminée
alter table conversations add column if not exists rating int check (rating between 1 and 5);

-- ---------- dossiers ----------
create table if not exists folders (
  name text primary key,
  created_at timestamptz not null default now()
);
alter table conversations add column if not exists folder text references folders(name) on delete set null;

-- ---------- sécurité ----------
-- RLS activée mais SANS règle pour "anon" : personne ne peut lire/écrire
-- directement depuis le navigateur. Tout passe par les fonctions serveur
-- (chat / admin), qui utilisent une clé privée jamais exposée au public.
alter table conversations enable row level security;
alter table messages enable row level security;
alter table folders enable row level security;
