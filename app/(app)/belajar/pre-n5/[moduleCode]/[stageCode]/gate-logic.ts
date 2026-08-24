// Pure pass/fail logic for PRE-N5.01's gates, kept free of next/headers and
// Supabase so it can be unit-tested directly (see tests/unit/gate-logic.spec.ts)
// instead of only through a full browser run. Extracted out of actions.ts
// unchanged — no behavior change, just made independently testable.

export function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// V2.1 §4.1: "Checkpoint akuisisi: >=80% first-attempt, tetapi hanya
// membuka langkah berikutnya; belum memberi label mastered." The 80%
// itself lives in each stage's pass_criteria row (accuracyPercent), not
// hardcoded here — this just evaluates whatever criteria are configured.
export function evaluateCheckpointPass(
  passCriteria: Record<string, unknown>,
  correct: number,
  total: number,
): { passed: boolean; score: number; requiredLabel: string } {
  const score = total > 0 ? clamp((correct / total) * 100, 0, 100) : 0;
  const accuracyRequired = finiteNumber(
    passCriteria.accuracyPercent ?? passCriteria.scorePercent,
    0,
  );
  const correctRequired = finiteNumber(passCriteria.correctCount, 0);

  if (correctRequired > 0) {
    return {
      passed: correct >= correctRequired,
      score,
      requiredLabel: "minimal " + correctRequired + " jawaban benar",
    };
  }
  return {
    passed: score >= accuracyRequired,
    score,
    requiredLabel: "minimal " + Math.round(accuracyRequired) + "%",
  };
}

// V2.1 §4.1: "Retention gate: >=85% first-attempt tanpa hint setelah jeda
// minimal 72 jam." Two independent checks: is enough time elapsed since
// the prerequisite stage was first passed (below), and does the retry
// score clear the higher bar (evaluateRetentionScore further down).
export function evaluateDelayedGateEligibility(
  prerequisiteFirstCompletedAt: Date | null,
  now: Date,
  delayHours: number,
): { eligible: boolean; availableAt: Date | null } {
  if (!prerequisiteFirstCompletedAt) {
    return { eligible: false, availableAt: null };
  }
  const availableAt = new Date(
    prerequisiteFirstCompletedAt.getTime() + delayHours * 60 * 60 * 1000,
  );
  return { eligible: now >= availableAt, availableAt };
}

// The retention gate's scoring half: unlike evaluateCheckpointPass (which
// trusts a client-reported correct/total), this re-derives the score from
// persisted per-attempt evidence — firstAttemptCorrect is only true when
// an item was answered right the very first time it was tried, with no
// hint open (see HiraganaLearningLab.tsx's recordAttempt / actions.ts).
// Requires every expected item to have real evidence, not just a
// percentage over whatever rows happen to exist — an empty or partial
// attempt list must not look like a pass.
export function evaluateRetentionScore(
  attempts: { firstAttemptCorrect: boolean | null }[],
  expectedCount: number,
  accuracyRequired: number,
): { passed: boolean; score: number } {
  if (attempts.length < expectedCount || expectedCount === 0) {
    return { passed: false, score: 0 };
  }
  const correct = attempts.filter((attempt) => attempt.firstAttemptCorrect === true).length;
  const score = clamp((correct / attempts.length) * 100, 0, 100);
  return { passed: score >= accuracyRequired, score };
}
