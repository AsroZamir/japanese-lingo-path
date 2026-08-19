import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type LessonProgressStatus = "not_started" | "in_progress" | "completed";

export type ModuleLessonSummary = {
  id: number;
  code: string;
  /** `${phaseCode}-${code}` — the URL segment for this lesson. `code` alone (e.g. "L01") repeats across every phase in a module (kana_lessons_phase_code_key is scoped per-phase, not per-module), so routing must carry the phase too. */
  routeId: string;
  titleId: string;
  lessonType: string;
  phaseCode: string;
  phaseTitleId: string;
  groupCode: string | null;
  status: LessonProgressStatus;
};

export type ModuleWithLessons = {
  module: { id: number; code: string; titleId: string };
  lessons: ModuleLessonSummary[];
};

// Lessons ordered across every phase in the module (phase order, then
// lesson order within it) — only rows that actually exist in
// kana_lessons show up here, so an un-seeded lesson is simply absent
// rather than needing to be filtered out explicitly. Reused for both
// the /belajar/kana/[moduleCode] list and "lesson berikutnya" nav.
export const getModuleLessons = cache(async (moduleCode: string): Promise<ModuleWithLessons | null> => {
  const supabase = await createClient();

  const { data: moduleRow } = await supabase
    .from("kana_modules")
    .select("id, code, title_id")
    .eq("code", moduleCode)
    .maybeSingle();
  if (!moduleRow) return null;

  const { data: phaseRows } = await supabase
    .from("kana_phases")
    .select("id, code, title_id, order_index")
    .eq("module_id", moduleRow.id)
    .order("order_index");
  const phaseById = new Map((phaseRows ?? []).map((p) => [p.id, p]));
  const phaseIds = (phaseRows ?? []).map((p) => p.id);

  const { data: lessonRows } = phaseIds.length
    ? await supabase
        .from("kana_lessons")
        .select("id, code, title_id, lesson_type, order_index, group_code, phase_id")
        .in("phase_id", phaseIds)
    : { data: [] };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lessonIds = (lessonRows ?? []).map((l) => l.id);
  const { data: progressRows } =
    user && lessonIds.length
      ? await supabase
          .from("user_kana_lesson_progress")
          .select("lesson_id, status")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds)
      : { data: [] };
  const statusByLessonId = new Map(
    (progressRows ?? []).map((p) => [p.lesson_id, p.status as LessonProgressStatus]),
  );

  const withOrder = (lessonRows ?? []).map((l) => {
    const phase = phaseById.get(l.phase_id)!;
    return {
      summary: {
        id: l.id,
        code: l.code,
        routeId: `${phase.code}-${l.code}`,
        titleId: l.title_id,
        lessonType: l.lesson_type,
        phaseCode: phase.code,
        phaseTitleId: phase.title_id,
        groupCode: l.group_code,
        status: statusByLessonId.get(l.id) ?? ("not_started" as LessonProgressStatus),
      } satisfies ModuleLessonSummary,
      phaseOrder: phase.order_index,
      lessonOrder: l.order_index,
    };
  });
  withOrder.sort((a, b) => a.phaseOrder - b.phaseOrder || a.lessonOrder - b.lessonOrder);
  const lessons: ModuleLessonSummary[] = withOrder.map((x) => x.summary);

  return { module: { id: moduleRow.id, code: moduleRow.code, titleId: moduleRow.title_id }, lessons };
});
