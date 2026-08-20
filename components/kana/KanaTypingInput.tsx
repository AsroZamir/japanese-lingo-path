"use client";

import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { bind, isKatakana, unbind } from "wanakana";

export type KanaTypingStatus = "idle" | "correct" | "incorrect";

export type KanaTypingInputProps = {
  expected: string;
  /** Parent-controlled grading state — same select→Periksa→Lanjutkan gate as the multiple-choice cards, not an internal auto-submit. */
  status: KanaTypingStatus;
  /** Locks the field once graded, so the value can't change before "Lanjutkan". */
  disabled?: boolean;
  onChange: (value: string) => void;
  /** Enter key — asks the parent to grade (its "Periksa" action), never advances by itself. */
  onSubmit: () => void;
};

export function KanaTypingInput({ expected, status, disabled, onChange, onSubmit }: KanaTypingInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = "";
  }, [expected]);

  function handleInput(event: FormEvent<HTMLInputElement>) {
    onChange(event.currentTarget.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
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
        disabled={disabled}
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
