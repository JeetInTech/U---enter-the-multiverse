"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { ReportReason } from "@/lib/safety";

/**
 * Three-dot context menu attached to a message bubble.
 * Shown only on messages that are not the current soul's own.
 * Block hides the soul everywhere; Report files a reason to the reports table.
 */
export default function MessageMenu({
  soulName,
  isKept = false,
  onKeep,
  onRelease,
  onEnterVoid,
  onBlock,
  onReport,
}: {
  soulName: string;
  isKept?: boolean;
  onKeep?: () => void;
  onRelease?: () => void;
  onEnterVoid?: () => void;
  onBlock: () => void;
  onReport: (reason: ReportReason) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [done, setDone] = useState(false);

  const close = () => {
    setOpen(false);
    setTimeout(() => setReporting(false), 200);
  };

  const handleBlock = () => {
    onBlock();
    close();
  };

  const handleReport = (reason: ReportReason) => {
    onReport(reason);
    setDone(true);
    setTimeout(() => {
      setDone(false);
      close();
    }, 1200);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="grid h-6 w-6 place-items-center rounded-full text-mist/30 transition-colors hover:bg-white/10 hover:text-white"
        aria-label={`Options for message by ${soulName}`}
        whileTap={{ scale: 0.88 }}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
          <circle cx="5"  cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <div key="message-menu-container">
            {/* close-on-outside-click backdrop */}
            <div className="fixed inset-0 z-40" onClick={close} />

            <motion.div
              key="message-menu-popover"
              className="absolute left-0 top-6 z-50 min-w-[11.5rem] overflow-hidden rounded-2xl border border-white/10 bg-black/85 backdrop-blur-xl"
              initial={{ opacity: 0, scale: 0.9, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              {done ? (
                <p className="px-4 py-3 text-center text-[0.58rem] tracking-[0.32em] text-mist/55 uppercase">
                  reported
                </p>
              ) : reporting ? (
                <div className="p-2">
                  <p className="px-2.5 pb-1 pt-1.5 text-[0.55rem] tracking-[0.24em] text-mist/40 uppercase">
                    Reason for report
                  </p>
                  {(["spam", "harassment", "inappropriate", "other"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleReport(r as ReportReason)}
                      className="w-full rounded-xl px-3 py-2 text-left text-[0.62rem] tracking-[0.22em] text-mist/75 uppercase transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      {r}
                    </button>
                  ))}
                  <button
                    onClick={() => setReporting(false)}
                    className="mt-1 w-full rounded-xl px-3 py-1.5 text-left text-[0.55rem] tracking-[0.22em] text-mist/35 uppercase hover:text-mist/70"
                  >
                    ← Back
                  </button>
                </div>
              ) : (
                <div className="p-1.5">
                  {onEnterVoid && (
                    <button
                      onClick={() => {
                        onEnterVoid();
                        close();
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-[0.6rem] tracking-[0.22em] text-white/90 uppercase transition-colors hover:bg-white/[0.09] hover:text-white"
                    >
                      ✦ Whisper in The Void
                    </button>
                  )}
                  {(onKeep || onRelease) && (
                    <button
                      onClick={() => {
                        if (isKept) onRelease?.();
                        else onKeep?.();
                        close();
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-[0.6rem] tracking-[0.22em] text-mist/65 uppercase transition-colors hover:bg-white/[0.07] hover:text-white"
                    >
                      {isKept ? "Release from constellation" : "Keep this soul"}
                    </button>
                  )}
                  <button
                    onClick={() => setReporting(true)}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-[0.6rem] tracking-[0.22em] text-mist/65 uppercase transition-colors hover:bg-white/[0.07] hover:text-white"
                  >
                    Report message
                  </button>
                  <button
                    onClick={handleBlock}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-[0.6rem] tracking-[0.22em] text-red-300/65 uppercase transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    Block {soulName}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
