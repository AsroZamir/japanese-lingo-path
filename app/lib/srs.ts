// Shared SM-2-lite math, extracted from the per-attempt SRS update that
// PRE-N5.01's recordHiraganaAttempt already runs (Bagian 6.1 F1-F12 review
// wiring). Kept here, pure and framework-free, so the daily review queue
// (Bagian 6.3) can predict/display intervals without duplicating the
// constants — recordHiraganaAttempt itself is left untouched to avoid
// touching already-verified production code.
export const SRS_INTERVALS = [1, 3, 7, 14, 30] as const;
const SRS_MIN_EASE = 1.3;
const SRS_MAX_EASE = 3;
const SRS_EASE_STEP = 0.1;
const SRS_EASE_PENALTY = 0.2;

export function nextSrsInterval(currentDays: number, correct: boolean): number {
  if (!correct) return 1;
  const currentIndex = SRS_INTERVALS.findIndex((days) => days >= currentDays);
  if (currentIndex < 0) return SRS_INTERVALS[SRS_INTERVALS.length - 1];
  return SRS_INTERVALS[
    Math.min(currentIndex + (currentDays > 0 ? 1 : 0), SRS_INTERVALS.length - 1)
  ];
}

export function nextSrsEase(currentEase: number, correct: boolean): number {
  const next = currentEase + (correct ? SRS_EASE_STEP : -SRS_EASE_PENALTY);
  return Math.min(SRS_MAX_EASE, Math.max(SRS_MIN_EASE, next));
}
