// sessionStorage-backed stats for the "layar selesai" completion card —
// real wall-clock time and real accumulated accuracy for THIS run
// through a kana group (L01→L04), not hardcoded. Deliberately not a DB
// concept: user_kana_lesson_progress has no startedAt column, and
// reconstructing "this run" from timestamps after the fact is fragile
// (see the discussion this was scoped from). Cleared once read so a
// later re-run of the same group starts clean.

const MAX_REASONABLE_DURATION_MS = 60 * 60 * 1000; // 60 minutes — beyond this, a tab was probably left open for days, not actually being used.

export type GroupStats = { startedAt: number; correct: number; total: number };

function storageKey(moduleCode: string, groupCode: string): string {
  return `moji-group-stats:${moduleCode}:${groupCode}`;
}

function readRaw(moduleCode: string, groupCode: string): GroupStats | null {
  try {
    const raw = sessionStorage.getItem(storageKey(moduleCode, groupCode));
    if (!raw) return null;
    return JSON.parse(raw) as GroupStats;
  } catch {
    return null;
  }
}

function writeRaw(moduleCode: string, groupCode: string, stats: GroupStats): void {
  try {
    sessionStorage.setItem(storageKey(moduleCode, groupCode), JSON.stringify(stats));
  } catch {
    // sessionStorage unavailable (private mode, etc.) — stats just won't show. Not worth failing the lesson over.
  }
}

/** Call once, when the learner lands on the group's first lesson (or any lesson, if they entered mid-group). No-op if a start time is already recorded. */
export function ensureGroupStarted(moduleCode: string, groupCode: string): void {
  if (readRaw(moduleCode, groupCode)) return;
  writeRaw(moduleCode, groupCode, { startedAt: Date.now(), correct: 0, total: 0 });
}

/** Call when an exercise-bearing lesson (L03/L04) finishes its run — accumulates onto whatever's already stored for this group. */
export function recordLessonResult(moduleCode: string, groupCode: string, correct: number, total: number): void {
  const existing = readRaw(moduleCode, groupCode) ?? { startedAt: Date.now(), correct: 0, total: 0 };
  writeRaw(moduleCode, groupCode, { ...existing, correct: existing.correct + correct, total: existing.total + total });
}

export type GroupCompletionSummary = {
  /** null when the elapsed time exceeds MAX_REASONABLE_DURATION_MS (tab left open) — caller shows a placeholder, not a bogus number. */
  durationMinutes: number | null;
  correct: number;
  total: number;
  accuracyPercent: number | null;
};

/** Reads final stats and clears them — call exactly once, at the moment the group's last lesson completes. */
export function consumeGroupStats(moduleCode: string, groupCode: string): GroupCompletionSummary {
  const stats = readRaw(moduleCode, groupCode);
  try {
    sessionStorage.removeItem(storageKey(moduleCode, groupCode));
  } catch {
    // ignore
  }
  if (!stats) return { durationMinutes: null, correct: 0, total: 0, accuracyPercent: null };

  const elapsedMs = Date.now() - stats.startedAt;
  const durationMinutes = elapsedMs > MAX_REASONABLE_DURATION_MS || elapsedMs < 0 ? null : Math.max(1, Math.round(elapsedMs / 60000));
  const accuracyPercent = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;

  return { durationMinutes, correct: stats.correct, total: stats.total, accuracyPercent };
}
