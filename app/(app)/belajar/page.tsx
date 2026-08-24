import Link from "next/link";
import { getCurriculumV2ModuleSummaries } from "@/app/lib/curriculum-v2";
import { isDevUnlockAllActive } from "@/app/lib/dev-mode";
import { PageHeader } from "../_components/PageHeader";
import { DevUnlockBanner } from "../_components/DevUnlockBanner";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const moduleSummaries = await getCurriculumV2ModuleSummaries();

  return (
    <>
      {isDevUnlockAllActive() && <DevUnlockBanner />}
      <PageHeader
        eyebrow="KURIKULUM V2 · PRE-N5"
        title="Fondasi Active Mastery"
        copy="Sebelas modul baru dari script mastery sampai Boss Battle. Setiap modul dibangun melalui Discover, Trace, Recall, Blitz, SRS, dan gerbang penguasaan."
      />
      <div className="modul-grid">
        {moduleSummaries.map((module, index) => {
          const style = { animationDelay: `${index * 60}ms` };
          const canOpen = !module.locked && module.contentStatus === "ready";
          const card = (
            <article
              className={`modul-card ${module.locked ? "modul-card--locked" : ""}`}
              style={style}
              key={module.code}
            >
              <div className="modul-card__top">
                <div className={`modul-card__icon ${module.locked ? "" : "is-unlocked"}`}>
                  {module.icon}
                </div>
                <div className="modul-card__tag">
                  {module.moduleType} · Pre-N5
                </div>
              </div>
              <div className="modul-card__code">{module.code}</div>
              <div className="modul-card__title">{module.title}</div>
              <div className="modul-card__desc">{module.description}</div>
              <div className="modul-card__meta">
                <span>{module.stageCount} tahap</span>
                <span>{module.estimatedHours}</span>
                <span>{module.methodName}</span>
              </div>
              {module.locked ? (
                <div className="modul-card__locked">🔒 {module.unlockNote}</div>
              ) : (
                <div className="modul-card__progress">
                  <div className="modul-card__progress-track">
                    <div
                      className="modul-card__progress-fill"
                      style={{ width: `${module.percentComplete}%` }}
                    />
                  </div>
                  <div className="modul-card__progress-label">{module.statusLabel}</div>
                </div>
              )}
            </article>
          );

          return canOpen ? (
            <Link
              className="modul-card-link"
              href={`/belajar/pre-n5/${module.code}`}
              key={module.code}
              aria-label={`Buka ${module.title}`}
            >
              {card}
            </Link>
          ) : card;
        })}
      </div>
    </>
  );
}