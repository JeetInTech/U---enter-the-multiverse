"use client";

import { motion } from "motion/react";
import type { Region } from "@/lib/soul";

/**
 * The Sisterhood asks one question at its door. Nothing checks the answer — this
 * world has no identity to check against — so it is a threshold people choose to
 * cross, and the room is built on that being enough.
 */
export default function Door({
  region,
  onAnswer,
  onLeave,
}: {
  region: Region;
  onAnswer: (declared: "woman" | "man" | "neither") => void;
  onLeave: () => void;
}) {
  return (
    <motion.div
      className="absolute inset-0 z-50 grid place-items-center bg-black/80 px-6 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md text-center"
        initial={{ y: 26, filter: "blur(14px)", opacity: 0 }}
        animate={{ y: 0, filter: "blur(0px)", opacity: 1 }}
        transition={{ type: "spring", stiffness: 130, damping: 20 }}
      >
        <motion.div
          className="mx-auto h-24 w-24 rounded-full"
          style={{
            background: `radial-gradient(circle at 34% 30%, ${region.glow}, ${region.hex} 55%, ${region.bg})`,
            boxShadow: `0 0 60px 10px ${region.hex}55`,
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <h3 className="mt-8 font-display text-4xl" style={{ color: region.glow }}>
          {region.name}
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-mist/60">
          This moon is for women. There is no name here to check and nothing to prove — only the
          question, and whatever you answer.
        </p>

        <div className="mt-9 space-y-2.5">
          <motion.button
            onClick={() => onAnswer("woman")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-full py-3.5 text-[0.6rem] tracking-[0.32em] text-black uppercase"
            style={{ background: region.glow }}
          >
            I am a woman — let me in
          </motion.button>
          <button
            onClick={() => onAnswer("neither")}
            className="w-full rounded-full border border-white/12 py-3 text-[0.58rem] tracking-[0.3em] text-mist/55 uppercase transition-colors hover:border-white/30 hover:text-white"
          >
            Neither, and I will wait outside
          </button>
          <button
            onClick={onLeave}
            className="w-full py-2 text-[0.55rem] tracking-[0.3em] text-mist/35 uppercase transition-colors hover:text-mist/70"
          >
            Go back to the map
          </button>
        </div>

        <p className="mt-8 text-[0.5rem] leading-relaxed tracking-[0.25em] text-mist/25 uppercase">
          your answer is kept on your soul · it is not shown to anyone
        </p>
      </motion.div>
    </motion.div>
  );
}
