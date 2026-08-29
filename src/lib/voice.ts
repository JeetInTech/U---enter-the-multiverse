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

export type Speaker = {
  id: string;
  name: string;
  color: string;
  shape: string;
  speaking: boolean;
  me?: boolean;
};

type Signal =
  | { to: string; from: string; kind: "offer" | "answer"; sdp: RTCSessionDescriptionInit }
  | { to: string; from: string; kind: "ice"; candidate: RTCIceCandidateInit };

type Who = { name: string; color: string; shape: string };

export function useVoice(
  region: string,
  me: { id: string; name: string; color: string; shape: string } | null,
) {
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [error, setError] = useState<string | null>(null);

  const stream = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const audios = useRef(new Map<string, HTMLAudioElement>());
  const meters = useRef(new Map<string, () => number>());
  const who = useRef(new Map<string, Who>());
  const channel = useRef<RealtimeChannel | null>(null);
  const ac = useRef<AudioContext | null>(null);
  const raf = useRef(0);

  /** Attach a level meter to a stream so the ring can pulse when someone talks. */
  const meter = useCallback((id: string, s: MediaStream) => {
    ac.current ??= new AudioContext();
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

  const teardown = useCallback(() => {
    cancelAnimationFrame(raf.current);
    peers.current.forEach((p) => p.close());
    peers.current.clear();
    audios.current.forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    audios.current.clear();
    meters.current.clear();
    who.current.clear();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (channel.current) client()?.removeChannel(channel.current);
    channel.current = null;
    setSpeakers([]);
    setJoined(false);
  }, []);

  const connectTo = useCallback(
    (peerId: string, polite: boolean) => {
      const c = client();
      if (!c || peers.current.has(peerId) || !stream.current || !me) return;
      const pc = new RTCPeerConnection(ICE);
      peers.current.set(peerId, pc);
      stream.current.getTracks().forEach((t) => pc.addTrack(t, stream.current!));

      pc.onicecandidate = (e) => {
        if (e.candidate)
          channel.current?.send({
            type: "broadcast",
            event: "signal",
            payload: { to: peerId, from: me.id, kind: "ice", candidate: e.candidate.toJSON() },
          });
      };

      pc.ontrack = (e) => {
        const el = audios.current.get(peerId) ?? new Audio();
        el.autoplay = true;
        el.srcObject = e.streams[0];
        void el.play().catch(() => {});
        audios.current.set(peerId, el);
        meter(peerId, e.streams[0]);
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
              payload: { to: peerId, from: me.id, kind: "offer", sdp: offer },
            });
          })
          .catch(() => {});
    },
    [me, meter],
  );

  const join = useCallback(async () => {
    const c = client();
    if (!c || !me || joined || connecting) return;
    setConnecting(true);
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError("no microphone");
      setConnecting(false);
      return;
    }
    meter(me.id, stream.current);
    who.current.set(me.id, { name: me.name, color: me.color, shape: me.shape });

    const ch = c.channel(`voice:${region}`, {
      config: { presence: { key: me.id }, broadcast: { self: false } },
    });
    channel.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<Who>();
      const ids = Object.keys(state);
      for (const id of ids) {
        const w = state[id]?.[0];
        if (w) who.current.set(id, { name: w.name, color: w.color, shape: w.shape });
        if (id !== me.id) connectTo(id, id < me.id);
      }
      // whoever left takes their connection with them
      for (const id of [...peers.current.keys()])
        if (!ids.includes(id)) {
          peers.current.get(id)?.close();
          peers.current.delete(id);
          audios.current.get(id)?.remove();
          audios.current.delete(id);
          meters.current.delete(id);
        }
    });

    ch.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const sig = payload as Signal;
      if (sig.to !== me.id) return;
      let pc = peers.current.get(sig.from);
      if (!pc) {
        connectTo(sig.from, true);
        pc = peers.current.get(sig.from);
      }
      if (!pc) return;
      try {
        if (sig.kind === "offer") {
          await pc.setRemoteDescription(sig.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ch.send({
            type: "broadcast",
            event: "signal",
            payload: { to: sig.from, from: me.id, kind: "answer", sdp: answer },
          });
        } else if (sig.kind === "answer") {
          await pc.setRemoteDescription(sig.sdp);
        } else if (sig.kind === "ice" && pc.remoteDescription) {
          await pc.addIceCandidate(sig.candidate);
        }
      } catch {
        /* a late or duplicate signal; the next one will settle it */
      }
    });

    await ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED")
        await ch.track({ name: me.name, color: me.color, shape: me.shape });
    });

    // watch the levels so the room can show who is talking
    const tick = () => {
      raf.current = requestAnimationFrame(tick);
      const now: Speaker[] = [];
      meters.current.forEach((read, id) => {
        const w = who.current.get(id);
        if (!w) return;
        const loud = read() > 0.045;
        now.push({ id, ...w, speaking: loud, me: id === me.id });
      });
      setSpeakers((prev) =>
        prev.length === now.length &&
        prev.every((p, i) => p.id === now[i].id && p.speaking === now[i].speaking)
          ? prev
          : now,
      );
    };
    raf.current = requestAnimationFrame(tick);

    setJoined(true);
    setConnecting(false);
  }, [region, me, joined, connecting, connectTo, meter]);

  const leave = useCallback(() => {
    teardown();
    setMicOn(true);
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
