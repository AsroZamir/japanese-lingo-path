"use client";

import { useEffect, useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import type { KanaStrokeData } from "@/components/kana/stroke-geometry";
import {
  KanaWritingCoach,
  type KanaWritingOutcome,
} from "@/components/kana/KanaWritingCoach";
import type { HiraganaLearningItem } from "@/app/lib/pre-n5-01-query";
import {
  recordHiraganaAttempt,
  type HiraganaAttemptInput,
} from "./actions";

export type HiraganaQuizQuestion = {
  id: string;
  kind: "typing" | "choice" | "writing";
  item: HiraganaLearningItem;
  prompt: string;
  promptMode: "kana" | "romaji" | "audio";
  choices?: HiraganaLearningItem[];
  exerciseType: HiraganaAttemptInput["exerciseType"];
  skill: HiraganaAttemptInput["skill"];
  phaseCode?: string | null;
  curriculumVersion?: string | null;
};

export type HiraganaQuizResult = {
  correct: number;
  total: number;
};

type HiraganaQuizProps = {
  stageId: number;
  questions: HiraganaQuizQuestion[];
  timeLimitSeconds?: number;
  onComplete: (result: HiraganaQuizResult) => void;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return String(minutes).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
}

function StrokeQuestion({
  item,
  onOutcome,
}: {
  item: HiraganaLearningItem;
  onOutcome: (outcome: KanaWritingOutcome) => void;
}) {
  const [strokeData, setStrokeData] = useState<KanaStrokeData | null>(null);
  const [loading, setLoading] = useState(Boolean(item.strokeDataUrl));

  useEffect(() => {
    if (!item.strokeDataUrl) return;
    const controller = new AbortController();
    fetch(item.strokeDataUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Stroke data gagal dimuat.");
        return response.json() as Promise<KanaStrokeData>;
      })
      .then((data) => {
        setStrokeData(data);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStrokeData(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [item.strokeDataUrl]);

  if (loading) {
    return <div className="hiragana-stage__loading">Memuat pola stroke...</div>;
  }

  return (
    <KanaWritingCoach
      key={item.id}
      character={item.character}
      strokeData={strokeData}
      mode="recall"
      onComplete={onOutcome}
    />
  );
}

export function HiraganaQuiz({
  stageId,
  questions,
  timeLimitSeconds,
  onComplete,
}: HiraganaQuizProps) {
  const [index, setIndex] = useState(0);
  const [typedValue, setTypedValue] = useState("");
  const [selectedKanaId, setSelectedKanaId] = useState<number | null>(null);
  const [currentWritingScore, setCurrentWritingScore] = useState<number | null>(null);
  const [currentWritingPassed, setCurrentWritingPassed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState<boolean[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [remaining, setRemaining] = useState(timeLimitSeconds ?? 0);
  const [finished, setFinished] = useState(false);

  const current = questions[index];

  useEffect(() => {
    if (!timeLimitSeconds || finished || remaining <= 0) return;
    const timer = window.setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [finished, remaining, timeLimitSeconds]);

  function finish(nextAttempts: boolean[]) {
    if (finished) return;
    setFinished(true);
    onComplete({
      correct: nextAttempts.filter(Boolean).length,
      total: questions.length,
    });
  }

  function gradeCurrent() {
    if (!current || checked || remaining === 0 && Boolean(timeLimitSeconds)) return;
    const isCorrect =
      current.kind === "typing"
        ? normalize(typedValue) === normalize(current.item.romaji)
        : current.kind === "choice"
          ? selectedKanaId === current.item.id
          : currentWritingPassed;
    const now = Date.now();
    const nextAttempts = [...attempts, isCorrect];
    setAttempts(nextAttempts);
    setChecked(true);

    void recordHiraganaAttempt({
      stageId,
      kanaId: current.item.id,
      exerciseType: current.exerciseType,
      skill: current.skill,
      answerText: current.kind === "typing" ? typedValue : null,
      selectedKanaId: current.kind === "choice" ? selectedKanaId : null,
      writingScore: current.kind === "writing" ? currentWritingScore : null,
      writingMatched: current.kind === "writing" ? currentWritingPassed : null,
      responseTimeMs: now - startedAt,
      phaseCode: current.phaseCode ?? null,
      curriculumVersion: current.curriculumVersion ?? null,
    });
  }

  function continueQuiz() {
    if (!checked) return;
    if (index + 1 >= questions.length) {
      finish(attempts);
      return;
    }
    setIndex((value) => value + 1);
    setTypedValue("");
    setSelectedKanaId(null);
    setCurrentWritingScore(null);
    setCurrentWritingPassed(false);
    setChecked(false);
    setStartedAt(Date.now());
  }

  if (questions.length === 0) {
    return (
      <div className="hiragana-stage__empty">
        Belum ada item review untuk sesi ini.
      </div>
    );
  }

  if (finished) {
    return null;
  }

  if (remaining === 0 && timeLimitSeconds) {
    return (
      <div className="hiragana-stage__result">
        <span className="hiragana-stage__result-icon">TIME</span>
        <h3>Waktu selesai</h3>
        <p>
          {attempts.filter(Boolean).length} jawaban benar dari {questions.length} soal.
        </p>
        <button type="button" className="primary-button" onClick={() => finish(attempts)}>
          Lihat hasil
        </button>
      </div>
    );
  }

  if (!current) return null;
  const answerCorrect =
    current.kind === "typing"
      ? normalize(typedValue) === normalize(current.item.romaji)
      : current.kind === "choice"
        ? selectedKanaId === current.item.id
        : currentWritingPassed;
  const canCheck =
    current.kind === "typing"
      ? typedValue.trim().length > 0
      : current.kind === "choice"
        ? selectedKanaId != null
        : currentWritingScore != null;

  return (
    <section className="hiragana-quiz">
      <header className="hiragana-quiz__header">
        <span>
          Soal {index + 1}/{questions.length}
        </span>
        {timeLimitSeconds && (
          <strong className={remaining <= 30 ? "is-urgent" : ""}>
            {formatTime(remaining)}
          </strong>
        )}
      </header>

      <div className="hiragana-quiz__prompt">
        <small>{current.prompt}</small>
        {current.promptMode === "kana" && <b>{current.item.character}</b>}
        {current.promptMode === "romaji" && <b className="is-romaji">{current.item.romaji}</b>}
        {current.promptMode === "audio" && (
          <AudioButton url={current.item.audioUrl} autoplay />
        )}
      </div>

      {current.kind === "typing" && (
        <input
          className={[
            "hiragana-quiz__input",
            checked ? (answerCorrect ? "is-correct" : "is-wrong") : "",
          ]
            .filter(Boolean)
            .join(" ")}
          value={typedValue}
          disabled={checked}
          onChange={(event) => setTypedValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (checked) continueQuiz();
              else if (canCheck) gradeCurrent();
            }
          }}
          placeholder="Ketik romaji..."
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      )}

      {current.kind === "choice" && (
        <div className="hiragana-quiz__choices">
          {current.choices?.map((choice) => {
            const isSelected = selectedKanaId === choice.id;
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
              <button
                type="button"
                key={choice.id}
                disabled={checked}
                className={stateClass}
                onClick={() => setSelectedKanaId(choice.id)}
              >
                {choice.character}
              </button>
            );
          })}
        </div>
      )}

      {current.kind === "writing" && (
        <div className="hiragana-quiz__writing">
          <StrokeQuestion
            key={current.id}
            item={current.item}
            onOutcome={(outcome) => {
              setCurrentWritingScore(outcome.score);
              setCurrentWritingPassed(outcome.matched);
            }}
          />
          {currentWritingScore != null && (
            <span className={currentWritingPassed ? "is-good" : "is-weak"}>
              Kemiripan {currentWritingScore}% · {currentWritingPassed ? "semua goresan cocok" : "belum cocok"}
            </span>
          )}
        </div>
      )}

      {checked && (
        <div className={answerCorrect ? "hiragana-quiz__feedback is-correct" : "hiragana-quiz__feedback is-wrong"}>
          {answerCorrect
            ? "Benar. Pola ini masuk ke jadwal SRS."
            : "Belum tepat. Jawaban yang benar: " +
              (current.kind === "writing"
                ? current.item.character
                : current.item.romaji) +
              "."}
        </div>
      )}

      <button
        type="button"
        className="primary-button hiragana-quiz__action"
        disabled={!checked && !canCheck}
        onClick={checked ? continueQuiz : gradeCurrent}
      >
        {checked ? "Lanjutkan" : "Periksa"}
      </button>
    </section>
  );
}
