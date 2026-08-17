"use client";

import { useState } from "react";
import { useRomajiPreference, type RomajiPolicy } from "./RomajiPreferenceContext";

export type RomajiTextProps = {
  kana: string;
  romaji: string;
  /** Per-instance default. A global user preference (RomajiPreferenceProvider) overrides this when set to anything but "follow_content". */
  policy?: RomajiPolicy;
};

export function RomajiText({ kana, romaji, policy = "on_demand" }: RomajiTextProps) {
  const { preference } = useRomajiPreference();
  const effectivePolicy: RomajiPolicy = preference === "follow_content" ? policy : preference;
  const [revealed, setRevealed] = useState(false);

  if (effectivePolicy === "hidden") {
    return <span className="romaji-text">{kana}</span>;
  }

  if (effectivePolicy === "always") {
    return (
      <span className="romaji-text">
        {kana}
        <small className="romaji-text__romaji">{romaji}</small>
      </span>
    );
  }

  return (
    <button
      type="button"
      className="romaji-text romaji-text--toggle"
      onClick={() => setRevealed((prev) => !prev)}
      aria-pressed={revealed}
      aria-label={revealed ? `${kana}, romaji ${romaji}, tap untuk sembunyikan` : `${kana}, tap untuk lihat romaji`}
    >
      {kana}
      <small className={`romaji-text__romaji ${revealed ? "" : "romaji-text__romaji--hidden"}`}>{romaji}</small>
    </button>
  );
}
