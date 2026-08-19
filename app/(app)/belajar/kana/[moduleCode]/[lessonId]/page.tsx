import Link from "next/link";
import { redirect } from "next/navigation";
import { getLessonBundle } from "@/app/lib/lesson-query";
import { getOrientationLessonContent } from "@/app/lib/lesson-content-query";
import { getModuleLessons } from "@/app/lib/module-query";
import { getWordPool } from "@/app/lib/word-pool-query";
import { getKanaPool, getConfusionPairs } from "@/app/lib/kana-pool-query";
import { LessonL01 } from "./LessonL01";
import { LessonL02 } from "./LessonL02";
import { LessonL03 } from "./LessonL03";
import { LessonL04 } from "./LessonL04";
import { LessonReading } from "./LessonReading";
import { LessonActiveRecall } from "./LessonActiveRecall";
import { LessonActiveRecallWriting } from "./LessonActiveRecallWriting";
import { LessonWritingLab } from "./LessonWritingLab";
import { LessonConsolidation } from "./LessonConsolidation";
import { M01LessonView } from "./M01LessonView";
import { LessonPlayer } from "./LessonPlayer";

// Lesson types that render as narrative slide decks (M01LessonView) rather
// than the kana-drill LessonPlayer path — concept/orientation content has
// no kana/kata to drill, it's pure lesson_content_blocks + lesson_exercises.
// Matched by lesson_type, not module code, so any module's orientation
// phase (not just M01) gets the same treatment — see M02 Phase 1.
const ORIENTATION_LESSON_TYPES = new Set(["orientation", "orientation_practice"]);

// Fase 4 (Reading Lab) practices vocabulary already taught, not new
// characters — no kana_lesson_items of its own, so it reads from the
// whole kana_example_words pool instead of getLessonBundle. Word-length
// range (kana count, not codepoint count) is keyed by lesson code, same
// convention LessonL01-L04 already use to vary behavior by code.
const READING_LESSON_TYPE = "reading_practice";
const READING_LENGTH_BY_CODE: Record<string, [number, number]> = {
  L01: [2, 3],
  L02: [4, 99],
};
const MODULE_SCRIPT: Record<string, "hiragana" | "katakana"> = { M02: "hiragana", M03: "katakana" };

// Fase 5 (Active Recall) — same "no kana_lesson_items of its own" shape
// as Reading Lab, but drills the FULL taught-so-far kana pool (not just
// vocabulary). L02 is dictation/writing (LessonActiveRecallWriting);
// L01/L03 are multiple-choice (LessonActiveRecall) — branched by lesson
// code, same convention LessonReading already uses for L01 vs L02.
const ACTIVE_RECALL_LESSON_TYPE = "active_recall";

// Fase 6 (Writing Lab) — same pool-bundle shape as Active Recall (all 3
// lessons draw from getKanaPool/getWordPool, no kana_lesson_items of
// their own), all 3 lessons render through LessonWritingLab (which
// branches its own item-building internally by code, same convention
// LessonReading/LessonActiveRecall already use).
const WRITING_LAB_LESSON_TYPE = "writing_lab";

// Fase 7 (Consolidation) — same pool-bundle shape again, plus
// kana_confusion_pairs for L01 (seed-kana-confusion-pairs.ts).
const CONSOLIDATION_LESSON_TYPE = "consolidation";

function NextLessonNav({
  nextLessonHref,
  nextLessonTitle,
}: {
  nextLessonHref: string | null;
  nextLessonTitle: string | null;
}) {
  return (
    <div className="lesson-next-nav">
      {nextLessonHref ? (
        <Link href={nextLessonHref} className="primary-button">
          Lesson berikutnya: {nextLessonTitle} <span>→</span>
        </Link>
      ) : (
        // Last lesson in the module — the intermediate lesson-list page
        // (/belajar/kana/[moduleCode]) is no longer part of the normal
        // flow (Tugas 2), so this returns straight to /belajar.
        <Link href="/belajar" className="primary-button">
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

  // lessonId is a routeId, `${phaseCode}-${lessonCode}` (e.g. "P3-L01") —
  // required because kana_lessons.code is only unique WITHIN a phase, and
  // every group phase in a module reuses L01..L04 (see module-query.ts).
  const [phaseCode, lessonCode] = lessonId.split("-");
  if (!phaseCode || !lessonCode) redirect("/belajar");

  const moduleLessons = await getModuleLessons(moduleCode);
  if (!moduleLessons) redirect("/belajar");

  const currentIndex = moduleLessons.lessons.findIndex((l) => l.routeId === lessonId);
  if (currentIndex === -1) redirect("/belajar");
  const currentSummary = moduleLessons.lessons[currentIndex];
  const nextLesson = moduleLessons.lessons[currentIndex + 1] ?? null;

  if (ORIENTATION_LESSON_TYPES.has(currentSummary.lessonType)) {
    const bundle = await getOrientationLessonContent(moduleCode, phaseCode, lessonCode);
    if (!bundle) redirect("/belajar");

    // M01LessonView owns its own header now (close button + progress +
    // counter, inside the fixed-height slide frame) — the old
    // breadcrumb/page-heading duplicated that and didn't fit the
    // "satu bingkai, tanpa scroll" format, so it's gone for this branch.
    return (
      <div className="content">
        <M01LessonView bundle={bundle} />

        <NextLessonNav
          nextLessonHref={nextLesson ? `/belajar/kana/${moduleCode}/${nextLesson.routeId}` : null}
          nextLessonTitle={nextLesson?.titleId ?? null}
        />
      </div>
    );
  }

  if (currentSummary.lessonType === READING_LESSON_TYPE) {
    const [minLen, maxLen] = READING_LENGTH_BY_CODE[lessonCode] ?? [2, 99];
    const script = MODULE_SCRIPT[moduleCode] ?? "hiragana";
    const words = await getWordPool(script, minLen, maxLen);

    const groupLessons = moduleLessons.lessons
      .filter((l) => l.phaseCode === phaseCode)
      .map((l) => ({ code: l.code, titleId: l.titleId }));
    const exerciseTotals = { [lessonCode]: words.length * 2 };

    return (
      <LessonPlayer
        moduleCode={moduleCode}
        groupCode={phaseCode}
        groupLessons={groupLessons}
        currentLessonCode={lessonCode}
        lessonTitle={currentSummary.titleId}
        phaseTitle={`${moduleLessons.module.titleId} · ${currentSummary.phaseTitleId}`}
        exerciseTotals={exerciseTotals}
        nextLessonHref={nextLesson ? `/belajar/kana/${moduleCode}/${nextLesson.routeId}` : null}
        nextLessonTitle={nextLesson?.titleId ?? null}
      >
        <LessonReading
          bundle={{
            module: moduleLessons.module,
            phase: { id: 0, code: phaseCode, titleId: currentSummary.phaseTitleId },
            lesson: { id: currentSummary.id, code: lessonCode, titleId: currentSummary.titleId, lessonType: currentSummary.lessonType, romajiPolicy: "on_demand" },
            words,
          }}
        />
      </LessonPlayer>
    );
  }

  if (currentSummary.lessonType === ACTIVE_RECALL_LESSON_TYPE) {
    const script = MODULE_SCRIPT[moduleCode] ?? "hiragana";
    const [kana, words] = await Promise.all([getKanaPool(script), getWordPool(script, 1, 99)]);

    const groupLessons = moduleLessons.lessons
      .filter((l) => l.phaseCode === phaseCode)
      .map((l) => ({ code: l.code, titleId: l.titleId }));
    // Real totals depend on the random sample size each component draws
    // (see LessonActiveRecall/-Writing) — this is a stable upper-bound
    // estimate for the progress bar, not a re-derivation of the exact item
    // count, same spirit as the L03/L04 estimates below.
    const exerciseTotals = { [lessonCode]: lessonCode === "L02" ? 8 + 4 * 3 : lessonCode === "L01" ? 30 : 36 };

    const recallBundle = {
      lesson: { id: currentSummary.id, code: lessonCode, titleId: currentSummary.titleId, lessonType: currentSummary.lessonType },
      kana,
      words,
    };

    return (
      <LessonPlayer
        moduleCode={moduleCode}
        groupCode={phaseCode}
        groupLessons={groupLessons}
        currentLessonCode={lessonCode}
        lessonTitle={currentSummary.titleId}
        phaseTitle={`${moduleLessons.module.titleId} · ${currentSummary.phaseTitleId}`}
        exerciseTotals={exerciseTotals}
        nextLessonHref={nextLesson ? `/belajar/kana/${moduleCode}/${nextLesson.routeId}` : null}
        nextLessonTitle={nextLesson?.titleId ?? null}
      >
        {lessonCode === "L02" ? <LessonActiveRecallWriting bundle={recallBundle} /> : <LessonActiveRecall bundle={recallBundle} />}
      </LessonPlayer>
    );
  }

  if (currentSummary.lessonType === WRITING_LAB_LESSON_TYPE) {
    const script = MODULE_SCRIPT[moduleCode] ?? "hiragana";
    const [kana, words] = await Promise.all([getKanaPool(script), getWordPool(script, 1, 99)]);

    const groupLessons = moduleLessons.lessons
      .filter((l) => l.phaseCode === phaseCode)
      .map((l) => ({ code: l.code, titleId: l.titleId }));
    const exerciseTotals = { [lessonCode]: lessonCode === "L01" ? 20 : lessonCode === "L02" ? 24 : 16 };

    const writingBundle = {
      lesson: { id: currentSummary.id, code: lessonCode, titleId: currentSummary.titleId, lessonType: currentSummary.lessonType },
      kana,
      words,
    };

    return (
      <LessonPlayer
        moduleCode={moduleCode}
        groupCode={phaseCode}
        groupLessons={groupLessons}
        currentLessonCode={lessonCode}
        lessonTitle={currentSummary.titleId}
        phaseTitle={`${moduleLessons.module.titleId} · ${currentSummary.phaseTitleId}`}
        exerciseTotals={exerciseTotals}
        nextLessonHref={nextLesson ? `/belajar/kana/${moduleCode}/${nextLesson.routeId}` : null}
        nextLessonTitle={nextLesson?.titleId ?? null}
      >
        <LessonWritingLab bundle={writingBundle} />
      </LessonPlayer>
    );
  }

  if (currentSummary.lessonType === CONSOLIDATION_LESSON_TYPE) {
    const script = MODULE_SCRIPT[moduleCode] ?? "hiragana";
    const [kana, words] = await Promise.all([getKanaPool(script), getWordPool(script, 1, 99)]);
    const confusionPairs = await getConfusionPairs(kana);

    const groupLessons = moduleLessons.lessons
      .filter((l) => l.phaseCode === phaseCode)
      .map((l) => ({ code: l.code, titleId: l.titleId }));
    const exerciseTotals = { [lessonCode]: lessonCode === "L01" ? confusionPairs.length * 2 : 25 };

    const consolidationBundle = {
      lesson: { id: currentSummary.id, code: lessonCode, titleId: currentSummary.titleId, lessonType: currentSummary.lessonType },
      kana,
      words,
      confusionPairs,
    };

    return (
      <LessonPlayer
        moduleCode={moduleCode}
        groupCode={phaseCode}
        groupLessons={groupLessons}
        currentLessonCode={lessonCode}
        lessonTitle={currentSummary.titleId}
        phaseTitle={`${moduleLessons.module.titleId} · ${currentSummary.phaseTitleId}`}
        exerciseTotals={exerciseTotals}
        nextLessonHref={nextLesson ? `/belajar/kana/${moduleCode}/${nextLesson.routeId}` : null}
        nextLessonTitle={nextLesson?.titleId ?? null}
      >
        <LessonConsolidation bundle={consolidationBundle} />
      </LessonPlayer>
    );
  }

  const bundle = await getLessonBundle(moduleCode, phaseCode, lessonCode);
  if (!bundle) redirect("/belajar");

  // "Kelompok" for the LessonPlayer progress bar = this lesson's phase
  // (kana_phases row), same thing seed-first-lesson.ts calls a
  // group (P2 = Kelompok A) — moduleLessons already spans every phase
  // in the module, so it's filtered down to just this one.
  const groupLessons = moduleLessons.lessons
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
      nextLessonHref={nextLesson ? `/belajar/kana/${moduleCode}/${nextLesson.routeId}` : null}
      nextLessonTitle={nextLesson?.titleId ?? null}
    >
      {bundle.lesson.code === "L01" && <LessonL01 bundle={bundle} />}
      {bundle.lesson.code === "L02" && <LessonL02 bundle={bundle} />}
      {bundle.lesson.code === "L03" && <LessonL03 bundle={bundle} />}
      {bundle.lesson.code === "L04" && <LessonL04 bundle={bundle} />}
    </LessonPlayer>
  );
}
