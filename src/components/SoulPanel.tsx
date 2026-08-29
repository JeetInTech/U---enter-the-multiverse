"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import type { Soul } from "@/components/SoulForge";
import { colorOf, rankFor, RANKS } from "@/lib/soul";

export default function SoulPanel({
  soul,
  found,
  open,
  onClose,
  onReshape,
  onLeave,
  onDissolve,
}: {
  soul: Soul;
  found: number[];
  open: boolean;
  onClose: () => void;
  onReshape: () => void;
  onLeave: () => void;
  onDissolve: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const c = colorOf(soul.color);
  const lore = found.length;
  const next = RANKS.find((r) => r.at > lore);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
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
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center"
            initial={{ scale: 0.92, y: 24, filter: "blur(12px)" }}
            animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center">
              <Avatar soul={soul} size={120} speaking />
            </div>

            <h3 className="mt-8 font-display text-4xl" style={{ color: c.glow }}>
              {soul.name || "unnamed"}
            </h3>
            <p className="mt-1 text-sm text-mist/55 italic">{soul.tagline}</p>

            <div className="mt-6 flex items-center justify-center gap-2 text-[0.58rem] uppercase tracking-[0.3em] text-mist/45">
              <span style={{ color: c.glow }}>{rankFor(lore)}</span>
              <span className="text-mist/20">·</span>
              <span>{lore} fragments</span>
            </div>

            {/* how far along the road you are */}
            <div className="mt-4 h-px w-full bg-white/10">
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

            <div className="mt-9 space-y-2.5">
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

            <p className="mt-7 text-[0.52rem] uppercase tracking-[0.3em] text-mist/25">
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
