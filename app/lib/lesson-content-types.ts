// Kontrak bentuk `content` (jsonb) di lesson_content_blocks, per
// block_type. Dipakai bersama oleh scripts/seed-m01-content.ts (penulis)
// dan komponen render M01 (pembaca) supaya keduanya tidak diam-diam
// menyimpang. block_type sendiri adalah kolom enum di DB — union `kind`
// di bawah ini adalah lapisan kedua di dalam jsonb untuk varian layout
// yang lebih spesifik daripada 6 block_type kasar tsb.

export type TextBlockContent =
  | { kind: "paragraphs"; heading?: string; paragraphs: string[] }
  | {
      kind: "name-showcase";
      prefixKana: string;
      suffixKana: string;
      prefixRomaji: string;
      suffixRomaji: string;
      fallbackNameKana: string;
      meaningTemplate: string; // pakai "{name}" sebagai placeholder
    }
  | {
      kind: "steps";
      heading?: string;
      leadParagraphs?: string[];
      steps: { label?: string; title: string }[];
      closingParagraphs?: string[];
    }
  | {
      // M04 Fase 1 L02 — teaches the compositional pattern behind 11-99
      // (二十一 = 二十 + 一, concatenated directly, no separator) by
      // letting the learner assemble it themselves instead of being
      // shown a table of 90 memorized entries. Pure client-side demo
      // (DialogueBlock's pattern) — not graded, not written to
      // user_kana_attempts; the graded check is a separate lesson_exercises row.
      kind: "number-builder";
      heading?: string;
      instruction?: string;
      tensOptions: { label: string; kanji: string; romaji: string; value: number }[]; // value 0 = "kosong" (no tens), kanji/romaji "" for it
      onesOptions: { label: string; kanji: string; romaji: string; value: number }[]; // value 0 = "kosong" (no ones), kanji/romaji "" for it
    }
  | {
      // M04 Fase 4 — teaches clock-reading. "display" shows a fixed
      // time (paired with its kanji/romaji reading in the same slide);
      // "interactive" lets the learner click hours + a 4-stop minute
      // selector and read the label update live — same
      // demo-not-graded spirit as number-builder.
      kind: "clock-demo";
      heading?: string;
      instruction?: string;
      hour: number; // 1-12
      minute: number; // 0-59, but interactive mode only offers :00/:15/:30/:45
      mode: "display" | "interactive";
      readingKanji?: string; // e.g. "三時半" — shown for "display" mode
      readingRomaji?: string; // e.g. "sanji-han"
    }
  | {
      // M04 Fase 5 — a representative month grid (not a real
      // current-date calendar) for teaching weekday + day-of-month
      // readings. "interactive" lets the learner click any date and
      // read the live result; "display" highlights one fixed date.
      kind: "calendar-demo";
      heading?: string;
      instruction?: string;
      startWeekday: number; // 0=Sunday — which weekday this demo month's 1st falls on
      daysInMonth?: number;
      monthLabel?: string;
      mode: "display" | "interactive";
      highlightDay?: number;
    };

export type ChartBlockContent = {
  script: "hiragana" | "katakana";
  mode: "dimmed-preview" | "interactive";
  heading?: string;
  paragraphs?: string[];
};

export type TableBlockContent =
  | {
      kind: "comparison";
      heading?: string;
      columns: string[];
      rows: string[][];
      /** Satu tombol putar untuk seluruh tabel (mis. "dengarkan ketiganya"). */
      audioUrl?: string;
      /** Tombol putar per baris, sejajar indeksnya dengan `rows`. */
      rowAudioUrls?: (string | null)[];
    }
  | {
      kind: "vocab-card";
      kana: string;
      romaji: string;
      meaning: string;
      audioUrl?: string;
      note?: string;
      extra?: string;
      activity?: string;
      secondaryLabel?: string;
      secondaryAudioUrl?: string;
    };

export type AudioListBlockContent = {
  heading?: string;
  items: { kana: string; romaji: string; meaning: string; audioUrl: string | null }[];
  closingParagraphs?: string[];
};

export type DialogueBlockContent = {
  openingKana: string;
  prompt: string;
  choices: { id: string; kana: string; correct?: boolean }[];
  followUpKana: string;
  followUpNarrative: string;
  closingNote: string;
};

// M05 — scripted multi-turn roleplay (self-intro, shop, classroom).
// Each turn: NPC line, a prompt, forced-choice response options (one
// correct), and what the NPC says next once the learner picks right —
// advances linearly turn-by-turn, same "pick right to proceed" gate as
// DialogueBlockContent, just chained across more than one exchange
// instead of one. Not a true branching tree (different wrong answers
// don't lead to different content, they just block advancing) — that
// depth isn't needed for any lesson in this modul; genuinely open-ended
// AI conversation is handled separately (marked unavailable), not by
// this type.
export type MultiTurnDialogueContent = {
  scenario: string; // one-line framing shown above the whole exchange, e.g. "Anda baru pindah ke kelas baru."
  turns: {
    npcKana: string;
    prompt: string;
    choices: { id: string; kana: string; correct?: boolean }[];
  }[];
  closingNote: string;
};

// Catatan validasi/implementasi/teknis/desain di docs/konten-M01-orientasi.md
// adalah metadata produksi untuk tim konten & developer — TIDAK pernah
// ditampilkan ke pembelajar. block_type 'callout' di sini murni untuk
// penekanan/dorongan semangat yang memang ditujukan untuk pembelajar.
export type CalloutBlockContent = {
  kind: "tip" | "encouragement" | "important";
  body: string;
};

export type LessonContentBlockRow = {
  id: number;
  orderIndex: number;
  /** Bagian 3 — explanatory Indonesian narration script, not a readout of the slide's own text. Null until authored. */
  narrationText: string | null;
  /** Filled by scripts/generate-narration.ts; null until generated even when narrationText exists. */
  narrationUrl: string | null;
} & (
  | { blockType: "text"; content: TextBlockContent }
  | { blockType: "chart"; content: ChartBlockContent }
  | { blockType: "table"; content: TableBlockContent }
  | { blockType: "audio_list"; content: AudioListBlockContent }
  | { blockType: "dialogue"; content: DialogueBlockContent | MultiTurnDialogueContent }
  | { blockType: "callout"; content: CalloutBlockContent }
);

// lesson_exercises.options — dipakai untuk 'concept_mcq' (pilihan
// ganda) maupun 'typing' (satu entri saja: jawaban yang diharapkan).
export type LessonExerciseOption = { id: number; label: string };

export type LessonExerciseRow = {
  id: number;
  orderIndex: number;
  exerciseType: "concept_mcq" | "typing";
  prompt: string;
  options: LessonExerciseOption[] | null;
  correctOptionId: number | null;
  explanation: string | null;
  audioUrl: string | null;
};
