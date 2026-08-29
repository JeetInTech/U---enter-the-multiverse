"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import { AURAS, COLORS, SHAPES, SOUL_NAMES, TAGLINES, colorOf } from "@/lib/soul";

export type Soul = {
  name: string;
  tagline: string;
  shape: string;
  color: string;
  aura: string;
  /** self-declared, only ever asked at the door of a room that needs it */
  declared?: string | null;
};

const STEPS = ["Shape", "Colour", "Aura", "Name"] as const;

const PROMPT = [
  { k: "Choose a shape", v: "Not how you look. How you move through a room." },
  { k: "Choose a colour", v: "Whatever you happen to be today. It can change." },
  { k: "Choose an aura", v: "How your presence behaves when you are not speaking." },
  { k: "Choose a name", v: "Not your real one. The one that is actually true." },
];

export default function SoulForge({
  soul,
  setSoul,
  onDone,
}: {
  soul: Soul;
  setSoul: (s: Soul) => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const c = colorOf(soul.color);
  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };
  const ready = step < 3 || soul.name.trim().length > 0;

  return (
    <motion.div
      className="relative grid h-full w-full grid-cols-1 place-items-center gap-8 overflow-y-auto px-6 py-10 md:grid-cols-[1fr_1.1fr] md:px-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(12px)" }}
      transition={{ duration: 0.8 }}
    >
      {/* ---- the soul, becoming ---- */}
      <div className="relative flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 90, damping: 16, delay: 0.15 }}
        >
          <Avatar soul={soul} size={230} layoutId="me" />
        </motion.div>

        {/* live nameplate — no key swapping, so typing doesn't strobe */}
        <div className="mt-14 h-16 text-center">
          <motion.p
            className="font-display text-3xl tracking-wide"
            animate={{ color: c.glow }}
            transition={{ duration: 0.6 }}
          >
            {soul.name || "unnamed"}
          </motion.p>
          <p className="mt-2 text-sm italic text-mist/60">{soul.tagline}</p>
        </div>
      </div>

      {/* ---- the questions ---- */}
      <div className="w-full max-w-lg">
        {/* progress */}
        <div className="mb-10 flex gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => go(i)}
              className="group flex-1 text-left"
              aria-label={`Go to ${s}`}
            >
              <div className="relative h-px w-full bg-white/12">
                <motion.div
                  className="absolute inset-y-0 left-0"
                  style={{ background: c.glow }}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span
                className={`mt-2 block text-[0.6rem] uppercase tracking-[0.3em] transition-colors ${
                  i === step ? "text-white/90" : "text-mist/35 group-hover:text-mist/60"
                }`}
              >
                {s}
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40, filter: "blur(10px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: dir * -40, filter: "blur(10px)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-display text-4xl">{PROMPT[step].k}</h2>
            <p className="mt-2 mb-8 text-sm text-mist/55">{PROMPT[step].v}</p>

            {step === 0 && (
              <div className="flex flex-wrap gap-3">
                {SHAPES.map((s, i) => (
                  <Pick
                    key={s.id}
                    i={i}
                    active={soul.shape === s.id}
                    accent={c.hex}
                    onClick={() => setSoul({ ...soul, shape: s.id })}
                  >
                    <svg viewBox="0 0 100 100" className="h-9 w-9">
                      <path d={s.d} fill={soul.shape === s.id ? c.hex : "#8f9bb3"} />
                    </svg>
                    <Label title={s.name} sub={s.meaning} />
                  </Pick>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-wrap gap-3">
                {COLORS.map((col, i) => (
                  <Pick
                    key={col.id}
                    i={i}
                    active={soul.color === col.id}
                    accent={col.hex}
                    onClick={() => setSoul({ ...soul, color: col.id })}
                  >
                    <span
                      className="h-9 w-9 rounded-full"
                      style={{
                        background: `radial-gradient(circle at 32% 28%, ${col.glow}, ${col.hex})`,
                        boxShadow: `0 0 22px ${col.hex}88`,
                      }}
                    />
                    <Label title={col.name} sub={col.element} />
                  </Pick>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-wrap gap-3">
                {AURAS.map((a, i) => (
                  <Pick
                    key={a.id}
                    i={i}
                    active={soul.aura === a.id}
                    accent={c.hex}
                    onClick={() => setSoul({ ...soul, aura: a.id })}
                  >
                    <span className="relative grid h-9 w-9 place-items-center">
                      <span
                        className={`absolute inset-0 rounded-full blur-md aura-${a.id}`}
                        style={{ background: `radial-gradient(circle, ${c.glow}, transparent 70%)` }}
                      />
                      <span
                        className="relative h-3 w-3 rounded-full"
                        style={{ background: c.hex }}
                      />
                    </span>
                    <Label title={a.name} sub={a.meaning} />
                  </Pick>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <Field
                  label="Soul name"
                  value={soul.name}
                  accent={c.hex}
                  placeholder="something that is actually true"
                  onChange={(v) => setSoul({ ...soul, name: v.slice(0, 18) })}
                  chips={SOUL_NAMES}
                  onChip={(v) => setSoul({ ...soul, name: v })}
                />
                <Field
                  label="Tagline"
                  value={soul.tagline}
                  accent={c.hex}
                  placeholder="one sentence that captures your energy"
                  onChange={(v) => setSoul({ ...soul, tagline: v.slice(0, 48) })}
                  chips={TAGLINES}
                  onChip={(v) => setSoul({ ...soul, tagline: v })}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex items-center gap-4">
          {step > 0 && (
            <button
              onClick={() => go(step - 1)}
              className="text-xs uppercase tracking-[0.3em] text-mist/45 transition-colors hover:text-mist/80"
            >
              Back
            </button>
          )}
          <motion.button
            disabled={!ready}
            onClick={() => (step < 3 ? go(step + 1) : onDone())}
            className="group relative ml-auto overflow-hidden rounded-full px-9 py-3.5 text-xs uppercase tracking-[0.3em] text-black disabled:opacity-30"
            style={{ background: c.glow }}
            whileHover={{ scale: ready ? 1.04 : 1 }}
            whileTap={{ scale: ready ? 0.97 : 1 }}
          >
            <span className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 sheen" />
            <span className="relative">{step < 3 ? "Continue" : "Arrive"}</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- bits ---------- */

function Pick({
  children,
  active,
  accent,
  onClick,
  i,
}: {
  children: React.ReactNode;
  active: boolean;
  accent: string;
  onClick: () => void;
  i: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * i, type: "spring", stiffness: 220, damping: 22 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.96 }}
      className="relative flex min-w-[9.5rem] flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left backdrop-blur-sm transition-colors hover:border-white/25"
    >
      {active && (
        <motion.span
          layoutId="pick"
          className="absolute inset-0 rounded-2xl border"
          style={{ borderColor: accent, boxShadow: `0 0 26px ${accent}44, inset 0 0 26px ${accent}18` }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
        />
      )}
      <span className="relative flex items-center gap-3">{children}</span>
    </motion.button>
  );
}

const Label = ({ title, sub }: { title: string; sub: string }) => (
  <span className="relative block">
    <span className="block text-sm">{title}</span>
    <span className="block text-[0.68rem] text-mist/45">{sub}</span>
  </span>
);

function Field({
  label,
  value,
  onChange,
  placeholder,
  chips,
  onChip,
  accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  chips: string[];
  onChip: (v: string) => void;
  accent: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[0.6rem] uppercase tracking-[0.3em] text-mist/45">
        {label}
      </label>
      <div className="relative">
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-b border-white/15 bg-transparent pb-2 font-display text-2xl outline-none placeholder:text-mist/25 focus:border-transparent"
        />
        <motion.span
          className="absolute bottom-0 left-0 h-px w-full origin-left"
          style={{ background: accent }}
          initial={false}
          animate={{ scaleX: value ? 1 : 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((t) => (
          <button
            key={t}
            onClick={() => onChip(t)}
            className="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] text-mist/50 transition-colors hover:border-white/30 hover:text-white/80"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
