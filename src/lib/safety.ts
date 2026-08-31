"use client";

// Safety layer. Blocks are local to a soul and filter the feed everywhere they go.
// Reports land in a table only the project owner can read (no select RLS policy).

import { client } from "@/lib/db";

export type ReportReason = "offensive" | "spam" | "other";

/** Every soul ID this soul has blocked — loaded once on arrival, updated locally on new blocks. */
export async function loadBlocks(soulId: string): Promise<Set<string>> {
  const c = client();
  if (!c) return new Set();
  const { data } = await c
    .from("blocks")
    .select("blocked_id")
    .eq("soul_id", soulId);
  return new Set((data ?? []).map((r) => r.blocked_id as string));
}

/** Block a soul. The primary key is (soul_id, blocked_id) so it is idempotent. */
export async function blockSoul(soulId: string, blockedId: string) {
  const c = client();
  if (!c) return;
  // duplicate inserts are silently eaten by the primary key conflict
  await c.from("blocks").insert({ soul_id: soulId, blocked_id: blockedId });
}

/** Undo a block. */
export async function unblockSoul(soulId: string, blockedId: string) {
  const c = client();
  if (!c) return;
  await c
    .from("blocks")
    .delete()
    .eq("soul_id", soulId)
    .eq("blocked_id", blockedId);
}

/**
 * File a report. The reporter is the soul ID, not the user ID, because this
 * world does not know user IDs. Only the service_role (you, via the SQL editor)
 * can read the reports table — there is intentionally no select RLS policy.
 */
export async function reportMessage(
  messageId: string,
  reporterSoulId: string,
  reason: ReportReason,
) {
  const c = client();
  if (!c) return;
  await c.from("reports").insert({
    message_id: messageId,
    reporter: reporterSoulId,
    reason,
  });
}
