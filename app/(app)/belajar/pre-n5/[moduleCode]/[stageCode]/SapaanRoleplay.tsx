"use client";

import { useMemo, useState } from "react";
import type { VocabItem, VocabStageBundle } from "@/app/lib/vocab-engine-query";
import { SAPAAN_SCENARIOS, type SapaanScenario } from "@/app/lib/sapaan-scenarios";
import type { VocabQuizResult } from "./VocabQuiz";
import { recordVocabAttempt } from "./vocab-actions";

const CURRICULUM_VERSION_V21 = "v2.1";
const ROUNDS = 3;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function findCorrectItem(scenario: SapaanScenario, pool: VocabItem[]): VocabItem | undefined {
  return pool.find((item) => normalize(item.reading) === normalize(scenario.correctReading));
}

// PROMPT-10 Bagian 6 — V2.1's Transfer requirement for PRE-N5.04: "3
// micro-roleplays dengan variasi partner dan urutan; ungkapan yang salah
// konteks masuk weak-point pair." Each round mixes categories on
// purpose (unlike the per-unit "uji" round in SapaanLearningLab, which
// stays within one category) — passing BOSS means picking the right
// register/expression across DIFFERENT social situations in a row, not
// just within one familiar scene.
export function SapaanRoleplay({
  bundle,
  onComplete,
}: {
  bundle: VocabStageBundle;
  onComplete: (result: VocabQuizResult, state: Record<string, unknown>) => void;
}) {
  const scenarios = useMemo(() => shuffle(SAPAAN_SCENARIOS).slice(0, ROUNDS), []);
  const [round, setRound] = useState(0);
  const [mode, setMode] = useState<"choice" | "production">("choice");
  const [selected, setSelected] = useState<number | null>(null);
  const [typedValue, setTypedValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tally, setTally] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  const scenario = scenarios[round];
  const correctItem = scenario ? findCorrectItem(scenario, bundle.allItems) : undefined;
  const choices = useMemo(() => {
    if (!correctItem) return [];
    const others = bundle.allItems.filter((candidate) => candidate.id !== correctItem.id);
    return shuffle([correctItem, ...shuffle(others).slice(0, 3)]);
  }, [correctItem, bundle.allItems]);

  if (scenarios.length === 0) {
    return <div className="hiragana-stage__empty">Belum ada skenario untuk roleplay ini.</div>;
  }
  if (saving) {
    return <div className="hiragana-stage__loading">Menyimpan hasil...</div>;
  }
  if (!scenario || !correctItem) return null;

  const isCorrect = mode === "choice" ? selected === correctItem.id : normalize(typedValue) === normalize(correctItem.reading);
  const canCheck = mode === "choice" ? selected != null : typedValue.trim().length > 0;

  async function submit() {
    if (!checked) {
      setChecked(true);
      return;
    }
    setSaving(true);
    await recordVocabAttempt({
      stageId: bundle.stage.id,
      itemId: correctItem!.id,
      exerciseType: mode === "choice" ? "response_choice" : "response_production",
      skill: mode === "choice" ? "recognition" : "production",
      selectedItemId: mode === "choice" ? selected : null,
      typedValue: mode === "production" ? typedValue : null,
      phaseCode: bundle.stage.code,
      curriculumVersion: CURRICULUM_VERSION_V21,
      firstAttemptCorrect: isCorrect,
    });
    const nextTally = { correct: tally.correct + (isCorrect ? 1 : 0), total: tally.total + 1 };
    setTally(nextTally);
    setSaving(false);

    const nextRound = round + 1;
    if (nextRound >= scenarios.length) {
      onComplete(nextTally, { roleplayTransfer: true });
      return;
    }
    setRound(nextRound);
    setMode(nextRound % 2 === 0 ? "choice" : "production");
    setSelected(null);
    setTypedValue("");
    setChecked(false);
  }

  return (
    <div className="konbini-sim">
      <header className="konbini-sim__header">
        <span>Roleplay Situasi Campuran — {round + 1}/{scenarios.length}</span>
      </header>
      <div className="konbini-sim__step">
        <span className="sapaan-lab__situation-badge">SITUASI BARU</span>
        <p className="sapaan-lab__situation-text">{scenario.situation}</p>

        {mode === "choice" ? (
          <div className="sapaan-lab__choices">
            {choices.map((choice) => {
              const stateClass = checked
                ? choice.id === correctItem.id
                  ? "is-correct"
                  : selected === choice.id
                    ? "is-wrong"
                    : ""
                : selected === choice.id
                  ? "is-selected"
                  : "";
              return (
                <button type="button" key={choice.id} disabled={checked} className={stateClass} onClick={() => setSelected(choice.id)}>
                  {choice.termKana}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            className={["hiragana-quiz__input", checked ? (isCorrect ? "is-correct" : "is-wrong") : ""].filter(Boolean).join(" ")}
            value={typedValue}
            disabled={checked}
            onChange={(event) => setTypedValue(event.target.value)}
            placeholder="Ketik romaji..."
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        )}

        {checked && (
          <div className={isCorrect ? "hiragana-quiz__feedback is-correct" : "hiragana-quiz__feedback is-wrong"}>
            {isCorrect ? "Tepat — pantas untuk situasi ini." : "Yang paling pantas: " + correctItem.termKana + " (" + correctItem.reading + ")"}
          </div>
        )}

        <button type="button" className="primary-button" disabled={!canCheck} onClick={() => void submit()}>
          {checked ? (round + 1 >= scenarios.length ? "Selesaikan roleplay" : "Situasi berikutnya") : "Periksa"}
        </button>
      </div>
    </div>
  );
}
