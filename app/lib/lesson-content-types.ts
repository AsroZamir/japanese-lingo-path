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
  | { blockType: "dialogue"; content: DialogueBlockContent }
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
