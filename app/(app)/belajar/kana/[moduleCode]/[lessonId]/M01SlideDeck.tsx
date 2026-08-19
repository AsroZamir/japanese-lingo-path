"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { LessonExerciseRow } from "@/app/lib/lesson-content-types";
import { ConceptExerciseRunner, type ConceptAnswerState } from "./ConceptExerciseRunner";
import { NarrationButton } from "./NarrationButton";

export type ContentSlide = { node: ReactNode; narrationUrl: string | null };

// Mirrors D.slideHalf from "Sistem Gerak - Kuis Hiragana.dc.html" (also
// --moji-d-slide in globals.css) — JS needs the literal number to drive
// setTimeout/rAF choreography, CSS can't hand that back out of a custom
// property. Keep the two in sync if the token ever changes.
const SLIDE_MS = 200;

type Phase = "idle" | "out" | "preIn" | "in";

export type M01SlideDeckProps = {
  lessonId: number;
  contentSlides: ContentSlide[];
  exercises: LessonExerciseRow[];
};

function QuizFinishedSummary({
  answers,
  exercises,
}: {
  answers: Record<number, ConceptAnswerState>;
  exercises: LessonExerciseRow[];
}) {
  const total = exercises.length;
  const correct = exercises.filter((e) => answers[e.id]?.isCorrect).length;
  return (
    <div className="exercise-runner exercise-runner--done">
      Selesai — {correct}/{total} benar. Latihan ini tidak punya nilai kelulusan, jadi Anda tetap bisa lanjut ke pelajaran berikutnya.
    </div>
  );
}

export function M01SlideDeck({ lessonId, contentSlides, exercises }: M01SlideDeckProps) {
  const totalSlides = contentSlides.length + exercises.length;

  const [index, setIndex] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dir, setDir] = useState<1 | -1>(1);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, ConceptAnswerState>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const timers = useRef<{ t1?: ReturnType<typeof setTimeout>; t2?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    const t = timers.current;
    return () => {
      if (t.t1) clearTimeout(t.t1);
      if (t.t2) clearTimeout(t.t2);
    };
  }, []);

  function go(delta: 1 | -1) {
    const ns = index + delta;
    if (ns < 0 || ns >= totalSlides) return;
    if (timers.current.t1) clearTimeout(timers.current.t1);
    if (timers.current.t2) clearTimeout(timers.current.t2);
    setDir(delta);
    setPhase("out");
    timers.current.t1 = setTimeout(() => {
      setIndex(ns);
      setMaxStep((m) => Math.max(m, ns));
      setPhase("preIn");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("in");
          timers.current.t2 = setTimeout(() => setPhase("idle"), SLIDE_MS);
        });
      });
    }, SLIDE_MS);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, totalSlides]);

  const isQuizSlide = index >= contentSlides.length;
  const quizIndex = index - contentSlides.length;
  const activeExercise = isQuizSlide ? exercises[quizIndex] : null;
  const isLastQuizSlide = isQuizSlide && quizIndex === exercises.length - 1;

  function handleQuizAdvance() {
    if (isLastQuizSlide) {
      setQuizFinished(true);
      return;
    }
    go(1);
  }

  const slideTr = `transform ${SLIDE_MS}ms var(--moji-ease-out), opacity ${SLIDE_MS}ms var(--moji-ease-out)`;
  const sign = dir;
  let stageStyle: React.CSSProperties;
  if (phase === "out") stageStyle = { transform: `translateX(${-22 * sign}px) scale(.98)`, opacity: 0, transition: slideTr };
  else if (phase === "preIn") stageStyle = { transform: `translateX(${22 * sign}px) scale(.98)`, opacity: 0, transition: "none" };
  else if (phase === "in") stageStyle = { transform: "translateX(0) scale(1)", opacity: 1, transition: slideTr };
  else stageStyle = { transform: "translateX(0) scale(1)", opacity: 1, transition: "none" };

  let stageContent: ReactNode;
  if (quizFinished) {
    stageContent = <QuizFinishedSummary answers={quizAnswers} exercises={exercises} />;
  } else if (isQuizSlide && activeExercise) {
    const answer = quizAnswers[activeExercise.id] ?? { selectedId: null, checked: false };
    stageContent = (
      <ConceptExerciseRunner
        key={activeExercise.id}
        lessonId={lessonId}
        exercise={activeExercise}
        isLast={isLastQuizSlide}
        answer={answer}
        onSelect={(optionId) =>
          setQuizAnswers((qa) => ({ ...qa, [activeExercise.id]: { selectedId: optionId, checked: false } }))
        }
        onChecked={(isCorrect) =>
          setQuizAnswers((qa) => ({ ...qa, [activeExercise.id]: { ...qa[activeExercise.id], checked: true, isCorrect } }))
        }
        onAdvance={handleQuizAdvance}
      />
    );
  } else {
    stageContent = contentSlides[index].node;
  }

  const activeNarrationUrl = !isQuizSlide && !quizFinished ? contentSlides[index]?.narrationUrl ?? null : null;

  // Hidden on the deck's truly last slide (a content slide with no quiz
  // tail after it) — nothing left to advance to inside the frame; the
  // page's own next-lesson nav below handles moving on from there.
  const showGenericContinue = !isQuizSlide && !quizFinished && index < totalSlides - 1;

  return (
    <div className="m01-slide-frame">
      <div className="m01-slide-frame__head">
        <div className="lesson-player__progress m01-slide-frame__progress" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={totalSlides}>
          {Array.from({ length: totalSlides }, (_, i) => (
            <span key={i} className="lesson-player__segment">
              <span className="lesson-player__segment-fill" style={{ transform: `scaleX(${i <= maxStep ? 1 : 0})` }} />
            </span>
          ))}
        </div>
        <span className="m01-slide-frame__counter">{index + 1}/{totalSlides}</span>
        {/* /belajar/kana/[moduleCode] is no longer a mandatory stop
            (Tugas 2) — closing a lesson goes straight back to /belajar. */}
        <Link href="/belajar" className="m01-slide-frame__close" aria-label="Tutup">✕</Link>
      </div>

      <div className="m01-slide-frame__stage">
        {/* Keyed off slide index, not narration URL — a fresh mount per
            slide is what stops a previous slide's audio from bleeding
            into the next one and resets the "auto" playback trigger. */}
        <NarrationButton key={index} url={activeNarrationUrl} />
        <div className="m01-slide-frame__stage-inner" style={stageStyle}>
          {stageContent}
          {showGenericContinue && (
            <button type="button" className="m01-slide-frame__continue" onClick={() => go(1)}>
              Lanjutkan →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
