import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  HIRAGANA_LAB_MNEMONICS,
  HIRAGANA_MNEMONICS,
} from "@/app/lib/hiragana-mnemonics";
import type { HiraganaLearningItem, HiraganaType } from "@/app/lib/pre-n5-01-query";

const DAILY_REVIEW_CAP = 40;
const MIN_VIABLE_REVIEW = 5;
const SLOW_RESPONSE_MS = 6000;

export type ReviewQueueItem = {
  item: HiraganaLearningItem;
  dueAt: string | null;
  isTopUp: boolean;
  reasons: string[];
};

export type ReviewCounts = {
  dueNow: number;
  learning: number;
  mastered: number;
};

// V2.1 Bagian 11.2: never hand back an unbounded queue. `overdueHours`
// (how long something has been waiting) is the primary sort key — the
// longest-waiting item goes first — with a priority boost layered on top
// for signals that mean "this one needs attention regardless of exact
// timing": missed cold (no hint), only survived with a hint, unusually
// slow, has a live confusable also due right now, or has previously
// failed the 72h retention check for this exact character.
function priorityBoost(signals: {
  missedUnassisted: boolean;
  correctButAssisted: boolean;
  slow: boolean;
  confusableAlsoDue: boolean;
  failedRetention: boolean;
}): { boost: number; reasons: string[] } {
  let boost = 0;
  const reasons: string[] = [];
  if (signals.missedUnassisted) {
    boost += 48;
    reasons.push("Salah tanpa bantuan terakhir kali");
  }
  if (signals.correctButAssisted) {
    boost += 24;
    reasons.push("Benar terakhir kali, tapi pakai bantuan");
  }
  if (signals.slow) {
    boost += 12;
    reasons.push("Waktu jawab jauh lebih lambat dari biasanya");
  }
  if (signals.confusableAlsoDue) {
    boost += 24;
    reasons.push("Pasangan huruf yang sering tertukar juga jatuh tempo");
  }
  if (signals.failedRetention) {
    boost += 36;
    reasons.push("Sebelumnya gagal di uji ingatan jangka panjang");
  }
  return { boost, reasons };
}

function toLearningItem(
  row: {
    id: number;
    character: string;
    romaji: string;
    type: string;
    group_code: string | null;
    order_in_group: number | null;
    audio_url: string | null;
    stroke_data_key: string | null;
  },
  confusableIds: number[] = [],
): HiraganaLearningItem {
  return {
    id: row.id,
    character: row.character,
    romaji: row.romaji,
    type: row.type as HiraganaType,
    groupCode: row.group_code,
    orderInGroup: row.order_in_group,
    audioUrl: row.audio_url,
    strokeDataUrl: row.stroke_data_key ? "/kana-strokes/" + row.stroke_data_key + ".json" : null,
    baseCharacter: null,
    mnemonic: HIRAGANA_LAB_MNEMONICS[row.character] ??
      HIRAGANA_MNEMONICS[row.character] ?? {
        emoji: "✦",
        title: "Bentuk dan bunyi " + row.character,
        story: "Hubungkan bentuk " + row.character + " dengan bunyi '" + row.romaji + "'.",
      },
    examples: [],
    confusableIds,
    mastery: { attempts: 0, accuracyPercent: 0, dueAt: null, weak: false, due: false },
  };
}

// Bagian 6.3 — the real daily review queue, replacing app/lib/mock-data.ts's
// reviewSummary. Deliberately does NOT filter by curriculum_version or
// script: user_kana_mastery is per-(kana, skill), and a character doesn't
// care which lesson taught it first (V2.1 Bagian 12's ban on cross-
// curriculum PROGRESS conversion doesn't apply to per-character SRS state).
export const getReviewQueue = cache(async (limit = DAILY_REVIEW_CAP): Promise<ReviewQueueItem[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();
  const { data: dueRows, error: dueError } = await supabase
    .from("user_kana_mastery")
    .select("kana_id, due_at, attempts, correct, accuracy")
    .eq("user_id", user.id)
    .not("due_at", "is", null)
    .lte("due_at", now.toISOString())
    .order("due_at", { ascending: true });
  if (dueError) throw new Error(dueError.message);

  // One row per (kana, skill) — collapse to the earliest due_at per kana.
  const dueByKanaId = new Map<number, { dueAt: string }>();
  for (const row of dueRows ?? []) {
    if (!row.due_at) continue;
    const existing = dueByKanaId.get(row.kana_id);
    if (!existing || row.due_at < existing.dueAt) {
      dueByKanaId.set(row.kana_id, { dueAt: row.due_at });
    }
  }

  let candidateIds = [...dueByKanaId.keys()];
  const topUpIds = new Set<number>();

  // "Minimum viable review" — an empty or near-empty due list must not
  // become an empty page. Top up with the weakest characters the user has
  // actually attempted (lowest accuracy first), so there's always a short,
  // meaningful session instead of nothing.
  if (candidateIds.length < MIN_VIABLE_REVIEW) {
    const { data: weakRows, error: weakError } = await supabase
      .from("user_kana_mastery")
      .select("kana_id, attempts, correct, accuracy")
      .eq("user_id", user.id)
      .gt("attempts", 0)
      .order("accuracy", { ascending: true })
      .limit(MIN_VIABLE_REVIEW * 3);
    if (weakError) throw new Error(weakError.message);
    for (const row of weakRows ?? []) {
      if (candidateIds.length + topUpIds.size >= MIN_VIABLE_REVIEW) break;
      if (dueByKanaId.has(row.kana_id)) continue;
      topUpIds.add(row.kana_id);
    }
    candidateIds = [...candidateIds, ...topUpIds];
  }

  if (candidateIds.length === 0) return [];

  const [kanaResult, recentAttemptsResult, confusionResult, retentionFailResult] = await Promise.all([
    supabase
      .from("kana_characters")
      .select("id, character, romaji, type, group_code, order_in_group, audio_url, stroke_data_key")
      .in("id", candidateIds),
    supabase
      .from("user_kana_attempts")
      .select("kana_id, is_correct, assisted, response_time_ms, created_at")
      .eq("user_id", user.id)
      .in("kana_id", candidateIds)
      .order("created_at", { ascending: false })
      .limit(candidateIds.length * 8),
    supabase
      .from("kana_confusion_pairs")
      .select("kana_a_id, kana_b_id")
      .or("kana_a_id.in.(" + candidateIds.join(",") + "),kana_b_id.in.(" + candidateIds.join(",") + ")"),
    supabase
      .from("user_kana_attempts")
      .select("kana_id, is_correct")
      .eq("user_id", user.id)
      .in("kana_id", candidateIds)
      .eq("assisted", false)
      // Candidate ids here mix hiragana and katakana on purpose (SRS is
      // per-character, not per-script) — match either module's RETENTION
      // phase_code rather than just hiragana's, or a failed katakana
      // retention check would never boost that character's review priority.
      .in("phase_code", ["RETENTION", "K_RETENTION"]),
  ]);
  if (kanaResult.error) throw new Error(kanaResult.error.message);
  if (recentAttemptsResult.error) throw new Error(recentAttemptsResult.error.message);
  if (confusionResult.error) throw new Error(confusionResult.error.message);
  if (retentionFailResult.error) throw new Error(retentionFailResult.error.message);

  const kanaById = new Map((kanaResult.data ?? []).map((row) => [row.id, row]));

  const latestAttemptByKanaId = new Map<
    number,
    { isCorrect: boolean; assisted: boolean | null; responseTimeMs: number | null }
  >();
  const responseTimesByKanaId = new Map<number, number[]>();
  for (const row of recentAttemptsResult.data ?? []) {
    if (!latestAttemptByKanaId.has(row.kana_id)) {
      latestAttemptByKanaId.set(row.kana_id, {
        isCorrect: row.is_correct,
        assisted: row.assisted,
        responseTimeMs: row.response_time_ms,
      });
    }
    if (row.response_time_ms != null) {
      const list = responseTimesByKanaId.get(row.kana_id) ?? [];
      list.push(row.response_time_ms);
      responseTimesByKanaId.set(row.kana_id, list);
    }
  }

  const dueSet = new Set(dueByKanaId.keys());
  const confusablesByKanaId = new Map<number, number[]>();
  for (const pair of confusionResult.data ?? []) {
    confusablesByKanaId.set(pair.kana_a_id, [...(confusablesByKanaId.get(pair.kana_a_id) ?? []), pair.kana_b_id]);
    confusablesByKanaId.set(pair.kana_b_id, [...(confusablesByKanaId.get(pair.kana_b_id) ?? []), pair.kana_a_id]);
  }

  const failedRetentionKanaIds = new Set(
    (retentionFailResult.data ?? []).filter((row) => !row.is_correct).map((row) => row.kana_id),
  );

  const queue: (ReviewQueueItem & { score: number })[] = [];
  for (const kanaId of candidateIds) {
    const kanaRow = kanaById.get(kanaId);
    if (!kanaRow) continue;
    const dueInfo = dueByKanaId.get(kanaId);
    const isTopUp = !dueInfo;
    const overdueHours = dueInfo
      ? Math.max(0, (now.getTime() - new Date(dueInfo.dueAt).getTime()) / 3_600_000)
      : 0;

    const latest = latestAttemptByKanaId.get(kanaId);
    const times = responseTimesByKanaId.get(kanaId) ?? [];
    const avgMs = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const slow =
      latest?.responseTimeMs != null &&
      latest.responseTimeMs > SLOW_RESPONSE_MS &&
      (avgMs === 0 || latest.responseTimeMs > avgMs * 1.5);
    const confusableAlsoDue = (confusablesByKanaId.get(kanaId) ?? []).some((id) => dueSet.has(id));

    const { boost, reasons } = priorityBoost({
      missedUnassisted: latest ? !latest.isCorrect && latest.assisted !== true : false,
      correctButAssisted: latest ? latest.isCorrect && latest.assisted === true : false,
      slow: Boolean(slow),
      confusableAlsoDue,
      failedRetention: failedRetentionKanaIds.has(kanaId),
    });

    queue.push({
      item: toLearningItem(kanaRow, confusablesByKanaId.get(kanaId) ?? []),
      dueAt: dueInfo?.dueAt ?? null,
      isTopUp,
      reasons: isTopUp ? ["Sesi latihan singkat — belum ada yang jatuh tempo"] : reasons,
      score: overdueHours + boost,
    });
  }

  queue.sort((a, b) => b.score - a.score);
  return queue.slice(0, limit).map((entry): ReviewQueueItem => ({
    item: entry.item,
    dueAt: entry.dueAt,
    isTopUp: entry.isTopUp,
    reasons: entry.reasons,
  }));
});

// Bagian 6.6 — real counts for /beranda and /ulangi, replacing the mock
// { dueNow: 12, learning: 28, mastered: 64 }. "Learning" = attempted but
// not yet at accuracy>=80%; "mastered" mirrors the durable/transferable
// tiers from mastery-tier.ts (srsIntervalDays >= 7 and accuracy>=80).
export const getReviewCounts = cache(async (): Promise<ReviewCounts> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { dueNow: 0, learning: 0, mastered: 0 };

  const { data: rows, error } = await supabase
    .from("user_kana_mastery")
    .select("kana_id, accuracy, attempts, srs_interval_days, due_at")
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  const now = new Date().toISOString();
  const bestByKanaId = new Map<
    number,
    { accuracy: number; attempts: number; srsIntervalDays: number; dueAt: string | null }
  >();
  for (const row of rows ?? []) {
    const existing = bestByKanaId.get(row.kana_id);
    if (!existing || row.attempts > existing.attempts) {
      bestByKanaId.set(row.kana_id, {
        accuracy: row.accuracy,
        attempts: row.attempts,
        srsIntervalDays: row.srs_interval_days,
        dueAt: row.due_at,
      });
    }
  }

  let dueNow = 0;
  let learning = 0;
  let mastered = 0;
  for (const stat of bestByKanaId.values()) {
    if (stat.dueAt && stat.dueAt <= now) dueNow += 1;
    const accuracyPercent = stat.accuracy * 100;
    if (stat.srsIntervalDays >= 7 && accuracyPercent >= 80) mastered += 1;
    else if (stat.attempts > 0) learning += 1;
  }

  return { dueNow, learning, mastered };
});

// recordHiraganaAttempt requires a real PRE-N5.01 stage id purely to
// validate "this call belongs to this module" — it's never written to
// user_kana_attempts (that table has no stage_id column at all) and the
// exercise_type prefix always comes from the explicit phaseCode a review
// question passes ("review"), not from this stage's own code. Any ready
// stage works; F1 is just a stable, always-present anchor.
export type DistractorKana = { id: number; character: string; script: string };

// Broad pool for building multiple-choice distractors on review questions
// — every hiragana AND katakana row, any type (basic/dakuten/handakuten/
// youon), so a due character always gets plausible same-script
// distractors even outside its own small batch. Caller filters by
// `script` so a katakana question never shows hiragana distractors (or
// vice versa) mixed into its choices.
export const getHiraganaDistractorPool = cache(async (): Promise<DistractorKana[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kana_characters")
    .select("id, character, script")
    .in("script", ["hiragana", "katakana"]);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getAnyPreN5StageId = cache(async (): Promise<number | null> => {
  const supabase = await createClient();
  const { data: moduleRow } = await supabase
    .from("learning_modules")
    .select("id")
    .eq("code", "PRE-N5.01")
    .maybeSingle();
  if (!moduleRow) return null;
  const { data: stageRow } = await supabase
    .from("learning_stages")
    .select("id")
    .eq("module_id", moduleRow.id)
    .eq("code", "F1")
    .maybeSingle();
  return stageRow?.id ?? null;
});
