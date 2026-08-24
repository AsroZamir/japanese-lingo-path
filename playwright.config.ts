import { defineConfig } from "@playwright/test";

// E2E auth: run `npx tsx scripts/auth-setup.ts` first to populate
// .auth/storageState.json (Supabase session cookie, no Google OAuth
// involved). Requires E2E_TEST_EMAIL/E2E_TEST_PASSWORD in .env.local —
// a dedicated test account, never one of the real users.
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: false,
  // Serial to keep the dev server's per-route Turbopack compiles from
  // competing across spec files — reduces flakiness, though it wasn't
  // the actual cause of the recordHiraganaAttempt races (see
  // tests/e2e/f1-ikuti-flow.spec.ts — that needed an explicit
  // waitForResponse, not just serialization).
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_APP_URL ?? "http://localhost:3000",
    storageState: ".auth/storageState.json",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
