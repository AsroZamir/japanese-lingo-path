import Link from "next/link";
import { notFound } from "next/navigation";
import { getPreN5ModuleOverview } from "@/app/lib/pre-n5-01-query";
import { PageHeader } from "../../../_components/PageHeader";

export const dynamic = "force-dynamic";

const STAGE_MARK: Record<string, string> = {
  F1: "10",
  F2: "20",
  F3: "30",
  F4: "40",
  F5: "46",
  BOSS: "GATE",
  RETENTION: "72H",
};

function configurationNumber(
  configuration: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = configuration[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export default async function PreN5ModulePage({
  params,
}: {
  params: Promise<{ moduleCode: string }>;
}) {
  const { moduleCode } = await params;
  const moduleOverview = await getPreN5ModuleOverview(moduleCode);
  if (!moduleOverview || moduleOverview.code !== "PRE-N5.01") notFound();

  const phaseStages = moduleOverview.stages.filter((stage) => /^F[1-5]$/.test(stage.code));

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
        <div className="pre-n5-module__hero-copy">
          <div className="pre-n5-module__glyph">{moduleOverview.icon}</div>
          <div className="pre-n5-module__objective">
            <div className="pre-n5-module__objective-topline">
              <span>Target akhir</span>
              <b>46 HIRAGANA DASAR</b>
            </div>
            <h2>{moduleOverview.objective}</h2>
            <p>Metode: {moduleOverview.methodName}</p>
          </div>
        </div>
        <div className="pre-n5-module__stats">
          <div><strong>{moduleOverview.estimatedHours}</strong><span>Estimasi</span></div>
          <div><strong>{moduleOverview.completedStageCount}/{moduleOverview.stages.length}</strong><span>Tahap selesai</span></div>
          <div><strong>{moduleOverview.percentComplete}%</strong><span>Progress</span></div>
        </div>
      </section>

      <div className="pre-n5-module__progress-card">
        <div>
          <span>Perjalanan penguasaan</span>
          <strong>
            {moduleOverview.nextStageCode
              ? "Berikutnya: " + moduleOverview.nextStageCode
              : "Semua tahap selesai"}
          </strong>
        </div>
        <div
          className="pre-n5-module__progress"
          role="progressbar"
          aria-label="Progress modul"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={moduleOverview.percentComplete}
        >
          <span style={{ width: moduleOverview.percentComplete + "%" }} />
        </div>
      </div>

      <section className="pre-n5-module__rule">
        <div>
          <span>ATURAN PROGRES</span>
          <strong>Belajar sedikit, lalu uji semua yang sudah dipelajari.</strong>
          <p>Fase berikutnya terbuka setelah batch aktif dan checkpoint kumulatifnya lulus.</p>
        </div>
        <ol aria-label="Urutan jumlah Hiragana">
          {[10, 20, 30, 40, 46].map((count, index) => {
            const stage = phaseStages[index];
            const stateClass = stage?.progressStatus === "completed"
              ? "is-complete"
              : stage && !stage.locked
                ? "is-current"
                : "";

            return (
              <li key={count} className={stateClass}>
              <b>{count}</b>
              <span>{index === 0 ? "huruf awal" : index === 4 ? "huruf lengkap" : "huruf kumulatif"}</span>
            </li>
            );
          })}
        </ol>
      </section>

      <section className="pre-n5-stage-list">
        <header>
          <div>
            <span className="card-kicker dark">ACTIVE MASTERY PATH</span>
            <h3>Lima batch bertahap dan satu gerbang penguasaan</h3>
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
            const cumulativeCount = configurationNumber(
              stage.configuration,
              "cumulativeCharacterCount",
              stage.code === "BOSS" ? 46 : 0,
            );
            const newCharacterCount = configurationNumber(
              stage.configuration,
              "newCharacterCount",
              0,
            );
            const body = (
              <>
                <div className="pre-n5-stage-card__mark">
                  {stage.progressStatus === "completed" ? "OK" : STAGE_MARK[stage.code] ?? stage.code}
                </div>
                <div className="pre-n5-stage-card__body">
                  <div className="pre-n5-stage-card__meta">
                    <span>
                      {stage.code === "BOSS"
                        ? "Ujian akhir - 46 huruf"
                        : stage.code === "RETENTION"
                          ? "Gerbang tertunda - buka 72 jam setelah Gate"
                          : "+" + newCharacterCount + " baru - total " + cumulativeCount}
                    </span>
                    <b>{stage.statusLabel}</b>
                  </div>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                  <div className="pre-n5-stage-card__footer">
                    <small>{stage.mechanic}</small>
                    {!stage.locked && <span aria-hidden="true">&rarr;</span>}
                  </div>
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
