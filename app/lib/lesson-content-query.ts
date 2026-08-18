import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { KanaStrokeData } from "@/components/kana/stroke-geometry";
import type { KanaChartCharacter } from "@/components/kana/KanaChart";
import type { LessonContentBlockRow, LessonExerciseRow } from "./lesson-content-types";

export type M01LessonBundle = {
  module: { id: number; code: string; titleId: string };
  phase: { id: number; code: string; titleId: string };
  lesson: { id: number; code: string; titleId: string; lessonType: string };
  blocks: LessonContentBlockRow[];
  exercises: LessonExerciseRow[];
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

export const getM01LessonContent = cache(async (lessonCode: string): Promise<M01LessonBundle | null> => {
  const supabase = await createClient();

  const { data: moduleRow } = await supabase
    .from("kana_modules")
    .select("id, code, title_id")
    .eq("code", "M01")
    .maybeSingle();
  if (!moduleRow) return null;

  // lesson_code is only unique WITHIN a phase — scope to this module's
  // phases before matching by code, or a code shared with another
  // module (M02 also has L01..L04) makes .maybeSingle() error out.
  const { data: modulePhaseRows } = await supabase
    .from("kana_phases")
    .select("id, code, title_id, module_id")
    .eq("module_id", moduleRow.id);
  if (!modulePhaseRows?.length) return null;
  const modulePhaseIds = modulePhaseRows.map((p) => p.id);

  const { data: lessonRow } = await supabase
    .from("kana_lessons")
    .select("id, code, title_id, lesson_type, phase_id")
    .eq("code", lessonCode)
    .in("phase_id", modulePhaseIds)
    .maybeSingle();
  if (!lessonRow) return null;

  const phaseRow = modulePhaseRows.find((p) => p.id === lessonRow.phase_id);
  if (!phaseRow) return null;

  const { data: blockRows } = await supabase
    .from("lesson_content_blocks")
    .select("id, order_index, block_type, content")
    .eq("lesson_id", lessonRow.id)
    .order("order_index");

  const { data: exerciseRows } = await supabase
    .from("lesson_exercises")
    .select("id, order_index, exercise_type, prompt, options, correct_option_id, explanation, audio_url")
    .eq("lesson_id", lessonRow.id)
    .order("order_index");

  return {
    module: { id: moduleRow.id, code: moduleRow.code, titleId: moduleRow.title_id },
    phase: { id: phaseRow.id, code: phaseRow.code, titleId: phaseRow.title_id },
    lesson: { id: lessonRow.id, code: lessonRow.code, titleId: lessonRow.title_id, lessonType: lessonRow.lesson_type },
    blocks: (blockRows ?? []).map((b) => ({
      id: b.id,
      orderIndex: b.order_index,
      blockType: b.block_type,
      content: b.content,
    })) as LessonContentBlockRow[],
    exercises: (exerciseRows ?? []).map((e) => ({
      id: e.id,
      orderIndex: e.order_index,
      exerciseType: e.exercise_type,
      prompt: e.prompt,
      options: e.options,
      correctOptionId: e.correct_option_id,
      explanation: e.explanation,
      audioUrl: e.audio_url,
    })) as LessonExerciseRow[],
  };
});

// Dipakai khusus untuk blok block_type='chart' (pratinjau seluruh
// Hiragana) — semua karakter ditandai taught:false karena M01 memang
// murni pengenalan, belum ada yang "diajarkan".
export const getFullScriptChartPreview = cache(async (script: "hiragana" | "katakana"): Promise<KanaChartCharacter[]> => {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("kana_characters")
    .select("id, character, romaji, group_code, order_in_group, audio_url, stroke_data_key")
    .eq("script", script)
    .order("order_in_group");

  return Promise.all(
    (rows ?? []).map(async (row) => ({
      id: row.id,
      character: row.character,
      romaji: row.romaji,
      groupCode: row.group_code,
      orderInGroup: row.order_in_group,
      audioUrl: row.audio_url,
      strokeData: await loadStrokeData(row.stroke_data_key),
      taught: false,
    })),
  );
});
