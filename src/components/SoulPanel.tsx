"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import type { Soul } from "@/components/SoulForge";
import { colorOf, rankFor, RANKS, regionOf } from "@/lib/soul";
import type { ResonanceNotice } from "@/lib/inbox";
import type { BlockedSoul } from "@/lib/safety";

function timeAgo(isoString: string): string {
  const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SoulPanel({
  soul,
  found,
  open,
  echoes = [],
  blocked = [],
  onUnblock,
  onClose,
  onMarkSeen,
  onReshape,
  onLeave,
  onDissolve,
}: {
  soul: Soul;
  found: number[];
  open: boolean;
  echoes?: ResonanceNotice[];
  /** souls this one has silenced — the only place they can be found again */
  blocked?: BlockedSoul[];
  onUnblock?: (soulId: string) => void;
  onClose: () => void;
  onMarkSeen?: () => void;
  onReshape: () => void;
  onLeave: () => void;
  onDissolve: () => void;
}) {
  const [tab, setTab] = useState<"soul" | "echoes">("soul");
  const [confirming, setConfirming] = useState(false);
  const c = colorOf(soul.color);
  const lore = found.length;
  const next = RANKS.find((r) => r.at > lore);

  useEffect(() => {
    if (open) {
      onMarkSeen?.();
    }
  }, [open, onMarkSeen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="soul-panel-modal"
          className="absolute inset-0 z-50 grid place-items-center bg-black/70 px-6 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setConfirming(false);
            onClose();
          }}
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center"
            initial={{ scale: 0.92, y: 24, filter: "blur(12px)" }}
            animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* tab selector */}
            <div className="mb-5 flex rounded-full border border-white/10 bg-black/30 p-1">
              <button
                onClick={() => setTab("soul")}
                className={`flex-1 rounded-full py-1.5 text-[0.56rem] uppercase tracking-[0.28em] transition-colors ${
                  tab === "soul" ? "bg-white/15 text-white" : "text-mist/40 hover:text-mist/70"
                }`}
              >
                Soul
              </button>
              <button
                onClick={() => setTab("echoes")}
                className={`flex-1 rounded-full py-1.5 text-[0.56rem] uppercase tracking-[0.28em] transition-colors flex items-center justify-center gap-1.5 ${
                  tab === "echoes" ? "bg-white/15 text-white" : "text-mist/40 hover:text-mist/70"
                }`}
              >
                <span>Echoes</span>
                {echoes.length > 0 && (
                  <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-white/20 text-[0.48rem]">
                    {echoes.length}
                  </span>
                )}
              </button>
            </div>

            {tab === "soul" ? (
              <>
                <div className="flex justify-center">
                  <Avatar soul={soul} size={110} speaking />
                </div>

                <h3 className="mt-6 font-display text-4xl" style={{ color: c.glow }}>
                  {soul.name || "unnamed"}
                </h3>
                <p className="mt-1 text-sm text-mist/55 italic">{soul.tagline}</p>

                <div className="mt-5 flex items-center justify-center gap-2 text-[0.58rem] uppercase tracking-[0.3em] text-mist/45">
                  <span style={{ color: c.glow }}>{rankFor(lore)}</span>
                  <span className="text-mist/20">·</span>
                  <span>{lore} fragments</span>
                </div>

                {/* lore progress bar */}
                <div className="mt-3.5 h-px w-full bg-white/10">
                  <motion.div
                    className="h-px"
                    style={{ background: c.glow }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(lore / 6, 1) * 100}%` }}
                    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <p className="mt-2 text-[0.55rem] uppercase tracking-[0.3em] text-mist/30">
                  {next ? `${next.at - lore} more to become ${next.name}` : "you are a Guardian"}
                </p>

                {/* A block with no way back is a trap you set for yourself, so
                    every silenced soul stays listed here until you let them go. */}
                {blocked.length > 0 && (
                  <div className="mt-7">
                    <p className="mb-2 text-[0.5rem] tracking-[0.28em] text-mist/35 uppercase">
                      Silenced · {blocked.length}
                    </p>
                    <div className="max-h-40 space-y-1.5 overflow-y-auto">
                      {blocked.map((b) => {
                        const bc = colorOf(b.color);
                        return (
                          <div
                            key={b.id}
                            className="flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                          >
                            <Avatar soul={{ shape: b.shape, color: b.color, aura: "glow" }} size={26} />
                            <p className="min-w-0 flex-1 truncate text-[0.78rem]" style={{ color: bc.glow }}>
                              {b.name}
                            </p>
                            <button
                              onClick={() => onUnblock?.(b.id)}
                              className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[0.5rem] tracking-[0.2em] text-mist/50 uppercase transition-colors hover:border-white/35 hover:text-white"
                            >
                              Unsilence
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-7 space-y-2">
                  <Row onClick={onReshape} accent={c.glow}>
                    Reshape this soul
                  </Row>
                  <Row onClick={onLeave} accent={c.glow}>
                    Leave quietly
                  </Row>

                  {!confirming ? (
                    <Row onClick={() => setConfirming(true)} danger>
                      Dissolve
                    </Row>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-red-400/25 bg-red-500/[0.06] p-4"
                    >
                      <p className="text-[0.7rem] leading-relaxed text-mist/70">
                        Everything this soul said, resonated with and found goes with it. There is no
                        undoing it and no name to recover.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setConfirming(false)}
                          className="flex-1 rounded-full border border-white/15 py-2 text-[0.58rem] uppercase tracking-[0.25em] text-mist/60 transition-colors hover:text-white"
                        >
                          Keep it
                        </button>
                        <button
                          onClick={onDissolve}
                          className="flex-1 rounded-full bg-red-500/80 py-2 text-[0.58rem] uppercase tracking-[0.25em] text-white transition-colors hover:bg-red-500"
                        >
                          Dissolve
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </>
            ) : (
              /* Echoes / Inbox View */
              <div className="py-2 text-left">
                <div className="mb-4 text-center">
                  <h4 className="font-display text-2xl" style={{ color: c.glow }}>
                    Resonances
                  </h4>
                  <p className="mt-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-mist/35">
                    Vibrations other souls left on your words
                  </p>
                </div>

                {echoes.length === 0 ? (
                  <div className="py-12 text-center text-xs italic text-mist/30 leading-relaxed">
                    No echoes yet.<br />
                    Speak in the worlds and wait for a vibration.
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                    {echoes.map((e) => {
                      const reg = regionOf(e.region);
                      const rc = colorOf(e.resonatorColor);
                      return (
                        <div
                          key={e.id}
                          className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 transition-colors hover:border-white/15"
                        >
                          <div className="flex items-center justify-between text-[0.54rem] uppercase tracking-[0.22em]">
                            <span style={{ color: reg.glow }}>{reg.name}</span>
                            <span className="text-mist/35">{timeAgo(e.createdAt)}</span>
                          </div>
                          <p className="mt-1.5 truncate text-[0.75rem] italic text-mist/85">
                            &ldquo;{e.messageText}&rdquo;
                          </p>
                          <div className="mt-2 flex items-center gap-1.5 text-[0.52rem] uppercase tracking-[0.2em] text-mist/45">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: rc.glow }}
                            />
                            <span style={{ color: rc.glow }}>{e.resonatorName}</span>
                            <span>resonated</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <p className="mt-6 text-[0.52rem] uppercase tracking-[0.3em] text-mist/25">
              no email · no password · no real name
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({
  children,
  onClick,
  accent,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: string;
  danger?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full rounded-full border py-3 text-[0.6rem] uppercase tracking-[0.3em] transition-colors ${
        danger
          ? "border-red-400/25 text-red-300/70 hover:border-red-400/60 hover:text-red-300"
          : "border-white/12 text-mist/65 hover:border-white/35 hover:text-white"
      }`}
      style={!danger && accent ? { color: undefined } : undefined}
    >
      {children}
    </motion.button>
  );
}

