-- Run this once in Supabase: SQL Editor → New query → paste → Run.
-- All of this is for the optional dashboard. Blocking runs on the phone and
-- never touches the database.

-- One row per dashboard account.
create table if not exists public.bricks (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9_.]{3,24}$'),
  password_hash text not null,            -- scrypt with a random salt; never the password itself
  key_hash text unique,                   -- sha256 of the phone's sync code; null until one is made
  is_bricked boolean not null default false,
  bricked_since timestamptz,
  created_at timestamptz not null default now()
);

-- Focus sessions: one row per lock.
create table if not exists public.sessions (
  id bigint generated always as identity primary key,
  brick_id uuid not null references public.bricks (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists sessions_brick_started_idx
  on public.sessions (brick_id, started_at desc);

-- Website sign-ins: one row per signed-in browser.
create table if not exists public.logins (
  token_hash text primary key,            -- sha256 of the cookie; the cookie itself is never stored
  brick_id uuid not null references public.bricks (id) on delete cascade,
  expires_at timestamptz not null
);

-- Lock all tables down. The app talks to Supabase only from the server,
-- using the service role key, which skips these rules. With RLS on and no
-- policies, nobody can read or change these tables with the public anon key.
alter table public.bricks enable row level security;
alter table public.sessions enable row level security;
alter table public.logins enable row level security;

-- Login and signup limits: one row per username or network address.
create table if not exists public.rate_limits (
  key text primary key,                   -- e.g. "login-user:suha" or "login-ip:1.2.3.4"
  count int not null,
  window_start timestamptz not null
);

alter table public.rate_limits enable row level security;

-- Counts one attempt and returns the total in the current window. Done in a
-- single statement so a burst of parallel attempts can't slip past the limit.
create or replace function public.bump_rate_limit(p_key text, p_window_seconds int)
returns int
language sql
as $$
  insert into public.rate_limits as r (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                 then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                        then now() else r.window_start end
  returning count;
$$;

-- Only the server (service role) may call it.
revoke execute on function public.bump_rate_limit(text, int) from public, anon, authenticated;
grant execute on function public.bump_rate_limit(text, int) to service_role;
