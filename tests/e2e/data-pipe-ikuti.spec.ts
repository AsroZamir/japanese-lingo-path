import { expect, test } from "@playwright/test";
import { attemptsSince, coreHiraganaIds, cookieHeaderFromStorageState, testUserId } from "../support/db";
import { callServerAction } from "../support/serverActions";

// Prompt 4 Bagian 4 — Ikuti, proven at the data-pipe level: calls
// recordHiraganaAttempt directly (the real "use server" function, via
// the real Server Action HTTP protocol — see serverActions.ts) with
// fabricated writing-evaluation results, exactly as if a real trace
// attempt had just been graded, without ever touching a canvas. Confirms
// the row lands with the right first_attempt_correct/hint_level/
// phase_code/curriculum_version — the part that can and must be proven
// automatically, per Prompt 4's own framing. Whether kakitori's stroke
// recognition itself feels right for a human hand is explicitly not
// something this (or any) automated test can settle.

test("Ikuti: a correct trace attempt persists with first_attempt_correct=true", async ({ baseURL }) => {
  const userId = await testUserId();
  const coreIds = await coreHiraganaIds();
  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
  const testStartedAt = new Date();

  const result = await callServerAction(
    baseURL!,
    "recordHiraganaAttempt",
    {
      stageId: 1,
      kanaId: coreIds[0], // あ
      exerciseType: "trace",
      skill: "writing",
      writingScore: 94,
      writingMatched: true,
      phaseCode: "P1",
      curriculumVersion: "v2.1",
      hintLevel: 0,
      assisted: false,
      firstAttemptCorrect: true,
    },
    cookieHeader,
  );
  expect(result).toEqual({ ok: true });

  const attempts = await attemptsSince(userId, "v21_p1_trace", testStartedAt);
  expect(attempts.length).toBeGreaterThanOrEqual(1);
  const latest = attempts[attempts.length - 1];
  expect(latest.phaseCode).toBe("P1");
  expect(latest.curriculumVersion).toBe("v2.1");
  expect(latest.isCorrect).toBe(true);
  expect(latest.firstAttemptCorrect).toBe(true);
  expect(latest.hintLevel).toBe(0);
});

test("Ikuti: a failed trace attempt persists with is_correct=false and first_attempt_correct=false", async ({ baseURL }) => {
  const userId = await testUserId();
  const coreIds = await coreHiraganaIds();
  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
  const testStartedAt = new Date();

  const result = await callServerAction(
    baseURL!,
    "recordHiraganaAttempt",
    {
      stageId: 1,
      kanaId: coreIds[1], // い
      exerciseType: "trace",
      skill: "writing",
      writingScore: 38,
      writingMatched: false,
      phaseCode: "P1",
      curriculumVersion: "v2.1",
      hintLevel: 0,
      assisted: false,
      firstAttemptCorrect: false,
    },
    cookieHeader,
  );
  expect(result).toEqual({ ok: true });

  // >=1, not exactly 1: this file's first test can still be inside the
  // window depending on clock precision between this machine and the
  // (remote) DB server — the row that matters is the one just inserted,
  // identified by its own createdAt being the most recent, not by being
  // alone in the result.
  const attempts = await attemptsSince(userId, "v21_p1_trace", testStartedAt);
  expect(attempts.length).toBeGreaterThanOrEqual(1);
  const latest = attempts[attempts.length - 1];
  expect(latest.isCorrect).toBe(false);
  expect(latest.firstAttemptCorrect).toBe(false);
});
