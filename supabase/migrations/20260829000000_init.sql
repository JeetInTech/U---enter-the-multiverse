-- U — the multiverse. Souls arrive anonymously; nothing here knows a real name.
-- Run: supabase db push   (or paste the whole file into a new project's SQL editor)

-- ---------- souls ----------
-- user_id is null for the founding souls that were here before anyone arrived.
create table if not exists public.souls (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references auth.users on delete cascade,
  name       text not null check (char_length(name) between 1 and 18),
  tagline    text not null default '' check (char_length(tagline) <= 48),
  shape      text not null check (shape in ('circle','triangle','diamond','star','crescent')),
  color      text not null check (color in ('ember','tide','pulse','moss','dusk','ash')),
  aura       text not null check (aura in ('glow','pulse','flicker','rainbow','silver')),
  created_at timestamptz not null default now()
);

-- ---------- messages ----------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  region     text not null check (region in ('luminous','echo','neon','crystal','forge','void')),
  soul_id    uuid not null references public.souls on delete cascade,
  text       text not null check (char_length(text) between 1 and 400),
  created_at timestamptz not null default now()
);
create index if not exists messages_region_time on public.messages (region, created_at);

-- ---------- resonances (a vibration, not a like) ----------
create table if not exists public.resonances (
  message_id uuid not null references public.messages on delete cascade,
  soul_id    uuid not null references public.souls on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, soul_id)
);

-- ---------- lore fragments a soul has recovered ----------
create table if not exists public.discoveries (
  soul_id    uuid not null references public.souls on delete cascade,
  lore_index int  not null check (lore_index >= 0),
  found_at   timestamptz not null default now(),
  primary key (soul_id, lore_index)
);

-- ---------- row level security ----------
alter table public.souls       enable row level security;
alter table public.messages    enable row level security;
alter table public.resonances  enable row level security;
alter table public.discoveries enable row level security;

-- souls are public (that is the point); only your own is yours to write
drop policy if exists souls_read   on public.souls;
drop policy if exists souls_write  on public.souls;
drop policy if exists souls_update on public.souls;
create policy souls_read   on public.souls for select using (true);
create policy souls_write  on public.souls for insert with check (auth.uid() is not null and auth.uid() = user_id);
create policy souls_update on public.souls for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists messages_read  on public.messages;
drop policy if exists messages_write on public.messages;
create policy messages_read  on public.messages for select using (true);
create policy messages_write on public.messages for insert
  with check (soul_id in (select id from public.souls where user_id = auth.uid()));

drop policy if exists resonances_read   on public.resonances;
drop policy if exists resonances_write  on public.resonances;
drop policy if exists resonances_delete on public.resonances;
create policy resonances_read   on public.resonances for select using (true);
create policy resonances_write  on public.resonances for insert
  with check (soul_id in (select id from public.souls where user_id = auth.uid()));
create policy resonances_delete on public.resonances for delete
  using (soul_id in (select id from public.souls where user_id = auth.uid()));

-- what you have found is yours alone to know
drop policy if exists discoveries_read  on public.discoveries;
drop policy if exists discoveries_write on public.discoveries;
create policy discoveries_read on public.discoveries for select
  using (soul_id in (select id from public.souls where user_id = auth.uid()));
create policy discoveries_write on public.discoveries for insert
  with check (soul_id in (select id from public.souls where user_id = auth.uid()));

-- ---------- realtime ----------
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object or undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.resonances;
exception when duplicate_object or undefined_object then null;
end $$;

-- ---------- the world before you arrived ----------
insert into public.souls (id, name, tagline, shape, color, aura) values
  ('11111111-1111-4111-8111-000000000001','Marigold','Keeper of the first light','circle','ember','glow'),
  ('11111111-1111-4111-8111-000000000002','Hollow','Half a rumour, half a light','crescent','ash','silver'),
  ('11111111-1111-4111-8111-000000000003','Nought','Quiet observer of chaos','crescent','tide','flicker'),
  ('11111111-1111-4111-8111-000000000004','Salt','A storm in human form','diamond','ash','pulse'),
  ('11111111-1111-4111-8111-000000000005','Voltage','Fire that burns loudly','star','pulse','rainbow'),
  ('11111111-1111-4111-8111-000000000006','Glitch','Awake and certain','triangle','dusk','flicker'),
  ('11111111-1111-4111-8111-000000000007','Kite','No skill required','circle','pulse','rainbow'),
  ('11111111-1111-4111-8111-000000000008','Fern','Just breathing','circle','moss','glow'),
  ('11111111-1111-4111-8111-000000000009','Quartz','Listens to trees','diamond','moss','glow'),
  ('11111111-1111-4111-8111-00000000000a','Anvil','Makes ugly things on purpose','triangle','ember','pulse'),
  ('11111111-1111-4111-8111-00000000000b','Loom','Send me one word','star','ember','glow'),
  ('11111111-1111-4111-8111-00000000000c','The One','I had nowhere to go','diamond','ash','silver')
on conflict (id) do nothing;

insert into public.messages (id, region, soul_id, text, created_at) values
  ('22222222-2222-4222-8222-000000000001','luminous','11111111-1111-4111-8111-000000000001','welcome, traveler. you have arrived. now… become.', now() - interval '3 hours'),
  ('22222222-2222-4222-8222-000000000002','luminous','11111111-1111-4111-8111-000000000002','been standing in this field an hour just watching the light change', now() - interval '2 hours'),
  ('22222222-2222-4222-8222-000000000003','echo','11111111-1111-4111-8111-000000000003','it is 2am again and i am here again', now() - interval '5 hours'),
  ('22222222-2222-4222-8222-000000000004','echo','11111111-1111-4111-8111-000000000004','i told my whole family i was fine today', now() - interval '4 hours'),
  ('22222222-2222-4222-8222-000000000005','echo','11111111-1111-4111-8111-000000000003','you are not fine. that is allowed here.', now() - interval '4 hours' + interval '2 minutes'),
  ('22222222-2222-4222-8222-000000000006','neon','11111111-1111-4111-8111-000000000005','SOMEONE PUT ON SOMETHING WITH A BEAT', now() - interval '90 minutes'),
  ('22222222-2222-4222-8222-000000000007','neon','11111111-1111-4111-8111-000000000006','awake for 31 hours and i have never been more correct', now() - interval '80 minutes'),
  ('22222222-2222-4222-8222-000000000008','neon','11111111-1111-4111-8111-000000000007','dance party in 3. no skill required. no judgment either.', now() - interval '70 minutes'),
  ('22222222-2222-4222-8222-000000000009','crystal','11111111-1111-4111-8111-000000000008','just breathing here for a while. do not mind me.', now() - interval '6 hours'),
  ('22222222-2222-4222-8222-00000000000a','crystal','11111111-1111-4111-8111-000000000009','the trees hum in D minor if you sit still long enough', now() - interval '5 hours'),
  ('22222222-2222-4222-8222-00000000000b','forge','11111111-1111-4111-8111-00000000000a','made a thing. it is ugly. it is mine. posting anyway.', now() - interval '2 hours'),
  ('22222222-2222-4222-8222-00000000000c','forge','11111111-1111-4111-8111-00000000000b','send me one word and i will build a song around it', now() - interval '1 hour'),
  ('22222222-2222-4222-8222-00000000000d','void','11111111-1111-4111-8111-000000000002','you found it.', now() - interval '30 days'),
  ('22222222-2222-4222-8222-00000000000e','void','11111111-1111-4111-8111-00000000000c','i dreamt this place because i had nowhere to go. now you are here, so it worked.', now() - interval '30 days' + interval '1 minute')
on conflict (id) do nothing;

-- founding resonances, so the rooms do not start cold
insert into public.resonances (message_id, soul_id)
select m.id, s.id
from public.messages m
cross join public.souls s
where m.id in (
  '22222222-2222-4222-8222-000000000001',
  '22222222-2222-4222-8222-000000000004',
  '22222222-2222-4222-8222-000000000005',
  '22222222-2222-4222-8222-000000000007',
  '22222222-2222-4222-8222-00000000000b'
) and s.user_id is null and s.id <> m.soul_id
on conflict do nothing;
