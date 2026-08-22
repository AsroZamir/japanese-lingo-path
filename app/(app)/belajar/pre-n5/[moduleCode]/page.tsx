import Link from "next/link";
import { notFound } from "next/navigation";
import { getPreN5ModuleOverview } from "@/app/lib/pre-n5-01-query";
import { PageHeader } from "../../../_components/PageHeader";

export const dynamic = "force-dynamic";

const STAGE_MARK: Record<string, string> = {
  F1: "01",
  F2: "02",
  F3: "03",
  F4: "60",
  F5: "SRS",
  BOSS: "GATE",
};

export default async function PreN5ModulePage({
  params,
}: {
  params: Promise<{ moduleCode: string }>;
}) {
  const { moduleCode } = await params;
  const moduleOverview = await getPreN5ModuleOverview(moduleCode);
  if (!moduleOverview || moduleOverview.code !== "PRE-N5.01") notFound();

  return (
    <div className="content pre-n5-module">
      <Link href="/belajar" className="back-button">
        Kembali ke daftar modul
      </Link>
      <PageHeader
        eyebrow={moduleOverview.code + " - SCRIPT MASTERY"}
        title={moduleOverview.title}
        copy={moduleOverview.description}
      />

      <section className="pre-n5-module__hero">
        <div className="pre-n5-module__glyph">{moduleOverview.icon}</div>
        <div className="pre-n5-module__objective">
          <span>Target akhir</span>
          <h2>{moduleOverview.objective}</h2>
          <p>Metode: {moduleOverview.methodName}</p>
        </div>
        <div className="pre-n5-module__stats">
          <div><strong>{moduleOverview.estimatedHours}</strong><span>Estimasi</span></div>
          <div><strong>{moduleOverview.completedStageCount}/6</strong><span>Tahap selesai</span></div>
          <div><strong>{moduleOverview.percentComplete}%</strong><span>Progress</span></div>
        </div>
      </section>

      <div className="pre-n5-module__progress" aria-label={"Progress modul " + moduleOverview.percentComplete + "%"}>
        <span style={{ width: moduleOverview.percentComplete + "%" }} />
      </div>

      <section className="pre-n5-stage-list">
        <header>
          <div>
            <span className="card-kicker dark">ACTIVE MASTERY PATH</span>
            <h3>Enam tahap menuju Hiragana Warrior</h3>
          </div>
          {moduleOverview.nextStageCode && (
            <Link
              href={"/belajar/pre-n5/" + moduleOverview.code + "/" + moduleOverview.nextStageCode}
              className="primary-button"
            >
              Lanjutkan {moduleOverview.nextStageCode}
            </Link>
          )}
        </header>

        <div className="pre-n5-stage-list__grid">
          {moduleOverview.stages.map((stage) => {
            const body = (
              <>
                <div className="pre-n5-stage-card__mark">
                  {stage.progressStatus === "completed" ? "OK" : STAGE_MARK[stage.code] ?? stage.code}
                </div>
                <div className="pre-n5-stage-card__body">
                  <div>
                    <span>{stage.code} - {stage.stageKind}</span>
                    <b>{stage.statusLabel}</b>
                  </div>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                  <small>{stage.mechanic}</small>
                  {stage.score != null && <em>Skor terbaik {Math.round(stage.score)}%</em>}
                </div>
              </>
            );

            return stage.locked ? (
              <article className="pre-n5-stage-card is-locked" key={stage.id}>
                {body}
              </article>
            ) : (
              <Link
                className={[
                  "pre-n5-stage-card",
                  stage.progressStatus === "completed" ? "is-complete" : "is-open",
                ].join(" ")}
                key={stage.id}
                href={"/belajar/pre-n5/" + moduleOverview.code + "/" + stage.code}
              >
                {body}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
