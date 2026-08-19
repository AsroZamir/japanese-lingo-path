import Link from "next/link";
import { notFound } from "next/navigation";
import { getModuleLessons, type LessonProgressStatus } from "@/app/lib/module-query";
import { PageHeader } from "../../../_components/PageHeader";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<LessonProgressStatus, string> = {
  not_started: "Mulai →",
  in_progress: "Lanjutkan →",
  completed: "Selesai",
};

const STATUS_ROW_CLASS: Record<LessonProgressStatus, string> = {
  not_started: "",
  in_progress: "active",
  completed: "done",
};

export default async function KanaModulePage({
  params,
}: {
  params: Promise<{ moduleCode: string }>;
}) {
  const { moduleCode } = await params;
  const data = await getModuleLessons(moduleCode);
  if (!data) notFound();

  return (
    <div className="content">
      <Link href="/belajar" className="back-button">← Kembali ke daftar modul</Link>
      <PageHeader
        eyebrow={`MODUL ${data.module.code}`}
        title={data.module.titleId}
        copy={`${data.lessons.length} pelajaran tersedia di modul ini.`}
      />

      {data.lessons.length === 0 ? (
        <p className="welcome-copy">Belum ada pelajaran yang di-seed untuk modul ini.</p>
      ) : (
        <section className="section-main">
          <div className="section-heading">
            <div><span className="card-kicker dark">DAFTAR PELAJARAN</span><h3>Pilih pelajaran untuk mulai belajar</h3></div>
          </div>
          <div className="lesson-list">
            {data.lessons.map((lesson, index) => (
              <article className={`lesson-row ${STATUS_ROW_CLASS[lesson.status]}`} key={lesson.id}>
                <span className="lesson-no">{lesson.status === "completed" ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <div><strong>{lesson.titleId}</strong><small>{lesson.phaseTitleId} · {lesson.code}</small></div>
                <Link href={`/belajar/kana/${moduleCode}/${lesson.routeId}`} className="lesson-action">
                  {STATUS_LABEL[lesson.status]}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
