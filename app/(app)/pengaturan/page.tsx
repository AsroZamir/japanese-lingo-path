import { redirect } from "next/navigation";
import { PageHeader } from "../_components/PageHeader";
import { SettingsForm } from "../_components/SettingsForm";
import { getCurrentUser } from "@/app/lib/current-user";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader eyebrow="YOUR ACCOUNT" title="Settings" copy="Shape Japanese Lingo Path around the way you learn." />
      <SettingsForm user={user} />
    </>
  );
}
