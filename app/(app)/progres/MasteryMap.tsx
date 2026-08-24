"use client";

import { useState } from "react";
import type { MasteryMapEntry } from "@/app/lib/mastery-map-query";
import { MASTERY_TIER_LABEL } from "@/app/lib/mastery-tier";

// Canonical gojuon row boundaries over the 46 basic-hiragana entries, in
// the same HIRAGANA_BASIC_CHARACTERS order mastery-map-query.ts already
// sorts by: あ(5) か(5) さ(5) た(5) な(5) は(5) ま(5) や(3) ら(5) わ(3).
const ROW_SIZES = [5, 5, 5, 5, 5, 5, 5, 3, 5, 3];

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function MasteryMap({ entries }: { entries: MasteryMapEntry[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const confusableChars = selected
    ? selected.confusableIds
        .map((id) => entries.find((entry) => entry.id === id)?.character)
        .filter((c): c is string => Boolean(c))
    : [];

  const rows: MasteryMapEntry[][] = [];
  let cursor = 0;
  for (const size of ROW_SIZES) {
    rows.push(entries.slice(cursor, cursor + size));
    cursor += size;
  }

  const tierCounts = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.tier] = (acc[entry.tier] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mastery-map">
      <div className="mastery-map__legend">
        {(Object.keys(MASTERY_TIER_LABEL) as Array<keyof typeof MASTERY_TIER_LABEL>).map((tier) => (
          <span key={tier} className={"mastery-map__legend-item is-" + tier}>
            <i /> {MASTERY_TIER_LABEL[tier]} ({tierCounts[tier] ?? 0})
          </span>
        ))}
      </div>

      <div className="mastery-map__grid">
        {rows.map((row, rowIndex) => (
          <div className="mastery-map__row" key={rowIndex}>
            {row.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className={"mastery-map__cell is-" + entry.tier + (selectedId === entry.id ? " is-selected" : "")}
                onClick={() => setSelectedId(entry.id === selectedId ? null : entry.id)}
              >
                {entry.character}
              </button>
            ))}
          </div>
        ))}
      </div>

      {selected && (
        <div className="mastery-map__detail">
          <div className="mastery-map__detail-glyph">{selected.character}</div>
          <div className="mastery-map__detail-body">
            <strong>
              {selected.character} · {selected.romaji}
            </strong>
            <span className={"mastery-map__tier-tag is-" + selected.tier}>
              {MASTERY_TIER_LABEL[selected.tier]}
            </span>
            <dl>
              <div><dt>Benar</dt><dd>{selected.correct}/{selected.attempts} ({selected.accuracyPercent}%)</dd></div>
              <div><dt>Streak saat ini</dt><dd>{selected.streak}</dd></div>
              <div><dt>Jadwal review berikutnya</dt><dd>{formatDate(selected.dueAt)}</dd></div>
              <div>
                <dt>Sering tertukar dengan</dt>
                <dd>{confusableChars.length > 0 ? confusableChars.join(", ") : "Tidak ada data"}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
