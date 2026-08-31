# U — build queue

Ordered. Do one, ship it, tick it, move to the next. Nothing here is started.

Legend: `[ ]` todo · `[x]` done · **Done when** is the test, not a feeling.

---

## Phase 0 — broken right now

### [x] 0.1 Create the `photos` storage bucket

The Darkroom's camera button will fail on upload. Migration 4's table changes
landed (`messages.image_url` and `souls.declared` both return 200, and the
`darkroom` region passes the constraint) but the bucket statement did not.
`GET /storage/v1/object/list/photos` → `{"error":"Bucket not found"}`.

Run in the Supabase SQL editor:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos','photos', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set public = true;

drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects for select using (bucket_id = 'photos');

drop policy if exists photos_write on storage.objects;
create policy photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
```

**Done when** you send a photo in The Darkroom and it appears on a second device.

### [x] 0.2 Confirm the dissolve policy ran

`supabase/migrations/20260829020000_dissolve.sql` adds the DELETE policy on
`souls`. Can't be verified from outside — RLS with no policy and RLS that denies
look identical over the API (0 rows, no error). Re-run the file; it's idempotent.

**Done when** Profile → Dissolve removes the soul and a reload forges a new one.

### [ ] 0.3 TURN server for voice

Voice connects on the same wifi and fails across networks — `failed`, no `relay`
candidates. Not a code bug: there is no relay. Code already reads
`NEXT_PUBLIC_TURN_URL` / `_USER` / `_PASS` and does one ICE restart before giving up.
Metered.ca's free tier or a `coturn` box both work. The public Open Relay endpoint
was tested and does **not** work — don't put it back.

Set the three vars in Netlify, then **Clear cache and deploy site** — `NEXT_PUBLIC_*`
is inlined at build time, which is what cost hours last time.

**Done when** two phones on different networks hear each other, console logs
`gathered relay candidate`.

---

## Phase 1 — the two that matter

### [x] 1.1 Safety tooling

Biggest hole in the product. Anonymous identity + photo uploads + a women-only
room + zero block, mute, or report. Nobody can get away from anyone and nobody
can flag anything. The lore already promises Guardians who currently have no powers.

Smallest useful version:

- `blocks` table (`soul_id`, `blocked_id`) — filter both feed and presence.
- `reports` table (`message_id`, `reporter`, `reason`) — no queue UI yet, just read the table.
- Hide a message locally the moment its author is blocked.
- Someone (you) can delete any message and any photo. There is no way to do that today.

**Done when** blocking a soul makes their messages and their voice vanish for you,
and stays that way after reload.

### [x] 1.2 A way to find a person again

The whole emotional pitch is *"you meet someone in The Echo Chamber at 2 AM."*
Today that person is unreachable the moment the tab closes. This is the retention gap.

Doesn't have to be DMs — a lightweight **keep this soul** is most of the value and
fits the anonymity better: tap a soul, they land in your Constellation, you see
when they're present. Add private threads later if people actually ask.

**Done when** you can keep a soul, see them online across a reload, and jump to
whichever world they're in.

---

## Phase 2 — reasons to come back

### [x] 2.1 An inbox

Resonance is the strongest pull any social app has and yours is currently invisible
unless you happen to be staring at the screen. *"3 souls resonated · someone answered
you in The Echo Chamber."* Cheap: query `resonances` newer than `last_seen`.

**Done when** the profile button carries an unread dot that clears on open.

### [x] 2.2 Scheduled live moments

Already in the brief: **The Awakening**, **Storytelling Night**, **The Silence**.
Recurring appointments are the best retention mechanic a community this size has, they
cost almost nothing, and they fix cold start by concentrating everyone at one hour.

Static schedule in code + a countdown on the map + the ambience shifting when it starts.

**Done when** the map shows *"The Silence begins in 14m"* and the world visibly changes at zero.

### [x] 2.3 Fix the empty room

A new soul currently arrives into silence, which reads as a dead app. The map should
push toward wherever life actually is, and a first arrival should never land somewhere
with nobody in it.

**Done when** first arrival routes to the busiest world and dead worlds are visibly marked.

---

## Phase 3 — expansion & intimate whispers

### [x] 3.1 The Void — 1-on-1 Private Pocket Dimensions

Transform The Void (the black hole at the center of the Multiverse) into an infinite, private 1-on-1 sanctuary. Any traveler can hold separate, completely isolated conversations with 100+ different souls simultaneously.

- Unique deterministic room ID per pair: `void_<soulA>_<soulB>`.
- One-tap entry from Constellation Panel (`✦ Void` button on kept souls).
- One-tap entry from Message Menu (`✦ Whisper in The Void` on any message).
- Pocket Dimensions selector modal on the Multiverse map showing active whisper history and constellation travelers.
- Isolated real-time messaging, private spatial voice, and custom partner aura theme.

**Done when** clicking The Void opens pocket selector, 1-on-1 rooms isolate messages per pair, and Constellation allows direct whisper warps.

### [ ] 3.2 A way out of the app
No growth loop exists. Invites fit the lore exactly ("word of soul"), and a shareable
card — your soul, or a lore fragment you found — is how this spreads.

### [x] 3.3 Celestial Sky — Astronomical Background Constellations

Real ancient celestial constellations rendered directly into the deep space canvas behind the multiverse.

- Ursa Major (Big Dipper), Cassiopeia, Orion, Cygnus (Northern Cross), Taurus & Pleiades.
- Multi-layer glowing star halos with synchronized cosmic twinkle.
- Parallax depth physics reacting to pointer movement.
- Delicate celestial cartography labels and atmospheric palette adaptation.

**Done when** constellations float in the background with subtle stellar lines and parallax depth.

### [ ] 3.4 AR/VR
Explicitly deferred. Stays deferred.

---

## Standing risks

Not features — things that are true right now.

- **No rate limiting.** Anyone with the anon key can post straight to the API,
  bypassing the UI. One script floods every room. Fix with a per-soul insert
  throttle in RLS or a Postgres trigger.
- **No photo moderation.** MIME type is the only check. Nobody, including you,
  can remove someone else's image. Covered by 1.1.
- **Voice is unproven.** No real two-person call has ever been verified — there
  has never been a working mic in the dev environment. Test it on real phones.

---

## Don't touch

The landing page and Soul Forge. They're good. Left alone on purpose.
