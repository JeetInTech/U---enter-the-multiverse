"use client";

// Every region has a voice. Nothing here is a file — it is all synthesised, so the
// world weighs nothing and each dimension can sound like itself.

type Voice = {
  root: number; // hz of the drone
  fifth: number; // its companion
  wave: OscillatorType;
  cutoff: number; // lowpass, how bright the room is
  sway: number; // hz of the slow filter breathing
  noise: number; // 0-1, how much wind/rain sits under it
};

const VOICES: Record<string, Voice> = {
  luminous: { root: 110, fifth: 165, wave: "sine", cutoff: 900, sway: 0.06, noise: 0.1 },
  echo: { root: 73.4, fifth: 98, wave: "sine", cutoff: 420, sway: 0.03, noise: 0.16 },
  neon: { root: 82.4, fifth: 123.5, wave: "sawtooth", cutoff: 700, sway: 0.9, noise: 0.05 },
  crystal: { root: 146.8, fifth: 220, wave: "triangle", cutoff: 1500, sway: 0.09, noise: 0.08 },
  forge: { root: 98, fifth: 130.8, wave: "square", cutoff: 500, sway: 0.14, noise: 0.12 },
  void: { root: 55, fifth: 58.3, wave: "sine", cutoff: 260, sway: 0.02, noise: 0.03 },
  // the sky between the worlds
  nexus: { root: 65.4, fifth: 98, wave: "sine", cutoff: 600, sway: 0.04, noise: 0.06 },
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambient: { stop: () => void; id: string } | null = null;
let muted = false;

const listeners = new Set<(m: boolean) => void>();
export const onMuteChange = (fn: (m: boolean) => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const isMuted = () => muted;

/** Browsers only allow sound after a gesture, so this is called from "Step in". */
export function wake() {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
}

export function setMuted(m: boolean) {
  muted = m;
  listeners.forEach((fn) => fn(m));
  if (master && ctx) master.gain.linearRampToValueAtTime(m ? 0 : 0.5, ctx.currentTime + 0.4);
}

function noiseBuffer(c: AudioContext) {
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
  return buf;
}

/** Fade into a region's ambience. Calling it again crossfades to the new one. */
export function enterRegion(id: string | null) {
  if (!ctx || !master) return;
  if (ambient?.id === id) return;
  ambient?.stop();
  ambient = null;
  if (!id) return;
  const v = VOICES[id];
  if (!v) return;

  const c = ctx;
  const now = c.currentTime;
  const bus = c.createGain();
  bus.gain.setValueAtTime(0, now);
  bus.gain.linearRampToValueAtTime(0.16, now + 3);
  bus.connect(master);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = v.cutoff;
  filter.Q.value = 1.2;
  filter.connect(bus);

  // the room breathes: a slow LFO opening and closing the filter
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = v.sway;
  lfoGain.gain.value = v.cutoff * 0.45;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  const oscs = [v.root, v.fifth, v.root * 2.01].map((f, i) => {
    const o = c.createOscillator();
    o.type = v.wave;
    o.frequency.value = f;
    o.detune.value = i * 6 - 6;
    const g = c.createGain();
    g.gain.value = i === 2 ? 0.05 : 0.14;
    o.connect(g).connect(filter);
    o.start();
    return o;
  });

  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const ng = c.createGain();
  ng.gain.value = v.noise * 0.09;
  const nf = c.createBiquadFilter();
  nf.type = "bandpass";
  nf.frequency.value = 700;
  src.connect(nf).connect(ng).connect(bus);
  src.start();

  ambient = {
    id,
    stop: () => {
      const t = c.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => {
        oscs.forEach((o) => o.stop());
        lfo.stop();
        src.stop();
        bus.disconnect();
      }, 1400);
    },
  };
}

type Cue = "arrive" | "resonate" | "lantern" | "chime" | "burst" | "fragment" | "whisper";

const CUES: Record<Cue, { f: number; to: number; len: number; wave: OscillatorType; gain: number }> = {
  arrive: { f: 220, to: 660, len: 1.4, wave: "sine", gain: 0.18 },
  resonate: { f: 880, to: 1320, len: 0.5, wave: "sine", gain: 0.1 },
  lantern: { f: 520, to: 990, len: 1.1, wave: "triangle", gain: 0.12 },
  chime: { f: 1174, to: 1568, len: 2.2, wave: "sine", gain: 0.14 },
  burst: { f: 160, to: 40, len: 0.5, wave: "sawtooth", gain: 0.2 },
  fragment: { f: 330, to: 1245, len: 2.6, wave: "sine", gain: 0.16 },
  whisper: { f: 2200, to: 900, len: 0.7, wave: "sine", gain: 0.05 },
};

/** A short sound for something that just happened. */
export function cue(name: Cue) {
  if (!ctx || !master || muted) return;
  const c = ctx;
  const s = CUES[name];
  const now = c.currentTime;
  const o = c.createOscillator();
  o.type = s.wave;
  o.frequency.setValueAtTime(s.f, now);
  o.frequency.exponentialRampToValueAtTime(Math.max(s.to, 1), now + s.len);
  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(s.gain, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + s.len);
  o.connect(g).connect(master);
  o.start(now);
  o.stop(now + s.len + 0.05);
}
