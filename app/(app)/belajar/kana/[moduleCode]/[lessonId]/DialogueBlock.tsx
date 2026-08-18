"use client";

import { useState } from "react";
import type { DialogueBlockContent } from "@/app/lib/lesson-content-types";

// Simulasi ringan, murni state lokal — bukan salah satu dari
// lesson_exercises, jadi tidak ditulis ke user_kana_attempts. Tujuannya
// cuma keterlibatan ("interaksi pertama Anda"), bukan penilaian.
export function DialogueBlock({ content }: { content: DialogueBlockContent }) {
  const [chosenId, setChosenId] = useState<string | null>(null);
  const chosen = content.choices.find((c) => c.id === chosenId);
  const isCorrect = chosen?.correct === true;

  return (
    <section className="m01-dialogue">
      <div className="m01-dialogue__bubble m01-dialogue__bubble--npc">{content.openingKana}</div>
      <p className="m01-dialogue__prompt">{content.prompt}</p>
      <div className="m01-dialogue__choices">
        {content.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className={`exercise-runner__option ${chosenId === choice.id ? (choice.correct ? "m01-option--correct" : "exercise-runner__option--wrong") : ""}`}
            onClick={() => setChosenId(choice.id)}
          >
            {choice.kana}
          </button>
        ))}
      </div>

      {chosen && !isCorrect && <p className="m01-dialogue__hint">Coba pilihan lain.</p>}

      {isCorrect && (
        <>
          <p className="m01-dialogue__narrative">{content.followUpNarrative}</p>
          <div className="m01-dialogue__bubble m01-dialogue__bubble--npc">{content.followUpKana}</div>
          <p className="m01-dialogue__closing">{content.closingNote}</p>
        </>
      )}
    </section>
  );
}
