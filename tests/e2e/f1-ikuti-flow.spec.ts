import { expect, test } from "@playwright/test";
import {
  attemptsSince,
  cookieHeaderFromStorageState,
  resetStageProgress,
  stageIdByCode,
  testUserId,
  warmUpRoute,
} from "../support/db";

// Bagian 2 point 1: buka F1, lewati satu huruf penuh sampai langkah Ikuti,
// konfirmasi halaman tidak error dan attempt tersimpan ke database.
// Uses the dedicated E2E test account (E2E_TEST_EMAIL) only — its
// PRE-N5.01/F1 progress is reset before the run so the test is repeatable,
// never touching a real user's row.
//
// recordHiraganaAttempt (app/(app)/.../HiraganaLearningLab.tsx) is
// fire-and-forget by design, same as everywhere else in this codebase —
// the UI advances immediately without awaiting it. Confirmed by hand
// (temporary client + server logging) that the click handler really
// does fire it 5 times with the right item each time, but in this dev
// server each request can take over a second to actually land, so the
// UI (and an earlier version of this test) races ahead of it. The loop
// below explicitly waits on each POST's response instead of guessing a
// fixed delay.

const KELOMPOK_1 = ["あ", "い", "う", "え", "お"];

test("F1: anchor + discriminate for Kelompok 1 reaches Ikuti without error, attempts persist", async ({ page, baseURL }) => {
  const userId = await testUserId();
  const f1StageId = await stageIdByCode("F1");
  await resetStageProgress(userId, f1StageId);

  const cookieHeader = cookieHeaderFromStorageState(".auth/storageState.json");
  await warmUpRoute(baseURL!, "/belajar/pre-n5/PRE-N5.01/F1", cookieHeader);

  const testStartedAt = new Date();

  page.on("pageerror", (err) => { throw err; });
  page.on("response", (res) => {
    if (res.url().includes("/belajar/pre-n5") && res.status() >= 400) {
      throw new Error("Bad response " + res.status() + " from " + res.url());
    }
  });

  await page.goto("/belajar/pre-n5/PRE-N5.01/F1");
  await expect(page.getByText("Langkah 1/6 - Kenali")).toBeVisible();

  // Walk the 5 anchor screens (あ..お).
  for (let i = 0; i < KELOMPOK_1.length; i += 1) {
    await page.getByRole("button", { name: "Lanjut" }).click();
  }

  await expect(page.getByText("Langkah 2/6 - Bedakan")).toBeVisible();

  // Walk the 5 discriminate screens, always selecting the correct kana.
  // Waits on "Huruf N/5" before each interaction so the loop can't race
  // ahead of the item the app actually thinks is current, AND waits for
  // the fire-and-forget recordHiraganaAttempt POST to actually land
  // before continuing. That call (app/(app)/.../HiraganaLearningLab.tsx —
  // pre-existing pattern across the whole codebase, not introduced by
  // this rebuild) is never awaited by the UI on purpose, so the app
  // itself races ahead of it; confirmed by hand it can take over a
  // second per request in dev, and a flat timeout after the loop wasn't
  // long enough to reliably catch all 5 — waiting on the actual response
  // is the only precise way to know a given attempt has landed.
  for (let i = 0; i < KELOMPOK_1.length; i += 1) {
    const character = KELOMPOK_1[i];
    await expect(page.getByText("Huruf " + (i + 1) + "/5")).toBeVisible();
    await page.getByRole("button", { name: character, exact: true }).click();
    await page.getByRole("button", { name: "Periksa" }).click();
    await expect(page.locator(".hiragana-lab__discriminate-choices button.is-correct")).toBeVisible();
    const attemptPosted = page.waitForResponse(
      (res) => res.url().endsWith("/belajar/pre-n5/PRE-N5.01/F1") && res.request().method() === "POST",
      { timeout: 10_000 },
    );
    await page.getByRole("button", { name: "Lanjut" }).click();
    await attemptPosted;
  }

  // Discriminate for all 5 items done -> should land on guided/Ikuti.
  await expect(page.getByText("Langkah 3/6 - Ikuti")).toBeVisible();
  await expect(page.getByText("Bangun gerakan tangan")).toBeVisible();
  await expect(page.getByText("Data batch Hiragana belum tersedia")).not.toBeVisible();

  const attempts = await attemptsSince(userId, "v21_p1_discriminate", testStartedAt);
  expect(attempts).toHaveLength(5);
  for (const attempt of attempts) {
    expect(attempt.phaseCode).toBe("P1");
    expect(attempt.curriculumVersion).toBe("v2.1");
  }
});

// No sql.end() here on purpose — tests/support/db.ts's `sql` is a shared
// singleton across every spec file; ending it here would close the pool
// out from under whichever spec file runs next. The process exiting
// after the run closes it naturally.
