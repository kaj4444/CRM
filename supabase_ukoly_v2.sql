-- Spusť v Supabase SQL Editoru
alter table ukoly add column if not exists priorita text default 'Střední';
alter table ukoly add column if not exists typ_ukolu text default 'Follow-up call';
