// Pure content-shaping helpers for M01's slide format (satu bingkai,
// tanpa scroll — lihat M01LessonView.tsx). Turns a flowing block of
// paragraphs/rows/items into groups that each fit a fixed-height slide,
// without ever splitting a single unit mid-way. A unit whose own word
// count already exceeds the budget becomes a solo slide — there is no
// wholesome way to cut a sentence in half, so this is reported rather
// than forced.

export const MAX_WORDS_PER_SLIDE = 40;
export const MAX_TABLE_ROWS_PER_SLIDE = 3;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type TextUnit<T> = { text: string; payload: T };

/** Greedily groups units into slide-sized chunks, respecting a word budget. Never splits a unit. */
export function groupByWordBudget<T>(units: TextUnit<T>[], budget: number = MAX_WORDS_PER_SLIDE): T[][] {
  const groups: T[][] = [];
  let current: T[] = [];
  let currentWords = 0;
  for (const unit of units) {
    const w = wordCount(unit.text);
    if (current.length > 0 && currentWords + w > budget) {
      groups.push(current);
      current = [];
      currentWords = 0;
    }
    current.push(unit.payload);
    currentWords += w;
  }
  if (current.length > 0) groups.push(current);
  return groups;
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
