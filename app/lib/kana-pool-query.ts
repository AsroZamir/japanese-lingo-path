import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { KanaStrokeData } from "@/components/kana/stroke-geometry";
import type { LessonKanaItem } from "./lesson-query";

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

// Fase 5+ (Active Recall, Writing Lab, Mastery) drill EVERYTHING taught so
// far, not one lesson's own kana_lesson_items — by the time a module
// reaches these phases every character in the script has already been
// introduced somewhere earlier, so "the pool" is just every row for that
// script. Mirrors getLessonBundle's kana shape (LessonKanaItem) so the
// same exercise-building code (LessonL03-style) works on either source.
export const getKanaPool = cache(async (script: "hiragana" | "katakana"): Promise<LessonKanaItem[]> => {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("kana_characters")
    .select("id, character, romaji, script, group_code, order_in_group, audio_url, stroke_data_key")
    .eq("script", script);

  const items: LessonKanaItem[] = await Promise.all(
    (rows ?? []).map(async (row) => ({
      id: row.id,
      character: row.character,
      romaji: row.romaji,
      script: row.script,
      groupCode: row.group_code,
      orderInGroup: row.order_in_group,
      audioUrl: row.audio_url,
      strokeData: await loadStrokeData(row.stroke_data_key),
      role: "review" as const,
    })),
  );
  items.sort((a, b) => a.character.localeCompare(b.character));
  return items;
});
