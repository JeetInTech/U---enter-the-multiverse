import { db } from "@/lib/db";

export type VoidThread = {
  partnerId: string;
  partnerName: string;
  partnerShape: string;
  partnerColor: string;
  lastMessage: string;
  lastAt: string;
  regionId: string;
};

const STORAGE_KEY = "u_void_threads";

/** Load locally cached Void conversations */
export function getCachedVoidThreads(): VoidThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Cache a Void thread locally */
export function cacheVoidThread(thread: VoidThread) {
  if (typeof window === "undefined") return;
  try {
    const current = getCachedVoidThreads();
    const filtered = current.filter((t) => t.partnerId !== thread.partnerId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([thread, ...filtered]));
  } catch {}
}

/**
 * Fetch all active 1-on-1 Void conversation threads for a given soul.
 */
export async function fetchVoidThreads(mySoulId: string): Promise<VoidThread[]> {
  const cached = getCachedVoidThreads();
  const c = db();
  if (!c || !mySoulId) return cached;

  try {
    // Query recent messages across any void pocket the user is part of
    const { data, error } = await c
      .from("messages")
      .select("region, text, created_at, soul:souls!soul_id(id, name, shape, color)")
      .like("region", `void_%${mySoulId}%`)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error || !data) return cached;

    const threadMap = new Map<string, VoidThread>();

    for (const row of data as any[]) {
      const region = row.region as string;
      if (!region.startsWith("void_")) continue;

      // Extract the two soul IDs from region: void_<id1>_<id2>
      const parts = region.replace("void_", "").split("_");
      const partnerId = parts.find((p) => p !== mySoulId);
      if (!partnerId) continue;

      if (!threadMap.has(partnerId)) {
        let pName = "Traveler";
        let pShape = "ring";
        let pColor = "indigo";

        if (row.soul && row.soul.id === partnerId) {
          pName = row.soul.name || "Traveler";
          pShape = row.soul.shape || "ring";
          pColor = row.soul.color || "indigo";
        } else {
          const existing = cached.find((c) => c.partnerId === partnerId);
          if (existing) {
            pName = existing.partnerName;
            pShape = existing.partnerShape;
            pColor = existing.partnerColor;
          }
        }

        threadMap.set(partnerId, {
          partnerId,
          partnerName: pName,
          partnerShape: pShape,
          partnerColor: pColor,
          lastMessage: row.text,
          lastAt: row.created_at,
          regionId: region,
        });
      }
    }

    const result = Array.from(threadMap.values());
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    }
    return result;
  } catch {
    return cached;
  }
}
