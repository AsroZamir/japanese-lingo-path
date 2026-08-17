import { redirect } from "next/navigation";
import { getLessonBundle } from "@/app/lib/lesson-query";
import { LessonL01 } from "./LessonL01";
import { LessonL02 } from "./LessonL02";
import { LessonL03 } from "./LessonL03";
import { LessonL04 } from "./LessonL04";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ moduleCode: string; lessonId: string }>;
}) {
  const { moduleCode, lessonId } = await params;
  const bundle = await getLessonBundle(moduleCode, lessonId);
  if (!bundle) redirect("/belajar");

  return (
    <div className="content">
      <section className="page-heading">
        <p className="eyebrow">{bundle.module.titleId} · {bundle.phase.titleId}</p>
        <h1>{bundle.lesson.titleId}</h1>
      </section>

      {bundle.lesson.code === "L01" && <LessonL01 bundle={bundle} />}
      {bundle.lesson.code === "L02" && <LessonL02 bundle={bundle} />}
      {bundle.lesson.code === "L03" && <LessonL03 bundle={bundle} />}
      {bundle.lesson.code === "L04" && <LessonL04 bundle={bundle} />}
    </div>
  );
}
