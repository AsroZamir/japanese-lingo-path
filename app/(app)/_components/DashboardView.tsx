"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "./PageHeader";
import { dailyGoal, reviewSummary, reviewBreakdown } from "@/app/lib/mock-data";

const lessons = [
  { no: "01", title: "How Japanese Writing Works", meta: "Preview · Orientation", state: "done" },
  { no: "02", title: "Japanese Sounds", meta: "Shell · Pronunciation", state: "active" },
  { no: "03", title: "Japanese Sentence Basics", meta: "Shell · Grammar awareness", state: "next" },
] as const;

export function DashboardView({ userName }: { userName: string }) {
  const router = useRouter();

  return (
    <>
      <section className="welcome-row">
        <PageHeader eyebrow="MONDAY, 17 AUGUST" title={`おはよう, ${userName}!`} copy="A little progress every day becomes fluency." />
        <div className="daily-goal">
          <div className="goal-ring"><span>{dailyGoal.minutesCompleted}</span><small>/ {dailyGoal.minutesTarget} min</small></div>
          <div><small>DAILY GOAL</small><strong>{dailyGoal.minutesTarget - dailyGoal.minutesCompleted} minutes to go</strong></div>
        </div>
      </section>

      <section className="hero-card">
        <div className="hero-copy">
          <span className="card-kicker">CONTINUE YOUR PATH</span>
          <h2>Your Japanese journey<br />starts with <em>あ・ア・日</em></h2>
          <p>Pre-N5 · Unit P0 · Japanese Orientation</p>
          <button className="primary-button" onClick={() => router.push("/belajar/P0")}>Open orientation <span>→</span></button>
        </div>
        <div className="path-art" aria-hidden="true">
          <div className="sun"></div><div className="mountain mountain-back"></div><div className="mountain mountain-front"></div>
          <div className="path-line"></div><div className="torii"><i></i><b></b><span></span></div>
          <div className="petal p1">◆</div><div className="petal p2">◆</div><div className="petal p3">◆</div>
        </div>
      </section>

      <section className="grid-section">
        <div className="section-main">
          <div className="section-heading">
            <div><span className="card-kicker dark">YOUR CURRENT UNIT</span><h3>First Steps in Japanese</h3></div>
            <button className="text-button" onClick={() => router.push("/belajar")}>View learning path →</button>
          </div>
          <div className="lesson-list">
            {lessons.map((lesson) => (
              <article className={`lesson-row ${lesson.state}`} key={lesson.no}>
                <span className="lesson-no">{lesson.state === "done" ? "✓" : lesson.no}</span>
                <div><strong>{lesson.title}</strong><small>{lesson.meta}</small></div>
                <button className="lesson-action" onClick={() => lesson.state === "active" && router.push("/belajar/P0")}>
                  {lesson.state === "done" ? "Completed" : lesson.state === "active" ? "Continue →" : "○"}
                </button>
              </article>
            ))}
          </div>
        </div>

        <aside className="review-panel">
          <span className="card-kicker dark">REVIEW TODAY</span>
          <div className="review-count"><strong>{reviewSummary.dueNow}</strong><span>items waiting</span></div>
          <div className="review-types">
            {reviewBreakdown.map((item) => (
              <div key={item.type}><span className={`dot ${item.dot}`}></span><strong>{item.count}</strong><small>{item.type}</small></div>
            ))}
          </div>
          <button className="secondary-button" onClick={() => router.push("/ulangi")}>Start 5-min review</button>
          <p>Next review refreshes in 4 hours</p>
        </aside>
      </section>
    </>
  );
}
