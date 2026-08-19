"use client";

import { useMemo, useState } from "react";
import { ExerciseRunner, type ExerciseItem, type ExerciseAttemptResult, type ExerciseRunnerResult } from "@/components/kana/ExerciseRunner";
import type { LessonBundle } from "@/app/lib/lesson-query";
import { recordAttempt, completeLesson } from "./actions";
import { skillForExerciseType, type SkillOutcome } from "./skill-mapping";
import { useLessonProgress } from "./LessonPlayer";

function buildTestItems(bundle: LessonBundle): ExerciseItem[] {
  const kanaOptions = bundle.kana.map((k) => ({ id: k.id, label: k.character }));
  const romajiOptions = bundle.kana.map((k) => ({ id: k.id, label: k.romaji }));

  const recallItems: ExerciseItem[] = bundle.kana.map((k) => ({
    id: `test-recall-${k.id}`,
    type: "recall",
    kanaId: k.id,
    promptRomaji: k.romaji,
    options: kanaOptions,
    correctOptionId: k.id,
  }));

  const visualToSoundItems: ExerciseItem[] = bundle.kana.map((k) => ({
    id: `test-vts-${k.id}`,
    type: "visual_to_sound",
    kanaId: k.id,
    promptKana: k.character,
    promptAudioUrl: k.audioUrl,
    options: romajiOptions,
    correctOptionId: k.id,
  }));

  const typingItems: ExerciseItem[] = bundle.kana.map((k) => ({
    id: `test-typing-${k.id}`,
    type: "typing",
    kanaId: k.id,
    promptKana: k.character,
    expectedTyping: k.character,
  }));

  return [...recallItems, ...visualToSoundItems, ...typingItems];
}

// Test mode: config.allowRetry is left unset (false) on purpose — a
// mini test with unlimited retries isn't a test.
export function LessonL04({ bundle }: { bundle: LessonBundle }) {
  const items = useMemo(() => buildTestItems(bundle), [bundle]);
  const [result, setResult] = useState<ExerciseRunnerResult | null>(null);
  const { reportProgress, reportLessonResult } = useLessonProgress();

  function handleAttempt(attempt: ExerciseAttemptResult) {
    void recordAttempt({
      kanaId: attempt.kanaId ?? null,
      wordId: attempt.wordId ?? null,
      lessonId: bundle.lesson.id,
      exerciseType: attempt.exerciseType,
      isCorrect: attempt.isCorrect,
      selectedOptionId: attempt.selectedOptionId,
      correctOptionId: attempt.correctOptionId,
      typedValue: attempt.typedValue ?? null,
      responseTimeMs: attempt.responseTimeMs,
    });
  }

  function handleComplete(runnerResult: ExerciseRunnerResult) {
    setResult(runnerResult);
    const outcomes: SkillOutcome[] = runnerResult.attempts
      .filter((a): a is ExerciseAttemptResult & { kanaId: number } => a.kanaId != null)
      .map((a) => ({ kanaId: a.kanaId, skill: skillForExerciseType(a.exerciseType), correct: a.isCorrect }));
    void completeLesson(bundle.lesson.id, outcomes);
    reportLessonResult(runnerResult.correctCount, runnerResult.totalCount);
  }

  if (result) {
    const passed = result.correctCount / result.totalCount >= 0.8;
    return (
      <p className="welcome-copy">
        Mini test selesai — {result.correctCount}/{result.totalCount} benar ({passed ? "LULUS" : "belum lulus, coba lagi nanti"}).
      </p>
    );
  }

  return <ExerciseRunner items={items} config={{ shuffle: true, allowRetry: false }} onAttempt={handleAttempt} onComplete={handleComplete} onProgress={reportProgress} />;
}
