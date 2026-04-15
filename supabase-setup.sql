-- ============================================================
-- MIKOMI OS — Supabase Setup
-- Spusť celý tento soubor v Supabase SQL Editor
-- ============================================================

-- 1. PROFILES TABLE
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  industry text default 'general',
  trial_ends_at timestamptz,
  subscription_status text default 'trial',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "profiles_own" on profiles;
create policy "profiles_own" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- 2. ADD user_id TO ALL TABLES
alter table leads add column if not exists user_id uuid references auth.users;
alter table comments add column if not exists user_id uuid references auth.users;
alter table documents add column if not exists user_id uuid references auth.users;
alter table ukoly add column if not exists user_id uuid references auth.users;
alter table pruvodce_splneno add column if not exists user_id uuid references auth.users;
alter table pruvodce_texty add column if not exists user_id uuid references auth.users;
alter table pruvodce_komentare add column if not exists user_id uuid references auth.users;
alter table pruvodce_order add column if not exists user_id uuid references auth.users;
alter table strategic_answers add column if not exists user_id uuid references auth.users;

-- 3. RLS POLICIES
-- LEADS
alter table leads enable row level security;
drop policy if exists "leads_own" on leads;
create policy "leads_own" on leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- COMMENTS
alter table comments enable row level security;
drop policy if exists "comments_own" on comments;
create policy "comments_own" on comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- DOCUMENTS
alter table documents enable row level security;
drop policy if exists "documents_own" on documents;
create policy "documents_own" on documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- UKOLY
alter table ukoly enable row level security;
drop policy if exists "ukoly_own" on ukoly;
create policy "ukoly_own" on ukoly
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PRUVODCE_SPLNENO
alter table pruvodce_splneno enable row level security;
drop policy if exists "pruvodce_splneno_own" on pruvodce_splneno;
create policy "pruvodce_splneno_own" on pruvodce_splneno
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PRUVODCE_TEXTY
alter table pruvodce_texty enable row level security;
drop policy if exists "pruvodce_texty_own" on pruvodce_texty;
create policy "pruvodce_texty_own" on pruvodce_texty
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PRUVODCE_KOMENTARE
alter table pruvodce_komentare enable row level security;
drop policy if exists "pruvodce_komentare_own" on pruvodce_komentare;
create policy "pruvodce_komentare_own" on pruvodce_komentare
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PRUVODCE_ORDER
alter table pruvodce_order enable row level security;
drop policy if exists "pruvodce_order_own" on pruvodce_order;
create policy "pruvodce_order_own" on pruvodce_order
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- STRATEGIC_ANSWERS
alter table strategic_answers enable row level security;
drop policy if exists "strategic_answers_own" on strategic_answers;
create policy "strategic_answers_own" on strategic_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. SUPABASE AUTH EMAIL SETTINGS
-- Jdi do: Authentication > Settings > Email Auth
-- Zapni: "Confirm email" = ON
-- Zapni: "Secure email change" = ON
