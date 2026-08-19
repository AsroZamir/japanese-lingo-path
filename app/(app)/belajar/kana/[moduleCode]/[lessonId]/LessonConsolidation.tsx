"use client";

import { useMemo, useState } from "react";
import { ExerciseRunner, type ExerciseItem, type ExerciseAttemptResult, type ExerciseRunnerResult } from "@/components/kana/ExerciseRunner";
import type { RecallBundle } from "./LessonActiveRecall";
import type { ConfusionPair } from "@/app/lib/kana-pool-query";
import { recordAttempt, completeLesson } from "./actions";
import { skillForExerciseType, type SkillOutcome } from "./skill-mapping";
import { useLessonProgress } from "./LessonPlayer";

export type ConsolidationBundle = RecallBundle & { confusionPairs: ConfusionPair[] };

function sample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// P20-L01 — Similar Kana: forced 2-way choice per pair, once per
// direction (audio of A -> pick A vs B, then audio of B -> pick B vs A)
// — a pair a learner keeps confusing needs testing both ways, not just
// one, or a lucky 50/50 guess on the untested direction would hide it.
function buildSimilarKanaItems(pairs: ConfusionPair[]): ExerciseItem[] {
  return pairs.flatMap((pair) => {
    const options = [
      { id: pair.kanaA.id, label: pair.kanaA.character },
      { id: pair.kanaB.id, label: pair.kanaB.character },
    ];
    const items: ExerciseItem[] = [];
    if (pair.kanaA.audioUrl) {
      items.push({ id: `sk-${pair.kanaA.id}-${pair.kanaB.id}-a`, type: "similar_kana_discrimination", kanaId: pair.kanaA.id, promptAudioUrl: pair.kanaA.audioUrl, options, correctOptionId: pair.kanaA.id });
    }
    if (pair.kanaB.audioUrl) {
      items.push({ id: `sk-${pair.kanaA.id}-${pair.kanaB.id}-b`, type: "similar_kana_discrimination", kanaId: pair.kanaB.id, promptAudioUrl: pair.kanaB.audioUrl, options, correctOptionId: pair.kanaB.id });
    }
    return items;
  });
}

// P20-L02 — No-Romaji Challenge: everything the learner has to answer
// against a clock, with romaji nowhere in sight (romaji_policy on the
// lesson itself is "hidden" too, at the RomajiText-preference level —
// this is the exercise-level enforcement: prompts never show it, options
// for the kana items are OTHER KANA, not romaji, so there's truly
// nothing latin-alphabet to lean on for those).
const L02_TIME_LIMIT_SECONDS = 6;
const L02_KANA_COUNT = 15;
const L02_WORD_COUNT = 10;

function buildNoRomajiChallengeItems(bundle: ConsolidationBundle): ExerciseItem[] {
  const drillableKana = bundle.kana.filter((k) => k.audioUrl != null);
  const kanaItems: ExerciseItem[] = sample(drillableKana, L02_KANA_COUNT).map((k) => {
    const distractors = sample(drillableKana.filter((d) => d.id !== k.id && d.romaji !== k.romaji), 3);
    const options = [k, ...distractors].map((x) => ({ id: x.id, label: x.character }));
    return { id: `l02-kana-${k.id}`, type: "timed_recognition", kanaId: k.id, promptAudioUrl: k.audioUrl, options, correctOptionId: k.id, timeLimitSeconds: L02_TIME_LIMIT_SECONDS };
  });

  const wordItems: ExerciseItem[] = sample(bundle.words, L02_WORD_COUNT).map((w) => {
    const distractors = sample(bundle.words.filter((d) => d.id !== w.id && d.romaji !== w.romaji), 3);
    const options = [w, ...distractors].map((x) => ({ id: x.id, label: x.wordKana }));
    return { id: `l02-word-${w.id}`, type: "timed_recognition", wordId: w.id, promptAudioUrl: w.audioUrl, options, correctOptionId: w.id, timeLimitSeconds: L02_TIME_LIMIT_SECONDS };
  });

  return sample([...kanaItems, ...wordItems], kanaItems.length + wordItems.length);
}

export function LessonConsolidation({ bundle }: { bundle: ConsolidationBundle }) {
  const items = useMemo(
    () => (bundle.lesson.code === "L01" ? buildSimilarKanaItems(bundle.confusionPairs) : buildNoRomajiChallengeItems(bundle)),
    [bundle],
  );
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
  }

  if (result) {
    return <p className="welcome-copy">Selesai — {result.correctCount}/{result.totalCount} benar.</p>;
  }

  return <ExerciseRunner items={items} config={{ shuffle: true }} onAttempt={handleAttempt} onComplete={handleComplete} onProgress={reportProgress} />;
}
