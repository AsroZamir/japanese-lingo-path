// V2.1's mastery model names 5 tiers (New / Familiar / Retrievable /
// Durable / Transferable) but user_kana_mastery has no status column for
// them — Bagian 6.5 (mastery map) and Bagian 6.3 (review priority) both
// need to turn a kana's raw stats into one of the 5 names, so the
// derivation lives here once. Documented in PROMPT-6's final report per
// its own request ("dokumentasikan cara menurunkannya").
//
// Rule, in order (first match wins):
//   New          — never attempted.
//   Familiar     — attempted, but not yet reliable (accuracy < 80% or a
//                  broken streak < 2).
//   Transferable — has a real passed-in-context signal: a correct,
//                  unassisted RETENTION-stage attempt (proves it survives
//                  the 72h gate, not just an isolated drill).
//   Durable      — SRS interval has already grown to a week or more
//                  (srsIntervalDays >= 7) with good accuracy — surviving
//                  real spaced repetition, just not yet proven "in context".
//   Retrievable  — everything else: reliable on demand, but still on a
//                  short leash.
export type MasteryTier = "new" | "familiar" | "retrievable" | "durable" | "transferable";

export type MasteryTierInput = {
  attempts: number;
  accuracyPercent: number;
  streak: number;
  srsIntervalDays: number;
  passedRetentionUnassisted: boolean;
};

export function deriveMasteryTier(input: MasteryTierInput): MasteryTier {
  if (input.attempts <= 0) return "new";
  if (input.accuracyPercent < 80 || input.streak < 2) return "familiar";
  if (input.passedRetentionUnassisted) return "transferable";
  if (input.srsIntervalDays >= 7) return "durable";
  return "retrievable";
}

export const MASTERY_TIER_LABEL: Record<MasteryTier, string> = {
  new: "Baru",
  familiar: "Dikenali",
  retrievable: "Bisa diingat",
  durable: "Tahan lama",
  transferable: "Bisa dipakai",
};
