-- ---------------------------------------------------------------------------
-- Taking something back.
--
-- Until now a message could not be deleted by anyone, including the person who
-- wrote it. In a room full of strangers, being unable to unsay a thing is its
-- own kind of trap — and the photo channel makes it worse, because a picture
-- posted in the wrong place could not be withdrawn at all.
--
-- This only ever lets a soul remove its own. Removing somebody else's stays
-- with the service role, where a report queue can reach it.
-- ---------------------------------------------------------------------------

drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete
  using (soul_id in (select id from public.souls where user_id = auth.uid()));

-- Resonances left on a deleted message go with it. The foreign key already
-- cascades, so this is only here to say so out loud.
