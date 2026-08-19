"use client";

import { useEffect, useRef, useState } from "react";

const AUTO_NARRATION_KEY = "moji-auto-narration";

function readAutoPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUTO_NARRATION_KEY) === "1";
  } catch {
    return false;
  }
}

// Floats over the slide stage (positioned by the caller), never
// autoplays by default — only if the learner has explicitly opted into
// "Auto" before, which persists in localStorage. Someone who just wants
// to read must never be interrupted by sound they didn't ask for.
export function NarrationButton({ url }: { url: string | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  // Lazy initializer, not an effect — this only ever needs to run once,
  // on mount, and readAutoPreference() already guards the SSR case
  // (window undefined -> false), so there's no synchronization concern
  // an effect would actually be for here.
  const [auto, setAuto] = useState(() => readAutoPreference());

  useEffect(() => {
    if (!url) return;
    const audio = new Audio(url);
    audioRef.current = audio;
    const onEnded = () => setPlaying(false);
    audio.addEventListener("ended", onEnded);
    if (readAutoPreference()) {
      audio.play().then(() => setPlaying(true)).catch(() => {
        // Autoplay blocked by the browser — the button is still there as a fallback.
      });
    }
    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [url]);

  if (!url) return null;

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function toggleAuto() {
    const next = !auto;
    setAuto(next);
    try {
      window.localStorage.setItem(AUTO_NARRATION_KEY, next ? "1" : "0");
    } catch {
      // localStorage unavailable (private mode, etc.) — preference just won't persist.
    }
  }

  return (
    <div className="m01-narration">
      <button
        type="button"
        className={`m01-narration__play ${playing ? "is-playing" : ""}`}
        onClick={togglePlay}
        aria-label={playing ? "Hentikan narasi" : "Putar narasi penjelasan"}
      >
        {playing ? "■" : "▶"}
      </button>
      <button
        type="button"
        className={`m01-narration__auto ${auto ? "is-on" : ""}`}
        onClick={toggleAuto}
        aria-pressed={auto}
        aria-label="Putar narasi otomatis di tiap slide"
        title="Putar narasi otomatis"
      >
        Auto
      </button>
    </div>
  );
}
