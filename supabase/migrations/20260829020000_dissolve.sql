-- A soul must be able to leave without a trace. Deleting its row cascades to
-- its messages, resonances and discoveries.
drop policy if exists souls_delete on public.souls;
create policy souls_delete on public.souls for delete
  using (auth.uid() = user_id);
