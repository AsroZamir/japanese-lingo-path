"use client";

import { useMemo, useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import type { VocabItem, VocabStageBundle } from "@/app/lib/vocab-engine-query";
import { VocabQuiz, type VocabQuizQuestion, type VocabQuizResult } from "./VocabQuiz";
import { recordVocabAttempt } from "./vocab-actions";

type Phase = "listen" | "build" | "contrast" | "checkpoint";

const CURRICULUM_VERSION_V21 = "v2.1";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

// react-hooks/purity flags Math.random() called directly inside a
// useMemo/render callback — routing it through a plain helper function
// (called FROM the callback, not inlined) satisfies the rule, matching
// choicesFor/contrastChoices below.
function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

// hear-build-say's "hear" half — recognition: play the audio, pick the
// right written form among same-category distractors.
function choicesFor(pool: VocabItem[], target: VocabItem, seed: number): VocabItem[] {
  const others = pool.filter((candidate) => candidate.id !== target.id);
  const shuffled = shuffle(others).slice(0, 3);
  const choices = [target, ...shuffled];
  const shift = choices.length > 0 ? (target.id + seed) % choices.length : 0;
  return choices.slice(shift).concat(choices.slice(0, shift));
}

// V2.1 PRE-N5.03 poin 3: pengecualian harus jalur TERPISAH dengan
// penanda jelas, bukan dicampur ke latihan pola biasa. Kontras
// menyandingkan bentuk irregular yang benar dengan bentuk "seharusnya"
// kalau polanya beraturan (irregularOf, sebagai distraktor paling
// masuk akal) plus satu distraktor lain dari kategori yang sama.
function contrastChoices(item: VocabItem, regularPair: VocabItem | undefined, pool: VocabItem[]): VocabItem[] {
  const others = pool.filter((candidate) => candidate.id !== item.id && candidate.id !== regularPair?.id);
  const filler = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : null;
  const choices = [item, regularPair, filler].filter((value): value is VocabItem => Boolean(value));
  return shuffle(choices);
}

function buildCheckpointQuestions(items: VocabItem[], phaseCode: string): VocabQuizQuestion[] {
  return items.map((item, index): VocabQuizQuestion => {
    if (index % 2 === 0) {
      return {
        id: "vocab-listen-" + item.id,
        kind: "choice",
        item,
        prompt: "Dengarkan, lalu pilih bentuk yang tepat.",
        choices: choicesFor(items, item, index),
        exerciseType: "listen_choice",
        skill: "recognition",
        phaseCode,
        curriculumVersion: CURRICULUM_VERSION_V21,
      };
    }
    return {
      id: "vocab-build-" + item.id,
      kind: "typing",
      item,
      prompt: "Dengarkan, lalu ketik bacaannya (romaji).",
      exerciseType: "type_reading",
      skill: "production",
      phaseCode,
      curriculumVersion: CURRICULUM_VERSION_V21,
    };
  });
}

function ListenStep({
  item,
  pool,
  saving,
  onOutcome,
}: {
  item: VocabItem;
  pool: VocabItem[];
  saving: boolean;
  onOutcome: (correct: boolean, selectedId: number) => void;
}) {
  const choices = useMemo(() => choicesFor(pool, item, item.id), [pool, item]);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  return (
    <div className="vocab-lab__step">
      <p>Dengarkan, lalu pilih bentuk tertulis yang tepat.</p>
      <AudioButton url={item.audioUrl} autoplay />
      <div className="vocab-lab__choices">
        {choices.map((choice) => {
          const stateClass = checked
            ? choice.id === item.id
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
      {checked && item.collocation && (
        <div className="vocab-lab__collocation">
          <span>{item.collocation}</span>
          <small>{item.collocationMeaningId}</small>
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
          onOutcome(selected === item.id, selected as number);
        }}
      >
        {saving ? "Menyimpan..." : checked ? "Lanjut" : "Periksa"}
      </button>
    </div>
  );
}

function BuildStep({
  item,
  saving,
  onOutcome,
}: {
  item: VocabItem;
  saving: boolean;
  onOutcome: (correct: boolean, typedValue: string) => void;
}) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const isCorrect = normalize(value) === normalize(item.reading);

  return (
    <div className="vocab-lab__step">
      <p>Dengarkan, lalu bangun jawabannya — ketik bacaannya (romaji).</p>
      <AudioButton url={item.audioUrl} autoplay />
      <div className="vocab-lab__kana">{item.termKana}</div>
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
          {isCorrect ? "Benar." : "Bacaan yang benar: " + item.reading + "."}
        </div>
      )}
      {checked && item.collocation && (
        <div className="vocab-lab__collocation">
          <span>{item.collocation}</span>
          <small>{item.collocationMeaningId}</small>
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
          onOutcome(isCorrect, value);
        }}
      >
        {saving ? "Menyimpan..." : checked ? "Lanjut" : "Periksa"}
      </button>
    </div>
  );
}

function ContrastStep({
  item,
  regularPair,
  pool,
  saving,
  onOutcome,
}: {
  item: VocabItem;
  regularPair: VocabItem | undefined;
  pool: VocabItem[];
  saving: boolean;
  onOutcome: (correct: boolean, selectedId: number) => void;
}) {
  const choices = useMemo(() => contrastChoices(item, regularPair, pool), [item, regularPair, pool]);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  return (
    <div className="vocab-lab__step vocab-lab__step--contrast">
      <span className="vocab-lab__contrast-badge">PENGECUALIAN — hafalkan, bukan pola</span>
      <p>
        {item.meaningId}. Mana yang benar?
      </p>
      <div className="vocab-lab__choices">
        {choices.map((choice) => {
          const stateClass = checked
            ? choice.id === item.id
              ? "is-correct"
              : selected === choice.id
                ? "is-wrong"
                : ""
            : selected === choice.id
              ? "is-selected"
              : "";
          return (
            <button type="button" key={choice.id} disabled={checked} className={stateClass} onClick={() => setSelected(choice.id)}>
              {choice.termKana} ({choice.reading})
            </button>
          );
        })}
      </div>
      {checked && <AudioButton url={item.audioUrl} autoplay />}
      <button
        type="button"
        className="primary-button"
        disabled={selected == null || saving}
        onClick={() => {
          if (!checked) {
            setChecked(true);
            return;
          }
          onOutcome(selected === item.id, selected as number);
        }}
      >
        {saving ? "Menyimpan..." : checked ? "Lanjut" : "Periksa"}
      </button>
    </div>
  );
}

const CATEGORY_TITLE: Record<string, string> = {
  number: "Angka 0-10",
  tens_hundreds: "Puluhan & Ratusan",
  hour: "Jam",
  minute: "Menit",
  date: "Tanggal",
  price: "Harga",
  counter_nin: "Counter: 人 (orang)",
  counter_hiki: "Counter: 匹 (ekor)",
  counter_hon: "Counter: 本 (batang)",
  counter_mai: "Counter: 枚 (lembar)",
  counter_dai: "Counter: 台 (unit)",
  counter_ko: "Counter: 個 (buah)",
};

export function VocabLearningLab({
  bundle,
  onComplete,
}: {
  bundle: VocabStageBundle;
  onComplete: (result: VocabQuizResult, state: Record<string, unknown>) => void;
}) {
  const phaseCode = bundle.stage.code;
  const [unitIndex, setUnitIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("listen");
  const [queue, setQueue] = useState<number[]>(() => bundle.units[0]?.items.map((item) => item.id) ?? []);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [checkpointKey, setCheckpointKey] = useState(0);
  const [checkpointMessage, setCheckpointMessage] = useState("");

  const unit = bundle.units[unitIndex];
  const currentItemId = queue[0];
  const currentItem = unit?.items.find((item) => item.id === currentItemId);

  const checkpointQuestionCount = Math.min(
    typeof bundle.stage.configuration.checkpointQuestions === "number"
      ? bundle.stage.configuration.checkpointQuestions
      : 10,
    bundle.allItems.length,
  );
  const checkpointQuestions = useMemo(() => {
    const shuffled = shuffle(bundle.allItems).slice(0, checkpointQuestionCount);
    return buildCheckpointQuestions(shuffled, phaseCode);
  }, [bundle.allItems, checkpointQuestionCount, phaseCode]);

  async function recordAndAdvance(input: {
    item: VocabItem;
    exerciseType: "listen_choice" | "type_reading" | "contrast_choice";
    skill: "recognition" | "production";
    correct: boolean;
    selectedItemId?: number;
    typedValue?: string;
  }) {
    setSavingAttempt(true);
    await recordVocabAttempt({
      stageId: bundle.stage.id,
      itemId: input.item.id,
      exerciseType: input.exerciseType,
      skill: input.skill,
      selectedItemId: input.selectedItemId ?? null,
      typedValue: input.typedValue ?? null,
      phaseCode,
      curriculumVersion: CURRICULUM_VERSION_V21,
      hintLevel: 0,
      assisted: false,
      firstAttemptCorrect: input.correct,
    });
    setSavingAttempt(false);

    const remaining = queue.slice(1);
    if (remaining.length > 0) {
      setQueue(remaining);
      return;
    }

    // Current phase's queue is empty — move to the next phase for this unit.
    if (phase === "listen") {
      setPhase("build");
      setQueue(unit.regularItems.map((item) => item.id));
    } else if (phase === "build") {
      if (unit.irregularItems.length > 0) {
        setPhase("contrast");
        setQueue(unit.irregularItems.map((item) => item.id));
      } else {
        advanceUnit();
      }
    } else if (phase === "contrast") {
      advanceUnit();
    }
  }

  function advanceUnit() {
    const nextIndex = unitIndex + 1;
    if (nextIndex >= bundle.units.length) {
      setPhase("checkpoint");
      setCheckpointKey((value) => value + 1);
      return;
    }
    setUnitIndex(nextIndex);
    setPhase("listen");
    setQueue(bundle.units[nextIndex].items.map((item) => item.id));
  }

  // Unlike HiraganaLearningLab (per-unit checkpoints, only the FINAL one
  // triggers onComplete), this lab has one checkpoint mixing every
  // category already covered in the stage — passing it always means the
  // whole stage is done. Saving (completeVocabStage) is owned by the
  // stage player, mirroring HiraganaStagePlayer/HiraganaLearningLab's
  // split of responsibility.
  function finishCheckpoint(result: VocabQuizResult) {
    const requiredCorrect = Math.ceil(result.total * 0.8);
    if (result.correct < requiredCorrect) {
      setCheckpointMessage(
        "Hasil " + result.correct + "/" + result.total + ". Ulangi sampai minimal " + requiredCorrect + " benar.",
      );
      setCheckpointKey((value) => value + 1);
      return;
    }
    onComplete(result, {});
  }

  if (!unit && phase !== "checkpoint") {
    return <div className="hiragana-stage__empty">Data batch belum tersedia.</div>;
  }

  if (phase === "checkpoint") {
    return (
      <div className="hiragana-lab__checkpoint">
        <div className="hiragana-lab__checkpoint-note">
          <strong>{checkpointQuestions.length} soal — minimal 80% benar</strong>
          <span>Campuran seluruh kategori yang sudah dipelajari di tahap ini.</span>
        </div>
        {checkpointMessage && <p className="hiragana-stage__feedback">{checkpointMessage}</p>}
        <VocabQuiz key={checkpointKey} stageId={bundle.stage.id} questions={checkpointQuestions} onComplete={finishCheckpoint} />
      </div>
    );
  }

  const phaseLabel = phase === "listen" ? "Dengar & Kenali" : phase === "build" ? "Bangun Jawaban" : "Pengecualian";

  return (
    <div className="hiragana-lab">
      <aside className="hiragana-lab__rail">
        <div className="hiragana-lab__rail-head">
          <div>
            <span>{bundle.stage.code} — {CATEGORY_TITLE[unit.category] ?? unit.category}</span>
            <strong>Kelompok {unitIndex + 1}/{bundle.units.length}</strong>
          </div>
        </div>
        <ol className="hiragana-lab__steps" aria-label="Langkah belajar">
          {(["listen", "build", "contrast"] as Phase[])
            .filter((p) => p !== "contrast" || unit.irregularItems.length > 0)
            .map((p, index) => (
              <li key={p} className={p === phase ? "is-active" : ""}>
                <b>{index + 1}</b>
                <span>{p === "listen" ? "Dengar & Kenali" : p === "build" ? "Bangun Jawaban" : "Pengecualian"}</span>
              </li>
            ))}
        </ol>
      </aside>

      <section className="hiragana-lab__main">
        <header className="hiragana-lab__header">
          <div>
            <span>{CATEGORY_TITLE[unit.category] ?? unit.category}</span>
            <h2>{phaseLabel}</h2>
          </div>
        </header>

        {currentItem && phase === "listen" && (
          <ListenStep
            key={currentItem.id}
            item={currentItem}
            pool={unit.items}
            saving={savingAttempt}
            onOutcome={(correct, selectedId) =>
              void recordAndAdvance({ item: currentItem, exerciseType: "listen_choice", skill: "recognition", correct, selectedItemId: selectedId })
            }
          />
        )}

        {currentItem && phase === "build" && (
          <BuildStep
            key={currentItem.id}
            item={currentItem}
            saving={savingAttempt}
            onOutcome={(correct, typedValue) =>
              void recordAndAdvance({ item: currentItem, exerciseType: "type_reading", skill: "production", correct, typedValue })
            }
          />
        )}

        {currentItem && phase === "contrast" && (
          <ContrastStep
            key={currentItem.id}
            item={currentItem}
            regularPair={unit.items.find((candidate) => candidate.id === currentItem.irregularOfId)}
            pool={unit.items}
            saving={savingAttempt}
            onOutcome={(correct, selectedId) =>
              void recordAndAdvance({ item: currentItem, exerciseType: "contrast_choice", skill: "recognition", correct, selectedItemId: selectedId })
            }
          />
        )}
      </section>
    </div>
  );
}
