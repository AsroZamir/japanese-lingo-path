"use client";

import { useMemo, useState } from "react";
import { ExerciseRunner, type ExerciseItem, type ExerciseAttemptResult, type ExerciseRunnerResult } from "@/components/kana/ExerciseRunner";
import type { LessonBundle, LessonExampleWord } from "@/app/lib/lesson-query";
import { recordAttempt, completeLesson } from "./actions";
import { skillForExerciseType, type SkillOutcome } from "./skill-mapping";
import { useLessonProgress } from "./LessonPlayer";

function shuffled<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Draws `n` items from `arr`, repeating from a reshuffled copy once the
// pool runs out — Mini Test targets a fixed item count regardless of how
// small a group's own kana set or the cumulative word pool happens to be
// (M02 Group A's word pool is 7; asking for 6 word-level items must not
// silently shrink the test to whatever the smallest pool has).
function sampleWithRepeat<T>(pool: T[], n: number): T[] {
  if (pool.length === 0 || n <= 0) return [];
  const result: T[] = [];
  let bag = shuffled(pool);
  while (result.length < n) {
    if (bag.length === 0) bag = shuffled(pool);
    result.push(bag.pop()!);
  }
  return result;
}

function distractors<T>(pool: T[], exclude: T, key: (x: T) => string, count: number): T[] {
  const excludeKey = key(exclude);
  const candidates = shuffled(pool.filter((x) => key(x) !== excludeKey));
  return candidates.slice(0, count);
}

// ── Bagian 4: soal Mini Test tidak lagi hanya varian pengenalan huruf
// tunggal — komposisi 40% huruf tunggal / 40% tingkat kata / 20% dikte,
// per instruksi. Kata diambil dari cumulativeWords (semua kana yang
// sudah diajarkan sampai kelompok ini, lihat getWordsForKanaTaughtThrough
// di word-pool-query.ts) — bukan bundle.words, yang hanya mencakup kata
// dari kelompok INI sendiri (terlalu sedikit: Kelompok B/C/D/E M02
// masing-masing cuma 0-1 kata kalau dibatasi ke kelompoknya sendiri).
function buildTestItems(bundle: LessonBundle, cumulativeWords: LessonExampleWord[]): ExerciseItem[] {
  const kana = bundle.kana;
  const total = kana.length * 3;
  const singleCount = Math.round(total * 0.4);
  const wordLevelCount = Math.round(total * 0.4);
  const dictationCount = total - singleCount - wordLevelCount;

  // ── 40% huruf tunggal — dicampur lintas 4 sub-tipe, bukan diulang 1:1:1
  // seperti sebelumnya (recall + visual_to_sound + typing untuk SETIAP
  // huruf, jadi seluruh test terasa satu jenis soal saja).
  const singleKana = sampleWithRepeat(kana, singleCount);
  const singleSubtypes = ["recall", "visual_to_sound", "typing", "timed_recognition"] as const;
  const singleItems: ExerciseItem[] = singleKana.map((k, i) => {
    const subtype = singleSubtypes[i % singleSubtypes.length];
    const romajiOptions = distractors(kana, k, (x) => x.romaji, 3).map((x) => ({ id: x.id, label: x.romaji }));
    const kanaOptions = distractors(kana, k, (x) => x.character, 3).map((x) => ({ id: x.id, label: x.character }));
    if (subtype === "recall") {
      return { id: `test-recall-${k.id}-${i}`, type: "recall", kanaId: k.id, promptRomaji: k.romaji, options: [{ id: k.id, label: k.character }, ...kanaOptions], correctOptionId: k.id };
    }
    if (subtype === "visual_to_sound") {
      return { id: `test-vts-${k.id}-${i}`, type: "visual_to_sound", kanaId: k.id, promptKana: k.character, promptAudioUrl: k.audioUrl, options: [{ id: k.id, label: k.romaji }, ...romajiOptions], correctOptionId: k.id };
    }
    if (subtype === "timed_recognition") {
      return { id: `test-timed-${k.id}-${i}`, type: "timed_recognition", kanaId: k.id, promptKana: k.character, options: [{ id: k.id, label: k.romaji }, ...romajiOptions], correctOptionId: k.id, timeLimitSeconds: 5 };
    }
    return { id: `test-typing-${k.id}-${i}`, type: "typing", kanaId: k.id, promptKana: k.character, expectedTyping: k.character };
  });

  // ── 40% tingkat kata — separuh pengenalan kata (mis. "mana yang
  // dibaca 'ue'?"), separuh susun kata (tap huruf acak jadi urutan
  // benar). word_arrange butuh >=2 huruf supaya benar-benar "disusun".
  const wordRecognitionCount = Math.ceil(wordLevelCount / 2);
  const wordArrangeCount = wordLevelCount - wordRecognitionCount;
  const arrangeableWords = cumulativeWords.filter((w) => w.characters.length >= 2);

  const wordRecognitionItems: ExerciseItem[] = sampleWithRepeat(cumulativeWords, wordRecognitionCount).map((w, i) => {
    const wrong = distractors(cumulativeWords, w, (x) => x.wordKana, 3).map((x) => ({ id: x.id, label: x.wordKana }));
    return {
      id: `test-wordrec-${w.id}-${i}`, type: "recall", wordId: w.id,
      promptRomaji: w.romaji, promptMeaning: w.meaningId,
      options: [{ id: w.id, label: w.wordKana }, ...wrong], correctOptionId: w.id,
    };
  });

  const wordArrangeItems: ExerciseItem[] = sampleWithRepeat(arrangeableWords.length ? arrangeableWords : cumulativeWords, wordArrangeCount).map((w, i) => ({
    id: `test-arrange-${w.id}-${i}`, type: "word_arrange", wordId: w.id,
    promptMeaning: w.meaningId, expectedTyping: w.wordKana,
    scrambledChars: shuffled(w.characters.map((c) => c.character)),
  }));

  // ── 20% dikte kata — dengar audio kata, ketik kana-nya. Hanya kata
  // yang audio_url-nya sudah terisi (VOICEVOX backfill sudah selesai
  // untuk seluruh kana_example_words sesi ini, tapi tetap difilter di
  // sini supaya tidak diam-diam ikut menguji kata yang belum ada audio).
  const dictableWords = cumulativeWords.filter((w) => w.audioUrl != null);
  const dictationItems: ExerciseItem[] = sampleWithRepeat(dictableWords, dictationCount).map((w, i) => ({
    id: `test-dictation-${w.id}-${i}`, type: "dictation", wordId: w.id,
    promptAudioUrl: w.audioUrl, promptMeaning: w.meaningId, expectedTyping: w.wordKana,
  }));

  return shuffled([...singleItems, ...wordRecognitionItems, ...wordArrangeItems, ...dictationItems]);
}

// Test mode: config.allowRetry is left unset (false) on purpose — a
// mini test with unlimited retries isn't a test.
export function LessonL04({ bundle, cumulativeWords }: { bundle: LessonBundle; cumulativeWords: LessonExampleWord[] }) {
  const items = useMemo(() => buildTestItems(bundle, cumulativeWords), [bundle, cumulativeWords]);
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
