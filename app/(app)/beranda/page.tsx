import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/current-user";
import { getContinueLearningTarget } from "@/app/lib/continue-learning";
import { getModuleSummaries } from "@/app/lib/learner-stats";
import { DashboardView } from "../_components/DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [continueLearning, moduleSummaries] = await Promise.all([
    getContinueLearningTarget(),
    getModuleSummaries(),
  ]);

  return <DashboardView userName={user.name} continueLearning={continueLearning} moduleSummaries={moduleSummaries} />;
}
