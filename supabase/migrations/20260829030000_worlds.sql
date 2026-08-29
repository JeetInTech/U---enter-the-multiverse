-- Two new worlds, photographs, and a soul's own word about itself.

-- ---------- the new regions are allowed to exist ----------
alter table public.messages drop constraint if exists messages_region_check;
alter table public.messages add constraint messages_region_check
  check (region in ('luminous','echo','neon','crystal','forge','void','darkroom','sisterhood'));

-- ---------- a photograph is a message wearing a picture ----------
alter table public.messages add column if not exists image_url text;

-- with a picture attached, the words become optional
alter table public.messages drop constraint if exists messages_text_check;
alter table public.messages add constraint messages_text_check
  check (char_length(text) <= 400 and (char_length(text) > 0 or image_url is not null));

-- ---------- what a soul says it is ----------
-- Self-declared and unverified, on purpose: this world has no identity to check
-- against. It is a door people choose to walk through, not a checkpoint.
alter table public.souls add column if not exists declared text;
alter table public.souls drop constraint if exists souls_declared_check;
alter table public.souls add constraint souls_declared_check
  check (declared is null or declared in ('woman','man','neither'));

-- ---------- somewhere to keep the photographs ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif'];

-- anyone may look at them; a soul may only add and remove its own
drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists photos_write on storage.objects;
create policy photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
