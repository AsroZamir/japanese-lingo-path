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
import { LessonPlayer } from "./LessonPlayer";

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

    // M01LessonView owns its own header now (close button + progress +
    // counter, inside the fixed-height slide frame) — the old
    // breadcrumb/page-heading duplicated that and didn't fit the
    // "satu bingkai, tanpa scroll" format, so it's gone for this branch.
    return (
      <div className="content">
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

  // "Kelompok" for the LessonPlayer progress bar = this lesson's phase
  // (kana_phases row), same thing seed-first-lesson.ts calls a
  // group (P2 = Kelompok A) — moduleLessons already spans every phase
  // in the module, so it's filtered down to just this one.
  const groupLessons = (moduleLessons?.lessons ?? [])
    .filter((l) => l.phaseCode === bundle.phase.code)
    .map((l) => ({ code: l.code, titleId: l.titleId }));

  // L03 = recall + visual_to_sound (LessonL03.buildItems), L04 = recall
  // + visual_to_sound + typing (LessonL04.buildTestItems) — mirrored
  // here rather than re-derived from ExerciseRunner internals, since
  // the progress bar needs a total before any exercise has rendered.
  const exerciseTotals = { L03: bundle.kana.length * 2, L04: bundle.kana.length * 3 };

  return (
    <LessonPlayer
      moduleCode={moduleCode}
      groupCode={bundle.phase.code}
      groupLessons={groupLessons}
      currentLessonCode={bundle.lesson.code}
      lessonTitle={bundle.lesson.titleId}
      phaseTitle={`${bundle.module.titleId} · ${bundle.phase.titleId}`}
      exerciseTotals={exerciseTotals}
      nextLessonCode={nextLesson?.code ?? null}
      nextLessonTitle={nextLesson?.titleId ?? null}
    >
      {bundle.lesson.code === "L01" && <LessonL01 bundle={bundle} />}
      {bundle.lesson.code === "L02" && <LessonL02 bundle={bundle} />}
      {bundle.lesson.code === "L03" && <LessonL03 bundle={bundle} />}
      {bundle.lesson.code === "L04" && <LessonL04 bundle={bundle} />}
    </LessonPlayer>
  );
}
