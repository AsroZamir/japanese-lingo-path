"use client";

import { useState } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { curriculumUnits, getLessonBlueprint, levelDetails, masteryStages } from "@/app/curriculum-data";
import { useToast } from "../../_components/toast-provider";

function metricCount(scope: string) {
  return scope.match(/\d+(?:–\d+)?/)?.[0] ?? "Review";
}

export default function LessonPage() {
  const router = useRouter();
  const notify = useToast();
  const { unitId } = useParams<{ unitId: string }>();
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);

  const unit = curriculumUnits.find((item) => item.id === unitId);
  if (!unit) notFound();

  const activeLesson = getLessonBlueprint(unit, activeLessonIndex);
  const moduleContents = [
    ["課", "Pelajaran", `${unit.lessons.length} pelajaran`],
    ["語", "Kosakata", `${unit.vocabulary} kata & ungkapan`],
    ["字", "Huruf & Kanji", unit.kanji === "—" ? "Pengenalan dasar" : `${unit.kanji} kanji`],
    ["文", "Pola Kalimat", unit.grammar === "—" ? "Pengenalan dasar" : `${unit.grammar} pola`],
    ["読", "Membaca", `${metricCount(unit.operations.reading)} latihan`],
    ["聴", "Mendengar", `${metricCount(unit.operations.listening)} latihan`],
    ["話", "Berbicara", `${metricCount(unit.operations.speaking)} tugas`],
    ["書", "Menulis", `${metricCount(unit.operations.writing)} tugas`],
  ];
  const moduleFlow = [
    ["学", "Pelajari", "Baca penjelasan, dengarkan audio, dan lihat contoh."],
    ["練", "Latihan", "Jawab soal singkat dengan petunjuk bertahap."],
    ["話", "Praktik", "Gunakan materi melalui tugas kemampuan."],
    ["復", "Review", "Ulangi jawaban yang masih keliru."],
    ["試", "Ujian Modul", "Selesaikan tantangan akhir untuk lanjut."],
  ];

  return (
    <>
      <button className="back-button" onClick={() => router.push("/belajar")}>← Kembali ke daftar modul</button>
      <section className="unit-detail-hero">
        <div><div className="detail-labels"><span>{levelDetails[unit.level].label}</span><b>MODUL {unit.code}</b></div><p className="eyebrow">{unit.focus.toUpperCase()}</p><h1>{unit.title}</h1><p>{unit.subtitle}</p><div className="unit-tags hero-tags">{unit.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>
        <div className="unit-detail-score"><small>ISI MODUL</small><strong>{unit.lessons.length}</strong><span>pelajaran berurutan</span><i>Ujian modul tersedia di bagian akhir</i></div>
      </section>
      <section className="unit-goals-grid">
        <article><span className="card-kicker dark">YANG AKAN DIPELAJARI</span>{unit.objectives.map((item) => <p key={item}><i>✓</i>{item}</p>)}</article>
        <article><span className="card-kicker dark">SETELAH MODUL INI, ANDA BISA</span>{unit.canDo.map((item) => <p key={item}><i>→</i>{item}</p>)}</article>
      </section>
      <section className="module-content-section">
        <div className="curriculum-section-heading"><div><span className="card-kicker dark">RINGKASAN MODUL</span><h3>Yang akan Anda pelajari</h3></div><p>Gambaran sederhana isi Modul {unit.code}.</p></div>
        <div className="module-learning-overview-grid">{moduleContents.map(([icon, label, value]) => <article key={label}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>)}</div>
      </section>
      <section className="module-flow-section">
        <div className="curriculum-section-heading"><div><span className="card-kicker dark">URUTAN BELAJAR</span><h3>Alur belajar Modul {unit.code}</h3></div><p>Ikuti lima tahap ini secara berurutan.</p></div>
        <div className="module-flow-layout">
          <div className="module-user-flow">{moduleFlow.map(([icon, title, copy], index) => <article key={title}><div className="module-flow-number"><span>{index + 1}</span><b>{icon}</b></div><div><strong>{title}</strong><p>{copy}</p></div>{index < moduleFlow.length - 1 ? <i aria-hidden="true">↓</i> : null}</article>)}</div>
          <aside className="unit-preview-card"><span className="card-kicker">CONTOH MATERI</span><div className="preview-symbol">{unit.previews[0].slice(0, 3)}</div><h3>Sedikit gambaran isi modul</h3>{unit.previews.map((item, index) => <div className="preview-line" key={item}><span>0{index + 1}</span><p>{item}</p><button aria-label={`Putar contoh ${index + 1}`} onClick={() => notify("Audio contoh akan ditambahkan pada tahap pengisian materi.")}>▷</button></div>)}<div className="preview-checkpoint"><small>UJIAN MODUL</small><p>{unit.checkpoint}</p></div></aside>
        </div>
      </section>
      <section className="lesson-blueprint-section">
        <div className="curriculum-section-heading"><div><span className="card-kicker dark">DAFTAR PELAJARAN</span><h3>Pilih pelajaran untuk melihat langkah belajarnya</h3></div><p>{unit.lessons.length} pelajaran dalam Modul {unit.code}</p></div>
        <div className="lesson-blueprint-layout">
          <aside className="lesson-blueprint-rail" aria-label={`Daftar pelajaran ${unit.title}`}>
            <div><small>MODUL {unit.code}</small><strong>{unit.lessons.length} pelajaran berurutan</strong></div>
            {unit.lessons.map((lesson, index) => <button className={activeLessonIndex === index ? "active" : ""} aria-pressed={activeLessonIndex === index} onClick={() => setActiveLessonIndex(index)} key={lesson}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{lesson}</strong><small>{getLessonBlueprint(unit, index).phase}</small></div><b>→</b></button>)}
          </aside>
          <article className="lesson-blueprint-canvas">
            <header><div><span className="blueprint-badge">PELAJARAN {String(activeLessonIndex + 1).padStart(2, "0")} DARI {String(unit.lessons.length).padStart(2, "0")}</span><p className="eyebrow">{activeLesson.phase} · {activeLesson.duration}</p><h2>{activeLesson.title}</h2></div><div className="lesson-sequence">{activeLessonIndex + 1}<small>/ {unit.lessons.length}</small></div></header>
            <section className="lesson-objective"><span>TARGET PELAJARAN</span><p>{activeLesson.objective}</p></section>
            <div className="lesson-target-grid">{activeLesson.contentTargets.map((target) => <article key={target.label}><small>{target.label}</small><strong>{target.target}</strong><p>Dikenalkan bertahap sesuai kebutuhan pelajaran.</p></article>)}</div>
            <section className="practice-flow"><div className="lesson-plan-heading"><span className="card-kicker dark">CARA BELAJAR</span><h3>6 langkah dalam pelajaran ini</h3></div><div>{activeLesson.practiceFlow.map((step) => <article key={step.step}><span>{step.step}</span><div><strong>{step.label}</strong><p>{step.detail}</p></div></article>)}</div></section>
            <section className="skill-task-section"><div className="lesson-plan-heading"><span className="card-kicker dark">LATIHAN KEMAMPUAN</span><h3>Gunakan materi, bukan sekadar menghafal</h3></div><div className="skill-task-grid">{activeLesson.skillTasks.map((task) => <article key={task.skill}><span>{task.skill.slice(0, 1)}</span><div><strong>{task.skill}</strong><p>{task.task}</p></div></article>)}</div></section>
            <div className="lesson-support-grid">
              <section><span className="card-kicker dark">YANG TERSEDIA</span><div>{activeLesson.assets.map((asset) => <span key={asset}>✓ {asset}</span>)}</div></section>
              <section><span className="card-kicker dark">CONTOH MATERI</span>{activeLesson.examples.map((example, index) => <p key={example}><b>0{index + 1}</b>{example}</p>)}</section>
            </div>
            <footer className="lesson-mastery-gate"><div><small>SYARAT SELESAI</small><strong>{activeLesson.masteryGate}</strong></div><button onClick={() => notify(`Preview ${activeLesson.title} akan diisi bertahap dengan materi dan soal.`)}>Mulai pelajaran →</button></footer>
          </article>
        </div>
      </section>
      <section className="mastery-roadmap"><div><span className="card-kicker">PERKEMBANGAN MATERI</span><h3>Dari baru dikenal sampai benar-benar dikuasai</h3><p>Sistem akan membantu menentukan kapan materi perlu diulang.</p></div><div>{masteryStages.map((stage, index) => <span key={stage}><b>{index + 1}</b>{stage}</span>)}</div></section>
    </>
  );
}
