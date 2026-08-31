"use client";

import { motion, AnimatePresence } from "framer-motion";
import Avatar, { type SoulLook } from "@/components/Avatar";
import { colorOf } from "@/lib/soul";
import type { KeptSoul } from "@/lib/constellation";
import type { VoidThread } from "@/lib/void";

export default function VoidSelector({
  open,
  threads,
  kept,
  onClose,
  onEnterVoid,
}: {
  open: boolean;
  threads: VoidThread[];
  kept: KeptSoul[];
  onClose: () => void;
  onEnterVoid: (partner: { id: string; name: string; shape: string; color: string }) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="void-selector-modal"
          className="absolute inset-0 z-50 grid place-items-center bg-black/75 px-6 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-black/90 p-7 text-center shadow-2xl"
            initial={{ scale: 0.92, y: 24, filter: "blur(12px)" }}
            animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Celestial Black Hole Icon */}
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/[0.04] shadow-[0_0_25px_rgba(255,255,255,0.15)]">
              <span className="text-xl text-white">🕳️</span>
            </div>

            <span className="text-[0.52rem] uppercase tracking-[0.32em] text-white/50">
              Private Pocket Dimensions
            </span>
            <h3 className="mt-1 font-display text-3xl text-white">The Void</h3>
            <p className="mt-2 text-xs leading-relaxed text-mist/60">
              An infinite private sanctuary. Speak 1-on-1 with souls in completely isolated pocket
              dimensions where only the two of you exist.
            </p>

            <div className="mt-6 max-h-72 space-y-4 overflow-y-auto pr-1 text-left">
              {/* Active Threads */}
              {threads.length > 0 && (
                <div>
                  <p className="px-1 text-[0.52rem] uppercase tracking-[0.26em] text-mist/40">
                    Active Whispers ({threads.length})
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {threads.map((t) => {
                      const col = colorOf(t.partnerColor);
                      const partnerLook: SoulLook = {
                        shape: t.partnerShape,
                        color: t.partnerColor,
                        aura: "ghost",
                      };
                      return (
                        <button
                          key={t.partnerId}
                          onClick={() => {
                            onEnterVoid({
                              id: t.partnerId,
                              name: t.partnerName,
                              shape: t.partnerShape,
                              color: t.partnerColor,
                            });
                          }}
                          className="flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06]"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Avatar soul={partnerLook} size={36} />
                            <div className="overflow-hidden">
                              <p className="font-display text-sm truncate" style={{ color: col.glow }}>
                                {t.partnerName}
                              </p>
                              <p className="text-[0.68rem] text-mist/50 truncate max-w-[12rem]">
                                {t.lastMessage}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-[0.5rem] uppercase tracking-[0.2em] text-white/70">
                            Enter →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Constellation Souls */}
              {kept.length > 0 && (
                <div>
                  <p className="px-1 text-[0.52rem] uppercase tracking-[0.26em] text-mist/40">
                    Your Constellation ({kept.length})
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {kept.map((s) => {
                      const col = colorOf(s.color);
                      const partnerLook: SoulLook = {
                        shape: s.shape,
                        color: s.color,
                        aura: "ghost",
                      };
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 transition-colors hover:border-white/20"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar soul={partnerLook} size={34} />
                            <div>
                              <p className="font-display text-sm" style={{ color: col.glow }}>
                                {s.name}
                              </p>
                              <p className="text-[0.54rem] uppercase tracking-[0.22em] text-mist/40">
                                Kept in Sky
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              onEnterVoid({
                                id: s.id,
                                name: s.name,
                                shape: s.shape,
                                color: s.color,
                              });
                            }}
                            className="rounded-full border border-white/20 px-3.5 py-1.5 text-[0.52rem] uppercase tracking-[0.24em] text-white transition-colors hover:border-white/50 hover:bg-white/10"
                          >
                            ✦ Open Void
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {threads.length === 0 && kept.length === 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5 text-center">
                  <p className="text-xs text-mist/50">
                    You have not kept any souls in your Constellation yet.
                  </p>
                  <p className="mt-2 text-[0.58rem] tracking-wider uppercase text-mist/35">
                    Wander into any world and keep a soul to invite them into The Void.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-full border border-white/10 py-2.5 text-[0.58rem] uppercase tracking-[0.3em] text-mist/50 transition-colors hover:border-white/25 hover:text-white"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
