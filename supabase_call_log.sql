-- Spusť v Supabase SQL Editoru
alter table comments add column if not exists typ text default 'komentar';
alter table comments add column if not exists datum_callu date;
