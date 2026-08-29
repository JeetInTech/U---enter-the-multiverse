"use client";

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export default function Landing({
  onEnter,
  onStepIn,
}: {
  onEnter: () => void;
  onStepIn: () => void;
}) {
  const [stepping, setStepping] = useState(false);
  const reduce = useReducedMotion();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const tiltX = useTransform(sy, [-1, 1], [8, -8]);
  const tiltY = useTransform(sx, [-1, 1], [-10, 10]);
  const driftX = useTransform(sx, [-1, 1], [-18, 18]);
  const driftY = useTransform(sy, [-1, 1], [-12, 12]);

  useEffect(() => {
    const on = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 2);
      my.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", on);
    return () => window.removeEventListener("pointermove", on);
  }, [mx, my]);

  const step = () => {
    if (stepping) return;
    setStepping(true);
    onStepIn();
    setTimeout(onEnter, reduce ? 200 : 1250);
  };

  return (
    <motion.div
      className="relative flex h-full w-full flex-col items-center justify-center"
      exit={{ opacity: 0, filter: "blur(14px)" }}
      transition={{ duration: 0.7 }}
    >
      <motion.div
        className="flex flex-col items-center [transform-style:preserve-3d]"
        style={{ rotateX: tiltX, rotateY: tiltY, x: driftX, y: driftY, perspective: 900 }}
        animate={stepping ? { scale: 1.8, opacity: 0, filter: "blur(18px)" } : {}}
        transition={{ duration: 1.25, ease: [0.7, 0, 0.3, 1] }}
      >
        {/* the word */}
        <motion.h1
          className="relative select-none font-display leading-none"
          style={{ fontSize: "clamp(4.5rem, min(24vw, 30vh), 20rem)" }}
          initial={{ opacity: 0, y: 40, filter: "blur(24px)", letterSpacing: "0.4em" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "0em" }}
          transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            className="breathe bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(180deg, #ffffff 0%, #cdd8f5 45%, #6d7ba3 100%)",
              filter: "drop-shadow(0 0 60px rgba(180,200,255,0.35))",
            }}
          >
            U
          </span>
        </motion.h1>

        <motion.p
          className="mt-2 text-[0.68rem] uppercase tracking-[0.55em] text-mist/70"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 1.6 }}
        >
          Enter the multiverse
        </motion.p>
      </motion.div>

      {/* you don't click a button — you step in */}
      <motion.button
        onClick={step}
        className="group relative mt-[clamp(1.5rem,7vh,4rem)] cursor-pointer rounded-full px-10 py-4 text-sm tracking-[0.3em] text-white/85 uppercase"
        initial={{ opacity: 0, y: 24 }}
        animate={stepping ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
        transition={{ delay: stepping ? 0 : 2.2, duration: stepping ? 0.4 : 1.4 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="absolute inset-0 rounded-full border border-white/15 transition-colors duration-500 group-hover:border-white/45" />
        <span className="absolute inset-0 rounded-full opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100 bg-white/10" />
        {/* a ring that keeps leaving, like something is always arriving */}
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full border border-white/25"
          animate={reduce ? {} : { scale: [1, 1.45], opacity: [0.5, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
        />
        <span className="relative">Step in</span>
      </motion.button>

      <motion.p
        className="absolute bottom-8 text-center text-[0.62rem] tracking-[0.35em] text-mist/35 uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: stepping ? 0 : 1 }}
        transition={{ delay: 3, duration: 2 }}
      >
        You don&apos;t join U. You arrive.
      </motion.p>

      {/* the door opening */}
      {stepping && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(190,210,255,0.5) 30%, transparent 62%)",
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 3.2, 0.1], opacity: [0, 0.9, 0] }}
          transition={{ duration: 1.25, times: [0, 0.55, 1], ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
}
