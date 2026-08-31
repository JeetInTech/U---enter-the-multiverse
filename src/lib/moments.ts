"use client";

// Scheduled live moments — synchronized multiverse events that bring souls together at set intervals.
// Includes The Silence, The Awakening, and Storytelling Night.

import { useEffect, useState } from "react";

export type LiveMoment = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  recommendedRegion: string;
  auraHex: string;
  auraGlow: string;
  durationMinutes: number;
};

export const MOMENTS: Record<string, LiveMoment> = {
  silence: {
    id: "silence",
    name: "The Silence",
    tagline: "A vow of stillness across all worlds",
    description: "Voice channels hush and words glow with a silver sheen. All souls pause in collective contemplation.",
    recommendedRegion: "echo",
    auraHex: "#71829d",
    auraGlow: "#d0d8e8",
    durationMinutes: 15,
  },
  awakening: {
    id: "awakening",
    name: "The Awakening",
    tagline: "The stars pulse in unison",
    description: "A radiant golden aura washes over the multiverse. Resonances glow with warmth and thoughts carry farther.",
    recommendedRegion: "luminous",
    auraHex: "#e89445",
    auraGlow: "#ffd9a8",
    durationMinutes: 20,
  },
  storytelling: {
    id: "storytelling",
    name: "Storytelling Night",
    tagline: "Gather where shadows speak",
    description: "Souls assemble to share secrets in the dark. Hidden lore fragments surface with greater intensity.",
    recommendedRegion: "darkroom",
    auraHex: "#9b72cf",
    auraGlow: "#e4ceff",
    durationMinutes: 20,
  },
};

const SCHEDULE_ORDER: LiveMoment[] = [
  MOMENTS.silence,
  MOMENTS.awakening,
  MOMENTS.storytelling,
];

// Events occur every 2 hours on the hour (e.g. 00:00, 02:00, 04:00... UTC)
const CYCLE_HOURS = 2;

export type MomentStatus = {
  active: LiveMoment | null;
  next: LiveMoment;
  startsInSeconds: number;
  endsInSeconds: number;
  displayText: string;
};

/** Calculate current live moment or countdown to the next scheduled moment. */
export function getMomentStatus(now: Date = new Date()): MomentStatus {
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();

  // Determine current 2-hour slot
  const slotIndex = Math.floor(utcHours / CYCLE_HOURS);
  const momentIndex = slotIndex % SCHEDULE_ORDER.length;
  const currentSlotMoment = SCHEDULE_ORDER[momentIndex];

  // Minutes into current 2-hour cycle
  const minutesIntoCycle = (utcHours % CYCLE_HOURS) * 60 + utcMinutes;
  const secondsIntoCycle = minutesIntoCycle * 60 + utcSeconds;
  const eventDurationSeconds = currentSlotMoment.durationMinutes * 60;

  if (secondsIntoCycle < eventDurationSeconds) {
    // Currently active
    const endsIn = eventDurationSeconds - secondsIntoCycle;
    const minsLeft = Math.ceil(endsIn / 60);
    return {
      active: currentSlotMoment,
      next: SCHEDULE_ORDER[(momentIndex + 1) % SCHEDULE_ORDER.length],
      startsInSeconds: 0,
      endsInSeconds: endsIn,
      displayText: `${currentSlotMoment.name} is happening now · ${minsLeft}m left`,
    };
  }

  // Not currently active — calculate time until next cycle
  const totalCycleSeconds = CYCLE_HOURS * 3600;
  const startsIn = totalCycleSeconds - secondsIntoCycle;
  const nextMoment = SCHEDULE_ORDER[(momentIndex + 1) % SCHEDULE_ORDER.length];

  const hoursLeft = Math.floor(startsIn / 3600);
  const minsLeft = Math.floor((startsIn % 3600) / 60);
  const timeStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${Math.max(1, minsLeft)}m`;

  return {
    active: null,
    next: nextMoment,
    startsInSeconds: startsIn,
    endsInSeconds: 0,
    displayText: `${nextMoment.name} begins in ${timeStr}`,
  };
}

/** React hook for real-time live moment tracking. */
export function useLiveMoment(): MomentStatus {
  const [status, setStatus] = useState<MomentStatus>(() => getMomentStatus());

  useEffect(() => {
    const tick = () => setStatus(getMomentStatus());
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return status;
}
