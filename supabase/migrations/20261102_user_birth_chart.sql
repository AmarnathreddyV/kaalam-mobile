-- Run once in Supabase SQL Editor for an existing KAALAM project.
alter table public.profiles
  add column if not exists birth_latitude double precision,
  add column if not exists birth_longitude double precision,
  add column if not exists birth_timezone text,
  add column if not exists current_latitude double precision,
  add column if not exists current_longitude double precision,
  add column if not exists current_timezone text,
  add column if not exists birth_chart jsonb,
  add column if not exists birth_chart_summary jsonb,
  add column if not exists birth_chart_input_hash text,
  add column if not exists birth_chart_calculated_at timestamptz;

