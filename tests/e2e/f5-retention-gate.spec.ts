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

// Bagian 3: proves the HOLDING-BACK half of the delayed retention gate —
// F5 must stay closed until >=72h after F4 was first passed, and must
// open once that window has elapsed. Uses only the dedicated E2E test
// account's own synthetic progress rows (never a real user's), and the
// real page code path (app/(app)/.../page.tsx + pre-n5-01-query.ts), not
// a reimplementation.
//
// The SCORING half (>=85% first-attempt-unaided) is proven separately by
// the pure unit tests in tests/unit/gate-logic.spec.ts — driving it
// through this browser would need F5's checkpoint "writing" questions
// answered with simulated real handwriting, which is out of scope here
// for the same reason noted in f1-ikuti-flow.spec.ts's neighbor,
// phase-batches.spec.ts. This test does NOT claim the 72h gate has been
// proven to hold in the real world over real elapsed time — only that
// its logic, run against fabricated timestamps, holds and releases
// exactly when it should.

test("F5 stays closed right after F4 is first passed, and opens once 72h have elapsed", async ({ page, baseURL }) => {
  const userId = await testUserId();
  const f5StageId = await stageIdByCode("F5");
  await resetStageProgress(userId, f5StageId);
  await unlockThroughStage(userId, "F5"); // F1-F3 completed normally

  const f4StageId = await stageIdByCode("F4");
  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");

  // Edge 1: F4 just passed (0h elapsed) -> F5 must stay closed.
  await markStageCompletedAt(userId, f4StageId, new Date());
  await warmUpRoute(baseURL!, "/belajar/pre-n5/PRE-N5.01/F5", cookieHeader);
  await page.goto("/belajar/pre-n5/PRE-N5.01/F5");
  await expect(page.getByText("Belum waktunya kembali")).toBeVisible();
  await expect(page.getByText("Langkah 1/6 - Kenali")).not.toBeVisible();

  // Edge 2 (sengaja salah): F4 passed 71h59m ago -> still closed.
  await markStageCompletedAt(userId, f4StageId, new Date(Date.now() - (72 * 60 - 1) * 60 * 1000));
  await page.goto("/belajar/pre-n5/PRE-N5.01/F5");
  await expect(page.getByText("Belum waktunya kembali")).toBeVisible();

  // Edge 3: F4 passed 73h ago -> now open.
  await markStageCompletedAt(userId, f4StageId, new Date(Date.now() - 73 * 60 * 60 * 1000));
  await page.goto("/belajar/pre-n5/PRE-N5.01/F5");
  await expect(page.getByText("Langkah 1/6 - Kenali")).toBeVisible();
  await expect(page.getByText("Belum waktunya kembali")).not.toBeVisible();
});
