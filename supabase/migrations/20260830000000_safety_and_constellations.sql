-- ---------------------------------------------------------------------------
-- Blocks, reports, constellations, and the pause between thoughts.
--
-- These four were created by hand in the SQL editor and never written down, so
-- when the project went away they went with it. Everything here is reconstructed
-- from what the live database actually answered while it still existed: column
-- names read back off real rows, constraint names off real errors, policy
-- behaviour off probes run as one soul against another.
--
-- The one thing measurement could not recover exactly is the rate limit's
-- interval — the trigger only ever reported that it had fired. 1.5s is chosen to
-- match the client-side cooldown in RegionView, so the two agree.
--
-- Dated before 20260831 (which alters reports) and 20260901 (which alters
-- constellations); both expect these tables to already exist.
-- ---------------------------------------------------------------------------

-- ---------- blocks ----------
-- A block is one-directional and private to the soul who made it.
create table if not exists public.blocks (
  soul_id    uuid not null references public.souls (id) on delete cascade,
  blocked_id uuid not null references public.souls (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (soul_id, blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists blocks_read on public.blocks;
create policy blocks_read on public.blocks for select
  using (soul_id in (select id from public.souls where user_id = auth.uid()));

drop policy if exists blocks_write on public.blocks;
create policy blocks_write on public.blocks for insert
  with check (
    soul_id in (select id from public.souls where user_id = auth.uid())
    and soul_id <> blocked_id
  );

drop policy if exists blocks_delete on public.blocks;
create policy blocks_delete on public.blocks for delete
  using (soul_id in (select id from public.souls where user_id = auth.uid()));

-- ---------- reports ----------
-- Only the project owner reads these, through the service role. There is
-- deliberately no select policy, so `select` returns nothing to everybody else.
create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages (id) on delete cascade,
  reporter   uuid references public.souls (id) on delete set null,
  reason     text not null,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports add constraint reports_reason_check
  check (reason in ('spam', 'harassment', 'inappropriate', 'offensive', 'other'));

drop policy if exists reports_write on public.reports;
create policy reports_write on public.reports for insert
  with check (reporter in (select id from public.souls where user_id = auth.uid()));

create index if not exists reports_created_idx on public.reports (created_at desc);

-- ---------- constellations ----------
-- Souls one soul has asked to keep. 20260901 turns this into a request with a
-- status and rewrites every policy below; this is only the shape it starts as.
create table if not exists public.constellations (
  keeper_id  uuid not null references public.souls (id) on delete cascade,
  kept_id    uuid not null references public.souls (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (keeper_id, kept_id)
);

alter table public.constellations enable row level security;

drop policy if exists constellations_read on public.constellations;
create policy constellations_read on public.constellations for select
  using (keeper_id in (select id from public.souls where user_id = auth.uid()));

drop policy if exists constellations_write on public.constellations;
create policy constellations_write on public.constellations for insert
  with check (
    keeper_id in (select id from public.souls where user_id = auth.uid())
    and keeper_id <> kept_id
  );

drop policy if exists constellations_delete on public.constellations;
create policy constellations_delete on public.constellations for delete
  using (keeper_id in (select id from public.souls where user_id = auth.uid()));

-- ---------- the pause between thoughts ----------
-- RLS says who may write; it says nothing about how fast. Anyone holding the
-- anon key can post straight past the interface, so the floor has to be here.
create or replace function public.slow_down() returns trigger
language plpgsql as $$
declare
  last_at timestamptz;
begin
  select max(created_at) into last_at
  from public.messages
  where soul_id = new.soul_id;

  if last_at is not null and now() - last_at < interval '1.5 seconds' then
    raise exception 'The multiverse demands silence between thoughts. Please wait a moment.';
  end if;

  return new;
end;
$$;

-- the trigger reads this on every single insert, so it must not be a seq scan
create index if not exists messages_soul_recent_idx
  on public.messages (soul_id, created_at desc);

drop trigger if exists messages_slow_down on public.messages;
create trigger messages_slow_down
  before insert on public.messages
  for each row execute function public.slow_down();
