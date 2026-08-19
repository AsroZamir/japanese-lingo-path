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
  icon: string;
  statusLabel: string;
  percentComplete: number | null;
  locked: boolean;
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
const MODULE_ICON: Record<string, string> = { M01: "日", M02: "あ" };

export const getModuleSummaries = cache(async (): Promise<ModuleSummary[]> => {
  const existingCodes = await getExistingKanaModuleCodes();
  const summaries = await Promise.all(
    [...existingCodes].map(async (code): Promise<ModuleSummary | null> => {
      const data = await getModuleLessons(code);
      if (!data) return null;
      const total = data.lessons.length;
      const completed = data.lessons.filter((l) => l.status === "completed").length;
      const percentComplete = total > 0 ? Math.round((completed / total) * 100) : null;
      const statusLabel =
        percentComplete == null
          ? "Belum ada pelajaran"
          : percentComplete >= 100
            ? "Selesai"
            : percentComplete > 0
              ? `Sedang berjalan — ${percentComplete}%`
              : "Belum dimulai";
      return {
        code: data.module.code,
        titleId: data.module.titleId,
        icon: MODULE_ICON[data.module.code] ?? data.module.titleId.slice(0, 1),
        statusLabel,
        percentComplete,
        locked: false,
      };
    }),
  );
  return summaries.filter((s): s is ModuleSummary => s != null).sort((a, b) => a.code.localeCompare(b.code));
});
