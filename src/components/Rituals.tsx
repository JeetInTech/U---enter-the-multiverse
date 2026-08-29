"use client";

// Each region is a different dimension, so each one behaves differently.
// Ambience is what the room does on its own; Rituals are what souls do to it.

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { colorOf, type Region } from "@/lib/soul";
import type { Ritual } from "@/lib/db";

export type Ev = { id: string; r: Ritual };

const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/* ============================ ambience ============================ */

export function Ambience({ region, present }: { region: Region; present: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  switch (region.id) {
    case "luminous":
      return <Pollen region={region} />;
    case "echo":
      return <Rain region={region} />;
    case "neon":
      return <Grid region={region} />;
    case "crystal":
      return <BreathRing region={region} present={present} />;
    case "forge":
      return <Embers region={region} />;
    case "void":
      return <Threads region={region} />;
    default:
      return null;
  }
}

/** Golden motes drifting up through the fields. */
function Pollen({ region }: { region: Region }) {
  const motes = useMemo(() => Array.from({ length: 26 }, (_, i) => i), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {motes.map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${rand(i) * 100}%`,
            width: 2 + rand(i + 7) * 4,
            height: 2 + rand(i + 7) * 4,
            background: region.glow,
            boxShadow: `0 0 12px ${region.hex}`,
            opacity: 0.35,
          }}
          initial={{ y: "105vh" }}
          animate={{ y: "-10vh", x: [0, 30 * (rand(i + 3) - 0.5), 0] }}
          transition={{
            duration: 22 + rand(i + 11) * 26,
            repeat: Infinity,
            delay: -rand(i + 5) * 40,
            ease: "linear",
            x: { duration: 9, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      ))}
    </div>
  );
}

/** Rain on a far window — it never quite reaches you. */
function Rain({ region }: { region: Region }) {
  const drops = useMemo(() => Array.from({ length: 40 }, (_, i) => i), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
      {drops.map((i) => (
        <motion.span
          key={i}
          className="absolute w-px"
          style={{
            left: `${rand(i) * 100}%`,
            height: 30 + rand(i + 2) * 70,
            background: `linear-gradient(to bottom, transparent, ${region.glow}66)`,
          }}
          initial={{ y: "-20vh" }}
          animate={{ y: "120vh" }}
          transition={{
            duration: 1.6 + rand(i + 4) * 2.4,
            repeat: Infinity,
            delay: -rand(i + 6) * 4,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

/** A floor that will not stop moving. */
function Grid({ region }: { region: Region }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-x-0 bottom-0 h-2/3 opacity-25"
        style={{
          backgroundImage: `linear-gradient(${region.hex}55 1px, transparent 1px), linear-gradient(90deg, ${region.hex}55 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          transform: "perspective(340px) rotateX(62deg)",
          transformOrigin: "bottom",
          maskImage: "linear-gradient(to top, black, transparent)",
        }}
        animate={{ backgroundPositionY: ["0px", "60px"] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: `radial-gradient(60% 40% at 50% 100%, ${region.hex}33, transparent 70%)` }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/** Everyone in the gardens breathes on the same four-count. */
function BreathRing({ region, present }: { region: Region; present: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
      <motion.div
        className="rounded-full border"
        style={{ borderColor: `${region.hex}33`, width: 360, height: 360 }}
        animate={{ scale: [1, 1.35, 1.35, 1], opacity: [0.25, 0.6, 0.6, 0.25] }}
        transition={{ duration: 11, times: [0, 0.36, 0.64, 1], repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.p
        className="absolute text-[0.58rem] uppercase tracking-[0.5em] text-mist/25"
        animate={{ opacity: [0.2, 0.6, 0.6, 0.2] }}
        transition={{ duration: 11, times: [0, 0.36, 0.64, 1], repeat: Infinity }}
      >
        {present > 1 ? `${present} breathing together` : "breathe"}
      </motion.p>
    </div>
  );
}

/** Something is always being made here, and it throws sparks. */
function Embers({ region }: { region: Region }) {
  const sparks = useMemo(() => Array.from({ length: 22 }, (_, i) => i), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {sparks.map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${10 + rand(i) * 80}%`,
            width: 3,
            height: 3,
            background: region.glow,
            boxShadow: `0 0 10px 2px ${region.hex}`,
          }}
          initial={{ y: "100vh", opacity: 0 }}
          animate={{
            y: "20vh",
            opacity: [0, 1, 0],
            x: [0, 40 * (rand(i + 8) - 0.5)],
          }}
          transition={{
            duration: 5 + rand(i + 12) * 6,
            repeat: Infinity,
            delay: -rand(i + 2) * 8,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

/** Silver threads, drawn between things that were never connected. */
function Threads({ region }: { region: Region }) {
  const lines = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-30">
      {lines.map((i) => (
        <motion.line
          key={i}
          x1={`${rand(i) * 100}%`}
          y1={`${rand(i + 1) * 100}%`}
          x2={`${rand(i + 2) * 100}%`}
          y2={`${rand(i + 3) * 100}%`}
          stroke={region.glow}
          strokeWidth={0.5}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.7, 0.7, 0] }}
          transition={{ duration: 14, repeat: Infinity, delay: i * 1.7, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}

/* ============================ rituals ============================ */

export function Rituals({ events }: { events: Ev[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <AnimatePresence>
        {events.map((e) => {
          switch (e.r.kind) {
            case "lantern":
              return <Lantern key={e.id} ev={e.r} />;
            case "whisper":
              return <Whisper key={e.id} ev={e.r} />;
            case "burst":
              return <Burst key={e.id} ev={e.r} />;
            case "chime":
              return <Chime key={e.id} ev={e.r} />;
            case "thread":
              return <Dissolve key={e.id} ev={e.r} />;
            default:
              return null;
          }
        })}
      </AnimatePresence>
    </div>
  );
}

function Lantern({ ev }: { ev: Extract<Ritual, { kind: "lantern" }> }) {
  const c = colorOf(ev.color);
  return (
    <motion.div
      className="absolute bottom-0 flex flex-col items-center"
      style={{ left: `${ev.x}%` }}
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: "-105vh", opacity: [0, 1, 1, 0.7], x: [0, 26, -18, 10] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 15, ease: "linear", x: { duration: 15, ease: "easeInOut" } }}
    >
      <span
        className="h-5 w-4 rounded-[45%]"
        style={{ background: c.glow, boxShadow: `0 0 26px 8px ${c.hex}aa` }}
      />
      {ev.wish && (
        <span className="mt-2 max-w-[12rem] text-center text-[0.6rem] tracking-widest text-white/50">
          {ev.wish}
        </span>
      )}
    </motion.div>
  );
}

function Whisper({ ev }: { ev: Extract<Ritual, { kind: "whisper" }> }) {
  const c = colorOf(ev.color);
  return (
    <motion.p
      className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center font-display text-3xl leading-snug md:text-5xl"
      style={{ color: c.glow }}
      initial={{ opacity: 0, filter: "blur(18px)", scale: 0.96 }}
      animate={{ opacity: [0, 0.9, 0.9, 0], filter: "blur(0px)", scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 9, times: [0, 0.15, 0.7, 1] }}
    >
      {ev.text}
    </motion.p>
  );
}

function Burst({ ev }: { ev: Extract<Ritual, { kind: "burst" }> }) {
  const c = colorOf(ev.color);
  const shards = Array.from({ length: 18 }, (_, i) => (i / 18) * Math.PI * 2);
  return (
    <>
      <motion.div
        className="absolute inset-0"
        style={{ background: c.hex }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.35, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.7 }}
      />
      <div className="absolute inset-0 grid place-items-center">
        {shards.map((a, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full"
            style={{ background: c.glow, boxShadow: `0 0 16px 4px ${c.hex}` }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: Math.cos(a) * 420, y: Math.sin(a) * 420, opacity: 0, scale: 2.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        ))}
      </div>
    </>
  );
}

function Chime({ ev }: { ev: Extract<Ritual, { kind: "chime" }> }) {
  const c = colorOf(ev.color);
  return (
    <div className="absolute inset-0 grid place-items-center">
      {[0, 0.25, 0.5].map((d) => (
        <motion.span
          key={d}
          className="absolute rounded-full border"
          style={{ borderColor: c.glow, width: 120, height: 120 }}
          initial={{ scale: 0.4, opacity: 0.8 }}
          animate={{ scale: 7, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 3.4, delay: d, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function Dissolve({ ev }: { ev: Extract<Ritual, { kind: "thread" }> }) {
  const c = colorOf(ev.color);
  const letters = ev.text.slice(0, 40).split("");
  return (
    <div className="absolute inset-x-0 top-1/3 flex flex-wrap justify-center gap-x-1">
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          className="font-display text-2xl md:text-4xl"
          style={{ color: c.glow }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            y: -120 - rand(i) * 160,
            x: (rand(i + 4) - 0.5) * 160,
            filter: "blur(6px)",
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 5, delay: i * 0.04, ease: "easeOut" }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </div>
  );
}

/* ---------- the shared line in The Forge ---------- */

export function ForgeLine({ events, region }: { events: Ev[]; region: Region }) {
  const words = events.filter((e) => e.r.kind === "word") as (Ev & {
    r: Extract<Ritual, { kind: "word" }>;
  })[];
  if (!words.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-28 z-20 px-6 md:top-32">
      <p className="mx-auto max-w-3xl text-center font-display text-2xl leading-relaxed md:text-3xl">
        <AnimatePresence>
          {words.slice(-14).map((w) => (
            <motion.span
              key={w.id}
              className="mr-2 inline-block"
              style={{ color: colorOf(w.r.color).glow }}
              initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}
              title={w.r.soul}
            >
              {w.r.word}
            </motion.span>
          ))}
        </AnimatePresence>
      </p>
      <p className="mt-3 text-center text-[0.55rem] uppercase tracking-[0.4em] text-mist/25">
        one word each · {region.name.toLowerCase()} is writing something
      </p>
    </div>
  );
}

/* ---------- the button each region gives you ---------- */

export const RITUAL_LABEL: Record<string, string> = {
  luminous: "release a lantern",
  echo: "whisper it",
  neon: "pulse",
  crystal: "strike a crystal",
  forge: "add a word",
  void: "send into the dark",
};

export function useRitualEvents(ttl = 16000) {
  const [events, setEvents] = useState<Ev[]>([]);
  const push = (r: Ritual) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setEvents((e) => [...e.slice(-30), { id, r }]);
    setTimeout(() => setEvents((e) => e.filter((x) => x.id !== id)), ttl);
  };
  useEffect(() => () => setEvents([]), []);
  return [events, push] as const;
}
