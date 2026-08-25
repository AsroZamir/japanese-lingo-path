"use client";

import { useMemo, useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import type { VocabItem, VocabStageBundle } from "@/app/lib/vocab-engine-query";
import { SAPAAN_SCENARIOS, type SapaanScenario } from "@/app/lib/sapaan-scenarios";
import type { VocabQuizResult } from "./VocabQuiz";
import { recordVocabAttempt } from "./vocab-actions";

const CURRICULUM_VERSION_V21 = "v2.1";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function findCorrectItem(scenario: SapaanScenario, pool: VocabItem[]): VocabItem | undefined {
  return pool.find((item) => normalize(item.reading) === normalize(scenario.correctReading));
}

const REGISTER_LABEL: Record<string, string> = { formal: "FORMAL", casual: "SANTAI" };

// V2.1 §6.7 (Interaction and Pragmatics Engine) — one ungraded warm-up
// ("tebak maksud"), then teaching (notice + self-checked shadowing) per
// item, then one graded round through the category's own scenarios that
// gates advancement. No separate "practice then checkpoint" split like
// the kana/vocab engines — V2.1 doesn't ask for one here, and this
// module's whole point (situational appropriateness) is already tested
// directly by the scenario round itself.
type Phase = "situasi" | "kenali" | "uji";

function SituationIntro({ scenario, onContinue }: { scenario: SapaanScenario; onContinue: () => void }) {
  return (
    <div className="sapaan-lab__step sapaan-lab__step--situation">
      <span className="sapaan-lab__situation-badge">SITUASI</span>
      <p className="sapaan-lab__situation-text">{scenario.situation}</p>
      <p className="sapaan-lab__situation-hint">Apa yang akan Anda katakan di sini? Belum tahu jawabannya tidak apa-apa — mari kita lihat sama-sama.</p>
      <button type="button" className="primary-button" onClick={onContinue}>
        Lanjut →
      </button>
    </div>
  );
}

function NoticeStep({
  item,
  saving,
  onOutcome,
}: {
  item: VocabItem;
  saving: boolean;
  onOutcome: () => void;
}) {
  const [tried, setTried] = useState(false);
  return (
    <div className="sapaan-lab__step">
      <p>Perhatikan ungkapannya.</p>
      <div className="sapaan-lab__kana">
        {item.termKana}
        {item.register && <span className="sapaan-lab__register-badge">{REGISTER_LABEL[item.register]}</span>}
      </div>
      <p className="sapaan-lab__meaning">{item.meaningId}</p>
      <div className="sapaan-lab__audio-row">
        <AudioButton url={item.audioUrl} autoplay />
        {item.audioUrlSpeaker2 && (
          <>
            <span className="sapaan-lab__speaker-label">Suara 1</span>
            <AudioButton url={item.audioUrlSpeaker2} />
            <span className="sapaan-lab__speaker-label">Suara 2</span>
          </>
        )}
      </div>
      {!tried ? (
        <button type="button" className="secondary-button" onClick={() => setTried(true)}>
          🗣️ Tirukan sekarang, lalu klik di sini
        </button>
      ) : (
        <p className="sapaan-lab__shadow-note">Bagus. Latihan mengucapkan seperti ini tidak dinilai — yang penting dicoba.</p>
      )}
      <button type="button" className="primary-button" disabled={!tried || saving} onClick={onOutcome}>
        {saving ? "Menyimpan..." : "Lanjut →"}
      </button>
    </div>
  );
}

function ScenarioChoiceStep({
  scenario,
  pool,
  saving,
  onOutcome,
}: {
  scenario: SapaanScenario;
  pool: VocabItem[];
  saving: boolean;
  onOutcome: (correct: boolean, selectedId: number, item: VocabItem) => void;
}) {
  const correctItem = findCorrectItem(scenario, pool);
  const choices = useMemo(() => {
    if (!correctItem) return [];
    const others = pool.filter((candidate) => candidate.id !== correctItem.id);
    return shuffle([correctItem, ...shuffle(others).slice(0, 3)]);
  }, [correctItem, pool]);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  if (!correctItem) return null;

  return (
    <div className="sapaan-lab__step">
      <span className="sapaan-lab__situation-badge">SITUASI</span>
      <p className="sapaan-lab__situation-text">{scenario.situation}</p>
      <p>Apa yang paling pantas dikatakan?</p>
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
      {checked && (
        <div className={selected === correctItem.id ? "hiragana-quiz__feedback is-correct" : "hiragana-quiz__feedback is-wrong"}>
          {selected === correctItem.id
            ? "Tepat."
            : "Yang paling pantas: " + correctItem.termKana + " — " + correctItem.meaningId}
        </div>
      )}
      <button
        type="button"
        className="primary-button"
        disabled={selected == null || saving}
        onClick={() => {
          if (!checked) {
            setChecked(true);
            return;
          }
          onOutcome(selected === correctItem.id, selected as number, correctItem);
        }}
      >
        {saving ? "Menyimpan..." : checked ? "Lanjut" : "Periksa"}
      </button>
    </div>
  );
}

function ScenarioProductionStep({
  scenario,
  pool,
  saving,
  onOutcome,
}: {
  scenario: SapaanScenario;
  pool: VocabItem[];
  saving: boolean;
  onOutcome: (correct: boolean, item: VocabItem) => void;
}) {
  const correctItem = findCorrectItem(scenario, pool);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  if (!correctItem) return null;
  const isCorrect = normalize(value) === normalize(correctItem.reading);

  return (
    <div className="sapaan-lab__step">
      <span className="sapaan-lab__situation-badge">SITUASI</span>
      <p className="sapaan-lab__situation-text">{scenario.situation}</p>
      <p>Ketik ungkapan yang pantas (romaji).</p>
      <input
        className={["hiragana-quiz__input", checked ? (isCorrect ? "is-correct" : "is-wrong") : ""].filter(Boolean).join(" ")}
        value={value}
        disabled={checked}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ketik romaji..."
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {checked && (
        <div className={isCorrect ? "hiragana-quiz__feedback is-correct" : "hiragana-quiz__feedback is-wrong"}>
          {isCorrect ? "Tepat." : "Yang paling pantas: " + correctItem.reading + " (" + correctItem.termKana + ")"}
        </div>
      )}
      <button
        type="button"
        className="primary-button"
        disabled={(!checked && value.trim().length === 0) || saving}
        onClick={() => {
          if (!checked) {
            setChecked(true);
            return;
          }
          onOutcome(isCorrect, correctItem);
        }}
      >
        {saving ? "Menyimpan..." : checked ? "Lanjut" : "Periksa"}
      </button>
    </div>
  );
}

export function SapaanLearningLab({
  bundle,
  onComplete,
}: {
  bundle: VocabStageBundle;
  onComplete: (result: VocabQuizResult, state: Record<string, unknown>) => void;
}) {
  const phaseCode = bundle.stage.code;
  const [unitIndex, setUnitIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("situasi");
  const [noticeQueue, setNoticeQueue] = useState<number[]>(() => bundle.units[0]?.items.map((item) => item.id) ?? []);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [ujiRunKey, setUjiRunKey] = useState(0);
  const [ujiMessage, setUjiMessage] = useState("");
  const [ujiTally, setUjiTally] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  // Running total across every unit's PASSING round only — a unit that
  // needed a retry only counts its final successful pass, same spirit
  // as the other engines' checkpoints. Feeds completeVocabStage's score
  // once the whole stage is done.
  const [stageTally, setStageTally] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  const unit = bundle.units[unitIndex];
  const scenarios = useMemo(
    () => shuffle(SAPAAN_SCENARIOS.filter((scenario) => scenario.category === unit?.category)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ujiRunKey isn't read in the body; it's a deliberate cache-bust so a retry reshuffles the scenario order, same purpose as this file's runKey props elsewhere.
    [unit?.category, ujiRunKey],
  );
  const [scenarioIndex, setScenarioIndex] = useState(0);

  if (!unit) return <div className="hiragana-stage__empty">Data belum tersedia.</div>;

  const introScenario = scenarios[0];
  const currentNoticeItem = unit.items.find((item) => item.id === noticeQueue[0]);
  const currentScenario = scenarios[scenarioIndex];

  function recordAndAdvanceNotice() {
    const remaining = noticeQueue.slice(1);
    setNoticeQueue(remaining);
    if (remaining.length === 0) setPhase("uji");
  }

  async function recordScenarioOutcome(input: {
    exerciseType: "response_choice" | "response_production";
    correct: boolean;
    item: VocabItem;
    selectedItemId?: number;
    typedValue?: string;
  }) {
    setSavingAttempt(true);
    await recordVocabAttempt({
      stageId: bundle.stage.id,
      itemId: input.item.id,
      exerciseType: input.exerciseType,
      skill: input.exerciseType === "response_choice" ? "recognition" : "production",
      selectedItemId: input.selectedItemId ?? null,
      typedValue: input.typedValue ?? null,
      phaseCode,
      curriculumVersion: CURRICULUM_VERSION_V21,
      firstAttemptCorrect: input.correct,
    });
    setSavingAttempt(false);
    // Compute the final tally locally (not via a setState updater) since
    // finishUji needs the up-to-date total THIS SAME tick — React state
    // set just above isn't readable yet from ujiTally's closure.
    const nextTally = { correct: ujiTally.correct + (input.correct ? 1 : 0), total: ujiTally.total + 1 };
    setUjiTally(nextTally);

    const nextIndex = scenarioIndex + 1;
    if (nextIndex >= scenarios.length) {
      finishUji(nextTally);
      return;
    }
    setScenarioIndex(nextIndex);
  }

  function finishUji(tally: { correct: number; total: number }) {
    const requiredCorrect = Math.ceil(tally.total * 0.8);
    if (tally.correct < requiredCorrect) {
      setUjiMessage("Hasil " + tally.correct + "/" + tally.total + ". Ulangi sampai minimal " + requiredCorrect + " benar.");
      setUjiRunKey((value) => value + 1);
      setScenarioIndex(0);
      setUjiTally({ correct: 0, total: 0 });
      return;
    }
    const nextStageTally = { correct: stageTally.correct + tally.correct, total: stageTally.total + tally.total };
    setStageTally(nextStageTally);
    advanceUnit(nextStageTally);
  }

  function advanceUnit(finalTally?: { correct: number; total: number }) {
    const nextIndex = unitIndex + 1;
    if (nextIndex >= bundle.units.length) {
      onComplete(finalTally ?? stageTally, {});
      return;
    }
    setUnitIndex(nextIndex);
    setPhase("situasi");
    setNoticeQueue(bundle.units[nextIndex].items.map((item) => item.id));
    setScenarioIndex(0);
    setUjiMessage("");
  }

  return (
    <div className="hiragana-lab">
      <aside className="hiragana-lab__rail">
        <div className="hiragana-lab__rail-head">
          <div>
            <span>{bundle.stage.code} — {unit.category}</span>
            <strong>Kelompok {unitIndex + 1}/{bundle.units.length}</strong>
          </div>
        </div>
        <ol className="hiragana-lab__steps" aria-label="Langkah belajar">
          {(["situasi", "kenali", "uji"] as Phase[]).map((p, index) => (
            <li key={p} className={p === phase ? "is-active" : ""}>
              <b>{index + 1}</b>
              <span>{p === "situasi" ? "Situasi" : p === "kenali" ? "Kenali & Tiru" : "Uji Kepantasan"}</span>
            </li>
          ))}
        </ol>
      </aside>

      <section className="hiragana-lab__main">
        <header className="hiragana-lab__header">
          <div>
            <span>{unit.category}</span>
            <h2>{phase === "situasi" ? "Situasi" : phase === "kenali" ? "Kenali & Tiru" : "Uji Kepantasan"}</h2>
          </div>
        </header>

        {phase === "situasi" && introScenario && (
          <SituationIntro scenario={introScenario} onContinue={() => setPhase("kenali")} />
        )}

        {phase === "kenali" && currentNoticeItem && (
          <NoticeStep key={currentNoticeItem.id} item={currentNoticeItem} saving={savingAttempt} onOutcome={recordAndAdvanceNotice} />
        )}

        {phase === "uji" && currentScenario && (
          <>
            {ujiMessage && <p className="hiragana-stage__feedback">{ujiMessage}</p>}
            {scenarioIndex % 2 === 0 ? (
              <ScenarioChoiceStep
                key={ujiRunKey + "-" + scenarioIndex}
                scenario={currentScenario}
                pool={unit.items}
                saving={savingAttempt}
                onOutcome={(correct, selectedId, item) =>
                  void recordScenarioOutcome({ exerciseType: "response_choice", correct, item, selectedItemId: selectedId })
                }
              />
            ) : (
              <ScenarioProductionStep
                key={ujiRunKey + "-" + scenarioIndex}
                scenario={currentScenario}
                pool={unit.items}
                saving={savingAttempt}
                onOutcome={(correct, item) =>
                  void recordScenarioOutcome({ exerciseType: "response_production", correct, item, typedValue: "" })
                }
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
