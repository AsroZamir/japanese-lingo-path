"use client";

import { useState } from "react";
import { curriculumUnits, getLessonBlueprint, levelDetails, masteryStages, skillTracks, type CurriculumLevel, type CurriculumUnit } from "./curriculum-data";

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
  { no: "01", title: "How Japanese Writing Works", meta: "Preview · Orientation", state: "done" },
  { no: "02", title: "Japanese Sounds", meta: "Shell · Pronunciation", state: "active" },
  { no: "03", title: "Japanese Sentence Basics", meta: "Shell · Grammar awareness", state: "next" },
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
          <h2>Your Japanese journey<br />starts with <em>あ・ア・日</em></h2>
          <p>Pre-N5 · Unit P0 · Japanese Orientation</p>
          <button className="primary-button" onClick={() => go("lesson")}>Open orientation <span>→</span></button>
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

function metricCount(scope: string) {
  return scope.match(/\d+(?:–\d+)?/)?.[0] ?? "Review";
}

function Learn({ openUnit }: { openUnit: (unit: CurriculumUnit) => void }) {
  const [level, setLevel] = useState<CurriculumLevel>("PRE_N5");
  const units = curriculumUnits.filter((unit) => unit.level === level);
  const details = levelDetails[level];
  return (
    <>
      <PageHeader view="learn" />
      <div className="curriculum-tabs" role="tablist" aria-label="Pilih level kurikulum">
        {(["PRE_N5", "N5"] as CurriculumLevel[]).map((item) => <button role="tab" aria-selected={level === item} className={level === item ? "active" : ""} onClick={() => setLevel(item)} key={item}><strong>{levelDetails[item].label}</strong><span>{levelDetails[item].name}</span></button>)}
      </div>
      <section className="curriculum-overview">
        <div className="curriculum-overview-copy"><span className="blueprint-badge">BLUEPRINT READY</span><p className="eyebrow">{details.label} CURRICULUM</p><h2>{details.name}</h2><p>{details.description}</p><div className="curriculum-meta"><span>{details.unitCount}</span><span>{details.lessonCount}</span><span>7 kemampuan utama</span></div></div>
        <div className="curriculum-target"><small>EXIT TARGET</small><p>{details.exitTarget}</p><div>{details.stats.map((stat) => <span key={stat}>{stat}</span>)}</div></div>
      </section>
      <div className="curriculum-section-heading"><div><span className="card-kicker dark">COMPLETE UNIT MAP</span><h3>{details.unitCount} sudah memiliki cangkang modul</h3></div><p>Pilih unit untuk melihat rincian dan preview.</p></div>
      <section className="unit-list curriculum-unit-list">
        {units.map((unit) => (
          <article className="unit-card curriculum-unit" key={unit.id}>
            <div className="unit-number">{unit.code}</div>
            <div className="unit-info"><small>{unit.focus}</small><h3>{unit.title}</h3><p>{unit.subtitle}</p><div className="unit-tags">{unit.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div></div>
            <div className="unit-inventory"><span><small>LESSONS</small>{unit.lessons.length}</span><span><small>VOCAB</small>{unit.vocabulary}</span><span><small>KANJI</small>{unit.kanji}</span><span><small>GRAMMAR</small>{unit.grammar}</span><span><small>READ</small>{metricCount(unit.operations.reading)}</span><span><small>LISTEN</small>{metricCount(unit.operations.listening)}</span><b>{unit.operations.speaking} · {unit.operations.writing}</b></div>
            <button aria-label={`Buka ${unit.title}`} onClick={() => openUnit(unit)}>→</button>
          </article>
        ))}
      </section>
      <section className="curriculum-footer-map"><div><span className="card-kicker dark">SKILL COVERAGE</span><h3>Satu jalur, kemampuan yang terhubung</h3></div><div>{skillTracks.map((skill) => <span key={skill}>{skill}</span>)}</div></section>
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

function Lesson({ go, notify, unit }: { go: (view: View) => void; notify: (message: string) => void; unit: CurriculumUnit }) {
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const activeLesson = getLessonBlueprint(unit, activeLessonIndex);
  const operationalScope = [
    ["課", "Lessons", `${unit.lessons.length} operational flows`],
    ["語", "Vocabulary", unit.operations.vocabulary],
    ["字", "Kana / Kanji", unit.operations.script],
    ["文", "Grammar", unit.operations.grammar],
    ["読", "Reading", unit.operations.reading],
    ["聴", "Listening", unit.operations.listening],
    ["話", "Speaking", unit.operations.speaking],
    ["書", "Writing", unit.operations.writing],
    ["練", "Practice", unit.operations.practice],
  ];
  const modules = [
    ["01", "Objectives & Can-do", `${unit.objectives.length} objectives · ${unit.canDo.length} can-do targets`, "Ready"],
    ["02", "Vocabulary Bank", unit.operations.vocabulary, "Specified"],
    ["03", "Kana & Kanji Bank", unit.operations.script, "Specified"],
    ["04", "Grammar & Expressions", unit.operations.grammar, "Specified"],
    ["05", "Reading Assets", unit.operations.reading, "Specified"],
    ["06", "Listening Assets", unit.operations.listening, "Specified"],
    ["07", "Speaking Tasks", unit.operations.speaking, "Specified"],
    ["08", "Writing Tasks", unit.operations.writing, "Specified"],
    ["09", "Exercise Bank", unit.operations.practice, "Specified"],
    ["10", "Checkpoint & Review", unit.operations.assessment, "Ready"],
  ];
  return (
    <>
      <button className="back-button" onClick={() => go("learn")}>← Kembali ke peta kurikulum</button>
      <section className="unit-detail-hero">
        <div><div className="detail-labels"><span>{levelDetails[unit.level].label}</span><b>OPERATIONAL BLUEPRINT</b></div><p className="eyebrow">UNIT {unit.code} · {unit.focus.toUpperCase()}</p><h1>{unit.title}</h1><p>{unit.subtitle}</p><div className="unit-tags hero-tags">{unit.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>
        <div className="unit-detail-score"><small>LESSON FLOWS</small><strong>{unit.lessons.length}</strong><span>fully specified</span><i>Assets can be produced gradually</i></div>
      </section>
      <section className="unit-goals-grid">
        <article><span className="card-kicker dark">LEARNING OBJECTIVES</span>{unit.objectives.map((item) => <p key={item}><i>✓</i>{item}</p>)}</article>
        <article><span className="card-kicker dark">CAN-DO OUTCOMES</span>{unit.canDo.map((item) => <p key={item}><i>→</i>{item}</p>)}</article>
      </section>
      <section className="operational-scope-section">
        <div className="curriculum-section-heading"><div><span className="card-kicker dark">UNIT INVENTORY</span><h3>Semua aset belajar yang harus diproduksi</h3></div><p>Target khusus untuk unit {unit.code}.</p></div>
        <div className="operational-scope-grid">{operationalScope.map(([icon, label, value]) => <article key={label}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>)}</div>
      </section>
      <section className="curriculum-detail-layout">
        <div>
          <div className="curriculum-section-heading"><div><span className="card-kicker dark">CONTENT ARCHITECTURE</span><h3>Sepuluh jalur produksi konten</h3></div><p>Struktur sudah final; isi dibangun bertahap.</p></div>
          <div className="module-shell-grid">{modules.map(([number, title, copy, state]) => <button key={number} onClick={() => notify(`${title}: spesifikasi sudah siap untuk tahap produksi konten.`)}><span>{number}</span><div><small>PRODUCTION MODULE</small><h3>{title}</h3><p>{copy}</p></div><b className="ready">{state}</b></button>)}</div>
        </div>
        <aside className="unit-preview-card"><span className="card-kicker">CONTENT PREVIEW</span><div className="preview-symbol">{unit.previews[0].slice(0, 3)}</div><h3>Contoh isi unit</h3>{unit.previews.map((item, index) => <div className="preview-line" key={item}><span>0{index + 1}</span><p>{item}</p><button onClick={() => notify("Slot audio, model pelafalan, dan rubrik sudah masuk dalam blueprint lesson.")}>▷</button></div>)}<div className="preview-checkpoint"><small>UNIT ASSESSMENT</small><p>{unit.checkpoint}</p></div></aside>
      </section>
      <section className="lesson-blueprint-section">
        <div className="curriculum-section-heading"><div><span className="card-kicker dark">LESSON BLUEPRINTS</span><h3>Buka setiap lesson untuk melihat rancangan lengkap</h3></div><p>{unit.lessons.length} lesson · practice flow · asset plan · mastery gate</p></div>
        <div className="lesson-blueprint-layout">
          <aside className="lesson-blueprint-rail" aria-label={`Daftar lesson ${unit.title}`}>
            <div><small>UNIT {unit.code}</small><strong>{unit.lessons.length} operational lessons</strong></div>
            {unit.lessons.map((lesson, index) => <button className={activeLessonIndex === index ? "active" : ""} aria-pressed={activeLessonIndex === index} onClick={() => setActiveLessonIndex(index)} key={lesson}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{lesson}</strong><small>{getLessonBlueprint(unit, index).phase}</small></div><b>→</b></button>)}
          </aside>
          <article className="lesson-blueprint-canvas">
            <header><div><span className="blueprint-badge">LESSON {String(activeLessonIndex + 1).padStart(2, "0")} · SPECIFICATION READY</span><p className="eyebrow">{activeLesson.phase} · {activeLesson.duration}</p><h2>{activeLesson.title}</h2></div><div className="lesson-sequence">{activeLessonIndex + 1}<small>/ {unit.lessons.length}</small></div></header>
            <section className="lesson-objective"><span>OBJECTIVE</span><p>{activeLesson.objective}</p></section>
            <div className="lesson-target-grid">{activeLesson.contentTargets.map((target) => <article key={target.label}><small>{target.label}</small><strong>{target.target}</strong><p>Unit scope: {target.scope}</p></article>)}</div>
            <section className="practice-flow"><div className="lesson-plan-heading"><span className="card-kicker dark">PRACTICE FLOW</span><h3>Enam tahap dalam lesson ini</h3></div><div>{activeLesson.practiceFlow.map((step) => <article key={step.step}><span>{step.step}</span><div><strong>{step.label}</strong><p>{step.detail}</p></div></article>)}</div></section>
            <section className="skill-task-section"><div className="lesson-plan-heading"><span className="card-kicker dark">SKILL TASKS</span><h3>Input dan output yang terhubung</h3></div><div className="skill-task-grid">{activeLesson.skillTasks.map((task) => <article key={task.skill}><span>{task.skill.slice(0, 1)}</span><div><strong>{task.skill}</strong><p>{task.task}</p></div></article>)}</div></section>
            <div className="lesson-support-grid">
              <section><span className="card-kicker dark">ASSETS REQUIRED</span><div>{activeLesson.assets.map((asset) => <span key={asset}>✓ {asset}</span>)}</div></section>
              <section><span className="card-kicker dark">EXAMPLE BANK</span>{activeLesson.examples.map((example, index) => <p key={example}><b>0{index + 1}</b>{example}</p>)}</section>
            </div>
            <footer className="lesson-mastery-gate"><div><small>MASTERY GATE</small><strong>{activeLesson.masteryGate}</strong></div><button onClick={() => notify(`${activeLesson.title}: siap masuk tahap penulisan konten dan soal.`)}>Mark for content production →</button></footer>
          </article>
        </div>
      </section>
      <section className="mastery-roadmap"><div><span className="card-kicker">MASTERY SYSTEM</span><h3>Setiap item bergerak dari baru hingga dikuasai</h3><p>Review akan dijadwalkan berdasarkan performa di setiap tahap.</p></div><div>{masteryStages.map((stage, index) => <span key={stage}><b>{index + 1}</b>{stage}</span>)}</div></section>
    </>
  );
}
function EmptySlot({ label, title, copy }: { label: string; title: string; copy: string }) {
  return <section className="empty-slot"><div className="empty-icon">＋</div><div><span className="card-kicker dark">{label}</span><h3>{title}</h3><p>{copy}</p></div></section>;
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedUnit, setSelectedUnit] = useState<CurriculumUnit>(curriculumUnits[0]);
  const [toast, setToast] = useState("");
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3600); };
  const go = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openUnit = (unit: CurriculumUnit) => { setSelectedUnit(unit); go("lesson"); };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Main navigation">
          <p className="nav-label">YOUR JOURNEY</p>
          {navItems.map((item) => <button className={`nav-item ${view === item.id || (view === "lesson" && item.id === "learn") ? "active" : ""}`} onClick={() => go(item.id)} key={item.id}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}</button>)}
        </nav>
        <div className="sidebar-footer"><div className="streak-card"><span className="streak-flame">火</span><div><strong>7 day streak</strong><small>Keep your rhythm going!</small></div></div><button className="profile-row" onClick={() => go("settings")}><div className="avatar">AR</div><div><strong>Asro</strong><small>Starter · Pre-N5</small></div><span>•••</span></button></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><button className="mobile-brand" onClick={() => go("dashboard")}><span>日</span> Japanese Lingo Path</button><span className="prototype-pill">PROTOTYPE SHELL</span><div className="top-actions"><button className="icon-button" aria-label="Notifications" onClick={() => notify("No new notifications.")}>◦</button><button className="level-pill" onClick={() => go("progress")}><span>初心者</span> Pre-N5 Starter</button></div></header>
        <div className="content">
          {view === "dashboard" && <Dashboard go={go} />}
          {view === "learn" && <Learn openUnit={openUnit} />}
          {view === "practice" && <Practice notify={notify} />}
          {view === "review" && <Review notify={notify} />}
          {view === "tutor" && <Tutor notify={notify} />}
          {view === "conversation" && <Conversation notify={notify} />}
          {view === "jlpt" && <Jlpt notify={notify} />}
          {view === "progress" && <Progress />}
          {view === "settings" && <Settings notify={notify} />}
          {view === "lesson" && <Lesson go={go} notify={notify} unit={selectedUnit} />}
        </div>
        <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.slice(0, 5).map((item) => <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => go(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
      </section>
      {toast && <div className="toast" role="status"><span>✓</span>{toast}<button aria-label="Close notification" onClick={() => setToast("")}>×</button></div>}
    </main>
  );
}
