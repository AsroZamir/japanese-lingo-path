"use client";

import { PageHeader } from "../_components/PageHeader";
import { useToast } from "../_components/toast-provider";

const scenarios = [
  ["🍜", "At a Restaurant", "Beginner", "Order a meal politely"],
  ["👋", "Self Introduction", "Beginner", "Meet someone for the first time"],
  ["🛍", "Shopping", "Beginner", "Ask about price and size"],
  ["🚉", "Asking Directions", "Beginner", "Find your way around town"],
  ["☕", "Daily Conversation", "Planned", "Practice casual small talk"],
];

export default function ConversationPage() {
  const notify = useToast();

  return (
    <>
      <PageHeader eyebrow="REAL-LIFE JAPANESE" title="Conversation" copy="Practice useful situations in a safe, guided space." />
      <div className="conversation-controls"><div><span>Mode</span><button className="selected">Text</button><button>Voice later</button></div><div><span>Difficulty</span><button className="selected">Easy</button><button>Normal</button></div></div>
      <section className="scenario-grid">{scenarios.map(([icon, title, level, copy]) => <button className="scenario-card" key={title} onClick={() => notify(`${title} conversation room is scaffolded for a later dialogue engine.`)}><span>{icon}</span><small>{level}</small><h3>{title}</h3><p>{copy}</p><b>Start scenario →</b></button>)}</section>
    </>
  );
}
