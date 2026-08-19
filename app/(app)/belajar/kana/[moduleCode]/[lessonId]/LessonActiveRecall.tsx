"use client";

import { useMemo, useState } from "react";
import { ExerciseRunner, type ExerciseItem, type ExerciseAttemptResult, type ExerciseRunnerResult } from "@/components/kana/ExerciseRunner";
import type { LessonKanaItem, LessonExampleWord } from "@/app/lib/lesson-query";
import { recordAttempt, completeLesson } from "./actions";
import type { KanaSkill, SkillOutcome } from "./skill-mapping";
import { useLessonProgress } from "./LessonPlayer";

export type RecallBundle = {
  lesson: { id: number; code: string; titleId: string; lessonType: string };
  kana: LessonKanaItem[]; // whole taught-so-far pool, not one lesson's own items
  words: LessonExampleWord[];
};

function sample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function kanaDistractors(pool: LessonKanaItem[], exclude: LessonKanaItem, count: number): LessonKanaItem[] {
  return sample(pool.filter((k) => k.id !== exclude.id && k.romaji !== exclude.romaji), count);
}
function wordDistractors(pool: LessonExampleWord[], exclude: LessonExampleWord, count: number): LessonExampleWord[] {
  return sample(pool.filter((w) => w.id !== exclude.id && w.romaji !== exclude.romaji), count);
}

const L01_SAMPLE_SIZE = 30;

function buildSoundToKanaItems(kanaPool: LessonKanaItem[]): ExerciseItem[] {
  const drillable = kanaPool.filter((k) => k.audioUrl != null);
  return sample(drillable, L01_SAMPLE_SIZE).map((k) => {
    const distractors = kanaDistractors(drillable, k, 3);
    const options = [k, ...distractors].map((x) => ({ id: x.id, label: x.character }));
    return {
      id: `l01-${k.id}`,
      type: "sound_to_visual",
      kanaId: k.id,
      promptAudioUrl: k.audioUrl,
      options,
      correctOptionId: k.id,
    };
  });
}

const L03_KANA_VISUAL_COUNT = 10;
const L03_KANA_AUDIO_COUNT = 10;
const L03_WORD_READING_COUNT = 8;
const L03_WORD_TYPING_COUNT = 8;

function buildMixedRecallItems(kanaPool: LessonKanaItem[], wordPool: LessonExampleWord[]): ExerciseItem[] {
  const drillableKana = kanaPool.filter((k) => k.audioUrl != null);

  const visualToSound: ExerciseItem[] = sample(drillableKana, L03_KANA_VISUAL_COUNT).map((k) => {
    const options = [k, ...kanaDistractors(drillableKana, k, 3)].map((x) => ({ id: x.id, label: x.romaji }));
    return { id: `l03-vts-${k.id}`, type: "visual_to_sound", kanaId: k.id, promptKana: k.character, promptAudioUrl: k.audioUrl, options, correctOptionId: k.id };
  });

  const soundToVisual: ExerciseItem[] = sample(drillableKana, L03_KANA_AUDIO_COUNT).map((k) => {
    const options = [k, ...kanaDistractors(drillableKana, k, 3)].map((x) => ({ id: x.id, label: x.character }));
    return { id: `l03-stv-${k.id}`, type: "sound_to_visual", kanaId: k.id, promptAudioUrl: k.audioUrl, options, correctOptionId: k.id };
  });

  const wordReading: ExerciseItem[] = sample(wordPool, L03_WORD_READING_COUNT).map((w) => {
    const options = [w, ...wordDistractors(wordPool, w, 3)].map((x) => ({ id: x.id, label: x.romaji }));
    return { id: `l03-wr-${w.id}`, type: "word_reading", wordId: w.id, promptKana: w.wordKana, promptMeaning: w.meaningId, options, correctOptionId: w.id };
  });

  const typing: ExerciseItem[] = sample(wordPool, L03_WORD_TYPING_COUNT).map((w) => ({
    id: `l03-typing-${w.id}`,
    type: "typing",
    wordId: w.id,
    promptMeaning: w.meaningId,
    expectedTyping: w.wordKana,
  }));

  return [...visualToSound, ...soundToVisual, ...wordReading, ...typing];
}

export function LessonActiveRecall({ bundle }: { bundle: RecallBundle }) {
  const items = useMemo(
    () => (bundle.lesson.code === "L01" ? buildSoundToKanaItems(bundle.kana) : buildMixedRecallItems(bundle.kana, bundle.words)),
    [bundle.lesson.code, bundle.kana, bundle.words],
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
    // Same spread-to-component-characters rule as LessonReading — a word
    // attempt (word_reading/typing) has no single kanaId of its own.
    const outcomes: SkillOutcome[] = runnerResult.attempts.flatMap((a): SkillOutcome[] => {
      if (a.kanaId != null) {
        const skill: KanaSkill = a.exerciseType === "sound_to_visual" ? "audio" : a.exerciseType === "visual_to_sound" ? "visual" : "recall";
        return [{ kanaId: a.kanaId, skill, correct: a.isCorrect }];
      }
      if (a.wordId != null) {
        const word = wordById.get(a.wordId);
        if (!word) return [];
        const skill: KanaSkill = a.exerciseType === "typing" ? "typing" : "reading";
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
