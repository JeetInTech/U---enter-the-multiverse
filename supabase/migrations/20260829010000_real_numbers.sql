-- 1. Remove everything the verification run left behind.
-- 2. Give the map real numbers to show instead of invented ones.

-- ---------- sweep the test souls ----------
-- deleting the auth user cascades to its soul, messages, resonances and discoveries
delete from auth.users
where id in (
  select user_id from public.souls
  where user_id is not null and name in ('Vesper', 'Aster')
);

-- and the stray messages, in case a soul was already gone
delete from public.messages where text = 'a verification whisper, then silence';

-- ---------- what actually happened in each region ----------
-- souls = how many have ever spoken here; voices = how much has been said
create or replace view public.region_stats
with (security_invoker = on) as
select
  region,
  count(distinct soul_id)::int as souls,
  count(*)::int                as voices
from public.messages
group by region;

-- ---------- optional: empty the world completely ----------
-- The twelve founding souls are the world's opening content, not test data, so they stay.
-- Uncomment to remove them too — every room then starts silent.
-- delete from public.souls where user_id is null;
