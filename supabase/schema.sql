-- Run this once in Supabase: SQL Editor → New query → paste → Run.

create table if not exists public.bricks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  key_hash text not null unique,          -- sha256 of the key; the key itself is never stored
  is_bricked boolean not null default false,
  bricked_since timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id bigint generated always as identity primary key,
  brick_id uuid not null references public.bricks (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists sessions_brick_started_idx
  on public.sessions (brick_id, started_at desc);

-- Lock both tables down. The app talks to Supabase only from the server,
-- using the service role key, which skips these rules. With RLS on and no
-- policies, nobody can read or change these tables with the public anon key.
alter table public.bricks enable row level security;
alter table public.sessions enable row level security;
