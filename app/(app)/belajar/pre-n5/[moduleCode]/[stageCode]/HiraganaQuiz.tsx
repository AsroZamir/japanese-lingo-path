"use client";

import { useEffect, useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import {
  WritingCanvas,
  type WritingCanvasResult,
} from "@/components/kana/WritingCanvas";
import type { KanaStrokeData } from "@/components/kana/stroke-geometry";
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
};

export type HiraganaQuizResult = {
  correct: number;
  total: number;
};

type HiraganaQuizProps = {
  stageId: number;
  questions: HiraganaQuizQuestion[];
  timeLimitSeconds?: number;
  writingPassScore?: number;
  onComplete: (result: HiraganaQuizResult) => void;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function calculateWritingScore(result: WritingCanvasResult): number {
  if (result.strokes.length === 0) return 0;
  const shape =
    result.strokes.reduce((sum, stroke) => sum + stroke.shapeScore, 0) /
    result.strokes.length;
  const order =
    result.strokes.filter((stroke) => stroke.orderCorrect).length /
    result.strokes.length;
  const direction =
    result.strokes.filter((stroke) => stroke.directionCorrect).length /
    result.strokes.length;
  return Math.round((shape * 0.7 + order * 0.15 + direction * 0.15) * 100);
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return String(minutes).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
}

function StrokeQuestion({
  item,
  onScore,
}: {
  item: HiraganaLearningItem;
  onScore: (score: number) => void;
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
    <WritingCanvas
      key={item.id}
      character={item.character}
      strokeData={strokeData}
      mode="blind"
      onResult={(result) => onScore(calculateWritingScore(result))}
    />
  );
}

export function HiraganaQuiz({
  stageId,
  questions,
  timeLimitSeconds,
  writingPassScore = 80,
  onComplete,
}: HiraganaQuizProps) {
  const [index, setIndex] = useState(0);
  const [typedValue, setTypedValue] = useState("");
  const [selectedKanaId, setSelectedKanaId] = useState<number | null>(null);
  const [currentWritingScore, setCurrentWritingScore] = useState<number | null>(null);
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
          : (currentWritingScore ?? 0) >= writingPassScore;
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
      responseTimeMs: now - startedAt,
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
        : (currentWritingScore ?? 0) >= writingPassScore;
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
          <StrokeQuestion key={current.id} item={current.item} onScore={setCurrentWritingScore} />
          {currentWritingScore != null && (
            <span className={currentWritingScore >= writingPassScore ? "is-good" : "is-weak"}>
              Skor tulisan {currentWritingScore} · target {writingPassScore}
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
