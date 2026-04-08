-- Spusť v Supabase SQL Editoru

create table strategic_answers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  klic text not null unique,
  odpoved text
);

alter table strategic_answers enable row level security;

create policy "Allow all for anon" on strategic_answers
  for all using (true) with check (true);
