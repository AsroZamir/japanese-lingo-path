import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/current-user";
import { getCurriculumV2ModuleSummaries } from "@/app/lib/curriculum-v2";
import { getReviewCounts } from "@/app/lib/review-query";
import { DashboardView } from "../_components/DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [moduleSummaries, reviewCounts] = await Promise.all([
    getCurriculumV2ModuleSummaries(),
    getReviewCounts(),
  ]);

  return (
    <DashboardView
      userName={user.name}
      continueLearning={null}
      moduleSummaries={moduleSummaries}
      reviewCounts={reviewCounts}
    />
  );
}
