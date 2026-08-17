import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/current-user";
import { AppShell } from "./_components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <AppShell user={user}>{children}</AppShell>;
}
