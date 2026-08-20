import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { LessonExampleWord } from "./lesson-query";

async function loadWordsWithCharacters(script: "hiragana" | "katakana"): Promise<LessonExampleWord[]> {
  const supabase = await createClient();

  const { data: wordRows } = await supabase
    .from("kana_example_words")
    .select("id, word_kana, romaji, meaning_id, meaning_en, audio_url")
    .eq("script", script);
  if (!wordRows?.length) return [];

  const wordIds = wordRows.map((w) => w.id);
  const { data: charRows } = await supabase
    .from("kana_word_characters")
    .select("word_id, position, kana_id")
    .in("word_id", wordIds);

  const kanaIds = [...new Set((charRows ?? []).map((c) => c.kana_id))];
  const { data: kanaRows } = kanaIds.length
    ? await supabase.from("kana_characters").select("id, character").in("id", kanaIds)
    : { data: [] };
  const charById = new Map((kanaRows ?? []).map((k) => [k.id, k.character]));

  const charsByWordId = new Map<number, { position: number; kanaId: number; character: string }[]>();
  for (const row of charRows ?? []) {
    const list = charsByWordId.get(row.word_id) ?? [];
    list.push({ position: row.position, kanaId: row.kana_id, character: charById.get(row.kana_id) ?? "?" });
    charsByWordId.set(row.word_id, list);
  }

  return wordRows.map((w): LessonExampleWord => ({
    id: w.id,
    wordKana: w.word_kana,
    romaji: w.romaji,
    meaningId: w.meaning_id,
    meaningEn: w.meaning_en,
    audioUrl: w.audio_url,
    characters: (charsByWordId.get(w.id) ?? []).sort((a, b) => a.position - b.position),
  }));
}

// Fase 4 (Reading Lab) and beyond practice VOCABULARY, not new
// characters — unlike getLessonBundle, these lessons have no
// kana_lesson_items of their own to scope by, so this pulls straight
// from the whole kana_example_words pool and filters by length (kana
// COUNT, i.e. kana_word_characters rows per word — matches the modul's
// own "2-3 KANA WORDS" / "4+ KANA WORDS" framing exactly, not a
// codepoint count, which would double-count youon syllables).
export const getWordPool = cache(
  async (script: "hiragana" | "katakana", minLen: number, maxLen: number): Promise<LessonExampleWord[]> => {
    const words = await loadWordsWithCharacters(script);
    return words
      .filter((w) => w.characters.length >= minLen && w.characters.length <= maxLen)
      .sort((a, b) => a.wordKana.localeCompare(b.wordKana));
  },
);

// M03 Phase 4 (Loanword Reading Lab) is THEMED, not length-based like
// M02's Reading Lab (docs/curriculum/M03.md) — each lesson names an
// explicit small vocabulary set (scripts/seed-katakana-loanwords.ts)
// rather than a length range, so this filters by exact word_kana match
// instead. Preserves the caller's list order (themed lessons want a
// deliberate sequence, not alphabetical).
export const getWordsByKana = cache(
  async (script: "hiragana" | "katakana", kanaList: string[]): Promise<LessonExampleWord[]> => {
    const words = await loadWordsWithCharacters(script);
    const byKana = new Map(words.map((w) => [w.wordKana, w]));
    return kanaList.map((k) => byKana.get(k)).filter((w): w is LessonExampleWord => w != null);
  },
);

// Mini Test (assessment lessons, LessonL04) needs word-level questions
// built ONLY from characters taught up through the current group — NOT
// just this one lesson's own ~5 kana (too sparse: M02 Group A alone
// yields 7 candidate words, but B/C/D/E individually yield 0-1 — a real
// word-level quiz needs the whole "taught so far" set, same spirit as
// getWordPool/getKanaPool's "whole taught-so-far pool, not one lesson's
// own items"). Cumulative = every kana_lesson_items row across every
// phase in this module with order_index <= the given phase's, since
// each phase here is one taught group (P2=Group A, P3=Group B, ...).
export const getWordsForKanaTaughtThrough = cache(
  async (moduleCode: string, phaseId: number): Promise<LessonExampleWord[]> => {
    const supabase = await createClient();

    const { data: moduleRow } = await supabase.from("kana_modules").select("id").eq("code", moduleCode).maybeSingle();
    if (!moduleRow) return [];

    const { data: currentPhase } = await supabase.from("kana_phases").select("order_index").eq("id", phaseId).maybeSingle();
    if (!currentPhase) return [];

    const { data: priorPhases } = await supabase
      .from("kana_phases")
      .select("id")
      .eq("module_id", moduleRow.id)
      .lte("order_index", currentPhase.order_index);
    const phaseIds = (priorPhases ?? []).map((p) => p.id);
    if (!phaseIds.length) return [];

    const { data: lessons } = await supabase.from("kana_lessons").select("id").in("phase_id", phaseIds);
    const lessonIds = (lessons ?? []).map((l) => l.id);
    if (!lessonIds.length) return [];

    const { data: items } = await supabase.from("kana_lesson_items").select("kana_id").in("lesson_id", lessonIds);
    const kanaIds = [...new Set((items ?? []).map((i) => i.kana_id).filter((id): id is number => id != null))];
    if (!kanaIds.length) return [];

    const { data: kanaRows } = await supabase.from("kana_characters").select("id, script").in("id", kanaIds);
    const script = kanaRows?.[0]?.script as "hiragana" | "katakana" | undefined;
    if (!script) return [];

    const kanaIdSet = new Set(kanaIds);
    const words = await loadWordsWithCharacters(script);
    return words.filter((w) => w.characters.length > 0 && w.characters.every((c) => kanaIdSet.has(c.kanaId)));
  },
);
