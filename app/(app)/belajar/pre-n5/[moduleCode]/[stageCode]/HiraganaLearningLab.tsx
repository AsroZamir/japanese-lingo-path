"use client";

import { useEffect, useMemo, useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import { StrokeAnimation } from "@/components/kana/StrokeAnimation";
import { WritingCanvas } from "@/components/kana/WritingCanvas";
import type { KanaStrokeData } from "@/components/kana/stroke-geometry";
import {
  HIRAGANA_LAB_VERSION,
  HIRAGANA_WORD_UNLOCKS,
} from "@/app/lib/hiragana-mnemonics";
import type {
  HiraganaLearningItem,
  HiraganaStageBundle,
  HiraganaUnit,
} from "@/app/lib/pre-n5-01-query";
import {
  calculateWritingScore,
  HiraganaQuiz,
  type HiraganaQuizQuestion,
  type HiraganaQuizResult,
} from "./HiraganaQuiz";
import {
  recordHiraganaAttempt,
  saveHiraganaStageState,
} from "./actions";

type LearningPhase = "anchor" | "guided" | "recall" | "checkpoint" | "unlock";
type WritingSurface = "screen" | "paper";

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

function choicesFor(
  pool: HiraganaLearningItem[],
  target: HiraganaLearningItem,
  offset: number,
): HiraganaLearningItem[] {
  const distractors = pool
    .filter((item) => item.id !== target.id)
    .slice(offset)
    .concat(pool.filter((item) => item.id !== target.id).slice(0, offset))
    .slice(0, 3);
  const choices = [target, ...distractors];
  const shift = choices.length > 0 ? offset % choices.length : 0;
  return choices.slice(shift).concat(choices.slice(0, shift));
}

function buildCheckpointQuestions(
  units: HiraganaUnit[],
  unitIndex: number,
): HiraganaQuizQuestion[] {
  const learnedPool = units
    .slice(0, unitIndex + 1)
    .flatMap((unit) => unit.items);
  const currentItems = units[unitIndex]?.items ?? [];
  const previousPool = units
    .slice(0, unitIndex)
    .flatMap((unit) => unit.items);
  if (learnedPool.length === 0 || currentItems.length === 0) return [];

  const targets = Array.from({ length: 10 }, (_, index) => {
    if (index < 7) return currentItems[index % currentItems.length];
    return previousPool.length > 0
      ? previousPool[(index * 3 + unitIndex) % previousPool.length]
      : currentItems[index % currentItems.length];
  });

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
  const startingItemIndex = Math.max(
    0,
    bundle.units[startingUnitIndex]?.items.findIndex(
      (item) => !initialWritten.includes(item.id),
    ) ?? 0,
  );
  const startingUnitFinished =
    bundle.units[startingUnitIndex]?.items.every((item) =>
      initialWritten.includes(item.id),
    ) ?? false;

  const [unitIndex, setUnitIndex] = useState(startingUnitIndex);
  const [itemIndex, setItemIndex] = useState(startingItemIndex);
  const [phase, setPhase] = useState<LearningPhase>(
    startingUnitFinished && !initialCompleted.includes(bundle.units[startingUnitIndex]?.code)
      ? "checkpoint"
      : "anchor",
  );
  const [completedUnitCodes, setCompletedUnitCodes] = useState(initialCompleted);
  const [freeWrittenKanaIds, setFreeWrittenKanaIds] = useState(initialWritten);
  const [guidedScore, setGuidedScore] = useState<number | null>(null);
  const [recallScore, setRecallScore] = useState<number | null>(null);
  const [writingSurface, setWritingSurface] = useState<WritingSurface>("screen");
  const [paperRevealed, setPaperRevealed] = useState(false);
  const [checkpointKey, setCheckpointKey] = useState(0);
  const [checkpointMessage, setCheckpointMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const unit = bundle.units[unitIndex];
  const item = unit?.items[itemIndex];
  const stroke = useStrokeData(item);
  const checkpointQuestions = useMemo(
    () => buildCheckpointQuestions(bundle.units, unitIndex),
    [bundle.units, unitIndex],
  );
  const unlockWords = unit ? HIRAGANA_WORD_UNLOCKS[unit.code] ?? [] : [];
  const learnedCharacterCount = bundle.units
    .filter((candidate) => completedUnitCodes.includes(candidate.code))
    .reduce((total, candidate) => total + candidate.items.length, 0);

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

  function resetItem(nextIndex: number) {
    setItemIndex(nextIndex);
    setPhase("anchor");
    setGuidedScore(null);
    setRecallScore(null);
    setWritingSurface("screen");
    setPaperRevealed(false);
  }

  function openUnit(nextUnitIndex: number) {
    const nextUnit = bundle.units[nextUnitIndex];
    if (!nextUnit) return;
    const nextItemIndex = Math.max(
      0,
      nextUnit.items.findIndex((candidate) => !freeWrittenKanaIds.includes(candidate.id)),
    );
    setUnitIndex(nextUnitIndex);
    setCheckpointMessage("");
    if (
      nextUnit.items.every((candidate) => freeWrittenKanaIds.includes(candidate.id)) &&
      !completedUnitCodes.includes(nextUnit.code)
    ) {
      setItemIndex(0);
      setPhase("checkpoint");
      return;
    }
    resetItem(nextItemIndex);
  }

  function recordWritingAttempt(score: number, exerciseType: "trace" | "write_from_audio") {
    if (!item) return;
    void recordHiraganaAttempt({
      stageId: bundle.stage.id,
      kanaId: item.id,
      exerciseType,
      skill: "writing",
      writingScore: score,
    });
  }

  function handleGuidedScore(score: number) {
    setGuidedScore(score);
    recordWritingAttempt(score, "trace");
  }

  async function acceptRecallScore(score: number) {
    if (!item) return;
    setRecallScore(score);
    recordWritingAttempt(score, "write_from_audio");
    if (score < 80) return;

    const nextWritten = [...new Set([...freeWrittenKanaIds, item.id])];
    setFreeWrittenKanaIds(nextWritten);
    await persistState(
      completedUnitCodes,
      nextWritten,
      unit?.code ?? null,
    );
  }

  function continueAfterRecall() {
    if (!unit || recallScore == null || recallScore < 80) return;
    if (itemIndex + 1 < unit.items.length) {
      resetItem(itemIndex + 1);
      return;
    }
    setPhase("checkpoint");
    setCheckpointMessage("");
    setCheckpointKey((value) => value + 1);
  }

  async function handlePaperAssessment(correct: boolean) {
    if (!paperRevealed || !item) return;
    const score = correct ? 100 : 0;
    if (!correct) {
      recordWritingAttempt(score, "write_from_audio");
      setRecallScore(score);
      setPaperRevealed(false);
      return;
    }
    await acceptRecallScore(score);
  }

  async function finishCheckpoint(result: HiraganaQuizResult) {
    if (!unit) return;
    if (result.correct < 8) {
      setCheckpointMessage(
        "Hasil " + result.correct + "/10. Ulangi sampai minimal 8 benar; petunjuk tidak dibuka.",
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
    setCheckpointMessage("Checkpoint lulus " + result.correct + "/10.");
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
      onComplete({ correct: 10, total: 10 }, state);
      return;
    }
    openUnit(unitIndex + 1);
  }

  if (!unit || !item) {
    return <div className="hiragana-stage__empty">Data trial 20 Hiragana belum tersedia.</div>;
  }

  const phaseNumber =
    phase === "anchor" ? 1 : phase === "guided" ? 2 : phase === "recall" ? 3 : 4;

  return (
    <div className="hiragana-lab">
      <aside className="hiragana-lab__rail">
        <div className="hiragana-lab__rail-head">
          <div>
            <span>TRIAL 20 HIRAGANA</span>
            <strong>{learnedCharacterCount}/20 dikuasai</strong>
          </div>
          <div className="hiragana-lab__progress">
            <span style={{ width: Math.round((learnedCharacterCount / 20) * 100) + "%" }} />
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
                onClick={() => openUnit(index)}
              >
                <span>{complete ? "OK" : String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{candidate.description}</strong>
                  <small>{complete ? "Sudah lulus" : index === unitIndex ? "Sedang dipelajari" : "Terkunci"}</small>
                </div>
              </button>
            );
          })}
        </div>

        <div className="hiragana-lab__principle">
          <b>Kenapa urutannya seperti ini?</b>
          <p>Petunjuk membantu saat kenalan. Ingatan diuji tanpa petunjuk, lalu diulang secara bertahap.</p>
        </div>
      </aside>

      <section className="hiragana-lab__main">
        <header className="hiragana-lab__header">
          <div>
            <span>{unit.title}</span>
            <h2>
              {phase === "anchor" && "Kenali bentuk dan bunyinya"}
              {phase === "guided" && "Bangun gerakan tangan"}
              {phase === "recall" && "Tulis dari ingatan"}
              {phase === "checkpoint" && "Checkpoint campuran"}
              {phase === "unlock" && "Makna mulai terbuka"}
            </h2>
          </div>
          <b>{phase === "checkpoint" || phase === "unlock" ? "5/5 huruf" : itemIndex + 1 + "/5"}</b>
        </header>

        <div className="hiragana-lab__steps" aria-label={"Langkah belajar " + phaseNumber + " dari 4"}>
          {["Kenali", "Ikuti", "Ingat", "Uji"].map((label, index) => (
            <span
              key={label}
              className={index + 1 === phaseNumber ? "is-active" : index + 1 < phaseNumber ? "is-done" : ""}
            >
              <b>{index + 1}</b>{label}
            </span>
          ))}
        </div>

        {phase === "anchor" && (
          <div className="hiragana-lab__anchor">
            <div className="hiragana-lab__anchor-card">
              <div className="hiragana-lab__kana">{item.character}</div>
              <div>
                <span className="hiragana-lab__emoji">{item.mnemonic.emoji}</span>
                <small>ANCHOR BUNYI</small>
                <h3>{item.mnemonic.anchorWord ?? item.mnemonic.title}</h3>
                <p>{item.mnemonic.soundCue ?? item.mnemonic.story}</p>
                <AudioButton url={item.audioUrl} autoplay />
              </div>
            </div>

            <div className="hiragana-lab__cues">
              <div><small>BENTUK</small><p>{item.mnemonic.shapeCue ?? item.mnemonic.story}</p></div>
              <div><small>GERAKAN</small><p>{item.mnemonic.strokeCue ?? "Amati arah dan urutan setiap goresan, bukan hanya hasil akhirnya."}</p></div>
            </div>

            <div className="hiragana-lab__animation">
              {stroke.loading ? (
                <div className="hiragana-stage__loading">Memuat urutan goresan...</div>
              ) : (
                <StrokeAnimation
                  key={item.id}
                  character={item.character}
                  strokeData={stroke.data}
                  showGrid
                />
              )}
            </div>

            <button type="button" className="primary-button" onClick={() => setPhase("guided")}>
              Saya siap mengikuti goresannya
            </button>
          </div>
        )}

        {phase === "guided" && (
          <div className="hiragana-lab__practice">
            <p>Ikuti goresan samar satu per satu. Target awal 70 agar gerakannya cukup stabil.</p>
            {stroke.loading ? (
              <div className="hiragana-stage__loading">Memuat area menulis...</div>
            ) : (
              <WritingCanvas
                key={"guided-" + item.id}
                character={item.character}
                strokeData={stroke.data}
                mode="guided"
                onResult={(result) => handleGuidedScore(calculateWritingScore(result))}
              />
            )}
            {guidedScore != null && (
              <div className={"hiragana-lab__score " + (guidedScore >= 70 ? "is-pass" : "is-retry")}>
                <strong>{guidedScore}</strong>
                <span>{guidedScore >= 70 ? "Gerakan cukup stabil" : "Ulangi; perhatikan urutan dan arah"}</span>
              </div>
            )}
            <button
              type="button"
              className="primary-button"
              disabled={(guidedScore ?? 0) < 70}
              onClick={() => {
                setPhase("recall");
                setRecallScore(null);
              }}
            >
              Lanjut: tulis tanpa contoh
            </button>
          </div>
        )}

        {phase === "recall" && (
          <div className="hiragana-lab__practice">
            <div className="hiragana-lab__recall-prompt">
              <small>DENGARKAN - JANGAN BUKA PETUNJUK</small>
              <AudioButton url={item.audioUrl} autoplay />
              <p>Tulis huruf yang baru dipelajari dari ingatan. Target kelulusan 80.</p>
            </div>

            <div className="hiragana-lab__surface-switch" aria-label="Pilih media menulis">
              <button
                type="button"
                className={writingSurface === "screen" ? "is-active" : ""}
                onClick={() => {
                  setWritingSurface("screen");
                  setRecallScore(null);
                }}
              >
                Tulis di layar
              </button>
              <button
                type="button"
                className={writingSurface === "paper" ? "is-active" : ""}
                onClick={() => {
                  setWritingSurface("paper");
                  setRecallScore(null);
                  setPaperRevealed(false);
                }}
              >
                Tulis di kertas
              </button>
            </div>

            {writingSurface === "screen" ? (
              stroke.loading ? (
                <div className="hiragana-stage__loading">Memuat area menulis...</div>
              ) : (
                <WritingCanvas
                  key={"blind-" + item.id}
                  character={item.character}
                  strokeData={stroke.data}
                  mode="faint_grid"
                  onResult={(result) => void acceptRecallScore(calculateWritingScore(result))}
                />
              )
            ) : (
              <div className="hiragana-lab__paper">
                {!paperRevealed ? (
                  <>
                    <span>1</span>
                    <h3>Tulis satu kali di kertas</h3>
                    <p>Ucapkan bunyinya pelan saat tangan bergerak. Jangan menebak dari romaji.</p>
                    <button type="button" className="primary-button" onClick={() => setPaperRevealed(true)}>
                      Sudah - tampilkan jawaban
                    </button>
                  </>
                ) : (
                  <>
                    <div className="hiragana-lab__paper-answer">{item.character}</div>
                    <p>Bandingkan bentuk, jumlah goresan, urutan, dan arah dengan tulisanmu.</p>
                    <div>
                      <button type="button" className="secondary-button" onClick={() => void handlePaperAssessment(false)}>
                        Belum sesuai
                      </button>
                      <button type="button" className="primary-button" onClick={() => void handlePaperAssessment(true)}>
                        Sesuai
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {recallScore != null && (
              <div className={"hiragana-lab__score " + (recallScore >= 80 ? "is-pass" : "is-retry")}>
                <strong>{recallScore}</strong>
                <span>{recallScore >= 80 ? "Lulus tanpa contoh" : "Belum 80; ulangi dari ingatan"}</span>
              </div>
            )}
            <button
              type="button"
              className="primary-button"
              disabled={(recallScore ?? 0) < 80 || saving}
              onClick={continueAfterRecall}
            >
              {itemIndex + 1 < unit.items.length ? "Lanjut ke huruf berikutnya" : "Mulai checkpoint"}
            </button>
          </div>
        )}

        {phase === "checkpoint" && (
          <div className="hiragana-lab__checkpoint">
            <div className="hiragana-lab__checkpoint-note">
              <strong>10 soal - minimal 8 benar</strong>
              <span>70% kelompok baru, 30% huruf sebelumnya. Soal mencampur bunyi, pengenalan, dan tulisan.</span>
            </div>
            {checkpointMessage && <p className="hiragana-stage__feedback">{checkpointMessage}</p>}
            <HiraganaQuiz
              key={checkpointKey}
              stageId={bundle.stage.id}
              questions={checkpointQuestions}
              writingPassScore={80}
              onComplete={(result) => void finishCheckpoint(result)}
            />
          </div>
        )}

        {phase === "unlock" && (
          <div className="hiragana-lab__unlock">
            <span className="hiragana-lab__unlock-mark">UNLOCK</span>
            <h3>Huruf-huruf ini sekarang menjadi kata nyata</h3>
            <p>Romaji hanya ditampilkan di sini untuk mengonfirmasi bacaan. Coba baca kana lebih dahulu.</p>
            <div className="hiragana-lab__words">
              {unlockWords.map((word) => (
                <div key={word.kana}>
                  <strong>{word.kana}</strong>
                  <span>{word.romaji}</span>
                  <small>{word.meaning}</small>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="primary-button"
              disabled={saving}
              onClick={continueAfterUnlock}
            >
              {completedUnitCodes.length >= bundle.units.length
                ? "Selesaikan tahap Kenali 20"
                : "Buka kelompok berikutnya"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
