"use client";

// Voice channels. Souls connect straight to each other over WebRTC and only use
// Supabase to find one another — so nothing anybody says passes through a server.
//
// ponytail: a full mesh, which is right for a handful of voices in a room. Past
// roughly eight it wants an SFU (LiveKit, Daily) instead of N² connections.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { client } from "@/lib/db";

// STUN only tells each side its public address. When both sides sit behind a NAT
// that rewrites ports per destination — mobile data, most campus and office wifi —
// there is no direct path to find and ICE fails outright. A TURN server relays the
// stream instead. It cannot listen in: WebRTC media is encrypted end to end (DTLS-SRTP),
// so a relay only ever forwards ciphertext.
const TURN_URL = process.env.NEXT_PUBLIC_TURN_URL;
const TURN_USER = process.env.NEXT_PUBLIC_TURN_USER;
const TURN_PASS = process.env.NEXT_PUBLIC_TURN_PASS;

export const hasRelay = Boolean(TURN_URL);

const RELAYS: RTCIceServer[] = TURN_URL
  ? [{ urls: TURN_URL.split(","), username: TURN_USER, credential: TURN_PASS }]
  : [];

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ...RELAYS,
  ],
  iceCandidatePoolSize: 4,
};

const log = (...a: unknown[]) => console.info("U voice:", ...a);

export type Speaker = {
  /** this tab's handle in the call — one soul in two tabs is two speakers */
  id: string;
  /** the soul behind the tab; muting follows this, so it survives a reconnect */
  soul: string;
  name: string;
  color: string;
  shape: string;
  speaking: boolean;
  state: RTCPeerConnectionState | "self";
  me?: boolean;
  /** you silenced this one for yourself; they carry on talking to everybody else */
  muted?: boolean;
};

type Signal =
  | { to: string; from: string; kind: "offer" | "answer"; sdp: RTCSessionDescriptionInit }
  | { to: string; from: string; kind: "ice"; candidate: RTCIceCandidateInit };

type Who = { soul: string; name: string; color: string; shape: string };

/**
 * Remote audio has to live in the document. A detached `new Audio()` will happily
 * take a WebRTC srcObject and then play absolutely nothing — and an AnalyserNode
 * built from that same stream reads pure silence. Both go quiet together, which
 * looks exactly like "it is sending but nobody hears it".
 */
function sink(): HTMLElement {
  let el = document.getElementById("u-voice-sink");
  if (!el) {
    el = document.createElement("div");
    el.id = "u-voice-sink";
    el.style.cssText = "position:fixed;width:0;height:0;overflow:hidden;pointer-events:none";
    document.body.appendChild(el);
  }
  return el;
}

export function useVoice(
  region: string,
  me: { id: string; name: string; color: string; shape: string } | null,
  /**
   * Souls this one has blocked. Blocking used to hide only their words, which
   * left them audible in the same voice channel — the one place it matters most.
   * They are silenced here and never appear in the room at all.
   */
  blockedIds: Set<string> = new Set(),
) {
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [deafened, setDeafened] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [error, setError] = useState<string | null>(null);

  // This tab's own handle in the call. Two tabs of one browser share a Supabase
  // session and therefore a soul id; keyed by that they collapse into a single
  // presence entry and never discover each other — the call looks live and is silent.
  const selfId = useRef<string | null>(null);
  const tab = () => (selfId.current ??= crypto.randomUUID());

  const stream = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const pending = useRef(new Map<string, RTCIceCandidateInit[]>());
  const audios = useRef(new Map<string, HTMLAudioElement>());
  const meters = useRef(new Map<string, () => number>());
  const states = useRef(new Map<string, RTCPeerConnectionState>());
  const retried = useRef(new Set<string>());
  const kinds = useRef(new Set<string>());
  const who = useRef(new Map<string, Who>());
  const channel = useRef<RealtimeChannel | null>(null);
  const ac = useRef<AudioContext | null>(null);
  const raf = useRef(0);
  // the animation loop and the ontrack handler read these; the setters below keep
  // them in step, so nothing has to touch a ref during render
  /** souls you silenced, by soul id so it survives them rejoining on a new tab */
  const muteRef = useRef<Set<string>>(new Set());
  const deafRef = useRef(false);
  // blocks can change while a call is open, so the loop reads the latest set
  const blockRef = useRef(blockedIds);

  /** Everything that makes one voice inaudible to you, in one place. */
  const silenced = useCallback(
    (soulId: string) =>
      deafRef.current || muteRef.current.has(soulId) || blockRef.current.has(soulId),
    [],
  );

  // blocking someone mid-call should take effect on that call, not the next one
  useEffect(() => {
    blockRef.current = blockedIds;
    audios.current.forEach((el, id) => (el.muted = silenced(who.current.get(id)?.soul ?? "")));
  }, [blockedIds, silenced]);

  /** Attach a level meter so the ring can pulse when someone actually talks. */
  const meter = useCallback((id: string, s: MediaStream) => {
    ac.current ??= new AudioContext();
    // a context born suspended reads flat silence forever, and every ring stays dark
    if (ac.current.state === "suspended") void ac.current.resume();
    const src = ac.current.createMediaStreamSource(s);
    const node = ac.current.createAnalyser();
    node.fftSize = 512;
    src.connect(node);
    const buf = new Uint8Array(node.frequencyBinCount);
    meters.current.set(id, () => {
      node.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += (v - 128) ** 2;
      return Math.sqrt(sum / buf.length) / 128;
    });
  }, []);

  const drop = useCallback((id: string) => {
    peers.current.get(id)?.close();
    peers.current.delete(id);
    pending.current.delete(id);
    const el = audios.current.get(id);
    if (el) {
      el.srcObject = null;
      el.remove();
    }
    audios.current.delete(id);
    meters.current.delete(id);
    states.current.delete(id);
  }, []);

  const teardown = useCallback(() => {
    cancelAnimationFrame(raf.current);
    [...peers.current.keys()].forEach(drop);
    retried.current.clear();
    kinds.current.clear();
    who.current.clear();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (channel.current) client()?.removeChannel(channel.current);
    channel.current = null;
    setSpeakers([]);
    setJoined(false);
  }, [drop]);

  const connectTo = useCallback(
    (peerId: string, polite: boolean) => {
      if (peers.current.has(peerId) || !stream.current || !me) return;
      const pc = new RTCPeerConnection(ICE);
      peers.current.set(peerId, pc);
      states.current.set(peerId, "new");
      stream.current.getTracks().forEach((t) => pc.addTrack(t, stream.current!));

      pc.onicecandidate = (e) => {
        // knowing which kinds were gathered is the whole diagnosis when a call fails:
        // host = same network, srflx = through NAT, relay = via TURN
        if (e.candidate?.type && !kinds.current.has(e.candidate.type)) {
          kinds.current.add(e.candidate.type);
          log("gathered", e.candidate.type, "candidate");
        }
        if (e.candidate)
          channel.current?.send({
            type: "broadcast",
            event: "signal",
            payload: {
              to: peerId,
              from: tab(),
              kind: "ice",
              candidate: e.candidate.toJSON(),
            },
          });
      };

      pc.onconnectionstatechange = () => {
        states.current.set(peerId, pc.connectionState);
        log(peerId.slice(0, 6), pc.connectionState);
        if (pc.connectionState !== "failed") return;

        // one ICE restart before giving up — the first attempt often fails while
        // relay candidates are still being gathered
        if (!polite && !retried.current.has(peerId)) {
          retried.current.add(peerId);
          log("retrying", peerId.slice(0, 6), "with an ice restart");
          pc.restartIce();
          void pc
            .createOffer({ iceRestart: true })
            .then(async (offer) => {
              await pc.setLocalDescription(offer);
              channel.current?.send({
                type: "broadcast",
                event: "signal",
                payload: { to: peerId, from: tab(), kind: "offer", sdp: offer },
              });
            })
            .catch(() => {});
          return;
        }
        setError(
          kinds.current.has("relay")
            ? "could not reach the other side even through the relay"
            : hasRelay
              ? "this network blocked the call and the relay did not answer"
              : "this network needs a relay (TURN) that is not configured yet — see the README",
        );
      };

      pc.ontrack = (e) => {
        const el = audios.current.get(peerId) ?? document.createElement("audio");
        el.autoplay = true;
        el.setAttribute("playsinline", "");
        el.srcObject = e.streams[0];
        // a soul you already silenced must not start talking again on reconnect
        el.muted = silenced(who.current.get(peerId)?.soul ?? "");
        sink().appendChild(el); // it must be in the document to make any sound
        audios.current.set(peerId, el);
        el.play().catch(() => setError("tap anywhere to let this page play sound"));
        meter(peerId, e.streams[0]);
        log("hearing", peerId.slice(0, 6));
      };

      // the soul with the smaller id makes the first move, so nobody collides
      if (!polite)
        void pc
          .createOffer()
          .then(async (offer) => {
            await pc.setLocalDescription(offer);
            channel.current?.send({
              type: "broadcast",
              event: "signal",
              payload: { to: peerId, from: tab(), kind: "offer", sdp: offer },
            });
            log("offered to", peerId.slice(0, 6));
          })
          .catch((e) => log("offer failed", e));
    },
    [me, meter, silenced],
  );

  /** Candidates that arrived before the description they belong to. */
  const flush = useCallback(async (id: string, pc: RTCPeerConnection) => {
    const queued = pending.current.get(id);
    if (!queued) return;
    pending.current.delete(id);
    for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
  }, []);

  const join = useCallback(async () => {
    const c = client();
    if (joined || connecting) return;
    if (!c) return setError("this build has no database, so there is nobody to call");
    if (!me) return setError("your soul has not finished arriving — reload and try again");
    setConnecting(true);
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      setError(
        (e as Error).name === "NotAllowedError"
          ? "microphone blocked — allow it in the address bar"
          : "no microphone found",
      );
      setConnecting(false);
      return;
    }
    meter(tab(), stream.current);
    who.current.set(tab(), {
      soul: me.id,
      name: me.name,
      color: me.color,
      shape: me.shape,
    });

    const ch = c.channel(`voice:${region}`, {
      config: { presence: { key: tab() }, broadcast: { self: false } },
    });
    channel.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<Who>();
      const ids = Object.keys(state);
      for (const id of ids) {
        const w = state[id]?.[0];
        if (w)
          who.current.set(id, { soul: w.soul, name: w.name, color: w.color, shape: w.shape });
        if (id !== tab()) connectTo(id, id < tab());
      }
      for (const id of [...peers.current.keys()]) if (!ids.includes(id)) drop(id);
    });

    ch.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const sig = payload as Signal;
      if (sig.to !== tab()) return;
      let pc = peers.current.get(sig.from);
      if (!pc && sig.kind === "offer") {
        connectTo(sig.from, true);
        pc = peers.current.get(sig.from);
      }
      if (!pc) return;
      try {
        if (sig.kind === "offer") {
          await pc.setRemoteDescription(sig.sdp);
          await flush(sig.from, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ch.send({
            type: "broadcast",
            event: "signal",
            payload: { to: sig.from, from: tab(), kind: "answer", sdp: answer },
          });
          log("answered", sig.from.slice(0, 6));
        } else if (sig.kind === "answer") {
          await pc.setRemoteDescription(sig.sdp);
          await flush(sig.from, pc);
        } else if (sig.kind === "ice") {
          if (pc.remoteDescription) await pc.addIceCandidate(sig.candidate);
          // it got here early; hold it until there is something to attach it to
          else
            pending.current.set(sig.from, [
              ...(pending.current.get(sig.from) ?? []),
              sig.candidate,
            ]);
        }
      } catch (e) {
        log("signal ignored", sig.kind, (e as Error).message);
      }
    });

    ch.subscribe(async (status) => {
      log("channel", status);
      if (status === "SUBSCRIBED")
        await ch.track({ soul: me.id, name: me.name, color: me.color, shape: me.shape });
      if (status === "CHANNEL_ERROR") setError("could not reach the room");
    });

    // watch the levels so the room can show who is talking
    const tick = () => {
      raf.current = requestAnimationFrame(tick);
      const now: Speaker[] = [];
      meters.current.forEach((read, id) => {
        const w = who.current.get(id);
        if (!w) return;
        // blocked souls are gone from the room, not merely quiet in it
        if (id !== tab() && blockRef.current.has(w.soul)) return;
        now.push({
          id,
          ...w,
          speaking: read() > 0.045,
          state: id === tab() ? "self" : (states.current.get(id) ?? "new"),
          me: id === tab(),
          muted: id !== tab() && muteRef.current.has(w.soul),
        });
      });
      setSpeakers((prev) =>
        prev.length === now.length &&
        prev.every(
          (p, i) =>
            p.id === now[i].id &&
            p.speaking === now[i].speaking &&
            p.state === now[i].state &&
            p.muted === now[i].muted,
        )
          ? prev
          : now,
      );
    };
    raf.current = requestAnimationFrame(tick);

    setJoined(true);
    setConnecting(false);
  }, [region, me, joined, connecting, connectTo, meter, drop, flush]);

  const leave = useCallback(() => {
    teardown();
    setMicOn(true);
    deafRef.current = false;
    setDeafened(false);
    setError(null);
  }, [teardown]);

  const setMic = useCallback((on: boolean) => {
    const track = stream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = on;
    setMicOn(on);
  }, []);

  const toggleMic = useCallback(() => {
    // coming off deaf by unmuting is what everyone expects, so undeafen with it
    if (!micOn) setDeafened(false);
    setMic(!micOn);
  }, [micOn, setMic]);

  /**
   * Deafen: stop hearing the room. Your own microphone goes with it, because
   * talking to people you cannot hear is the one thing nobody means to do.
   */
  const toggleDeafen = useCallback(() => {
    const now = !deafRef.current;
    deafRef.current = now;
    setDeafened(now);
    audios.current.forEach(
      (el, id) => (el.muted = now || silenced(who.current.get(id)?.soul ?? "")),
    );
    setMic(!now);
  }, [setMic, silenced]);

  /** Silence one soul, for you only. They never learn, which is the point. */
  const toggleMuteSoul = useCallback((soulId: string) => {
    const next = new Set(muteRef.current);
    if (next.has(soulId)) next.delete(soulId);
    else next.add(soulId);
    // no state needed: the level loop below rebuilds every speaker each frame
    // and only re-renders when a flag like this one actually changed
    muteRef.current = next;
    audios.current.forEach(
      (el, id) => (el.muted = silenced(who.current.get(id)?.soul ?? "")),
    );
  }, [silenced]);

  // walking out of a region hangs up on it
  useEffect(() => {
    return () => {
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  return {
    joined,
    connecting,
    micOn,
    deafened,
    speakers,
    error,
    join,
    leave,
    toggleMic,
    toggleDeafen,
    toggleMuteSoul,
  };
}
