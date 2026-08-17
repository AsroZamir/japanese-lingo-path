"use client";

import { PageHeader } from "../_components/PageHeader";
import { EmptySlot } from "../_components/EmptySlot";
import { useToast } from "../_components/toast-provider";

const modes = [
  ["語", "Vocabulary", "Words and meanings", "12 due"],
  ["文", "Grammar", "Patterns and particles", "6 sets"],
  ["漢", "Kanji", "Meaning and readings", "8 due"],
  ["聴", "Listening", "Comprehension drills", "Coming next"],
];

export default function PracticePage() {
  const notify = useToast();

  return (
    <>
      <PageHeader eyebrow="BUILD YOUR SKILLS" title="Practice" copy="Short, focused sessions that reinforce what you learn." />
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
