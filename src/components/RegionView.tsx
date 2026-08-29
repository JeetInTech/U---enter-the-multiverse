"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import type { Soul } from "@/components/SoulForge";
import {
  hasDb,
  joinRitual,
  leaveRitual,
  loadRegion,
  resonate as sendResonance,
  sendMessage,
  watchRegion,
  type Ritual,
} from "@/lib/db";
import {
  Ambience,
  ForgeLine,
  RITUAL_LABEL,
  Rituals,
  useRitualEvents,
} from "@/components/Rituals";
import VoiceBar from "@/components/VoiceBar";
import { cue } from "@/lib/audio";
import { useDictation } from "@/lib/speech";
import { useVoice } from "@/lib/voice";
import { uploadPhoto } from "@/lib/db";
import { LORE, colorOf, rankFor, type Msg, type Region } from "@/lib/soul";

const CUE_FOR: Record<Ritual["kind"], Parameters<typeof cue>[0] | null> = {
  lantern: "lantern",
  whisper: "whisper",
  burst: "burst",
  chime: "chime",
  word: null,
  thread: "fragment",
};

// the regions where the ritual needs something written first
const NEEDS_TEXT = new Set(["echo", "forge", "void"]);

export default function RegionView({
  region,
  soul,
  soulId,
  found,
  present,
  onProfile,
  onLore,
  onLeave,
}: {
  region: Region;
  soul: Soul;
  soulId: string | null;
  found: number[];
  present: number;
  onProfile: () => void;
  onLore: (index: number) => void;
  onLeave: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [fragment, setFragment] = useState<string | null>(null);
  const [showFragment, setShowFragment] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mine = colorOf(soul.color);
  const nextLore = LORE.findIndex((_, i) => !found.includes(i));
  const [events, pushEvent] = useRitualEvents();
  const [uploading, setUploading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const voice = useVoice(
    region.id,
    soulId ? { id: soulId, name: soul.name || "unnamed", color: soul.color, shape: soul.shape } : null,
  );
  const ritual = useRef<((r: Ritual) => void) | null>(null);
  const dictation = useDictation(setDraft);

  // the room's own channel — lanterns, whispers, bursts; nothing here is ever stored
  useEffect(() => {
    const send = joinRitual(region.id, (r) => {
      pushEvent(r);
      const c = CUE_FOR[r.kind];
      if (c) cue(c);
    });
    ritual.current = send;
    return () => {
      leaveRitual(send);
      ritual.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region.id]);

  // the room, and then the room as it keeps happening
  useEffect(() => {
    // the component is keyed by region, so this state is already fresh on arrival
    const alive = true;
    loadRegion(region.id, soulId)
      .then((m) => alive && (setMsgs(m), setLoading(false)))
      .catch((e) => {
        console.warn("U: could not read this region —", e.message);
        if (alive) setLoading(false);
      });

    return watchRegion(region.id, soulId ? { id: soulId, name: soul.name } : null, {
      onMessage: (m) =>
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m])),
      // my own resonance already counted itself, optimistically
      onResonance: (id, from) =>
        from !== soulId &&
        setMsgs((prev) =>
          prev.map((x) => (x.id === id ? { ...x, resonance: x.resonance + 1 } : x)),
        ),
    });
  }, [region.id, soulId, soul.name]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  // a fragment of lore surfaces once you have been here a moment
  useEffect(() => {
    if (nextLore < 0) return;
    const t = setTimeout(() => setShowFragment(true), 3200);
    return () => clearTimeout(t);
  }, [region.id, nextLore]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    if (hasDb && soulId) {
      // realtime echoes it straight back, so there is nothing to append here
      await sendMessage(region.id, soulId, text).catch(() => {});
      return;
    }
    setMsgs((m) => [
      ...m,
      {
        id: `${Date.now()}`,
        soul: soul.name || "unnamed",
        shape: soul.shape,
        color: soul.color,
        text,
        resonance: 0,
        mine: true,
      },
    ]);
  };

  const perform = () => {
    const sendRitual = ritual.current;
    if (!sendRitual) return;
    const text = draft.trim();
    if (NEEDS_TEXT.has(region.id) && !text) return;
    switch (region.id) {
      case "luminous":
        sendRitual({ kind: "lantern", wish: text.slice(0, 44), color: soul.color, x: 8 + Math.random() * 84 });
        break;
      case "echo":
        sendRitual({ kind: "whisper", text: text.slice(0, 140), color: soul.color });
        break;
      case "neon":
        sendRitual({ kind: "burst", color: soul.color });
        break;
      case "crystal":
        sendRitual({ kind: "chime", note: Math.floor(Math.random() * 5), color: soul.color });
        break;
      case "forge":
        sendRitual({ kind: "word", word: text.split(/\s+/)[0].slice(0, 18), color: soul.color, soul: soul.name });
        break;
      case "void":
        sendRitual({ kind: "thread", text: text.slice(0, 40), color: soul.color });
        break;
    }
    setDraft("");
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file || !soulId) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(file);
      await sendMessage(region.id, soulId, draft.trim(), url);
      setDraft("");
      cue("lantern");
    } catch (e) {
      console.warn("U: the photograph did not develop —", (e as Error).message);
    }
    setUploading(false);
  };

  const resonate = (id: string) => {
    setMsgs((m) =>
      m.map((x) =>
        x.id === id && !x.resonated ? { ...x, resonated: true, resonance: x.resonance + 1 } : x,
      ),
    );
    if (hasDb && soulId) sendResonance(id, soulId).catch(() => {});
  };

  return (
    <motion.div className="relative flex h-full w-full flex-col">
      {/* the region itself, grown out of its card on the map */}
      <motion.div
        layoutId={`region-${region.id}`}
        className="absolute inset-0 overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${region.bg} 0%, #04040a 100%)` }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
      >
        <motion.div
          layoutId={`bloom-${region.id}`}
          className="absolute -inset-24 blur-3xl"
          style={{
            background: `radial-gradient(40% 40% at 75% 5%, ${region.hex}44, transparent 70%), radial-gradient(45% 45% at 10% 95%, ${region.glow}22, transparent 70%)`,
          }}
        />
      </motion.div>

      {/* what the room does whether or not anyone is speaking */}
      <Ambience region={region} present={present} />

      {/* ---- header ---- */}
      <motion.header
        className="relative z-10 flex items-start justify-between py-8 pr-6 pl-16 md:pl-20"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.7 }}
      >
        <div>
          <button
            onClick={onLeave}
            className="mb-3 text-[0.62rem] uppercase tracking-[0.35em] text-mist/45 transition-colors hover:text-white/80"
          >
            ← the multiverse
          </button>
          <motion.h2
            layoutId={`name-${region.id}`}
            className="font-display text-4xl md:text-5xl"
            style={{ color: region.glow }}
          >
            {region.name}
          </motion.h2>
          <p className="mt-2 text-[0.66rem] uppercase tracking-[0.3em] text-mist/40">
            {region.vibe} · {region.ambient}
          </p>
        </div>
        <Presence region={region} count={present} />
      </motion.header>

      {/* ---- a world where nobody types ---- */}
      {region.voiceOnly ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10 px-6">
          <motion.p
            className="max-w-md text-center text-sm leading-relaxed text-mist/50 italic"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
          >
            {region.blurb}
          </motion.p>
          <VoiceBar big region={region} {...voice} onJoin={voice.join} onLeave={voice.leave} onToggleMic={voice.toggleMic} />
        </div>
      ) : (
      <>
      {/* ---- resonance feed ---- */}
      <div ref={scroller} className="relative z-10 flex-1 overflow-y-auto px-6 py-8 md:px-14">
        <div className="mx-auto max-w-3xl space-y-5">
          {!loading && msgs.length === 0 && (
            <motion.p
              className="py-16 text-center text-sm text-mist/35 italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            >
              Nobody has said anything here yet. That is also a kind of company.
            </motion.p>
          )}
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => (
              <Message
                key={m.id}
                m={m}
                i={i}
                accent={region.glow}
                onResonate={() => resonate(m.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ---- voice, for the rooms that have it ---- */}
      {region.voice && (
        <div className="relative z-10 px-6 pb-2 md:px-14">
          <VoiceBar
            region={region}
            {...voice}
            onJoin={voice.join}
            onLeave={voice.leave}
            onToggleMic={voice.toggleMic}
          />
        </div>
      )}

      {/* ---- composer ---- */}
      <motion.div
        className="relative z-10 px-6 pb-8 md:px-14"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7 }}
      >
        {/* the one thing only this region lets you do, where it has one */}
        <div className={`mx-auto mb-3 flex max-w-3xl justify-center ${RITUAL_LABEL[region.id] ? "" : "hidden"}`}>
          <motion.button
            onClick={perform}
            disabled={NEEDS_TEXT.has(region.id) && !draft.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-full border px-5 py-2 text-[0.56rem] uppercase tracking-[0.3em] transition-colors disabled:opacity-25"
            style={{ borderColor: `${region.hex}55`, color: region.glow }}
          >
            {RITUAL_LABEL[region.id]}
          </motion.button>
        </div>

        {dictation.error && (
          <p className="mx-auto mb-2 max-w-3xl text-center text-[0.55rem] tracking-[0.25em] text-red-300/70 uppercase">
            {dictation.error}
          </p>
        )}
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-2.5 pr-2.5 pl-3 backdrop-blur-md sm:gap-4 sm:pl-4">
          <button onClick={onProfile} aria-label="Your soul" className="shrink-0">
            <Avatar soul={soul} size={34} speaking={draft.length > 0} />
          </button>
          <button onClick={onProfile} className="hidden shrink-0 text-left leading-tight sm:block">
            <span className="block font-display text-base" style={{ color: mine.glow }}>
              {soul.name || "unnamed"}
            </span>
            <span className="block text-[0.52rem] uppercase tracking-[0.22em] text-mist/40">
              {rankFor(found.length)} · {found.length} fragments
            </span>
          </button>
          <input
            value={draft}
            maxLength={400}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="say something true"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-mist/30"
          />
          {region.photos && (
            <>
              <input
                ref={picker}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void pickPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <motion.button
                onClick={() => picker.current?.click()}
                disabled={uploading || !soulId}
                whileTap={{ scale: 0.9 }}
                aria-label="Hang a photograph"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 text-mist/55 transition-colors hover:border-white/35 hover:text-white disabled:opacity-30"
              >
                {uploading ? (
                  <motion.span
                    className="block h-3 w-3 rounded-full border-2 border-current border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <rect x="3" y="5" width="18" height="14" rx="2.5" />
                    <circle cx="8.5" cy="10" r="1.5" />
                    <path d="M4 17l5-5 4 4 3-2 4 4" strokeLinejoin="round" />
                  </svg>
                )}
              </motion.button>
            </>
          )}
          {dictation.supported && (
            <motion.button
              onClick={dictation.toggle}
              whileTap={{ scale: 0.9 }}
              aria-label={dictation.listening ? "Stop listening" : "Speak instead of typing"}
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors"
              style={{
                borderColor: dictation.listening ? mine.hex : "#ffffff1f",
                color: dictation.listening ? mine.glow : "#8b95ad",
              }}
            >
              {dictation.listening && (
                <motion.span
                  className="absolute inset-0 rounded-full border"
                  style={{ borderColor: mine.hex }}
                  animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
              </svg>
            </motion.button>
          )}
          <motion.button
            onClick={send}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="shrink-0 rounded-full px-3.5 py-2 text-[0.55rem] uppercase tracking-[0.2em] text-black sm:px-5 sm:text-[0.62rem] sm:tracking-[0.28em]"
            style={{ background: mine.glow }}
          >
            Resonate
          </motion.button>
        </div>
      </motion.div>

      </>
      )}

      {/* lanterns, whispers, bursts — the things that happen once and are gone */}
      <Rituals events={events} />
      {region.id === "forge" && <ForgeLine events={events} region={region} />}

      {/* ---- a fragment of lore, hidden in the room ---- */}
      <AnimatePresence>
        {showFragment && !fragment && nextLore >= 0 && (
          <motion.button
            key="glimmer"
            onClick={() => {
              setFragment(LORE[nextLore]);
              onLore(nextLore);
              setShowFragment(false);
            }}
            className="absolute top-1/3 right-[12%] z-20 h-3 w-3 rounded-full"
            style={{ background: region.glow, boxShadow: `0 0 30px 8px ${region.glow}88` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={
              reduce
                ? { scale: 1, opacity: 1 }
                : { scale: [0, 1.3, 1], opacity: [0, 1, 0.55, 1], y: [0, -14, 0] }
            }
            exit={{ scale: 2.4, opacity: 0 }}
            transition={{
              duration: 3,
              repeat: reduce ? 0 : Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            aria-label="A fragment of lore"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fragment && (
          <motion.div
            className="absolute inset-0 z-30 grid place-items-center bg-black/70 px-6 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFragment(null)}
          >
            <motion.div
              className="max-w-lg text-center"
              initial={{ scale: 0.9, y: 20, filter: "blur(14px)" }}
              animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ scale: 1.05, opacity: 0, filter: "blur(14px)" }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              <p className="text-[0.6rem] uppercase tracking-[0.5em] text-mist/45">
                Fragment recovered
              </p>
              <p className="mt-6 font-display text-3xl leading-snug" style={{ color: region.glow }}>
                {fragment}
              </p>
              <p className="mt-8 text-[0.6rem] uppercase tracking-[0.35em] text-mist/30">
                click anywhere to keep it
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- a single resonance ---------- */

function Message({
  m,
  i,
  accent,
  onResonate,
}: {
  m: Msg;
  i: number;
  accent: string;
  onResonate: () => void;
}) {
  const c = colorOf(m.color);
  const heat = Math.min(m.resonance / 90, 1); // loud messages literally glow brighter
  const resonated = !!m.resonated;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 26, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: Math.min(i * 0.06, 0.5), type: "spring", stiffness: 150, damping: 20 }}
      className={`flex items-start gap-4 ${m.mine ? "flex-row-reverse text-right" : ""}`}
    >
      <Avatar soul={{ shape: m.shape, color: m.color, aura: "glow" }} size={40} />
      <div className={`max-w-[75%] ${m.mine ? "items-end" : ""}`}>
        <div
          className={`mb-1.5 flex items-center gap-2 text-[0.62rem] tracking-[0.2em] uppercase ${
            m.mine ? "justify-end" : ""
          }`}
        >
          <span style={{ color: c.glow }}>{m.soul}</span>
        </div>
        {m.image && (
          <motion.a
            href={m.image}
            target="_blank"
            rel="noreferrer"
            className="mb-2 block overflow-hidden rounded-2xl border"
            style={{ borderColor: `${c.hex}44` }}
            initial={{ opacity: 0, filter: "blur(16px)", scale: 0.96 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.image}
              alt="a photograph someone hung here"
              className="max-h-72 w-full object-cover"
              loading="lazy"
            />
          </motion.a>
        )}
        {m.text && (
        <motion.div
          className="relative rounded-2xl border px-4 py-3 text-[0.92rem] leading-relaxed backdrop-blur-sm"
          style={{
            borderColor: `${c.hex}${resonated ? "88" : "33"}`,
            background: `linear-gradient(180deg, ${c.hex}${Math.round(10 + heat * 22)
              .toString(16)
              .padStart(2, "0")}, transparent)`,
            boxShadow: `0 0 ${18 + heat * 40}px ${c.hex}${Math.round(20 + heat * 60)
              .toString(16)
              .padStart(2, "0")}`,
          }}
          animate={{ scale: resonated ? [1, 1.03, 1] : 1 }}
          transition={{ duration: 0.45 }}
        >
          {m.text}
        </motion.div>
        )}

        <button
          onClick={onResonate}
          disabled={resonated}
          className={`group relative mt-2 inline-flex items-center gap-2 text-[0.66rem] tracking-[0.16em] uppercase transition-colors ${
            resonated ? "" : "text-mist/40 hover:text-white/75"
          }`}
          style={resonated ? { color: accent } : undefined}
        >
          <span className="relative grid h-4 w-4 place-items-center">
            <span
              className="h-1.5 w-1.5 rounded-full transition-all duration-300"
              style={{ background: resonated ? accent : "#6b7590" }}
            />
            {resonated && (
              <motion.span
                className="absolute inset-0 rounded-full border"
                style={{ borderColor: accent }}
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            )}
          </span>
          <motion.span
            key={m.resonance}
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            {m.resonance}
          </motion.span>
        </button>
      </div>
    </motion.div>
  );
}

/* ---------- souls floating in the room ---------- */

function Presence({ region, count }: { region: Region; count: number }) {
  const dots = Array.from({ length: Math.max(1, Math.min(count, 7)) }, (_, i) => i);
  return (
    <div className="relative hidden h-20 w-44 md:block" aria-hidden>
      {dots.map((i) => (
        <motion.span
          key={i}
          className="absolute h-2 w-2 rounded-full"
          style={{
            background: region.glow,
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            boxShadow: `0 0 12px ${region.hex}`,
          }}
          animate={{ y: [0, -10, 4, 0], x: [0, 6, -4, 0], opacity: [0.25, 0.8, 0.4, 0.25] }}
          transition={{ duration: 7 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}
      <span className="absolute right-0 -bottom-1 text-[0.58rem] uppercase tracking-[0.24em] text-mist/35">
        {count} present
      </span>
    </div>
  );
}
