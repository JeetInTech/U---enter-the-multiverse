"use client";

// Inbox / Echoes — vibrations other souls left on your words across the multiverse.
// Tracks unseen resonances so you know when someone connected with your thoughts.

import { client } from "@/lib/db";

export type ResonanceNotice = {
  id: string;
  messageId: string;
  messageText: string;
  region: string;
  resonatorName: string;
  resonatorShape: string;
  resonatorColor: string;
  createdAt: string;
};

const INBOX_KEY = "u:inbox:last_seen";

// what PostgREST hands back for the embed below; the embedded soul arrives as
// an object or a one-element array depending on how it infers the relationship
type ResonanceRow = {
  message_id: string;
  soul_id: string;
  created_at: string;
  souls: { name: string; shape: string; color: string } | { name: string; shape: string; color: string }[] | null;
};

/** Load recent resonances left on messages created by this soul. */
export async function fetchEchoes(soulId: string): Promise<ResonanceNotice[]> {
  const c = client();
  if (!c) {
    // Seeded fallback when working without database
    return [
      {
        id: "echo-seed-1",
        messageId: "seed-1",
        messageText: "welcome, traveler. you have arrived.",
        region: "luminous",
        resonatorName: "Marigold",
        resonatorShape: "circle",
        resonatorColor: "ember",
        createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      },
      {
        id: "echo-seed-2",
        messageId: "seed-2",
        messageText: "the trees hum in D minor",
        region: "crystal",
        resonatorName: "Fern",
        resonatorShape: "circle",
        resonatorColor: "moss",
        createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
      },
    ];
  }

  // 1. Fetch messages authored by this soul
  const { data: myMsgs } = await c
    .from("messages")
    .select("id, text, region")
    .eq("soul_id", soulId);

  if (!myMsgs || myMsgs.length === 0) return [];

  const msgMap = new Map(myMsgs.map((m) => [m.id, m]));
  const msgIds = Array.from(msgMap.keys());

  // 2. Fetch resonances on those messages
  const { data: resData, error } = await c
    .from("resonances")
    .select("message_id, soul_id, created_at, souls:soul_id(name, shape, color)")
    .in("message_id", msgIds)
    .neq("soul_id", soulId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !resData) return [];

  return (resData as unknown as ResonanceRow[]).map((r) => {
    const msg = msgMap.get(r.message_id);
    const soulInfo = Array.isArray(r.souls) ? r.souls[0] : r.souls;
    return {
      id: `${r.message_id}-${r.soul_id}`,
      messageId: r.message_id,
      messageText: msg?.text || "...",
      region: msg?.region || "luminous",
      resonatorName: soulInfo?.name || "A wanderer",
      resonatorShape: soulInfo?.shape || "circle",
      resonatorColor: soulInfo?.color || "tide",
      createdAt: r.created_at,
    };
  });
}

/** Check how many echoes have arrived since the user last opened their soul profile. */
export function getUnreadEchoCount(echoes: ResonanceNotice[]): number {
  if (typeof window === "undefined") return 0;
  const lastSeenStr = localStorage.getItem(INBOX_KEY);
  if (!lastSeenStr) {
    // First time: if there are echoes, mark the latest as unread
    return echoes.length > 0 ? Math.min(echoes.length, 3) : 0;
  }
  const lastSeen = Number(lastSeenStr);
  return echoes.filter((e) => new Date(e.createdAt).getTime() > lastSeen).length;
}

/** Mark all echoes as seen by storing the current timestamp. */
export function markEchoesSeen() {
  if (typeof window === "undefined") return;
  localStorage.setItem(INBOX_KEY, Date.now().toString());
}
