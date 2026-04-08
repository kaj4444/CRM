-- Spusť toto v Supabase SQL editoru (supabase.com → tvůj projekt → SQL Editor)

create table leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  firma text not null,
  osoba text,
  role text,
  segment text,
  email text,
  telefon text,
  odvetvi text,
  zdroj text,
  produkt text,
  stav text,
  cena numeric,
  prob text,
  vede text,
  followup date,
  d1 date,
  namitka text,
  poznamky text
);

-- Povol přístup pro anon klíč (appka používá heslo, ne Supabase auth)
alter table leads enable row level security;

create policy "Allow all for anon" on leads
  for all using (true) with check (true);
