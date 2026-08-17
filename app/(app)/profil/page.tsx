import { redirect } from "next/navigation";
import { PageHeader } from "../_components/PageHeader";
import { LogoutButton } from "../_components/LogoutButton";
import { Avatar } from "../_components/AppShell";
import { getCurrentUser } from "@/app/lib/current-user";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader eyebrow="AKUN ANDA" title="Profil" copy="Info akun yang masuk dan opsi keluar." />
      <section className="settings-form">
        <span className="card-kicker dark">AKUN</span>
        <div className="large-avatar"><Avatar user={user} /></div>
        <label>Nama<input defaultValue={user.name} disabled /></label>
        <label>Email<input defaultValue={user.email ?? "-"} disabled /></label>
        <label>Bahasa asli<input defaultValue={user.nativeLanguage} disabled /></label>
        <LogoutButton />
      </section>
    </>
  );
}
