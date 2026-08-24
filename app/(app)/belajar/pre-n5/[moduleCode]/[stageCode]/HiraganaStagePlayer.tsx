"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HIRAGANA_LAB_VERSION } from "@/app/lib/hiragana-mnemonics";
import type {
  HiraganaLearningItem,
  HiraganaStageBundle,
} from "@/app/lib/pre-n5-01-query";
import {
  HiraganaQuiz,
  type HiraganaQuizQuestion,
  type HiraganaQuizResult,
} from "./HiraganaQuiz";
import {
  completeHiraganaStage,
  type StageCompletionResult,
} from "./actions";
import { HiraganaLearningLab } from "./HiraganaLearningLab";

type StagePlayerProps = {
  bundle: HiraganaStageBundle;
};

function numberFrom(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function choicesFor(
  pool: HiraganaLearningItem[],
  target: HiraganaLearningItem,
  count: number,
  offset: number,
): HiraganaLearningItem[] {
  const distractors = pool
    .filter((item) => item.id !== target.id && item.romaji !== target.romaji)
    .slice(offset)
    .concat(pool.filter((item) => item.id !== target.id && item.romaji !== target.romaji).slice(0, offset))
    .slice(0, Math.max(0, count - 1));
  const options = [target, ...distractors];
  const shift = options.length > 0 ? offset % options.length : 0;
  return options.slice(shift).concat(options.slice(0, shift));
}

function buildGateQuestions(items: HiraganaLearningItem[]): HiraganaQuizQuestion[] {
  const pool = items.filter((item) => item.type === "basic");
  return pool.map((item, index): HiraganaQuizQuestion => {
    if (index % 3 === 0) {
      return {
        id: "gate-recognition-" + item.id,
        kind: "typing",
        item,
        prompt: "Recognition: ketik romaji.",
        promptMode: "kana",
        exerciseType: "gate_recognition",
        skill: "visual",
      };
    }
    if (index % 3 === 1) {
      return {
        id: "gate-audio-" + item.id,
        kind: "choice",
        item,
        prompt: "Audio: pilih kana yang diucapkan.",
        promptMode: "audio",
        choices: choicesFor(pool, item, 8, index + 11),
        exerciseType: "gate_audio",
        skill: "audio",
      };
    }
    return {
      id: "gate-writing-" + item.id,
      kind: "writing",
      item,
      prompt: "Writing: dengarkan lalu tulis kana.",
      promptMode: "audio",
      exerciseType: "gate_writing",
      skill: "writing",
    };
  });
}

function StageResult({
  moduleCode,
  result,
  onRetry,
}: {
  moduleCode: string;
  result: StageCompletionResult;
  onRetry: () => void;
}) {
  if (!result.ok) {
    return (
      <div className="hiragana-stage__result is-failed">
        <span className="hiragana-stage__result-icon">!</span>
        <h3>Progres belum tersimpan</h3>
        <p>{result.error ?? "Terjadi kesalahan. Silakan coba lagi."}</p>
        <button type="button" className="primary-button" onClick={onRetry}>
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className={"hiragana-stage__result " + (result.passed ? "is-passed" : "is-failed")}>
      <span className="hiragana-stage__result-icon">{result.passed ? "PASS" : "RETRY"}</span>
      <h3>{result.passed ? "Tahap berhasil dikuasai" : "Belum melewati batas kelulusan"}</h3>
      <p>
        Skor {Math.round(result.score ?? 0)}%. Syarat kelulusan {result.requiredLabel}.
      </p>
      {result.passed ? (
        <Link
          href={
            result.nextStageCode
              ? "/belajar/pre-n5/" + moduleCode + "/" + result.nextStageCode
              : "/belajar/pre-n5/" + moduleCode
          }
          className="primary-button"
        >
          {result.nextStageCode ? "Lanjut ke " + result.nextStageCode : "Kembali ke modul"}
        </Link>
      ) : (
        <button type="button" className="primary-button" onClick={onRetry}>
          Ulangi latihan
        </button>
      )}
    </div>
  );
}

export function HiraganaStagePlayer({ bundle }: StagePlayerProps) {
  const [completion, setCompletion] = useState<StageCompletionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const gateQuestions = useMemo(() => buildGateQuestions(bundle.items), [bundle.items]);

  async function finishStage(
    result: HiraganaQuizResult,
    state: Record<string, unknown> = {},
  ) {
    setSubmitting(true);
    const response = await completeHiraganaStage({
      stageId: bundle.stage.id,
      correct: result.correct,
      total: result.total,
      state: { ...state, labVersion: HIRAGANA_LAB_VERSION },
    });
    setCompletion(response);
    setSubmitting(false);
  }

  function retry() {
    setCompletion(null);
    setRunKey((value) => value + 1);
  }

  if (submitting) {
    return <div className="hiragana-stage__loading">Menyimpan hasil dan menghitung progres...</div>;
  }
  if (completion) {
    return (
      <StageResult moduleCode={bundle.module.code} result={completion} onRetry={retry} />
    );
  }

  switch (bundle.stage.code) {
    case "F1":
    case "F2":
    case "F3":
    case "F4":
    case "F5":
      return <HiraganaLearningLab key={runKey} bundle={bundle} onComplete={finishStage} />;
    case "BOSS":
      return (
        <HiraganaQuiz
          key={runKey}
          stageId={bundle.stage.id}
          questions={gateQuestions}
          timeLimitSeconds={numberFrom(bundle.stage.configuration.timeLimitSeconds, 600)}
          onComplete={(result) => finishStage(result, { badge: result.correct / result.total >= 0.8 ? "Hiragana 46 Pathfinder" : null })}
        />
      );
    default:
      return <div className="hiragana-stage__empty">Stage ini belum memiliki player.</div>;
  }
}
