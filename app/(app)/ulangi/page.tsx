import { PageHeader } from "../_components/PageHeader";
import { isDevUnlockAllActive } from "@/app/lib/dev-mode";
import { DevUnlockBanner } from "../_components/DevUnlockBanner";
import {
  getReviewQueue,
  getReviewCounts,
  getHiraganaDistractorPool,
  getAnyPreN5StageId,
} from "@/app/lib/review-query";
import { buildReviewQuestions } from "./build-questions";
import { ReviewRunner } from "./ReviewRunner";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const [queue, counts, distractorPool, stageId] = await Promise.all([
    getReviewQueue(),
    getReviewCounts(),
    getHiraganaDistractorPool(),
    getAnyPreN5StageId(),
  ]);

  const questions = stageId != null ? buildReviewQuestions(queue, distractorPool) : [];

  return (
    <>
      {isDevUnlockAllActive() && <DevUnlockBanner />}
      <PageHeader
        eyebrow="SPACED REPETITION"
        title="Review Hari Ini"
        copy="Perkuat huruf yang paling mungkin lupa, berdasarkan jadwal ingatan sungguhan."
      />
      <section className="review-summary">
        <div><small>JATUH TEMPO</small><strong>{counts.dueNow}</strong><span>huruf</span></div>
        <div><small>SEDANG DIPELAJARI</small><strong>{counts.learning}</strong><span>huruf</span></div>
        <div><small>DIKUASAI</small><strong>{counts.mastered}</strong><span>huruf</span></div>
      </section>
      {stageId == null ? (
        <section className="table-card">
          <p>Modul PRE-N5.01 belum ditemukan — review belum bisa dijalankan.</p>
        </section>
      ) : (
        <ReviewRunner stageId={stageId} questions={questions} />
      )}
      {queue.length > 0 && (
        <section className="table-card">
          <div className="table-title">
            <div>
              <span className="card-kicker dark">SESI INI</span>
              <h3>Antrean review ({queue.length} huruf)</h3>
            </div>
          </div>
          {queue.map(({ item, dueAt, isTopUp, reasons }) => (
            <div className="review-item" key={item.id}>
              <div className="review-symbol">{item.character}</div>
              <div>
                <strong>{item.character}</strong>
                <small>{item.romaji}{reasons.length > 0 ? " · " + reasons[0] : ""}</small>
              </div>
              <span>{isTopUp ? "Latihan tambahan" : "Jatuh tempo"}</span>
              <time>{dueAt ? new Date(dueAt).toLocaleString("id-ID") : "—"}</time>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
