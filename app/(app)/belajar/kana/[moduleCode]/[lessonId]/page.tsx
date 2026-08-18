import Link from "next/link";
import { redirect } from "next/navigation";
import { getLessonBundle } from "@/app/lib/lesson-query";
import { getM01LessonContent } from "@/app/lib/lesson-content-query";
import { getModuleLessons } from "@/app/lib/module-query";
import { LessonL01 } from "./LessonL01";
import { LessonL02 } from "./LessonL02";
import { LessonL03 } from "./LessonL03";
import { LessonL04 } from "./LessonL04";
import { M01LessonView } from "./M01LessonView";

function NextLessonNav({
  moduleCode,
  nextLessonCode,
  nextLessonTitle,
}: {
  moduleCode: string;
  nextLessonCode: string | null;
  nextLessonTitle: string | null;
}) {
  return (
    <div className="lesson-next-nav">
      {nextLessonCode ? (
        <Link href={`/belajar/kana/${moduleCode}/${nextLessonCode}`} className="primary-button">
          Lesson berikutnya: {nextLessonTitle} <span>→</span>
        </Link>
      ) : (
        <Link href={`/belajar/kana/${moduleCode}`} className="primary-button">
          Selesai — kembali ke daftar modul <span>→</span>
        </Link>
      )}
    </div>
  );
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ moduleCode: string; lessonId: string }>;
}) {
  const { moduleCode, lessonId } = await params;

  const moduleLessons = await getModuleLessons(moduleCode);

  // M01 (orientasi) tidak punya kana/kata untuk digambar/diuji lewat
  // ExerciseRunner kana — kontennya sepenuhnya naratif (lesson_content_blocks
  // + lesson_exercises), jadi jalur render-nya bercabang total dari sini.
  if (moduleCode === "M01") {
    const bundle = await getM01LessonContent(lessonId);
    if (!bundle) redirect("/belajar");

    const lessonIndex = moduleLessons?.lessons.findIndex((l) => l.code === bundle.lesson.code) ?? -1;
    const nextLesson = moduleLessons && lessonIndex >= 0 ? moduleLessons.lessons[lessonIndex + 1] ?? null : null;

    return (
      <div className="content">
        <Link href={`/belajar/kana/${moduleCode}`} className="back-button">← Kembali ke daftar modul</Link>
        <section className="page-heading">
          <p className="eyebrow">{bundle.module.titleId} · {bundle.phase.titleId}</p>
          <h1>{bundle.lesson.titleId}</h1>
        </section>

        <M01LessonView bundle={bundle} />

        <NextLessonNav moduleCode={moduleCode} nextLessonCode={nextLesson?.code ?? null} nextLessonTitle={nextLesson?.titleId ?? null} />
      </div>
    );
  }

  const bundle = await getLessonBundle(moduleCode, lessonId);
  if (!bundle) redirect("/belajar");

  const lessonIndex = moduleLessons?.lessons.findIndex((l) => l.code === bundle.lesson.code) ?? -1;
  const nextLesson =
    moduleLessons && lessonIndex >= 0 ? moduleLessons.lessons[lessonIndex + 1] ?? null : null;

  return (
    <div className="content">
      <Link href={`/belajar/kana/${moduleCode}`} className="back-button">← Kembali ke daftar modul</Link>
      <section className="page-heading">
        <p className="eyebrow">{bundle.module.titleId} · {bundle.phase.titleId}</p>
        <h1>{bundle.lesson.titleId}</h1>
      </section>

      {bundle.lesson.code === "L01" && <LessonL01 bundle={bundle} />}
      {bundle.lesson.code === "L02" && <LessonL02 bundle={bundle} />}
      {bundle.lesson.code === "L03" && <LessonL03 bundle={bundle} />}
      {bundle.lesson.code === "L04" && <LessonL04 bundle={bundle} />}

      <NextLessonNav moduleCode={moduleCode} nextLessonCode={nextLesson?.code ?? null} nextLessonTitle={nextLesson?.titleId ?? null} />
    </div>
  );
}
