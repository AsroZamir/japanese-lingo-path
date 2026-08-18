"use client";

import { useState } from "react";
import { KanaTypingInput } from "@/components/kana/KanaTypingInput";
import { AudioButton } from "@/components/kana/AudioButton";
import type { LessonExerciseRow } from "@/app/lib/lesson-content-types";
import { recordConceptAttempt, completeM01Lesson } from "./actions";

// M01's "tidak ada nilai kelulusan" rule lives here: completeM01Lesson
// runs unconditionally once the last question is answered, regardless
// of the score — this component never blocks moving on.
export function ConceptExerciseRunner({ lessonId, exercises }: { lessonId: number; exercises: LessonExerciseRow[] }) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string | null } | null>(null);
  const [done, setDone] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [score, setScore] = useState({ correct: 0, total: 0 });

  if (exercises.length === 0) return null;
  const current = exercises[index];

  function advance(isCorrect: boolean, chosenLabel: string, now: number) {
    void recordConceptAttempt({
      lessonId,
      exerciseType: current.exerciseType,
      isCorrect,
      chosenOptionLabel: chosenLabel,
      responseTimeMs: now - startedAt,
    });
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    setFeedback({ correct: isCorrect, explanation: current.explanation });
  }

  function handleChoice(optionId: number, label: string) {
    if (feedback) return;
    // eslint-disable-next-line react-hooks/purity -- only ever invoked from onClick; the identical Date.now() call in handleTyping below doesn't trip this rule (same inconsistency noted in ExerciseRunner.tsx).
    advance(optionId === current.correctOptionId, label, Date.now());
  }

  function handleTyping(result: { typed: string; correct: boolean }) {
    if (feedback) return;
    advance(result.correct, result.typed, Date.now());
  }

  async function handleNext() {
    setFeedback(null);
    if (index + 1 < exercises.length) {
      setIndex((i) => i + 1);
      setStartedAt(Date.now());
    } else {
      setDone(true);
      await completeM01Lesson(lessonId);
    }
  }

  if (done) {
    return (
      <div className="exercise-runner exercise-runner--done">
        Selesai — {score.correct}/{score.total} benar. Latihan ini tidak punya nilai kelulusan, jadi Anda tetap bisa lanjut ke pelajaran berikutnya.
      </div>
    );
  }

  return (
    <div className="exercise-runner m01-exercise">
      <div className="exercise-runner__header">
        <span className="exercise-runner__progress">{index + 1}/{exercises.length}</span>
      </div>

      <div className="exercise-runner__prompt">
        <p>{current.prompt}</p>
        {current.audioUrl && <AudioButton url={current.audioUrl} />}
      </div>

      {current.exerciseType === "typing" ? (
        !feedback && <KanaTypingInput key={current.id} expected={current.options?.[0]?.label ?? ""} onResult={handleTyping} />
      ) : (
        <div className="exercise-runner__options">
          {current.options?.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`exercise-runner__option ${feedback && option.id === current.correctOptionId ? "m01-option--correct" : ""}`}
              disabled={!!feedback}
              onClick={() => handleChoice(option.id, option.label)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {feedback && (
        <div className={`m01-feedback ${feedback.correct ? "m01-feedback--correct" : "m01-feedback--incorrect"}`}>
          <strong>{feedback.correct ? "Benar!" : "Belum tepat."}</strong>
          {feedback.explanation && <p>{feedback.explanation}</p>}
          <button className="primary-button" onClick={handleNext}>
            {index + 1 < exercises.length ? "Lanjut →" : "Selesaikan lesson →"}
          </button>
        </div>
      )}
    </div>
  );
}
