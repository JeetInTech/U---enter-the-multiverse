"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { colorOf, shapePath } from "@/lib/soul";

export type SoulLook = { shape: string; color: string; aura: string };

const morph = { type: "spring", stiffness: 110, damping: 16, mass: 0.7 } as const;

export default function Avatar({
  soul,
  size = 96,
  speaking = false,
  className = "",
  layoutId,
}: {
  soul: SoulLook;
  size?: number;
  speaking?: boolean;
  className?: string;
  layoutId?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const c = colorOf(soul.color);
  const reduce = useReducedMotion();

  return (
    <motion.div
      layoutId={layoutId}
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* aura — a soft field of the soul's colour, animated by CSS class */}
      <div
        className={`absolute rounded-full aura-${soul.aura} ${
          size < 64 ? "-inset-[22%] blur-md" : "-inset-[45%] blur-2xl"
        }`}
        style={{
          background: `radial-gradient(circle, ${c.glow}cc 0%, ${c.hex}55 38%, transparent 70%)`,
        }}
      />

      {/* the body */}
      <svg viewBox="0 0 100 100" className="relative h-full w-full overflow-visible">
        <defs>
          <radialGradient id={`f${gid}`} cx="35%" cy="28%" r="85%">
            <stop offset="0%" stopColor={c.glow} />
            <stop offset="55%" stopColor={c.hex} />
            <stop offset="100%" stopColor={c.hex} stopOpacity={0.55} />
          </radialGradient>
          <filter id={`b${gid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="g" />
            <feMerge>
              <feMergeNode in="g" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {speaking && !reduce && (
          <motion.path
            d={shapePath(soul.shape)}
            fill="none"
            stroke={c.glow}
            strokeWidth={1.5}
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            style={{ transformOrigin: "50px 50px" }}
          />
        )}

        <motion.path
          initial={{ d: shapePath(soul.shape) }}
          animate={{ d: shapePath(soul.shape) }}
          transition={morph}
          fill={`url(#f${gid})`}
          filter={`url(#b${gid})`}
        />
        <motion.path
          initial={{ d: shapePath(soul.shape) }}
          animate={{ d: shapePath(soul.shape) }}
          transition={morph}
          fill="none"
          stroke={c.glow}
          strokeOpacity={0.75}
          strokeWidth={1}
        />
      </svg>
    </motion.div>
  );
}
