"use client";

import { PageHeader } from "../_components/PageHeader";
import { EmptySlot } from "../_components/EmptySlot";
import { useToast } from "../_components/toast-provider";

export default function JlptPage() {
  const notify = useToast();

  return (
    <>
      <PageHeader eyebrow="EXAM PREPARATION" title="JLPT Path" copy="Build exam readiness without losing sight of real Japanese." />
      <section className="jlpt-hero"><div><small>YOUR CURRENT TARGET</small><span className="level-big">N5</span><h2>Foundation level</h2><p>Vocabulary, kanji, grammar, reading, and listening will be developed module by module.</p></div><div className="readiness"><div><strong>24%</strong><span>readiness</span></div><p>Early estimate · sample data</p></div></section>
      <section className="jlpt-levels">{["N5", "N4", "N3", "N2", "N1"].map((level, index) => <button className={index === 0 ? "active" : ""} key={level} onClick={() => notify(index === 0 ? "N5 content structure is ready." : `${level} is reserved for a later curriculum phase.`)}><strong>{level}</strong><span>{index === 0 ? "In progress" : index === 1 ? "Planned" : "Locked"}</span></button>)}</section>
      <EmptySlot label="N5 PREPARATION" title="Exam modules are reserved" copy="Vocabulary, kanji, grammar, reading, listening, and mock-test cards will be added here." />
    </>
  );
}
