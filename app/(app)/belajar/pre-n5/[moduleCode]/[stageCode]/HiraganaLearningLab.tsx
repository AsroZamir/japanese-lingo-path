"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import {
  KanaStrokeAnimator,
  KanaWritingCoach,
  type KanaWritingOutcome,
} from "@/components/kana/KanaWritingCoach";
import type { KanaStrokeData } from "@/components/kana/stroke-geometry";
import {
  CURRICULUM_VERSION_V21,
  HIRAGANA_LAB_VERSION,
  HIRAGANA_WORD_UNLOCKS,
  V21_PHASE_CODE_BY_STAGE,
} from "@/app/lib/hiragana-mnemonics";
import type {
  HiraganaLearningItem,
  HiraganaReadWord,
  HiraganaStageBundle,
  HiraganaUnit,
} from "@/app/lib/pre-n5-01-query";
import {
  HiraganaQuiz,
  type HiraganaQuizQuestion,
  type HiraganaQuizResult,
} from "./HiraganaQuiz";
import {
  recordHiraganaAttempt,
  recordReadAttempt,
  saveHiraganaStageState,
} from "./actions";
import * as wanakana from "wanakana";
import { VocalBridgeIntro } from "./VocalBridgeIntro";

// V2.1 §6.1 Kana Script Engine: lihat-dengar -> bedakan -> ikuti stroke ->
// tulis dari memori singkat -> tulis dari audio -> campuran kumulatif.
// Each phase runs as a full round across the unit's items (not one item
// at a time through every phase) because the retrieval-reset rule in
// §4.2 needs other items to interleave with a hinted item's unhinted
// retry, and a round-based queue is what makes that possible.
type LearningPhase =
  | "anchor"
  | "discriminate"
  | "guided"
  | "shortMemory"
  | "recall"
  | "read"
  | "checkpoint"
  | "unlock";

type HiraganaLearningLabProps = {
  bundle: HiraganaStageBundle;
  onComplete: (result: HiraganaQuizResult, state: Record<string, unknown>) => void;
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number")
    : [];
}

function configurationNumber(
  configuration: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = configuration[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function choicesFor(
  pool: HiraganaLearningItem[],
  target: HiraganaLearningItem,
  offset: number,
  count = 4,
): HiraganaLearningItem[] {
  const distractors = pool
    .filter((item) => item.id !== target.id)
    .slice(offset)
    .concat(pool.filter((item) => item.id !== target.id).slice(0, offset))
    .slice(0, Math.max(0, count - 1));
  const choices = [target, ...distractors];
  const shift = choices.length > 0 ? offset % choices.length : 0;
  return choices.slice(shift).concat(choices.slice(0, shift));
}

// V2.1 §5.2 rasio item: <=10 -> ~70% baru, 11-20 -> ~55% baru, >20 ->
// ~35-45% baru (sisanya lama/weak point). Bank size is the cumulative
// pool available at this stage (bundle.items.length), not the lesson
// size, since the ratio table talks about "bank aktif" as a whole.
function newItemRatio(bankSize: number): number {
  if (bankSize <= 10) return 0.7;
  if (bankSize <= 20) return 0.55;
  return 0.4;
}

function buildCheckpointQuestions(
  units: HiraganaUnit[],
  cumulativeItems: HiraganaLearningItem[],
  unitIndex: number,
  questionCount: number,
  phaseCode: string,
): HiraganaQuizQuestion[] {
  const currentItems = units[unitIndex]?.items ?? [];
  const futureIds = new Set(
    units
      .slice(unitIndex + 1)
      .flatMap((unit) => unit.items)
      .map((item) => item.id),
  );
  const learnedPool = cumulativeItems.filter((item) => !futureIds.has(item.id));
  if (learnedPool.length === 0 || currentItems.length === 0) return [];

  const finalUnit = unitIndex === units.length - 1;
  // Non-final unit: "new" is just this lesson. Final unit: the whole
  // phase's checkpoint should weigh the phase's full new batch against
  // everything learned in earlier phases, not just the last lesson.
  const stageItemIds = new Set(units.flatMap((unit) => unit.items).map((item) => item.id));
  const newPool = finalUnit
    ? learnedPool.filter((item) => stageItemIds.has(item.id))
    : currentItems;
  const oldPool = learnedPool.filter((item) => !newPool.some((candidate) => candidate.id === item.id));

  const totalQuestions = Math.max(1, questionCount);
  const ratio = newItemRatio(learnedPool.length);
  const newCount = oldPool.length === 0
    ? totalQuestions
    : Math.min(totalQuestions, Math.max(1, Math.round(totalQuestions * ratio)));
  const oldCount = totalQuestions - newCount;

  const targets: HiraganaLearningItem[] = [];
  for (let index = 0; index < newCount; index += 1) {
    targets.push(newPool[index % newPool.length]);
  }
  for (let index = 0; index < oldCount; index += 1) {
    targets.push(oldPool.length > 0 ? oldPool[index % oldPool.length] : newPool[index % newPool.length]);
  }

  return targets.map((item, index): HiraganaQuizQuestion => {
    if (index % 3 === 0) {
      return {
        id: "lab-audio-" + unitIndex + "-" + index + "-" + item.id,
        kind: "choice",
        item,
        prompt: "Dengarkan bunyinya, lalu pilih huruf yang tepat.",
        promptMode: "audio",
        choices: choicesFor(learnedPool, item, index + unitIndex),
        exerciseType: "audio_visual",
        skill: "audio",
        phaseCode,
        curriculumVersion: CURRICULUM_VERSION_V21,
      };
    }
    if (index % 3 === 1) {
      return {
        id: "lab-recall-" + unitIndex + "-" + index + "-" + item.id,
        kind: "typing",
        item,
        prompt: "Baca huruf ini tanpa membuka petunjuk.",
        promptMode: "kana",
        exerciseType: "checkpoint",
        skill: "recall",
        phaseCode,
        curriculumVersion: CURRICULUM_VERSION_V21,
      };
    }
    return {
      id: "lab-writing-" + unitIndex + "-" + index + "-" + item.id,
      kind: "writing",
      item,
      prompt: "Dengarkan, lalu tulis huruf dari ingatan.",
      promptMode: "audio",
      exerciseType: "write_from_audio",
      skill: "writing",
      phaseCode,
      curriculumVersion: CURRICULUM_VERSION_V21,
    };
  });
}

function useStrokeData(item: HiraganaLearningItem | undefined): {
  data: KanaStrokeData | null;
  loading: boolean;
} {
  const url = item?.strokeDataUrl ?? null;
  const [loaded, setLoaded] = useState<{
    url: string;
    data: KanaStrokeData | null;
  } | null>(null);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Stroke data gagal dimuat.");
        return response.json() as Promise<KanaStrokeData>;
      })
      .then((nextData) => setLoaded({ url, data: nextData }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoaded({ url, data: null });
      });

    return () => controller.abort();
  }, [url]);

  const currentData = loaded?.url === url ? loaded.data : null;
  return {
    data: currentData,
    loading: Boolean(url && loaded?.url !== url),
  };
}

function firstStrokeOnly(data: KanaStrokeData | null): KanaStrokeData | null {
  if (!data || data.strokes.length === 0) return null;
  return { strokes: data.strokes.slice(0, 1), medians: data.medians.slice(0, 1) };
}

function discriminateChoices(
  item: HiraganaLearningItem,
  pool: HiraganaLearningItem[],
): HiraganaLearningItem[] {
  const confusable = pool.filter(
    (candidate) => candidate.id !== item.id && item.confusableIds.includes(candidate.id),
  );
  const filler = pool.filter(
    (candidate) => candidate.id !== item.id && !item.confusableIds.includes(candidate.id),
  );
  const distractors = [...confusable, ...filler].slice(0, 2);
  const choices = [item, ...distractors];
  const shift = choices.length > 0 ? item.id % choices.length : 0;
  return choices.slice(shift).concat(choices.slice(0, shift));
}

// 2-4 other items must intervene before a hint-assisted item reappears
// unhinted (V2.1 §4.2, hint tier 4: "reset retrieval"). Reinserting a
// few slots into the remaining queue is what creates that gap.
function requeueAfterHint(remainingQueue: number[], itemId: number): number[] {
  const insertAt = Math.min(remainingQueue.length, 2 + Math.floor(Math.random() * 3));
  return [
    ...remainingQueue.slice(0, insertAt),
    itemId,
    ...remainingQueue.slice(insertAt),
  ];
}

const READ_WORDS_PER_ROUND = 3;

// Bagian 6.4 — prefer words that actually contain one of THIS unit's new
// characters (reading feels connected to what was just learned), falling
// back to any word the cumulative bank supports once those run out.
function selectReadWords(
  pool: HiraganaReadWord[],
  unitItemIds: Set<number>,
  count: number,
): HiraganaReadWord[] {
  const containing = pool.filter((word) => word.kanaIds.some((id) => unitItemIds.has(id)));
  const rest = pool.filter((word) => !containing.includes(word));
  return [...containing, ...rest].slice(0, Math.min(count, pool.length));
}

function DiscriminateStep({
  item,
  pool,
  saving,
  onOutcome,
}: {
  item: HiraganaLearningItem;
  pool: HiraganaLearningItem[];
  saving: boolean;
  onOutcome: (correct: boolean, selectedId: number) => void;
}) {
  const choices = useMemo(() => discriminateChoices(item, pool), [item, pool]);
  // Rendered with key={item.id} at the call site, so a fresh item
  // already means a fresh mount — no reset effect needed here.
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  return (
    <div className="hiragana-lab__discriminate">
      <p>Dengarkan bunyinya, lalu pilih huruf yang cocok. Huruf ini mudah tertukar dengan pilihan lain.</p>
      <AudioButton url={item.audioUrl} autoplay />
      <div className="hiragana-lab__discriminate-choices">
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
            <button
              type="button"
              key={choice.id}
              disabled={checked}
              className={stateClass}
              onClick={() => setSelected(choice.id)}
            >
              {choice.character}
            </button>
          );
        })}
      </div>
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

function normalizeRomaji(value: string): string {
  return value.trim().toLowerCase();
}

// Bagian 6.4 — "read short mora/word" (V2.1 §7), the step that was missing
// between "Dengar & Tulis" (single characters) and "Uji". Grading stays a
// plain string compare against the word's stored romaji, same convention
// HiraganaQuiz's typing questions already use — wanakana is used only as
// a live display-layer preview of what the typed romaji becomes in kana,
// never baked into the correctness check (CLAUDE.md's own rule: romaji is
// a display layer, not content).
function ReadStep({
  word,
  saving,
  onOutcome,
}: {
  word: HiraganaReadWord;
  saving: boolean;
  onOutcome: (typedRomaji: string) => void;
}) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const isCorrect = normalizeRomaji(value) === normalizeRomaji(word.romaji);
  const preview = value.trim().length > 0 ? wanakana.toHiragana(value) : "";

  return (
    <div className="hiragana-lab__read">
      <p>Baca kata ini, lalu ketik cara bacanya (romaji).</p>
      <div className="hiragana-lab__read-word">{word.wordKana}</div>
      {word.meaning && <small className="hiragana-lab__read-meaning">{word.meaning}</small>}
      <input
        className={[
          "hiragana-quiz__input",
          checked ? (isCorrect ? "is-correct" : "is-wrong") : "",
        ].filter(Boolean).join(" ")}
        value={value}
        disabled={checked}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ketik romaji..."
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {preview && !checked && <span className="hiragana-lab__read-preview">{preview}</span>}
      {checked && (
        <div className={isCorrect ? "hiragana-quiz__feedback is-correct" : "hiragana-quiz__feedback is-wrong"}>
          {isCorrect ? "Benar." : "Bacaan yang benar: " + word.romaji + "."}
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
          onOutcome(value);
        }}
      >
        {saving ? "Menyimpan..." : checked ? "Lanjut" : "Periksa"}
      </button>
    </div>
  );
}

function ShortMemoryFlash({
  item,
  onReady,
}: {
  item: HiraganaLearningItem;
  onReady: () => void;
}) {
  // No explicit key at the call site, but the parent RetrievalStep is
  // keyed by item id, so this remounts fresh for every new item.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      onReady();
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  return (
    <div className="hiragana-lab__flash">
      <span>Ingat bentuknya</span>
      <div className={"hiragana-lab__flash-kana" + (visible ? "" : " is-hidden")}>
        {item.character}
      </div>
      <p>{visible ? "Huruf akan disembunyikan sebentar lagi..." : "Sekarang tulis dari ingatan."}</p>
    </div>
  );
}

type RetrievalCueMode = "audio" | "flash";

function RetrievalStep({
  item,
  strokeData,
  strokeLoading,
  cueMode,
  hintLevel,
  hintOpened,
  onOpenHint,
  onCloseHint,
  onOutcome,
}: {
  item: HiraganaLearningItem;
  strokeData: KanaStrokeData | null;
  strokeLoading: boolean;
  cueMode: RetrievalCueMode;
  hintLevel: number;
  hintOpened: boolean;
  onOpenHint: (level: number) => void;
  onCloseHint: () => void;
  onOutcome: (outcome: KanaWritingOutcome) => void;
}) {
  // Rendered with key={item.id + "-" + cueMode-driving phase} at the
  // call site, so a fresh item/phase already means a fresh mount.
  const [flashDone, setFlashDone] = useState(cueMode === "audio");

  if (cueMode === "flash" && !flashDone) {
    return <ShortMemoryFlash item={item} onReady={() => setFlashDone(true)} />;
  }

  return (
    <div className="hiragana-lab__practice">
      <div className="hiragana-lab__recall-prompt">
        <small>{cueMode === "audio" ? "COBA DARI INGATAN" : "TULIS DARI MEMORI SINGKAT"}</small>
        {cueMode === "audio" ? (
          <AudioButton url={item.audioUrl} autoplay />
        ) : (
          <p>Tulis huruf yang baru saja tampil, tanpa audio maupun bentuk lagi.</p>
        )}
        {hintOpened && (
          <p>Percobaan ini memakai bantuan; harus diulang tanpa bantuan agar dihitung.</p>
        )}
      </div>

      <div className="hiragana-lab__hint">
        {hintLevel === 0 ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => onOpenHint(1)}
          >
            Saya lupa - beri petunjuk ringan
          </button>
        ) : hintLevel === 1 ? (
          <>
            <b>Hint 1 - Orientasi</b>
            <p>
              {strokeData?.strokeGroups?.length ?? strokeData?.strokes.length ?? 0} goresan.{" "}
              {item.mnemonic.strokeCue ?? "Ingat titik awal, urutan, dan arah gerakannya."}
            </p>
            <div className="hiragana-lab__hint-actions">
              <button type="button" className="primary-button" onClick={onCloseHint}>
                Tutup petunjuk dan coba lagi
              </button>
              <button type="button" className="secondary-button" onClick={() => onOpenHint(2)}>
                Masih lupa - lihat goresan pertama
              </button>
            </div>
          </>
        ) : hintLevel === 2 ? (
          <>
            <b>Hint 2 - Sebagian</b>
            <p>Ini goresan pertamanya saja. Bentuk lengkap belum ditampilkan.</p>
            <KanaStrokeAnimator character={item.character} strokeData={firstStrokeOnly(strokeData)} />
            <div className="hiragana-lab__hint-actions">
              <button type="button" className="primary-button" onClick={onCloseHint}>
                Tutup petunjuk dan coba lagi
              </button>
              <button type="button" className="secondary-button" onClick={() => onOpenHint(3)}>
                Masih lupa - lihat gerakan lengkap
              </button>
            </div>
          </>
        ) : (
          <>
            <b>Hint 3 - Model</b>
            <p>Pelajari kembali urutannya. Hasil dengan bantuan tidak dihitung sebagai penguasaan.</p>
            <KanaStrokeAnimator character={item.character} strokeData={strokeData} />
            <button type="button" className="primary-button" onClick={onCloseHint}>
              Tutup bantuan dan coba lagi
            </button>
          </>
        )}
      </div>

      {strokeLoading ? (
        <div className="hiragana-stage__loading">Memuat area menulis...</div>
      ) : (
        <KanaWritingCoach
          key={item.id + "-" + cueMode + "-" + hintLevel}
          character={item.character}
          strokeData={strokeData}
          mode="recall"
          hintLevel={hintLevel >= 3 ? 2 : 0}
          onComplete={onOutcome}
        />
      )}

      <details className="hiragana-lab__scoring-note">
        <summary>Bagaimana tulisan diperiksa?</summary>
        <p>
          Sistem memeriksa jumlah goresan logis, urutan, arah, titik awal-akhir,
          dan kemiripan bentuk. Kelulusan hanya diberikan jika semua goresan
          cocok TANPA bantuan yang sedang terbuka.
        </p>
      </details>
    </div>
  );
}

export function HiraganaLearningLab({
  bundle,
  onComplete,
}: HiraganaLearningLabProps) {
  const stateIsCurrent = bundle.stage.state.labVersion === HIRAGANA_LAB_VERSION;
  const initialCompleted = stateIsCurrent
    ? stringArray(bundle.stage.state.completedUnitCodes)
    : [];
  const initialWritten = stateIsCurrent
    ? numberArray(bundle.stage.state.freeWrittenKanaIds)
    : [];
  const firstIncompleteIndex = bundle.units.findIndex(
    (unit) => !initialCompleted.includes(unit.code),
  );
  const startingUnitIndex =
    firstIncompleteIndex >= 0 ? firstIncompleteIndex : Math.max(bundle.units.length - 1, 0);

  const [unitIndex, setUnitIndex] = useState(startingUnitIndex);
  // PROMPT-7 Bagian 5 — vocal bridge intro, only ever relevant right
  // before F1's very first batch (startingUnitIndex 0, nothing completed
  // yet). A learner resuming mid-way through F1, or any later stage,
  // never sees it — it's a one-time "you already know half of this"
  // moment, not a recurring banner.
  const [showVocalBridge, setShowVocalBridge] = useState(
    bundle.stage.code === "F1" && startingUnitIndex === 0 && initialCompleted.length === 0,
  );
  const [phase, setPhase] = useState<LearningPhase>("anchor");
  const [itemIndex, setItemIndex] = useState(0);
  const [completedUnitCodes, setCompletedUnitCodes] = useState(initialCompleted);
  const [freeWrittenKanaIds, setFreeWrittenKanaIds] = useState(initialWritten);

  const [guidedScore, setGuidedScore] = useState<number | null>(null);
  const [guidedPassed, setGuidedPassed] = useState(false);

  const [retrievalQueue, setRetrievalQueue] = useState<number[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [hintOpened, setHintOpened] = useState(false);
  const [retrievalScore, setRetrievalScore] = useState<number | null>(null);
  const [retrievalPassed, setRetrievalPassed] = useState(false);
  const attemptedOnceRef = useRef<Set<number>>(new Set());

  const [readQueue, setReadQueue] = useState<HiraganaReadWord[]>([]);

  const [checkpointKey, setCheckpointKey] = useState(0);
  const [checkpointMessage, setCheckpointMessage] = useState("");
  const [lastCheckpointResult, setLastCheckpointResult] =
    useState<HiraganaQuizResult | null>(null);
  const [saving, setSaving] = useState(false);
  // Bagian 3: disables the relevant continue control while an attempt
  // save is in flight, so the item/phase can't change (and the tab can't
  // meaningfully be closed on a "done" screen) before it lands.
  const [savingAttempt, setSavingAttempt] = useState(false);

  const unit = bundle.units[unitIndex];
  const phaseCode = V21_PHASE_CODE_BY_STAGE[bundle.stage.code] ?? bundle.stage.code;
  const phaseTarget = bundle.items.length;
  const batchCharacterCount = bundle.units.reduce(
    (total, candidate) => total + candidate.items.length,
    0,
  );
  const previousPhaseCount = Math.max(0, phaseTarget - batchCharacterCount);
  const finalUnit = unitIndex === bundle.units.length - 1;
  const regularCheckpointCount = configurationNumber(
    bundle.stage.configuration,
    "checkpointQuestions",
    10,
  );
  const cumulativeCheckpointCount = configurationNumber(
    bundle.stage.configuration,
    "cumulativeCheckpointQuestions",
    Math.min(phaseTarget, 20),
  );
  const checkpointQuestionCount = finalUnit
    ? cumulativeCheckpointCount
    : regularCheckpointCount;
  const checkpointQuestions = useMemo(
    () => buildCheckpointQuestions(
      bundle.units,
      bundle.items,
      unitIndex,
      checkpointQuestionCount,
      phaseCode,
    ),
    [bundle.items, bundle.units, checkpointQuestionCount, unitIndex, phaseCode],
  );
  const unlockWords = unit ? HIRAGANA_WORD_UNLOCKS[unit.code] ?? [] : [];
  const learnedCharacterCount = previousPhaseCount + bundle.units
    .filter((candidate) => completedUnitCodes.includes(candidate.code))
    .reduce((total, candidate) => total + candidate.items.length, 0);

  const anchorItem = unit?.items[itemIndex];
  const guidedItem = unit?.items[itemIndex];
  const discriminateItem = unit?.items[itemIndex];
  const retrievalItemId = retrievalQueue[0];
  const retrievalItem = unit?.items.find((candidate) => candidate.id === retrievalItemId);
  const strokeTarget = phase === "guided" ? guidedItem : phase === "anchor" ? anchorItem : retrievalItem;
  const stroke = useStrokeData(strokeTarget);

  async function persistState(
    nextCompleted: string[],
    nextWritten: number[],
    currentUnitCode: string | null,
  ) {
    return saveHiraganaStageState({
      stageId: bundle.stage.id,
      state: {
        labVersion: HIRAGANA_LAB_VERSION,
        completedUnitCodes: nextCompleted,
        freeWrittenKanaIds: nextWritten,
        currentUnitCode,
      },
    });
  }

  function openUnit(nextUnitIndex: number) {
    const nextUnit = bundle.units[nextUnitIndex];
    if (!nextUnit) return;
    setUnitIndex(nextUnitIndex);
    setCheckpointMessage("");
    setPhase("anchor");
    setItemIndex(0);
    setGuidedScore(null);
    setGuidedPassed(false);
    setRetrievalQueue([]);
    setHintLevel(0);
    setHintOpened(false);
    setRetrievalScore(null);
    setRetrievalPassed(false);
    setReadQueue([]);
  }

  // Prompt 4 Bagian 3: this used to be void recordHiraganaAttempt(...) —
  // fire-and-forget, not awaited. If the user closed the tab right after
  // their last click, the save could still be in flight and never land
  // (reproduced by hand: confirmed the UI can advance through all of a
  // unit's items while only 1 of 5 attempt rows actually reaches the
  // server). Now awaited by every caller before they advance the UI, so
  // the save is guaranteed to have finished — or to have surfaced its own
  // error — before the item that depended on it changes.
  async function recordAttempt(input: {
    item: HiraganaLearningItem;
    exerciseType: "discriminate" | "trace" | "short_memory" | "write_from_audio";
    skill: "audio" | "writing";
    isFirstAttempt: boolean;
    outcomeMatched: boolean;
    assisted: boolean;
    hintLevelUsed: number;
    selectedKanaId?: number | null;
    writingScore?: number | null;
    writingMatched?: boolean | null;
  }): Promise<void> {
    await recordHiraganaAttempt({
      stageId: bundle.stage.id,
      kanaId: input.item.id,
      exerciseType: input.exerciseType,
      skill: input.skill,
      selectedKanaId: input.selectedKanaId ?? null,
      writingScore: input.writingScore ?? null,
      writingMatched: input.writingMatched ?? null,
      phaseCode,
      curriculumVersion: CURRICULUM_VERSION_V21,
      hintLevel: input.hintLevelUsed,
      assisted: input.assisted,
      firstAttemptCorrect: input.isFirstAttempt
        ? input.outcomeMatched && !input.assisted
        : null,
    });
  }

  function advanceAnchor() {
    if (!unit) return;
    if (itemIndex + 1 < unit.items.length) {
      setItemIndex((value) => value + 1);
      return;
    }
    setPhase("discriminate");
    setItemIndex(0);
  }

  async function handleDiscriminateOutcome(correct: boolean, selectedId: number) {
    if (!discriminateItem) return;
    setSavingAttempt(true);
    await recordAttempt({
      item: discriminateItem,
      exerciseType: "discriminate",
      skill: "audio",
      isFirstAttempt: true,
      outcomeMatched: correct,
      assisted: false,
      hintLevelUsed: 0,
      selectedKanaId: selectedId,
    });
    setSavingAttempt(false);
    if (!unit) return;
    if (itemIndex + 1 < unit.items.length) {
      setItemIndex((value) => value + 1);
      return;
    }
    setPhase("guided");
    setItemIndex(0);
    setGuidedScore(null);
    setGuidedPassed(false);
  }

  async function handleGuidedOutcome(outcome: KanaWritingOutcome) {
    setGuidedScore(outcome.score);
    if (!guidedItem) return;
    // guidedPassed (which enables "Lanjut") is set only after the save
    // lands, not before — matched-but-unsaved must not look continuable.
    if (outcome.matched) setSavingAttempt(true);
    await recordAttempt({
      item: guidedItem,
      exerciseType: "trace",
      skill: "writing",
      isFirstAttempt: true,
      outcomeMatched: outcome.matched,
      assisted: false,
      hintLevelUsed: 0,
      writingScore: outcome.score,
      writingMatched: outcome.matched,
    });
    if (outcome.matched) setSavingAttempt(false);
    setGuidedPassed(outcome.matched);
  }

  function advanceGuided() {
    if (!unit) return;
    if (itemIndex + 1 < unit.items.length) {
      setItemIndex((value) => value + 1);
      setGuidedScore(null);
      setGuidedPassed(false);
      return;
    }
    attemptedOnceRef.current = new Set();
    setPhase("shortMemory");
    setRetrievalQueue(unit.items.map((candidate) => candidate.id));
    setHintLevel(0);
    setHintOpened(false);
    setRetrievalScore(null);
    setRetrievalPassed(false);
  }

  async function handleRetrievalOutcome(
    outcome: KanaWritingOutcome,
    cueMode: RetrievalCueMode,
  ) {
    if (!retrievalItem) return;
    setRetrievalScore(outcome.score);
    const passedClean = outcome.matched && !hintOpened;
    setRetrievalPassed(passedClean);

    const isFirstAttempt = !attemptedOnceRef.current.has(retrievalItem.id);
    attemptedOnceRef.current.add(retrievalItem.id);

    // Awaited before anything below touches retrievalQueue/phase — this
    // item must not disappear from view until its save has landed.
    await recordAttempt({
      item: retrievalItem,
      exerciseType: cueMode === "flash" ? "short_memory" : "write_from_audio",
      skill: "writing",
      isFirstAttempt,
      outcomeMatched: outcome.matched,
      assisted: hintOpened,
      hintLevelUsed: hintLevel,
      writingScore: outcome.score,
      writingMatched: outcome.matched,
    });

    const remaining = retrievalQueue.slice(1);
    setHintLevel(0);
    setHintOpened(false);

    if (passedClean) {
      if (cueMode === "audio") {
        const nextWritten = [...new Set([...freeWrittenKanaIds, retrievalItem.id])];
        setFreeWrittenKanaIds(nextWritten);
        await persistState(completedUnitCodes, nextWritten, unit?.code ?? null);
      }
      setRetrievalQueue(remaining);
      if (remaining.length === 0) {
        if (cueMode === "flash") {
          setPhase("recall");
          setRetrievalQueue(unit?.items.map((candidate) => candidate.id) ?? []);
          attemptedOnceRef.current = new Set();
        } else {
          const unitItemIds = new Set(unit?.items.map((candidate) => candidate.id) ?? []);
          const words = selectReadWords(bundle.readWords, unitItemIds, READ_WORDS_PER_ROUND);
          if (words.length > 0) {
            setPhase("read");
            setReadQueue(words);
          } else {
            setPhase("checkpoint");
            setCheckpointMessage("");
            setCheckpointKey((value) => value + 1);
          }
        }
        setRetrievalScore(null);
        setRetrievalPassed(false);
      }
    } else {
      setRetrievalQueue(requeueAfterHint(remaining, retrievalItem.id));
    }
  }

  async function handleReadOutcome(word: HiraganaReadWord, typedRomaji: string) {
    setSavingAttempt(true);
    await recordReadAttempt({
      stageId: bundle.stage.id,
      wordId: word.id,
      kanaIds: word.kanaIds,
      typedRomaji,
      correctRomaji: word.romaji,
      phaseCode,
      curriculumVersion: CURRICULUM_VERSION_V21,
    });
    setSavingAttempt(false);
    const remaining = readQueue.slice(1);
    setReadQueue(remaining);
    if (remaining.length === 0) {
      setPhase("checkpoint");
      setCheckpointMessage("");
      setCheckpointKey((value) => value + 1);
    }
  }

  async function finishCheckpoint(result: HiraganaQuizResult) {
    if (!unit) return;
    const requiredCorrect = Math.ceil(result.total * 0.8);
    if (result.correct < requiredCorrect) {
      setCheckpointMessage(
        "Hasil " + result.correct + "/" + result.total + ". Ulangi sampai minimal " + requiredCorrect + " benar; petunjuk tidak dibuka.",
      );
      setCheckpointKey((value) => value + 1);
      return;
    }

    const nextCompleted = [...new Set([...completedUnitCodes, unit.code])];
    setSaving(true);
    const response = await persistState(
      nextCompleted,
      freeWrittenKanaIds,
      bundle.units[unitIndex + 1]?.code ?? null,
    );
    setSaving(false);
    if (!response.ok) {
      setCheckpointMessage(response.error ?? "Progres belum berhasil disimpan.");
      setCheckpointKey((value) => value + 1);
      return;
    }
    setCompletedUnitCodes(nextCompleted);
    setLastCheckpointResult(result);
    setCheckpointMessage("Checkpoint lulus " + result.correct + "/" + result.total + ".");
    setPhase("unlock");
  }

  function continueAfterUnlock() {
    const state = {
      labVersion: HIRAGANA_LAB_VERSION,
      completedUnitCodes,
      freeWrittenKanaIds,
      currentUnitCode: bundle.units[unitIndex + 1]?.code ?? null,
    };
    if (completedUnitCodes.length >= bundle.units.length) {
      onComplete(lastCheckpointResult ?? { correct: 10, total: 10 }, state);
      return;
    }
    openUnit(unitIndex + 1);
  }

  if (!unit) {
    return <div className="hiragana-stage__empty">Data batch Hiragana belum tersedia.</div>;
  }

  if (showVocalBridge) {
    return (
      <VocalBridgeIntro
        vowels={bundle.items.slice(0, 5)}
        onContinue={() => setShowVocalBridge(false)}
      />
    );
  }

  const phaseSteps: { key: LearningPhase; label: string }[] = [
    { key: "anchor", label: "Kenali" },
    { key: "discriminate", label: "Bedakan" },
    { key: "guided", label: "Ikuti" },
    { key: "shortMemory", label: "Ingat Singkat" },
    { key: "recall", label: "Dengar & Tulis" },
    { key: "read", label: "Baca" },
    { key: "checkpoint", label: "Uji" },
  ];
  const phaseNumber = Math.max(1, phaseSteps.findIndex((step) => step.key === phase) + 1);
  const currentCharacterPosition =
    phase === "checkpoint" || phase === "unlock" || phase === "read"
      ? unit.items.length
      : phase === "shortMemory" || phase === "recall"
        ? unit.items.length - retrievalQueue.length + 1
        : itemIndex + 1;

  return (
    <div className="hiragana-lab">
      <aside className="hiragana-lab__rail">
        <div className="hiragana-lab__rail-head">
          <div>
            <span>{bundle.stage.code} - BATCH +{batchCharacterCount}</span>
            <strong>{learnedCharacterCount}/{phaseTarget} dipelajari</strong>
          </div>
          <div className="hiragana-lab__progress">
            <span style={{ width: Math.round((learnedCharacterCount / phaseTarget) * 100) + "%" }} />
          </div>
          <div className="hiragana-lab__rail-summary">
            <div><b>+{batchCharacterCount}</b><small>huruf baru</small></div>
            <div><b>{phaseTarget}</b><small>bank aktif</small></div>
          </div>
        </div>

        <div className="hiragana-lab__units">
          {bundle.units.map((candidate, index) => {
            const complete = completedUnitCodes.includes(candidate.code);
            const open = complete || index === unitIndex;
            return (
              <button
                type="button"
                key={candidate.code}
                disabled={!open}
                className={[
                  index === unitIndex ? "is-active" : "",
                  complete ? "is-complete" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => complete && openUnit(index)}
                aria-current={index === unitIndex ? "step" : undefined}
              >
                <span>{complete ? "OK" : String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{candidate.description}</strong>
                  <small>{complete ? "Selesai - masuk bank soal" : index === unitIndex ? "Sedang dipelajari" : "Terkunci"}</small>
                </div>
              </button>
            );
          })}
        </div>

        <div className="hiragana-lab__principle">
          <b>Workflow menuju 46 huruf</b>
          <p>Lihat-dengar, bedakan, ikuti goresan, tulis dari memori singkat, tulis dari audio, baca kata pendek, lalu diuji campur dengan huruf lama. Fase berikutnya hanya menambah huruf baru setelah ingatan lama kembali dipanggil.</p>
        </div>
      </aside>

      <section className="hiragana-lab__main">
        <header className="hiragana-lab__header">
          <div>
            <span>{unit.title}</span>
            <h2>
              {phase === "anchor" && "Kenali bentuk dan bunyinya"}
              {phase === "discriminate" && "Bedakan dari huruf yang mirip"}
              {phase === "guided" && "Bangun gerakan tangan"}
              {phase === "shortMemory" && "Tulis dari memori singkat"}
              {phase === "recall" && "Tulis dari audio"}
              {phase === "read" && "Baca kata pendek"}
              {phase === "checkpoint" && "Checkpoint campuran"}
              {phase === "unlock" && "Makna mulai terbuka"}
            </h2>
          </div>
          <div className="hiragana-lab__header-meta">
            <span>Langkah {phaseNumber}/7 - {phaseSteps[phaseNumber - 1]?.label ?? "Uji"}</span>
            <b>Huruf {Math.min(currentCharacterPosition, unit.items.length)}/{unit.items.length}</b>
          </div>
        </header>

        <ol className="hiragana-lab__steps" aria-label={"Langkah belajar " + phaseNumber + " dari 7"}>
          {phaseSteps.map((step, index) => (
            <li
              key={step.key}
              className={index + 1 === phaseNumber ? "is-active" : index + 1 < phaseNumber ? "is-done" : ""}
              aria-current={index + 1 === phaseNumber ? "step" : undefined}
            >
              <b>{index + 1 < phaseNumber ? "OK" : index + 1}</b><span>{step.label}</span>
            </li>
          ))}
        </ol>

        {phase === "anchor" && anchorItem && (
          <div className="hiragana-lab__anchor">
            <div className="hiragana-lab__anchor-card">
              <div className="hiragana-lab__kana">{anchorItem.character}</div>
              <div>
                <span className="hiragana-lab__emoji">{anchorItem.mnemonic.emoji}</span>
                <small>ANCHOR BUNYI</small>
                <h3>{anchorItem.mnemonic.anchorWord ?? anchorItem.mnemonic.title}</h3>
                <p>{anchorItem.mnemonic.soundCue ?? anchorItem.mnemonic.story}</p>
                <AudioButton url={anchorItem.audioUrl} autoplay />
              </div>
            </div>

            <div className="hiragana-lab__cues">
              <div><small>BENTUK</small><p>{anchorItem.mnemonic.shapeCue ?? anchorItem.mnemonic.story}</p></div>
              <div><small>GERAKAN</small><p>{anchorItem.mnemonic.strokeCue ?? "Amati arah dan urutan setiap goresan, bukan hanya hasil akhirnya."}</p></div>
            </div>

            <div className="hiragana-lab__animation">
              {stroke.loading ? (
                <div className="hiragana-stage__loading">Memuat urutan goresan...</div>
              ) : (
                <KanaStrokeAnimator
                  key={anchorItem.id}
                  character={anchorItem.character}
                  strokeData={stroke.data}
                />
              )}
            </div>

            <button type="button" className="primary-button" onClick={advanceAnchor}>
              Lanjut
            </button>
          </div>
        )}

        {phase === "discriminate" && discriminateItem && (
          <DiscriminateStep
            key={discriminateItem.id}
            item={discriminateItem}
            pool={bundle.items}
            saving={savingAttempt}
            onOutcome={(correct, selectedId) => void handleDiscriminateOutcome(correct, selectedId)}
          />
        )}

        {phase === "guided" && guidedItem && (
          <div className="hiragana-lab__practice">
            <p>Ikuti goresan samar satu per satu. Tahap ini melatih gerakan, jadi tidak memakai angka kelulusan yang menghukum.</p>
            {stroke.loading ? (
              <div className="hiragana-stage__loading">Memuat area menulis...</div>
            ) : (
              <KanaWritingCoach
                key={"guided-" + guidedItem.id}
                character={guidedItem.character}
                strokeData={stroke.data}
                mode="guided"
                onComplete={(outcome) => void handleGuidedOutcome(outcome)}
              />
            )}
            {guidedScore != null && (
              <div className={"hiragana-lab__score " + (guidedPassed ? "is-pass" : "is-retry")}>
                <strong>{guidedScore}</strong>
                <span>{guidedPassed ? "Latihan terpandu selesai" : "Coba lagi dengan pola samar"}</span>
              </div>
            )}
            <button
              type="button"
              className="primary-button"
              disabled={!guidedPassed || savingAttempt}
              onClick={advanceGuided}
            >
              {savingAttempt ? "Menyimpan..." : "Lanjut"}
            </button>
          </div>
        )}

        {(phase === "shortMemory" || phase === "recall") && retrievalItem && (
          <>
            <RetrievalStep
              key={retrievalItem.id + "-" + phase}
              item={retrievalItem}
              strokeData={stroke.data}
              strokeLoading={stroke.loading}
              cueMode={phase === "shortMemory" ? "flash" : "audio"}
              hintLevel={hintLevel}
              hintOpened={hintOpened}
              onOpenHint={(level) => {
                setHintLevel(level);
                setHintOpened(true);
                setRetrievalScore(null);
                setRetrievalPassed(false);
              }}
              onCloseHint={() => {
                setHintLevel(0);
                setRetrievalScore(null);
                setRetrievalPassed(false);
              }}
              onOutcome={(outcome) => void handleRetrievalOutcome(outcome, phase === "shortMemory" ? "flash" : "audio")}
            />
            {retrievalScore != null && (
              <div className={"hiragana-lab__score " + (retrievalPassed ? "is-pass" : "is-retry")}>
                <strong>{retrievalScore}%</strong>
                <span>
                  {retrievalPassed
                    ? "Lulus tanpa bantuan"
                    : hintOpened
                      ? "Dibantu - akan muncul lagi tanpa bantuan setelah beberapa huruf lain"
                      : "Belum cocok; periksa bentuk, urutan, dan arah"}
                </span>
              </div>
            )}
          </>
        )}

        {phase === "read" && readQueue[0] && (
          <ReadStep
            key={readQueue[0].id}
            word={readQueue[0]}
            saving={savingAttempt}
            onOutcome={(typedRomaji) => void handleReadOutcome(readQueue[0], typedRomaji)}
          />
        )}

        {phase === "checkpoint" && (
          <div className="hiragana-lab__checkpoint">
            <div className="hiragana-lab__checkpoint-note">
              <strong>{checkpointQuestionCount} soal - minimal {Math.ceil(checkpointQuestionCount * 0.8)} benar</strong>
              <span>
                {finalUnit
                  ? "Checkpoint akhir fase memakai bank seluruh " + phaseTarget + " huruf yang telah dipelajari."
                  : "Campuran huruf baru dan lama sesuai ukuran bank aktif."}
              </span>
            </div>
            {checkpointMessage && <p className="hiragana-stage__feedback">{checkpointMessage}</p>}
            <HiraganaQuiz
              key={checkpointKey}
              stageId={bundle.stage.id}
              questions={checkpointQuestions}
              onComplete={(result) => void finishCheckpoint(result)}
            />
          </div>
        )}

        {phase === "unlock" && (
          <div className="hiragana-lab__unlock">
            <span className="hiragana-lab__unlock-mark">UNLOCK</span>
            <h3>
              {unlockWords.length > 0
                ? "Huruf-huruf ini sekarang menjadi kata nyata"
                : "Kelompok selesai; ingatan lama tetap aktif"}
            </h3>
            <p>
              {unlockWords.length > 0
                ? "Romaji hanya ditampilkan di sini untuk mengonfirmasi bacaan. Coba baca kana lebih dahulu."
                : "Huruf baru ini akan dicampur dengan seluruh huruf sebelumnya pada checkpoint kumulatif."}
            </p>
            <div className="hiragana-lab__words">
              {unlockWords.length > 0 ? unlockWords.map((word) => (
                <div key={word.kana}>
                  <strong>{word.kana}</strong>
                  <span>{word.romaji}</span>
                  <small>{word.meaning}</small>
                </div>
              )) : (
                <div className="is-summary">
                  <strong>{unit.items.map((candidate) => candidate.character).join(" ")}</strong>
                  <span>Masuk bank soal {phaseTarget} huruf</span>
                  <small>Tetap muncul kembali pada fase berikutnya</small>
                </div>
              )}
            </div>
            <button
              type="button"
              className="primary-button"
              disabled={saving}
              onClick={continueAfterUnlock}
            >
              {completedUnitCodes.length >= bundle.units.length
                ? "Selesaikan " + bundle.stage.code + " - total " + phaseTarget + " huruf"
                : "Buka kelompok berikutnya"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
