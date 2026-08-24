"use client";

import { useRouter } from "next/navigation";
import type { ContinueLearningTarget } from "@/app/lib/continue-learning";
import type { CurriculumModuleSummary } from "@/app/lib/curriculum-v2";
import type { ReviewCounts } from "@/app/lib/review-query";

// Removed vs. the pre-Moji version: the daily-goal ring (18/30 min —
// no session-duration tracking exists), the streak badge (no streak
// column anywhere), and the hardcoded 3-item "First Steps" lesson list
// (fake progress state). "Modulmu" below replaces that list with the
// real per-module completion from getModuleSummaries.
export function DashboardView({
  userName,
  continueLearning,
  moduleSummaries,
  reviewCounts,
}: {
  userName: string;
  continueLearning: ContinueLearningTarget | null;
  moduleSummaries: CurriculumModuleSummary[];
  reviewCounts?: ReviewCounts;
}) {
  const router = useRouter();
  const continueHref = continueLearning
    ? `/belajar/kana/${continueLearning.moduleCode}/${continueLearning.lessonRouteId}`
    : "/belajar";
  const continueSubtitle = continueLearning
    ? `${continueLearning.moduleTitleId} · ${continueLearning.phaseTitleId}`
    : "Pilih modul pertama Anda untuk mulai belajar.";
  const continueTitle = continueLearning ? continueLearning.lessonTitleId : "Belum ada pelajaran aktif";
  const continueLabel = continueLearning ? "Lanjutkan" : "Lihat modul";

  return (
    <>
      <section className="dash-greet">
        <h1>おはよう, {userName}!</h1>
      </section>

      <div className="dash-continue">
        <div className="dash-continue__glyph">日</div>
        <div className="dash-continue__body">
          <span className="dash-continue__eyebrow">Lanjutkan belajar</span>
          <div className="dash-continue__title">{continueTitle}</div>
          <p className="dash-continue__subtitle">{continueSubtitle}</p>
        </div>
        <button className="dash-continue__btn" onClick={() => router.push(continueHref)}>
          {continueLabel} <span>›</span>
        </button>
      </div>

      {reviewCounts && reviewCounts.dueNow > 0 && (
        <div className="dash-continue dash-continue--review">
          <div className="dash-continue__glyph">復</div>
          <div className="dash-continue__body">
            <span className="dash-continue__eyebrow">Review hari ini</span>
            <div className="dash-continue__title">{reviewCounts.dueNow} huruf jatuh tempo</div>
            <p className="dash-continue__subtitle">
              {reviewCounts.learning} sedang dipelajari · {reviewCounts.mastered} dikuasai
            </p>
          </div>
          <button className="dash-continue__btn" onClick={() => router.push("/ulangi")}>
            Review <span>›</span>
          </button>
        </div>
      )}

      <div className="dash-modules">
        <div className="dash-modules__heading">
          <h3>Modulmu</h3>
          <button className="text-button" onClick={() => router.push("/belajar")}>Lihat semua →</button>
        </div>
        <div className="dash-modules__list">
          {moduleSummaries.length === 0 && <p className="welcome-copy">Belum ada modul yang tersedia.</p>}
          {moduleSummaries.map((m) => (
            <div className="dash-module-row" key={m.code}>
              <div className="dash-module-row__icon">{m.icon}</div>
              <div className="dash-module-row__body">
                <strong>{m.title}</strong>
                <small>{m.statusLabel}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
