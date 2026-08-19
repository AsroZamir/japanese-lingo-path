"use client";

import { useState } from "react";
import { KanaTypingInput } from "@/components/kana/KanaTypingInput";
import { AudioButton } from "@/components/kana/AudioButton";
import type { LessonExerciseRow } from "@/app/lib/lesson-content-types";
import { recordConceptAttempt, completeM01Lesson } from "./actions";

export type ConceptAnswerState = { selectedId: number | null; checked: boolean; isCorrect?: boolean };

// Renders exactly ONE question — M01SlideDeck owns which exercise is
// active and the answer state for all of them (so stepping back to an
// already-graded question via the left arrow shows it read-only instead
// of re-recording an attempt). This used to loop over every exercise
// itself; that loop moved up to the deck when M01 became a slide format.
//
// M01's "tidak ada nilai kelulusan" rule lives here: completeM01Lesson
// runs unconditionally once the last question is checked and the
// learner taps through, regardless of the score.
export function ConceptExerciseRunner({
  lessonId,
  exercise,
  isLast,
  answer,
  onSelect,
  onChecked,
  onAdvance,
}: {
  lessonId: number;
  exercise: LessonExerciseRow;
  isLast: boolean;
  answer: ConceptAnswerState;
  onSelect: (optionId: number) => void;
  onChecked: (isCorrect: boolean) => void;
  onAdvance: () => void;
}) {
  const [startedAt] = useState(() => Date.now());

  function selectOption(optionId: number) {
    if (answer.checked) return;
    onSelect(optionId);
  }

  function handleCheck() {
    if (answer.checked || answer.selectedId == null) return;
    const isCorrect = answer.selectedId === exercise.correctOptionId;
    const label = exercise.options?.find((o) => o.id === answer.selectedId)?.label ?? "";
    const now = Date.now();
    void recordConceptAttempt({
      lessonId,
      exerciseType: exercise.exerciseType,
      isCorrect,
      chosenOptionLabel: label,
      responseTimeMs: now - startedAt,
    });
    onChecked(isCorrect);
  }

  function handleTyping(result: { typed: string; correct: boolean }) {
    if (answer.checked) return;
    const now = Date.now();
    void recordConceptAttempt({
      lessonId,
      exerciseType: exercise.exerciseType,
      isCorrect: result.correct,
      chosenOptionLabel: result.typed,
      responseTimeMs: now - startedAt,
    });
    onChecked(result.correct);
  }

  async function handleAdvance() {
    if (!answer.checked) return;
    if (isLast) await completeM01Lesson(lessonId);
    onAdvance();
  }

  const isTyping = exercise.exerciseType === "typing";
  const expectedTyping = exercise.options?.[0]?.label ?? "";

  return (
    <div className="exercise-runner m01-exercise m01-slide-quiz">
      <div className="exercise-runner__prompt">
        <p>{exercise.prompt}</p>
        {exercise.audioUrl && <AudioButton url={exercise.audioUrl} />}
      </div>

      {isTyping ? (
        !answer.checked ? (
          <KanaTypingInput key={exercise.id} expected={expectedTyping} onResult={handleTyping} />
        ) : (
          <p className={`m01-slide__jp m01-slide__jp--sentence ${answer.isCorrect ? "is-correct" : "is-wrong"}`}>{expectedTyping}</p>
        )
      ) : (
        <div className="exercise-runner__options exercise-runner__options--gated m01-slide-quiz__options">
          {exercise.options?.map((option) => {
            const isSelected = answer.selectedId === option.id;
            const isCorrectOpt = option.id === exercise.correctOptionId;
            const showCorrect = answer.checked && isCorrectOpt;
            const showWrong = answer.checked && isSelected && !isCorrectOpt;
            const dim = answer.checked && !isCorrectOpt && !isSelected;
            const stateClass = [
              isSelected && !answer.checked ? "is-selected" : "",
              showCorrect && isSelected ? "is-correct-selected" : "",
              showCorrect && !isSelected ? "is-correct-revealed" : "",
              showWrong ? "is-wrong" : "",
              dim ? "is-dim" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                key={option.id}
                type="button"
                disabled={answer.checked}
                className={`exercise-runner__option exercise-runner__option--card exercise-runner__option--text ${stateClass}`}
                onClick={() => selectOption(option.id)}
              >
                <span className="exercise-runner__option-label">{option.label}</span>
                {(showCorrect || showWrong) && (
                  <span className={`exercise-runner__option-badge ${showCorrect ? "is-correct" : "is-wrong"}`}>
                    {showCorrect ? "✓" : "✕"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {answer.checked && exercise.explanation && (
        <p className={`m01-feedback-inline ${answer.isCorrect ? "is-correct" : "is-wrong"}`}>{exercise.explanation}</p>
      )}

      {(!isTyping || answer.checked) && (
        <button
          type="button"
          className={`exercise-runner__check-btn ${answer.checked ? "is-checked" : ""}`}
          disabled={!answer.checked && answer.selectedId == null}
          onClick={answer.checked ? handleAdvance : handleCheck}
        >
          <span className="exercise-runner__check-btn-layer exercise-runner__check-btn-layer--orange" />
          <span className="exercise-runner__check-btn-layer exercise-runner__check-btn-layer--green" />
          <span className="exercise-runner__check-btn-label exercise-runner__check-btn-label--periksa">Periksa ›</span>
          <span className="exercise-runner__check-btn-label exercise-runner__check-btn-label--lanjut">
            {isLast ? "Selesaikan lesson ›" : "Lanjutkan ›"}
          </span>
        </button>
      )}
    </div>
  );
}
