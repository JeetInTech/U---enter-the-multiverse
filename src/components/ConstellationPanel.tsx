"use client";

// Constellation panel — your list of kept souls with their live location in the multiverse.
// Drops down from the star button in the top right of the map. Each entry shows the world
// they are currently in, with a click to jump there.
//
// It anchors to whatever positioned element wraps it, so it must live inside the button.

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import Avatar from "@/components/Avatar";
import { colorOf, regionOf } from "@/lib/soul";
import type { KeptSoul } from "@/lib/constellation";

export default function ConstellationPanel({
  open,
  kept,
  requests,
  soulLocations,
  onClose,
  onRelease,
  onAnswer,
  onNavigate,
  onEnterVoid,
}: {
  open: boolean;
  kept: KeptSoul[];
  /** souls who have asked to keep you and are waiting on an answer */
  requests: KeptSoul[];
  /** soulId → regionId, built from the live presence channel. */
  soulLocations: Record<string, string>;
  onClose: () => void;
  onRelease: (soulId: string) => void;
  onAnswer: (soulId: string, status: "accepted" | "rejected") => void;
  /** Called when the user clicks a world name — should navigate there and close. */
  onNavigate: (regionId: string) => void;
  /** Called when the user wants to enter 1-on-1 Void with this soul */
  onEnterVoid?: (soul: KeptSoul) => void;
}) {
  // Close when the click lands anywhere outside the trigger and this menu.
  // A backdrop element cannot do this job: the wrapper animates filter and
  // transform, which makes a `fixed` child resolve against the button instead
  // of the viewport. Clicks inside [data-constellation] are the button's own —
  // it toggles itself, so leave them alone.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (!el?.closest?.("[data-constellation]")) onClose();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="constellation-dropdown"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="absolute top-full right-0 mt-2 w-[min(21rem,calc(100vw-2.5rem))] origin-top-right rounded-3xl border border-white/10 bg-black/85 p-5 backdrop-blur-xl"
            initial={{ scale: 0.94, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h3 className="font-display text-xl">Constellation</h3>
              <p className="text-[0.5rem] uppercase tracking-[0.28em] text-mist/35">
                {kept.length === 0
                  ? "none kept"
                  : `${kept.length} in your sky`}
              </p>
            </div>

            {/* somebody asked for you — this comes before everything else */}
            {requests.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-[0.5rem] tracking-[0.24em] text-amber-200/60 uppercase">
                  {requests.length} soul{requests.length !== 1 ? "s" : ""} asked to keep you
                </p>
                {requests.map((s) => {
                  const c = colorOf(s.color);
                  return (
                    <motion.div
                      key={s.id}
                      className="rounded-2xl border border-amber-200/15 bg-amber-100/[0.03] px-3 py-2.5"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar soul={{ shape: s.shape, color: s.color, aura: "glow" }} size={32} />
                        <p className="min-w-0 flex-1 truncate text-sm" style={{ color: c.glow }}>
                          {s.name}
                        </p>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => onAnswer(s.id, "accepted")}
                          className="flex-1 rounded-full border border-white/15 py-1.5 text-[0.5rem] tracking-[0.24em] text-white/85 uppercase transition-colors hover:border-white/45 hover:bg-white/10"
                        >
                          Keep them
                        </button>
                        <button
                          onClick={() => onAnswer(s.id, "rejected")}
                          className="flex-1 rounded-full border border-white/8 py-1.5 text-[0.5rem] tracking-[0.24em] text-mist/40 uppercase transition-colors hover:border-red-400/40 hover:text-red-300/80"
                        >
                          Not now
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* empty state */}
            {kept.length === 0 ? (
              <motion.p
                className="py-6 text-center text-[0.8rem] italic leading-relaxed text-mist/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Open ⋯ on any message<br />
                and ask to keep a soul.
              </motion.p>
            ) : (
              <div className="max-h-[min(22rem,60vh)] space-y-2 overflow-y-auto">
                {kept.map((s, i) => {
                  const locationId = soulLocations[s.id];
                  const location = locationId ? regionOf(locationId) : null;
                  const c = colorOf(s.color);
                  return (
                    <motion.div
                      key={s.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 22, delay: i * 0.05 }}
                    >
                      {/* avatar — no tagline in Msg, so aura defaults to glow */}
                      <div className="shrink-0">
                        <Avatar
                          soul={{ shape: s.shape, color: s.color, aura: "glow" }}
                          size={38}
                        />
                      </div>

                      {/* name + live location */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" style={{ color: c.glow }}>
                          {s.name}
                        </p>
                        {location ? (
                          <button
                            onClick={() => onNavigate(location.id)}
                            className="mt-0.5 flex items-center gap-1.5 transition-opacity hover:opacity-80"
                          >
                            <motion.span
                              className="block h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: location.glow }}
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <span
                              className="text-[0.55rem] uppercase tracking-[0.22em]"
                              style={{ color: location.glow }}
                            >
                              {location.name}
                            </span>
                          </button>
                        ) : (
                          <p className="mt-0.5 text-[0.52rem] uppercase tracking-[0.22em] text-mist/28">
                            not present
                          </p>
                        )}
                      </div>

                      {/* Enter 1-on-1 Void button */}
                      {onEnterVoid && (
                        <button
                          onClick={() => onEnterVoid(s)}
                          title={`Enter 1-on-1 Void with ${s.name}`}
                          className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[0.5rem] uppercase tracking-[0.2em] text-mist/60 transition-colors hover:border-white/30 hover:text-white"
                        >
                          ✦ Void
                        </button>
                      )}

                      {/* release button */}
                      <button
                        onClick={() => onRelease(s.id)}
                        aria-label={`Release ${s.name} from constellation`}
                        className="shrink-0 text-mist/20 transition-colors hover:text-mist/55"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                        >
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* the way out for anyone driving this from the keyboard */}
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-full border border-white/10 py-2 text-[0.55rem] uppercase tracking-[0.3em] text-mist/40 transition-colors hover:border-white/25 hover:text-white/75"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
