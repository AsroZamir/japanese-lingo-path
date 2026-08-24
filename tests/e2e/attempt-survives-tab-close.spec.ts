import { expect, test } from "@playwright/test";
import {
  attemptsSince,
  cookieHeaderFromStorageState,
  resetStageProgress,
  stageIdByCode,
  testUserId,
  warmUpRoute,
} from "../support/db";

// Prompt 4 Bagian 3: proves the fire-and-forget fix actually protects data,
// not just that recordAttempt is awaited in the source. Simulates "the
// user closes the tab right after clicking submit" — closes the page
// immediately after the click, with no wait for the UI to settle — then
// confirms via a direct DB query (a separate connection, not the closed
// page) that the attempt still landed.
//
// This works because awaiting the save before advancing state also means
// the underlying fetch is dispatched (and typically already in flight,
// sometimes already received by the Next.js server) at the moment of the
// click, rather than being one of several requests silently still queued
// behind the browser's per-origin connection limit when the tab closes —
// which is what the old fire-and-forget version actually lost: not
// requests that were sent but never answered, but requests that had never
// left the browser at all before teardown killed them.

test("closing the tab immediately after submitting an answer still saves the attempt", async ({ browser, baseURL }) => {
  const userId = await testUserId();
  const f1StageId = await stageIdByCode("F1");
  await resetStageProgress(userId, f1StageId);

  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
  await warmUpRoute(baseURL!, "/belajar/pre-n5/PRE-N5.01/F1", cookieHeader);

  const context = await browser.newContext({ storageState: ".auth/storageState.json" });
  const page = await context.newPage();
  const testStartedAt = new Date();

  await page.goto("/belajar/pre-n5/PRE-N5.01/F1");
  await expect(page.getByText("Langkah 1/6 - Kenali")).toBeVisible();
  await page.getByRole("button", { name: "Lanjut" }).click(); // あ -> い anchor

  await expect(page.getByText("Huruf 2/5")).toBeVisible();
  // Back up to あ's discriminate item isn't needed — submitting on the
  // very next anchor screen (い) exercises the same recordAttempt path.
  // Walk anchor to completion, then submit exactly one discriminate item.
  for (let i = 0; i < 4; i += 1) {
    await page.getByRole("button", { name: "Lanjut" }).click();
  }
  await expect(page.getByText("Langkah 2/6 - Bedakan")).toBeVisible();

  await page.getByRole("button", { name: "あ", exact: true }).click();
  await page.getByRole("button", { name: "Periksa" }).click();
  await expect(page.locator(".hiragana-lab__discriminate-choices button.is-correct")).toBeVisible();

  // The click that submits the attempt — close the page immediately after,
  // without waiting for the UI's own "saved" confirmation.
  await page.getByRole("button", { name: "Lanjut" }).click();
  await context.close();

  // Give the server-side handler a moment to finish (this is about the
  // Next.js Server Action completing server-side, not about the closed
  // page — nothing here talks to the closed page again).
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const attempts = await attemptsSince(userId, "v21_p1_discriminate", testStartedAt);
  expect(attempts.length).toBeGreaterThanOrEqual(1);
  expect(attempts[0].phaseCode).toBe("P1");
});
