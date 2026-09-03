-- ---------------------------------------------------------------------------
-- Keeping a soul becomes a request the other soul answers.
--
-- Until now a keep was one-sided and silent: you added someone to your sky and
-- they never knew. A private pocket dimension should not open without both
-- people agreeing to it, so a keep is now an invitation with three states.
-- ---------------------------------------------------------------------------

alter table public.constellations
  add column if not exists status text not null default 'pending',
  add column if not exists responded_at timestamptz;

alter table public.constellations drop constraint if exists constellations_status_check;
alter table public.constellations add constraint constellations_status_check
  check (status in ('pending', 'accepted', 'rejected'));

-- Existing keeps stay 'pending' by way of the default: nobody ever agreed to
-- them, so they become outgoing requests rather than silent connections.

-- ---------- both sides can see the row ----------
-- The keeper needs to watch for an answer; the kept soul needs to know they
-- were asked at all. The old policy only let the keeper read, so an incoming
-- request was invisible to the one person who has to answer it.
create or replace function public.my_souls() returns setof uuid
language sql stable as $$
  select id from public.souls where user_id = auth.uid();
$$;

drop policy if exists constellations_read on public.constellations;
create policy constellations_read on public.constellations for select
  using (keeper_id in (select public.my_souls()) or kept_id in (select public.my_souls()));

drop policy if exists constellations_write on public.constellations;
create policy constellations_write on public.constellations for insert
  with check (keeper_id in (select public.my_souls()) and keeper_id <> kept_id);

-- Only the soul who was asked may answer. The keeper cannot accept on their behalf.
drop policy if exists constellations_answer on public.constellations;
create policy constellations_answer on public.constellations for update
  using (kept_id in (select public.my_souls()))
  with check (kept_id in (select public.my_souls()));

-- Either side can walk away: the keeper withdraws, the kept soul disconnects.
--
-- With one exception. A keeper cannot delete a row that was rejected, because
-- deleting it would free them to ask again — and "no" has to mean no without
-- the person who said it having to keep saying it. Only the soul who refused
-- can clear a refusal.
drop policy if exists constellations_delete on public.constellations;
create policy constellations_delete on public.constellations for delete
  using (
    kept_id in (select public.my_souls())
    or (keeper_id in (select public.my_souls()) and status <> 'rejected')
  );

-- ---------- so an answer arrives without a reload ----------
do $$
begin
  alter publication supabase_realtime add table public.constellations;
exception when duplicate_object then null;
end $$;
