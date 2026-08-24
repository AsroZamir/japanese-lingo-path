import { expect, test } from "@playwright/test";
import {
  cookieHeaderFromStorageState,
  resetStageProgress,
  stageIdByCode,
  testUserId,
  unlockThroughStage,
  warmUpRoute,
} from "../support/db";

// Bagian 5: proves the "reuse the six-step engine, just point it at a
// different character track" claim actually holds, not just that the
// data exists. Opens F6 (dakuten/handakuten track) and F9 (youon track)
// directly and asserts each shows its OWN characters via the same
// HiraganaLearningLab used for the core 46 — not a reimplementation.

const CASES: { code: string; expectedFirstChar: string; expectedTitle: string }[] = [
  { code: "F6", expectedFirstChar: "が", expectedTitle: "Dakuten: Ka + Sa" },
  { code: "F9", expectedFirstChar: "きゃ", expectedTitle: "Youon: Ka + Ga + Sa" },
];

for (const { code, expectedFirstChar, expectedTitle } of CASES) {
  test(code + ": renders its own extension character track via the reused six-step engine", async ({ page, baseURL }) => {
    const userId = await testUserId();
    const stageId = await stageIdByCode(code);
    await unlockThroughStage(userId, code);
    await resetStageProgress(userId, stageId);

    const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
    await warmUpRoute(baseURL!, "/belajar/pre-n5/PRE-N5.01/" + code, cookieHeader);

    await page.goto("/belajar/pre-n5/PRE-N5.01/" + code);
    await expect(page.getByText(expectedTitle)).toBeVisible();
    await expect(page.getByText("Langkah 1/6 - Kenali")).toBeVisible();
    await expect(page.getByText("Data batch Hiragana belum tersedia")).not.toBeVisible();

    // The anchor phase's big kana glyph is the first character of this
    // stage's batch — proves the character-track selection actually
    // reached the query layer, not just that the page didn't error.
    await expect(page.locator(".hiragana-lab__kana")).toHaveText(expectedFirstChar);

    // Walk into Bedakan to prove the discriminate step (which sources
    // distractors from kana_confusion_pairs + the stage's own pool) also
    // works for a non-core46 track, not just that Kenali renders. Both F6
    // and F9's first lesson have 5 items, so anchor needs 5 clicks, same
    // as f1-ikuti-flow.spec.ts's core46 walkthrough.
    await expect(page.getByText("Huruf 1/5")).toBeVisible();
    for (let i = 0; i < 5; i += 1) {
      await page.getByRole("button", { name: "Lanjut" }).click();
    }
    await expect(page.getByText("Langkah 2/6 - Bedakan")).toBeVisible();
    await expect(page.getByRole("button", { name: expectedFirstChar, exact: true })).toBeVisible();

    await page.screenshot({ path: "test-results/extension-" + code + ".png", fullPage: true });
  });
}
