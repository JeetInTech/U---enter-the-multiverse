-- ---------------------------------------------------------------------------
-- The Void's 1-on-1 pockets, and the report reasons the menu actually offers.
-- ---------------------------------------------------------------------------

-- ---------- a pocket is a real region name ----------
-- void_<soulA>_<soulB>, the two uuids sorted so both sides derive the same room.
-- The old constraint only knew the eight fixed worlds, so every whisper in the
-- Void was rejected outright.
alter table public.messages drop constraint if exists messages_region_check;
alter table public.messages add constraint messages_region_check
  check (
    region in ('luminous','echo','neon','crystal','forge','void','darkroom','sisterhood')
    or region ~ ('^void_' || '[0-9a-f-]{36}' || '_' || '[0-9a-f-]{36}' || '$')
  );

-- ---------- and a pocket is actually private ----------
-- messages_read was `using (true)`, which would have made every "private"
-- conversation world-readable the moment the first one existed.
create or replace function public.in_pocket(r text) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.souls s
    where s.user_id = auth.uid()
      and r like '%' || s.id::text || '%'
  );
$$;

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select
  using (region not like 'void\_%' or public.in_pocket(region));

-- you must own the soul you speak as, and be one of the two souls in the pocket
drop policy if exists messages_write on public.messages;
create policy messages_write on public.messages for insert
  with check (
    soul_id in (select id from public.souls where user_id = auth.uid())
    and (region not like 'void\_%' or public.in_pocket(region))
  );

-- ---------- report reasons ----------
-- The menu offered spam / harassment / inappropriate / other; the check only
-- allowed three of those, so half the report buttons failed silently.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.reports'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%reason%'
  loop
    execute format('alter table public.reports drop constraint %I', c);
  end loop;
end $$;

alter table public.reports add constraint reports_reason_check
  check (reason in ('spam','harassment','inappropriate','offensive','other'));
