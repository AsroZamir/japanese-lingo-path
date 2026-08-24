import { expect, test } from "@playwright/test";
import {
  attemptsSince,
  cookieHeaderFromStorageState,
  resetStageProgress,
  stageIdByCode,
  testUserId,
} from "../support/db";
import { callServerAction } from "../support/serverActions";

// Prompt 4 Bagian 5: extension-phases.spec.ts (previous session) only
// proved F6/F9 through Bedakan (2 of 6 steps) via the browser. The
// remaining steps — Ikuti (trace), and the checkpoint gate — reuse the
// exact same actions.ts code already proven correct for the core 46 in
// data-pipe-ikuti.spec.ts / data-pipe-uji.spec.ts; this proves that
// reuse actually holds for a non-core46 character track too, at the
// data-pipe level, the same way Bagian 4 does for F1/RETENTION.
//
// F6's own phaseCode is "F6", not "P6" — V21_PHASE_CODE_BY_STAGE only
// maps F1-F5 and BOSS; anything else (F6-F12, RETENTION) falls back to
// its own stage code (hiragana-mnemonics.ts).

test("F6 (dakuten): a trace attempt persists correctly for a non-core46 character", async ({ baseURL }) => {
  const userId = await testUserId();
  const f6StageId = await stageIdByCode("F6");
  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
  const testStartedAt = new Date();

  const result = await callServerAction(
    baseURL!,
    "recordHiraganaAttempt",
    {
      stageId: f6StageId,
      kanaId: 93, // が
      exerciseType: "trace",
      skill: "writing",
      writingScore: 90,
      writingMatched: true,
      phaseCode: "F6",
      curriculumVersion: "v2.1",
      hintLevel: 0,
      assisted: false,
      firstAttemptCorrect: true,
    },
    cookieHeader,
  );
  expect(result).toEqual({ ok: true });

  const attempts = await attemptsSince(userId, "v21_f6_trace", testStartedAt);
  expect(attempts).toHaveLength(1);
  expect(attempts[0].phaseCode).toBe("F6");
  expect(attempts[0].isCorrect).toBe(true);
});

test("F6 (dakuten) checkpoint: same >=80% gate as the core-46 stages", async ({ baseURL }) => {
  const userId = await testUserId();
  const f6StageId = await stageIdByCode("F6");
  await resetStageProgress(userId, f6StageId);
  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");

  const passing = await callServerAction(
    baseURL!,
    "completeHiraganaStage",
    { stageId: f6StageId, correct: 8, total: 10 },
    cookieHeader,
  );
  expect(passing).toMatchObject({ ok: true, passed: true, score: 80 });

  await resetStageProgress(userId, f6StageId);
  const failing = await callServerAction(
    baseURL!,
    "completeHiraganaStage",
    { stageId: f6StageId, correct: 7, total: 10 },
    cookieHeader,
  );
  expect(failing).toMatchObject({ ok: true, passed: false });
});
