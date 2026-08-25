"use client";

import { useState } from "react";
import type { VocabMasteryEntry } from "@/app/lib/vocab-mastery-query";
import { MASTERY_TIER_LABEL } from "@/app/lib/mastery-tier";

// PROMPT-11 Bagian 5 — vocab-engine equivalent of MasteryMap.tsx. A grid
// of single characters doesn't fit ~100+ multi-character words, so this
// is a grouped list instead — but the core requirement is the same as
// the kana map's tier badges: recognition and production shown as TWO
// separate badges per word, never merged into one score, so a word
// strong in one direction and weak in the other is visible at a glance.
export function VocabMasteryList({ moduleTitle, entries }: { moduleTitle: string; entries: VocabMasteryEntry[] }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const categories = [...new Set(entries.map((entry) => entry.category))];

  return (
    <div className="vocab-mastery-list">
      <h3 className="mastery-map__section-title">{moduleTitle}</h3>
      {categories.map((category) => {
        const items = entries.filter((entry) => entry.category === category);
        const isOpen = openCategory === category;
        return (
          <div className="vocab-mastery-list__category" key={category}>
            <button type="button" className="vocab-mastery-list__category-header" onClick={() => setOpenCategory(isOpen ? null : category)}>
              <span>{category}</span>
              <small>{items.length} kata</small>
            </button>
            {isOpen && (
              <div className="vocab-mastery-list__rows">
                {items.map((item) => (
                  <div className="vocab-mastery-list__row" key={item.id}>
                    <div className="vocab-mastery-list__word">
                      <strong>{item.termKana}</strong>
                      <span>{item.reading} — {item.meaningId}</span>
                    </div>
                    <div className="vocab-mastery-list__badges">
                      <span className={"vocab-mastery-list__badge is-" + item.recognition.tier}>
                        Kenal: {MASTERY_TIER_LABEL[item.recognition.tier]}
                      </span>
                      <span className={"vocab-mastery-list__badge is-" + item.production.tier}>
                        Pakai: {MASTERY_TIER_LABEL[item.production.tier]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
