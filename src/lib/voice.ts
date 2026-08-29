"use client";

// Voice channels. Souls connect straight to each other over WebRTC and only use
// Supabase to find one another — so nothing anybody says passes through a server.
//
// ponytail: a full mesh, which is right for a handful of voices in a room. Past
// roughly eight it wants an SFU (LiveKit, Daily) instead of N² connections.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { client } from "@/lib/db";

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

const log = (...a: unknown[]) => console.info("U voice:", ...a);

export type Speaker = {
  id: string;
  name: string;
  color: string;
  shape: string;
  speaking: boolean;
  state: RTCPeerConnectionState | "self";
  me?: boolean;
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
) {
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [micOn, setMicOn] = useState(true);
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
  const who = useRef(new Map<string, Who>());
  const channel = useRef<RealtimeChannel | null>(null);
  const ac = useRef<AudioContext | null>(null);
  const raf = useRef(0);

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
        if (pc.connectionState === "failed")
          setError("could not reach the other side — a strict network needs a TURN server");
      };

      pc.ontrack = (e) => {
        const el = audios.current.get(peerId) ?? document.createElement("audio");
        el.autoplay = true;
        el.setAttribute("playsinline", "");
        el.srcObject = e.streams[0];
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
    [me, meter],
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
        now.push({
          id,
          ...w,
          speaking: read() > 0.045,
          state: id === tab() ? "self" : (states.current.get(id) ?? "new"),
          me: id === tab(),
        });
      });
      setSpeakers((prev) =>
        prev.length === now.length &&
        prev.every(
          (p, i) => p.id === now[i].id && p.speaking === now[i].speaking && p.state === now[i].state,
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
    setError(null);
  }, [teardown]);

  const toggleMic = useCallback(() => {
    const track = stream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  // walking out of a region hangs up on it
  useEffect(() => {
    return () => {
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  return { joined, connecting, micOn, speakers, error, join, leave, toggleMic };
}
