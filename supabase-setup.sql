-- ============================================================
-- MIKOMI OS — Supabase Setup
-- Spusť v Supabase SQL Editor
-- ============================================================

-- 1. PROFILES TABLE
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  industry text default 'general',
  subscription_status text default 'trial',
  trial_ends_at timestamptz default (now() + interval '7 days'),
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
alter table leads enable row level security;
drop policy if exists "leads_own" on leads;
create policy "leads_own" on leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table comments enable row level security;
drop policy if exists "comments_own" on comments;
create policy "comments_own" on comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table documents enable row level security;
drop policy if exists "documents_own" on documents;
create policy "documents_own" on documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table ukoly enable row level security;
drop policy if exists "ukoly_own" on ukoly;
create policy "ukoly_own" on ukoly
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table pruvodce_splneno enable row level security;
drop policy if exists "pruvodce_splneno_own" on pruvodce_splneno;
create policy "pruvodce_splneno_own" on pruvodce_splneno
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table pruvodce_texty enable row level security;
drop policy if exists "pruvodce_texty_own" on pruvodce_texty;
create policy "pruvodce_texty_own" on pruvodce_texty
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table pruvodce_komentare enable row level security;
drop policy if exists "pruvodce_komentare_own" on pruvodce_komentare;
create policy "pruvodce_komentare_own" on pruvodce_komentare
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table pruvodce_order enable row level security;
drop policy if exists "pruvodce_order_own" on pruvodce_order;
create policy "pruvodce_order_own" on pruvodce_order
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table strategic_answers enable row level security;
drop policy if exists "strategic_answers_own" on strategic_answers;
create policy "strategic_answers_own" on strategic_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Auto-create profile on signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, industry, subscription_status, trial_ends_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'industry', 'general'),
    'trial',
    now() + interval '7 days'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
