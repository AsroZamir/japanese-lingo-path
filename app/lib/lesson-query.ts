import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { KanaStrokeData } from "@/components/kana/stroke-geometry";
import type { KanaChartCharacter } from "@/components/kana/KanaChart";

// This whole file goes through supabase-js (PostgREST + the user's JWT),
// not db/client.ts — Drizzle's connection has no session context to
// evaluate RLS against, so a Drizzle query here would either silently
// bypass RLS (if it somehow ran with elevated rights) or return nothing
// useful. Reads for real users belong on the supabase-js path; Drizzle
// stays for seed/admin scripts, as decided back in Fase 3.

export type LessonKanaItem = {
  id: number;
  character: string;
  romaji: string;
  script: "hiragana" | "katakana";
  groupCode: string | null;
  orderInGroup: number | null;
  audioUrl: string | null;
  strokeData: KanaStrokeData | null;
  role: "new" | "review";
};

export type LessonExampleWord = {
  id: number;
  wordKana: string;
  romaji: string;
  meaningId: string;
  meaningEn: string | null;
  audioUrl: string | null;
  characters: { position: number; kanaId: number; character: string }[];
};

export type LessonBundle = {
  module: { id: number; code: string; titleId: string };
  phase: { id: number; code: string; titleId: string };
  lesson: {
    id: number;
    code: string;
    titleId: string;
    lessonType: string;
    romajiPolicy: "always" | "on_demand" | "hidden";
    targetThresholds: Record<string, number> | null;
    groupCode: string | null;
  };
  /** Ready for StrokeAnimation/WritingCanvas/RomajiText/AudioButton as-is, ordered by order_in_group. */
  kana: LessonKanaItem[];
  /** Example words built entirely from this lesson's own kana (none reach outside it). */
  words: LessonExampleWord[];
  /** Ready for <KanaChart characters={...} /> directly. */
  chartCharacters: KanaChartCharacter[];
};

async function loadStrokeData(strokeDataKey: string | null): Promise<KanaStrokeData | null> {
  if (!strokeDataKey) return null;
  try {
    const filePath = path.join(process.cwd(), "public", "kana-strokes", `${strokeDataKey}.json`);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as KanaStrokeData;
  } catch {
    return null;
  }
}

export const getLessonBundle = cache(
  async (moduleCode: string, lessonCode: string): Promise<LessonBundle | null> => {
    const supabase = await createClient();

    const { data: moduleRow } = await supabase
      .from("kana_modules")
      .select("id, code, title_id")
      .eq("code", moduleCode)
      .maybeSingle();
    if (!moduleRow) return null;

    const { data: lessonRow } = await supabase
      .from("kana_lessons")
      .select("id, code, title_id, lesson_type, romaji_policy, target_thresholds, group_code, phase_id")
      .eq("code", lessonCode)
      .maybeSingle();
    if (!lessonRow) return null;

    const { data: phaseRow } = await supabase
      .from("kana_phases")
      .select("id, code, title_id, module_id")
      .eq("id", lessonRow.phase_id)
      .maybeSingle();
    if (!phaseRow || phaseRow.module_id !== moduleRow.id) return null; // lesson doesn't belong to this module

    const { data: itemRows } = await supabase
      .from("kana_lesson_items")
      .select("role, kana_id")
      .eq("lesson_id", lessonRow.id);

    const kanaIds = (itemRows ?? [])
      .filter((item): item is typeof item & { kana_id: number } => item.kana_id != null)
      .map((item) => item.kana_id);
    const roleByKanaId = new Map(
      (itemRows ?? [])
        .filter((item): item is typeof item & { kana_id: number } => item.kana_id != null)
        .map((item) => [item.kana_id, item.role as "new" | "review"]),
    );

    const { data: kanaRows } = kanaIds.length
      ? await supabase
          .from("kana_characters")
          .select("id, character, romaji, script, group_code, order_in_group, audio_url, stroke_data_key")
          .in("id", kanaIds)
      : { data: [] };

    const kana: LessonKanaItem[] = await Promise.all(
      (kanaRows ?? []).map(async (row) => ({
        id: row.id,
        character: row.character,
        romaji: row.romaji,
        script: row.script,
        groupCode: row.group_code,
        orderInGroup: row.order_in_group,
        audioUrl: row.audio_url,
        strokeData: await loadStrokeData(row.stroke_data_key),
        role: roleByKanaId.get(row.id) ?? "review",
      })),
    );
    kana.sort((a, b) => (a.orderInGroup ?? 0) - (b.orderInGroup ?? 0));

    const kanaIdSet = new Set(kanaIds);

    // Words "belonging" to this lesson are ones built entirely from its
    // own kana — found in two passes since PostgREST has no direct
    // "every related row matches" filter: first find candidate word ids
    // that touch at least one of this lesson's kana, then pull each
    // candidate's FULL character list to check none of it reaches
    // outside the set.
    const { data: candidateRows } = kanaIds.length
      ? await supabase.from("kana_word_characters").select("word_id, position, kana_id").in("kana_id", kanaIds)
      : { data: [] };
    const candidateWordIds = [...new Set((candidateRows ?? []).map((row) => row.word_id))];

    const { data: allCharRows } = candidateWordIds.length
      ? await supabase.from("kana_word_characters").select("word_id, position, kana_id").in("word_id", candidateWordIds)
      : { data: [] };

    const charsByWordId = new Map<number, { position: number; kanaId: number }[]>();
    for (const row of allCharRows ?? []) {
      const list = charsByWordId.get(row.word_id) ?? [];
      list.push({ position: row.position, kanaId: row.kana_id });
      charsByWordId.set(row.word_id, list);
    }

    const fullyWithinLessonWordIds = candidateWordIds.filter((wordId) => {
      const chars = charsByWordId.get(wordId) ?? [];
      return chars.length > 0 && chars.every((c) => kanaIdSet.has(c.kanaId));
    });

    const { data: wordRows } = fullyWithinLessonWordIds.length
      ? await supabase
          .from("kana_example_words")
          .select("id, word_kana, romaji, meaning_id, meaning_en, audio_url")
          .in("id", fullyWithinLessonWordIds)
      : { data: [] };

    const kanaById = new Map(kana.map((k) => [k.id, k]));
    const words: LessonExampleWord[] = (wordRows ?? []).map((word) => ({
      id: word.id,
      wordKana: word.word_kana,
      romaji: word.romaji,
      meaningId: word.meaning_id,
      meaningEn: word.meaning_en,
      audioUrl: word.audio_url,
      characters: (charsByWordId.get(word.id) ?? [])
        .sort((a, b) => a.position - b.position)
        .map((c) => ({ position: c.position, kanaId: c.kanaId, character: kanaById.get(c.kanaId)?.character ?? "?" })),
    }));

    const chartCharacters: KanaChartCharacter[] = kana.map((k) => ({
      id: k.id,
      character: k.character,
      romaji: k.romaji,
      groupCode: k.groupCode,
      orderInGroup: k.orderInGroup,
      audioUrl: k.audioUrl,
      strokeData: k.strokeData,
      // This vertical slice covers exactly one group in one lesson, so
      // every kana here is "taught" by definition. Real cross-lesson
      // progress (has the USER actually completed the introducing
      // lesson yet) is out of scope for Fase 5 — that needs
      // user_kana_lesson_progress, which nothing writes to until
      // Bagian D exists.
      taught: true,
    }));

    return {
      module: { id: moduleRow.id, code: moduleRow.code, titleId: moduleRow.title_id },
      phase: { id: phaseRow.id, code: phaseRow.code, titleId: phaseRow.title_id },
      lesson: {
        id: lessonRow.id,
        code: lessonRow.code,
        titleId: lessonRow.title_id,
        lessonType: lessonRow.lesson_type,
        romajiPolicy: lessonRow.romaji_policy,
        targetThresholds: lessonRow.target_thresholds as Record<string, number> | null,
        groupCode: lessonRow.group_code,
      },
      kana,
      words,
      chartCharacters,
    };
  },
);
