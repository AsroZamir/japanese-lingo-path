import { expect, test } from "@playwright/test";
import { evaluateCheckpointPass } from "../../app/(app)/belajar/pre-n5/[moduleCode]/[stageCode]/gate-logic";

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
