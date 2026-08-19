"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RomajiText } from "./RomajiText";
import { StrokeAnimation } from "./StrokeAnimation";
import { useAudioPlayer } from "./useAudioPlayer";
import type { KanaStrokeData } from "./stroke-geometry";

export type KanaChartCharacter = {
  id: number;
  character: string;
  romaji: string;
  groupCode: string | null;
  orderInGroup: number | null;
  audioUrl: string | null;
  strokeData: KanaStrokeData | null;
  /** Whether this character has already been introduced by the given phase — untaught characters render dimmed but stay fully clickable/hoverable. */
  taught: boolean;
};

export type KanaChartProps = {
  script: "hiragana" | "katakana";
  phase: string;
  characters: KanaChartCharacter[];
  /**
   * Fits the whole chart (all ~11 rows) into a fixed-height container —
   * used by M01's full-script preview slide, which has no scroll to
   * fall back on. Drops the component's own header (the caller supplies
   * its own slide title instead) and lets CSS flex divide the available
   * height/width across rows and cells, rather than the normal fixed
   * 56px cell size — a chart this tall can't use a fixed cell size
   * without overflowing a fixed-height slide.
   */
  dense?: boolean;
};

const SCRIPT_LABEL: Record<string, string> = { hiragana: "Hiragana", katakana: "Katakana" };
const LONG_PRESS_MS = 400;

function KanaCell({ item, dense }: { item: KanaChartCharacter; dense?: boolean }) {
  const { playing, toggle } = useAudioPlayer(item.audioUrl);
  const [previewOpen, setPreviewOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  function clearLongPress() {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  // Hover previews stroke order on desktop; on touch (no real hover)
  // a long-press does the same, while a quick tap plays audio instead —
  // resolves "klik → audio" and "tap → preview" both being asked for
  // without one swallowing the other.
  function handlePointerEnter(event: ReactPointerEvent) {
    if (event.pointerType === "mouse") setPreviewOpen(true);
  }
  function handlePointerLeave(event: ReactPointerEvent) {
    if (event.pointerType === "mouse") setPreviewOpen(false);
  }
  function handlePointerDown(event: ReactPointerEvent) {
    if (event.pointerType !== "touch") return;
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setPreviewOpen(true);
    }, LONG_PRESS_MS);
  }
  function handlePointerUp(event: ReactPointerEvent) {
    if (event.pointerType !== "touch") return;
    clearLongPress();
  }
  function handleClick() {
    if (longPressFired.current) {
      longPressFired.current = false;
      setPreviewOpen(false);
      return;
    }
    toggle();
  }

  return (
    <div
      className="kana-chart__cell-wrap"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={clearLongPress}
    >
      <button
        type="button"
        className={[
          "kana-chart__cell",
          dense && "kana-chart__cell--dense",
          !item.taught && "kana-chart__cell--untaught",
          playing && "kana-chart__cell--playing",
        ].filter(Boolean).join(" ")}
        onClick={handleClick}
        aria-label={`${item.character}, romaji ${item.romaji}${item.audioUrl ? "" : ", audio belum tersedia"}`}
      >
        {/* Dense mode is a compact map overview (matches the Moji "Peta
            Hiragana" reference) — kana glyph only, no romaji caption;
            RomajiText's global on/off preference is for study surfaces,
            not this overview moment. */}
        {dense ? item.character : <RomajiText kana={item.character} romaji={item.romaji} policy="always" />}
      </button>
      {previewOpen && (
        <div className="kana-chart__preview">
          <StrokeAnimation character={item.character} strokeData={item.strokeData} compact />
        </div>
      )}
    </div>
  );
}

export function KanaChart({ script, phase, characters, dense }: KanaChartProps) {
  const groups = new Map<string, KanaChartCharacter[]>();
  for (const item of characters) {
    const key = item.groupCode ?? "Lainnya";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const orderedKeys = [...groups.keys()].sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return a.localeCompare(b);
  });
  for (const key of orderedKeys) {
    groups.get(key)!.sort((a, b) => (a.orderInGroup ?? 0) - (b.orderInGroup ?? 0));
  }

  return (
    <div className={`kana-chart ${dense ? "kana-chart--dense" : ""}`}>
      {!dense && (
        <div className="kana-chart__header">
          <span className="kana-chart__eyebrow">{phase}</span>
          <h3>Tabel {SCRIPT_LABEL[script] ?? script}</h3>
        </div>
      )}
      <div className="kana-chart__groups">
        {orderedKeys.map((key) => (
          <div className="kana-chart__row" key={key}>
            <span className="kana-chart__row-label">{key}</span>
            <div className="kana-chart__row-cells">
              {groups.get(key)!.map((item) => <KanaCell key={item.id} item={item} dense={dense} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
