import { expect, test } from "@playwright/test";
import {
  evaluateCheckpointPass,
  evaluateDelayedGateEligibility,
  evaluateRetentionScore,
} from "../../app/(app)/belajar/pre-n5/[moduleCode]/[stageCode]/gate-logic";

// Runs against the exact function actions.ts calls in completeHiraganaStage —
// not a reimplementation — so a change to the real gate logic breaks this
// test too. No browser involved; Playwright Test runs plain assertions fine.

test.describe("checkpoint gate: >=80% first-attempt (V2.1 Bagian 4.1)", () => {
  test("sengaja salah: 7/10 (70%) must NOT pass an 80% accuracy gate", () => {
    const result = evaluateCheckpointPass({ accuracyPercent: 80 }, 7, 10);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(70);
  });

  test("exactly 8/10 (80%) must pass an 80% accuracy gate", () => {
    const result = evaluateCheckpointPass({ accuracyPercent: 80 }, 8, 10);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(80);
  });

  test("79.9% must not round up into a pass", () => {
    // 15/19 = 78.9...%, below 80 even though ceil(19*0.8)=16 rounds close.
    const result = evaluateCheckpointPass({ accuracyPercent: 80 }, 15, 19);
    expect(result.passed).toBe(false);
  });

  test("correctCount overrides accuracyPercent when both are set", () => {
    const result = evaluateCheckpointPass(
      { accuracyPercent: 80, correctCount: 5 },
      5,
      20,
    );
    expect(result.passed).toBe(true);
    expect(result.requiredLabel).toContain("5");
  });

  test("zero total does not throw and never passes", () => {
    const result = evaluateCheckpointPass({ accuracyPercent: 80 }, 0, 0);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });
});

test.describe("delayed gate eligibility: >=72h since prerequisite first passed (V2.1 Bagian 4.1, Bagian 3)", () => {
  test("no prerequisite pass on record -> not eligible, no availableAt", () => {
    const result = evaluateDelayedGateEligibility(null, new Date("2026-08-24T00:00:00Z"), 72);
    expect(result.eligible).toBe(false);
    expect(result.availableAt).toBeNull();
  });

  test("sengaja salah: 71h59m after first pass -> still not eligible", () => {
    const firstPassed = new Date("2026-08-21T00:00:00Z");
    const now = new Date("2026-08-23T23:59:00Z"); // 71h59m later
    const result = evaluateDelayedGateEligibility(firstPassed, now, 72);
    expect(result.eligible).toBe(false);
  });

  test("exactly 72h after first pass -> eligible", () => {
    const firstPassed = new Date("2026-08-21T00:00:00Z");
    const now = new Date("2026-08-24T00:00:00Z"); // exactly 72h later
    const result = evaluateDelayedGateEligibility(firstPassed, now, 72);
    expect(result.eligible).toBe(true);
    expect(result.availableAt?.toISOString()).toBe("2026-08-24T00:00:00.000Z");
  });

  test("73h after first pass -> eligible", () => {
    const firstPassed = new Date("2026-08-21T00:00:00Z");
    const now = new Date("2026-08-24T01:00:00Z");
    const result = evaluateDelayedGateEligibility(firstPassed, now, 72);
    expect(result.eligible).toBe(true);
  });
});

test.describe("retention gate score: >=85% first-attempt unaided (V2.1 Bagian 4.1)", () => {
  test("sengaja salah: 84% (37/44) must NOT pass an 85% retention gate", () => {
    const attempts = Array.from({ length: 44 }, (_, i) => ({ firstAttemptCorrect: i < 37 }));
    const result = evaluateRetentionScore(attempts, 44, 85);
    expect(result.passed).toBe(false);
  });

  test("85% exactly (37.4->38/44) must pass", () => {
    const attempts = Array.from({ length: 44 }, (_, i) => ({ firstAttemptCorrect: i < 38 }));
    const result = evaluateRetentionScore(attempts, 44, 85);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.passed).toBe(true);
  });

  test("assisted (hinted) correct answers do not count as first-attempt-correct", () => {
    // 46/46 correct overall, but half were hint-assisted (firstAttemptCorrect
    // false for those) — a naive correct/total check would show 100%.
    const attempts = Array.from({ length: 46 }, (_, i) => ({ firstAttemptCorrect: i < 23 }));
    const result = evaluateRetentionScore(attempts, 46, 85);
    expect(result.score).toBeCloseTo(50, 0);
    expect(result.passed).toBe(false);
  });

  test("fewer recorded attempts than expected items -> refuses to pass, not just a lower score", () => {
    const attempts = Array.from({ length: 40 }, () => ({ firstAttemptCorrect: true }));
    const result = evaluateRetentionScore(attempts, 46, 85);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  test("zero expected items never passes", () => {
    const result = evaluateRetentionScore([], 0, 85);
    expect(result.passed).toBe(false);
  });
});
