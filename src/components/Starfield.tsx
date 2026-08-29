"use client";

import { useEffect, useRef } from "react";

type P = { x: number; y: number; z: number; r: number; tw: number };

/**
 * Drifting dust that the whole multiverse sits inside. Tints to the current
 * region and can warp forward when you step through a portal.
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
  // keep the render loop's inputs current without restarting it
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

      // trails during warp, clean wipe otherwise
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(0,0,0,${0.18 + (1 - warpEase) * 0.82})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = colorRef.current;

      const cx = w / 2;
      const cy = h / 2;
      for (const p of dots) {
        // slow ambient drift; parallax by depth
        p.y -= (0.00004 + 0.00012 * p.z) * (reduce ? 0 : 1);
        if (p.y < -0.05) p.y = 1.05;

        const px = p.x * w - pointer.x * 26 * p.z;
        const py = p.y * h - pointer.y * 26 * p.z;

        if (warpEase > 0.01) {
          // push outward from centre, leaving a streak
          const dx = px - cx;
          const dy = py - cy;
          const k = 1 + warpEase * 0.9 * p.z;
          const ex = cx + dx * k;
          const ey = cy + dy * k;
          ctx.strokeStyle = colorRef.current;
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
