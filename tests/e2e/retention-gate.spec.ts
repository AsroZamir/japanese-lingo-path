import { expect, test } from "@playwright/test";
import {
  cookieHeaderFromStorageState,
  markStageCompletedAt,
  resetStageProgress,
  stageIdByCode,
  testUserId,
  unlockThroughStage,
  warmUpRoute,
} from "../support/db";

// Prompt 4 Bagian 2: the delayed retention gate moved from "before F5" to
// "after BOSS" (its actual V2.1 §4.1/§9.2 position) — the mechanism itself
// (evaluateDelayedGateEligibility, adapted from the original F5 version of
// this spec, kept unchanged, just re-pointed) didn't need to change, only
// where it's wired in. F5 itself is now an ordinary stage like F1-F4 (no
// gate, no first_completed_at dependency).
//
// RETENTION renders as a HiraganaQuiz gate (like BOSS), not the six-step
// HiraganaLearningLab F1-F5/extension stages use — so success here shows
// "Soal 1/46", not "Langkah 1/6 - Kenali".

test("RETENTION stays closed right after BOSS is first passed, and opens once 72h have elapsed", async ({ page, baseURL }) => {
  const userId = await testUserId();
  const retentionStageId = await stageIdByCode("RETENTION");
  await resetStageProgress(userId, retentionStageId);
  await unlockThroughStage(userId, "RETENTION"); // F1-F5, BOSS completed normally

  const bossStageId = await stageIdByCode("BOSS");
  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");

  // Edge 1: BOSS just passed (0h elapsed) -> RETENTION must stay closed.
  await markStageCompletedAt(userId, bossStageId, new Date());
  await warmUpRoute(baseURL!, "/belajar/pre-n5/PRE-N5.01/RETENTION", cookieHeader);
  await page.goto("/belajar/pre-n5/PRE-N5.01/RETENTION");
  await expect(page.getByText("Belum waktunya kembali")).toBeVisible();
  await expect(page.getByText("Soal 1/46")).not.toBeVisible();

  // Edge 2 (sengaja salah): BOSS passed 71h59m ago -> still closed.
  await markStageCompletedAt(userId, bossStageId, new Date(Date.now() - (72 * 60 - 1) * 60 * 1000));
  await page.goto("/belajar/pre-n5/PRE-N5.01/RETENTION");
  await expect(page.getByText("Belum waktunya kembali")).toBeVisible();

  // Edge 3: BOSS passed 73h ago -> now open, and samples the FULL 46-item
  // bank (not just newly-learned characters) via the same gate quiz BOSS
  // uses, per Bagian 2's "ambil sampel item dari seluruh bank 46 huruf".
  await markStageCompletedAt(userId, bossStageId, new Date(Date.now() - 73 * 60 * 60 * 1000));
  await page.goto("/belajar/pre-n5/PRE-N5.01/RETENTION");
  await expect(page.getByText("Soal 1/46")).toBeVisible();
  await expect(page.getByText("Belum waktunya kembali")).not.toBeVisible();
});

test("F5 no longer carries a delayed gate — opens as soon as F4 is passed, regardless of first_completed_at", async ({ page, baseURL }) => {
  const userId = await testUserId();
  const f5StageId = await stageIdByCode("F5");
  await resetStageProgress(userId, f5StageId);
  const f4StageId = await stageIdByCode("F4");
  await unlockThroughStage(userId, "F5"); // completes F1-F4 30 days back

  // F4 "just now" (0h elapsed) would have failed under the old F5 gate —
  // F5 must open immediately regardless, since the gate isn't here anymore.
  await markStageCompletedAt(userId, f4StageId, new Date());

  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
  await warmUpRoute(baseURL!, "/belajar/pre-n5/PRE-N5.01/F5", cookieHeader);
  await page.goto("/belajar/pre-n5/PRE-N5.01/F5");
  await expect(page.getByText("Langkah 1/6 - Kenali")).toBeVisible();
  await expect(page.getByText("Belum waktunya kembali")).not.toBeVisible();
});

test("F6 requires RETENTION passed, not just BOSS — Bagian 5's other half of the gate move", async ({ page, baseURL }) => {
  const userId = await testUserId();
  const f6StageId = await stageIdByCode("F6");
  await resetStageProgress(userId, f6StageId);
  const retentionStageId = await stageIdByCode("RETENTION");
  await resetStageProgress(userId, retentionStageId);

  // F1-F5 and BOSS completed, RETENTION deliberately left untouched —
  // under the old (pre-Prompt-4) rule this alone unlocked F6.
  await unlockThroughStage(userId, "RETENTION");

  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
  // F6 is deliberately locked right now (307 redirect) and will never
  // warm up to 200 in that state — warm up the module overview page
  // instead, just to make sure Turbopack has compiled *something* on
  // this route tree before the real navigation below.
  await warmUpRoute(baseURL!, "/belajar/pre-n5/PRE-N5.01", cookieHeader);
  await page.goto("/belajar/pre-n5/PRE-N5.01/F6");
  await expect(page.getByText("Langkah 1/6 - Kenali")).not.toBeVisible();

  // Now pass RETENTION too (well in the past, so its own 72h gate to
  // whatever comes after it doesn't interfere with this check) — F6 must
  // open immediately.
  await markStageCompletedAt(userId, retentionStageId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  await page.goto("/belajar/pre-n5/PRE-N5.01/F6");
  await expect(page.getByText("Langkah 1/6 - Kenali")).toBeVisible();
});
