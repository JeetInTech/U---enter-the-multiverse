"use client";

// Constellation panel — your list of kept souls with their live location in the multiverse.
// Opens from a star button on the map. Each entry shows the world they are currently in,
// with a click to jump there.

import { AnimatePresence, motion } from "motion/react";
import Avatar from "@/components/Avatar";
import { colorOf, regionOf } from "@/lib/soul";
import type { KeptSoul } from "@/lib/constellation";

export default function ConstellationPanel({
  open,
  kept,
  soulLocations,
  onClose,
  onRelease,
  onNavigate,
  onEnterVoid,
}: {
  open: boolean;
  kept: KeptSoul[];
  /** soulId → regionId, built from the live presence channel. */
  soulLocations: Record<string, string>;
  onClose: () => void;
  onRelease: (soulId: string) => void;
  /** Called when the user clicks a world name — should navigate there and close. */
  onNavigate: (regionId: string) => void;
  /** Called when the user wants to enter 1-on-1 Void with this soul */
  onEnterVoid?: (soul: KeptSoul) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="constellation-panel-modal"
          className="absolute inset-0 z-50 grid place-items-center bg-black/70 px-6 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-8"
            initial={{ scale: 0.92, y: 24, filter: "blur(12px)" }}
            animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.04]">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-mist/50" fill="currentColor">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                </svg>
              </div>
              <h3 className="font-display text-3xl">Constellation</h3>
              <p className="mt-1 text-[0.58rem] uppercase tracking-[0.32em] text-mist/35">
                {kept.length === 0
                  ? "no souls kept yet"
                  : `${kept.length} soul${kept.length !== 1 ? "s" : ""} in your sky`}
              </p>
            </div>

            {/* empty state */}
            {kept.length === 0 ? (
              <motion.p
                className="py-8 text-center text-sm italic leading-relaxed text-mist/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Hover any message in a world<br />
                and tap ⋯ → Keep this soul.
              </motion.p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
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

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-full border border-white/10 py-2.5 text-[0.6rem] uppercase tracking-[0.3em] text-mist/45 transition-colors hover:border-white/25 hover:text-white/75"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
