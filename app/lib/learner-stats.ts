import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getExistingKanaModuleCodes } from "./kana-modules-query";
import { getModuleLessons } from "./module-query";

export type LearnerStats = {
  completedLessons: number;
  totalAttempts: number;
};

// Deliberately only what's directly countable from real rows — no
// streak, no XP, no "mastery" threshold (none of those have an agreed
// definition anywhere in the schema yet). See the Moji reskin report
// for the full list of what got removed instead of invented.
export const getLearnerStats = cache(async (): Promise<LearnerStats> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { completedLessons: 0, totalAttempts: 0 };

  const [{ count: completedLessons }, { count: totalAttempts }] = await Promise.all([
    supabase
      .from("user_kana_lesson_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed"),
    supabase.from("user_kana_attempts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  return { completedLessons: completedLessons ?? 0, totalAttempts: totalAttempts ?? 0 };
});

export type ModuleSummary = {
  code: string;
  titleId: string;
  descriptionId: string | null;
  icon: string;
  statusLabel: string;
  percentComplete: number | null;
  locked: boolean;
  /** First not-completed lesson's routeId (`${phaseCode}-${lessonCode}`) in module order, or the last lesson if everything's done — null only if the module has zero seeded lessons. Lets callers jump straight into the lesson (Tugas 2: the lesson-list page is a direct-URL fallback now, not a mandatory stop). */
  resumeLessonRouteId: string | null;
};

// "Modulmu" list for /beranda — real per-module completion, derived
// from user_kana_lesson_progress via getModuleLessons (already fetches
// status per lesson), not a hardcoded percentage. Only modules that
// actually exist in kana_modules show up; nothing implies a module
// exists before it's been seeded.
// Decorative glyph only (not a metric) — a small known-module lookup
// beats slicing the first letter of the title, which would show a
// Latin letter instead of a kana glyph. Falls back gracefully for any
// future module code not listed here yet.
const MODULE_ICON: Record<string, string> = { M01: "日", M02: "あ", M03: "ア", M04: "数", M05: "話" };

export const getModuleSummaries = cache(async (): Promise<ModuleSummary[]> => {
  const existingCodes = await getExistingKanaModuleCodes();
  const unsorted = await Promise.all(
    [...existingCodes].map(async (code) => {
      const data = await getModuleLessons(code);
      if (!data) return null;
      const total = data.lessons.length;
      const completed = data.lessons.filter((l) => l.status === "completed").length;
      const percentComplete = total > 0 ? Math.round((completed / total) * 100) : null;
      const resumeLessonRouteId =
        data.lessons.find((l) => l.status !== "completed")?.routeId ?? data.lessons[data.lessons.length - 1]?.routeId ?? null;
      return {
        code: data.module.code,
        titleId: data.module.titleId,
        descriptionId: data.module.descriptionId,
        icon: MODULE_ICON[data.module.code] ?? data.module.titleId.slice(0, 1),
        percentComplete,
        resumeLessonRouteId,
      };
    }),
  );
  const modules = unsorted.filter((s): s is NonNullable<typeof s> => s != null).sort((a, b) => a.code.localeCompare(b.code));

  // Sequential unlock: the first module is always open; every later module
  // needs its immediate predecessor at 100% completion. No per-module
  // unlock_requirement rows exist yet (kana_modules.unlock_requirement is
  // still unused across the app) — order-based sequencing is the only
  // unlock rule defined so far, matching the mockup's "Selesaikan modul
  // sebelumnya" copy.
  let previousComplete = true;
  return modules.map((m): ModuleSummary => {
    const locked = !previousComplete;
    previousComplete = m.percentComplete === 100;
    const statusLabel = locked
      ? "Terkunci"
      : m.percentComplete == null
        ? "Belum ada pelajaran"
        : m.percentComplete >= 100
          ? "Selesai"
          : m.percentComplete > 0
            ? `Sedang berjalan — ${m.percentComplete}%`
            : "Belum dimulai";
    return { ...m, statusLabel, locked };
  });
});
