"use client";

// Constellation — the souls you have asked to keep, and the souls who asked you.
//
// A keep is an invitation, not a capture. Nobody appears in anybody's Void until
// they have agreed to it, and a soul who says no stops appearing altogether: no
// pocket dimension, no entry in either sky. Being left alone has to actually work.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { client } from "@/lib/db";

export type RequestStatus = "pending" | "accepted" | "rejected";

export type KeptSoul = {
  id: string;
  name: string;
  shape: string;
  color: string;
  status: RequestStatus;
  /** "out" — you asked them. "in" — they asked you. */
  direction: "out" | "in";
};

type Link = {
  keeper_id: string;
  kept_id: string;
  status: RequestStatus;
  created_at: string;
};

type SoulRow = { id: string; name: string; shape: string; color: string };

/**
 * Every link this soul is either end of, with the other soul's look attached.
 *
 * Two queries rather than an embed: constellations reaches souls twice (keeper
 * and kept), so PostgREST cannot tell which relationship an embed means without
 * a hint that differs per project.
 */
export async function loadLinks(soulId: string): Promise<KeptSoul[]> {
  const c = client();
  if (!c || !soulId) return [];

  const { data: links } = await c
    .from("constellations")
    .select("keeper_id, kept_id, status, created_at")
    .or(`keeper_id.eq.${soulId},kept_id.eq.${soulId}`)
    .order("created_at", { ascending: false });
  if (!links?.length) return [];

  const rows = links as Link[];
  const others = rows.map((l) => (l.keeper_id === soulId ? l.kept_id : l.keeper_id));
  const { data: souls } = await c
    .from("souls")
    .select("id, name, shape, color")
    .in("id", others);

  const look = new Map((souls ?? []).map((s) => [s.id, s as SoulRow]));
  return rows.flatMap((l) => {
    const otherId = l.keeper_id === soulId ? l.kept_id : l.keeper_id;
    const s = look.get(otherId);
    if (!s) return []; // they dissolved between the two queries
    return [{ ...s, status: l.status, direction: l.keeper_id === soulId ? "out" : "in" }];
  });
}

/** Souls who agreed, whichever way the invitation went. These are the ones you can whisper to. */
export const connected = (links: KeptSoul[]) => links.filter((l) => l.status === "accepted");

/** Waiting on you to answer. */
export const incoming = (links: KeptSoul[]) =>
  links.filter((l) => l.direction === "in" && l.status === "pending");

/** Waiting on them, or already answered no. */
export const outgoing = (links: KeptSoul[]) =>
  links.filter((l) => l.direction === "out" && l.status !== "accepted");

/**
 * Ask a soul to be kept. Idempotent by primary key, so asking twice is quiet —
 * and a soul who already said no cannot be asked again just by clicking harder,
 * because the rejected row is still there and the insert conflicts.
 */
export async function keepSoul(keeperId: string, keptId: string) {
  const c = client();
  if (!c || keeperId === keptId) return;
  await c.from("constellations").insert({ keeper_id: keeperId, kept_id: keptId });
}

/**
 * Answer a request. Only the soul who was asked can call this — the database
 * enforces it, so a keeper cannot accept on their own behalf.
 */
export async function answerRequest(
  keeperId: string,
  myId: string,
  status: "accepted" | "rejected",
) {
  const c = client();
  if (!c) return;
  await c
    .from("constellations")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("keeper_id", keeperId)
    .eq("kept_id", myId);
}

/** Let a soul go, from either end. Withdrawing a request uses this too. */
export async function releaseSoul(myId: string, otherId: string) {
  const c = client();
  if (!c) return;
  await c
    .from("constellations")
    .delete()
    .or(
      `and(keeper_id.eq.${myId},kept_id.eq.${otherId}),and(keeper_id.eq.${otherId},kept_id.eq.${myId})`,
    );
}

/**
 * Tell me the moment somebody asks for me, or answers what I asked.
 * Two subscriptions because a filter can only name one column.
 */
export function watchLinks(soulId: string, onChange: () => void): () => void {
  const c = client();
  if (!c || !soulId) return () => {};
  const channels: RealtimeChannel[] = ["kept_id", "keeper_id"].map((col) =>
    c
      .channel(`links:${col}:${soulId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "constellations", filter: `${col}=eq.${soulId}` },
        onChange,
      )
      .subscribe(),
  );
  return () => channels.forEach((ch) => c.removeChannel(ch));
}
