"use server";

import { createClient } from "@/lib/supabase/server";
import { nextSrsInterval, nextSrsEase } from "@/app/lib/srs";

export type LearningActionResult = { ok: boolean; error?: string };

// PROMPT-7 Bagian 4 — speed drill only ever touches characters already
// at "Bisa diingat" or higher, so every attempt here is scored on the
// SAME skill ("recall") those earlier attempts already used — this is
// meant to sharpen existing recall speed, not create a separate mastery
// track. `outcome` keeps "salah karena waktu habis" and "salah karena
// memilih jawaban salah" distinguishable in typed_value, per V2.1
// Bagian 4.3's explicit rule that those two must not be conflated.
export async function recordSpeedAttempt(input: {
  kanaId: number;
  outcome: "correct" | "wrong" | "timeout";
  selectedRomaji: string | null;
  correctRomaji: string;
  responseTimeMs: number;
}): Promise<LearningActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };

  const isCorrect = input.outcome === "correct";
  const typedValue =
    input.outcome === "timeout" ? "timeout" : (input.selectedRomaji ?? "no-answer");

  const { error: attemptError } = await supabase.from("user_kana_attempts").insert({
    user_id: user.id,
    kana_id: input.kanaId,
    word_id: null,
    lesson_id: null,
    exercise_type: "v21_speed_recognition",
    is_correct: isCorrect,
    selected_option_id: null,
    correct_option_id: null,
    typed_value: typedValue,
    response_time_ms: Math.max(0, Math.round(input.responseTimeMs)),
    first_attempt_correct: isCorrect,
    hint_level: 0,
    assisted: false,
    phase_code: "SPEED",
    curriculum_version: "v2.1",
  });
  if (attemptError) return { ok: false, error: attemptError.message };

  const { data: existing, error: masteryReadError } = await supabase
    .from("user_kana_mastery")
    .select("attempts, correct, streak, srs_interval_days, srs_ease")
    .eq("user_id", user.id)
    .eq("kana_id", input.kanaId)
    .eq("skill", "recall")
    .maybeSingle();
  if (masteryReadError) return { ok: false, error: masteryReadError.message };

  const attempts = (existing?.attempts ?? 0) + 1;
  const correct = (existing?.correct ?? 0) + (isCorrect ? 1 : 0);
  const streak = isCorrect ? (existing?.streak ?? 0) + 1 : 0;
  const intervalDays = nextSrsInterval(existing?.srs_interval_days ?? 0, isCorrect);
  const ease = nextSrsEase(existing?.srs_ease ?? 2.5, isCorrect);
  const now = new Date();
  const dueAt = new Date(now.getTime() + intervalDays * 86_400_000).toISOString();

  const { error: masteryError } = await supabase.from("user_kana_mastery").upsert(
    {
      user_id: user.id,
      kana_id: input.kanaId,
      skill: "recall",
      attempts,
      correct,
      accuracy: attempts > 0 ? correct / attempts : 0,
      streak,
      srs_interval_days: intervalDays,
      srs_ease: ease,
      due_at: dueAt,
      last_seen_at: now.toISOString(),
    },
    { onConflict: "user_id,kana_id,skill" },
  );
  if (masteryError) return { ok: false, error: masteryError.message };

  return { ok: true };
}
