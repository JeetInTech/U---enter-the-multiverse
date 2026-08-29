"use client";

// Speak instead of typing. The browser's own recogniser — no keys, no upload,
// nothing leaves the device except the words you decide to send.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Result = ArrayLike<{ transcript: string }> & { isFinal: boolean };

type Recogniser = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<Result> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

const Ctor = (): (new () => Recogniser) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, new () => Recogniser>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const SAYS: Record<string, string> = {
  "not-allowed": "microphone blocked — allow it in the address bar",
  "service-not-allowed": "this browser will not allow dictation here",
  network: "the recogniser could not reach the network",
  "audio-capture": "no microphone found",
  "no-speech": "did not catch that",
  aborted: "",
};

const NEVER_CHANGES = () => () => {};

export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // the server has no speech recogniser, so it must answer false and agree on hydration
  const supported = useSyncExternalStore(NEVER_CHANGES, () => Boolean(Ctor()), () => false);

  const ref = useRef<Recogniser | null>(null);
  const settled = useRef(""); // everything already recognised for good
  const sink = useRef(onText);
  useEffect(() => {
    sink.current = onText;
  }, [onText]);

  const stop = useCallback(() => {
    const r = ref.current;
    ref.current = null;
    setListening(false);
    try {
      r?.stop();
    } catch {
      /* it had already stopped */
    }
  }, []);

  const start = useCallback(() => {
    const C = Ctor();
    if (!C) return setError("this browser cannot listen");
    if (ref.current) return;
    setError(null);
    settled.current = "";

    const r = new C();
    // keep listening until told otherwise, so a long sentence survives a pause
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.lang = navigator.language || "en-US";

    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) settled.current += res[0].transcript;
        else live += res[0].transcript;
      }
      sink.current((settled.current + live).trim());
    };

    r.onerror = (e) => {
      const said = SAYS[e.error] ?? `dictation stopped (${e.error})`;
      if (said) setError(said);
      if (e.error !== "no-speech") stop();
    };

    r.onend = () => {
      ref.current = null;
      setListening(false);
    };

    ref.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      // start() throws if one is already running; drop it and let the user retry
      ref.current = null;
      setListening(false);
      setError("dictation was already running — try again");
    }
  }, [stop]);

  useEffect(
    () => () => {
      try {
        ref.current?.abort();
      } catch {
        /* nothing was listening */
      }
    },
    [],
  );

  return {
    listening,
    supported,
    error,
    start,
    stop,
    toggle: () => (listening ? stop() : start()),
  };
}
