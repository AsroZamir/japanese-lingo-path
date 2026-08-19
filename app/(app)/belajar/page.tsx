import { getModuleSummaries } from "@/app/lib/learner-stats";
import { LearnPageClient } from "./LearnPageClient";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const moduleSummaries = await getModuleSummaries();
  // moduleCode -> first lesson to resume into (Tugas 2: "Buka modul"
  // jumps straight into the lesson, skipping the lesson-list page).
  const resumeByModuleCode = Object.fromEntries(
    moduleSummaries.filter((s) => s.resumeLessonRouteId != null).map((s) => [s.code, s.resumeLessonRouteId as string]),
  );
  return <LearnPageClient resumeByModuleCode={resumeByModuleCode} />;
}
