"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SkillOutcome } from "./skill-mapping";

export type RecordAttemptInput = {
  kanaId: number | null;
  wordId: number | null;
  lessonId: number;
  exerciseType: string;
  isCorrect: boolean;
  selectedOptionId: number | null;
  correctOptionId: number | null;
  typedValue: string | null;
  responseTimeMs: number | null;
};

export type ActionResult = { ok: boolean; error?: string };

// Called once per answer (ExerciseRunner's onAttempt / WritingCanvas's
// onResult), never batched — "Setiap jawaban ditulis ke
// user_kana_attempts" is literal. Runs as a Server Action specifically
// so a client can't fabricate is_correct/selected_option_id directly
// against the table; this is the only write path.
export async function recordAttempt(input: RecordAttemptInput): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };

  // Same rule the DB's CHECK constraint enforces, checked here too so a
  // caller gets a clear message instead of a raw Postgres error.
  if (!input.isCorrect && input.selectedOptionId == null && !input.typedValue) {
    return { ok: false, error: "Jawaban salah tapi tidak ada selected_option_id maupun typedValue — ditolak sebelum sampai ke database." };
  }

  const { error } = await supabase.from("user_kana_attempts").insert({
    user_id: user.id,
    kana_id: input.kanaId,
    word_id: input.wordId,
    lesson_id: input.lessonId,
    exercise_type: input.exerciseType,
    is_correct: input.isCorrect,
    selected_option_id: input.selectedOptionId,
    correct_option_id: input.correctOptionId,
    typed_value: input.typedValue,
    response_time_ms: input.responseTimeMs,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const SRS_MIN_EASE = 1.3;
const SRS_MAX_EASE = 3.0;
const SRS_EASE_STEP = 0.1;
const SRS_EASE_PENALTY = 0.2;

// Called once when a lesson session ends, after every recordAttempt for
// that session has already landed. Aggregates this session's outcomes
// into user_kana_mastery per (kana, skill) — attempts/correct/accuracy
// always; streak and a simplified SM-2-style interval/ease/due_at only
// move in response to what happened in THIS session, on top of
// whatever was already stored.
export async function completeLesson(lessonId: number, outcomes: SkillOutcome[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };

  const grouped = new Map<string, SkillOutcome[]>();
  for (const outcome of outcomes) {
    const key = `${outcome.kanaId}:${outcome.skill}`;
    const list = grouped.get(key) ?? [];
    list.push(outcome);
    grouped.set(key, list);
  }

  for (const [key, group] of grouped) {
    const [kanaIdRaw, skill] = key.split(":");
    const kanaId = Number(kanaIdRaw);

    const { data: existing } = await supabase
      .from("user_kana_mastery")
      .select("attempts, correct, streak, srs_interval_days, srs_ease")
      .eq("user_id", user.id)
      .eq("kana_id", kanaId)
      .eq("skill", skill)
      .maybeSingle();

    let streak = existing?.streak ?? 0;
    let ease = existing?.srs_ease ?? 2.5;
    let intervalDays = existing?.srs_interval_days ?? 0;

    for (const outcome of group) {
      if (outcome.correct) {
        streak += 1;
        intervalDays = intervalDays === 0 ? 1 : Math.round(intervalDays * ease);
        ease = Math.min(SRS_MAX_EASE, ease + SRS_EASE_STEP);
      } else {
        streak = 0;
        intervalDays = 1;
        ease = Math.max(SRS_MIN_EASE, ease - SRS_EASE_PENALTY);
      }
    }

    const newAttempts = (existing?.attempts ?? 0) + group.length;
    const newCorrect = (existing?.correct ?? 0) + group.filter((o) => o.correct).length;
    const accuracy = newAttempts > 0 ? newCorrect / newAttempts : 0;
    const now = new Date();
    const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("user_kana_mastery").upsert(
      {
        user_id: user.id,
        kana_id: kanaId,
        skill,
        attempts: newAttempts,
        correct: newCorrect,
        accuracy,
        streak,
        srs_interval_days: intervalDays,
        srs_ease: ease,
        due_at: dueAt,
        last_seen_at: now.toISOString(),
      },
      { onConflict: "user_id,kana_id,skill" },
    );
    if (error) return { ok: false, error: error.message };
  }

  const { error: progressError } = await supabase.from("user_kana_lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      status: "completed",
      attempts: outcomes.length,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );
  if (progressError) return { ok: false, error: progressError.message };

  revalidatePath("/belajar", "layout");
  return { ok: true };
}
