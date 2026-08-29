"use client";

// A world, rendered as a body rather than a dot: banded atmosphere, a texture that
// turns with the rotation, a lit limb, a terminator, rings where a world has them,
// moons where it has those. The Void is not a planet at all.

import { motion } from "motion/react";
import type { Region } from "@/lib/soul";

type Skin = {
  /** turns with the planet — this is what sells the rotation */
  texture: (r: Region) => string;
  /** stays put: the latitude banding */
  bands?: (r: Region) => string;
  spin: number; // seconds for one rotation
  moons?: { r: number; size: number; period: number; tint?: string }[];
  ring?: boolean;
  caps?: boolean;
};

const a = (hex: string, alpha: string) => `${hex}${alpha}`;

const SKINS: Record<Region["world"], Skin> = {
  gas: {
    spin: 46,
    texture: (r) => `
      radial-gradient(ellipse 34% 9% at 18% 26%, ${a(r.glow, "66")}, transparent 70%),
      radial-gradient(ellipse 26% 7% at 62% 52%, ${a(r.glow, "4d")}, transparent 70%),
      radial-gradient(ellipse 20% 6% at 88% 74%, #00000066, transparent 70%),
      radial-gradient(ellipse 16% 5% at 40% 82%, ${a(r.glow, "40")}, transparent 70%)`,
    bands: (r) => `repeating-linear-gradient(180deg,
      transparent 0 6%, #0000001f 6% 10%, transparent 10% 17%, ${a(r.glow, "1a")} 17% 21%)`,
    moons: [{ r: 1.5, size: 0.14, period: 26 }],
  },
  ocean: {
    spin: 58,
    texture: (r) => `
      radial-gradient(ellipse 30% 12% at 24% 34%, ${a(r.glow, "59")}, transparent 68%),
      radial-gradient(ellipse 22% 9% at 70% 62%, #ffffff33, transparent 70%),
      radial-gradient(ellipse 34% 8% at 50% 18%, ${a(r.glow, "33")}, transparent 72%),
      radial-gradient(ellipse 18% 7% at 88% 40%, #00000059, transparent 70%)`,
    bands: () => `repeating-linear-gradient(180deg, transparent 0 12%, #00000024 12% 16%)`,
  },
  storm: {
    spin: 13,
    texture: (r) => `
      radial-gradient(ellipse 20% 11% at 30% 58%, ${a(r.glow, "cc")}, transparent 62%),
      radial-gradient(ellipse 36% 7% at 66% 30%, ${a(r.glow, "80")}, transparent 70%),
      radial-gradient(ellipse 28% 6% at 12% 76%, #ffffff40, transparent 70%),
      radial-gradient(ellipse 22% 5% at 84% 82%, ${a(r.hex, "cc")}, transparent 70%)`,
    bands: (r) => `repeating-linear-gradient(178deg,
      transparent 0 4%, #00000033 4% 7%, transparent 7% 12%, ${a(r.glow, "26")} 12% 15%)`,
    ring: true,
  },
  ice: {
    spin: 74,
    caps: true,
    texture: (r) => `
      radial-gradient(ellipse 26% 14% at 28% 44%, #ffffff59, transparent 68%),
      radial-gradient(ellipse 18% 10% at 68% 60%, ${a(r.glow, "73")}, transparent 70%),
      radial-gradient(ellipse 14% 8% at 84% 30%, #ffffff40, transparent 70%)`,
    bands: () => `repeating-linear-gradient(180deg, transparent 0 14%, #ffffff14 14% 18%)`,
  },
  molten: {
    spin: 34,
    texture: (r) => `
      radial-gradient(ellipse 26% 3% at 26% 38%, #fff2d0, transparent 58%),
      radial-gradient(ellipse 18% 2% at 58% 66%, ${a(r.glow, "ee")}, transparent 58%),
      radial-gradient(ellipse 4% 14% at 78% 44%, #ffd9a0, transparent 60%),
      radial-gradient(ellipse 20% 3% at 44% 84%, ${a(r.glow, "dd")}, transparent 58%),
      radial-gradient(ellipse 5% 9% at 12% 70%, #ffcf8a, transparent 60%),
      radial-gradient(ellipse 14% 2% at 88% 22%, ${a(r.glow, "cc")}, transparent 58%),
      radial-gradient(ellipse 30% 24% at 50% 50%, #2a0f04cc, transparent 70%)`,
    bands: () => `radial-gradient(circle at 50% 50%, #1a0a03aa 0%, #1a0a0355 45%, #00000088 100%)`,
  },
  ringed: {
    spin: 52,
    ring: true,
    texture: (r) => `
      radial-gradient(ellipse 40% 5% at 30% 30%, ${a(r.glow, "59")}, transparent 72%),
      radial-gradient(ellipse 34% 4% at 66% 46%, #00000040, transparent 72%),
      radial-gradient(ellipse 28% 4% at 20% 62%, ${a(r.glow, "40")}, transparent 72%),
      radial-gradient(ellipse 22% 3% at 76% 74%, #0000004d, transparent 72%)`,
    bands: (r) => `repeating-linear-gradient(180deg,
      transparent 0 5%, #00000021 5% 8%, transparent 8% 14%, ${a(r.glow, "1f")} 14% 17%)`,
    moons: [{ r: 1.75, size: 0.1, period: 34 }],
  },
  moon: {
    spin: 120,
    texture: (r) => `
      radial-gradient(circle 8% at 32% 36%, #00000000 55%, ${a(r.glow, "cc")} 62%, transparent 72%),
      radial-gradient(circle 8% at 32% 36%, #4a3140aa, transparent 70%),
      radial-gradient(circle 5% at 58% 24%, #4a3140bb, transparent 72%),
      radial-gradient(circle 11% at 70% 63%, #00000000 58%, ${a(r.glow, "aa")} 66%, transparent 74%),
      radial-gradient(circle 11% at 70% 63%, #4a314099, transparent 70%),
      radial-gradient(circle 4% at 22% 68%, #4a314099, transparent 72%),
      radial-gradient(circle 6% at 86% 40%, #5a3c4f88, transparent 72%),
      radial-gradient(circle 3% at 46% 79%, #4a3140aa, transparent 72%),
      radial-gradient(ellipse 26% 16% at 50% 50%, #3d2836aa, transparent 70%)`,
  },
  blackhole: { spin: 1, texture: () => "" },
};

export default function Planet({
  region,
  reduce = false,
}: {
  region: Region;
  reduce?: boolean;
}) {
  if (region.world === "blackhole") return <BlackHole region={region} reduce={reduce} />;
  const skin = SKINS[region.world];

  return (
    <span className="pointer-events-none absolute inset-0 block">
      {/* the far half of the ring system, behind the body */}
      {skin.ring && <Rings region={region} half="back" reduce={reduce} />}

      <span className="absolute inset-0 block overflow-hidden rounded-full">
        {/* the ball itself, lit from the upper left */}
        <span
          className="absolute inset-0 block rounded-full"
          style={{
            background: `radial-gradient(circle at 32% 28%, ${region.glow}, ${region.hex} 42%, ${region.bg} 96%)`,
          }}
        />
        {/* surface, sliding round forever */}
        <motion.span
          className="absolute inset-y-0 block"
          style={{
            width: "200%",
            left: 0,
            backgroundImage: skin.texture(region),
            backgroundRepeat: "repeat-x",
            backgroundSize: "50% 100%",
          }}
          animate={reduce ? {} : { x: ["0%", "-50%"] }}
          transition={{ duration: skin.spin, repeat: Infinity, ease: "linear" }}
        />
        {/* latitudes stay where they are */}
        {skin.bands && (
          <span
            className="absolute inset-0 block"
            style={{ backgroundImage: skin.bands(region) }}
          />
        )}
        {/* frozen poles */}
        {skin.caps && (
          <span
            className="absolute inset-0 block"
            style={{
              background: `radial-gradient(ellipse 60% 16% at 50% -2%, #ffffffcc, transparent 70%),
                           radial-gradient(ellipse 56% 14% at 50% 102%, #ffffffb3, transparent 70%)`,
            }}
          />
        )}
        {/* night side */}
        <span
          className="absolute inset-0 block rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 26%, transparent 38%, #000000cc 96%)`,
          }}
        />
        {/* the sun on the shoulder */}
        <span
          className="absolute block rounded-full blur-md"
          style={{
            inset: "8% 52% 60% 12%",
            background: "radial-gradient(circle, #ffffff59, transparent 70%)",
          }}
        />
      </span>

      {/* atmosphere */}
      <span
        className="absolute -inset-[3%] block rounded-full"
        style={{ boxShadow: `inset 0 0 22px 2px ${a(region.glow, "40")}, 0 0 34px 4px ${a(region.hex, "38")}` }}
      />

      {/* the near half of the rings, drawn over the body */}
      {skin.ring && <Rings region={region} half="front" reduce={reduce} />}

      {skin.moons?.map((m, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 block"
          style={{ width: 0, height: 0 }}
          animate={reduce ? {} : { rotate: 360 }}
          transition={{ duration: m.period, repeat: Infinity, ease: "linear" }}
        >
          <span
            className="absolute block rounded-full"
            style={{
              width: `${m.size * 100}%`,
              aspectRatio: "1",
              left: `${m.r * 50}%`,
              top: `${-m.size * 50}%`,
              background: `radial-gradient(circle at 34% 30%, #f4f6ff, #8c93a8 60%, #2b2f3d)`,
              boxShadow: `0 0 8px ${a(region.hex, "66")}`,
            }}
          />
        </motion.span>
      ))}
    </span>
  );
}

/* ---------- rings ---------- */

function Rings({
  region,
  half,
  reduce,
}: {
  region: Region;
  half: "back" | "front";
  reduce: boolean;
}) {
  const bands = [
    { rx: 96, ry: 26, w: 13, o: 0.5 },
    { rx: 112, ry: 30, w: 8, o: 0.32 }, // outside the division
    { rx: 124, ry: 33, w: 4, o: 0.18 },
  ];
  return (
    <span
      className="absolute block"
      style={{
        inset: "-45%",
        // the near half is drawn over the planet, so only its lower part may show
        clipPath: half === "front" ? "inset(50% 0 0 0)" : undefined,
        zIndex: half === "front" ? 2 : 0,
      }}
    >
      <motion.svg
        viewBox="-160 -160 320 320"
        className="h-full w-full overflow-visible"
        style={{ transform: "rotate(-17deg)" }}
        animate={reduce ? {} : { opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id={`ring-${region.id}-${half}`} x1="0" x2="1">
            <stop offset="0%" stopColor={region.hex} stopOpacity="0.15" />
            <stop offset="35%" stopColor={region.glow} stopOpacity="0.95" />
            <stop offset="65%" stopColor={region.glow} stopOpacity="0.8" />
            <stop offset="100%" stopColor={region.hex} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {bands.map((b, i) => (
          <ellipse
            key={i}
            cx="0"
            cy="0"
            rx={b.rx}
            ry={b.ry}
            fill="none"
            stroke={`url(#ring-${region.id}-${half})`}
            strokeWidth={b.w}
            opacity={b.o}
          />
        ))}
      </motion.svg>
    </span>
  );
}

/** A tilted ellipse of burning matter. The shell is fixed; the matter spins inside it. */
function Disk({ reduce, front = false }: { reduce: boolean; front?: boolean }) {
  return (
    <span
      className="absolute block overflow-hidden rounded-[50%]"
      style={{
        inset: "33% -48%",
        transform: "rotate(-16deg)",
        clipPath: front ? "inset(48% 0 0 0)" : undefined,
        zIndex: front ? 3 : 0,
        maskImage: "radial-gradient(closest-side, transparent 34%, black 46%, black 92%, transparent)",
        WebkitMaskImage:
          "radial-gradient(closest-side, transparent 34%, black 46%, black 92%, transparent)",
      }}
    >
      <motion.span
        className="absolute block blur-[3px]"
        style={{
          inset: "-60%",
          background:
            "conic-gradient(from 0deg, #ff8a1f, #fff6dc, #ffd08a, #ff6a12, #ffb347, #fff0c8, #ff8a1f)",
        }}
        animate={reduce ? {} : { rotate: 360 }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />
      {/* the side turning towards us is beamed brighter */}
      <span
        className="absolute inset-0 block"
        style={{ background: "linear-gradient(90deg, #ffffffaa, transparent 45%, #00000066)" }}
      />
    </span>
  );
}

/* ---------- the thing at the centre that is not a world ---------- */

function BlackHole({ region, reduce }: { region: Region; reduce: boolean }) {
  const falling = [0, 1, 2, 3, 4, 5];
  return (
    <span className="pointer-events-none absolute inset-0 block">
      {/* accretion disk: the ring holds still, the matter inside it does not */}
      <Disk reduce={reduce} />

      {/* light from the far side, bent up and over the hole */}
      <motion.span
        className="absolute block rounded-[50%]"
        style={{
          inset: "8% 2% 46% 2%",
          border: "2px solid #ffdca8",
          borderBottomColor: "transparent",
          borderLeftColor: "#ffdca866",
          borderRightColor: "#ffdca866",
          filter: "blur(2.5px)",
        }}
        animate={reduce ? {} : { opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* the photon ring */}
      <motion.span
        className="absolute inset-[14%] block rounded-full"
        style={{
          boxShadow: `0 0 22px 5px #ffd9a0cc, inset 0 0 14px 3px #ffe9c9aa`,
          border: "1px solid #fff2d5",
        }}
        animate={reduce ? {} : { opacity: [0.75, 1, 0.75], scale: [1, 1.02, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* the event horizon: nothing comes back out of this */}
      <span
        className="absolute inset-[17%] block rounded-full"
        style={{ background: "#000", boxShadow: "inset 0 0 30px 8px #000" }}
      />

      {/* the near edge of the disk, passing in front of the hole */}
      <Disk reduce={reduce} front />

      {/* matter spiralling in */}
      {!reduce &&
        falling.map((i) => (
          <motion.span
            key={i}
            className="absolute top-1/2 left-1/2 block h-[3px] w-[3px] rounded-full"
            style={{ background: "#ffe6b8", boxShadow: "0 0 8px 2px #ffb347" }}
            animate={{
              x: [Math.cos(i) * 110, 0],
              y: [Math.sin(i) * 34, 0],
              opacity: [0, 1, 0],
              scale: [1, 0.2],
            }}
            transition={{ duration: 4 + i * 0.6, repeat: Infinity, delay: i * 0.7, ease: "easeIn" }}
          />
        ))}
    </span>
  );
}
