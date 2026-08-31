"use client";

// Constellation — a soul''s personal list of other souls they have chosen to keep.
// Kept souls show up in a panel on the map with their live location.

import { client } from "@/lib/db";

export type KeptSoul = {
  id: string;
  name: string;
  shape: string;
  color: string;
};

/** Load every soul this keeper has chosen to keep, with their current profile data. */
export async function loadConstellation(keeperId: string): Promise<KeptSoul[]> {
  const c = client();
  if (!c) return [];
  // two queries: the join syntax is ambiguous when FK names vary across projects
  const { data: links } = await c
    .from("constellations")
    .select("kept_id")
    .eq("keeper_id", keeperId);
  if (!links || links.length === 0) return [];
  const ids = links.map((l) => l.kept_id as string);
  const { data: souls } = await c
    .from("souls")
    .select("id, name, shape, color")
    .in("id", ids);
  return (souls ?? []) as KeptSoul[];
}

/** Add a soul to the keeper''s constellation. Idempotent — PK handles duplicates silently. */
export async function keepSoul(keeperId: string, keptId: string) {
  const c = client();
  if (!c) return;
  await c.from("constellations").insert({ keeper_id: keeperId, kept_id: keptId });
}

/** Remove a soul from the keeper''s constellation. */
export async function releaseSoul(keeperId: string, keptId: string) {
  const c = client();
  if (!c) return;
  await c
    .from("constellations")
    .delete()
    .eq("keeper_id", keeperId)
    .eq("kept_id", keptId);
}
