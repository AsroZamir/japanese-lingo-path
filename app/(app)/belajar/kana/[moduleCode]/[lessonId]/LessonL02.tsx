"use client";

import { useState } from "react";
import { StrokeAnimation } from "@/components/kana/StrokeAnimation";
import { WritingCanvas, type WritingCanvasMode, type WritingCanvasResult } from "@/components/kana/WritingCanvas";
import type { LessonBundle } from "@/app/lib/lesson-query";
import { recordAttempt, completeLesson } from "./actions";
import type { SkillOutcome } from "./skill-mapping";

const MODES: WritingCanvasMode[] = ["trace", "guided", "copy"];

function summarizeMistake(result: WritingCanvasResult): string {
  const parts: string[] = [];
  if (!result.overallOrderCorrect) parts.push("urutan_salah");
  if (!result.overallDirectionCorrect) parts.push("arah_salah");
  if (!result.overallShapeCorrect) parts.push("bentuk_salah");
  return parts.length > 0 ? parts.join(",") : "salah";
}

export function LessonL02({ bundle }: { bundle: LessonBundle }) {
  const [kanaIndex, setKanaIndex] = useState(0);
  const [modeIndex, setModeIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<SkillOutcome[]>([]);
  const [done, setDone] = useState(false);

  const currentKana = bundle.kana[kanaIndex];
  const mode = MODES[modeIndex];

  function handleResult(result: WritingCanvasResult) {
    void process(result);
  }

  async function process(result: WritingCanvasResult) {
    const isCorrect = result.overallOrderCorrect && result.overallDirectionCorrect && result.overallShapeCorrect;

    await recordAttempt({
      kanaId: currentKana.id,
      wordId: null,
      lessonId: bundle.lesson.id,
      exerciseType: "writing",
      isCorrect,
      selectedOptionId: null,
      correctOptionId: null,
      typedValue: isCorrect ? null : summarizeMistake(result),
      responseTimeMs: null,
    });

    const nextOutcomes = [...outcomes, { kanaId: currentKana.id, skill: "writing" as const, correct: isCorrect }];
    setOutcomes(nextOutcomes);

    if (modeIndex + 1 < MODES.length) {
      setModeIndex((i) => i + 1);
    } else if (kanaIndex + 1 < bundle.kana.length) {
      setKanaIndex((i) => i + 1);
      setModeIndex(0);
    } else {
      setDone(true);
      await completeLesson(bundle.lesson.id, nextOutcomes);
    }
  }

  if (done) {
    const correct = outcomes.filter((o) => o.correct).length;
    return <p className="welcome-copy">Selesai — {correct}/{outcomes.length} coretan benar di seluruh mode (trace, guided, copy).</p>;
  }

  return (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div>
        <p className="eyebrow">Contoh coretan</p>
        <StrokeAnimation character={currentKana.character} strokeData={currentKana.strokeData} showGrid />
      </div>
      <div>
        <p className="eyebrow">
          Kana {kanaIndex + 1}/{bundle.kana.length} · mode {mode} ({modeIndex + 1}/{MODES.length})
        </p>
        <WritingCanvas
          key={`${currentKana.id}-${mode}`}
          character={currentKana.character}
          strokeData={currentKana.strokeData}
          mode={mode}
          onResult={handleResult}
        />
      </div>
    </div>
  );
}
