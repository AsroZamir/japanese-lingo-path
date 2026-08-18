import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/current-user";
import { getContinueLearningTarget } from "@/app/lib/continue-learning";
import { DashboardView } from "../_components/DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const continueLearning = await getContinueLearningTarget();

  return <DashboardView userName={user.name} continueLearning={continueLearning} />;
}
