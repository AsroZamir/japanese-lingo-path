"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { bind, isKatakana, unbind } from "wanakana";

export type KanaTypingResult = {
  expected: string;
  typed: string;
  correct: boolean;
  /** How many leading characters of `typed` already match `expected` — useful for highlighting progress before a full match/submit. */
  matchedLength: number;
};

export type KanaTypingInputProps = {
  expected: string;
  onResult?: (result: KanaTypingResult) => void;
};

function matchedLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

export function KanaTypingInput({ expected, onResult }: KanaTypingInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");

  // expected can be hiragana or katakana — bind() needs to be told which
  // one to convert typed romaji into, so it's detected rather than
  // assumed. Re-binds only when the target script actually changes, not
  // on every new `expected` value within the same script.
  const imeMode: "toHiragana" | "toKatakana" = isKatakana(expected) ? "toKatakana" : "toHiragana";

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    bind(el, { IMEMode: imeMode });
    return () => unbind(el);
  }, [imeMode]);

  // Reset when the target changes — adjusted during render (React's
  // documented pattern for this) rather than as an effect-body setState.
  const [prevExpected, setPrevExpected] = useState(expected);
  if (expected !== prevExpected) {
    setPrevExpected(expected);
    setStatus("idle");
  }

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = "";
  }, [expected]);

  function submit(value: string) {
    const correct = value === expected;
    setStatus(correct ? "correct" : "incorrect");
    onResult?.({ expected, typed: value, correct, matchedLength: matchedLength(value, expected) });
  }

  function handleInput(event: FormEvent<HTMLInputElement>) {
    const value = event.currentTarget.value;
    if (value === expected) {
      submit(value); // auto-submits the moment it's right, no Enter needed
    } else if (status !== "idle") {
      setStatus("idle");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      submit(inputRef.current?.value ?? "");
    }
  }

  return (
    <div className={`kana-typing-input kana-typing-input--${status}`}>
      <span className="kana-typing-input__target">{expected}</span>
      <input
        ref={inputRef}
        type="text"
        className="kana-typing-input__field"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="ketik romaji…"
        aria-label={`Ketik romaji untuk ${expected}`}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {status === "correct" && <span className="kana-typing-input__icon" aria-hidden="true">✓</span>}
      {status === "incorrect" && <span className="kana-typing-input__icon" aria-hidden="true">✗</span>}
    </div>
  );
}
