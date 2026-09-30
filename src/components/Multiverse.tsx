"use client";

// Not a list of rooms — a sky with worlds in it. Each one drifts, breathes, and
// carries the souls currently standing inside it around its own orbit.

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import Planet from "@/components/Planet";
import type { Stats } from "@/lib/db";
import { REGIONS, VOID_AT, getBusiestRegion, regionOf, type Region } from "@/lib/soul";
import { useLiveMoment } from "@/lib/moments";

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

/**
 * True where the primary input cannot hover. Read through an external store so
 * the server and the first client render agree — guessing on the server and
 * correcting afterwards is a hydration mismatch.
 */
function useTouch() {
  return useSyncExternalStore(
    (cb) => {
      const q = window.matchMedia("(hover: none)");
      q.addEventListener("change", cb);
      return () => q.removeEventListener("change", cb);
    },
    () => window.matchMedia("(hover: none)").matches,
    () => false,
  );
}

export default function Multiverse({
  lore,
  stats,
  presence,
  onOpen,
  onOpenVoid,
}: {
  lore: number;
  stats: Stats;
  presence: Record<string, number>;
  onOpen: (r: Region) => void;
  onOpenVoid?: () => void;
}) {
  const voidOpen = true; // The Void is always accessible as a private sanctuary
  // you can always see the hole at the centre; going into it is another matter
  const visible = REGIONS;
  const [focus, setFocus] = useState<string | null>(null);
  // A finger cannot hover. On touch the blurb at the bottom would never be seen
  // at all — the first tap would just open the world — so there a tap previews
  // and a second tap on the same world goes in.
  const touch = useTouch();
  const [momentModal, setMomentModal] = useState(false);
  const moment = useLiveMoment();
  const busiest = getBusiestRegion(presence, stats, lore);
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
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // fast and out of the way: the planet's own morph carries the transition,
      // and a slow fade here just leaves a grey veil sitting over it
      exit={{ opacity: 0, transition: { duration: 0.28, ease: "easeIn" } }}
      transition={{ duration: 0.6 }}
    >
      <motion.header
        className="pointer-events-none absolute inset-x-0 top-8 z-30 flex flex-col items-center px-4 text-center md:top-10"
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

        {/* Live Moment Countdown Pill */}
        <motion.button
          onClick={() => setMomentModal(true)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="pointer-events-auto mt-3.5 inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 backdrop-blur-md transition-colors"
          style={{
            borderColor: moment.active ? `${moment.active.auraGlow}55` : "rgba(255,255,255,0.12)",
            background: moment.active ? `${moment.active.auraHex}25` : "rgba(0,0,0,0.45)",
          }}
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: moment.active ? moment.active.auraGlow : "#8ea2c8",
              boxShadow: moment.active ? `0 0 10px ${moment.active.auraGlow}` : "none",
            }}
            animate={moment.active ? { scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span
            className="text-[0.56rem] uppercase tracking-[0.26em]"
            style={{ color: moment.active ? moment.active.auraGlow : "#a8b0c8" }}
          >
            {moment.displayText}
          </span>
        </motion.button>
      </motion.header>

      {/* ---- the field ---- */}
      <motion.div
        className="absolute inset-0 [transform-style:preserve-3d]"
        style={{ x: leanX, y: leanY, rotateX: tiltX, rotateY: tiltY, perspective: 1200 }}
        // a tap on the empty sky lets go of whatever world was being previewed
        onPointerDown={(e) => {
          if (touch && e.target === e.currentTarget) setFocus(null);
        }}
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
            isBusiest={r.id === busiest.id && ((presence[r.id] ?? 0) > 0 || (stats[r.id]?.voices ?? 0) > 0)}
            locked={!!r.hidden && !voidOpen}
            dimmed={!!focus && focus !== r.id}
            reduce={!!reduce}
            touch={touch}
            previewed={focus === r.id}
            onHover={() => setFocus(r.id)}
            onLeave={() => setFocus((f) => (f === r.id ? null : f))}
            onPreview={() => setFocus(r.id)}
            onOpen={() => (r.id === "void" && onOpenVoid ? onOpenVoid() : onOpen(r))}
          />
        ))}
      </motion.div>

      {/*
        ---- what you are looking at ----
        On a phone this sits in the same corner as the profile pill and lands on
        top of whichever worlds hang low, so it gets cleared past the pill and a
        scrim to read against. On a wide screen there is room and neither applies.
      */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-6 pt-14 pb-[calc(6.5rem+var(--safe-b))] text-center md:bottom-6 md:bg-none md:pt-0 md:pb-0">
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
              {touch && (
                <motion.p
                  className="mt-2.5 text-[0.55rem] uppercase tracking-[0.3em]"
                  style={{ color: active.glow }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.45, 0.9, 0.45] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  tap again to enter
                </motion.p>
              )}
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

      {/* Moment Details Modal */}
      <AnimatePresence>
        {momentModal && (
          <motion.div
            key="moment-details-modal"
            className="absolute inset-0 z-50 grid place-items-center bg-black/75 px-6 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMomentModal(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center"
              initial={{ scale: 0.92, y: 24, filter: "blur(12px)" }}
              animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 160, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const target = moment.active || moment.next;
                const rec = regionOf(target.recommendedRegion);
                return (
                  <>
                    <div
                      className="mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-full border border-white/10"
                      style={{ background: `${target.auraHex}33` }}
                    >
                      <span className="text-xl">✦</span>
                    </div>
                    <span
                      className="text-[0.54rem] uppercase tracking-[0.3em]"
                      style={{ color: target.auraGlow }}
                    >
                      {moment.active ? "Happening Now" : "Scheduled Moment"}
                    </span>
                    <h3 className="mt-1 font-display text-3xl" style={{ color: target.auraGlow }}>
                      {target.name}
                    </h3>
                    <p className="mt-1 text-sm italic text-mist/60">{target.tagline}</p>
                    <p className="mt-4 text-xs leading-relaxed text-mist/75">
                      {target.description}
                    </p>

                    <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 text-left">
                      <p className="text-[0.52rem] uppercase tracking-[0.24em] text-mist/40">
                        Gathering World
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: rec.glow }}>
                          {rec.name}
                        </span>
                        <button
                          onClick={() => {
                            setMomentModal(false);
                            onOpen(rec);
                          }}
                          className="rounded-full border border-white/15 px-3 py-1 text-[0.52rem] uppercase tracking-[0.22em] text-white hover:bg-white/10 transition-colors"
                        >
                          Enter
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setMomentModal(false)}
                      className="mt-6 w-full rounded-full border border-white/10 py-2.5 text-[0.58rem] uppercase tracking-[0.3em] text-mist/50 hover:border-white/25 hover:text-white transition-colors"
                    >
                      Close
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function World({
  r,
  i,
  here,
  stat,
  isBusiest,
  dimmed,
  locked,
  reduce,
  touch,
  previewed,
  onHover,
  onLeave,
  onPreview,
  onOpen,
}: {
  r: Region;
  i: number;
  here: number;
  stat?: { souls: number; voices: number };
  isBusiest: boolean;
  dimmed: boolean;
  locked: boolean;
  reduce: boolean;
  touch: boolean;
  previewed: boolean;
  onHover: () => void;
  onLeave: () => void;
  onPreview: () => void;
  onOpen: () => void;
}) {
  const p = PLACE[r.id];
  const orbit = Array.from({ length: Math.min(here, 8) }, (_, k) => k);
  const busy = (stat?.voices ?? 0) + here;

  // The world drifts forever, and the atmosphere inside it is the shared element
  // that grows into the room. A layout animation measures boxes in viewport space,
  // so a parent still drifting mid-flight drags the morph sideways as it goes.
  // Stop the drift the instant it is tapped, and the growth runs straight.
  const [opening, setOpening] = useState(false);

  return (
    <motion.button
      onPointerEnter={touch ? undefined : onHover}
      onPointerLeave={touch ? undefined : onLeave}
      onFocus={onHover}
      onBlur={touch ? undefined : onLeave}
      onClick={() => {
        // on touch the first tap only shows you what this world is
        if (touch && !previewed) {
          onPreview();
          return;
        }
        setOpening(true);
        onOpen();
      }}
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
        y: reduce || opening ? 0 : [0, -14, 0, 10, 0],
        x: reduce || opening ? 0 : [0, 8, 0, -8, 0],
      }}
      transition={{
        opacity: { duration: 0.5 },
        scale: { delay: 0.15 + i * 0.12, type: "spring", stiffness: 90, damping: 14 },
        y: opening
          ? { duration: 0.2, ease: "easeOut" }
          : { duration: 16 + i * 3, repeat: Infinity, ease: "easeInOut" },
        x: opening
          ? { duration: 0.2, ease: "easeOut" }
          : { duration: 21 + i * 2, repeat: Infinity, ease: "easeInOut" },
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
      {/*
        This used to be blur-2xl over the gradient below — a 40px blur applied to
        something already soft, on all eight worlds, each pulsing forever. Blurred
        layers re-rasterise, so it was the most expensive thing on the map for no
        visible gain. Extra colour stops carry the same falloff for free.
      */}
      <motion.span
        layoutId={`bloom-${r.id}`}
        className="pointer-events-none absolute -inset-6 block rounded-full"
        style={{
          background: `radial-gradient(circle, ${r.hex}55 0%, ${r.hex}33 38%, ${r.hex}14 58%, transparent 74%)`,
        }}
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

      {/* active gathering beacon ring */}
      {isBusiest && !locked && (
        <motion.span
          className="pointer-events-none absolute -inset-3 rounded-full border border-dashed"
          style={{ borderColor: r.glow }}
          animate={{ rotate: 360, scale: [1, 1.06, 1], opacity: [0.35, 0.7, 0.35] }}
          transition={{
            rotate: { duration: 25, repeat: Infinity, ease: "linear" },
            scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      )}

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

      {here > 0 ? (
        <motion.span
          className="absolute top-full left-1/2 mt-10 block -translate-x-1/2 text-[0.5rem] uppercase tracking-[0.28em] whitespace-nowrap md:mt-11"
          style={{ color: r.glow }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          {here} here now{isBusiest ? " · gathering hub" : ""}
        </motion.span>
      ) : isBusiest ? (
        <span
          className="absolute top-full left-1/2 mt-10 block -translate-x-1/2 text-[0.48rem] uppercase tracking-[0.24em] whitespace-nowrap md:mt-11"
          style={{ color: r.glow }}
        >
          ✦ most active
        </span>
      ) : (
        !locked && (
          <span className="absolute top-full left-1/2 mt-10 block -translate-x-1/2 text-[0.46rem] uppercase tracking-[0.24em] whitespace-nowrap text-mist/22 md:mt-11">
            in stillness
          </span>
        )
      )}
    </motion.button>
  );
}
