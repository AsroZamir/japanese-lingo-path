"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { HIRAGANA_LAB_VERSION } from "@/app/lib/hiragana-mnemonics";

const HIRAGANA_MODULE_CODE = "PRE-N5.01";
const SRS_INTERVALS = [1, 3, 7, 14, 30] as const;

type KanaSkill = "visual" | "audio" | "recall" | "writing" | "reading" | "typing";

export type HiraganaAttemptInput = {
  stageId: number;
  kanaId: number;
  exerciseType:
    | "checkpoint"
    | "trace"
    | "type_romaji"
    | "reverse_recall"
    | "audio_visual"
    | "write_from_audio"
    | "blitz"
    | "srs"
    | "gate_recognition"
    | "gate_audio"
    | "gate_writing";
  skill: KanaSkill;
  answerText?: string | null;
  selectedKanaId?: number | null;
  writingScore?: number | null;
  responseTimeMs?: number | null;
};

export type LearningActionResult = {
  ok: boolean;
  error?: string;
};

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
  passCriteria: Record<string, unknown>;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
    .select("id, code, module_id, pass_criteria")
    .eq("id", stageId)
    .maybeSingle();
  if (stageError || !stage) return null;

  const { data: module, error: moduleError } = await supabase
    .from("learning_modules")
    .select("code")
    .eq("id", stage.module_id)
    .maybeSingle();
  if (moduleError || module?.code !== HIRAGANA_MODULE_CODE) return null;

  return {
    id: stage.id,
    code: stage.code,
    moduleId: stage.module_id,
    passCriteria: asObject(stage.pass_criteria),
  };
}

function nextSrsInterval(currentDays: number, correct: boolean): number {
  if (!correct) return 1;
  const currentIndex = SRS_INTERVALS.findIndex((days) => days >= currentDays);
  if (currentIndex < 0) return SRS_INTERVALS[SRS_INTERVALS.length - 1];
  return SRS_INTERVALS[Math.min(currentIndex + (currentDays > 0 ? 1 : 0), SRS_INTERVALS.length - 1)];
}

export async function recordHiraganaAttempt(
  input: HiraganaAttemptInput,
): Promise<LearningActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };

  const context = await getStageContext(supabase, input.stageId);
  if (!context) return { ok: false, error: "Stage Hiragana tidak ditemukan." };

  const { data: kana, error: kanaError } = await supabase
    .from("kana_characters")
    .select("id, romaji, script")
    .eq("id", input.kanaId)
    .eq("script", "hiragana")
    .maybeSingle();
  if (kanaError || !kana) return { ok: false, error: "Karakter Hiragana tidak valid." };

  const choiceTypes = new Set(["reverse_recall", "audio_visual", "gate_audio"]);
  const writingTypes = new Set(["trace", "write_from_audio", "gate_writing"]);
  let isCorrect: boolean;
  if (choiceTypes.has(input.exerciseType)) {
    isCorrect = input.selectedKanaId === kana.id;
  } else if (writingTypes.has(input.exerciseType)) {
    isCorrect = finiteNumber(input.writingScore, 0) >= 80;
  } else {
    isCorrect = normalizedAnswer(input.answerText) === normalizedAnswer(kana.romaji);
  }

  const writingScore =
    input.writingScore == null ? null : clamp(finiteNumber(input.writingScore, 0), 0, 100);
  const typedValue =
    input.answerText?.trim() ||
    (writingScore != null ? "writing-score:" + Math.round(writingScore) : null) ||
    (!isCorrect ? "no-answer" : null);
  const exerciseType = "v2_" + context.code.toLowerCase() + "_" + input.exerciseType;

  const { error: attemptError } = await supabase.from("user_kana_attempts").insert({
    user_id: user.id,
    kana_id: kana.id,
    word_id: null,
    lesson_id: null,
    exercise_type: exerciseType,
    is_correct: isCorrect,
    selected_option_id: input.selectedKanaId ?? null,
    correct_option_id: kana.id,
    typed_value: typedValue,
    response_time_ms:
      input.responseTimeMs == null
        ? null
        : Math.max(0, Math.round(finiteNumber(input.responseTimeMs, 0))),
  });
  if (attemptError) return { ok: false, error: attemptError.message };

  const { data: existing, error: masteryReadError } = await supabase
    .from("user_kana_mastery")
    .select("attempts, correct, streak, srs_interval_days, srs_ease")
    .eq("user_id", user.id)
    .eq("kana_id", kana.id)
    .eq("skill", input.skill)
    .maybeSingle();
  if (masteryReadError) return { ok: false, error: masteryReadError.message };

  const attempts = (existing?.attempts ?? 0) + 1;
  const correct = (existing?.correct ?? 0) + (isCorrect ? 1 : 0);
  const streak = isCorrect ? (existing?.streak ?? 0) + 1 : 0;
  const intervalDays = nextSrsInterval(existing?.srs_interval_days ?? 0, isCorrect);
  const ease = clamp((existing?.srs_ease ?? 2.5) + (isCorrect ? 0.1 : -0.2), 1.3, 3);
  const now = new Date();
  const dueAt = new Date(now.getTime() + intervalDays * 86_400_000).toISOString();

  const { error: masteryError } = await supabase.from("user_kana_mastery").upsert(
    {
      user_id: user.id,
      kana_id: kana.id,
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
    { onConflict: "user_id,kana_id,skill" },
  );
  if (masteryError) return { ok: false, error: masteryError.message };

  return { ok: true };
}

export async function saveHiraganaStageState(input: {
  stageId: number;
  state: Record<string, unknown>;
}): Promise<LearningActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };

  const context = await getStageContext(supabase, input.stageId);
  if (!context) return { ok: false, error: "Stage Hiragana tidak ditemukan." };
  const nextState = { ...input.state, labVersion: HIRAGANA_LAB_VERSION };
  if (JSON.stringify(nextState).length > 24_000) {
    return { ok: false, error: "State stage terlalu besar." };
  }

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
      status:
        existing?.status === "completed" &&
        asObject(existing.state).labVersion === HIRAGANA_LAB_VERSION
          ? "completed"
          : "in_progress",
      score:
        asObject(existing?.state).labVersion === HIRAGANA_LAB_VERSION
          ? existing?.score ?? null
          : null,
      attempts:
        asObject(existing?.state).labVersion === HIRAGANA_LAB_VERSION
          ? existing?.attempts ?? 0
          : 0,
      state: nextState,
      started_at: existing?.started_at ?? now,
      updated_at: now,
    },
    { onConflict: "user_id,stage_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/belajar/pre-n5/" + HIRAGANA_MODULE_CODE);
  return { ok: true };
}

function evaluatePass(
  passCriteria: Record<string, unknown>,
  correct: number,
  total: number,
): { passed: boolean; score: number; requiredLabel: string } {
  const score = total > 0 ? clamp((correct / total) * 100, 0, 100) : 0;
  const accuracyRequired = finiteNumber(
    passCriteria.accuracyPercent ?? passCriteria.scorePercent,
    0,
  );
  const correctRequired = finiteNumber(passCriteria.correctCount, 0);

  if (correctRequired > 0) {
    return {
      passed: correct >= correctRequired,
      score,
      requiredLabel: "minimal " + correctRequired + " jawaban benar",
    };
  }
  return {
    passed: score >= accuracyRequired,
    score,
    requiredLabel: "minimal " + Math.round(accuracyRequired) + "%",
  };
}

export async function completeHiraganaStage(input: {
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
  if (!context) return { ok: false, error: "Stage Hiragana tidak ditemukan." };

  const correct = Math.max(0, Math.round(finiteNumber(input.correct, 0)));
  const total = Math.max(1, Math.round(finiteNumber(input.total, 1)));
  const evaluation = evaluatePass(context.passCriteria, correct, total);

  const { data: existing, error: progressReadError } = await supabase
    .from("user_learning_stage_progress")
    .select("attempts, started_at, state")
    .eq("user_id", user.id)
    .eq("stage_id", context.id)
    .maybeSingle();
  if (progressReadError) return { ok: false, error: progressReadError.message };

  const now = new Date().toISOString();
  const state = {
    ...(input.state ?? asObject(existing?.state)),
    labVersion: HIRAGANA_LAB_VERSION,
  };
  const { error: stageProgressError } = await supabase
    .from("user_learning_stage_progress")
    .upsert(
      {
        user_id: user.id,
        stage_id: context.id,
        status: evaluation.passed ? "completed" : "in_progress",
        score: evaluation.score,
        attempts: (existing?.attempts ?? 0) + 1,
        state,
        started_at: existing?.started_at ?? now,
        completed_at: evaluation.passed ? now : null,
        updated_at: now,
      },
      { onConflict: "user_id,stage_id" },
    );
  if (stageProgressError) return { ok: false, error: stageProgressError.message };

  const { data: readyStages, error: readyStageError } = await supabase
    .from("learning_stages")
    .select("id, code, order_index")
    .eq("module_id", context.moduleId)
    .eq("status", "ready")
    .order("order_index");
  if (readyStageError) return { ok: false, error: readyStageError.message };

  const readyStageIds = (readyStages ?? []).map((stage) => stage.id);
  const { data: allProgress, error: allProgressError } =
    readyStageIds.length > 0
      ? await supabase
          .from("user_learning_stage_progress")
          .select("stage_id, status, state")
          .eq("user_id", user.id)
          .in("stage_id", readyStageIds)
      : { data: [], error: null };
  if (allProgressError) return { ok: false, error: allProgressError.message };

  const completedIds = new Set(
    (allProgress ?? [])
      .filter(
        (progress) =>
          progress.status === "completed" &&
          asObject(progress.state).labVersion === HIRAGANA_LAB_VERSION,
      )
      .map((progress) => progress.stage_id),
  );
  const percentComplete =
    readyStageIds.length > 0
      ? Math.round((completedIds.size / readyStageIds.length) * 100)
      : 0;
  const moduleCompleted =
    readyStageIds.length > 0 && completedIds.size === readyStageIds.length;

  const { data: moduleProgress, error: moduleProgressReadError } = await supabase
    .from("user_learning_module_progress")
    .select("started_at")
    .eq("user_id", user.id)
    .eq("module_id", context.moduleId)
    .maybeSingle();
  if (moduleProgressReadError) {
    return { ok: false, error: moduleProgressReadError.message };
  }

  const { error: moduleProgressError } = await supabase
    .from("user_learning_module_progress")
    .upsert(
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

  const nextStage =
    evaluation.passed
      ? (readyStages ?? []).find((stage) => stage.id !== context.id && !completedIds.has(stage.id)) ?? null
      : null;
  revalidatePath("/belajar");
  revalidatePath("/beranda");
  revalidatePath("/belajar/pre-n5/" + HIRAGANA_MODULE_CODE);

  return {
    ok: true,
    passed: evaluation.passed,
    score: evaluation.score,
    requiredLabel: evaluation.requiredLabel,
    nextStageCode: nextStage?.code ?? null,
  };
}
