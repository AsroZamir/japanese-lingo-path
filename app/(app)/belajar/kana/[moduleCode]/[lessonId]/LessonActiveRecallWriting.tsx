"use client";

import { useMemo, useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import { WritingCanvas, type WritingCanvasResult } from "@/components/kana/WritingCanvas";
import type { RecallBundle } from "./LessonActiveRecall";
import { recordAttempt, completeLesson } from "./actions";
import type { SkillOutcome } from "./skill-mapping";

// Fase 5 L02 "Audio → Writing / Dictation" — the learner hears audio
// (never sees the character) and writes it from memory, using
// WritingCanvas's "blind" mode (built for exactly this, unused until
// now). Word items queue their characters one at a time, in order, with
// the word's own audio playing once before the first character — write
// what you heard, not what you see.
type QueueItem = {
  key: string;
  kanaId: number;
  character: string;
  strokeData: import("@/components/kana/stroke-geometry").KanaStrokeData | null;
  audioUrl: string | null; // plays for THIS item (kana's own audio, or the word's audio on a word's first character)
  wordId: number | null;
};

const KANA_SAMPLE_SIZE = 8;
const WORD_SAMPLE_SIZE = 4;

function sample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function buildQueue(bundle: RecallBundle): QueueItem[] {
  const drillableKana = bundle.kana.filter((k) => k.audioUrl != null && k.strokeData != null);
  const kanaItems: QueueItem[] = sample(drillableKana, KANA_SAMPLE_SIZE).map((k) => ({
    key: `kana-${k.id}`,
    kanaId: k.id,
    character: k.character,
    strokeData: k.strokeData,
    audioUrl: k.audioUrl,
    wordId: null,
  }));

  const drillableWords = bundle.words.filter((w) => w.audioUrl != null && w.characters.length >= 2);
  const wordItems: QueueItem[] = sample(drillableWords, WORD_SAMPLE_SIZE).flatMap((w) =>
    w.characters.map((c, i) => {
      const kana = bundle.kana.find((k) => k.id === c.kanaId);
      return {
        key: `word-${w.id}-${i}`,
        kanaId: c.kanaId,
        character: c.character,
        strokeData: kana?.strokeData ?? null,
        audioUrl: i === 0 ? w.audioUrl : null, // whole word plays once, at its first character
        wordId: w.id,
      };
    }),
  );

  return sample([...kanaItems, ...wordItems], kanaItems.length + wordItems.length);
}

function summarizeMistake(result: WritingCanvasResult): string {
  const parts: string[] = [];
  if (!result.overallOrderCorrect) parts.push("urutan_salah");
  if (!result.overallDirectionCorrect) parts.push("arah_salah");
  if (!result.overallShapeCorrect) parts.push("bentuk_salah");
  return parts.length > 0 ? parts.join(",") : "salah";
}

export function LessonActiveRecallWriting({ bundle }: { bundle: RecallBundle }) {
  const queue = useMemo(() => buildQueue(bundle), [bundle]);
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
      exerciseType: "dictation",
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
    return <p className="welcome-copy">Selesai — {correct}/{outcomes.length} benar, ditulis dari ingatan (tanpa melihat hurufnya).</p>;
  }

  return (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div>
        <p className="eyebrow">Dengarkan, lalu tulis dari ingatan</p>
        <AudioButton url={current.audioUrl} autoplay={current.audioUrl != null} />
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
