// Pure content-shaping helpers for M01's slide format (satu bingkai,
// tanpa scroll — lihat M01LessonView.tsx). Turns a flowing block of
// paragraphs/rows/items into groups that each fit a fixed-height slide,
// without ever splitting a single unit mid-way. A unit whose own word
// count already exceeds the budget becomes a solo slide — there is no
// wholesome way to cut a sentence in half, so this is reported rather
// than forced.
//
// Target range is 40-90 words/slide (Cacat E) — the old 40-word ceiling
// with no floor produced sparse, mostly-empty trailing slides (a lesson
// that should be 6-10 slides came out as 17). MIN_WORDS_PER_SLIDE is
// enforced by a merge pass below, not by the greedy packer itself.

export const MAX_WORDS_PER_SLIDE = 90;
export const MIN_WORDS_PER_SLIDE = 25;
export const MAX_TABLE_ROWS_PER_SLIDE = 5;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type TextUnit<T> = { text: string; payload: T };

/**
 * Greedily packs units up to `budget` words per group (never splitting a
 * unit), then merges any resulting group under `minBudget` words into a
 * neighboring group — a trailing single short paragraph no longer ends
 * up alone on its own near-empty slide.
 */
export function groupByWordBudget<T>(
  units: TextUnit<T>[],
  budget: number = MAX_WORDS_PER_SLIDE,
  minBudget: number = MIN_WORDS_PER_SLIDE,
): T[][] {
  const packed: { payloads: T[]; words: number }[] = [];
  let current: T[] = [];
  let currentWords = 0;
  for (const unit of units) {
    const w = wordCount(unit.text);
    if (current.length > 0 && currentWords + w > budget) {
      packed.push({ payloads: current, words: currentWords });
      current = [];
      currentWords = 0;
    }
    current.push(unit.payload);
    currentWords += w;
  }
  if (current.length > 0) packed.push({ payloads: current, words: currentWords });

  // Merge undersized groups backward into the previous one (a trailing
  // remainder is the common case); a too-small FIRST group has no
  // previous, so it merges forward into the next one instead.
  const merged: { payloads: T[]; words: number }[] = [];
  for (const group of packed) {
    const prev = merged[merged.length - 1];
    if (group.words < minBudget && prev) {
      prev.payloads.push(...group.payloads);
      prev.words += group.words;
    } else {
      merged.push({ payloads: [...group.payloads], words: group.words });
    }
  }
  if (merged.length > 1 && merged[0].words < minBudget) {
    const first = merged.shift()!;
    merged[0].payloads.unshift(...first.payloads);
    merged[0].words += first.words;
  }

  return merged.map((g) => g.payloads);
}

export function groupParagraphs(paragraphs: string[], budget: number = MAX_WORDS_PER_SLIDE): string[][] {
  return groupByWordBudget(
    paragraphs.map((p) => ({ text: p, payload: p })),
    budget,
  );
}

/** Groups arbitrary short units (e.g. roadmap steps) by combining each one's own text for the word count, same budget rule as groupParagraphs. */
export function groupUnits<T>(units: { text: string; payload: T }[], budget: number = MAX_WORDS_PER_SLIDE): T[][] {
  return groupByWordBudget(units, budget);
}

/** Chunks table rows into groups of at most `size` — table blocks split at max 3 rows per slide. */
export function chunkRows<T>(rows: T[], size: number = MAX_TABLE_ROWS_PER_SLIDE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}
