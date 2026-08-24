import { expect, test } from "@playwright/test";
import {
  coreHiraganaIds,
  cookieHeaderFromStorageState,
  markStageCompletedAt,
  resetStageProgress,
  seedAttempts,
  stageIdByCode,
  testUserId,
  unlockThroughStage,
} from "../support/db";
import { callServerAction } from "../support/serverActions";

// Prompt 4 Bagian 4 — Uji (checkpoint, BOSS, and Bagian 2's RETENTION
// gate), proven at the data-pipe level: calls completeHiraganaStage
// directly with fabricated correct/total (and, for RETENTION, seeded
// user_kana_attempts evidence) — not through a real quiz UI, and
// definitely not through simulated handwriting. Confirms pass/fail
// follows the real threshold exactly, including the edge cases that
// actually matter: precisely at the line, one answer short of it, and
// the case a naive client-trusting check would get wrong.

test("F1 checkpoint: exactly 80% (8/10) passes", async ({ baseURL }) => {
  const userId = await testUserId();
  const f1StageId = await stageIdByCode("F1");
  await resetStageProgress(userId, f1StageId);
  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");

  const result = await callServerAction(
    baseURL!,
    "completeHiraganaStage",
    { stageId: f1StageId, correct: 8, total: 10 },
    cookieHeader,
  );
  expect(result).toMatchObject({ ok: true, passed: true, score: 80 });
});

test("F1 checkpoint: sengaja salah — 70% (7/10) does not pass", async ({ baseURL }) => {
  const userId = await testUserId();
  const f1StageId = await stageIdByCode("F1");
  await resetStageProgress(userId, f1StageId);
  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");

  const result = await callServerAction(
    baseURL!,
    "completeHiraganaStage",
    { stageId: f1StageId, correct: 7, total: 10 },
    cookieHeader,
  );
  expect(result).toMatchObject({ ok: true, passed: false, score: 70 });
});

test("RETENTION: rejected before 72h have elapsed, even with a claimed-perfect score", async ({ baseURL }) => {
  const userId = await testUserId();
  const retentionStageId = await stageIdByCode("RETENTION");
  await resetStageProgress(userId, retentionStageId);
  await unlockThroughStage(userId, "RETENTION"); // F1-F5, BOSS 30 days back
  const bossStageId = await stageIdByCode("BOSS");
  await markStageCompletedAt(userId, bossStageId, new Date()); // BOSS just passed
  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");

  // Prompt 4 Bagian 4 finding, fixed in the same commit as this test:
  // completeHiraganaStage did not check the 72h gate itself — only the
  // page rendering did. Calling the action directly (exactly like this)
  // used to succeed regardless of elapsed time. It must not anymore.
  const result = await callServerAction(
    baseURL!,
    "completeHiraganaStage",
    { stageId: retentionStageId, correct: 46, total: 46 },
    cookieHeader,
  );
  expect(result).toMatchObject({ ok: false });
});

test("RETENTION: sengaja salah — all 46 claimed correct but all hint-assisted still fails", async ({ baseURL }) => {
  const userId = await testUserId();
  const retentionStageId = await stageIdByCode("RETENTION");
  await resetStageProgress(userId, retentionStageId);
  await unlockThroughStage(userId, "RETENTION");
  const bossStageId = await stageIdByCode("BOSS");
  await markStageCompletedAt(userId, bossStageId, new Date(Date.now() - 73 * 60 * 60 * 1000));

  const coreIds = await coreHiraganaIds();
  // Every item "correct" but every one required a hint -> firstAttemptCorrect
  // false for all 46. A naive check trusting the client's claimed 46/46
  // (100%) would pass this; the real one reads this seeded evidence back.
  await seedAttempts(userId, coreIds, "RETENTION", () => false);

  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
  const result = await callServerAction(
    baseURL!,
    "completeHiraganaStage",
    { stageId: retentionStageId, correct: 46, total: 46 },
    cookieHeader,
  );
  expect(result).toMatchObject({ ok: true, passed: false, score: 0 });
});

test("RETENTION: genuinely passes once real evidence clears 85% first-attempt-unaided", async ({ baseURL }) => {
  const userId = await testUserId();
  const retentionStageId = await stageIdByCode("RETENTION");
  await resetStageProgress(userId, retentionStageId);
  await unlockThroughStage(userId, "RETENTION");
  const bossStageId = await stageIdByCode("BOSS");
  await markStageCompletedAt(userId, bossStageId, new Date(Date.now() - 73 * 60 * 60 * 1000));

  const coreIds = await coreHiraganaIds();
  // 44/46 = 95.7% first-attempt-correct, comfortably over the 85% bar.
  await seedAttempts(userId, coreIds, "RETENTION", (index) => index < 44);

  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
  const result = await callServerAction(
    baseURL!,
    "completeHiraganaStage",
    { stageId: retentionStageId, correct: 46, total: 46 },
    cookieHeader,
  );
  expect(result).toMatchObject({ ok: true, passed: true });
});
