"use client";

// Everything that talks to Supabase. Souls arrive anonymously — no email, no password,
// no real name ever leaves the browser. With no env vars set, the world still runs:
// every call falls back to the seeded multiverse in soul.ts so the UI is never broken.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SEED, type Msg } from "@/lib/soul";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasDb = Boolean(URL && KEY);

let cached: SupabaseClient | null | undefined;
export const db = () => (cached ??= hasDb ? createClient(URL!, KEY!) : null);

/** The raw client, for the parts that need more than these helpers: voice, storage. */
export const client = db;

export type SoulRow = {
  id: string;
  name: string;
  tagline: string;
  shape: string;
  color: string;
  aura: string;
  /** what a soul said it is, if it ever said. Never verified, by design. */
  declared?: string | null;
};

/** The soul this browser is carrying, or null if it has never arrived. */
export async function me(): Promise<SoulRow | null> {
  const c = db();
  if (!c) return null;
  const {
    data: { session },
  } = await c.auth.getSession();
  if (!session) return null;
  const { data } = await c
    .from("souls")
    .select("id, name, tagline, shape, color, aura, declared")
    .eq("user_id", session.user.id)
    .maybeSingle();
  return data ?? null;
}

/** A brand new anonymous identity, discarding whatever was stored before. */
async function freshSession(c: SupabaseClient) {
  await c.auth.signOut({ scope: "local" });
  const { data, error } = await c.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

/** Sign in anonymously and write the soul. Returns its id, or null when there is no db. */
/** Record what a soul says it is. It is a door it chooses, not a checkpoint. */
export async function declareSelf(soulId: string, declared: "woman" | "man" | "neither") {
  const c = db();
  if (!c) return;
  const { error } = await c.from("souls").update({ declared }).eq("id", soulId);
  if (error) throw error;
}

export async function arrive(soul: Omit<SoulRow, "id">): Promise<string | null> {
  const c = db();
  if (!c) return null;

  const { declared: _ignored, ...look } = soul;
  const write = (userId: string) =>
    c
      .from("souls")
      .upsert({ user_id: userId, ...look }, { onConflict: "user_id" })
      .select("id")
      .single();

  let session = (await c.auth.getSession()).data.session ?? (await freshSession(c));
  if (!session) return null;

  let { data, error } = await write(session.user.id);
  // a stored token outlives its user if the account was deleted or the project reset;
  // getSession only decodes what is in local storage, so the first write is how we find out
  if (error?.code === "23503") {
    session = await freshSession(c);
    if (!session) return null;
    ({ data, error } = await write(session.user.id));
  }
  if (error) throw error;
  return data!.id;
}

/* ---------- the feed ---------- */

const SELECT =
  "id, text, image_url, created_at, soul:souls!soul_id(id, name, shape, color), resonances(soul_id)";

type Row = {
  id: string;
  text: string;
  image_url: string | null;
  soul: { id: string; name: string; shape: string; color: string };
  resonances: { soul_id: string }[];
};

const toMsg = (r: Row, meId: string | null): Msg => ({
  id: r.id,
  soulId: r.soul.id,
  soul: r.soul.name,
  shape: r.soul.shape,
  color: r.soul.color,
  text: r.text,
  image: r.image_url ?? undefined,
  resonance: r.resonances.length,
  resonated: !!meId && r.resonances.some((x) => x.soul_id === meId),
  mine: !!meId && r.soul.id === meId,
});

export async function loadRegion(region: string, meId: string | null): Promise<Msg[]> {
  const c = db();
  if (!c) return SEED[region] ?? [];
  const { data, error } = await c
    .from("messages")
    .select(SELECT)
    .eq("region", region)
    .order("created_at", { ascending: true })
    .limit(120);
  if (error) throw error;
  return (data as unknown as Row[]).map((r) => toMsg(r, meId));
}

export async function sendMessage(
  region: string,
  soulId: string,
  text: string,
  imageUrl?: string,
) {
  const c = db();
  if (!c) return;
  const { error } = await c
    .from("messages")
    .insert({ region, soul_id: soulId, text, image_url: imageUrl ?? null });
  if (error) throw error;
}

/** Put a photograph in the bucket and hand back the address it now lives at. */
export async function uploadPhoto(file: File): Promise<string> {
  const c = db();
  if (!c) throw new Error("no database");
  const {
    data: { session },
  } = await c.auth.getSession();
  if (!session) throw new Error("not signed in");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
  const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await c.storage.from("photos").upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
  });
  if (error) throw error;
  return c.storage.from("photos").getPublicUrl(path).data.publicUrl;
}

export async function resonate(messageId: string, soulId: string) {
  const c = db();
  if (!c) return;
  // already resonated? the primary key says so, and that is not an error worth surfacing
  await c.from("resonances").insert({ message_id: messageId, soul_id: soulId });
}

/* ---------- what has actually happened in each region ---------- */

export type Stats = Record<string, { souls: number; voices: number }>;

const seedStats = (): Stats =>
  Object.fromEntries(
    Object.entries(SEED).map(([region, ms]) => [
      region,
      { souls: new Set(ms.map((m) => m.soul)).size, voices: ms.length },
    ]),
  );

export async function loadStats(): Promise<Stats> {
  const c = db();
  if (!c) return seedStats();
  const { data, error } = await c.from("region_stats").select("region, souls, voices");
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.region, { souls: r.souls, voices: r.voices }]));
}

/* ---------- lore ---------- */

export async function loadLore(soulId: string | null): Promise<number[]> {
  const c = db();
  if (!c || !soulId) return [];
  const { data } = await c.from("discoveries").select("lore_index").eq("soul_id", soulId);
  return (data ?? []).map((d) => d.lore_index as number);
}

export async function recordLore(soulId: string, index: number) {
  const c = db();
  if (!c) return;
  await c.from("discoveries").insert({ soul_id: soulId, lore_index: index });
}

/* ---------- who is actually here, everywhere ---------- */

/**
 * One channel for the whole multiverse. Every soul tracks which region it is
 * standing in, so the map can count heads without opening six subscriptions.
 */
export function watchPresence(
  me: { id: string; name: string } | null,
  onCounts: (counts: Record<string, number>) => void,
  onLocations?: (locations: Record<string, string>) => void,
): { where: (region: string | null) => void; stop: () => void } {
  const c = db();
  if (!c) return { where: () => {}, stop: () => {} };

  let region: string | null = null;
  const channel = c.channel("multiverse", {
    config: { presence: { key: me?.id ?? crypto.randomUUID() } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const counts: Record<string, number> = {};
      const locations: Record<string, string> = {};
      for (const souls of Object.values(
        channel.presenceState<{ region: string | null; soulId?: string | null }>()
      ))
        for (const s of souls) {
          if (s.region) {
            counts[s.region] = (counts[s.region] ?? 0) + 1;
            if (s.soulId) locations[s.soulId] = s.region;
          }
        }
      onCounts(counts);
      onLocations?.(locations);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED")
        channel.track({ soul: me?.name ?? null, soulId: me?.id ?? null, region });
    });

  return {
    where: (r) => {
      region = r;
      channel.track({ soul: me?.name ?? null, soulId: me?.id ?? null, region: r });
    },
    stop: () => {
      c.removeChannel(channel);
    },
  };
}

/* ---------- arriving messages ---------- */

export type Live = {
  onMessage: (m: Msg) => void;
  onResonance: (messageId: string, soulId: string) => void;
};

/** Subscribe to one region. Returns an unsubscribe function; a no-op without a db. */
export function watchRegion(
  region: string,
  me: { id: string; name: string } | null,
  cb: Live,
): () => void {
  const c = db();
  if (!c) return () => {};

  const channel = c.channel(`region:${region}`);

  channel
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `region=eq.${region}` },
      async (payload) => {
        // one row fetch to pick up the author and resonance shape the feed needs
        // ponytail: a join per arriving message; batch it if a room ever gets loud
        const { data } = await c
          .from("messages")
          .select(SELECT)
          .eq("id", payload.new.id)
          .maybeSingle();
        if (data) cb.onMessage(toMsg(data as unknown as Row, me?.id ?? null));
      },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "resonances" },
      (payload) => cb.onResonance(payload.new.message_id, payload.new.soul_id),
    )
    .subscribe();

  return () => {
    c.removeChannel(channel);
  };
}

/* ---------- rituals: the things a region does that are not chat ---------- */

export type Ritual =
  | { kind: "lantern"; wish: string; color: string; x: number }
  | { kind: "whisper"; text: string; color: string }
  | { kind: "burst"; color: string }
  | { kind: "chime"; note: number; color: string }
  | { kind: "word"; word: string; color: string; soul: string }
  | { kind: "thread"; text: string; color: string };

/**
 * A broadcast channel per region. Nothing here touches the database on purpose —
 * a lantern, a whisper, a burst of light happen once and are gone, which is the
 * point of them. Returns a send function; sending also plays it locally.
 */
export function joinRitual(region: string, onRitual: (r: Ritual) => void): (r: Ritual) => void {
  const c = db();
  if (!c) return (r) => onRitual(r);

  const channel = c.channel(`ritual:${region}`, { config: { broadcast: { self: false } } });
  channel.on("broadcast", { event: "ritual" }, ({ payload }) => onRitual(payload as Ritual));
  channel.subscribe();

  const send = (r: Ritual) => {
    onRitual(r); // yours happens immediately; theirs travels
    channel.send({ type: "broadcast", event: "ritual", payload: r });
  };
  send.stop = () => {
    c.removeChannel(channel);
  };
  return send;
}

/** Close the channel a joinRitual send function belongs to. */
export const leaveRitual = (send: (r: Ritual) => void) =>
  (send as { stop?: () => void }).stop?.();

/* ---------- leaving ---------- */

/** Forget this browser's soul without deleting anything it said. */
export async function leaveQuietly() {
  const c = db();
  if (c) await c.auth.signOut({ scope: "local" }).catch(() => {});
}

/** Erase the soul entirely — messages, resonances and discoveries go with it. */
export async function dissolve(soulId: string) {
  const c = db();
  if (!c) return;
  const { error } = await c.from("souls").delete().eq("id", soulId);
  if (error) throw error;
  await c.auth.signOut({ scope: "local" }).catch(() => {});
}
