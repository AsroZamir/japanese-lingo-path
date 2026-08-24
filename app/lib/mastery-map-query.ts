import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { HIRAGANA_BASIC_CHARACTERS } from "@/app/lib/hiragana-mnemonics";
import { deriveMasteryTier, type MasteryTier } from "@/app/lib/mastery-tier";

export type MasteryMapEntry = {
  id: number;
  character: string;
  romaji: string;
  groupCode: string | null;
  tier: MasteryTier;
  attempts: number;
  correct: number;
  accuracyPercent: number;
  streak: number;
  srsIntervalDays: number;
  dueAt: string | null;
  confusableIds: number[];
};

// Bagian 6.5 — the 46-character mastery map, replacing /progres's entirely
// mock "skill map" (Vocabulary/Grammar/Kanji rows that track nothing
// real). user_kana_mastery is per-(kana, skill) — a character can have up
// to 5 rows (visual/audio/recall/writing/reading). Aggregated here per
// character: attempts/correct summed (real accuracy across every way the
// character has been tested), streak/srsIntervalDays taken as the max
// across skills (the character's single strongest piece of evidence,
// since mastery-tier.ts's derivation wants one number per axis, not five).
export const getHiraganaMasteryMap = cache(async (): Promise<MasteryMapEntry[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: charRows, error: charError } = await supabase
    .from("kana_characters")
    .select("id, character, romaji, group_code")
    .eq("script", "hiragana")
    .eq("type", "basic");
  if (charError) throw new Error(charError.message);

  const orderIndex = new Map(HIRAGANA_BASIC_CHARACTERS.map((character, index) => [character, index]));
  const sortedChars = [...(charRows ?? [])].sort(
    (a, b) => (orderIndex.get(a.character) ?? 99) - (orderIndex.get(b.character) ?? 99),
  );
  const charIds = sortedChars.map((row) => row.id);
  if (charIds.length === 0) return [];

  const [masteryResult, retentionResult, confusionResult] = await Promise.all([
    user
      ? supabase
          .from("user_kana_mastery")
          .select("kana_id, attempts, correct, streak, srs_interval_days, due_at")
          .eq("user_id", user.id)
          .in("kana_id", charIds)
      : Promise.resolve({ data: [], error: null }),
    user
      ? supabase
          .from("user_kana_attempts")
          .select("kana_id, is_correct")
          .eq("user_id", user.id)
          .in("kana_id", charIds)
          .eq("phase_code", "RETENTION")
          .eq("assisted", false)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("kana_confusion_pairs")
      .select("kana_a_id, kana_b_id")
      .or("kana_a_id.in.(" + charIds.join(",") + "),kana_b_id.in.(" + charIds.join(",") + ")"),
  ]);
  if (masteryResult.error) throw new Error(masteryResult.error.message);
  if (retentionResult.error) throw new Error(retentionResult.error.message);
  if (confusionResult.error) throw new Error(confusionResult.error.message);

  const statsByKanaId = new Map<
    number,
    { attempts: number; correct: number; streak: number; srsIntervalDays: number; dueAt: string | null }
  >();
  for (const row of masteryResult.data ?? []) {
    const current = statsByKanaId.get(row.kana_id) ?? {
      attempts: 0,
      correct: 0,
      streak: 0,
      srsIntervalDays: 0,
      dueAt: null,
    };
    current.attempts += row.attempts;
    current.correct += row.correct;
    current.streak = Math.max(current.streak, row.streak);
    current.srsIntervalDays = Math.max(current.srsIntervalDays, row.srs_interval_days);
    if (row.due_at && (!current.dueAt || row.due_at < current.dueAt)) current.dueAt = row.due_at;
    statsByKanaId.set(row.kana_id, current);
  }

  const passedRetentionByKanaId = new Set(
    (retentionResult.data ?? []).filter((row) => row.is_correct).map((row) => row.kana_id),
  );

  const confusableByKanaId = new Map<number, number[]>();
  for (const pair of confusionResult.data ?? []) {
    confusableByKanaId.set(pair.kana_a_id, [...(confusableByKanaId.get(pair.kana_a_id) ?? []), pair.kana_b_id]);
    confusableByKanaId.set(pair.kana_b_id, [...(confusableByKanaId.get(pair.kana_b_id) ?? []), pair.kana_a_id]);
  }

  return sortedChars.map((row): MasteryMapEntry => {
    const stat = statsByKanaId.get(row.id) ?? {
      attempts: 0,
      correct: 0,
      streak: 0,
      srsIntervalDays: 0,
      dueAt: null,
    };
    const accuracyPercent = stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : 0;
    const tier = deriveMasteryTier({
      attempts: stat.attempts,
      accuracyPercent,
      streak: stat.streak,
      srsIntervalDays: stat.srsIntervalDays,
      passedRetentionUnassisted: passedRetentionByKanaId.has(row.id),
    });
    return {
      id: row.id,
      character: row.character,
      romaji: row.romaji,
      groupCode: row.group_code,
      tier,
      attempts: stat.attempts,
      correct: stat.correct,
      accuracyPercent,
      streak: stat.streak,
      srsIntervalDays: stat.srsIntervalDays,
      dueAt: stat.dueAt,
      confusableIds: confusableByKanaId.get(row.id) ?? [],
    };
  });
});
