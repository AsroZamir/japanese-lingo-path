import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { deriveMasteryTier, type MasteryTier } from "@/app/lib/mastery-tier";

// PROMPT-11 Bagian 5 — vocab-engine equivalent of mastery-map-query.ts.
// V2.1 §6.3 is explicit: "mengenali arti tidak otomatis berarti bisa
// memproduksi kata" — recognition and production are ALREADY stored as
// separate rows in user_vocab_mastery (primary key includes `skill`,
// since PROMPT-8). What was actually missing (confirmed via grep before
// writing this file: zero references to user_vocab_mastery/vocab_items in
// review-query.ts, mastery-tier.ts, or /progres) is that NOTHING read
// that data back out — Module 3 and 4's vocab mastery has never surfaced
// on /progres or /ulangi. This file is that missing read path.
//
// Simplification vs. the kana map: no "transferable" tier here (that tier
// needs a passed-unassisted-RETENTION signal; wiring vocab's own
// V05_F5-style retention-stage attempts into this would duplicate a good
// chunk of mastery-map-query.ts's retention query for a nuance the
// vocab engine doesn't lean on yet) — passedRetentionUnassisted is always
// false, so a vocab item's ceiling here is "durable", not "transferable".
// Flagged in the final report rather than silently narrowing the tier
// model without saying so.
export type VocabMasteryEntry = {
  id: number;
  category: string;
  termKana: string;
  reading: string;
  meaningId: string;
  recognition: { tier: MasteryTier; attempts: number; accuracyPercent: number; dueAt: string | null };
  production: { tier: MasteryTier; attempts: number; accuracyPercent: number; dueAt: string | null };
};

function tierFor(stat: { attempts: number; correct: number; streak: number; srsIntervalDays: number; dueAt: string | null }) {
  const accuracyPercent = stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : 0;
  return {
    tier: deriveMasteryTier({
      attempts: stat.attempts,
      accuracyPercent,
      streak: stat.streak,
      srsIntervalDays: stat.srsIntervalDays,
      passedRetentionUnassisted: false,
    }),
    attempts: stat.attempts,
    accuracyPercent,
    dueAt: stat.dueAt,
  };
}

export const getVocabMasteryMap = cache(async (moduleCode: string): Promise<VocabMasteryEntry[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: moduleRow } = await supabase.from("learning_modules").select("id").eq("code", moduleCode).maybeSingle();
  if (!moduleRow) return [];

  const { data: itemRows, error: itemError } = await supabase
    .from("vocab_items")
    .select("id, category, term_kana, reading, meaning_id, order_index")
    .eq("module_id", moduleRow.id)
    .order("order_index");
  if (itemError) throw new Error(itemError.message);
  const itemIds = (itemRows ?? []).map((row) => row.id);
  if (itemIds.length === 0) return [];

  const { data: masteryRows, error: masteryError } = user
    ? await supabase
        .from("user_vocab_mastery")
        .select("item_id, skill, attempts, correct, streak, srs_interval_days, due_at")
        .eq("user_id", user.id)
        .in("item_id", itemIds)
    : { data: [], error: null };
  if (masteryError) throw new Error(masteryError.message);

  const statByItemSkill = new Map<
    string,
    { attempts: number; correct: number; streak: number; srsIntervalDays: number; dueAt: string | null }
  >();
  for (const row of masteryRows ?? []) {
    statByItemSkill.set(row.item_id + ":" + row.skill, {
      attempts: row.attempts,
      correct: row.correct,
      streak: row.streak,
      srsIntervalDays: row.srs_interval_days,
      dueAt: row.due_at,
    });
  }
  const empty = { attempts: 0, correct: 0, streak: 0, srsIntervalDays: 0, dueAt: null as string | null };

  return (itemRows ?? []).map((row): VocabMasteryEntry => ({
    id: row.id,
    category: row.category,
    termKana: row.term_kana,
    reading: row.reading,
    meaningId: row.meaning_id,
    recognition: tierFor(statByItemSkill.get(row.id + ":recognition") ?? empty),
    production: tierFor(statByItemSkill.get(row.id + ":production") ?? empty),
  }));
});

export type VocabReviewQueueItem = {
  id: number;
  category: string;
  termKana: string;
  reading: string;
  meaningId: string;
  skill: "recognition" | "production";
  dueAt: string;
};

// The vocab-engine equivalent of getReviewQueue (review-query.ts) — real
// but deliberately simpler: no confusable-pair boost, no slow-response
// boost (neither has a vocab-side data source yet). Sorted by how overdue
// each (item, skill) pair is, which is enough to satisfy the explicit
// requirement that review "target the weak direction" — recognition and
// production are queued as SEPARATE entries, so a word strong in one
// direction and weak in the other surfaces only its weak side.
export const getVocabReviewQueue = cache(async (limit = 30): Promise<VocabReviewQueueItem[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date().toISOString();
  const { data: dueRows, error: dueError } = await supabase
    .from("user_vocab_mastery")
    .select("item_id, skill, due_at")
    .eq("user_id", user.id)
    .not("due_at", "is", null)
    .lte("due_at", now)
    .order("due_at", { ascending: true })
    .limit(limit);
  if (dueError) throw new Error(dueError.message);
  if (!dueRows || dueRows.length === 0) return [];

  const itemIds = [...new Set(dueRows.map((row) => row.item_id))];
  const { data: itemRows, error: itemError } = await supabase
    .from("vocab_items")
    .select("id, category, term_kana, reading, meaning_id")
    .in("id", itemIds);
  if (itemError) throw new Error(itemError.message);
  const itemById = new Map((itemRows ?? []).map((row) => [row.id, row]));

  return dueRows
    .map((row): VocabReviewQueueItem | null => {
      const item = itemById.get(row.item_id);
      if (!item || !row.due_at) return null;
      return {
        id: item.id,
        category: item.category,
        termKana: item.term_kana,
        reading: item.reading,
        meaningId: item.meaning_id,
        skill: row.skill as "recognition" | "production",
        dueAt: row.due_at,
      };
    })
    .filter((entry): entry is VocabReviewQueueItem => entry !== null);
});
