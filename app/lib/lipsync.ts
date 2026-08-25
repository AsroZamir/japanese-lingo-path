"use client";

import { useEffect, useRef, useState } from "react";
import type { SenseiLipSyncData } from "./sensei-query";

// PROMPT-11 Bagian 4 — connects an <audio> element's live playback
// position to a Rhubarb mouth-cue schedule. Polls via
// requestAnimationFrame while playing (mouth cues are ~40-200ms apart,
// far faster than a timeupdate event fires) and stops cleanly on pause/
// end. Returns "X" (closed/rest) whenever there's no schedule or
// nothing is playing — callers decide what "X" means visually (usually:
// don't render a mouth overlay at all).
export function useMouthCueSchedule(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  lipSyncData: SenseiLipSyncData | null,
): string {
  const [shape, setShape] = useState("X");
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    const cues = lipSyncData?.mouthCues;
    if (!audio || !cues || cues.length === 0) {
      setShape("X");
      return;
    }

    function tick() {
      const t = audio!.currentTime;
      const cue = cues!.find((c) => t >= c.start && t < c.end);
      setShape(cue?.value ?? "X");
      frameRef.current = requestAnimationFrame(tick);
    }

    function start() {
      if (frameRef.current == null) frameRef.current = requestAnimationFrame(tick);
    }
    function stop() {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      setShape("X");
    }

    audio.addEventListener("play", start);
    audio.addEventListener("pause", stop);
    audio.addEventListener("ended", stop);
    if (!audio.paused) start();

    return () => {
      audio.removeEventListener("play", start);
      audio.removeEventListener("pause", stop);
      audio.removeEventListener("ended", stop);
      stop();
    };
  }, [audioRef, lipSyncData]);

  return shape;
}

// PROMPT-11 Bagian 4 point 4 — "kedip mata otomatis: acak setiap 3-6
// detik, 120ms." Pure timing state; SenseiLayeredCharacter decides
// whether there's an eye-closed asset to actually show while `true`.
export function useAutoBlink(): boolean {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    let closeTimer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      const delay = 3000 + Math.random() * 3000;
      closeTimer = setTimeout(() => {
        setBlinking(true);
        openTimer = setTimeout(() => {
          setBlinking(false);
          scheduleNext();
        }, 120);
      }, delay);
    }
    scheduleNext();

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(openTimer);
    };
  }, []);

  return blinking;
}
