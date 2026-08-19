"use client";

import { useState } from "react";
import type { MultiTurnDialogueContent } from "@/app/lib/lesson-content-types";

// M05 — scripted multi-turn roleplay. Same mechanic as DialogueBlock
// (pick right to advance) chained across several turns instead of one.
// Pure client-side demo, not graded/written to user_kana_attempts — the
// point is rehearsal, same spirit as DialogueBlock and NumberBuilder.
export function MultiTurnDialogue({ content }: { content: MultiTurnDialogueContent }) {
  const [turnIndex, setTurnIndex] = useState(0);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const turn = content.turns[turnIndex];
  const chosen = turn?.choices.find((c) => c.id === chosenId);
  const isCorrect = chosen?.correct === true;
  const isLastTurn = turnIndex === content.turns.length - 1;

  function selectChoice(id: string) {
    setChosenId(id);
  }

  function advance() {
    if (isLastTurn) {
      setDone(true);
      return;
    }
    setTurnIndex((i) => i + 1);
    setChosenId(null);
  }

  return (
    <section className="m01-dialogue">
      <p className="m01-dialogue__prompt m01-dialogue__scenario">{content.scenario}</p>
      <p className="m01-dialogue__progress">
        Giliran {turnIndex + 1}/{content.turns.length}
      </p>

      {!done && turn && (
        <>
          <div className="m01-dialogue__bubble m01-dialogue__bubble--npc">{turn.npcKana}</div>
          <p className="m01-dialogue__prompt">{turn.prompt}</p>
          <div className="m01-dialogue__choices">
            {turn.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={`exercise-runner__option ${chosenId === choice.id ? (choice.correct ? "m01-option--correct" : "exercise-runner__option--wrong") : ""}`}
                onClick={() => selectChoice(choice.id)}
              >
                {choice.kana}
              </button>
            ))}
          </div>

          {chosen && !isCorrect && <p className="m01-dialogue__hint">Coba pilihan lain.</p>}

          {isCorrect && (
            <button type="button" className="exercise-runner__option m01-dialogue__continue" onClick={advance}>
              {isLastTurn ? "Selesaikan percakapan →" : "Lanjutkan →"}
            </button>
          )}
        </>
      )}

      {done && <p className="m01-dialogue__closing">{content.closingNote}</p>}
    </section>
  );
}
