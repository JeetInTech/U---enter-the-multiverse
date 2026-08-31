"use client";

import { useEffect, useRef } from "react";

type P = { x: number; y: number; z: number; r: number; tw: number };

type Constellation = {
  name: string;
  cx: number;
  cy: number;
  scale: number;
  stars: [number, number, number][]; // [relX, relY, sizeMultiplier]
  edges: [number, number][];
};

const CONSTELLATIONS: Constellation[] = [
  // 1. Ursa Major (Big Dipper) - Top Left
  {
    name: "URSA MAJOR",
    cx: 0.12,
    cy: 0.15,
    scale: 1.1,
    stars: [
      [-22, 6, 1.4],   // Dubhe
      [-20, 24, 1.2],  // Merak
      [2, 22, 1.1],    // Phecda
      [4, 2, 1.0],     // Megrez
      [22, -6, 1.3],   // Alioth
      [36, -12, 1.2],  // Mizar
      [52, -6, 1.4],   // Alkaid
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  // 2. Cassiopeia (The Celestial W) - Top Right
  {
    name: "CASSIOPEIA",
    cx: 0.88,
    cy: 0.14,
    scale: 1.1,
    stars: [
      [-36, -10, 1.3], // Segin
      [-18, 14, 1.2],  // Ruchbah
      [0, -4, 1.5],    // Gamma Cas
      [18, 16, 1.3],   // Schedar
      [36, -6, 1.4],   // Caph
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  // 3. Orion (The Hunter) - Bottom Right
  {
    name: "ORION",
    cx: 0.91,
    cy: 0.78,
    scale: 1.15,
    stars: [
      [-18, -32, 1.6], // Betelgeuse (Alpha Orionis)
      [18, -28, 1.4],  // Bellatrix
      [-7, -2, 1.2],   // Alnitak
      [0, 0, 1.3],     // Alnilam
      [7, 2, 1.2],     // Mintaka
      [-16, 32, 1.3],  // Saiph
      [18, 30, 1.7],   // Rigel (Beta Orionis)
      [0, -44, 0.9],   // Meissa (Head)
    ],
    edges: [
      [7, 0],
      [7, 1],
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 4],
      [2, 5],
      [4, 6],
      [5, 6],
    ],
  },
  // 4. Cygnus (The Northern Cross) - Bottom Left
  {
    name: "CYGNUS",
    cx: 0.08,
    cy: 0.76,
    scale: 1.1,
    stars: [
      [0, -32, 1.6],  // Deneb
      [0, 2, 1.4],    // Sadr
      [0, 34, 1.3],   // Albireo
      [-28, -6, 1.3], // Gienah
      [28, -4, 1.2],  // Delta Cygni
    ],
    edges: [
      [0, 1],
      [1, 2],
      [3, 1],
      [1, 4],
    ],
  },
  // 5. Taurus & Pleiades - Upper Right Mid
  {
    name: "TAURUS",
    cx: 0.93,
    cy: 0.42,
    scale: 1.0,
    stars: [
      [0, 6, 1.7],     // Aldebaran
      [22, -22, 1.3],  // Elnath
      [24, 18, 1.2],   // Tianguan
      [-14, -6, 1.1],  // Hyades
      [-32, -18, 1.4], // Pleiades Cluster
    ],
    edges: [
      [0, 1],
      [0, 2],
      [0, 3],
      [3, 4],
    ],
  },
];

/**
 * Drifting dust and real celestial constellations that the whole multiverse sits inside.
 * Tints to the current region and can warp forward when you step through a portal.
 */
export default function Starfield({
  color = "#dbe4ff",
  warp = 0,
  count = 220,
}: {
  color?: string;
  warp?: number; // 0 = drifting, 1 = falling through the world
  count?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const warpRef = useRef(warp);
  const colorRef = useRef(color);

  useEffect(() => {
    warpRef.current = warp;
    colorRef.current = color;
  }, [warp, color]);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const dots: P[] = [];
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let warpEase = 0;
    let raf = 0;

    const seed = () => {
      dots.length = 0;
      for (let i = 0; i < count; i++)
        dots.push({
          x: Math.random(),
          y: Math.random(),
          z: 0.15 + Math.random() * 0.85,
          r: 0.4 + Math.random() * 1.5,
          tw: Math.random() * Math.PI * 2,
        });
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      warpEase += (warpRef.current - warpEase) * 0.06;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      // Clean background wipe
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(0,0,0,${0.18 + (1 - warpEase) * 0.82})`;
      ctx.fillRect(0, 0, w, h);

      const activeColor = colorRef.current;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.001);

      // ---- 1. RENDER REAL CONSTELLATIONS IN DEEP SPACE ----
      if (warpEase < 0.8) {
        ctx.globalCompositeOperation = "lighter";
        const cDepth = 0.35; // Parallax depth in deep background
        const offX = -pointer.x * 22 * cDepth;
        const offY = -pointer.y * 22 * cDepth;
        const constAlpha = (1 - warpEase) * (reduce ? 0.35 : 0.22 + 0.12 * pulse);

        for (const c of CONSTELLATIONS) {
          const baseX = c.cx * w + offX;
          const baseY = c.cy * h + offY;

          // Calculate absolute screen positions for all stars in constellation
          const positions = c.stars.map(([sx, sy, sz]) => ({
            x: baseX + sx * c.scale,
            y: baseY + sy * c.scale,
            size: (1.2 + sz * 1.1),
          }));

          // Draw celestial connection lines
          ctx.strokeStyle = activeColor;
          ctx.lineWidth = 0.75;
          ctx.globalAlpha = constAlpha * 0.45;
          ctx.beginPath();
          for (const [s1, s2] of c.edges) {
            const p1 = positions[s1];
            const p2 = positions[s2];
            if (p1 && p2) {
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
            }
          }
          ctx.stroke();

          // Draw constellation star nodes with soft halos
          for (let si = 0; si < positions.length; si++) {
            const p = positions[si];
            const starTwinkle = reduce ? 0.8 : 0.6 + 0.4 * Math.sin(t * 0.0015 + si * 1.5);

            // Outer soft aura
            ctx.fillStyle = activeColor;
            ctx.globalAlpha = constAlpha * 0.3 * starTwinkle;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2);
            ctx.fill();

            // Core star
            ctx.fillStyle = "#ffffff";
            ctx.globalAlpha = constAlpha * 0.9 * starTwinkle;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.95, 0, Math.PI * 2);
            ctx.fill();
          }

          // Delicate celestial label
          ctx.fillStyle = activeColor;
          ctx.globalAlpha = constAlpha * 0.28;
          ctx.font = "500 8px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(c.name, baseX, baseY + 48 * c.scale);
        }
      }

      // ---- 2. RENDER DRIFTING PARTICLES & WARP STREAKS ----
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = activeColor;
      const cx = w / 2;
      const cy = h / 2;

      for (const p of dots) {
        p.y -= (0.00004 + 0.00012 * p.z) * (reduce ? 0 : 1);
        if (p.y < -0.05) p.y = 1.05;

        const px = p.x * w - pointer.x * 26 * p.z;
        const py = p.y * h - pointer.y * 26 * p.z;

        if (warpEase > 0.01) {
          const dx = px - cx;
          const dy = py - cy;
          const k = 1 + warpEase * 0.9 * p.z;
          const ex = cx + dx * k;
          const ey = cy + dy * k;
          ctx.strokeStyle = activeColor;
          ctx.globalAlpha = 0.5 * p.z * warpEase;
          ctx.lineWidth = p.r * 0.9;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }

        const twinkle = reduce ? 0.6 : 0.45 + 0.55 * Math.sin(t * 0.0012 + p.tw);
        ctx.globalAlpha = 0.12 + 0.5 * p.z * twinkle;
        ctx.beginPath();
        ctx.arc(px, py, p.r * (0.6 + p.z), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    resize();
    seed();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [count]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

