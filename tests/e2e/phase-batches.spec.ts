import { expect, test } from "@playwright/test";
import {
  cookieHeaderFromStorageState,
  resetStageProgress,
  stageIdByCode,
  testUserId,
  unlockThroughStage,
  warmUpRoute,
} from "../support/db";

// Bagian 2 point 3: buka F2, F3, F4, F5, BOSS langsung lewat URL, screenshot
// masing-masing, konfirmasi data batch yang tampil benar (bukan cuma
// "halaman tidak error"). Expected characters computed independently from
// the HIRAGANA_BASIC_CHARACTERS order (index slices), not copied from the
// query code, so this actually catches a wrong slice.

const CASES: { code: string; kelompok1: string; kelompok2: string }[] = [
  { code: "F2", kelompok1: "さ · し · す · せ · そ", kelompok2: "た · ち · つ · て · と" },
  { code: "F3", kelompok1: "な · に · ぬ · ね · の", kelompok2: "は · ひ · ふ · へ · ほ" },
  { code: "F4", kelompok1: "ま · み · む · め · も", kelompok2: "や · ゆ · よ · ら · り" },
  { code: "F5", kelompok1: "る · れ · ろ", kelompok2: "わ · を · ん" },
];

for (const { code, kelompok1, kelompok2 } of CASES) {
  test(code + ": shows its own batch characters, not a leftover from another phase", async ({ page, baseURL }) => {
    const userId = await testUserId();
    const stageId = await stageIdByCode(code);
    await unlockThroughStage(userId, code);
    await resetStageProgress(userId, stageId);

    const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
    await warmUpRoute(baseURL!, "/belajar/pre-n5/PRE-N5.01/" + code, cookieHeader);

    await page.goto("/belajar/pre-n5/PRE-N5.01/" + code);
    await expect(page.getByText("Langkah 1/6 - Kenali")).toBeVisible();
    await expect(page.getByText("Data batch Hiragana belum tersedia")).not.toBeVisible();

    await expect(page.getByText(kelompok1, { exact: true })).toBeVisible();
    await expect(page.getByText(kelompok2, { exact: true })).toBeVisible();

    await page.screenshot({ path: "test-results/batch-" + code + ".png", fullPage: true });
  });
}

test("BOSS: renders the 46-character gate quiz, not a batch lesson", async ({ page, baseURL }) => {
  const userId = await testUserId();
  const stageId = await stageIdByCode("BOSS");
  await unlockThroughStage(userId, "BOSS");
  await resetStageProgress(userId, stageId);

  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
  await warmUpRoute(baseURL!, "/belajar/pre-n5/PRE-N5.01/BOSS", cookieHeader);

  await page.goto("/belajar/pre-n5/PRE-N5.01/BOSS");
  await expect(page.getByText("Soal 1/46")).toBeVisible();
  await expect(page.getByText("Data batch Hiragana belum tersedia")).not.toBeVisible();

  await page.screenshot({ path: "test-results/batch-BOSS.png", fullPage: true });
});

// No sql.end() here on purpose — see f1-ikuti-flow.spec.ts's comment;
// tests/support/db.ts's `sql` is a shared singleton across spec files.
