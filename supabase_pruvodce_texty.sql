-- Spusť v Supabase SQL Editoru

create table pruvodce_texty (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  klic text not null unique,
  hodnota text
);

alter table pruvodce_texty enable row level security;

create policy "Allow all for anon" on pruvodce_texty
  for all using (true) with check (true);
