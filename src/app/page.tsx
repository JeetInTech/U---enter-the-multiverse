"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Landing from "@/components/Landing";
import Multiverse from "@/components/Multiverse";
import RegionView from "@/components/RegionView";
import SoulForge, { type Soul } from "@/components/SoulForge";
import SoulPanel from "@/components/SoulPanel";
import ConstellationPanel from "@/components/ConstellationPanel";
import VoidSelector from "@/components/VoidSelector";
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
import { TAGLINES, colorOf, createVoidRegion, getBusiestRegion, getVoidRegionId, rankFor, regionOf, type Region } from "@/lib/soul";
import {
  blockSoul,
  loadBlocks,
  loadBlockedSouls,
  unblockSoul,
  type BlockedSoul,
} from "@/lib/safety";
import {
  answerRequest,
  connected as acceptedOf,
  incoming as incomingOf,
  keepSoul,
  loadLinks,
  outgoing as outgoingOf,
  releaseSoul,
  watchLinks,
  type KeptSoul,
} from "@/lib/constellation";
import { fetchEchoes, getUnreadEchoCount, markEchoesSeen, type ResonanceNotice } from "@/lib/inbox";
import { useLiveMoment } from "@/lib/moments";
import { cacheVoidThread, fetchVoidThreads, type VoidThread } from "@/lib/void";

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
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [blockedSouls, setBlockedSouls] = useState<BlockedSoul[]>([]);
  // every link either way, in every state; the three lists below are views of it
  const [links, setLinks] = useState<KeptSoul[]>([]);
  const [soulLocations, setSoulLocations] = useState<Record<string, string>>({});
  const [constellationOpen, setConstellationOpen] = useState(false);
  const [voidSelectorOpen, setVoidSelectorOpen] = useState(false);
  const [voidThreads, setVoidThreads] = useState<VoidThread[]>([]);
  const [partnerSoul, setPartnerSoul] = useState<{ id: string; name: string; shape: string; color: string } | null>(null);
  const [echoes, setEchoes] = useState<ResonanceNotice[]>([]);
  const [unreadEchoes, setUnreadEchoes] = useState(0);
  const keptSouls = useMemo(() => acceptedOf(links), [links]);
  const requests = useMemo(() => incomingOf(links), [links]);
  const sentRequests = useMemo(() => outgoingOf(links), [links]);
  // any link at all counts as asked, so the menu never offers to ask twice
  const linkStatus = useMemo(
    () => Object.fromEntries(links.map((s) => [s.id, s.status])),
    [links],
  );
  const [soul, setSoul] = useState<Soul>({
    name: "",
    tagline: TAGLINES[0],
    shape: "circle",
    color: "tide",
    aura: "glow",
  });

  const lore = found.length;
  const mine = colorOf(soul.color);
  const moment = useLiveMoment();
  const here = stage === "region" && region ? region : null;
  const tint = here
    ? here
    : moment.active && stage === "map"
    ? { hex: moment.active.auraHex, glow: moment.active.auraGlow, bg: "#04040a" }
    : { hex: mine.hex, glow: mine.glow, bg: "#04040a" };

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

  const refreshEchoes = useCallback(() => {
    if (!soulId) return;
    fetchEchoes(soulId)
      .then((items) => {
        setEchoes(items);
        setUnreadEchoes(getUnreadEchoCount(items));
      })
      .catch(() => {});
  }, [soulId]);

  // load blocks + constellation + inbox once the soul is known
  useEffect(() => {
    if (!soulId) return;
    loadBlocks(soulId).then(setBlockedIds).catch(() => {});
    loadBlockedSouls(soulId).then(setBlockedSouls).catch(() => {});
    loadLinks(soulId).then(setLinks).catch(() => {});
    refreshEchoes();
  }, [soulId, refreshEchoes]);

  useEffect(() => {
    if (stage === "map") refreshEchoes();
  }, [stage, refreshEchoes]);

  // somebody asking for you, or answering what you asked, should not need a reload
  useEffect(() => {
    if (!soulId) return;
    return watchLinks(soulId, () => {
      loadLinks(soulId).then(setLinks).catch(() => {});
    });
  }, [soulId]);

  // one presence channel for the whole multiverse; it follows you from room to room
  useEffect(() => {
    const watch = watchPresence(
      soulId ? { id: soulId, name: soul.name } : null,
      setPresence,
      setSoulLocations,
    );
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
    setLinks([]);
    setBlockedIds(new Set());
    setBlockedSouls([]);
    setSoulLocations({});
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

  // add a soul to the local block set and persist it to the DB
  const handleBlock = useCallback(
    (blockedSoulId: string) => {
      setBlockedIds((prev) => new Set([...prev, blockedSoulId]));
      if (soulId)
        blockSoul(soulId, blockedSoulId)
          // re-read so the profile can name who was silenced, not just count them
          .then(() => loadBlockedSouls(soulId).then(setBlockedSouls))
          .catch(() => {});
    },
    [soulId],
  );

  const handleUnblock = useCallback(
    (targetId: string) => {
      setBlockedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      setBlockedSouls((prev) => prev.filter((b) => b.id !== targetId));
      if (soulId) unblockSoul(soulId, targetId).catch(() => {});
    },
    [soulId],
  );

  /** Ask to keep a soul. They decide; until they do it sits as a sent request. */
  const handleKeep = useCallback(
    (targetId: string, details: { name: string; shape: string; color: string }) => {
      setLinks((prev) =>
        prev.some((s) => s.id === targetId)
          ? prev
          : [...prev, { id: targetId, ...details, status: "pending", direction: "out" }],
      );
      if (soulId) keepSoul(soulId, targetId).catch(() => {});
    },
    [soulId],
  );

  const handleRelease = useCallback(
    (targetId: string) => {
      setLinks((prev) => prev.filter((s) => s.id !== targetId));
      if (soulId) releaseSoul(soulId, targetId).catch(() => {});
    },
    [soulId],
  );

  /**
   * Answer somebody who asked for you. Saying no keeps the row so they cannot
   * simply ask again — and drops them out of both skies, which is the whole
   * point of being able to say it.
   */
  const handleAnswer = useCallback(
    (keeperId: string, status: "accepted" | "rejected") => {
      setLinks((prev) =>
        prev.map((s) => (s.id === keeperId && s.direction === "in" ? { ...s, status } : s)),
      );
      cue(status === "accepted" ? "resonate" : "whisper");
      if (soulId) answerRequest(keeperId, soulId, status).catch(() => {});
    },
    [soulId],
  );

  const keepLore = useCallback(
    (index: number) => {
      setFound((f) => (f.includes(index) ? f : [...f, index]));
      if (soulId) recordLore(soulId, index).catch(() => {});
    },
    [soulId],
  );

  const enterRegion = (r: Region) => {
    if (r.hidden && lore < 6 && !r.id.startsWith("void")) return;
    if (r.id === "void") {
      setVoidSelectorOpen(true);
      return;
    }
    if (r.women && soul.declared !== "woman") {
      setGate(r);
      return;
    }
    soundOf(r.id);
    cue("whisper");
    setRegion(r);
    setWarp(1);
    setStage("region");
    setTimeout(() => setWarp(0), 700);
  };

  const enterVoidWith = (partner: { id: string; name: string; shape: string; color: string }) => {
    setPartnerSoul(partner);
    setVoidSelectorOpen(false);
    setConstellationOpen(false);
    const myId = soulId || "me";
    const voidId = getVoidRegionId(myId, partner.id);
    const voidRegion = createVoidRegion(partner, voidId);
    cacheVoidThread({
      partnerId: partner.id,
      partnerName: partner.name,
      partnerShape: partner.shape,
      partnerColor: partner.color,
      lastMessage: "Opened the Void",
      lastAt: new Date().toISOString(),
      regionId: voidId,
    });
    enterRegion(voidRegion);
  };

  useEffect(() => {
    if (soulId) {
      fetchVoidThreads(soulId).then(setVoidThreads);
    }
  }, [soulId, voidSelectorOpen]);

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
          <Arrival
            key="arrive"
            soul={soul}
            presence={presence}
            stats={stats}
            lore={lore}
            onDone={(target) => enterRegion(target)}
          />
        )}

      </AnimatePresence>

      {/*
        The map and a room share layoutIds — the planet you tap grows into the room
        you land in. That morph needs both of them mounted at once, so this presence
        is deliberately not mode="wait": with "wait" the map is gone before the room
        exists and there is nothing to morph between, which reads as a hard cut.
      */}
      <AnimatePresence>
        {stage === "map" && (
          <Multiverse
            key="map"
            lore={lore}
            stats={stats}
            presence={presence}
            onOpen={enterRegion}
            onOpenVoid={() => setVoidSelectorOpen(true)}
          />
        )}

        {stage === "region" && region && (
          <RegionView
            key={`region-${region.id}`}
            region={regionOf(region.id, partnerSoul)}
            soul={soul}
            soulId={soulId}
            found={found}
            present={presence[region.id] ?? 1}
            blockedIds={blockedIds}
            linkStatus={linkStatus}
            unreadEchoes={unreadEchoes}
            activeMoment={moment.active}
            onProfile={() => setPanel(true)}
            onLore={keepLore}
            onBlock={handleBlock}
            onKeep={handleKeep}
            onRelease={handleRelease}
            onEnterVoid={enterVoidWith}
            onLeave={() => {
              setPartnerSoul(null);
              setStage("map");
            }}
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
            key="soul-profile-button"
            onClick={() => setPanel(true)}
            className="pin-bl absolute z-40 flex items-center gap-3 rounded-full border border-white/10 bg-black/40 py-2 pr-5 pl-2 backdrop-blur-md transition-colors hover:border-white/30"
            // no filter keyframe: Motion leaves `filter: blur(0px)` on the element
            // forever once the entrance finishes, which keeps this pinned button on
            // its own compositing layer for the whole session. Opacity and y read
            // the same and leave nothing behind.
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Your soul"
          >
            <div className="relative">
              <Avatar soul={soul} size={38} layoutId="me" />
              {unreadEchoes > 0 && (
                <motion.span
                  className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 border-2 border-black"
                  animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
            <div className="text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <p className="font-display text-lg" style={{ color: mine.glow }}>
                  {soul.name || "unnamed"}
                </p>
                {unreadEchoes > 0 && (
                  <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[0.5rem] tracking-wider text-amber-300">
                    +{unreadEchoes}
                  </span>
                )}
              </div>
              <p className="text-[0.56rem] uppercase tracking-[0.28em] text-mist/45">
                {rankFor(lore)} · {lore} fragments
              </p>
            </div>
          </motion.button>
        )}
        {stage === "map" && (
          /* positioned wrapper — the dropdown anchors itself to this */
          <motion.div
            key="constellation-button"
            data-constellation
            className="pin-tr absolute z-50"
            // same as the profile button: a filter keyframe would leave blur(0px)
            // pinned here permanently, and this wrapper is also the dropdown's
            // positioning context — a lingering filter changes what `fixed`
            // children resolve against, which has already bitten once.
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ delay: 0.65, duration: 0.6 }}
          >
            <motion.button
              onClick={() => setConstellationOpen((o) => !o)}
              className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/40 py-2 pr-4 pl-3 backdrop-blur-md transition-colors hover:border-white/30"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              aria-haspopup="menu"
              aria-expanded={constellationOpen}
              aria-label="Your constellation"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-mist/60" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
              <span className="hidden text-[0.56rem] uppercase tracking-[0.28em] text-mist/55 sm:block">
                Constellation
              </span>
              {requests.length > 0 ? (
                <motion.span
                  className="grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[0.5rem] font-medium text-black"
                  animate={{ scale: [1, 1.18, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  {requests.length}
                </motion.span>
              ) : (
                keptSouls.length > 0 && (
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-white/15 text-[0.5rem] text-mist/80">
                    {keptSouls.length}
                  </span>
                )
              )}
            </motion.button>

            <ConstellationPanel
              open={constellationOpen}
              kept={keptSouls}
              soulLocations={soulLocations}
              onClose={() => setConstellationOpen(false)}
              requests={requests}
              onRelease={handleRelease}
              onAnswer={handleAnswer}
              onNavigate={(regionId) => {
                setConstellationOpen(false);
                enterRegion(regionOf(regionId));
              }}
              onEnterVoid={enterVoidWith}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* the world has a voice; this is how you quiet it */}
      {stage !== "enter" && (
        <motion.button
          onClick={() => setMuted(!isMuted())}
          className="pin-tl absolute z-50 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/40 text-mist/50 backdrop-blur-md transition-colors hover:border-white/30 hover:text-white"
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
        {gate && <Door key={`door-${gate.id}`} region={gate} onAnswer={answerDoor} onLeave={() => setGate(null)} />}
      </AnimatePresence>

      <VoidSelector
        open={voidSelectorOpen}
        threads={voidThreads}
        connected={keptSouls}
        sent={sentRequests}
        onClose={() => setVoidSelectorOpen(false)}
        onEnterVoid={enterVoidWith}
        onWithdraw={handleRelease}
      />

      <SoulPanel
        soul={soul}
        found={found}
        open={panel}
        echoes={echoes}
        blocked={blockedSouls}
        onUnblock={handleUnblock}
        onClose={() => setPanel(false)}
        onMarkSeen={() => {
          markEchoesSeen();
          setUnreadEchoes(0);
        }}
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

function Arrival({
  soul,
  presence,
  stats,
  lore,
  onDone,
}: {
  soul: Soul;
  presence: Record<string, number>;
  stats: Stats;
  lore: number;
  onDone: (target: Region) => void;
}) {
  useEffect(() => {
    cue("arrive");
  }, []);

  const destination = getBusiestRegion(presence, stats, lore, soul.declared);

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

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1 }}
        className="mt-4 text-[0.56rem] tracking-[0.3em] uppercase text-mist/40"
      >
        Drawing you toward {destination.name}
      </motion.p>

      <motion.button
        onClick={() => onDone(destination)}
        className="mt-10 rounded-full border border-white/20 px-9 py-3.5 text-[0.62rem] uppercase tracking-[0.35em] text-white/80 transition-colors hover:border-white/50 hover:text-white"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.2, duration: 1 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        Wander into {destination.name}
      </motion.button>
    </motion.div>
  );
}
