"use client";

import { useState } from "react";
import { AnalogClock } from "./AnalogClock";
import { japaneseTimeReading } from "@/app/lib/japanese-time";

export type ClockDemoProps = {
  heading?: string;
  instruction?: string;
  hour: number;
  minute: number;
  mode: "display" | "interactive";
  readingKanji?: string;
  readingRomaji?: string;
};

// Wraps AnalogClock with its reading label — "display" uses the
// author-provided reading (content-authored, matches the seeded
// example exactly); "interactive" derives the label live from
// japaneseTimeReading as the learner clicks, so it's always correct
// for whatever they set, not just the one seeded starting point.
export function ClockDemo({ heading, instruction, hour, minute, mode, readingKanji, readingRomaji }: ClockDemoProps) {
  const [liveHour, setLiveHour] = useState(hour);
  const [liveMinute, setLiveMinute] = useState(minute);
  const live = japaneseTimeReading(liveHour, liveMinute);
  const kanji = mode === "display" ? (readingKanji ?? live.kanji) : live.kanji;
  const romaji = mode === "display" ? (readingRomaji ?? live.romaji) : live.romaji;

  return (
    <div className="clock-demo">
      {heading && <h2 className="m01-slide__title">{heading}</h2>}
      {instruction && <p className="number-builder__instruction">{instruction}</p>}
      <AnalogClock
        hour={hour}
        minute={minute}
        mode={mode}
        onChange={(h, m) => {
          setLiveHour(h);
          setLiveMinute(m);
        }}
      />
      <div className="clock-demo__reading">
        <span className="clock-demo__reading-kanji">{kanji}</span>
        <span className="clock-demo__reading-romaji">{romaji}</span>
      </div>
    </div>
  );
}
