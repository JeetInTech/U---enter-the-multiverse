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
const db = () => (cached ??= hasDb ? createClient(URL!, KEY!) : null);

export type SoulRow = {
  id: string;
  name: string;
  tagline: string;
  shape: string;
  color: string;
  aura: string;
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
    .select("id, name, tagline, shape, color, aura")
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
export async function arrive(soul: Omit<SoulRow, "id">): Promise<string | null> {
  const c = db();
  if (!c) return null;

  const write = (userId: string) =>
    c
      .from("souls")
      .upsert({ user_id: userId, ...soul }, { onConflict: "user_id" })
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

const SELECT = "id, text, created_at, soul:souls!soul_id(id, name, shape, color), resonances(soul_id)";

type Row = {
  id: string;
  text: string;
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

export async function sendMessage(region: string, soulId: string, text: string) {
  const c = db();
  if (!c) return;
  const { error } = await c.from("messages").insert({ region, soul_id: soulId, text });
  if (error) throw error;
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
      for (const souls of Object.values(
        channel.presenceState<{ region: string | null }>(),
      ))
        for (const s of souls) if (s.region) counts[s.region] = (counts[s.region] ?? 0) + 1;
      onCounts(counts);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") channel.track({ soul: me?.name ?? null, region });
    });

  return {
    where: (r) => {
      region = r;
      channel.track({ soul: me?.name ?? null, region: r });
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
