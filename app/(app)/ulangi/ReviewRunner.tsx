"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HiraganaQuiz,
  type HiraganaQuizQuestion,
  type HiraganaQuizResult,
} from "../belajar/pre-n5/[moduleCode]/[stageCode]/HiraganaQuiz";

type ReviewRunnerProps = {
  stageId: number;
  questions: HiraganaQuizQuestion[];
};

// Bagian 6.3 — unlike a learning stage, a review session has no gate to
// pass and nothing extra to save at the end: each question already saves
// itself (recordHiraganaAttempt, reused unmodified from the stage engine)
// and updates user_kana_mastery's due_at right then, so all this needs to
// do is show a start screen and a finish summary around HiraganaQuiz.
export function ReviewRunner({ stageId, questions }: ReviewRunnerProps) {
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<HiraganaQuizResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  if (result) {
    return (
      <div className={"hiragana-stage__result " + (result.correct / result.total >= 0.8 ? "is-passed" : "is-failed")}>
        <span className="hiragana-stage__result-icon">SELESAI</span>
        <h3>Sesi review selesai</h3>
        <p>
          {result.correct} benar dari {result.total} soal. Jadwal setiap huruf sudah
          diperbarui.
        </p>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setResult(null);
            setStarted(false);
            setRunKey((value) => value + 1);
          }}
        >
          Kembali ke ringkasan
        </button>
      </div>
    );
  }

  if (started) {
    return (
      <HiraganaQuiz
        key={runKey}
        stageId={stageId}
        questions={questions}
        onComplete={setResult}
      />
    );
  }

  return (
    <section className="review-summary__start">
      <button
        type="button"
        className="primary-button"
        disabled={questions.length === 0}
        onClick={() => setStarted(true)}
      >
        {questions.length === 0 ? "Tidak ada yang perlu direview" : "Mulai review →"}
      </button>
      {questions.length === 0 && (
        <p>
          Belum ada huruf yang jatuh tempo dan belum ada riwayat latihan untuk
          dijadikan sesi singkat. Selesaikan beberapa tahap di{" "}
          <Link href="/belajar/pre-n5/PRE-N5.01">PRE-N5.01</Link> dulu.
        </p>
      )}
    </section>
  );
}
