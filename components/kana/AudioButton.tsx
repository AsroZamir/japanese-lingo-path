"use client";

import { useEffect, useRef, useState } from "react";

export type AudioButtonProps = {
  url: string | null | undefined;
  autoplay?: boolean;
};

type LoadState = "loading" | "ready" | "error";

export function AudioButton({ url, autoplay = false }: AudioButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!url) return;

    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    // All state transitions happen inside these listener callbacks, not
    // synchronously in the effect body — .load() dispatches "loadstart"
    // as a queued task per the HTML spec, so even the initial "loading"
    // state arrives this way instead of an eager setState() call.
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
      // Browsers routinely block unmuted autoplay without a prior user
      // gesture — that rejection is expected, not a real load failure,
      // so it's swallowed rather than flipping state to "error".
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

  const effectiveState: LoadState | "unavailable" = url ? state : "unavailable";

  const handleClick = () => {
    const audio = audioRef.current;
    if (!audio || effectiveState !== "ready") return;
    if (playing) {
      audio.pause();
      audio.currentTime = 0;
    } else {
      audio.currentTime = 0;
      audio.play().catch(() => setState("error"));
    }
  };

  const disabled = effectiveState !== "ready";
  const tooltip =
    effectiveState === "unavailable" ? "Audio belum tersedia" :
    effectiveState === "error" ? "Audio gagal dimuat" :
    effectiveState === "loading" ? "Memuat audio…" :
    playing ? "Sedang memutar — klik untuk berhenti" : "Putar audio";

  return (
    <button
      type="button"
      className={`audio-button ${playing ? "audio-button--playing" : ""}`}
      onClick={handleClick}
      disabled={disabled}
      title={tooltip}
      aria-label={tooltip}
    >
      <span className="audio-button__icon" aria-hidden="true">{playing ? "■" : "▶"}</span>
    </button>
  );
}
