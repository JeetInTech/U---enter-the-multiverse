"use client";

import { AnimatePresence, motion } from "motion/react";
import Avatar from "@/components/Avatar";
import type { Speaker } from "@/lib/voice";
import { colorOf, type Region } from "@/lib/soul";

export default function VoiceBar({
  region,
  joined,
  connecting,
  micOn,
  speakers,
  error,
  onJoin,
  onLeave,
  onToggleMic,
  big = false,
}: {
  region: Region;
  joined: boolean;
  connecting: boolean;
  micOn: boolean;
  speakers: Speaker[];
  error: string | null;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMic: () => void;
  big?: boolean;
}) {
  return (
    <div className={`relative z-10 flex flex-col items-center ${big ? "gap-8" : "gap-3"}`}>
      {/* who is in the call */}
      <AnimatePresence>
        {joined && (
          <motion.div
            key="speakers-list"
            className={`flex flex-wrap justify-center ${big ? "gap-8" : "gap-4"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {speakers.map((s) => (
              <Talking key={s.id} s={s} big={big} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        {!joined ? (
          <motion.button
            onClick={onJoin}
            disabled={connecting}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={`flex items-center gap-2 rounded-full border px-5 py-2.5 uppercase disabled:opacity-40 ${
              big ? "text-[0.7rem] tracking-[0.35em]" : "text-[0.56rem] tracking-[0.3em]"
            }`}
            style={{ borderColor: `${region.hex}66`, color: region.glow }}
          >
            <Mic on />
            {connecting ? "opening the line" : big ? "join the voices" : "join voice"}
          </motion.button>
        ) : (
          <>
            <motion.button
              onClick={onToggleMic}
              whileTap={{ scale: 0.92 }}
              className="grid h-10 w-10 place-items-center rounded-full border transition-colors"
              style={{
                borderColor: micOn ? `${region.hex}66` : "#ff5c5c66",
                color: micOn ? region.glow : "#ff8a8a",
              }}
              aria-label={micOn ? "Mute yourself" : "Unmute yourself"}
            >
              <Mic on={micOn} />
            </motion.button>
            <motion.button
              onClick={onLeave}
              whileTap={{ scale: 0.94 }}
              className="rounded-full border border-red-400/30 px-4 py-2.5 text-[0.55rem] tracking-[0.28em] text-red-300/80 uppercase transition-colors hover:border-red-400/70 hover:text-red-300"
            >
              Leave voice
            </motion.button>
          </>
        )}
      </div>

      {error && (
        <p className="max-w-xs text-center text-[0.55rem] leading-relaxed tracking-[0.25em] text-red-300/70 uppercase">
          {error}
        </p>
      )}

      {joined && speakers.length < 2 && (
        <p className="text-[0.5rem] tracking-[0.3em] text-mist/30 uppercase">
          you are the only voice here
        </p>
      )}
    </div>
  );
}

/** One voice in the room. The ring is live: it grows while they are talking. */
function Talking({ s, big }: { s: Speaker; big: boolean }) {
  const c = colorOf(s.color);
  const size = big ? 84 : 40;
  return (
    <motion.div
      className="relative flex flex-col items-center gap-2"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
    >
      <motion.div
        className="relative grid place-items-center rounded-full"
        style={{ padding: big ? 8 : 4 }}
        animate={{
          boxShadow: s.speaking
            ? `0 0 0 2px ${c.hex}, 0 0 26px 6px ${c.hex}88`
            : `0 0 0 1px #ffffff14`,
          scale: s.speaking ? 1.06 : 1,
        }}
        transition={{ duration: 0.16 }}
      >
        <Avatar soul={{ shape: s.shape, color: s.color, aura: "glow" }} size={size} />
        {s.speaking && (
          <motion.span
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: c.glow }}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.45, opacity: 0 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </motion.div>
      <span
        className={`tracking-[0.2em] uppercase ${big ? "text-[0.6rem]" : "text-[0.5rem]"}`}
        style={{ color: s.speaking ? c.glow : "#7c869c" }}
      >
        {s.name}
        {s.me ? " · you" : ""}
      </span>
      {/* say plainly whether the line is actually open */}
      {!s.me && s.state !== "connected" && (
        <span
          className="text-[0.42rem] tracking-[0.2em] uppercase"
          style={{ color: s.state === "failed" ? "#ff8a8a" : "#6b7590" }}
        >
          {s.state === "failed" ? "could not connect" : "connecting"}
        </span>
      )}
    </motion.div>
  );
}

function Mic({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
      {!on && <path d="M4 4l16 16" strokeLinecap="round" />}
    </svg>
  );
}
