"use client";

import { useEffect, useMemo, useState } from "react";
import { AudioButton } from "./AudioButton";
import { KanaTypingInput } from "./KanaTypingInput";

export type ExerciseType =
  | "visual_to_sound"
  | "sound_to_visual"
  | "recall"
  | "word_reading"
  | "typing"
  | "dictation"
  | "similar_kana_discrimination"
  | "timed_recognition";

// sound_to_visual and dictation present audio as the PROMPT itself (not
// just an optional "hear it" extra) — with audio_url null everywhere
// right now (Fase 4's premise), there is nothing to actually present, so
// these two can't be meaningfully attempted yet. Structure is built and
// wired exactly like the rest; the note below is both a code comment and
// a visible on-screen notice, since a silent guessing game would be
// worse than an honest "not testable yet".
const AUDIO_DEPENDENT_TYPES: ExerciseType[] = ["sound_to_visual", "dictation"];

export type ExerciseOption = {
  id: number;
  label: string;
};

export type ExerciseItem = {
  id: string;
  type: ExerciseType;
  kanaId?: number;
  wordId?: number;
  promptKana?: string;
  promptRomaji?: string;
  promptAudioUrl?: string | null;
  promptMeaning?: string;
  /** Multiple-choice types only (everything except typing/dictation). */
  options?: ExerciseOption[];
  correctOptionId?: number;
  /** typing/dictation only — what KanaTypingInput should match. */
  expectedTyping?: string;
  /** timed_recognition only. */
  timeLimitSeconds?: number;
};

export type ExerciseRunnerConfig = {
  /** Shuffle item order at the start of a run. */
  shuffle?: boolean;
  /** Keep an item active (logging every attempt) until answered correctly, instead of moving on after one try. */
  allowRetry?: boolean;
};

export type ExerciseAttemptResult = {
  itemId: string;
  exerciseType: ExerciseType;
  kanaId?: number;
  wordId?: number;
  isCorrect: boolean;
  /** Populated for every choice-based answer (WAJIB whenever isCorrect is false — that's what later confusion-pair detection reads). null only for typing/dictation, where there's no discrete option, or a timed_recognition timeout with nothing selected. */
  selectedOptionId: number | null;
  correctOptionId: number | null;
  /** typing/dictation only — captures the mistake in the shape that actually applies to freeform input, since selected_option_id doesn't. */
  typedValue?: string;
  responseTimeMs: number;
  timedOut?: boolean;
};

export type ExerciseRunnerResult = {
  attempts: ExerciseAttemptResult[];
  correctCount: number;
  totalCount: number;
};

export type ExerciseRunnerProps = {
  items: ExerciseItem[];
  config?: ExerciseRunnerConfig;
  onComplete?: (result: ExerciseRunnerResult) => void;
};

function shuffleArray<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function BlockedNote({ type }: { type: ExerciseType }) {
  if (!AUDIO_DEPENDENT_TYPES.includes(type)) return null;
  return (
    <p className="exercise-runner__blocked-note">
      Tipe latihan &quot;{type}&quot; butuh audio sebagai prompt — belum bisa diuji sampai audio_url terisi.
    </p>
  );
}

function Countdown({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    // Notifying a callback prop once internal state crosses a threshold
    // is exactly what an effect is for (synchronizing with something
    // outside this component) — this isn't a React setState call, so
    // it's not the set-state-in-effect anti-pattern the rest of this
    // phase kept running into.
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const timer = setTimeout(() => setRemaining((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onExpire]);

  return <span className="exercise-runner__countdown">{remaining}s</span>;
}

function ExercisePrompt({ item }: { item: ExerciseItem }) {
  const isAudioPrompt = item.type === "sound_to_visual" || item.type === "dictation";
  return (
    <div className="exercise-runner__prompt">
      {item.promptKana && <span className="exercise-runner__prompt-kana">{item.promptKana}</span>}
      {!item.promptKana && item.promptRomaji && <span className="exercise-runner__prompt-romaji">{item.promptRomaji}</span>}
      {item.promptMeaning && <p className="exercise-runner__prompt-meaning">{item.promptMeaning}</p>}
      {(isAudioPrompt || item.promptAudioUrl) && (
        <AudioButton url={item.promptAudioUrl} autoplay={isAudioPrompt} />
      )}
    </div>
  );
}

export function ExerciseRunner({ items, config, onComplete }: ExerciseRunnerProps) {
  const orderedItems = useMemo(() => (config?.shuffle ? shuffleArray(items) : items), [items, config?.shuffle]);

  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<ExerciseAttemptResult[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [lastWrongOptionId, setLastWrongOptionId] = useState<number | null>(null);

  const currentItem = orderedItems[index];

  function finish(nextAttempts: ExerciseAttemptResult[]) {
    const correctCount = nextAttempts.filter((a) => a.isCorrect).length;
    onComplete?.({ attempts: nextAttempts, correctCount, totalCount: nextAttempts.length });
  }

  // now/nextStartedAt are always supplied by the actual event handler
  // that calls recordAttempt (handleChoice/handleTypingResult/
  // handleTimeout), never computed in here — react-hooks/purity flags
  // Date.now() when it's textually inside a component's render scope
  // regardless of the call depth, so the impure call has to live at the
  // point closest to the real DOM event, not in a shared helper.
  function recordAttempt(partial: Omit<ExerciseAttemptResult, "responseTimeMs">, now: number) {
    const result: ExerciseAttemptResult = { ...partial, responseTimeMs: now - startedAt };
    const nextAttempts = [...attempts, result];
    setAttempts(nextAttempts);

    if (result.isCorrect || !config?.allowRetry) {
      setLastWrongOptionId(null);
      if (index + 1 >= orderedItems.length) {
        finish(nextAttempts);
      } else {
        setIndex((i) => i + 1);
        setStartedAt(now);
      }
    } else {
      // allowRetry: item stays active, but this wrong attempt is still
      // logged (it's a real attempt, not a draft) before trying again.
      setLastWrongOptionId(result.selectedOptionId);
    }
  }

  function handleChoice(optionId: number) {
    if (!currentItem) return;
    recordAttempt(
      {
        itemId: currentItem.id,
        exerciseType: currentItem.type,
        kanaId: currentItem.kanaId,
        wordId: currentItem.wordId,
        isCorrect: optionId === currentItem.correctOptionId,
        selectedOptionId: optionId,
        correctOptionId: currentItem.correctOptionId ?? null,
      },
      // eslint-disable-next-line react-hooks/purity -- only ever invoked from onClick (see the options map below); the identical Date.now() call two functions down (handleTypingResult) doesn't trip this rule, so this looks like a linter inconsistency rather than a real render-purity issue.
      Date.now(),
    );
  }

  function handleTypingResult(typedValue: string, correct: boolean) {
    if (!currentItem) return;
    recordAttempt(
      {
        itemId: currentItem.id,
        exerciseType: currentItem.type,
        kanaId: currentItem.kanaId,
        wordId: currentItem.wordId,
        isCorrect: correct,
        selectedOptionId: null, // no discrete option in a typed answer
        correctOptionId: null,
        typedValue,
      },
      Date.now(),
    );
  }

  function handleTimeout() {
    if (!currentItem) return;
    recordAttempt(
      {
        itemId: currentItem.id,
        exerciseType: currentItem.type,
        kanaId: currentItem.kanaId,
        wordId: currentItem.wordId,
        isCorrect: false,
        selectedOptionId: null, // nothing was selected — see ExerciseAttemptResult's note on this
        correctOptionId: currentItem.correctOptionId ?? null,
        timedOut: true,
      },
      Date.now(),
    );
  }

  if (!currentItem) {
    const correctCount = attempts.filter((a) => a.isCorrect).length;
    return (
      <div className="exercise-runner exercise-runner--done">
        Selesai — {correctCount}/{attempts.length} benar.
      </div>
    );
  }

  const isTyping = currentItem.type === "typing" || currentItem.type === "dictation";

  return (
    <div className="exercise-runner">
      <div className="exercise-runner__header">
        <span className="exercise-runner__progress">{index + 1}/{orderedItems.length}</span>
        <span className="exercise-runner__type">{currentItem.type}</span>
        {currentItem.type === "timed_recognition" && currentItem.timeLimitSeconds && (
          <Countdown key={currentItem.id} seconds={currentItem.timeLimitSeconds} onExpire={handleTimeout} />
        )}
      </div>

      <BlockedNote type={currentItem.type} />
      <ExercisePrompt item={currentItem} />

      {isTyping ? (
        currentItem.expectedTyping && (
          <KanaTypingInput
            key={currentItem.id}
            expected={currentItem.expectedTyping}
            onResult={(result) => handleTypingResult(result.typed, result.correct)}
          />
        )
      ) : (
        <div className="exercise-runner__options">
          {currentItem.options?.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`exercise-runner__option ${lastWrongOptionId === option.id ? "exercise-runner__option--wrong" : ""}`}
              onClick={() => handleChoice(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
