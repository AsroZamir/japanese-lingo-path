"use client";

import { useState } from "react";

type NumberOption = { label: string; kanji: string; romaji: string; value: number };

export type NumberBuilderProps = {
  heading?: string;
  instruction?: string;
  tensOptions: NumberOption[];
  onesOptions: NumberOption[];
};

// M04 Fase 1 L02 — teaches 11-99's compositional pattern (二十一 =
// 二十 + 一, concatenated directly) by having the learner assemble it,
// rather than a table of 90 entries to memorize. Pure client-side demo,
// same spirit as DialogueBlock.tsx — not graded, no user_kana_attempts
// write; the graded check lives in a separate lesson_exercises row.
export function NumberBuilder({ heading, instruction, tensOptions, onesOptions }: NumberBuilderProps) {
  const [tensValue, setTensValue] = useState<number | null>(null);
  const [onesValue, setOnesValue] = useState<number | null>(null);

  const tens = tensOptions.find((t) => t.value === tensValue);
  const ones = onesOptions.find((o) => o.value === onesValue);
  const hasSelection = tens != null || ones != null;
  const total = (tens?.value ?? 0) + (ones?.value ?? 0);
  const composedKanji = `${tens?.kanji ?? ""}${ones?.kanji ?? ""}`;
  const composedRomaji = `${tens?.romaji ?? ""}${ones?.romaji ?? ""}`;

  return (
    <div className="number-builder">
      {heading && <h2 className="m01-slide__title">{heading}</h2>}
      {instruction && <p className="number-builder__instruction">{instruction}</p>}

      <div className="number-builder__result" aria-live="polite">
        {hasSelection && total > 0 ? (
          <>
            <span className="number-builder__result-kanji">{composedKanji}</span>
            <span className="number-builder__result-romaji">{composedRomaji}</span>
            <span className="number-builder__result-value">= {total}</span>
          </>
        ) : (
          <span className="number-builder__result-placeholder">Pilih puluhan dan satuan di bawah</span>
        )}
      </div>

      <div className="number-builder__group">
        <p className="eyebrow">Puluhan</p>
        <div className="number-builder__options">
          {tensOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`exercise-runner__option ${tensValue === opt.value ? "is-selected" : ""}`}
              onClick={() => setTensValue(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="number-builder__group">
        <p className="eyebrow">Satuan</p>
        <div className="number-builder__options">
          {onesOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`exercise-runner__option ${onesValue === opt.value ? "is-selected" : ""}`}
              onClick={() => setOnesValue(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
