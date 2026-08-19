import { getModuleSummaries } from "@/app/lib/learner-stats";
import { LearnPageClient } from "./LearnPageClient";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const moduleSummaries = await getModuleSummaries();
  // moduleCode -> first lesson to resume into (Tugas 2: "Buka modul"
  // jumps straight into the lesson, skipping the lesson-list page).
  const resumeByModuleCode = Object.fromEntries(
    moduleSummaries.filter((s) => s.resumeLessonCode != null).map((s) => [s.code, s.resumeLessonCode as string]),
  );
  return <LearnPageClient resumeByModuleCode={resumeByModuleCode} />;
}
