"use client";

// Speak instead of typing. The browser's own recogniser — no keys, no upload,
// nothing leaves the device except the words you decide to send.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Recogniser = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const Ctor = (): (new () => Recogniser) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, new () => Recogniser>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const NEVER_CHANGES = () => () => {};

export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  // the server has no speech recogniser, so it must answer false and agree on hydration
  const supported = useSyncExternalStore(NEVER_CHANGES, () => Boolean(Ctor()), () => false);
  const ref = useRef<Recogniser | null>(null);
  const sink = useRef(onText);
  useEffect(() => {
    sink.current = onText;
  }, [onText]);

  const stop = useCallback(() => {
    ref.current?.stop();
    ref.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const C = Ctor();
    if (!C || ref.current) return;
    const r = new C();
    r.continuous = false;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    r.onresult = (e) => {
      let said = "";
      for (let i = e.resultIndex; i < e.results.length; i++) said += e.results[i][0].transcript;
      sink.current(said.trim());
    };
    r.onerror = () => stop();
    r.onend = () => {
      ref.current = null;
      setListening(false);
    };
    ref.current = r;
    setListening(true);
    r.start();
  }, [stop]);

  useEffect(() => () => ref.current?.stop(), []);

  return { listening, supported, start, stop, toggle: () => (listening ? stop() : start()) };
}
