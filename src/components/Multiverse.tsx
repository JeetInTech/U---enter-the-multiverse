"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import type { Stats } from "@/lib/db";
import { REGIONS, VOID_AT, type Region } from "@/lib/soul";

export default function Multiverse({
  lore,
  stats,
  presence,
  onOpen,
}: {
  lore: number;
  stats: Stats;
  presence: Record<string, number>;
  onOpen: (r: Region) => void;
}) {
  const voidOpen = lore >= VOID_AT;
  const visible = REGIONS.filter((r) => !r.hidden || voidOpen);

  return (
    <motion.div
      className="relative h-full w-full overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(12px)", scale: 1.03 }}
      transition={{ duration: 0.7 }}
    >
      {/* min-h-full + justify-center: centred when it fits, scrollable when it doesn't */}
      <div className="flex min-h-full w-full flex-col items-center justify-center px-6 py-12 md:px-14">
        <motion.header
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.15 }}
        >
          <h2 className="font-display text-5xl md:text-6xl">The Multiverse</h2>
          <p className="mt-3 text-xs uppercase tracking-[0.4em] text-mist/45">
            Six regions. Every one a different dimension.
          </p>
        </motion.header>

        <div className="grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r, i) => (
            <Card
            key={r.id}
            r={r}
            i={i}
            stat={stats[r.id]}
            here={presence[r.id] ?? 0}
            onOpen={() => onOpen(r)}
          />
          ))}
        </div>

        <motion.p
          className="mt-8 text-center text-[0.68rem] tracking-[0.3em] text-mist/30 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 1.2 }}
        >
          {voidOpen
            ? "The Void has opened. It was always here."
            : `${VOID_AT - lore} fragments until something hidden shows itself`}
        </motion.p>
      </div>
    </motion.div>
  );
}

function Card({
  r,
  i,
  stat,
  here,
  onOpen,
}: {
  r: Region;
  i: number;
  stat?: { souls: number; voices: number };
  here: number;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 160, damping: 18 });
  const sy = useSpring(py, { stiffness: 160, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-11, 11]);
  const rotateX = useTransform(sy, [0, 1], [9, -9]);
  const shineX = useTransform(sx, [0, 1], ["0%", "100%"]);
  const shineY = useTransform(sy, [0, 1], ["0%", "100%"]);
  const shine = useMotionTemplate`radial-gradient(280px circle at ${shineX} ${shineY}, ${r.glow}22, transparent 65%)`;

  const track = (e: React.PointerEvent) => {
    const b = ref.current!.getBoundingClientRect();
    px.set((e.clientX - b.left) / b.width);
    py.set((e.clientY - b.top) / b.height);
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.button
      ref={ref}
      onPointerMove={track}
      onPointerLeave={reset}
      onClick={onOpen}
      layoutId={`region-${r.id}`}
      initial={{ opacity: 0, y: 42, rotateX: -14 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        delay: 0.1 + i * 0.09,
        duration: 0.9,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.985 }}
      className="group relative aspect-[16/10] overflow-hidden rounded-3xl border border-white/10 p-6 text-left [transform-style:preserve-3d]"
      style={{
        rotateX,
        rotateY,
        perspective: 1000,
        background: `linear-gradient(160deg, ${r.bg} 0%, #04040a 100%)`,
      }}
    >
      {/* the region's own light, leaking */}
      <motion.div
        layoutId={`bloom-${r.id}`}
        className="pointer-events-none absolute -inset-10 opacity-60 blur-2xl transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background: `radial-gradient(45% 45% at 70% 15%, ${r.hex}55, transparent 70%), radial-gradient(40% 40% at 15% 90%, ${r.glow}33, transparent 70%)`,
        }}
      />
      {/* cursor shine */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: shine }}
      />

      <div className="relative flex h-full flex-col justify-between [transform:translateZ(30px)]">
        <div className="flex items-start justify-between">
          {/* live heads if anyone is in there, otherwise who has ever spoken */}
          <span
            className="rounded-full border px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.22em]"
            style={{ borderColor: `${r.hex}55`, color: r.glow }}
          >
            {here > 0 ? `${here} here now` : `${stat?.souls ?? 0} souls`}
          </span>
          <span className="text-[0.58rem] uppercase tracking-[0.22em] text-mist/35">
            {stat?.voices ?? 0} voices
          </span>
        </div>

        <div>
          <motion.h3
            layoutId={`name-${r.id}`}
            className="font-display text-3xl leading-tight"
            style={{ color: r.glow }}
          >
            {r.name}
          </motion.h3>
          <p className="mt-1 text-[0.7rem] uppercase tracking-[0.22em] text-mist/45">
            {r.vibe}
          </p>
          <p className="mt-3 max-h-0 overflow-hidden text-[0.78rem] leading-relaxed text-mist/60 opacity-0 transition-all duration-500 group-hover:max-h-24 group-hover:opacity-100">
            {r.blurb}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
