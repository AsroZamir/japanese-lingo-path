import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/current-user";
import { DashboardView } from "../_components/DashboardView";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <DashboardView userName={user.name} />;
}
