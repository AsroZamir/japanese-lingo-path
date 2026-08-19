import { redirect } from "next/navigation";
import { LogoutButton } from "../_components/LogoutButton";
import { Avatar } from "../_components/AppShell";
import { getCurrentUser } from "@/app/lib/current-user";
import { getLearnerStats } from "@/app/lib/learner-stats";

export const dynamic = "force-dynamic";

const JOIN_DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const stats = await getLearnerStats();
  const joinedLabel = JOIN_DATE_FORMAT.format(new Date(user.joinedAt));

  return (
    <>
      <div className="profil-header">
        <div className="profil-header__avatar"><Avatar user={user} /></div>
        <div>
          <div className="profil-header__name">{user.name}</div>
          <div className="profil-header__joined">Bergabung sejak {joinedLabel}</div>
        </div>
      </div>

      <div className="profil-stats">
        <div className="profil-stat">
          <div className="profil-stat__value">{stats.completedLessons}</div>
          <div className="profil-stat__label">Pelajaran selesai</div>
        </div>
        <div className="profil-stat">
          <div className="profil-stat__value">{stats.totalAttempts}</div>
          <div className="profil-stat__label">Total latihan dijawab</div>
        </div>
      </div>

      <section className="profil-account">
        <span className="card-kicker dark">AKUN</span>
        <label>Nama<input defaultValue={user.name} disabled /></label>
        <label>Email<input defaultValue={user.email ?? "-"} disabled /></label>
        <label>Bahasa asli<input defaultValue={user.nativeLanguage} disabled /></label>
        <LogoutButton />
      </section>
    </>
  );
}
