-- Spusť v Supabase SQL Editoru

create table documents (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  nazev text not null,
  soubor text not null,
  url text not null,
  velikost integer,
  kategorie text
);

alter table documents enable row level security;

create policy "Allow all for anon" on documents
  for all using (true) with check (true);
