"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { VocabStageBundle } from "@/app/lib/vocab-engine-query";
import { VocabQuiz, type VocabQuizQuestion, type VocabQuizResult } from "./VocabQuiz";
import { VocabLearningLab } from "./VocabLearningLab";
import { KonbiniSimulation } from "./KonbiniSimulation";
import { completeVocabStage, type StageCompletionResult } from "./vocab-actions";

const CURRICULUM_VERSION_V21 = "v2.1";

function buildRetentionQuestions(bundle: VocabStageBundle): VocabQuizQuestion[] {
  return bundle.allItems.map((item, index): VocabQuizQuestion => {
    if (index % 2 === 0) {
      const others = bundle.allItems.filter((candidate) => candidate.id !== item.id);
      const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
      const choices = [item, ...shuffled].sort(() => Math.random() - 0.5);
      return {
        id: "retention-listen-" + item.id,
        kind: "choice",
        item,
        prompt: "Dengarkan, lalu pilih bentuk yang tepat.",
        choices,
        exerciseType: "listen_choice",
        skill: "recognition",
        phaseCode: bundle.stage.code,
        curriculumVersion: CURRICULUM_VERSION_V21,
      };
    }
    return {
      id: "retention-build-" + item.id,
      kind: "typing",
      item,
      prompt: "Dengarkan, lalu ketik bacaannya (romaji).",
      exerciseType: "type_reading",
      skill: "production",
      phaseCode: bundle.stage.code,
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

// PROMPT-8 Bagian 4/6 — owns submitting/completion state and calls
// completeVocabStage, exactly like HiraganaStagePlayer does for the kana
// engine; the three child UIs (VocabLearningLab for F1-F5, KonbiniSimulation
// for BOSS, VocabQuiz for RETENTION) only ever call onComplete(result, state).
export function VocabStagePlayer({ bundle }: { bundle: VocabStageBundle }) {
  const [completion, setCompletion] = useState<StageCompletionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const retentionQuestions = useMemo(
    () => (bundle.stage.code === "RETENTION" ? buildRetentionQuestions(bundle) : []),
    [bundle],
  );

  async function finishStage(result: VocabQuizResult, state: Record<string, unknown> = {}) {
    setSubmitting(true);
    const response = await completeVocabStage({
      stageId: bundle.stage.id,
      correct: result.correct,
      total: result.total,
      state,
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
    return <StageResult moduleCode={bundle.module.code} result={completion} onRetry={retry} />;
  }

  if (bundle.stage.code === "RETENTION") {
    return (
      <VocabQuiz
        key={runKey}
        stageId={bundle.stage.id}
        questions={retentionQuestions}
        onComplete={(result) => void finishStage(result, { retention: true })}
      />
    );
  }

  if (bundle.konbiniSimulation) {
    return <KonbiniSimulation key={runKey} bundle={bundle} onComplete={(result, state) => void finishStage(result, state)} />;
  }

  return <VocabLearningLab key={runKey} bundle={bundle} onComplete={(result, state) => void finishStage(result, state)} />;
}
