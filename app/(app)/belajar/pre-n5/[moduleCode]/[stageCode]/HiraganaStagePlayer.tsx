"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CURRICULUM_VERSION_V21,
  HIRAGANA_LAB_VERSION,
} from "@/app/lib/hiragana-mnemonics";
import { resolvePhaseCode } from "@/app/lib/katakana-data";
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

function buildGateQuestions(
  items: HiraganaLearningItem[],
  phaseCode: string,
): HiraganaQuizQuestion[] {
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
        phaseCode,
        curriculumVersion: CURRICULUM_VERSION_V21,
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
        phaseCode,
        curriculumVersion: CURRICULUM_VERSION_V21,
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
      phaseCode,
      curriculumVersion: CURRICULUM_VERSION_V21,
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
  const stageScript =
    typeof bundle.stage.configuration.script === "string"
      ? bundle.stage.configuration.script
      : "hiragana";
  const phaseCode = resolvePhaseCode(bundle.stage.code, stageScript);
  const gateQuestions = useMemo(
    () => buildGateQuestions(bundle.items, phaseCode),
    [bundle.items, phaseCode],
  );

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

  // BOSS and RETENTION are the only stages with a dedicated player — both
  // sample from the whole 46-item bank instead of teaching anything new,
  // so they reuse the same gate quiz. Every other stage — F1-F5 and any
  // Bagian 5 extension stage (dakuten/handakuten, youon, ...) — reuses
  // HiraganaLearningLab exactly as-is, just pointed at whatever character
  // track its own configuration.characterSet selects (pre-n5-01-query.ts).
  //
  // RETENTION (Bagian 2 of Prompt 4) is the actual delayed retention gate
  // — the one V2.1 §4.1/§9.2 describes, opened >=72h after BOSS (see
  // pre-n5-01-query.ts's delayedGateHours check) and scored at >=85%
  // first-attempt-unaided by completeHiraganaStage's retentionGate branch
  // (actions.ts), which reads phase_code='RETENTION' rows back out of
  // user_kana_attempts. BOSS itself stays an ordinary >=80% immediate
  // checkpoint — passing it only means "may proceed", not "mastered".
  if (bundle.stage.code === "BOSS" || bundle.stage.code === "RETENTION") {
    const isRetention = bundle.stage.code === "RETENTION";
    const scriptLabel = stageScript === "katakana" ? "Katakana 46" : "Hiragana 46";
    return (
      <HiraganaQuiz
        key={runKey}
        stageId={bundle.stage.id}
        questions={gateQuestions}
        timeLimitSeconds={numberFrom(bundle.stage.configuration.timeLimitSeconds, 600)}
        onComplete={(result) =>
          finishStage(
            result,
            isRetention
              ? { badge: result.correct / result.total >= 0.85 ? scriptLabel + " Durable" : null }
              : { badge: result.correct / result.total >= 0.8 ? scriptLabel + " Pathfinder" : null },
          )
        }
      />
    );
  }
  return <HiraganaLearningLab key={runKey} bundle={bundle} onComplete={finishStage} />;
}
