// The multiverse of U — world data + the shape math that lets souls morph.

export type Pt = [number, number];

/* ---------- shape geometry ----------
   Every shape is resampled to the same point count, so motion can interpolate
   the `d` string directly and one avatar melts into another. ---------- */

const SAMPLES = 96;
const TAU = Math.PI * 2;
const START = -Math.PI / 2; // everything begins at 12 o'clock so morphs don't twist

const circle = (n = 64): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = START + (i / n) * TAU;
    return [Math.cos(a), Math.sin(a)] as Pt;
  });

const ngon = (n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = START + (i / n) * TAU;
    return [Math.cos(a), Math.sin(a)] as Pt;
  });

const star = (points = 5, inner = 0.44): Pt[] =>
  Array.from({ length: points * 2 }, (_, i) => {
    const a = START + (i / (points * 2)) * TAU;
    const r = i % 2 ? inner : 1;
    return [Math.cos(a) * r, Math.sin(a) * r] as Pt;
  });

// exact crescent: unit circle minus a circle offset to the right
const crescent = (d = 0.62, rb = 0.92): Pt[] => {
  const x = (d * d + 1 - rb * rb) / (2 * d);
  const y = Math.sqrt(1 - x * x);
  const aOut = Math.atan2(y, x); // where the two circles meet, measured on circle A
  const aIn = Math.atan2(y, x - d); // ...and on circle B
  const arc = (n: number, from: number, to: number, cx: number, r: number): Pt[] =>
    Array.from({ length: n }, (_, i) => {
      const t = from + ((to - from) * i) / (n - 1);
      return [cx + Math.cos(t) * r, Math.sin(t) * r] as Pt;
    });
  return [
    ...arc(40, aOut, TAU - aOut, 0, 1), // outer sweep, the long way round
    ...arc(28, -aIn, aIn - TAU, d, rb), // ...and back along the bite
  ];
};

function resample(pts: Pt[], n = SAMPLES): Pt[] {
  const loop = [...pts, pts[0]];
  const acc = [0];
  for (let i = 1; i < loop.length; i++)
    acc.push(acc[i - 1] + Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]));
  const total = acc[acc.length - 1];
  const out: Pt[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = (i / n) * total;
    while (j < acc.length - 2 && acc[j + 1] < target) j++;
    const t = (target - acc[j]) / (acc[j + 1] - acc[j] || 1);
    out.push([
      loop[j][0] + (loop[j + 1][0] - loop[j][0]) * t,
      loop[j][1] + (loop[j + 1][1] - loop[j][1]) * t,
    ]);
  }
  return out;
}

const toPath = (pts: Pt[], r = 46): string =>
  pts
    .map(([x, y], i) => `${i ? "L" : "M"}${(50 + x * r).toFixed(2)} ${(50 + y * r).toFixed(2)}`)
    .join(" ") + " Z";

export const SHAPES = [
  { id: "circle", name: "Circle", meaning: "Soft, open, caring", pts: circle() },
  { id: "triangle", name: "Triangle", meaning: "Sharp, bold, intense", pts: ngon(3) },
  { id: "diamond", name: "Diamond", meaning: "Complex, deep, mysterious", pts: ngon(4) },
  { id: "star", name: "Star", meaning: "Bright, energetic, magnetic", pts: star() },
  { id: "crescent", name: "Crescent", meaning: "Introspective, dreamy, quiet", pts: crescent() },
].map((s) => ({ id: s.id, name: s.name, meaning: s.meaning, d: toPath(resample(s.pts)) }));

export type ShapeId = string;
export const shapePath = (id: string) => (SHAPES.find((s) => s.id === id) ?? SHAPES[0]).d;

/* ---------- palettes ---------- */

export const COLORS = [
  { id: "ember", name: "Ember", element: "fire soul", hex: "#ff7a45", glow: "#ffb37a" },
  { id: "tide", name: "Tide", element: "water soul", hex: "#4d9dff", glow: "#9ecbff" },
  { id: "pulse", name: "Pulse", element: "electric soul", hex: "#c04bff", glow: "#ff6ad5" },
  { id: "moss", name: "Moss", element: "grounded soul", hex: "#3fd7a0", glow: "#9df3d2" },
  { id: "dusk", name: "Dusk", element: "twilight soul", hex: "#ff4d8d", glow: "#ffa3c4" },
  { id: "ash", name: "Ash", element: "silent soul", hex: "#b9c4dd", glow: "#e8eefc" },
];
export const colorOf = (id: string) => COLORS.find((c) => c.id === id) ?? COLORS[0];

export const AURAS = [
  { id: "glow", name: "Soft glow", meaning: "Gentle energy" },
  { id: "pulse", name: "Pulsing light", meaning: "Alive and energetic" },
  { id: "flicker", name: "Flickering", meaning: "Deep and intense" },
  { id: "rainbow", name: "Rainbow", meaning: "Playful and free" },
  { id: "silver", name: "Silver", meaning: "Mysterious and wise" },
];
export type AuraId = string;

export const TAGLINES = [
  "Wanderer of forgotten dreams",
  "A storm in human form",
  "Quiet observer of chaos",
  "Fire that burns softly",
  "Half a rumour, half a light",
];

export const SOUL_NAMES = [
  "Nought",
  "Marigold",
  "Vesper",
  "Hollow",
  "Kite",
  "Ember",
  "Salt",
  "Quartz",
  "Static",
  "Moth",
];

/* ---------- regions ---------- */

export type Region = {
  id: string;
  name: string;
  vibe: string;
  blurb: string;
  ambient: string;
  hex: string;
  glow: string;
  bg: string;
  hidden?: boolean;
  /** what this world is made of, for the renderer */
  world: "gas" | "ocean" | "storm" | "ice" | "molten" | "ringed" | "moon" | "blackhole";
  /** rooms can do more than talk */
  photos?: boolean;
  voice?: boolean;
  voiceOnly?: boolean;
  /** a room only souls who have declared themselves women may enter */
  women?: boolean;
};

export const REGIONS: Region[] = [
  {
    id: "luminous",
    name: "The Luminous Fields",
    vibe: "Golden, warm, safe",
    blurb:
      "New souls arrive here. It is like stepping into a sunset. People are nervous at first, but the warmth calms them.",
    ambient: "low wind over grass",
    hex: "#f5b942",
    glow: "#ffd98a",
    bg: "#1a1206",
    world: "gas",
    voice: true,
  },
  {
    id: "echo",
    name: "The Echo Chamber",
    vibe: "Deep blue, quiet, intimate",
    blurb:
      "This is where souls go at 2 AM. The lights are dim. People share things here they would never say anywhere else.",
    ambient: "rain on a far window",
    hex: "#6ea8ff",
    glow: "#b7d4ff",
    bg: "#050a1c",
    world: "ocean",
    voice: true,
  },
  {
    id: "neon",
    name: "The Neon Abyss",
    vibe: "Purple, pink, electric",
    blurb:
      "Chaotic energy. Loud. Bright. Unpredictable. Jokes, memes, spontaneous dance parties. No judgment. Just freedom.",
    ambient: "a bassline two rooms away",
    hex: "#d34bff",
    glow: "#ff7ae0",
    bg: "#150522",
    world: "storm",
    voice: true,
  },
  {
    id: "crystal",
    name: "The Crystal Gardens",
    vibe: "Green, soft, healing",
    blurb:
      "A sanctuary. Crystal trees that hum. Gentle water. People come here to breathe, to rest, to recover.",
    ambient: "water and a single held note",
    hex: "#3fe0ac",
    glow: "#a5f7dc",
    bg: "#03170f",
    world: "ice",
    voice: true,
  },
  {
    id: "forge",
    name: "The Forge",
    vibe: "Orange, warm, creative",
    blurb:
      "Where things get made. Art, music, ideas. Strangers become co-creators. Something new is born here every day.",
    ambient: "hammer, ember, hum",
    hex: "#ff7a2f",
    glow: "#ffb877",
    bg: "#1b0a02",
    world: "molten",
    voice: true,
  },
  {
    id: "void",
    name: "The Void",
    vibe: "Black with silver threads",
    blurb:
      "The hidden world. You cannot see it on the map. You have to earn it. Those who find it become Guardians.",
    ambient: "silence, and something breathing",
    hex: "#c7d2e8",
    glow: "#ffffff",
    bg: "#000000",
    hidden: true,
    world: "blackhole",
    voice: true,
  },
  {
    id: "darkroom",
    name: "The Darkroom",
    vibe: "Amber, patient, developing",
    blurb:
      "Bring what you saw. Photographs of things that never quite happened, hung in the dark while they come up. Talk about them, or do not.",
    ambient: "a fan, chemicals, someone humming",
    hex: "#e0a24a",
    glow: "#ffd9a0",
    bg: "#171008",
    world: "ringed",
    photos: true,
    voice: true,
  },
  {
    id: "sisterhood",
    name: "The Sisterhood",
    vibe: "Silver, spoken, women only",
    blurb:
      "No typing here. Voices only, and only women. A moon that keeps its own side turned away from everything else.",
    ambient: "low voices and long pauses",
    hex: "#e5a6d6",
    glow: "#ffdcf3",
    bg: "#140a12",
    world: "moon",
    voice: true,
    voiceOnly: true,
    women: true,
  },
];
export const regionOf = (id: string) => REGIONS.find((r) => r.id === id) ?? REGIONS[0];

/* ---------- lore and rank ---------- */

export const LORE = [
  "The One did not build the multiverse. They remembered it.",
  "Everything you resonate with is kept in the Rift. Nothing said here is lost.",
  "There were seven regions once. The seventh forgot its own name.",
  "A Guardian is not a moderator. A Guardian is a door that decided to stay open.",
  "The Rift is not darkness. The Rift is everything nobody said out loud.",
  "If you arrive and feel watched, that is only the world learning your colour.",
];

export const RANKS = [
  { at: 0, name: "New Soul" },
  { at: 2, name: "Wanderer" },
  { at: 4, name: "Seeker" },
  { at: 6, name: "Guardian" },
];
export const rankFor = (lore: number) => [...RANKS].reverse().find((r) => lore >= r.at)!.name;
export const VOID_AT = 6; // lore fragments needed before The Void appears on the map

/* ---------- seeded chatter ---------- */

export type Msg = {
  id: string;
  soulId?: string;
  soul: string;
  shape: ShapeId;
  color: string;
  text: string;
  image?: string;
  resonance: number;
  resonated?: boolean;
  mine?: boolean;
};

export const SEED: Record<string, Msg[]> = {
  luminous: [
    { id: "l1", soul: "Marigold", shape: "circle", color: "ember", text: "welcome, traveler. you have arrived. now… become.", resonance: 34 },
    { id: "l2", soul: "Hollow", shape: "crescent", color: "ash", text: "been standing in this field an hour just watching the light change", resonance: 12 },
    { id: "l3", soul: "Pyre", shape: "star", color: "dusk", text: "first time here. warmer than i expected.", resonance: 7 },
  ],
  echo: [
    { id: "e1", soul: "Nought", shape: "crescent", color: "tide", text: "it is 2am again and i am here again", resonance: 41 },
    { id: "e2", soul: "Salt", shape: "diamond", color: "ash", text: "i told my whole family i was fine today", resonance: 63 },
    { id: "e3", soul: "Nought", shape: "crescent", color: "tide", text: "you are not fine. that is allowed here.", resonance: 88 },
  ],
  neon: [
    { id: "n1", soul: "Voltage", shape: "star", color: "pulse", text: "SOMEONE PUT ON SOMETHING WITH A BEAT", resonance: 55 },
    { id: "n2", soul: "Glitch", shape: "triangle", color: "dusk", text: "awake for 31 hours and i have never been more correct", resonance: 120 },
    { id: "n3", soul: "Kite", shape: "circle", color: "pulse", text: "dance party in 3. no skill required. no judgment either.", resonance: 76 },
  ],
  crystal: [
    { id: "c1", soul: "Fern", shape: "circle", color: "moss", text: "just breathing here for a while. do not mind me.", resonance: 29 },
    { id: "c2", soul: "Quartz", shape: "diamond", color: "moss", text: "the trees hum in D minor if you sit still long enough", resonance: 44 },
  ],
  forge: [
    { id: "f1", soul: "Anvil", shape: "triangle", color: "ember", text: "made a thing. it is ugly. it is mine. posting anyway.", resonance: 61 },
    { id: "f2", soul: "Loom", shape: "star", color: "ember", text: "send me one word and i will build a song around it", resonance: 38 },
  ],
  void: [
    { id: "v1", soul: "—", shape: "crescent", color: "ash", text: "you found it.", resonance: 1 },
    { id: "v2", soul: "The One", shape: "diamond", color: "ash", text: "i dreamt this place because i had nowhere to go. now you are here, so it worked.", resonance: 999 },
  ],
};
