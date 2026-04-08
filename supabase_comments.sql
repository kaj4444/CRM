create table comments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  lead_id uuid references leads(id) on delete cascade,
  autor text not null,
  text text not null
);

alter table comments enable row level security;

create policy "Allow all for anon" on comments
  for all using (true) with check (true);
