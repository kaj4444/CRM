-- Spusť v Supabase SQL Editoru

create table pruvodce_splneno (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  krok_id text not null unique,
  splneno boolean default false
);

alter table pruvodce_splneno enable row level security;

create policy "Allow all for anon" on pruvodce_splneno
  for all using (true) with check (true);
