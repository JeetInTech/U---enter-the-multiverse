"use client";

// Not a list of rooms — a sky with worlds in it. Each one drifts, breathes, and
// carries the souls currently standing inside it around its own orbit.

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import Planet from "@/components/Planet";
import type { Stats } from "@/lib/db";
import { REGIONS, VOID_AT, type Region } from "@/lib/soul";

// where each world hangs in the sky, as a percentage of the field
const PLACE: Record<string, { x: number; y: number; size: number }> = {
  echo: { x: 50, y: 23, size: 0.8 },
  neon: { x: 79, y: 34, size: 0.94 },
  darkroom: { x: 85, y: 62, size: 0.84 }, // the rings need room
  forge: { x: 65, y: 80, size: 0.86 },
  crystal: { x: 34, y: 80, size: 0.82 },
  sisterhood: { x: 14, y: 62, size: 0.68 },
  luminous: { x: 21, y: 34, size: 0.9 },
  void: { x: 50, y: 52, size: 1 },
};

const WEB: [string, string][] = [
  ["luminous", "echo"],
  ["echo", "neon"],
  ["neon", "darkroom"],
  ["darkroom", "forge"],
  ["forge", "crystal"],
  ["crystal", "sisterhood"],
  ["sisterhood", "luminous"],
];

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
  // you can always see the hole at the centre; going into it is another matter
  const visible = REGIONS;
  const [focus, setFocus] = useState<string | null>(null);
  const reduce = useReducedMotion();

  // the whole sky leans with the pointer
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 18 });
  const sy = useSpring(my, { stiffness: 40, damping: 18 });
  const leanX = useTransform(sx, [-1, 1], [26, -26]);
  const leanY = useTransform(sy, [-1, 1], [18, -18]);
  const tiltX = useTransform(sy, [-1, 1], [5, -5]);
  const tiltY = useTransform(sx, [-1, 1], [-6, 6]);

  useEffect(() => {
    const on = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 2);
      my.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", on);
    return () => window.removeEventListener("pointermove", on);
  }, [mx, my]);

  const active = visible.find((r) => r.id === focus);

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(14px)", scale: 1.04 }}
      transition={{ duration: 0.8 }}
    >
      <motion.header
        className="pointer-events-none absolute inset-x-0 top-8 z-30 text-center md:top-10"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.2 }}
      >
        <h2 className="font-display text-3xl md:text-5xl">The Multiverse</h2>
        <p className="mt-2 text-[0.55rem] uppercase tracking-[0.45em] text-mist/35 md:text-[0.62rem]">
          {voidOpen
            ? "eight worlds, and the one at the centre finally opened"
            : "seven worlds, and something at the centre you have not earned"}
        </p>
      </motion.header>

      {/* ---- the field ---- */}
      <motion.div
        className="absolute inset-0 [transform-style:preserve-3d]"
        style={{ x: leanX, y: leanY, rotateX: tiltX, rotateY: tiltY, perspective: 1200 }}
      >
        {/* threads between the worlds */}
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          {WEB.map(([a, b], i) => (
            <motion.line
              key={`${a}-${b}`}
              x1={`${PLACE[a].x}%`}
              y1={`${PLACE[a].y}%`}
              x2={`${PLACE[b].x}%`}
              y2={`${PLACE[b].y}%`}
              stroke="#8ea2c8"
              strokeWidth={0.6}
              initial={{ opacity: 0 }}
              animate={{ opacity: focus ? 0.06 : [0.1, 0.28, 0.1] }}
              transition={{ duration: 7, repeat: Infinity, delay: i * 0.8 }}
            />
          ))}
          {voidOpen &&
            WEB.map(([a], i) => (
              <motion.line
                key={`void-${a}`}
                x1={`${PLACE[a].x}%`}
                y1={`${PLACE[a].y}%`}
                x2="50%"
                y2="51%"
                stroke="#ffffff"
                strokeWidth={0.4}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.22, 0] }}
                transition={{ duration: 5, repeat: Infinity, delay: i * 0.7 }}
              />
            ))}
        </svg>

        {visible.map((r, i) => (
          <World
            key={r.id}
            r={r}
            i={i}
            here={presence[r.id] ?? 0}
            stat={stats[r.id]}
            locked={!!r.hidden && !voidOpen}
            dimmed={!!focus && focus !== r.id}
            reduce={!!reduce}
            onHover={() => setFocus(r.id)}
            onLeave={() => setFocus((f) => (f === r.id ? null : f))}
            onOpen={() => onOpen(r)}
          />
        ))}
      </motion.div>

      {/* ---- what you are looking at ---- */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 px-6 text-center md:bottom-6">
        <motion.div
          key={active?.id ?? "none"}
          initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5 }}
        >
          {active ? (
            <>
              <p className="text-[0.6rem] uppercase tracking-[0.35em]" style={{ color: active.glow }}>
                {active.vibe}
              </p>
              <p className="mx-auto mt-3 max-w-md text-[0.8rem] leading-relaxed text-mist/55">
                {active.blurb}
              </p>
              <p className="mt-3 text-[0.55rem] uppercase tracking-[0.3em] text-mist/30">
                {(presence[active.id] ?? 0) > 0
                  ? `${presence[active.id]} here now`
                  : `${stats[active.id]?.souls ?? 0} souls · ${stats[active.id]?.voices ?? 0} voices`}
                {active.voiceOnly ? " · voices only" : active.voice ? " · voice" : ""}
                {active.photos ? " · photographs" : ""}
                {active.women ? " · women only" : ""}
              </p>
            </>
          ) : (
            <p className="text-[0.58rem] uppercase tracking-[0.35em] text-mist/25">
              {voidOpen
                ? "The Void has opened. It was always here."
                : `${VOID_AT - lore} fragments until something hidden shows itself`}
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function World({
  r,
  i,
  here,
  stat,
  dimmed,
  locked,
  reduce,
  onHover,
  onLeave,
  onOpen,
}: {
  r: Region;
  i: number;
  here: number;
  stat?: { souls: number; voices: number };
  dimmed: boolean;
  locked: boolean;
  reduce: boolean;
  onHover: () => void;
  onLeave: () => void;
  onOpen: () => void;
}) {
  const p = PLACE[r.id];
  const orbit = Array.from({ length: Math.min(here, 8) }, (_, k) => k);
  const busy = (stat?.voices ?? 0) + here;

  return (
    <motion.button
      onPointerEnter={onHover}
      onPointerLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      onClick={onOpen}
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none"
      style={{
        left: `${p.x}%`,
        top: `${p.y}%`,
        width: `calc(clamp(4.5rem, 11vw, 8.5rem) * ${p.size})`,
        height: `calc(clamp(4.5rem, 11vw, 8.5rem) * ${p.size})`,
      }}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{
        opacity: dimmed ? 0.35 : 1,
        scale: 1,
        y: reduce ? 0 : [0, -14, 0, 10, 0],
        x: reduce ? 0 : [0, 8, 0, -8, 0],
      }}
      transition={{
        opacity: { duration: 0.5 },
        scale: { delay: 0.15 + i * 0.12, type: "spring", stiffness: 90, damping: 14 },
        y: { duration: 16 + i * 3, repeat: Infinity, ease: "easeInOut" },
        x: { duration: 21 + i * 2, repeat: Infinity, ease: "easeInOut" },
      }}
      whileHover={{ scale: locked ? 1.04 : 1.14 }}
      whileTap={{ scale: locked ? 1 : 0.95 }}
      aria-label={`${r.name} — ${r.vibe}${locked ? " (sealed)" : ""}`}
      disabled={locked}
    >
      {/* the world's atmosphere, which becomes the room you walk into */}
      <motion.span
        layoutId={`region-${r.id}`}
        className="absolute inset-0 block rounded-full"
        style={{
          background: `radial-gradient(circle at 34% 30%, ${r.glow}, ${r.hex} 45%, ${r.bg} 100%)`,
          boxShadow: `0 0 ${40 + Math.min(busy, 30) * 2}px ${Math.min(busy, 20)}px ${r.hex}55`,
          opacity: r.world === "blackhole" ? 0 : 1,
        }}
        transition={{ type: "spring", stiffness: 120, damping: 24 }}
      />

      {/* the body itself: bands, weather, rings, moons */}
      <Planet region={r} reduce={reduce} />
      <motion.span
        layoutId={`bloom-${r.id}`}
        className="pointer-events-none absolute -inset-6 block rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${r.hex}66, transparent 70%)` }}
        animate={{ opacity: reduce ? 0.5 : [0.4, 0.85, 0.4] }}
        transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* souls currently inside, orbiting it */}
      {orbit.map((k) => (
        <motion.span
          key={k}
          className="absolute top-1/2 left-1/2 block h-1.5 w-1.5 rounded-full"
          style={{ background: r.glow, boxShadow: `0 0 10px ${r.hex}`, marginLeft: -3, marginTop: -3 }}
          animate={{
            rotate: 360,
            x: Math.cos((k / Math.max(orbit.length, 1)) * Math.PI * 2) * 62,
            y: Math.sin((k / Math.max(orbit.length, 1)) * Math.PI * 2) * 62,
          }}
          transition={{
            rotate: { duration: 9 + k, repeat: Infinity, ease: "linear" },
            default: { duration: 1.2, type: "spring" },
          }}
        />
      ))}

      <motion.span
        layoutId={`name-${r.id}`}
        className="absolute top-full left-1/2 mt-5 block -translate-x-1/2 font-display text-sm whitespace-nowrap md:mt-6 md:text-lg"
        style={{ color: r.glow, opacity: locked ? 0.5 : 1 }}
      >
        {r.name}
      </motion.span>
      {r.women && (
        <span className="absolute top-full left-1/2 mt-11 block -translate-x-1/2 text-[0.42rem] tracking-[0.28em] whitespace-nowrap text-mist/40 uppercase md:mt-13">
          women only
        </span>
      )}

      {here > 0 && (
        <motion.span
          className="absolute top-full left-1/2 mt-10 block -translate-x-1/2 text-[0.5rem] uppercase tracking-[0.28em] whitespace-nowrap md:mt-11"
          style={{ color: r.glow }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          {here} here now
        </motion.span>
      )}
    </motion.button>
  );
}
