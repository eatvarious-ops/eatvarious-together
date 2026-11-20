create schema if not exists itda_auth_private;
create table if not exists itda_auth_private.signup_window (
  bucket text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
alter table itda_auth_private.signup_window enable row level security;
revoke all on schema itda_auth_private from public, anon, authenticated;
grant usage on schema itda_auth_private to service_role;
revoke all on table itda_auth_private.signup_window from public, anon, authenticated;
grant select, insert, update, delete on itda_auth_private.signup_window to service_role;

create or replace function public.itda_allow_signup(client_digest text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  since timestamptz := date_trunc('hour', now());
  n integer;
begin
  if client_digest is null or client_digest !~ '^[0-9a-f]{64}$' then return false; end if;
  delete from itda_auth_private.signup_window where window_start < since - interval '1 day';
  insert into itda_auth_private.signup_window as w values ('ip-' || client_digest, since, 1)
    on conflict (bucket) do update set window_start = excluded.window_start,
      attempts = case when w.window_start = since then least(w.attempts + 1, 11) else 1 end
    returning attempts into n;
  if n > 10 then return false; end if;
  insert into itda_auth_private.signup_window as w values ('all', since, 1)
    on conflict (bucket) do update set window_start = excluded.window_start,
      attempts = case when w.window_start = since then least(w.attempts + 1, 241) else 1 end
    returning attempts into n;
  return n <= 240;
end;
$$;
revoke all on function public.itda_allow_signup(text) from public, anon, authenticated;
grant execute on function public.itda_allow_signup(text) to service_role;
