"use client";

import { useState } from "react";

export type WordArrangeStatus = "idle" | "correct" | "incorrect";

export type WordArrangeProps = {
  /** Scrambled tile pool — one entry per tappable tile, duplicates allowed (kept as separate tiles by index, not deduped by character). */
  characters: string[];
  disabled?: boolean;
  status: WordArrangeStatus;
  /** Fires with the joined string of tiles placed so far, in order. */
  onChange: (value: string) => void;
};

export function WordArrange({ characters, disabled, status, onChange }: WordArrangeProps) {
  const [placed, setPlaced] = useState<number[]>([]);

  function emit(next: number[]) {
    setPlaced(next);
    onChange(next.map((i) => characters[i]).join(""));
  }

  function place(i: number) {
    if (disabled || placed.includes(i)) return;
    emit([...placed, i]);
  }

  function removeAt(pos: number) {
    if (disabled) return;
    emit(placed.filter((_, p) => p !== pos));
  }

  function clear() {
    if (disabled || placed.length === 0) return;
    emit([]);
  }

  return (
    <div className={`word-arrange word-arrange--${status}`}>
      <div className="word-arrange__build">
        {placed.length === 0 && <span className="word-arrange__build-placeholder">Ketuk huruf di bawah…</span>}
        {placed.map((i, pos) => (
          <button
            key={pos}
            type="button"
            className="word-arrange__tile word-arrange__tile--placed"
            onClick={() => removeAt(pos)}
            disabled={disabled}
          >
            {characters[i]}
          </button>
        ))}
      </div>
      <div className="word-arrange__bank">
        {characters.map((c, i) => (
          <button
            key={i}
            type="button"
            className="word-arrange__tile"
            onClick={() => place(i)}
            disabled={disabled || placed.includes(i)}
          >
            {c}
          </button>
        ))}
      </div>
      {!disabled && placed.length > 0 && (
        <button type="button" className="word-arrange__clear" onClick={clear}>Hapus semua</button>
      )}
    </div>
  );
}
