"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import Avatar, { type SoulLook } from "@/components/Avatar";
import { colorOf } from "@/lib/soul";
import type { KeptSoul } from "@/lib/constellation";
import type { VoidThread } from "@/lib/void";

type Partner = { id: string; name: string; shape: string; color: string };

const look = (s: { shape: string; color: string }): SoulLook => ({
  shape: s.shape,
  color: s.color,
  aura: "ghost",
});

export default function VoidSelector({
  open,
  threads,
  connected,
  sent,
  onClose,
  onEnterVoid,
  onWithdraw,
}: {
  open: boolean;
  threads: VoidThread[];
  /** souls who agreed — the only ones a pocket dimension will open for */
  connected: KeptSoul[];
  /** what you asked for and has not been accepted: still waiting, or refused */
  sent: KeptSoul[];
  onClose: () => void;
  onEnterVoid: (partner: Partner) => void;
  onWithdraw: (soulId: string) => void;
}) {
  const [tab, setTab] = useState<"souls" | "sent">("souls");

  // a thread you have already spoken in sorts to the top, with its last line
  const said = new Map(threads.map((t) => [t.partnerId, t]));
  const ordered = [...connected].sort(
    (a, b) => Number(said.has(b.id)) - Number(said.has(a.id)),
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="void-selector-modal"
          className="absolute inset-0 z-50 grid place-items-center bg-black/75 px-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex h-[min(30rem,80vh)] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-black/90 shadow-2xl"
            initial={{ scale: 0.94, y: 20, filter: "blur(12px)" }}
            animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 170, damping: 21 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ---------- left: everyone you can reach ---------- */}
            <aside className="flex w-56 shrink-0 flex-col border-r border-white/[0.07] bg-white/[0.015] md:w-64">
              <div className="px-4 pt-4 pb-3">
                <p className="text-[0.48rem] tracking-[0.3em] text-mist/35 uppercase">
                  Private dimensions
                </p>
                <h3 className="font-display text-xl text-white">The Void</h3>
              </div>

              <div className="flex gap-1 px-3 pb-2">
                <Tab active={tab === "souls"} onClick={() => setTab("souls")} count={ordered.length}>
                  Souls
                </Tab>
                <Tab active={tab === "sent"} onClick={() => setTab("sent")} count={sent.length}>
                  Sent
                </Tab>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
                {tab === "souls" &&
                  (ordered.length === 0 ? (
                    <Empty>
                      No soul has agreed to be kept yet. Send a request from any message, and
                      they will appear here once they answer.
                    </Empty>
                  ) : (
                    ordered.map((s) => {
                      const c = colorOf(s.color);
                      const t = said.get(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => onEnterVoid(s)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]"
                        >
                          <Avatar soul={look(s)} size={32} />
                          <span className="min-w-0 flex-1">
                            <span
                              className="block truncate text-[0.8rem]"
                              style={{ color: c.glow }}
                            >
                              {s.name}
                            </span>
                            <span className="block truncate text-[0.6rem] text-mist/40">
                              {t ? t.lastMessage : "no whispers yet"}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ))}

                {tab === "sent" &&
                  (sent.length === 0 ? (
                    <Empty>You have not asked to keep anybody.</Empty>
                  ) : (
                    sent.map((s) => {
                      const c = colorOf(s.color);
                      const refused = s.status === "rejected";
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2"
                          style={{ opacity: refused ? 0.55 : 1 }}
                        >
                          <Avatar soul={look(s)} size={32} />
                          <span className="min-w-0 flex-1">
                            <span
                              className="block truncate text-[0.8rem]"
                              style={{ color: refused ? "#8b93a6" : c.glow }}
                            >
                              {s.name}
                            </span>
                            <span
                              className={`block text-[0.5rem] tracking-[0.2em] uppercase ${
                                refused ? "text-red-300/55" : "text-amber-200/50"
                              }`}
                            >
                              {refused ? "does not wish to be disturbed" : "waiting for an answer"}
                            </span>
                          </span>
                          {/* a refusal is theirs to clear, not yours */}
                          <button
                            onClick={() => onWithdraw(s.id)}
                            disabled={refused}
                            aria-label={`Withdraw the request to ${s.name}`}
                            title={refused ? "Only they can undo this" : "Withdraw the request"}
                            className="shrink-0 text-mist/20 transition-colors enabled:hover:text-mist/60 disabled:cursor-not-allowed disabled:opacity-25"
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
                        </div>
                      );
                    })
                  ))}
              </div>
            </aside>

            {/* ---------- right: what this place is ---------- */}
            <section className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
              <motion.div
                className="grid h-16 w-16 place-items-center rounded-full border border-white/12"
                animate={{ boxShadow: ["0 0 24px #ffffff18", "0 0 44px #ffffff2e", "0 0 24px #ffffff18"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="h-7 w-7 rounded-full bg-black shadow-[0_0_0_1px_#ffffff33]" />
              </motion.div>

              <h4 className="mt-5 font-display text-2xl text-white">
                {ordered.length === 0 ? "Nobody yet" : "Choose a soul"}
              </h4>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-mist/55">
                {ordered.length === 0
                  ? "A pocket dimension only opens between two souls who both agreed to it. Keep someone, and wait for them to answer."
                  : "Each conversation is its own pocket dimension. Only the two of you can read what is said there."}
              </p>

              <button
                onClick={onClose}
                className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full text-mist/35 transition-colors hover:bg-white/8 hover:text-white"
                aria-label="Close"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tab({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[0.52rem] tracking-[0.22em] uppercase transition-colors ${
        active ? "bg-white/10 text-white" : "text-mist/40 hover:text-mist/70"
      }`}
    >
      {children}
      {count > 0 && <span className="text-[0.5rem] text-mist/40">{count}</span>}
    </button>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="px-3 py-6 text-center text-[0.66rem] leading-relaxed text-mist/30 italic">
    {children}
  </p>
);
