"use client";

import { useState } from "react";

type View = "dashboard" | "learn" | "practice" | "review" | "tutor" | "conversation" | "jlpt" | "progress" | "settings" | "lesson";

type NavItem = { id: View; icon: string; label: string; badge?: string };

const navItems: NavItem[] = [
  { id: "dashboard", icon: "⌂", label: "Dashboard" },
  { id: "learn", icon: "道", label: "Learn" },
  { id: "practice", icon: "練", label: "Practice" },
  { id: "review", icon: "↻", label: "Review", badge: "12" },
  { id: "tutor", icon: "✦", label: "AI Tutor" },
  { id: "conversation", icon: "話", label: "Conversation" },
  { id: "jlpt", icon: "的", label: "JLPT" },
  { id: "progress", icon: "↗", label: "Progress" },
];

const lessons = [
  { no: "01", title: "Greetings", meta: "6 min · Vocabulary", state: "done" },
  { no: "02", title: "Introducing Yourself", meta: "8 min · Grammar", state: "active" },
  { no: "03", title: "Countries & Languages", meta: "7 min · Vocabulary", state: "next" },
] as const;

const pageMeta: Record<View, { eyebrow: string; title: string; copy: string }> = {
  dashboard: { eyebrow: "MONDAY, 17 AUGUST", title: "おはよう, Asro!", copy: "A little progress every day becomes fluency." },
  learn: { eyebrow: "YOUR CURRICULUM", title: "My Learning Path", copy: "A guided route from your first word to confident Japanese." },
  practice: { eyebrow: "BUILD YOUR SKILLS", title: "Practice", copy: "Short, focused sessions that reinforce what you learn." },
  review: { eyebrow: "SPACED REPETITION", title: "Review Today", copy: "Strengthen the items most likely to slip from memory." },
  tutor: { eyebrow: "PERSONAL SUPPORT", title: "AI Japanese Tutor", copy: "Ask questions, request explanations, and practice at your level." },
  conversation: { eyebrow: "REAL-LIFE JAPANESE", title: "Conversation", copy: "Practice useful situations in a safe, guided space." },
  jlpt: { eyebrow: "EXAM PREPARATION", title: "JLPT Path", copy: "Build exam readiness without losing sight of real Japanese." },
  progress: { eyebrow: "YOUR DEVELOPMENT", title: "Progress", copy: "See what is improving and where to focus next." },
  settings: { eyebrow: "YOUR ACCOUNT", title: "Settings", copy: "Shape Japanese Lingo Path around the way you learn." },
  lesson: { eyebrow: "N5 · UNIT 1", title: "Introducing Yourself", copy: "Lesson shell · content modules will be added gradually." },
};

function Brand() {
  return (
    <div className="brand" aria-label="Japanese Lingo Path">
      <div className="brand-mark"><span>日</span></div>
      <div className="brand-name"><small>Japanese</small><strong>Lingo <em>Path</em></strong></div>
    </div>
  );
}

function PageHeader({ view }: { view: View }) {
  const meta = pageMeta[view];
  return (
    <section className="page-heading">
      <p className="eyebrow">{meta.eyebrow}</p>
      <h1>{meta.title}</h1>
      <p className="welcome-copy">{meta.copy}</p>
    </section>
  );
}

function Dashboard({ go }: { go: (view: View) => void }) {
  return (
    <>
      <section className="welcome-row">
        <PageHeader view="dashboard" />
        <div className="daily-goal">
          <div className="goal-ring"><span>18</span><small>/ 30 min</small></div>
          <div><small>DAILY GOAL</small><strong>12 minutes to go</strong></div>
        </div>
      </section>

      <section className="hero-card">
        <div className="hero-copy">
          <span className="card-kicker">CONTINUE YOUR PATH</span>
          <h2>First conversations<br />start with <em>こんにちは</em></h2>
          <p>N5 · Unit 1 · Lesson 2</p>
          <button className="primary-button" onClick={() => go("lesson")}>Continue lesson <span>→</span></button>
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
            <button className="text-button" onClick={() => go("learn")}>View learning path →</button>
          </div>
          <div className="lesson-list">
            {lessons.map((lesson) => (
              <article className={`lesson-row ${lesson.state}`} key={lesson.no}>
                <span className="lesson-no">{lesson.state === "done" ? "✓" : lesson.no}</span>
                <div><strong>{lesson.title}</strong><small>{lesson.meta}</small></div>
                <button className="lesson-action" onClick={() => lesson.state === "active" && go("lesson")}>
                  {lesson.state === "done" ? "Completed" : lesson.state === "active" ? "Continue →" : "○"}
                </button>
              </article>
            ))}
          </div>
        </div>

        <aside className="review-panel">
          <span className="card-kicker dark">REVIEW TODAY</span>
          <div className="review-count"><strong>12</strong><span>items waiting</span></div>
          <div className="review-types">
            <div><span className="dot red"></span><strong>7</strong><small>Words</small></div>
            <div><span className="dot blue"></span><strong>3</strong><small>Kanji</small></div>
            <div><span className="dot pink"></span><strong>2</strong><small>Grammar</small></div>
          </div>
          <button className="secondary-button" onClick={() => go("review")}>Start 5-min review</button>
          <p>Next review refreshes in 4 hours</p>
        </aside>
      </section>
    </>
  );
}

function Learn({ go }: { go: (view: View) => void }) {
  const units = [
    { number: "01", title: "First Steps in Japanese", detail: "Greetings, introductions, countries", progress: 36, state: "Current" },
    { number: "02", title: "Everyday Basics", detail: "Numbers, time, family, daily actions", progress: 0, state: "Next" },
    { number: "03", title: "Around Town", detail: "Places, directions, shopping", progress: 0, state: "Planned" },
    { number: "04", title: "Daily Life", detail: "Routines, hobbies, invitations", progress: 0, state: "Planned" },
  ];
  return (
    <>
      <PageHeader view="learn" />
      <div className="path-overview">
        <div><span className="level-big">N5</span><div><small>CURRENT LEVEL</small><strong>Foundation Japanese</strong></div></div>
        <div className="path-progress"><span><i style={{ width: "18%" }}></i></span><small>18% complete</small></div>
        <button className="primary-button compact" onClick={() => go("lesson")}>Continue path →</button>
      </div>
      <section className="unit-list">
        {units.map((unit) => (
          <article className={`unit-card ${unit.state === "Current" ? "current" : ""}`} key={unit.number}>
            <div className="unit-number">{unit.number}</div>
            <div className="unit-info"><small>{unit.state}</small><h3>{unit.title}</h3><p>{unit.detail}</p></div>
            <div className="unit-progress"><strong>{unit.progress}%</strong><span><i style={{ width: `${unit.progress}%` }}></i></span></div>
            <button aria-label={`Open ${unit.title}`} onClick={() => unit.state === "Current" && go("lesson")}>{unit.state === "Current" ? "→" : "○"}</button>
          </article>
        ))}
      </section>
    </>
  );
}

function Practice({ notify }: { notify: (message: string) => void }) {
  const modes = [
    ["語", "Vocabulary", "Words and meanings", "12 due"],
    ["文", "Grammar", "Patterns and particles", "6 sets"],
    ["漢", "Kanji", "Meaning and readings", "8 due"],
    ["聴", "Listening", "Comprehension drills", "Coming next"],
  ];
  return (
    <>
      <PageHeader view="practice" />
      <section className="focus-banner"><div><span>✦ RECOMMENDED FOR YOU</span><h2>Practice your weak points</h2><p>A short mixed set based on recent mistakes.</p></div><button className="primary-button" onClick={() => notify("Practice session shell is ready. Questions will be added in the next content phase.")}>Start 5-minute session →</button></section>
      <section className="mode-grid">
        {modes.map(([icon, title, copy, meta]) => (
          <button className="mode-card" key={title} onClick={() => notify(`${title} module is ready for content.`)}>
            <span className="mode-icon">{icon}</span><small>{meta}</small><h3>{title}</h3><p>{copy}</p><b>Open module →</b>
          </button>
        ))}
      </section>
      <EmptySlot label="CUSTOM PRACTICE" title="Question sets will live here" copy="Filters for level, skill, topic, and session length are reserved in this space." />
    </>
  );
}

function Review({ notify }: { notify: (message: string) => void }) {
  const items = [["食べる", "たべる · to eat", "Vocabulary", "Due now"], ["学", "study · ガク / まなぶ", "Kanji", "Due now"], ["～たい", "want to do…", "Grammar", "In 2 hours"]];
  return (
    <>
      <PageHeader view="review" />
      <section className="review-summary">
        <div><small>DUE NOW</small><strong>12</strong><span>items</span></div><div><small>LEARNING</small><strong>28</strong><span>items</span></div><div><small>MASTERED</small><strong>64</strong><span>items</span></div>
        <button className="primary-button" onClick={() => notify("Review player shell is ready. Spaced-repetition logic will be connected later.")}>Start review →</button>
      </section>
      <section className="table-card">
        <div className="table-title"><div><span className="card-kicker dark">UP NEXT</span><h3>Review queue</h3></div><button className="text-button">View all</button></div>
        {items.map(([title, detail, type, due]) => <div className="review-item" key={title}><div className="review-symbol">{title.slice(0, 1)}</div><div><strong>{title}</strong><small>{detail}</small></div><span>{type}</span><time>{due}</time><button onClick={() => notify(`${title} is ready for a future flashcard.`)}>→</button></div>)}
      </section>
    </>
  );
}

function Tutor({ notify }: { notify: (message: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const submit = () => { if (prompt.trim()) { notify("Tutor interface works. The AI service will be connected in a later phase."); setPrompt(""); } };
  return (
    <>
      <PageHeader view="tutor" />
      <section className="tutor-shell">
        <div className="tutor-orb">先生<span>AI</span></div>
        <span className="status-pill">Tutor shell · offline</span>
        <h2>What would you like to understand?</h2>
        <p>The interface is ready for explanations, correction, and personalized practice.</p>
        <div className="prompt-box"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask anything about Japanese…" aria-label="Ask the AI tutor"/><button onClick={submit}>↑</button></div>
        <div className="suggestion-row">{["Explain は vs が", "Correct my sentence", "Give me N5 practice"].map((item) => <button key={item} onClick={() => setPrompt(item)}>{item}</button>)}</div>
      </section>
      <EmptySlot label="RECENT CONVERSATIONS" title="Your tutor history will appear here" copy="Questions and explanations will be saved once accounts and the AI service are connected." />
    </>
  );
}

function Conversation({ notify }: { notify: (message: string) => void }) {
  const scenarios = [["🍜", "At a Restaurant", "Beginner", "Order a meal politely"], ["👋", "Self Introduction", "Beginner", "Meet someone for the first time"], ["🛍", "Shopping", "Beginner", "Ask about price and size"], ["🚉", "Asking Directions", "Beginner", "Find your way around town"], ["☕", "Daily Conversation", "Planned", "Practice casual small talk"]];
  return (
    <>
      <PageHeader view="conversation" />
      <div className="conversation-controls"><div><span>Mode</span><button className="selected">Text</button><button>Voice later</button></div><div><span>Difficulty</span><button className="selected">Easy</button><button>Normal</button></div></div>
      <section className="scenario-grid">{scenarios.map(([icon, title, level, copy]) => <button className="scenario-card" key={title} onClick={() => notify(`${title} conversation room is scaffolded for a later dialogue engine.`)}><span>{icon}</span><small>{level}</small><h3>{title}</h3><p>{copy}</p><b>Start scenario →</b></button>)}</section>
    </>
  );
}

function Jlpt({ notify }: { notify: (message: string) => void }) {
  return (
    <>
      <PageHeader view="jlpt" />
      <section className="jlpt-hero"><div><small>YOUR CURRENT TARGET</small><span className="level-big">N5</span><h2>Foundation level</h2><p>Vocabulary, kanji, grammar, reading, and listening will be developed module by module.</p></div><div className="readiness"><div><strong>24%</strong><span>readiness</span></div><p>Early estimate · sample data</p></div></section>
      <section className="jlpt-levels">{["N5", "N4", "N3", "N2", "N1"].map((level, index) => <button className={index === 0 ? "active" : ""} key={level} onClick={() => notify(index === 0 ? "N5 content structure is ready." : `${level} is reserved for a later curriculum phase.`)}><strong>{level}</strong><span>{index === 0 ? "In progress" : index === 1 ? "Planned" : "Locked"}</span></button>)}</section>
      <EmptySlot label="N5 PREPARATION" title="Exam modules are reserved" copy="Vocabulary, kanji, grammar, reading, listening, and mock-test cards will be added here." />
    </>
  );
}

function Progress() {
  const skills = [["Vocabulary", 42, "+8%"], ["Grammar", 31, "+5%"], ["Kanji", 24, "+4%"], ["Reading", 18, "+3%"], ["Listening", 12, "New"]];
  return (
    <>
      <PageHeader view="progress" />
      <section className="metric-grid"><div><small>STUDY TIME</small><strong>3h 42m</strong><span>This month</span></div><div><small>LESSONS</small><strong>8</strong><span>Completed</span></div><div><small>ACCURACY</small><strong>76%</strong><span>All practice</span></div><div><small>STREAK</small><strong>7 days</strong><span>Personal best</span></div></section>
      <section className="progress-layout"><div className="table-card"><div className="table-title"><div><span className="card-kicker dark">SKILL MAP</span><h3>Your current foundation</h3></div></div>{skills.map(([skill, value, change]) => <div className="skill-row" key={skill}><strong>{skill}</strong><span><i style={{ width: `${value}%` }}></i></span><b>{value}%</b><small>{change}</small></div>)}</div><aside className="insight-card"><span>✦ AI INSIGHT</span><h3>Your path is just beginning</h3><p>Once more activity is collected, personalized observations and recommendations will appear here.</p><div className="insight-placeholder"><i></i><i></i><i></i></div></aside></section>
    </>
  );
}

function Settings({ notify }: { notify: (message: string) => void }) {
  return (
    <>
      <PageHeader view="settings" />
      <section className="settings-grid">
        <div className="settings-menu">{["Profile", "Learning preferences", "Daily goal", "Notifications", "Audio", "AI preferences", "Subscription"].map((item, index) => <button className={index === 0 ? "active" : ""} key={item}>{item}<span>→</span></button>)}</div>
        <div className="settings-form"><span className="card-kicker dark">PROFILE</span><div className="large-avatar">AR</div><label>Display name<input defaultValue="Asro" /></label><label>Native language<select defaultValue="Indonesian"><option>Indonesian</option><option>English</option></select></label><label>Current goal<select defaultValue="General Japanese"><option>General Japanese</option><option>JLPT</option><option>Conversation</option></select></label><button className="primary-button" onClick={() => notify("Profile changes are ready to connect to account storage.")}>Save changes</button></div>
      </section>
    </>
  );
}

function Lesson({ go, notify }: { go: (view: View) => void; notify: (message: string) => void }) {
  return (
    <>
      <button className="back-button" onClick={() => go("learn")}>← Back to learning path</button>
      <PageHeader view="lesson" />
      <div className="lesson-progress-top"><span><i style={{ width: "20%" }}></i></span><small>1 of 5 sections</small></div>
      <section className="lesson-layout">
        <div className="lesson-canvas">
          <div className="lesson-intro"><span className="japanese-chip">はじめまして</span><h2>Nice to meet you</h2><p>This is the lesson container. Vocabulary, grammar explanations, audio, examples, and exercises can be added as independent content blocks.</p></div>
          <div className="content-slots"><article><span>01</span><div><small>CONTENT BLOCK</small><h3>Vocabulary introduction</h3><p>Reserved for words, audio, and examples.</p></div><b>Empty</b></article><article><span>02</span><div><small>CONTENT BLOCK</small><h3>Grammar explanation</h3><p>Reserved for patterns, formation, and notes.</p></div><b>Empty</b></article><article><span>03</span><div><small>PRACTICE BLOCK</small><h3>Quick check</h3><p>Reserved for interactive questions.</p></div><b>Empty</b></article></div>
          <button className="primary-button" onClick={() => notify("Lesson navigation is ready. Content comes next.")}>Continue to next section →</button>
        </div>
        <aside className="lesson-outline"><span className="card-kicker dark">LESSON OUTLINE</span>{["Welcome", "Vocabulary", "Grammar", "Examples", "Quick check"].map((item, index) => <div className={index === 0 ? "active" : ""} key={item}><span>{index + 1}</span><strong>{item}</strong></div>)}</aside>
      </section>
    </>
  );
}

function EmptySlot({ label, title, copy }: { label: string; title: string; copy: string }) {
  return <section className="empty-slot"><div className="empty-icon">＋</div><div><span className="card-kicker dark">{label}</span><h3>{title}</h3><p>{copy}</p></div></section>;
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [toast, setToast] = useState("");
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3600); };
  const go = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Main navigation">
          <p className="nav-label">YOUR JOURNEY</p>
          {navItems.map((item) => <button className={`nav-item ${view === item.id || (view === "lesson" && item.id === "learn") ? "active" : ""}`} onClick={() => go(item.id)} key={item.id}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}</button>)}
        </nav>
        <div className="sidebar-footer"><div className="streak-card"><span className="streak-flame">火</span><div><strong>7 day streak</strong><small>Keep your rhythm going!</small></div></div><button className="profile-row" onClick={() => go("settings")}><div className="avatar">AR</div><div><strong>Asro</strong><small>Beginner · N5</small></div><span>•••</span></button></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><button className="mobile-brand" onClick={() => go("dashboard")}><span>日</span> Japanese Lingo Path</button><span className="prototype-pill">PROTOTYPE SHELL</span><div className="top-actions"><button className="icon-button" aria-label="Notifications" onClick={() => notify("No new notifications.")}>◦</button><button className="level-pill" onClick={() => go("progress")}><span>初心者</span> N5 Beginner</button></div></header>
        <div className="content">
          {view === "dashboard" && <Dashboard go={go} />}
          {view === "learn" && <Learn go={go} />}
          {view === "practice" && <Practice notify={notify} />}
          {view === "review" && <Review notify={notify} />}
          {view === "tutor" && <Tutor notify={notify} />}
          {view === "conversation" && <Conversation notify={notify} />}
          {view === "jlpt" && <Jlpt notify={notify} />}
          {view === "progress" && <Progress />}
          {view === "settings" && <Settings notify={notify} />}
          {view === "lesson" && <Lesson go={go} notify={notify} />}
        </div>
        <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.slice(0, 5).map((item) => <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => go(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
      </section>
      {toast && <div className="toast" role="status"><span>✓</span>{toast}<button aria-label="Close notification" onClick={() => setToast("")}>×</button></div>}
    </main>
  );
}
