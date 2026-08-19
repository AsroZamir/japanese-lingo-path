"use client";

import { useMemo, useState } from "react";
import { ExerciseRunner, type ExerciseItem, type ExerciseAttemptResult, type ExerciseRunnerResult } from "@/components/kana/ExerciseRunner";
import type { LessonExampleWord } from "@/app/lib/lesson-query";
import { recordAttempt, completeLesson } from "./actions";
import type { SkillOutcome } from "./skill-mapping";
import { useLessonProgress } from "./LessonPlayer";

export type WordPoolBundle = {
  module: { id: number; code: string; titleId: string };
  phase: { id: number; code: string; titleId: string };
  lesson: { id: number; code: string; titleId: string; lessonType: string; romajiPolicy: "always" | "on_demand" | "hidden" };
  words: LessonExampleWord[];
};

// Distractor romaji/kana for a word's multiple-choice options — 3 OTHER
// words from the same pool with a different romaji (never the word's own
// component characters, since a word is being read as a whole unit here,
// not decomposed like the character-level LessonL03).
function pickDistractors(words: LessonExampleWord[], exclude: LessonExampleWord, count: number): LessonExampleWord[] {
  const candidates = words.filter((w) => w.id !== exclude.id && w.romaji !== exclude.romaji);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function buildItems(words: LessonExampleWord[]): ExerciseItem[] {
  const readingItems: ExerciseItem[] = words.map((w) => {
    const distractors = pickDistractors(words, w, 3);
    const options = [w, ...distractors].map((x) => ({ id: x.id, label: x.romaji }));
    return {
      id: `word-reading-${w.id}`,
      type: "word_reading",
      wordId: w.id,
      promptKana: w.wordKana,
      promptMeaning: w.meaningId,
      options,
      correctOptionId: w.id,
    };
  });

  const audioItems: ExerciseItem[] = words
    .filter((w) => w.audioUrl != null)
    .map((w) => {
      const distractors = pickDistractors(words, w, 3);
      const options = [w, ...distractors].map((x) => ({ id: x.id, label: x.wordKana }));
      return {
        id: `word-audio-${w.id}`,
        type: "sound_to_visual",
        wordId: w.id,
        promptAudioUrl: w.audioUrl,
        options,
        correctOptionId: w.id,
      };
    });

  return [...readingItems, ...audioItems];
}

export function LessonReading({ bundle }: { bundle: WordPoolBundle }) {
  const items = useMemo(() => buildItems(bundle.words), [bundle.words]);
  const wordById = useMemo(() => new Map(bundle.words.map((w) => [w.id, w])), [bundle.words]);
  const [result, setResult] = useState<ExerciseRunnerResult | null>(null);
  const { reportProgress, reportLessonResult } = useLessonProgress();

  function handleAttempt(attempt: ExerciseAttemptResult) {
    void recordAttempt({
      kanaId: null,
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
    // A word attempt has no single kanaId of its own (it's a whole-word
    // read) — credit/blame spreads to every character the word is made
    // of, so user_kana_mastery's per-kana "reading"/"audio" skill still
    // moves, instead of the outcome being silently dropped the way a
    // plain kanaId-only filter (LessonL03's pattern) would drop it.
    const outcomes: SkillOutcome[] = runnerResult.attempts.flatMap((a) => {
      if (a.wordId == null) return [];
      const word = wordById.get(a.wordId);
      if (!word) return [];
      const skill = a.exerciseType === "sound_to_visual" ? "audio" : "reading";
      return word.characters.map((c) => ({ kanaId: c.kanaId, skill, correct: a.isCorrect }));
    });
    void completeLesson(bundle.lesson.id, outcomes);
    reportLessonResult(runnerResult.correctCount, runnerResult.totalCount);
  }

  if (result) {
    return <p className="welcome-copy">Selesai — {result.correctCount}/{result.totalCount} benar.</p>;
  }

  return <ExerciseRunner items={items} config={{ shuffle: true }} onAttempt={handleAttempt} onComplete={handleComplete} onProgress={reportProgress} />;
}
