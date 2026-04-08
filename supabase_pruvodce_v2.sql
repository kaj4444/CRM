-- Spusť v Supabase SQL Editoru

create table pruvodce_komentare (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  krok_id text not null,
  autor text not null,
  text text not null
);

alter table pruvodce_komentare enable row level security;
create policy "Allow all for anon" on pruvodce_komentare
  for all using (true) with check (true);

create table pruvodce_order (
  id uuid default gen_random_uuid() primary key,
  krok_id text not null unique,
  pozice integer,
  mesic text
);

alter table pruvodce_order enable row level security;
create policy "Allow all for anon" on pruvodce_order
  for all using (true) with check (true);
