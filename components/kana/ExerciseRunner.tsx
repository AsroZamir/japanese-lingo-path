"use client";

import { useMemo, useState, useEffect } from "react";
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
  /** Fires after every single answer, correct or wrong — for persisting each one as it happens rather than batching until the end. */
  onAttempt?: (attempt: ExerciseAttemptResult) => void;
  onComplete?: (result: ExerciseRunnerResult) => void;
  /**
   * Fires exactly once per graded question, at the moment it's graded —
   * never on mere option selection. For the gated multiple-choice flow
   * (see selectOption/handleCheck below) that means after the "Periksa"
   * tap, not the option tap; for typing/timed_recognition, which grade
   * instantly, it fires at that same instant. Intended for an outer
   * progress indicator (e.g. LessonPlayer) — the outer caller owns
   * whatever state it derives from this, ExerciseRunner doesn't read
   * this value back.
   */
  onProgress?: (done: number, total: number) => void;
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

export function ExerciseRunner({ items, config, onAttempt, onComplete, onProgress }: ExerciseRunnerProps) {
  const orderedItems = useMemo(() => (config?.shuffle ? shuffleArray(items) : items), [items, config?.shuffle]);

  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<ExerciseAttemptResult[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  // selected/checked/typedValue drive the gated select-or-type→Periksa→
  // Lanjutkan flow (Moji "layar 5" spec) shared by multiple-choice AND
  // typing/dictation — pick a card or type an answer, tap Periksa to
  // grade+reveal, tap Lanjutkan to move on. Only timed_recognition still
  // grades instantly (its countdown is already the "decide now" pressure).
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  // KanaTypingInput owns its DOM input value directly (wanakana binds to
  // the node itself, so it can't be a plain controlled `value` prop) —
  // bumping this key forces a remount to actually clear what's on
  // screen for a fresh attempt, since resetting `typedValue` alone only
  // clears our own state, not the visible field.
  const [attemptKey, setAttemptKey] = useState(0);

  const currentItem = orderedItems[index];

  function finish(nextAttempts: ExerciseAttemptResult[]) {
    const correctCount = nextAttempts.filter((a) => a.isCorrect).length;
    onComplete?.({ attempts: nextAttempts, correctCount, totalCount: nextAttempts.length });
  }

  function goNextOrFinish(nextAttempts: ExerciseAttemptResult[], now: number) {
    setSelected(null);
    setChecked(false);
    setTypedValue("");
    setAttemptKey((k) => k + 1);
    if (index + 1 >= orderedItems.length) {
      finish(nextAttempts);
    } else {
      setIndex((i) => i + 1);
      setStartedAt(now);
    }
  }

  // now is always supplied by the actual event handler, never computed
  // in here — react-hooks/purity flags Date.now() textually inside a
  // component's render scope regardless of call depth.
  function recordInstant(partial: Omit<ExerciseAttemptResult, "responseTimeMs">, now: number) {
    const result: ExerciseAttemptResult = { ...partial, responseTimeMs: now - startedAt };
    const nextAttempts = [...attempts, result];
    setAttempts(nextAttempts);
    onAttempt?.(result);
    onProgress?.(nextAttempts.length, orderedItems.length);

    if (result.isCorrect || !config?.allowRetry) {
      goNextOrFinish(nextAttempts, now);
    }
    // else: allowRetry + wrong — item stays active, nothing to reset
    // (the instant paths don't use selected/checked in the first place).
  }

  // Timed multiple-choice bypasses the Periksa/Lanjutkan gate on
  // purpose — a countdown is already the "decide now" pressure; a
  // second confirm tap on top of it would fight the timer, and there's
  // no reference screen for that combination in the Moji mockups.
  function handleTimedChoice(optionId: number) {
    if (!currentItem) return;
    recordInstant(
      {
        itemId: currentItem.id, exerciseType: currentItem.type,
        kanaId: currentItem.kanaId, wordId: currentItem.wordId,
        isCorrect: optionId === currentItem.correctOptionId,
        selectedOptionId: optionId, correctOptionId: currentItem.correctOptionId ?? null,
      },
      // eslint-disable-next-line react-hooks/purity -- only ever invoked from onClick; the identical Date.now() call in handleCheck below doesn't trip this rule, same linter inconsistency noted elsewhere in this codebase.
      Date.now(),
    );
  }

  function handleTimeout() {
    if (!currentItem) return;
    recordInstant(
      {
        itemId: currentItem.id, exerciseType: currentItem.type,
        kanaId: currentItem.kanaId, wordId: currentItem.wordId,
        isCorrect: false, selectedOptionId: null, correctOptionId: currentItem.correctOptionId ?? null, timedOut: true,
      },
      Date.now(),
    );
  }

  // Gated select-or-type path (everything except timed_recognition).
  function selectOption(optionId: number) {
    if (checked) return;
    setSelected(optionId);
  }

  function handleCheck() {
    if (checked || selected == null || !currentItem) return;
    const now = Date.now();
    const isCorrect = selected === currentItem.correctOptionId;
    const result: ExerciseAttemptResult = {
      itemId: currentItem.id, exerciseType: currentItem.type,
      kanaId: currentItem.kanaId, wordId: currentItem.wordId,
      isCorrect, selectedOptionId: selected, correctOptionId: currentItem.correctOptionId ?? null,
      responseTimeMs: now - startedAt,
    };
    const nextAttempts = [...attempts, result];
    setAttempts(nextAttempts);
    onAttempt?.(result);
    setChecked(true);
    // Fires here — after grading, never on the earlier selectOption tap.
    onProgress?.(nextAttempts.length, orderedItems.length);
  }

  // Typing's own "Periksa" — same gate as handleCheck (grade, reveal,
  // wait for an explicit Lanjutkan), just reading typedValue instead of
  // a selected card. Triggered by the shared check-btn OR Enter inside
  // KanaTypingInput — never by the input auto-matching mid-keystroke.
  function handleTypingCheck() {
    if (checked || !currentItem) return;
    const now = Date.now();
    const isCorrect = typedValue === currentItem.expectedTyping;
    const result: ExerciseAttemptResult = {
      itemId: currentItem.id, exerciseType: currentItem.type,
      kanaId: currentItem.kanaId, wordId: currentItem.wordId,
      isCorrect, selectedOptionId: null, correctOptionId: null, typedValue,
      responseTimeMs: now - startedAt,
    };
    const nextAttempts = [...attempts, result];
    setAttempts(nextAttempts);
    onAttempt?.(result);
    setChecked(true);
    onProgress?.(nextAttempts.length, orderedItems.length);
  }

  function handleContinue() {
    if (!checked || !currentItem) return;
    const now = Date.now();
    const isTypingItem = currentItem.type === "typing" || currentItem.type === "dictation";
    const wasCorrect = isTypingItem ? typedValue === currentItem.expectedTyping : selected === currentItem.correctOptionId;
    if (!wasCorrect && config?.allowRetry) {
      setSelected(null);
      setChecked(false);
      setTypedValue("");
      setAttemptKey((k) => k + 1);
      return;
    }
    goNextOrFinish(attempts, now);
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
  const isTimed = currentItem.type === "timed_recognition";
  const isGated = !isTyping && !isTimed;
  const typedIsCorrect = isTyping && checked && typedValue === currentItem.expectedTyping;
  const retryWrong =
    checked && config?.allowRetry &&
    (isTyping ? typedValue !== currentItem.expectedTyping : isGated && selected !== currentItem.correctOptionId);
  // Same select-or-type→Periksa→Lanjutkan gate for both card and typing
  // items — only timed_recognition (below) skips this entirely.
  const showCheckBtn = isGated || isTyping;
  const canCheck = isTyping ? typedValue.trim().length > 0 : selected != null;

  return (
    <div className="exercise-runner">
      <div className="exercise-runner__header">
        <span className="exercise-runner__progress">{index + 1}/{orderedItems.length}</span>
        <span className="exercise-runner__type">{currentItem.type}</span>
        {isTimed && currentItem.timeLimitSeconds && (
          <Countdown key={currentItem.id} seconds={currentItem.timeLimitSeconds} onExpire={handleTimeout} />
        )}
      </div>

      <BlockedNote type={currentItem.type} />
      <ExercisePrompt item={currentItem} />

      {isTyping ? (
        currentItem.expectedTyping && (
          <div className="exercise-runner__typing">
            <KanaTypingInput
              key={`${currentItem.id}-${attemptKey}`}
              expected={currentItem.expectedTyping}
              status={checked ? (typedIsCorrect ? "correct" : "incorrect") : "idle"}
              disabled={checked}
              onChange={setTypedValue}
              onSubmit={handleTypingCheck}
            />
            {checked && !typedIsCorrect && (
              <p className="exercise-runner__typing-answer">Jawaban benar: {currentItem.expectedTyping}</p>
            )}
          </div>
        )
      ) : isTimed ? (
        <div className="exercise-runner__options">
          {currentItem.options?.map((option) => (
            <button
              key={option.id}
              type="button"
              className="exercise-runner__option"
              onClick={() => handleTimedChoice(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="exercise-runner__options exercise-runner__options--gated">
          {currentItem.options?.map((option) => {
            const isSelected = selected === option.id;
            const isCorrectOpt = option.id === currentItem.correctOptionId;
            const showCorrect = checked && isCorrectOpt;
            const showWrong = checked && isSelected && !isCorrectOpt;
            const dim = checked && !isCorrectOpt && !isSelected;
            const stateClass = [
              isSelected && !checked ? "is-selected" : "",
              showCorrect && isSelected ? "is-correct-selected" : "",
              showCorrect && !isSelected ? "is-correct-revealed" : "",
              showWrong ? "is-wrong" : "",
              dim ? "is-dim" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                key={option.id}
                type="button"
                disabled={checked}
                className={`exercise-runner__option exercise-runner__option--card ${stateClass}`}
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

      {showCheckBtn && (
        <button
          type="button"
          className={`exercise-runner__check-btn ${checked ? "is-checked" : ""}`}
          disabled={!checked && !canCheck}
          onClick={checked ? handleContinue : isTyping ? handleTypingCheck : handleCheck}
        >
          <span className="exercise-runner__check-btn-layer exercise-runner__check-btn-layer--orange" />
          <span className="exercise-runner__check-btn-layer exercise-runner__check-btn-layer--green" />
          <span className="exercise-runner__check-btn-label exercise-runner__check-btn-label--periksa">Periksa ›</span>
          <span className="exercise-runner__check-btn-label exercise-runner__check-btn-label--lanjut">
            {retryWrong ? "Coba lagi ›" : "Lanjutkan ›"}
          </span>
        </button>
      )}
    </div>
  );
}
