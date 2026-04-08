-- Spusť v Supabase SQL Editoru

create table ukoly (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  nazev text not null,
  popis text,
  kdo text,
  do_kdy date,
  stav text default 'todo',
  lead_id uuid references leads(id) on delete set null,
  novy_stav_leadu text,
  zdroj text,
  zdroj_nazev text,
  zdroj_id text
);

alter table ukoly enable row level security;

create policy "Allow all for anon" on ukoly
  for all using (true) with check (true);
