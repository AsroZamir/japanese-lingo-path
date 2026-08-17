"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { medianLength, medianPathD, type KanaStrokeData } from "./stroke-geometry";

export type { KanaStrokeData };

export type StrokeAnimationProps = {
  character: string;
  strokeData: KanaStrokeData | null;
  /** Playback speed multiplier — 1 = normal, 2 = twice as fast, 0.5 = half speed. */
  speed?: number;
  showGrid?: boolean;
  /** Hides the control bar and shrinks the canvas, for embedding as a hover/tap preview (e.g. KanaChart) rather than as the main practice view. Autoplays once since there's no play button to press. */
  compact?: boolean;
};

const BASE_STROKE_DURATION_MS = 500;
const MASK_STROKE_WIDTH = 180;
const GUIDE_OPACITY = 0.12;
const STROKE_FILL = "#1a2b45";

function GridBackground() {
  return (
    <g className="stroke-animation__grid" stroke="#c9d4e3" strokeWidth={2} fill="none">
      <rect x={12} y={12} width={1000} height={1000} />
      <line x1={512} y1={12} x2={512} y2={1012} strokeDasharray="8 10" />
      <line x1={12} y1={512} x2={1012} y2={512} strokeDasharray="8 10" />
      <line x1={12} y1={12} x2={1012} y2={1012} strokeDasharray="8 10" />
      <line x1={1012} y1={12} x2={12} y2={1012} strokeDasharray="8 10" />
    </g>
  );
}

export function StrokeAnimation({ character, strokeData, speed = 1, showGrid = false, compact = false }: StrokeAnimationProps) {
  const maskId = useId();
  const [revealedCount, setRevealedCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [slowMotion, setSlowMotion] = useState(false);
  const lastTsRef = useRef<number | null>(null);

  const totalStrokes = strokeData?.strokes.length ?? 0;

  // Recomputed only when the character's data actually changes — without
  // this, every animation-frame progress update would re-derive every
  // stroke's median path string and length on each of the ~60 renders/sec.
  const medianData = useMemo(() => {
    if (!strokeData) return [];
    return strokeData.medians.map((points) => ({ d: medianPathD(points), length: medianLength(points) }));
  }, [strokeData]);

  // Reset to the start whenever a different character's data comes in.
  // Adjusted during render (React's documented pattern for "reset state
  // when a prop changes") rather than in an effect, so it's not an
  // effect-body setState call at all.
  const [prevStrokeData, setPrevStrokeData] = useState(strokeData);
  if (strokeData !== prevStrokeData) {
    setPrevStrokeData(strokeData);
    setRevealedCount(0);
    setProgress(0);
    setPlaying(compact); // compact mode has no play button, so it autoplays once instead
  }

  useEffect(() => {
    // Bail out with no setState call when already finished — "playing"
    // only ever gets corrected to false from inside the rAF callback
    // below, once a stroke completion actually reaches the total.
    if (!playing || !strokeData || revealedCount >= totalStrokes) return;

    const effectiveSpeed = speed * (slowMotion ? 0.35 : 1);
    const durationMs = BASE_STROKE_DURATION_MS / effectiveSpeed;
    let frame: number;

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const delta = ts - lastTsRef.current;
      lastTsRef.current = ts;

      setProgress((prev) => {
        const next = prev + delta / durationMs;
        if (next >= 1) {
          setRevealedCount((count) => {
            const newCount = count + 1;
            if (newCount >= totalStrokes) setPlaying(false);
            return newCount;
          });
          lastTsRef.current = null;
          return 0;
        }
        return next;
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      lastTsRef.current = null;
    };
  }, [playing, revealedCount, totalStrokes, speed, slowMotion, strokeData]);

  if (!strokeData) {
    return (
      <div className="stroke-animation stroke-animation--empty">
        <span className="stroke-animation__placeholder-char">{character}</span>
        <p>Data stroke belum tersedia untuk karakter ini.</p>
      </div>
    );
  }

  const handlePlay = () => setPlaying(true);
  const handlePause = () => setPlaying(false);
  const handleRestart = () => {
    setRevealedCount(0);
    setProgress(0);
    setPlaying(true);
  };
  const handleStep = () => {
    setPlaying(false);
    setProgress(0);
    setRevealedCount((count) => Math.min(count + 1, totalStrokes));
  };

  const currentMedian = medianData[revealedCount];
  const isDone = revealedCount >= totalStrokes;

  return (
    <div className={`stroke-animation ${compact ? "stroke-animation--compact" : ""}`}>
      <svg viewBox="0 0 1024 1024" className="stroke-animation__svg" role="img" aria-label={`Animasi urutan coretan ${character}`}>
        {showGrid && <GridBackground />}
        <g transform="scale(1, -1) translate(0, -900)">
          <g opacity={GUIDE_OPACITY}>
            {strokeData.strokes.map((d, i) => (
              <path key={`guide-${i}`} d={d} fill={STROKE_FILL} />
            ))}
          </g>
          {strokeData.strokes.slice(0, revealedCount).map((d, i) => (
            <path key={`done-${i}`} d={d} fill={STROKE_FILL} />
          ))}
          {!isDone && currentMedian && (
            <>
              <mask id={maskId}>
                <path
                  d={currentMedian.d}
                  stroke="white"
                  strokeWidth={MASK_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={currentMedian.length || 1}
                  strokeDashoffset={(currentMedian.length || 1) * (1 - progress)}
                />
              </mask>
              <path d={strokeData.strokes[revealedCount]} fill={STROKE_FILL} mask={`url(#${maskId})`} />
            </>
          )}
        </g>
      </svg>

      {!compact && (
        <div className="stroke-animation__controls">
          <button type="button" onClick={playing ? handlePause : handlePlay} disabled={isDone && !playing} aria-label={playing ? "Jeda" : "Putar"}>
            {playing ? "⏸" : "▶"}
          </button>
          <button type="button" onClick={handleRestart} aria-label="Ulang dari awal">↻</button>
          <button
            type="button"
            onClick={() => setSlowMotion((prev) => !prev)}
            aria-pressed={slowMotion}
            className={slowMotion ? "stroke-animation__control--active" : ""}
            aria-label="Slow motion"
          >
            0.35x
          </button>
          <button type="button" onClick={handleStep} disabled={isDone} aria-label="Maju satu coretan">⏭</button>
          <span className="stroke-animation__count">
            {Math.min(revealedCount + (progress > 0 ? 1 : 0), totalStrokes)}/{totalStrokes}
          </span>
        </div>
      )}
    </div>
  );
}
