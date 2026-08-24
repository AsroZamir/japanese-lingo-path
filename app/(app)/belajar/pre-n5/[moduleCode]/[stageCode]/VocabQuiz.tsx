"use client";

import { useEffect, useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import type { VocabItem } from "@/app/lib/vocab-engine-query";
import { recordVocabAttempt, type VocabAttemptInput } from "./vocab-actions";

export type VocabQuizQuestion = {
  id: string;
  kind: "typing" | "choice";
  item: VocabItem;
  prompt: string;
  choices?: VocabItem[];
  exerciseType: VocabAttemptInput["exerciseType"];
  skill: VocabAttemptInput["skill"];
  phaseCode?: string | null;
  curriculumVersion?: string | null;
};

export type VocabQuizResult = { correct: number; total: number };

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

// PROMPT-8 Bagian 4 — mirrors HiraganaQuiz.tsx's shape closely on purpose
// (same await-before-advance fix already proven necessary there) but
// grades against VocabItem.reading/id instead of a kana character.
export function VocabQuiz({
  stageId,
  questions,
  timeLimitSeconds,
  onComplete,
}: {
  stageId: number;
  questions: VocabQuizQuestion[];
  timeLimitSeconds?: number;
  onComplete: (result: VocabQuizResult) => void;
}) {
  const [index, setIndex] = useState(0);
  const [typedValue, setTypedValue] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [attempts, setAttempts] = useState<boolean[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [remaining, setRemaining] = useState(timeLimitSeconds ?? 0);
  const [finished, setFinished] = useState(false);

  const current = questions[index];

  useEffect(() => {
    if (!timeLimitSeconds || finished || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [finished, remaining, timeLimitSeconds]);

  function finish(nextAttempts: boolean[]) {
    if (finished) return;
    setFinished(true);
    onComplete({ correct: nextAttempts.filter(Boolean).length, total: questions.length });
  }

  async function gradeCurrent() {
    if (!current || checked || (remaining === 0 && Boolean(timeLimitSeconds))) return;
    const isCorrect =
      current.kind === "typing"
        ? normalize(typedValue) === normalize(current.item.reading)
        : selectedItemId === current.item.id;
    const nextAttempts = [...attempts, isCorrect];
    setAttempts(nextAttempts);
    setChecked(true);
    setSavingAttempt(true);

    await recordVocabAttempt({
      stageId,
      itemId: current.item.id,
      exerciseType: current.exerciseType,
      skill: current.skill,
      typedValue: current.kind === "typing" ? typedValue : null,
      selectedItemId: current.kind === "choice" ? selectedItemId : null,
      responseTimeMs: Date.now() - startedAt,
      phaseCode: current.phaseCode ?? null,
      curriculumVersion: current.curriculumVersion ?? null,
      hintLevel: 0,
      assisted: false,
      firstAttemptCorrect: isCorrect,
    });
    setSavingAttempt(false);
  }

  function continueQuiz() {
    if (!checked) return;
    if (index + 1 >= questions.length) {
      finish(attempts);
      return;
    }
    setIndex((value) => value + 1);
    setTypedValue("");
    setSelectedItemId(null);
    setChecked(false);
    setStartedAt(Date.now());
  }

  if (questions.length === 0) {
    return <div className="hiragana-stage__empty">Belum ada soal untuk sesi ini.</div>;
  }
  if (finished) return null;
  if (remaining === 0 && timeLimitSeconds) {
    return (
      <div className="hiragana-stage__result">
        <span className="hiragana-stage__result-icon">TIME</span>
        <h3>Waktu selesai</h3>
        <p>{attempts.filter(Boolean).length} jawaban benar dari {questions.length} soal.</p>
        <button type="button" className="primary-button" onClick={() => finish(attempts)}>
          Lihat hasil
        </button>
      </div>
    );
  }
  if (!current) return null;

  const answerCorrect =
    current.kind === "typing"
      ? normalize(typedValue) === normalize(current.item.reading)
      : selectedItemId === current.item.id;
  const canCheck = current.kind === "typing" ? typedValue.trim().length > 0 : selectedItemId != null;

  return (
    <section className="hiragana-quiz">
      <header className="hiragana-quiz__header">
        <span>Soal {index + 1}/{questions.length}</span>
        {timeLimitSeconds && (
          <strong className={remaining <= 30 ? "is-urgent" : ""}>
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
          </strong>
        )}
      </header>

      <div className="hiragana-quiz__prompt">
        <small>{current.prompt}</small>
        <AudioButton url={current.item.audioUrl} autoplay />
        <b className="is-romaji">{current.item.termKana}</b>
      </div>

      {current.kind === "typing" && (
        <input
          className={["hiragana-quiz__input", checked ? (answerCorrect ? "is-correct" : "is-wrong") : ""].filter(Boolean).join(" ")}
          value={typedValue}
          disabled={checked}
          onChange={(event) => setTypedValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (checked) continueQuiz();
              else if (canCheck) void gradeCurrent();
            }
          }}
          placeholder="Ketik bacaan romaji..."
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      )}

      {current.kind === "choice" && (
        <div className="hiragana-quiz__choices">
          {current.choices?.map((choice) => {
            const isSelected = selectedItemId === choice.id;
            const stateClass = checked
              ? choice.id === current.item.id
                ? "is-correct"
                : isSelected
                  ? "is-wrong"
                  : ""
              : isSelected
                ? "is-selected"
                : "";
            return (
              <button type="button" key={choice.id} disabled={checked} className={stateClass} onClick={() => setSelectedItemId(choice.id)}>
                {choice.termKana}
              </button>
            );
          })}
        </div>
      )}

      {checked && (
        <div className={answerCorrect ? "hiragana-quiz__feedback is-correct" : "hiragana-quiz__feedback is-wrong"}>
          {answerCorrect ? "Benar." : "Jawaban yang benar: " + current.item.termKana + " (" + current.item.reading + ")."}
        </div>
      )}

      <button
        type="button"
        className="primary-button hiragana-quiz__action"
        disabled={(!checked && !canCheck) || savingAttempt}
        onClick={() => (checked ? continueQuiz() : void gradeCurrent())}
      >
        {savingAttempt ? "Menyimpan..." : checked ? "Lanjutkan" : "Periksa"}
      </button>
    </section>
  );
}
