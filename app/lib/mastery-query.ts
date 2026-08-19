import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { LessonKanaItem } from "./lesson-query";
import { getKanaPool } from "./kana-pool-query";

export type MasteryKanaItem = LessonKanaItem & { accuracy: number; attempts: number };

// Fase 8 L02 (Targeted Remediation) — the weakest N characters for THIS
// user specifically, ranked by accuracy across every skill row
// user_kana_mastery has for them (worst average first). A user with no
// attempts yet for a character simply doesn't rank (nothing to remediate
// for something never attempted) — callers fall back to a general sample
// when this returns too few rows to fill a lesson.
export const getWeakestKana = cache(async (script: "hiragana" | "katakana", limit: number): Promise<MasteryKanaItem[]> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: masteryRows } = await supabase
    .from("user_kana_mastery")
    .select("kana_id, accuracy, attempts")
    .eq("user_id", user.id);
  if (!masteryRows?.length) return [];

  const statsByKanaId = new Map<number, { totalAccuracy: number; count: number; attempts: number }>();
  for (const row of masteryRows) {
    const stat = statsByKanaId.get(row.kana_id) ?? { totalAccuracy: 0, count: 0, attempts: 0 };
    stat.totalAccuracy += row.accuracy;
    stat.count += 1;
    stat.attempts += row.attempts;
    statsByKanaId.set(row.kana_id, stat);
  }

  const pool = await getKanaPool(script);
  const poolById = new Map(pool.map((k) => [k.id, k]));

  const ranked = [...statsByKanaId.entries()]
    .map(([kanaId, stat]) => {
      const kana = poolById.get(kanaId);
      if (!kana || stat.attempts === 0) return null;
      return { ...kana, accuracy: stat.totalAccuracy / stat.count, attempts: stat.attempts };
    })
    .filter((k): k is MasteryKanaItem => k != null)
    .sort((a, b) => a.accuracy - b.accuracy);

  return ranked.slice(0, limit);
});

// Fase 8 L03 (Delayed Retention Check) — whatever's actually due right
// now per the SM-2-style schedule actions.ts's completeLesson already
// maintains (srs_interval_days/srs_ease/due_at have been live since
// Fase 5 — this is the first lesson that ever reads due_at back out).
export const getDueForReview = cache(async (script: "hiragana" | "katakana", limit: number): Promise<MasteryKanaItem[]> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: masteryRows } = await supabase
    .from("user_kana_mastery")
    .select("kana_id, accuracy, attempts, due_at")
    .eq("user_id", user.id)
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true });
  if (!masteryRows?.length) return [];

  const pool = await getKanaPool(script);
  const poolById = new Map(pool.map((k) => [k.id, k]));

  const seen = new Set<number>();
  const due: MasteryKanaItem[] = [];
  for (const row of masteryRows) {
    if (seen.has(row.kana_id)) continue;
    const kana = poolById.get(row.kana_id);
    if (!kana) continue;
    seen.add(row.kana_id);
    due.push({ ...kana, accuracy: row.accuracy, attempts: row.attempts });
    if (due.length >= limit) break;
  }
  return due;
});
