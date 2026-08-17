"use client";

import { useEffect, useRef, useState } from "react";

export type AudioPlayerState = "unavailable" | "loading" | "ready" | "error";

export function useAudioPlayer(url: string | null | undefined, options?: { autoplay?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<Exclude<AudioPlayerState, "unavailable">>("loading");
  const [playing, setPlaying] = useState(false);
  const autoplay = options?.autoplay ?? false;

  useEffect(() => {
    if (!url) return;

    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    // All state transitions happen inside these listener callbacks, not
    // synchronously in the effect body — see AudioButton for the fuller
    // explanation of why (react-hooks/set-state-in-effect).
    const handleLoadStart = () => setState("loading");
    const handleCanPlay = () => setState("ready");
    const handleError = () => setState("error");
    const handlePlay = () => setPlaying(true);
    const handleStop = () => setPlaying(false);

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplaythrough", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("ended", handleStop);
    audio.addEventListener("pause", handleStop);

    audio.src = url;
    audio.load();

    if (autoplay) {
      audio.play().catch(() => {});
    }

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplaythrough", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("ended", handleStop);
      audio.removeEventListener("pause", handleStop);
      audio.pause();
      audioRef.current = null;
    };
  }, [url, autoplay]);

  const effectiveState: AudioPlayerState = url ? state : "unavailable";

  function toggle() {
    const audio = audioRef.current;
    if (!audio || effectiveState !== "ready") return;
    if (playing) {
      audio.pause();
      audio.currentTime = 0;
    } else {
      audio.currentTime = 0;
      audio.play().catch(() => setState("error"));
    }
  }

  return { state: effectiveState, playing, toggle };
}
