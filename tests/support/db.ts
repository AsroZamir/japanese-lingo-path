import { readFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import { HIRAGANA_LAB_VERSION } from "@/app/lib/hiragana-mnemonics";

loadEnv({ path: ".env.local" });

// Script-only DB access (service role via DATABASE_URL), same pattern as
// db/seed-client.ts and the other scripts/*.ts — never imported from app/.
// Used here only to set up/verify state for the dedicated E2E test account
// (E2E_TEST_EMAIL), never to read or write a real user's rows.
export const sql = postgres(requireEnv("DATABASE_URL"), { ssl: "require" });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(name + " tidak ditemukan di .env.local.");
  return value;
}

export async function testUserId(): Promise<string> {
  const email = requireEnv("E2E_TEST_EMAIL");
  const [row] = await sql<{ id: string }[]>`
    select id from auth.users where email = ${email}
  `;
  if (!row) throw new Error("Test user " + email + " tidak ditemukan di auth.users.");
  return row.id;
}

export async function stageIdByCode(code: string): Promise<number> {
  const [row] = await sql<{ id: number }[]>`
    select s.id from learning_stages s
    join learning_modules m on m.id = s.module_id
    where m.code = 'PRE-N5.01' and s.code = ${code}
  `;
  if (!row) throw new Error("Stage " + code + " tidak ditemukan.");
  return row.id;
}

// Clears this test account's progress for one PRE-N5.01 stage so a spec
// can assume it starts at the first item of Kelompok 1, every run.
export async function resetStageProgress(userId: string, stageId: number): Promise<void> {
  await sql`
    delete from user_learning_stage_progress
    where user_id = ${userId} and stage_id = ${stageId}
  `;
}

// Marks one stage "completed" for the test account so a spec can jump
// straight to testing a later stage (F3, BOSS, ...) without actually
// playing through every earlier one via the UI first — the same unlock
// check the real page uses (labVersion + status==='completed'). Also
// sets first_completed_at, so the 72h delayed-gate window (Bagian 3) can
// be tested at both edges (just now / 73h ago) without waiting 72 real
// hours, and so callers who don't care about that gate can just pass a
// comfortably old timestamp (see unlockThroughStage below).
export async function markStageCompletedAt(
  userId: string,
  stageId: number,
  firstCompletedAt: Date,
): Promise<void> {
  await sql`
    insert into user_learning_stage_progress (user_id, stage_id, status, score, attempts, state, started_at, completed_at, first_completed_at, updated_at)
    values (${userId}, ${stageId}, 'completed', 100, 1, ${sql.json({ labVersion: HIRAGANA_LAB_VERSION })}, now(), now(), ${firstCompletedAt}, now())
    on conflict (user_id, stage_id) do update set
      status = 'completed', score = 100, state = ${sql.json({ labVersion: HIRAGANA_LAB_VERSION })},
      first_completed_at = ${firstCompletedAt}, updated_at = now()
  `;
}

// Marks every prerequisite stage completed well outside any 72h delayed
// gate (30 days back), so specs about batch content/other stages aren't
// coupled to Bagian 3's F5 gate — that gate gets its own dedicated spec
// (f5-retention-gate.spec.ts) that deliberately controls this timestamp.
export async function unlockThroughStage(userId: string, targetCode: string): Promise<void> {
  const order = ["F1", "F2", "F3", "F4", "F5", "BOSS"];
  const targetIndex = order.indexOf(targetCode);
  const wellInThePast = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  for (const code of order.slice(0, targetIndex)) {
    const id = await stageIdByCode(code);
    await markStageCompletedAt(userId, id, wellInThePast);
  }
}

// Turbopack dev mode compiles each dynamic route lazily on first hit —
// that first request can race the compile and come back 404 even with a
// valid session (confirmed by hand: same URL, same cookie, first hit 404,
// next hit 200, no app code involved). Poll until the route is actually
// warm before a spec starts asserting against it, instead of assuming
// page.goto's first navigation is reliable in dev.
export async function warmUpRoute(baseURL: string, path: string, cookieHeader: string): Promise<void> {
  const deadline = Date.now() + 20_000;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    const response = await fetch(baseURL + path, {
      headers: { Cookie: cookieHeader },
      redirect: "manual",
    });
    lastStatus = response.status;
    if (response.status === 200) return;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("Route " + path + " never warmed up (last status " + lastStatus + ").");
}

export function cookieHeaderFromStorageState(storageStatePath: string): string {
  const state = JSON.parse(readFileSync(storageStatePath, "utf8"));
  return state.cookies.map((c: { name: string; value: string }) => c.name + "=" + c.value).join("; ");
}

// Filters by "since a marker timestamp taken right before the test's
// actions" rather than "most recent N" — a spec re-run (or a prior debug
// run) leaves old rows behind since this only clears stage *progress*,
// not attempt history, and "most recent N" would silently mix them in.
export async function attemptsSince(
  userId: string,
  exerciseTypeLike: string,
  since: Date,
): Promise<{ exerciseType: string; phaseCode: string | null; curriculumVersion: string | null; createdAt: Date }[]> {
  return sql<{ exerciseType: string; phaseCode: string | null; curriculumVersion: string | null; createdAt: Date }[]>`
    select exercise_type as "exerciseType", phase_code as "phaseCode",
      curriculum_version as "curriculumVersion", created_at as "createdAt"
    from user_kana_attempts
    where user_id = ${userId} and exercise_type like ${exerciseTypeLike} and created_at >= ${since}
    order by created_at asc
  `;
}
