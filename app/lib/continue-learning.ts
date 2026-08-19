import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ContinueLearningTarget = {
  moduleCode: string;
  moduleTitleId: string;
  /** `${phaseCode}-${lessonCode}` — see module-query.ts's ModuleLessonSummary.routeId for why the bare lesson code alone isn't enough to route to. */
  lessonRouteId: string;
  lessonTitleId: string;
  phaseTitleId: string;
  status: "not_started" | "in_progress" | "completed";
};

// The single kana lesson /beranda's "continue your path" card should
// point to: the first lesson (in module → phase → lesson order) that
// isn't completed yet, across every seeded module. Falls back to the
// very last lesson if everything is completed, and to null if nothing
// is seeded at all — callers fall back to the old static P0 unit in
// that case.
export const getContinueLearningTarget = cache(async (): Promise<ContinueLearningTarget | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: moduleRows } = await supabase
    .from("kana_modules")
    .select("id, code, title_id, order_index")
    .order("order_index");
  if (!moduleRows?.length) return null;
  const moduleById = new Map(moduleRows.map((m) => [m.id, m]));

  const { data: phaseRows } = await supabase
    .from("kana_phases")
    .select("id, code, module_id, title_id, order_index")
    .order("order_index");
  const phaseById = new Map((phaseRows ?? []).map((p) => [p.id, p]));

  const { data: lessonRows } = await supabase
    .from("kana_lessons")
    .select("id, code, title_id, phase_id, order_index");
  if (!lessonRows?.length) return null;

  const { data: progressRows } = await supabase
    .from("user_kana_lesson_progress")
    .select("lesson_id, status")
    .eq("user_id", user.id);
  const statusByLessonId = new Map((progressRows ?? []).map((p) => [p.lesson_id, p.status]));

  const ordered = lessonRows
    .map((lesson) => {
      const phase = phaseById.get(lesson.phase_id);
      const module_ = phase ? moduleById.get(phase.module_id) : null;
      if (!phase || !module_) return null;
      return { lesson, phase, module: module_ };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort(
      (a, b) =>
        a.module.order_index - b.module.order_index ||
        a.phase.order_index - b.phase.order_index ||
        a.lesson.order_index - b.lesson.order_index,
    );
  if (!ordered.length) return null;

  const target = ordered.find(({ lesson }) => statusByLessonId.get(lesson.id) !== "completed") ?? ordered[ordered.length - 1];

  return {
    moduleCode: target.module.code,
    moduleTitleId: target.module.title_id,
    lessonRouteId: `${target.phase.code}-${target.lesson.code}`,
    lessonTitleId: target.lesson.title_id,
    phaseTitleId: target.phase.title_id,
    status: (statusByLessonId.get(target.lesson.id) as ContinueLearningTarget["status"]) ?? "not_started",
  };
});
