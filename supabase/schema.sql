-- KAALAM profile schema.
-- Safe to run repeatedly in Supabase Dashboard > SQL Editor.
-- This schema stores user-owned profile and birth-chart data only.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null,
  date_of_birth date not null,
  time_of_birth time without time zone not null,
  birth_place text not null,
  current_location text not null,
  preferred_language text not null default 'English',
  panchangam_tradition text not null default 'Telugu Drik',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  birth_latitude double precision,
  birth_longitude double precision,
  birth_timezone text,
  current_latitude double precision,
  current_longitude double precision,
  current_timezone text,
  birth_chart jsonb,
  birth_chart_summary jsonb,
  birth_chart_input_hash text,
  birth_chart_calculated_at timestamptz
);

-- Add fields introduced after the initial profile table was created.
alter table public.profiles
  add column if not exists email text,
  add column if not exists preferred_language text not null default 'English',
  add column if not exists panchangam_tradition text not null default 'Telugu Drik',
  add column if not exists onboarding_complete boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
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

alter table public.profiles enable row level security;

-- A profile is readable and writable only by the user whose auth UID is its ID.
-- Wrapping auth.uid() in SELECT lets Postgres cache it once per statement.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
