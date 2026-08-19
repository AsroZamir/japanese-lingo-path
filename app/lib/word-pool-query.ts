import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { LessonExampleWord } from "./lesson-query";

// Fase 4 (Reading Lab) and beyond practice VOCABULARY, not new
// characters — unlike getLessonBundle, these lessons have no
// kana_lesson_items of their own to scope by, so this pulls straight
// from the whole kana_example_words pool and filters by length (kana
// COUNT, i.e. kana_word_characters rows per word — matches the modul's
// own "2-3 KANA WORDS" / "4+ KANA WORDS" framing exactly, not a
// codepoint count, which would double-count youon syllables).
export const getWordPool = cache(
  async (script: "hiragana" | "katakana", minLen: number, maxLen: number): Promise<LessonExampleWord[]> => {
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

    return wordRows
      .map((w): LessonExampleWord => ({
        id: w.id,
        wordKana: w.word_kana,
        romaji: w.romaji,
        meaningId: w.meaning_id,
        meaningEn: w.meaning_en,
        audioUrl: w.audio_url,
        characters: (charsByWordId.get(w.id) ?? []).sort((a, b) => a.position - b.position),
      }))
      .filter((w) => w.characters.length >= minLen && w.characters.length <= maxLen)
      .sort((a, b) => a.wordKana.localeCompare(b.wordKana));
  },
);
