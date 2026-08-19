import Link from "next/link";
import { getModuleSummaries } from "@/app/lib/learner-stats";
import { PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const moduleSummaries = await getModuleSummaries();

  return (
    <>
      <PageHeader
        eyebrow="DAFTAR MODUL"
        title="Semua Modul"
        copy="Pilih modul untuk mulai belajar. Selesaikan satu untuk membuka berikutnya."
      />
      <div className="modul-grid">
        {moduleSummaries.map((m, i) => {
          const href = !m.locked && m.resumeLessonRouteId ? `/belajar/kana/${m.code}/${m.resumeLessonRouteId}` : null;
          const content = (
            <>
              <div className="modul-card__top">
                <div className={`modul-card__icon ${m.locked ? "" : "is-unlocked"}`}>{m.icon}</div>
                <div className="modul-card__tag">Pemula</div>
              </div>
              <div className="modul-card__title">{m.titleId}</div>
              <div className="modul-card__desc">{m.descriptionId}</div>
              {m.locked ? (
                <div className="modul-card__locked">🔒 Selesaikan modul sebelumnya</div>
              ) : (
                <div className="modul-card__progress">
                  <div className="modul-card__progress-track">
                    <div className="modul-card__progress-fill" style={{ width: `${m.percentComplete ?? 0}%` }} />
                  </div>
                  <div className="modul-card__progress-label">{m.percentComplete != null ? `${m.percentComplete}%` : ""}</div>
                </div>
              )}
            </>
          );
          const style = { animationDelay: `${i * 60}ms` };
          return href ? (
            <Link href={href} className="modul-card" style={style} key={m.code}>
              {content}
            </Link>
          ) : (
            <div className="modul-card modul-card--locked" style={style} key={m.code} aria-disabled="true">
              {content}
            </div>
          );
        })}
      </div>
    </>
  );
}
