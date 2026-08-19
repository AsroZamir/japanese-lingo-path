"use client";

import { useMemo, useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import { WritingCanvas, type WritingCanvasResult } from "@/components/kana/WritingCanvas";
import type { RecallBundle } from "./LessonActiveRecall";
import { recordAttempt, completeLesson } from "./actions";
import type { SkillOutcome } from "./skill-mapping";

// Fase 6 (Writing Lab) — same "blind" WritingCanvas mechanism as Fase 5's
// dictation lesson, but scoped differently per lesson: L01 drills lone
// characters at depth, L02 walks every word-length tier, L03 mixes in a
// meaning-only prompt (no audio at all — write purely from having
// memorized the reading) alongside the usual audio-driven items.
type QueueItem = {
  key: string;
  kanaId: number;
  character: string;
  strokeData: import("@/components/kana/stroke-geometry").KanaStrokeData | null;
  audioUrl: string | null; // null on purpose for a meaning-only prompt, not just "not loaded yet"
  meaning: string | null; // shown when audioUrl is null (meaning -> kana), or alongside audio for a word's first character
  wordId: number | null;
};

function sample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

const STROKE_MASTERY_SAMPLE_SIZE = 20;
const WORD_TIER_SAMPLE_SIZE = 3; // per length tier (2, 3, 4+)
const MIXED_KANA_COUNT = 8;
const MIXED_WORD_AUDIO_COUNT = 4;
const MIXED_WORD_MEANING_COUNT = 4;

function wordToQueueItems(bundle: RecallBundle, w: RecallBundle["words"][number], promptMeaningOnFirst: boolean): QueueItem[] {
  return w.characters.map((c, i) => {
    const kana = bundle.kana.find((k) => k.id === c.kanaId);
    return {
      key: `word-${w.id}-${i}`,
      kanaId: c.kanaId,
      character: c.character,
      strokeData: kana?.strokeData ?? null,
      audioUrl: i === 0 && !promptMeaningOnFirst ? w.audioUrl : null,
      meaning: i === 0 && promptMeaningOnFirst ? w.meaningId : null,
      wordId: w.id,
    };
  });
}

function buildStrokeMasteryQueue(bundle: RecallBundle): QueueItem[] {
  const drillable = bundle.kana.filter((k) => k.audioUrl != null && k.strokeData != null);
  return sample(drillable, STROKE_MASTERY_SAMPLE_SIZE).map((k) => ({
    key: `kana-${k.id}`,
    kanaId: k.id,
    character: k.character,
    strokeData: k.strokeData,
    audioUrl: k.audioUrl,
    meaning: null,
    wordId: null,
  }));
}

function buildWordWritingQueue(bundle: RecallBundle): QueueItem[] {
  const drillable = bundle.words.filter((w) => w.audioUrl != null && w.characters.length >= 2 && w.characters.every((c) => bundle.kana.find((k) => k.id === c.kanaId)?.strokeData));
  const tier2 = drillable.filter((w) => w.characters.length === 2);
  const tier3 = drillable.filter((w) => w.characters.length === 3);
  const tier4plus = drillable.filter((w) => w.characters.length >= 4);
  const words = [...sample(tier2, WORD_TIER_SAMPLE_SIZE), ...sample(tier3, WORD_TIER_SAMPLE_SIZE), ...sample(tier4plus, WORD_TIER_SAMPLE_SIZE)];
  return sample(words, words.length).flatMap((w) => wordToQueueItems(bundle, w, false));
}

function buildBlindMixedQueue(bundle: RecallBundle): QueueItem[] {
  const drillableKana = bundle.kana.filter((k) => k.audioUrl != null && k.strokeData != null);
  const kanaItems: QueueItem[] = sample(drillableKana, MIXED_KANA_COUNT).map((k) => ({
    key: `kana-${k.id}`, kanaId: k.id, character: k.character, strokeData: k.strokeData, audioUrl: k.audioUrl, meaning: null, wordId: null,
  }));

  const drillableWords = bundle.words.filter((w) => w.audioUrl != null && w.characters.length >= 2 && w.characters.every((c) => bundle.kana.find((k) => k.id === c.kanaId)?.strokeData));
  const audioWords = sample(drillableWords, MIXED_WORD_AUDIO_COUNT);
  const meaningWords = sample(drillableWords.filter((w) => !audioWords.includes(w)), MIXED_WORD_MEANING_COUNT);

  const wordAudioItems = audioWords.flatMap((w) => wordToQueueItems(bundle, w, false));
  const wordMeaningItems = meaningWords.flatMap((w) => wordToQueueItems(bundle, w, true));

  const all = [...kanaItems, ...wordAudioItems, ...wordMeaningItems];
  return sample(all, all.length);
}

function summarizeMistake(result: WritingCanvasResult): string {
  const parts: string[] = [];
  if (!result.overallOrderCorrect) parts.push("urutan_salah");
  if (!result.overallDirectionCorrect) parts.push("arah_salah");
  if (!result.overallShapeCorrect) parts.push("bentuk_salah");
  return parts.length > 0 ? parts.join(",") : "salah";
}

export function LessonWritingLab({ bundle }: { bundle: RecallBundle }) {
  const queue = useMemo(() => {
    if (bundle.lesson.code === "L01") return buildStrokeMasteryQueue(bundle);
    if (bundle.lesson.code === "L02") return buildWordWritingQueue(bundle);
    return buildBlindMixedQueue(bundle);
  }, [bundle]);

  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<SkillOutcome[]>([]);
  const [done, setDone] = useState(false);

  const current = queue[index];

  function handleResult(result: WritingCanvasResult) {
    void process(result);
  }

  async function process(result: WritingCanvasResult) {
    const isCorrect = result.overallOrderCorrect && result.overallDirectionCorrect && result.overallShapeCorrect;

    await recordAttempt({
      kanaId: current.kanaId,
      wordId: current.wordId,
      lessonId: bundle.lesson.id,
      exerciseType: "writing",
      isCorrect,
      selectedOptionId: null,
      correctOptionId: null,
      typedValue: isCorrect ? null : summarizeMistake(result),
      responseTimeMs: null,
    });

    const nextOutcomes = [...outcomes, { kanaId: current.kanaId, skill: "writing" as const, correct: isCorrect }];
    setOutcomes(nextOutcomes);

    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
    } else {
      setDone(true);
      await completeLesson(bundle.lesson.id, nextOutcomes);
    }
  }

  if (queue.length === 0) {
    return <p className="welcome-copy">Belum ada karakter dengan data coretan siap untuk latihan ini.</p>;
  }

  if (done) {
    const correct = outcomes.filter((o) => o.correct).length;
    return <p className="welcome-copy">Selesai — {correct}/{outcomes.length} benar.</p>;
  }

  return (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div>
        {current.meaning != null ? (
          <>
            <p className="eyebrow">Artinya, lalu tulis dari ingatan</p>
            <p className="welcome-copy">{current.meaning}</p>
          </>
        ) : (
          <>
            <p className="eyebrow">Dengarkan, lalu tulis dari ingatan</p>
            <AudioButton url={current.audioUrl} autoplay={current.audioUrl != null} />
          </>
        )}
      </div>
      <div>
        <p className="eyebrow">
          {index + 1}/{queue.length}
        </p>
        <WritingCanvas key={current.key} character={current.character} strokeData={current.strokeData} mode="blind" onResult={handleResult} />
      </div>
    </div>
  );
}
