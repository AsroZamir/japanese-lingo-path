"use client";

import { useRef, useState } from "react";
import type { SenseiSegmentRow } from "@/app/lib/sensei-query";
import { SenseiWritingDemo } from "./SenseiWritingDemo";
import { SenseiLayeredCharacter } from "./SenseiLayeredCharacter";

// PROMPT-9/10 — the generic "papan tulis" presentation player.
// Module-agnostic on purpose: takes whatever segments the caller fetched
// (module_intro / phase_intro+concept_moment / a single writing_demo) and
// steps through them. Teks selalu tampil; narasi otomatis diputar saat
// "Lanjut" (PROMPT-10 Bagian 3). Audio playback is triggered IMPERATIVELY
// inside each click handler (not via a useEffect reacting to state) —
// browsers only allow audio.play() without user-gesture friction when
// it's called synchronously inside the gesture's own handler; going
// through an effect adds a React commit + microtask hop that some
// browsers no longer count as "in response to" the click. Segment 0
// specifically needs an explicit "Mulai penjelasan" click first — that's
// the one gesture that unlocks audio for the rest of this presentation,
// since the page load itself was never a user gesture.
export function SenseiBoard({
  segments,
  onFinish,
  finishLabel = "Mulai belajar",
}: {
  segments: SenseiSegmentRow[];
  onFinish: () => void;
  finishLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  // "diingat selama sesi" (Bagian 3) — sessionStorage so muting on one
  // presentation (e.g. module_intro) carries into the next one opened
  // later in the same browser tab (e.g. a phase_intro), not just within
  // this single mount. Lazy initializer (not an effect) since this only
  // needs to run once, before the first render matters.
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("sensei-muted") === "1";
    } catch {
      return false;
    }
  });
  const [audioState, setAudioState] = useState<"idle" | "playing" | "unavailable">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segment = segments.length > 0 ? segments[index] : null;

  function playSegment(target: SenseiSegmentRow) {
    const audio = audioRef.current;
    if (!audio || !target.narrationUrl) {
      setAudioState(target.narrationUrl ? "idle" : "unavailable");
      return;
    }
    audio.pause();
    audio.src = target.narrationUrl;
    audio.currentTime = 0;
    audio.play().then(
      () => setAudioState("playing"),
      () => setAudioState("idle"), // blocked or file missing — text stays readable regardless
    );
  }

  if (!segment) return null;
  const isLast = index === segments.length - 1;

  function handleStartAudio() {
    setStarted(true);
    if (!muted) playSegment(segment!);
  }

  function goTo(nextIndex: number) {
    // "Lanjut" is itself a fresh user gesture — it autoplays the next
    // segment's narration even if the learner skipped segment 0's
    // explicit gate and went straight to clicking through.
    const next = segments[nextIndex];
    setIndex(nextIndex);
    setStarted(true);
    if (!muted) playSegment(next);
    else audioRef.current?.pause();
  }

  function replay() {
    playSegment(segment!);
  }

  function toggleMute() {
    setMuted((value) => {
      const next = !value;
      if (next) audioRef.current?.pause();
      try {
        sessionStorage.setItem("sensei-muted", next ? "1" : "0");
      } catch {
        // Ignore — worst case the preference doesn't carry to the next presentation.
      }
      return next;
    });
  }

  return (
    <div className="sensei-board">
      <audio ref={audioRef} onEnded={() => setAudioState("idle")} onError={() => setAudioState("unavailable")}>
        <track kind="captions" />
      </audio>
      <div className="sensei-board__stage">
        <SenseiLayeredCharacter pose={segment.senseiPose} audioRef={audioRef} lipSyncData={segment.lipSyncData} />
        <div className="sensei-board__board">
          <div className="sensei-board__visual">
            {segment.visualAction.kind === "glyph" && (
              <div className="sensei-board__glyph">
                <span>{segment.visualAction.char}</span>
                {segment.visualAction.label && <small>{segment.visualAction.label}</small>}
              </div>
            )}
            {segment.visualAction.kind === "table" && (
              <table className="sensei-board__table">
                <thead>
                  <tr>
                    {segment.visualAction.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {segment.visualAction.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {segment.visualAction.kind === "compare" && (
              <div className="sensei-board__compare">
                {segment.visualAction.items.map((item) => (
                  <div className="sensei-board__compare-item" key={item.label}>
                    <b>{item.label}</b>
                    <span className="sensei-board__compare-example">{item.example}</span>
                    {item.note && <small>{item.note}</small>}
                  </div>
                ))}
              </div>
            )}
            {segment.visualAction.kind === "write_char" && segment.kanaCharacter && (
              <SenseiWritingDemo character={segment.kanaCharacter} strokeDataUrl={segment.strokeDataUrl} />
            )}
          </div>
          <p key={"text-" + segment.id} className="sensei-board__text sensei-board__text--written">
            {segment.boardText}
          </p>
          <div className="sensei-board__narration">
            {!started && !muted ? (
              <button type="button" className="sensei-board__start-audio" onClick={handleStartAudio}>
                🔊 Mulai penjelasan
              </button>
            ) : (
              <>
                <button type="button" className="sensei-board__narration-toggle" onClick={toggleMute} aria-pressed={muted}>
                  {muted ? "🔇 Suara mati" : "🔊 Suara nyala"}
                </button>
                {!muted && segment.narrationUrl && (
                  <button type="button" className="sensei-board__replay" onClick={replay} disabled={audioState === "unavailable"}>
                    ↺ Putar ulang
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="sensei-board__controls">
        <div className="sensei-board__dots" role="progressbar" aria-valuemin={1} aria-valuemax={segments.length} aria-valuenow={index + 1}>
          {segments.map((s, i) => (
            <span key={s.id} className={i === index ? "is-active" : i < index ? "is-done" : ""} />
          ))}
          <small>{index + 1}/{segments.length}</small>
        </div>
        <div className="sensei-board__actions">
          <button type="button" className="secondary-button" onClick={onFinish}>
            Lewati
          </button>
          <button type="button" className="primary-button" onClick={() => (isLast ? onFinish() : goTo(index + 1))}>
            {isLast ? finishLabel : "Lanjut →"}
          </button>
        </div>
      </div>
    </div>
  );
}
