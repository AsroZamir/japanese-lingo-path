"use client";

import { useState } from "react";
import { PageHeader } from "../_components/PageHeader";
import { EmptySlot } from "../_components/EmptySlot";
import { useToast } from "../_components/toast-provider";

export default function TutorPage() {
  const notify = useToast();
  const [prompt, setPrompt] = useState("");
  const submit = () => { if (prompt.trim()) { notify("Tutor interface works. The AI service will be connected in a later phase."); setPrompt(""); } };

  return (
    <>
      <PageHeader eyebrow="PERSONAL SUPPORT" title="AI Japanese Tutor" copy="Ask questions, request explanations, and practice at your level." />
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
