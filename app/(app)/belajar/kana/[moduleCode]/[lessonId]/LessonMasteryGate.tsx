"use client";

import { useMemo, useState } from "react";
import { ExerciseRunner, type ExerciseItem, type ExerciseAttemptResult, type ExerciseRunnerResult } from "@/components/kana/ExerciseRunner";
import type { RecallBundle } from "./LessonActiveRecall";
import type { ConfusionPair } from "@/app/lib/kana-pool-query";
import type { LessonKanaItem } from "@/app/lib/lesson-query";
import { recordAttempt, completeLesson, recordGateResult } from "./actions";
import { skillForExerciseType, type SkillOutcome } from "./skill-mapping";
import { useLessonProgress } from "./LessonPlayer";

export type MasteryBundle = RecallBundle & {
  phaseId: number;
  confusionPairs: ConfusionPair[];
  /** L02 only — weakest kana for THIS user by accuracy; empty if there's no attempt history to rank yet. */
  weakestKana: LessonKanaItem[];
  /** L03 only — kana whose SRS due_at has passed; empty if nothing is due right now. */
  dueKana: LessonKanaItem[];
};

function sample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function kanaDistractors(pool: LessonKanaItem[], exclude: LessonKanaItem, count: number): LessonKanaItem[] {
  return sample(pool.filter((k) => k.id !== exclude.id && k.romaji !== exclude.romaji), count);
}

function buildKanaMcqItems(target: LessonKanaItem[], distractorPool: LessonKanaItem[]): ExerciseItem[] {
  return target.flatMap((k) => {
    const items: ExerciseItem[] = [];
    if (k.audioUrl) {
      const vtsOptions = [k, ...kanaDistractors(distractorPool, k, 3)].map((x) => ({ id: x.id, label: x.romaji }));
      items.push({ id: `vts-${k.id}`, type: "visual_to_sound", kanaId: k.id, promptKana: k.character, promptAudioUrl: k.audioUrl, options: vtsOptions, correctOptionId: k.id });
      const stvOptions = [k, ...kanaDistractors(distractorPool, k, 3)].map((x) => ({ id: x.id, label: x.character }));
      items.push({ id: `stv-${k.id}`, type: "sound_to_visual", kanaId: k.id, promptAudioUrl: k.audioUrl, options: stvOptions, correctOptionId: k.id });
    }
    return items;
  });
}

const MASTERY_TEST_KANA_COUNT = 20;
const MASTERY_TEST_WORD_COUNT = 10;
const MASTERY_TEST_PASS_RATIO = 0.75;

function buildMasteryTestItems(bundle: MasteryBundle): ExerciseItem[] {
  const drillableKana = bundle.kana.filter((k) => k.audioUrl != null);
  const kanaItems = buildKanaMcqItems(sample(drillableKana, MASTERY_TEST_KANA_COUNT), drillableKana);

  const wordItems: ExerciseItem[] = sample(bundle.words, MASTERY_TEST_WORD_COUNT).map((w) => {
    const distractors = sample(bundle.words.filter((d) => d.id !== w.id && d.romaji !== w.romaji), 3);
    const options = [w, ...distractors].map((x) => ({ id: x.id, label: x.romaji }));
    return { id: `word-${w.id}`, type: "word_reading", wordId: w.id, promptKana: w.wordKana, options, correctOptionId: w.id };
  });

  const confusionItems: ExerciseItem[] = bundle.confusionPairs.flatMap((pair) => {
    if (!pair.kanaA.audioUrl) return [];
    const options = [
      { id: pair.kanaA.id, label: pair.kanaA.character },
      { id: pair.kanaB.id, label: pair.kanaB.character },
    ];
    return [{ id: `sk-${pair.kanaA.id}-${pair.kanaB.id}`, type: "similar_kana_discrimination" as const, kanaId: pair.kanaA.id, promptAudioUrl: pair.kanaA.audioUrl, options, correctOptionId: pair.kanaA.id }];
  });

  return sample([...kanaItems, ...wordItems, ...confusionItems], kanaItems.length + wordItems.length + confusionItems.length);
}

const REMEDIATION_FALLBACK_COUNT = 15;

function buildRemediationItems(bundle: MasteryBundle): ExerciseItem[] {
  const drillableKana = bundle.kana.filter((k) => k.audioUrl != null);
  // No attempt history to rank yet (a fresh account jumping straight to
  // Fase 8, or someone who's somehow never gotten anything wrong) — fall
  // back to a general sample instead of an empty lesson.
  const target = bundle.weakestKana.length > 0 ? bundle.weakestKana : sample(drillableKana, REMEDIATION_FALLBACK_COUNT);
  return buildKanaMcqItems(target, drillableKana);
}

function buildRetentionItems(bundle: MasteryBundle): ExerciseItem[] {
  const drillableKana = bundle.kana.filter((k) => k.audioUrl != null);
  return buildKanaMcqItems(bundle.dueKana, drillableKana);
}

const FINAL_GATE_PASS_RATIO = 0.85;

function buildFinalGateItems(bundle: MasteryBundle): ExerciseItem[] {
  // Same shape as the diagnostic test but a stricter pass bar (see
  // FINAL_GATE_PASS_RATIO) — this is the one whose result actually
  // determines the module's unlock state, not just a checkpoint.
  return buildMasteryTestItems(bundle);
}

export function LessonMasteryGate({ bundle }: { bundle: MasteryBundle }) {
  const items = useMemo(() => {
    switch (bundle.lesson.code) {
      case "L01": return buildMasteryTestItems(bundle);
      case "L02": return buildRemediationItems(bundle);
      case "L03": return buildRetentionItems(bundle);
      default: return buildFinalGateItems(bundle);
    }
  }, [bundle]);
  const wordById = useMemo(() => new Map(bundle.words.map((w) => [w.id, w])), [bundle.words]);
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
    const outcomes: SkillOutcome[] = runnerResult.attempts.flatMap((a): SkillOutcome[] => {
      const skill = skillForExerciseType(a.exerciseType);
      if (a.kanaId != null) return [{ kanaId: a.kanaId, skill, correct: a.isCorrect }];
      if (a.wordId != null) {
        const word = wordById.get(a.wordId);
        if (!word) return [];
        return word.characters.map((c) => ({ kanaId: c.kanaId, skill, correct: a.isCorrect }));
      }
      return [];
    });
    void completeLesson(bundle.lesson.id, outcomes);
    reportLessonResult(runnerResult.correctCount, runnerResult.totalCount);

    if (bundle.lesson.code === "L01" || bundle.lesson.code === "L04") {
      const ratio = runnerResult.totalCount > 0 ? runnerResult.correctCount / runnerResult.totalCount : 0;
      const passRatio = bundle.lesson.code === "L01" ? MASTERY_TEST_PASS_RATIO : FINAL_GATE_PASS_RATIO;
      void recordGateResult({
        phaseId: bundle.phaseId,
        passed: ratio >= passRatio,
        scoresJson: { lessonCode: bundle.lesson.code, correct: runnerResult.correctCount, total: runnerResult.totalCount, ratio },
      });
    }
  }

  if (bundle.lesson.code === "L03" && bundle.dueKana.length === 0) {
    return <p className="welcome-copy">Belum ada huruf yang perlu direview sekarang — jadwal ulangnya belum jatuh tempo. Coba lagi nanti.</p>;
  }

  if (result) {
    const ratio = result.totalCount > 0 ? result.correctCount / result.totalCount : 0;
    const isGate = bundle.lesson.code === "L01" || bundle.lesson.code === "L04";
    const passRatio = bundle.lesson.code === "L01" ? MASTERY_TEST_PASS_RATIO : FINAL_GATE_PASS_RATIO;
    return (
      <p className="welcome-copy">
        Selesai — {result.correctCount}/{result.totalCount} benar.
        {isGate && (ratio >= passRatio ? " Lulus ✓" : ` Belum lulus (butuh minimal ${Math.round(passRatio * 100)}%) — ulangi lesson ini kapan saja.`)}
      </p>
    );
  }

  return <ExerciseRunner items={items} config={{ shuffle: true }} onAttempt={handleAttempt} onComplete={handleComplete} onProgress={reportProgress} />;
}
