"use client";

import { PageHeader } from "../_components/PageHeader";
import { useToast } from "../_components/toast-provider";
import { reviewSummary } from "@/app/lib/mock-data";

const items = [
  ["食べる", "たべる · to eat", "Vocabulary", "Due now"],
  ["学", "study · ガク / まなぶ", "Kanji", "Due now"],
  ["～たい", "want to do…", "Grammar", "In 2 hours"],
];

export default function ReviewPage() {
  const notify = useToast();

  return (
    <>
      <PageHeader eyebrow="SPACED REPETITION" title="Review Today" copy="Strengthen the items most likely to slip from memory." />
      <section className="review-summary">
        <div><small>DUE NOW</small><strong>{reviewSummary.dueNow}</strong><span>items</span></div><div><small>LEARNING</small><strong>{reviewSummary.learning}</strong><span>items</span></div><div><small>MASTERED</small><strong>{reviewSummary.mastered}</strong><span>items</span></div>
        <button className="primary-button" onClick={() => notify("Review player shell is ready. Spaced-repetition logic will be connected later.")}>Start review →</button>
      </section>
      <section className="table-card">
        <div className="table-title"><div><span className="card-kicker dark">UP NEXT</span><h3>Review queue</h3></div><button className="text-button">View all</button></div>
        {items.map(([title, detail, type, due]) => <div className="review-item" key={title}><div className="review-symbol">{title.slice(0, 1)}</div><div><strong>{title}</strong><small>{detail}</small></div><span>{type}</span><time>{due}</time><button onClick={() => notify(`${title} is ready for a future flashcard.`)}>→</button></div>)}
      </section>
    </>
  );
}
