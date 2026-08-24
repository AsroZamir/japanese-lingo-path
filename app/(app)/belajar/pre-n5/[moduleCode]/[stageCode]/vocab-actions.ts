"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextSrsInterval, nextSrsEase } from "@/app/lib/srs";
import {
  clamp,
  evaluateCheckpointPass,
  evaluateDelayedGateEligibility,
  evaluateRetentionScore,
  finiteNumber,
} from "./gate-logic";

// PROMPT-8 Bagian 4/6 — actions for the Vocabulary Engine (see
// vocab-engine-query.ts and docs/POLA-MODUL-BARU.md). Mirrors actions.ts's
// shape closely on purpose (same gate-logic.ts, same SRS math, same
// two-layer delayed-gate enforcement) — the parts of the hiragana engine
// that were ALREADY content-agnostic (gates, SRS, first-attempt evidence)
// are reused directly; only the item lookup (vocab_items instead of
// kana_characters) and exercise-type grading are new.

export type VocabAttemptInput = {
  stageId: number;
  itemId: number;
  exerciseType: "listen_choice" | "type_reading" | "pattern_predict" | "contrast_choice" | "konbini_price" | "konbini_change";
  skill: "recognition" | "production" | "listening";
  selectedItemId?: number | null;
  typedValue?: string | null;
  responseTimeMs?: number | null;
  phaseCode?: string | null;
  curriculumVersion?: string | null;
  hintLevel?: number | null;
  assisted?: boolean | null;
  firstAttemptCorrect?: boolean | null;
  // For konbini_change specifically: the price already confirmed correct
  // in the same exchange (step 1), so a wrong change here can only be a
  // math slip, never a mishearing — see errorType below.
  confirmedPriceValue?: number | null;
};

export type LearningActionResult = { ok: boolean; error?: string };
export type StageCompletionResult = LearningActionResult & {
  passed?: boolean;
  score?: number;
  requiredLabel?: string;
  nextStageCode?: string | null;
};

type StageContext = {
  id: number;
  code: string;
  moduleId: number;
  moduleCode: string;
  orderIndex: number;
  passCriteria: Record<string, unknown>;
  configuration: Record<string, unknown>;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizedAnswer(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

async function getStageContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stageId: number,
): Promise<StageContext | null> {
  const { data: stage, error: stageError } = await supabase
    .from("learning_stages")
    .select("id, code, module_id, order_index, pass_criteria, configuration")
    .eq("id", stageId)
    .maybeSingle();
  if (stageError || !stage) return null;

  const { data: moduleRow, error: moduleError } = await supabase
    .from("learning_modules")
    .select("code")
    .eq("id", stage.module_id)
    .maybeSingle();
  if (moduleError || !moduleRow) return null;

  return {
    id: stage.id,
    code: stage.code,
    moduleId: stage.module_id,
    moduleCode: moduleRow.code,
    orderIndex: stage.order_index,
    passCriteria: asObject(stage.pass_criteria),
    configuration: asObject(stage.configuration),
  };
}

export async function recordVocabAttempt(input: VocabAttemptInput): Promise<LearningActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };

  const context = await getStageContext(supabase, input.stageId);
  if (!context) return { ok: false, error: "Stage tidak ditemukan." };

  const { data: item, error: itemError } = await supabase
    .from("vocab_items")
    .select("id, reading, numeric_value")
    .eq("id", input.itemId)
    .maybeSingle();
  if (itemError || !item) return { ok: false, error: "Item tidak valid." };

  const choiceTypes = new Set(["listen_choice", "contrast_choice"]);
  let isCorrect: boolean;
  let errorType: "language" | "math" | null = null;

  if (choiceTypes.has(input.exerciseType)) {
    isCorrect = input.selectedItemId === item.id;
  } else if (input.exerciseType === "konbini_price") {
    isCorrect = item.numeric_value != null && Number(input.typedValue) === item.numeric_value;
    if (!isCorrect) errorType = "language";
  } else if (input.exerciseType === "konbini_change") {
    // Price already confirmed in step 1 of the same exchange — a wrong
    // answer here is arithmetic on a correctly-heard number, not a
    // language mistake. See V2.1 PRE-N5.03: "salah hitung dipisahkan
    // dari salah bahasa."
    const expectedChange =
      input.confirmedPriceValue != null ? finiteNumber(input.confirmedPriceValue, 0) : null;
    isCorrect = expectedChange != null && Number(input.typedValue) === expectedChange;
    if (!isCorrect) errorType = "math";
  } else {
    // type_reading, pattern_predict
    isCorrect = normalizedAnswer(input.typedValue) === normalizedAnswer(item.reading);
  }

  const phaseCode = input.phaseCode ?? context.code;
  const exerciseType = "v21_" + phaseCode.toLowerCase() + "_" + input.exerciseType;

  const { error: attemptError } = await supabase.from("user_vocab_attempts").insert({
    user_id: user.id,
    item_id: item.id,
    exercise_type: exerciseType,
    is_correct: isCorrect,
    typed_value: input.typedValue?.trim() || (input.selectedItemId ? String(input.selectedItemId) : null) || (isCorrect ? null : "no-answer"),
    error_type: errorType,
    response_time_ms: input.responseTimeMs == null ? null : Math.max(0, Math.round(finiteNumber(input.responseTimeMs, 0))),
    first_attempt_correct: input.firstAttemptCorrect ?? null,
    hint_level: input.hintLevel ?? null,
    assisted: input.assisted ?? null,
    phase_code: phaseCode,
    curriculum_version: input.curriculumVersion ?? null,
  });
  if (attemptError) return { ok: false, error: attemptError.message };

  const { data: existing, error: masteryReadError } = await supabase
    .from("user_vocab_mastery")
    .select("attempts, correct, streak, srs_interval_days, srs_ease")
    .eq("user_id", user.id)
    .eq("item_id", item.id)
    .eq("skill", input.skill)
    .maybeSingle();
  if (masteryReadError) return { ok: false, error: masteryReadError.message };

  const attempts = (existing?.attempts ?? 0) + 1;
  const correct = (existing?.correct ?? 0) + (isCorrect ? 1 : 0);
  const streak = isCorrect ? (existing?.streak ?? 0) + 1 : 0;
  const intervalDays = nextSrsInterval(existing?.srs_interval_days ?? 0, isCorrect);
  const ease = nextSrsEase(existing?.srs_ease ?? 2.5, isCorrect);
  const now = new Date();
  const dueAt = new Date(now.getTime() + intervalDays * 86_400_000).toISOString();

  const { error: masteryError } = await supabase.from("user_vocab_mastery").upsert(
    {
      user_id: user.id,
      item_id: item.id,
      skill: input.skill,
      attempts,
      correct,
      accuracy: attempts > 0 ? correct / attempts : 0,
      streak,
      srs_interval_days: intervalDays,
      srs_ease: ease,
      due_at: dueAt,
      last_seen_at: now.toISOString(),
    },
    { onConflict: "user_id,item_id,skill" },
  );
  if (masteryError) return { ok: false, error: masteryError.message };

  return { ok: true };
}

export async function saveVocabStageState(input: {
  stageId: number;
  state: Record<string, unknown>;
}): Promise<LearningActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };

  const context = await getStageContext(supabase, input.stageId);
  if (!context) return { ok: false, error: "Stage tidak ditemukan." };

  const { data: existing, error: readError } = await supabase
    .from("user_learning_stage_progress")
    .select("status, score, attempts, started_at, state")
    .eq("user_id", user.id)
    .eq("stage_id", context.id)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };

  const now = new Date().toISOString();
  const { error } = await supabase.from("user_learning_stage_progress").upsert(
    {
      user_id: user.id,
      stage_id: context.id,
      status: existing?.status === "completed" ? "completed" : "in_progress",
      score: existing?.score ?? null,
      attempts: existing?.attempts ?? 0,
      state: input.state,
      started_at: existing?.started_at ?? now,
      updated_at: now,
    },
    { onConflict: "user_id,stage_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/belajar/pre-n5/" + context.moduleCode);
  return { ok: true };
}

export async function completeVocabStage(input: {
  stageId: number;
  correct: number;
  total: number;
  state?: Record<string, unknown>;
}): Promise<StageCompletionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };

  const context = await getStageContext(supabase, input.stageId);
  if (!context) return { ok: false, error: "Stage tidak ditemukan." };

  if (typeof context.configuration.delayedGateHours === "number") {
    const { data: previousStage, error: previousStageError } = await supabase
      .from("learning_stages")
      .select("id")
      .eq("module_id", context.moduleId)
      .eq("order_index", context.orderIndex - 1)
      .maybeSingle();
    if (previousStageError) return { ok: false, error: previousStageError.message };
    const { data: previousProgress, error: previousProgressError } = previousStage
      ? await supabase
          .from("user_learning_stage_progress")
          .select("first_completed_at")
          .eq("user_id", user.id)
          .eq("stage_id", previousStage.id)
          .maybeSingle()
      : { data: null, error: null };
    if (previousProgressError) return { ok: false, error: previousProgressError.message };
    const gate = evaluateDelayedGateEligibility(
      previousProgress?.first_completed_at ? new Date(previousProgress.first_completed_at) : null,
      new Date(),
      context.configuration.delayedGateHours,
    );
    if (!gate.eligible) {
      return {
        ok: false,
        error: gate.availableAt
          ? "Belum waktunya. Kembali lagi setelah " + gate.availableAt.toISOString() + "."
          : "Selesaikan tahap sebelumnya dulu.",
      };
    }
  }

  const correct = Math.max(0, Math.round(finiteNumber(input.correct, 0)));
  const total = Math.max(1, Math.round(finiteNumber(input.total, 1)));

  let evaluation: { passed: boolean; score: number; requiredLabel: string };
  if (context.configuration.retentionGate === true) {
    const { data: recentAttempts, error: recentAttemptsError } = await supabase
      .from("user_vocab_attempts")
      .select("first_attempt_correct, created_at")
      .eq("user_id", user.id)
      .eq("phase_code", context.code)
      .like("exercise_type", "v21_%")
      .order("created_at", { ascending: false })
      .limit(total);
    if (recentAttemptsError) return { ok: false, error: recentAttemptsError.message };
    const accuracyRequired = finiteNumber(context.passCriteria.accuracyPercent, 85);
    const retention = evaluateRetentionScore(
      (recentAttempts ?? []).map((row) => ({ firstAttemptCorrect: row.first_attempt_correct })),
      total,
      accuracyRequired,
    );
    evaluation = {
      passed: retention.passed,
      score: retention.score,
      requiredLabel: "minimal " + Math.round(accuracyRequired) + "% first-attempt tanpa bantuan",
    };
  } else {
    evaluation = evaluateCheckpointPass(context.passCriteria, correct, total);
  }

  const now = new Date().toISOString();
  const { data: existing, error: readError } = await supabase
    .from("user_learning_stage_progress")
    .select("status, attempts, state, started_at, first_completed_at")
    .eq("user_id", user.id)
    .eq("stage_id", context.id)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };

  const { error: upsertError } = await supabase.from("user_learning_stage_progress").upsert(
    {
      user_id: user.id,
      stage_id: context.id,
      status: evaluation.passed ? "completed" : "in_progress",
      score: clamp(evaluation.score, 0, 100),
      attempts: (existing?.attempts ?? 0) + 1,
      state: input.state ?? asObject(existing?.state),
      started_at: existing?.started_at ?? now,
      completed_at: evaluation.passed ? now : null,
      first_completed_at: existing?.first_completed_at ?? (evaluation.passed ? now : null),
      updated_at: now,
    },
    { onConflict: "user_id,stage_id" },
  );
  if (upsertError) return { ok: false, error: upsertError.message };

  const { data: readyStages, error: readyStagesError } = await supabase
    .from("learning_stages")
    .select("id, code, order_index")
    .eq("module_id", context.moduleId)
    .eq("status", "ready")
    .order("order_index");
  if (readyStagesError) return { ok: false, error: readyStagesError.message };

  const { data: progressRows, error: progressRowsError } = await supabase
    .from("user_learning_stage_progress")
    .select("stage_id, status")
    .eq("user_id", user.id)
    .in("stage_id", (readyStages ?? []).map((row) => row.id));
  if (progressRowsError) return { ok: false, error: progressRowsError.message };
  const completedIds = new Set(
    (progressRows ?? []).filter((row) => row.status === "completed").map((row) => row.stage_id),
  );
  if (evaluation.passed) completedIds.add(context.id);

  const retentionStage = (readyStages ?? []).find((row) => row.code === "RETENTION");
  const moduleCompleted = retentionStage ? completedIds.has(retentionStage.id) : false;
  const percentComplete = readyStages?.length
    ? Math.round((completedIds.size / readyStages.length) * 100)
    : 0;

  const { data: moduleProgress, error: moduleProgressReadError } = await supabase
    .from("user_learning_module_progress")
    .select("started_at")
    .eq("user_id", user.id)
    .eq("module_id", context.moduleId)
    .maybeSingle();
  if (moduleProgressReadError) return { ok: false, error: moduleProgressReadError.message };

  const { error: moduleProgressError } = await supabase.from("user_learning_module_progress").upsert(
    {
      user_id: user.id,
      module_id: context.moduleId,
      status: moduleCompleted ? "completed" : "in_progress",
      percent_complete: percentComplete,
      started_at: moduleProgress?.started_at ?? now,
      completed_at: moduleCompleted ? now : null,
      updated_at: now,
    },
    { onConflict: "user_id,module_id" },
  );
  if (moduleProgressError) return { ok: false, error: moduleProgressError.message };

  const nextStage = evaluation.passed
    ? (readyStages ?? []).find((stage) => stage.id !== context.id && !completedIds.has(stage.id)) ?? null
    : null;
  revalidatePath("/belajar");
  revalidatePath("/beranda");
  revalidatePath("/belajar/pre-n5/" + context.moduleCode);

  return {
    ok: true,
    passed: evaluation.passed,
    score: evaluation.score,
    requiredLabel: evaluation.requiredLabel,
    nextStageCode: nextStage?.code ?? null,
  };
}
