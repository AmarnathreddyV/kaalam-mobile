-- Restrict profile table privileges to signed-in owners.
-- RLS policies still enforce row ownership; grants limit available operations.
revoke all on table public.profiles from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
