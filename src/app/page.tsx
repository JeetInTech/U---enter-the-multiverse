"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Landing from "@/components/Landing";
import Multiverse from "@/components/Multiverse";
import RegionView from "@/components/RegionView";
import SoulForge, { type Soul } from "@/components/SoulForge";
import SoulPanel from "@/components/SoulPanel";
import Door from "@/components/Door";
import Starfield from "@/components/Starfield";
import {
  arrive,
  declareSelf,
  dissolve,
  hasDb,
  leaveQuietly,
  loadLore,
  loadStats,
  me as loadMe,
  recordLore,
  watchPresence,
  type Stats,
} from "@/lib/db";
import { cue, enterRegion as soundOf, isMuted, onMuteChange, setMuted, wake } from "@/lib/audio";
import { TAGLINES, colorOf, rankFor, regionOf, type Region } from "@/lib/soul";

type Stage = "enter" | "forge" | "arrive" | "map" | "region";

export default function U() {
  const [stage, setStage] = useState<Stage>("enter");
  const [warp, setWarp] = useState(0);
  const [found, setFound] = useState<number[]>([]);
  const [soulId, setSoulId] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const [presence, setPresence] = useState<Record<string, number>>({});
  const presenceRef = useRef<ReturnType<typeof watchPresence> | null>(null);
  const [panel, setPanel] = useState(false);
  const [gate, setGate] = useState<Region | null>(null);
  const [muted, setMutedState] = useState(false);
  const [soul, setSoul] = useState<Soul>({
    name: "",
    tagline: TAGLINES[0],
    shape: "circle",
    color: "tide",
    aura: "glow",
  });

  const lore = found.length;
  const mine = colorOf(soul.color);
  const here = stage === "region" && region ? region : null;
  const tint = here ?? { hex: mine.hex, glow: mine.glow, bg: "#04040a" };

  // the whole world takes on the colour of wherever you are
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--hue", tint.hex);
    root.setProperty("--hue-glow", tint.glow);
    root.setProperty("--hue-bg", tint.bg);
  }, [tint.hex, tint.glow, tint.bg]);

  // a soul this browser has already made comes back as itself, with what it found
  useEffect(() => {
    loadMe()
      .then(async (s) => {
        if (!s) return;
        setSoul({
          name: s.name,
          tagline: s.tagline,
          shape: s.shape,
          color: s.color,
          aura: s.aura,
          declared: s.declared,
        });
        setSoulId(s.id);
        setReturning(true);
        setFound(await loadLore(s.id));
      })
      .catch(() => {});
  }, []);

  // how much has ever happened in each region — refreshed each time you surface
  useEffect(() => {
    if (stage !== "map") return;
    loadStats().then(setStats).catch(() => {});
  }, [stage]);

  // one presence channel for the whole multiverse; it follows you from room to room
  useEffect(() => {
    const watch = watchPresence(soulId ? { id: soulId, name: soul.name } : null, setPresence);
    presenceRef.current = watch;
    return () => {
      presenceRef.current = null;
      watch.stop();
    };
  }, [soulId, soul.name]);

  useEffect(() => {
    presenceRef.current?.where(stage === "region" ? (region?.id ?? null) : null);
  }, [stage, region?.id]);

  // the world has a voice, but only after a gesture — browsers insist
  useEffect(() => onMuteChange(setMutedState), []);
  useEffect(() => {
    soundOf(stage === "region" ? (region?.id ?? null) : stage === "enter" ? null : "nexus");
  }, [stage, region?.id]);

  const stepIn = () => {
    wake();
    setWarp(1);
    setTimeout(() => setWarp(0), 1600);
  };

  const forget = () => {
    setSoulId(null);
    setFound([]);
    setReturning(false);
    setRegion(null);
    setSoul({ name: "", tagline: TAGLINES[0], shape: "circle", color: "tide", aura: "glow" });
  };

  const leave = async () => {
    setPanel(false);
    setStage("enter");
    await leaveQuietly();
    forget();
  };

  const dissolveSoul = async () => {
    setPanel(false);
    setStage("enter");
    if (soulId) await dissolve(soulId).catch((e) => console.warn("U: could not dissolve —", e.message));
    forget();
  };

  const become = useCallback(async () => {
    setStage("arrive");
    stepIn();
    // no database configured (or anonymous sign-in is off): the world still runs, locally
    const id = await arrive(soul).catch((e) => {
      console.warn("U: arriving without a database —", e.message);
      return null;
    });
    if (id) setSoulId(id);
  }, [soul]);

  const keepLore = useCallback(
    (index: number) => {
      setFound((f) => (f.includes(index) ? f : [...f, index]));
      if (soulId) recordLore(soulId, index).catch(() => {});
    },
    [soulId],
  );

  const enterRegion = (r: Region) => {
    // one world asks a question before it opens
    if (r.women && soul.declared !== "woman") {
      setGate(r);
      return;
    }
    setRegion(r);
    setStage("region");
  };

  const answerDoor = async (declared: "woman" | "man" | "neither") => {
    const going = gate;
    setGate(null);
    setSoul((s) => ({ ...s, declared }));
    if (soulId) await declareSelf(soulId, declared).catch(() => {});
    if (declared === "woman" && going) {
      setRegion(going);
      setStage("region");
    }
  };

  return (
    <main className="grain relative h-dvh w-full overflow-hidden">
      <Starfield color={tint.glow} warp={warp} count={stage === "enter" ? 260 : 170} />

      {/* ambient wash that follows the region */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background: `radial-gradient(120% 90% at 50% 110%, ${tint.hex}22, transparent 60%)`,
        }}
        transition={{ duration: 1.4 }}
      />

      <AnimatePresence mode="wait">
        {stage === "enter" && (
          <Landing
            key="enter"
            onStepIn={stepIn}
            onEnter={() => setStage(returning ? "map" : "forge")}
          />
        )}

        {stage === "forge" && (
          <SoulForge
            key="forge"
            soul={soul}
            setSoul={setSoul}
            onDone={become}
          />
        )}

        {stage === "arrive" && (
          <Arrival key="arrive" soul={soul} onDone={() => setStage("map")} />
        )}

        {stage === "map" && (
          <Multiverse
            key="map"
            lore={lore}
            stats={stats}
            presence={presence}
            onOpen={enterRegion}
          />
        )}

        {stage === "region" && region && (
          <RegionView
            key={`region-${region.id}`}
            region={regionOf(region.id)}
            soul={soul}
            soulId={soulId}
            found={found}
            present={presence[region.id] ?? 1}
            onProfile={() => setPanel(true)}
            onLore={keepLore}
            onLeave={() => setStage("map")}
          />
        )}
      </AnimatePresence>

      {/* say plainly when the world is not persisting */}
      {!hasDb && (
        <p className="pointer-events-none absolute right-4 bottom-4 z-40 text-[0.52rem] tracking-[0.28em] text-mist/25 uppercase">
          no database · seeded multiverse
        </p>
      )}

      {/* ---- the soul you are carrying ---- */}
      <AnimatePresence>
        {stage === "map" && (
          <motion.button
            onClick={() => setPanel(true)}
            className="absolute bottom-6 left-6 z-40 flex items-center gap-3 rounded-full border border-white/10 bg-black/40 py-2 pr-5 pl-2 backdrop-blur-md transition-colors hover:border-white/30 md:bottom-8 md:left-8"
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Your soul"
          >
            <Avatar soul={soul} size={38} layoutId="me" />
            <div className="text-left leading-tight">
              <p className="font-display text-lg" style={{ color: mine.glow }}>
                {soul.name || "unnamed"}
              </p>
              <p className="text-[0.56rem] uppercase tracking-[0.28em] text-mist/45">
                {rankFor(lore)} · {lore} fragments
              </p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* the world has a voice; this is how you quiet it */}
      {stage !== "enter" && (
        <motion.button
          onClick={() => setMuted(!isMuted())}
          className="absolute top-5 left-5 z-50 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/40 text-mist/50 backdrop-blur-md transition-colors hover:border-white/30 hover:text-white md:top-6 md:left-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={muted ? "Unmute the music" : "Mute the music"}
          title={muted ? "Unmute the music" : "Mute the music"}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M4 9v6h4l5 4V5L8 9H4z" strokeLinejoin="round" />
            {muted ? (
              <path d="M17 9l4 6M21 9l-4 6" strokeLinecap="round" />
            ) : (
              <path d="M17 9a4 4 0 0 1 0 6" strokeLinecap="round" />
            )}
          </svg>
        </motion.button>
      )}

      <AnimatePresence>
        {gate && <Door region={gate} onAnswer={answerDoor} onLeave={() => setGate(null)} />}
      </AnimatePresence>

      <SoulPanel
        soul={soul}
        found={found}
        open={panel}
        onClose={() => setPanel(false)}
        onReshape={() => {
          setPanel(false);
          setStage("forge");
        }}
        onLeave={leave}
        onDissolve={dissolveSoul}
      />
    </main>
  );
}

/* ---------- first arrival in The Luminous Fields ---------- */

function Arrival({ soul, onDone }: { soul: Soul; onDone: () => void }) {
  useEffect(() => {
    cue("arrive");
  }, []);
  const lines = [
    "Welcome, traveler.",
    "You have arrived.",
    "Now… become.",
  ];
  return (
    <motion.div
      className="relative flex h-full w-full flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(16px)", scale: 1.06 }}
      transition={{ duration: 0.9 }}
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.3 }}
      >
        <Avatar soul={soul} size={150} layoutId="me" speaking />
      </motion.div>

      <div className="mt-14 space-y-1">
        {lines.map((l, i) => (
          <motion.p
            key={l}
            className="font-display text-3xl md:text-4xl"
            initial={{ opacity: 0, y: 18, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 1 + i * 0.7, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {l}
          </motion.p>
        ))}
      </div>

      <motion.button
        onClick={onDone}
        className="mt-16 rounded-full border border-white/20 px-9 py-3.5 text-[0.62rem] uppercase tracking-[0.35em] text-white/80 transition-colors hover:border-white/50 hover:text-white"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.4, duration: 1 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        Wander
      </motion.button>
    </motion.div>
  );
}
