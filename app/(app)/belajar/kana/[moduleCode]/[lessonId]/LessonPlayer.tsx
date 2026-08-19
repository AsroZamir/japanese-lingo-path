"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ensureGroupStarted,
  recordLessonResult,
  consumeGroupStats,
  type GroupCompletionSummary,
} from "@/app/lib/lesson-player-stats";

// Context, not a prop threaded through page.tsx -> LessonL03/L04 ->
// ExerciseRunner: page.tsx is a Server Component, so it constructs
// LessonL03/L04's JSX once, up front — it has no way to hand them a
// callback that closes over LessonPlayer's client-side state (that
// state doesn't exist yet when the Server Component renders). Context
// lets those already-constructed elements reach up to whichever
// LessonPlayer they end up mounted inside, at render time.
type LessonProgressContextValue = {
  reportProgress: (done: number, total: number) => void;
  reportLessonResult: (correct: number, total: number) => void;
};

const LessonProgressContext = createContext<LessonProgressContextValue | null>(null);

export function useLessonProgress(): LessonProgressContextValue {
  const ctx = useContext(LessonProgressContext);
  // Falls back to no-ops outside a LessonPlayer (e.g. /dev/components)
  // rather than throwing — these callbacks are progress-bar plumbing,
  // not something a lesson should hard-depend on to render at all.
  return ctx ?? { reportProgress: () => {}, reportLessonResult: () => {} };
}

export type LessonPlayerLesson = { code: string; titleId: string };

export type LessonPlayerProps = {
  moduleCode: string;
  groupCode: string;
  groupLessons: LessonPlayerLesson[];
  currentLessonCode: string;
  lessonTitle: string;
  phaseTitle: string;
  /** Exercise item counts per lesson code, e.g. { L03: 10, L04: 15 } — derived from bundle.kana.length by the caller, not queried again here. */
  exerciseTotals: Partial<Record<string, number>>;
  /** Full href (routeId-based, `${phaseCode}-${lessonCode}`) — built by the caller, since bare lesson codes collide across phases. */
  nextLessonHref: string | null;
  nextLessonTitle: string | null;
  children: ReactNode;
};

type SegmentDef = { lessonCode: string; kind: "fixed" | "proportional" };

// 9 segments = 7 fixed screen-equivalents (L01 intro+dengar, L02
// stroke+kanvas, L03 chart, L04 dialog+selesai) + 2 proportional ones
// (L03 latihan, L04 tes) that fill by real answered-question count via
// reportProgress, instead of being mapped to a single fixed number —
// see the segment-math discussion this was approved from.
const FOUR_LESSON_SEGMENT_TEMPLATE: SegmentDef[] = [
  { lessonCode: "L01", kind: "fixed" },
  { lessonCode: "L01", kind: "fixed" },
  { lessonCode: "L02", kind: "fixed" },
  { lessonCode: "L02", kind: "fixed" },
  { lessonCode: "L03", kind: "fixed" },
  { lessonCode: "L03", kind: "proportional" },
  { lessonCode: "L04", kind: "proportional" },
  { lessonCode: "L04", kind: "fixed" },
  { lessonCode: "L04", kind: "fixed" },
];

// The 9-segment template above is hand-tuned for exactly the L01-L04
// group-drill cycle (Fase 2/3) — see the comment that used to sit here.
// Fase 4+ phases don't all have 4 lessons (Reading Lab has 3, Consolidation
// has 2), and reusing that fixed 9-segment array for a shorter phase would
// leave the last segments permanently unfillable (their lessonCode, e.g.
// "L04", never exists in groupLessons) — the bar would visibly stick below
// 100%. This generic fallback (2 segments per lesson: one fixed "arrival",
// one proportional "completion") only applies when the lesson count isn't
// 4, so every already-shipped Fase 2/3 lesson keeps the exact tuned
// template above, unchanged.
function segmentTemplateFor(groupLessons: LessonPlayerLesson[]): SegmentDef[] {
  if (groupLessons.length === 4) return FOUR_LESSON_SEGMENT_TEMPLATE;
  return groupLessons.flatMap((l) => [
    { lessonCode: l.code, kind: "fixed" as const },
    { lessonCode: l.code, kind: "proportional" as const },
  ]);
}

export function LessonPlayer({
  moduleCode,
  groupCode,
  groupLessons,
  currentLessonCode,
  lessonTitle,
  phaseTitle,
  exerciseTotals,
  nextLessonHref,
  nextLessonTitle,
  children,
}: LessonPlayerProps) {
  const currentIndex = groupLessons.findIndex((l) => l.code === currentLessonCode);
  const lastLesson = groupLessons[groupLessons.length - 1];
  const currentTotal = exerciseTotals[currentLessonCode] ?? 0;

  const [done, setDone] = useState(0);
  const [summary, setSummary] = useState<GroupCompletionSummary | null>(null);
  const consumedRef = useRef(false);

  useEffect(() => {
    ensureGroupStarted(moduleCode, groupCode);
  }, [moduleCode, groupCode]);

  const isLastLesson = currentLessonCode === lastLesson?.code;
  const groupComplete = isLastLesson && currentTotal > 0 && done >= currentTotal;

  useEffect(() => {
    if (!groupComplete || consumedRef.current) return;
    consumedRef.current = true;
    setSummary(consumeGroupStats(moduleCode, groupCode));
  }, [groupComplete, moduleCode, groupCode]);

  // Memoized deliberately: without this, every LessonPlayer render (e.g.
  // the unrelated setSummary below) recreates this object, and Context
  // consumers re-render whenever the Provider value's reference changes
  // — regardless of children-prop stability, since Context bypasses
  // that check by design. This is the one place a cascade could sneak
  // back in, so it's pinned here rather than left implicit.
  const reportProgress = useCallback((nextDone: number) => {
    setDone(nextDone);
  }, []);

  const reportLessonResult = useCallback((correct: number, total: number) => {
    recordLessonResult(moduleCode, groupCode, correct, total);
  }, [moduleCode, groupCode]);

  const contextValue = useMemo(
    () => ({ reportProgress, reportLessonResult }),
    [reportProgress, reportLessonResult],
  );

  const lessonIndexByCode = new Map(groupLessons.map((l, i) => [l.code, i]));
  const segmentTemplate = segmentTemplateFor(groupLessons);

  function segmentFill(seg: SegmentDef): number {
    const segIndex = lessonIndexByCode.get(seg.lessonCode) ?? -1;
    if (segIndex < currentIndex) return 1;
    if (segIndex > currentIndex) return 0;
    if (seg.kind === "fixed") return 1;
    if (currentTotal <= 0) return 0;
    return Math.min(1, done / currentTotal);
  }

  const overallPercent = Math.round(
    (segmentTemplate.reduce((sum, seg) => sum + segmentFill(seg), 0) / segmentTemplate.length) * 100,
  );

  return (
    <div className="content">
      {/* Skips the intermediate lesson-list page on purpose (Tugas 2) — it's
          no longer a mandatory stop in the normal flow, just a direct-URL
          fallback, so exiting a lesson goes straight back to /belajar. */}
      <Link href="/belajar" className="back-button">← Kembali ke daftar modul</Link>

      <div className="lesson-player__progress" role="progressbar" aria-valuenow={overallPercent} aria-valuemin={0} aria-valuemax={100}>
        {segmentTemplate.map((seg, i) => (
          <span key={i} className="lesson-player__segment">
            <span className="lesson-player__segment-fill" style={{ transform: `scaleX(${segmentFill(seg)})` }} />
          </span>
        ))}
      </div>

      <section className="page-heading">
        <p className="eyebrow">{phaseTitle}</p>
        <h1>{lessonTitle}</h1>
      </section>

      <LessonProgressContext.Provider value={contextValue}>
        {children}
      </LessonProgressContext.Provider>

      {summary && (
        <div className="lesson-player__summary">
          <div className="lesson-player__summary-check">✓</div>
          <h3>Kelompok selesai!</h3>
          <div className="lesson-player__summary-stats">
            <div>
              <strong>{summary.durationMinutes != null ? `${summary.durationMinutes} menit` : "—"}</strong>
              <span>Waktu</span>
            </div>
            <div>
              <strong>{summary.accuracyPercent != null ? `${summary.accuracyPercent}%` : "—"}</strong>
              <span>Akurasi</span>
            </div>
            <div>
              <strong>{summary.correct}/{summary.total}</strong>
              <span>Benar</span>
            </div>
          </div>
        </div>
      )}

      <div className="lesson-next-nav">
        {nextLessonHref ? (
          <Link href={nextLessonHref} className="primary-button">
            Lesson berikutnya: {nextLessonTitle} <span>→</span>
          </Link>
        ) : (
          <Link href="/belajar" className="primary-button">
            Selesai — kembali ke daftar modul <span>→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
