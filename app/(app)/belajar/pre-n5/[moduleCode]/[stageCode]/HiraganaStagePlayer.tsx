"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import {
  WritingCanvas,
  type WritingCanvasMode,
} from "@/components/kana/WritingCanvas";
import type { KanaStrokeData } from "@/components/kana/stroke-geometry";
import { HIRAGANA_LAB_VERSION } from "@/app/lib/hiragana-mnemonics";
import type {
  HiraganaLearningItem,
  HiraganaStageBundle,
} from "@/app/lib/pre-n5-01-query";
import {
  calculateWritingScore,
  HiraganaQuiz,
  type HiraganaQuizQuestion,
  type HiraganaQuizResult,
} from "./HiraganaQuiz";
import {
  completeHiraganaStage,
  recordHiraganaAttempt,
  saveHiraganaStageState,
  type StageCompletionResult,
} from "./actions";
import { HiraganaLearningLab } from "./HiraganaLearningLab";

type StagePlayerProps = {
  bundle: HiraganaStageBundle;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function numberFrom(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

function choicesFor(
  pool: HiraganaLearningItem[],
  target: HiraganaLearningItem,
  count: number,
  offset: number,
): HiraganaLearningItem[] {
  const distractors = pool
    .filter((item) => item.id !== target.id && item.romaji !== target.romaji)
    .slice(offset)
    .concat(pool.filter((item) => item.id !== target.id && item.romaji !== target.romaji).slice(0, offset))
    .slice(0, Math.max(0, count - 1));
  const options = [target, ...distractors];
  const shift = options.length > 0 ? offset % options.length : 0;
  return options.slice(shift).concat(options.slice(0, shift));
}

function buildRecallQuestions(items: HiraganaLearningItem[]): HiraganaQuizQuestion[] {
  const pool = items.filter((item) => item.type === "basic");
  const questions: HiraganaQuizQuestion[] = [];
  for (let index = 0; index < 5; index += 1) {
    const typing = pool[index];
    const reverse = pool[index + 5];
    const audio = pool[index + 10];
    const writing = pool[index + 15];
    if (typing) {
      questions.push({
        id: "typing-" + typing.id,
        kind: "typing",
        item: typing,
        prompt: "Lihat kana lalu hasilkan bunyinya.",
        promptMode: "kana",
        exerciseType: "type_romaji",
        skill: "typing",
      });
    }
    if (reverse) {
      questions.push({
        id: "reverse-" + reverse.id,
        kind: "choice",
        item: reverse,
        prompt: "Pilih kana untuk romaji berikut.",
        promptMode: "romaji",
        choices: choicesFor(pool, reverse, 6, index + 2),
        exerciseType: "reverse_recall",
        skill: "recall",
      });
    }
    if (audio) {
      questions.push({
        id: "audio-" + audio.id,
        kind: "choice",
        item: audio,
        prompt: "Dengarkan lalu pilih kana yang tepat.",
        promptMode: "audio",
        choices: choicesFor(pool, audio, 8, index + 7),
        exerciseType: "audio_visual",
        skill: "audio",
      });
    }
    if (writing) {
      questions.push({
        id: "writing-" + writing.id,
        kind: "writing",
        item: writing,
        prompt: "Dengarkan bunyinya lalu tulis dari ingatan.",
        promptMode: "audio",
        exerciseType: "write_from_audio",
        skill: "writing",
      });
    }
  }
  return questions;
}

function buildSrsQuestions(items: HiraganaLearningItem[]): HiraganaQuizQuestion[] {
  const basic = items.filter((item) => item.type === "basic");
  const prioritized = [
    ...items.filter((item) => item.mastery.due),
    ...items.filter((item) => item.mastery.weak && !item.mastery.due),
    ...basic,
  ];
  const unique = [...new Map(prioritized.map((item) => [item.id, item])).values()];
  const session = unique.slice(0, 20);
  return session.map((item, index): HiraganaQuizQuestion => {
    const prompt = item.mastery.due || item.mastery.weak
      ? "Weak point aktif. Ambil kembali dari ingatan."
      : "Bangun jejak review untuk karakter ini.";
    if (index % 3 === 0) {
      return {
        id: "srs-audio-" + item.id,
        kind: "choice",
        item,
        prompt,
        promptMode: "audio",
        choices: choicesFor(basic, item, 4, 4 + index),
        exerciseType: "audio_visual",
        skill: "audio",
      };
    }
    if (index % 3 === 1) {
      return {
        id: "srs-writing-" + item.id,
        kind: "writing",
        item,
        prompt,
        promptMode: "audio",
        exerciseType: "write_from_audio",
        skill: "writing",
      };
    }
    return {
      id: "srs-recall-" + item.id,
      kind: "typing",
      item,
      prompt,
      promptMode: "kana",
      exerciseType: "srs",
      skill: "recall",
    };
  });
}

function buildGateQuestions(items: HiraganaLearningItem[]): HiraganaQuizQuestion[] {
  const pool = items.filter((item) => item.type === "basic");
  const questions: HiraganaQuizQuestion[] = [];
  pool.slice(0, 10).forEach((item) => {
    questions.push({
      id: "gate-recognition-" + item.id,
      kind: "typing",
      item,
      prompt: "Recognition: ketik romaji.",
      promptMode: "kana",
      exerciseType: "gate_recognition",
      skill: "visual",
    });
  });
  pool.slice(10, 20).forEach((item, index) => {
    questions.push({
      id: "gate-audio-" + item.id,
      kind: "choice",
      item,
      prompt: "Audio: pilih kana yang diucapkan.",
      promptMode: "audio",
      choices: choicesFor(pool, item, 8, index + 11),
      exerciseType: "gate_audio",
      skill: "audio",
    });
  });
  pool.filter((_, index) => index % 2 === 0).slice(0, 10).forEach((item) => {
    questions.push({
      id: "gate-writing-" + item.id,
      kind: "writing",
      item,
      prompt: "Writing: dengarkan lalu tulis kana.",
      promptMode: "audio",
      exerciseType: "gate_writing",
      skill: "writing",
    });
  });
  return questions;
}

function StageResult({
  moduleCode,
  result,
  onRetry,
}: {
  moduleCode: string;
  result: StageCompletionResult;
  onRetry: () => void;
}) {
  if (!result.ok) {
    return (
      <div className="hiragana-stage__result is-failed">
        <span className="hiragana-stage__result-icon">!</span>
        <h3>Progres belum tersimpan</h3>
        <p>{result.error ?? "Terjadi kesalahan. Silakan coba lagi."}</p>
        <button type="button" className="primary-button" onClick={onRetry}>
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className={"hiragana-stage__result " + (result.passed ? "is-passed" : "is-failed")}>
      <span className="hiragana-stage__result-icon">{result.passed ? "PASS" : "RETRY"}</span>
      <h3>{result.passed ? "Tahap berhasil dikuasai" : "Belum melewati batas kelulusan"}</h3>
      <p>
        Skor {Math.round(result.score ?? 0)}%. Syarat kelulusan {result.requiredLabel}.
      </p>
      {result.passed ? (
        <Link
          href={
            result.nextStageCode
              ? "/belajar/pre-n5/" + moduleCode + "/" + result.nextStageCode
              : "/belajar/pre-n5/" + moduleCode
          }
          className="primary-button"
        >
          {result.nextStageCode ? "Lanjut ke " + result.nextStageCode : "Kembali ke modul"}
        </Link>
      ) : (
        <button type="button" className="primary-button" onClick={onRetry}>
          Ulangi latihan
        </button>
      )}
    </div>
  );
}

export function LegacyDiscoverStage({
  bundle,
  onComplete,
}: {
  bundle: HiraganaStageBundle;
  onComplete: (result: HiraganaQuizResult, state: Record<string, unknown>) => void;
}) {
  const initialCompleted = stringArray(bundle.stage.state.completedUnitCodes);
  const firstIncomplete = Math.max(
    0,
    bundle.units.findIndex((unit) => !initialCompleted.includes(unit.code)),
  );
  const [unitIndex, setUnitIndex] = useState(firstIncomplete);
  const [itemIndex, setItemIndex] = useState(0);
  const [mode, setMode] = useState<"learn" | "checkpoint">("learn");
  const [typedValue, setTypedValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [checkpointIndex, setCheckpointIndex] = useState(0);
  const [checkpointCorrect, setCheckpointCorrect] = useState(0);
  const [completedUnitCodes, setCompletedUnitCodes] = useState(initialCompleted);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);

  const unit = bundle.units[unitIndex];
  const item = unit?.items[itemIndex];
  const checkpointItems = useMemo(() => {
    if (!unit || unit.items.length === 0) return [];
    return Array.from({ length: 10 }, (_, index) => unit.items[index % unit.items.length]);
  }, [unit]);
  const checkpointItem = checkpointItems[checkpointIndex];
  const overallPercent =
    bundle.units.length > 0
      ? Math.round((completedUnitCodes.length / bundle.units.length) * 100)
      : 0;

  function submitLearn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || !typedValue.trim()) return;
    const now = Date.now();
    const correct = normalize(typedValue) === normalize(item.romaji);
    void recordHiraganaAttempt({
      stageId: bundle.stage.id,
      kanaId: item.id,
      exerciseType: "type_romaji",
      skill: "typing",
      answerText: typedValue,
      responseTimeMs: now - startedAt,
    });
    if (!correct) {
      setFeedback("Belum tepat. Dengarkan lagi dan hubungkan dengan cerita mnemonic.");
      return;
    }
    setFeedback("Benar. Bentuk dan bunyinya sudah terhubung.");
    setTypedValue("");
    setStartedAt(now);
    if (itemIndex + 1 >= unit.items.length) {
      setMode("checkpoint");
      setCheckpointIndex(0);
      setCheckpointCorrect(0);
      setFeedback("");
    } else {
      setItemIndex((value) => value + 1);
    }
  }

  async function submitCheckpoint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkpointItem || !typedValue.trim() || saving) return;
    const now = Date.now();
    const correct = normalize(typedValue) === normalize(checkpointItem.romaji);
    const nextCorrect = checkpointCorrect + (correct ? 1 : 0);
    void recordHiraganaAttempt({
      stageId: bundle.stage.id,
      kanaId: checkpointItem.id,
      exerciseType: "checkpoint",
      skill: "visual",
      answerText: typedValue,
      responseTimeMs: now - startedAt,
    });
    setTypedValue("");
    setStartedAt(now);

    if (checkpointIndex + 1 < checkpointItems.length) {
      setCheckpointCorrect(nextCorrect);
      setCheckpointIndex((value) => value + 1);
      setFeedback(correct ? "Benar." : "Salah. Jawaban: " + checkpointItem.romaji + ".");
      return;
    }

    if (nextCorrect < 8) {
      setCheckpointIndex(0);
      setCheckpointCorrect(0);
      setFeedback("Checkpoint " + nextCorrect + "/10. Minimal 8 benar, jadi checkpoint diulang.");
      return;
    }

    const nextCompleted = [...new Set([...completedUnitCodes, unit.code])];
    const state = {
      completedUnitCodes: nextCompleted,
      currentUnitCode: bundle.units[unitIndex + 1]?.code ?? null,
    };
    setSaving(true);
    await saveHiraganaStageState({ stageId: bundle.stage.id, state });
    setSaving(false);
    setCompletedUnitCodes(nextCompleted);

    if (nextCompleted.length >= bundle.units.length) {
      onComplete({ correct: nextCorrect, total: 10 }, state);
      return;
    }

    setUnitIndex((value) => value + 1);
    setItemIndex(0);
    setMode("learn");
    setCheckpointIndex(0);
    setCheckpointCorrect(0);
    setFeedback("Checkpoint lulus. Kelompok berikutnya terbuka.");
  }

  if (!unit || !item) {
    return <div className="hiragana-stage__empty">Unit Discover tidak ditemukan.</div>;
  }

  const activeItem = mode === "learn" ? item : checkpointItem;
  return (
    <div className="hiragana-discover">
      <aside className="hiragana-discover__rail">
        <div className="hiragana-discover__rail-head">
          <span>Progress Discover</span>
          <strong>{overallPercent}%</strong>
        </div>
        <div className="hiragana-discover__unit-list">
          {bundle.units.map((candidate, index) => (
            <button
              type="button"
              key={candidate.code}
              disabled={!completedUnitCodes.includes(candidate.code) && index !== unitIndex}
              className={[
                index === unitIndex ? "is-active" : "",
                completedUnitCodes.includes(candidate.code) ? "is-complete" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => {
                if (!completedUnitCodes.includes(candidate.code)) return;
                setUnitIndex(index);
                setItemIndex(0);
                setMode("learn");
              }}
            >
              <span>{completedUnitCodes.includes(candidate.code) ? "OK" : String(index + 1).padStart(2, "0")}</span>
              <div><strong>{candidate.title}</strong><small>{candidate.description}</small></div>
            </button>
          ))}
        </div>
      </aside>

      <section className="hiragana-discover__main">
        <header>
          <div>
            <span>{mode === "learn" ? "MNEMONIC MORPH" : "MINI CHECKPOINT"}</span>
            <h2>{unit.title}</h2>
          </div>
          <b>{mode === "learn" ? itemIndex + 1 + "/" + unit.items.length : checkpointIndex + 1 + "/10"}</b>
        </header>

        {mode === "learn" ? (
          <>
            <div className="hiragana-morph" key={item.id}>
              <div className="hiragana-morph__cue">
                <span>{item.mnemonic.emoji}</span>
                <small>{item.mnemonic.title}</small>
              </div>
              <div className="hiragana-morph__arrow">TO</div>
              <div className="hiragana-morph__kana">{item.character}</div>
            </div>
            <p className="hiragana-discover__story">{item.mnemonic.story}</p>
            <div className="hiragana-discover__audio">
              <AudioButton url={item.audioUrl} />
              <span>Dengarkan bunyi dan tiga contoh kata.</span>
            </div>
            <div className="hiragana-discover__examples">
              {item.examples.length > 0 ? item.examples.map((example) => (
                <div key={example.id}>
                  <strong>{example.wordKana}</strong>
                  <span>{example.romaji}</span>
                  <small>{example.meaning}</small>
                  <AudioButton url={example.audioUrl} />
                </div>
              )) : (
                <p>Contoh kata akan muncul saat relasi kosakata tersedia.</p>
              )}
            </div>
          </>
        ) : (
          <div className="hiragana-checkpoint__prompt">
            <span>{activeItem?.character}</span>
            <p>Ketik romaji dari kana ini tanpa membuka cerita mnemonic.</p>
          </div>
        )}

        <form onSubmit={mode === "learn" ? submitLearn : submitCheckpoint} className="hiragana-discover__answer">
          <input
            value={typedValue}
            onChange={(event) => setTypedValue(event.target.value)}
            placeholder="Ketik romaji..."
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            />
          <button type="submit" className="primary-button" disabled={!typedValue.trim() || saving}>
            {saving ? "Menyimpan..." : "Periksa"}
          </button>
        </form>
        {feedback && <p className="hiragana-stage__feedback">{feedback}</p>}
      </section>
    </div>
  );
}

function TraceCanvas({
  item,
  mode,
  onScore,
}: {
  item: HiraganaLearningItem;
  mode: WritingCanvasMode;
  onScore: (score: number) => void;
}) {
  const [data, setData] = useState<KanaStrokeData | null>(null);
  useEffect(() => {
    if (!item.strokeDataUrl) return;
    const controller = new AbortController();
    fetch(item.strokeDataUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Stroke data gagal dimuat.");
        return response.json() as Promise<KanaStrokeData>;
      })
      .then(setData)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setData(null);
      });
    return () => controller.abort();
  }, [item.strokeDataUrl]);
  return (
    <WritingCanvas
      key={item.id + "-" + mode}
      character={item.character}
      strokeData={data}
      mode={mode}
      onResult={(result) => onScore(calculateWritingScore(result))}
    />
  );
}

function TraceStage({
  bundle,
  onComplete,
}: {
  bundle: HiraganaStageBundle;
  onComplete: (result: HiraganaQuizResult, state: Record<string, unknown>) => void;
}) {
  const pool = bundle.items.filter((item) => item.type === "basic");
  const initialMastered = numberArray(bundle.stage.state.masteredKanaIds);
  const [masteredIds, setMasteredIds] = useState(initialMastered);
  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, pool.findIndex((item) => !initialMastered.includes(item.id))),
  );
  const [mode, setMode] = useState<"guided" | "ghost" | "countdown">("guided");
  const [score, setScore] = useState<number | null>(null);
  const [attemptedIds, setAttemptedIds] = useState<number[]>(initialMastered);
  const requiredCount = numberFrom(bundle.stage.passCriteria.practiceCharacterCount, 20);
  const item = pool[activeIndex];
  const canvasMode: WritingCanvasMode = mode === "guided" ? "guided" : "blind";

  if (!item) return <div className="hiragana-stage__empty">Data Trace tidak tersedia.</div>;

  async function handleScore(nextScore: number) {
    setScore(nextScore);
    const nextAttempted = [...new Set([...attemptedIds, item.id])];
    const nextMastered =
      nextScore >= 80 ? [...new Set([...masteredIds, item.id])] : masteredIds;
    setAttemptedIds(nextAttempted);
    setMasteredIds(nextMastered);
    void recordHiraganaAttempt({
      stageId: bundle.stage.id,
      kanaId: item.id,
      exerciseType: "trace",
      skill: "writing",
      writingScore: nextScore,
    });
    await saveHiraganaStageState({
      stageId: bundle.stage.id,
      state: { masteredKanaIds: nextMastered, activeKanaId: item.id, traceMode: mode },
    });
  }

  function nextCharacter() {
    const nextUnmastered = pool.findIndex(
      (candidate, index) => index > activeIndex && !masteredIds.includes(candidate.id),
    );
    setActiveIndex(nextUnmastered >= 0 ? nextUnmastered : (activeIndex + 1) % pool.length);
    setScore(null);
  }

  return (
    <div className="hiragana-trace">
      <section className="hiragana-trace__workspace">
        <header>
          <div><span>Motor Memory</span><h2>Tulis {item.character}</h2></div>
          <strong>{masteredIds.length}/{requiredCount} mastered</strong>
        </header>
        <div className="hiragana-trace__modes">
          {(["guided", "ghost", "countdown"] as const).map((candidate) => (
            <button
              type="button"
              key={candidate}
              className={mode === candidate ? "is-active" : ""}
              onClick={() => { setMode(candidate); setScore(null); }}
            >
              {candidate === "guided" ? "Guided Trace" : candidate === "ghost" ? "Ghost Trace" : "Countdown 5s"}
            </button>
          ))}
        </div>
        <p className="hiragana-trace__hint">
          {mode === "guided"
            ? "Stroke berikutnya tampil sebagai panduan samar."
            : mode === "ghost"
              ? "Tulis dari ingatan tanpa bentuk transparan."
              : "Bangun bentuk secepat mungkin. Target latihan lima detik."}
        </p>
        <TraceCanvas key={item.id + "-" + canvasMode} item={item} mode={canvasMode} onScore={handleScore} />
        {score != null && (
          <div className={"hiragana-trace__score " + (score >= 80 ? "is-mastered" : score >= 60 ? "is-weak" : "is-retry")}>
            <strong>{score}</strong>
            <span>{score >= 80 ? "Mastered" : score >= 60 ? "Lanjut, masuk Weak Point" : "Wajib ulang"}</span>
          </div>
        )}
        <div className="hiragana-trace__actions">
          <button type="button" className="secondary-button" onClick={nextCharacter}>
            Karakter berikutnya
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={masteredIds.length < requiredCount}
            onClick={() =>
              onComplete(
                { correct: masteredIds.length, total: requiredCount },
                { masteredKanaIds: masteredIds, traceMode: mode },
              )
            }
          >
            Selesaikan Trace
          </button>
        </div>
      </section>
      <aside className="hiragana-trace__picker">
        <h3>20 Hiragana trial</h3>
        <div>
          {pool.map((candidate, index) => (
            <button
              type="button"
              key={candidate.id}
              className={[
                index === activeIndex ? "is-active" : "",
                masteredIds.includes(candidate.id) ? "is-mastered" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => { setActiveIndex(index); setScore(null); }}
            >
              {candidate.character}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function BlitzStage({
  bundle,
  onComplete,
}: {
  bundle: HiraganaStageBundle;
  onComplete: (result: HiraganaQuizResult, state: Record<string, unknown>) => void;
}) {
  const pool = bundle.items;
  const duration = numberFrom(bundle.stage.configuration.durationSeconds, 60);
  const target = numberFrom(bundle.stage.passCriteria.correctCount, 25);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [remaining, setRemaining] = useState(duration);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [message, setMessage] = useState("");
  const item = pool[index % pool.length];

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => {
      setRemaining((seconds) => {
        if (seconds <= 1) {
          setFinished(true);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finished, started]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || !value.trim() || !started || finished) return;
    const isCorrect = normalize(value) === normalize(item.romaji);
    const nextStreak = isCorrect ? streak + 1 : secondChanceUsed ? 0 : streak;
    const multiplier = nextStreak >= 5 ? 2 : 1;
    setAttempts((count) => count + 1);
    if (isCorrect) {
      setCorrect((count) => count + 1);
      setStreak(nextStreak);
      setXp((count) => count + 10 * multiplier);
      setMessage(multiplier === 2 ? "Benar - multiplier 2x aktif." : "Benar.");
    } else if (!secondChanceUsed) {
      setSecondChanceUsed(true);
      setMessage("Second Chance dipakai. Streak tetap aman.");
    } else {
      setStreak(0);
      setMessage("Belum tepat. Streak kembali ke nol.");
    }
    void recordHiraganaAttempt({
      stageId: bundle.stage.id,
      kanaId: item.id,
      exerciseType: "blitz",
      skill: "typing",
      answerText: value,
    });
    setIndex((current) => current + 1);
    setValue("");
  }

  if (!started) {
    return (
      <div className="hiragana-blitz__intro">
        <span className="hiragana-blitz__clock">60</span>
        <h2>Hiragana Blitz 60</h2>
        <p>Jawab sebanyak mungkin dalam 60 detik. Lima benar beruntun mengaktifkan XP 2x.</p>
        <ul><li>Target: {target}+ benar</li><li>Second Chance: 1 kali</li><li>Salah berikutnya mereset streak</li></ul>
        <button type="button" className="primary-button" onClick={() => setStarted(true)}>
          Mulai Blitz
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="hiragana-stage__result">
        <span className="hiragana-stage__result-icon">60</span>
        <h3>Blitz selesai</h3>
        <p>{correct} benar, streak terbaik sesi {streak}, dan {xp} XP.</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => onComplete({ correct, total: Math.max(attempts, 1) }, { lastBlitzXp: xp, lastBlitzCorrect: correct })}
        >
          Simpan hasil
        </button>
      </div>
    );
  }

  return (
    <div className="hiragana-blitz">
      <header>
        <strong>{remaining}s</strong>
        <span>Benar {correct}/{target}</span>
        <span>Streak {streak}</span>
        <span>XP {xp}</span>
      </header>
      <div className="hiragana-blitz__kana">{item?.character}</div>
      <form onSubmit={submit}>
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="romaji" />
        <button type="submit" className="primary-button">Kirim</button>
      </form>
      <p>{message}</p>
    </div>
  );
}

export function HiraganaStagePlayer({ bundle }: StagePlayerProps) {
  const [completion, setCompletion] = useState<StageCompletionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const recallQuestions = useMemo(() => buildRecallQuestions(bundle.items), [bundle.items]);
  const srsQuestions = useMemo(() => buildSrsQuestions(bundle.items), [bundle.items]);
  const gateQuestions = useMemo(() => buildGateQuestions(bundle.items), [bundle.items]);

  async function finishStage(
    result: HiraganaQuizResult,
    state: Record<string, unknown> = {},
  ) {
    setSubmitting(true);
    const response = await completeHiraganaStage({
      stageId: bundle.stage.id,
      correct: result.correct,
      total: result.total,
      state: { ...state, labVersion: HIRAGANA_LAB_VERSION },
    });
    setCompletion(response);
    setSubmitting(false);
  }

  function retry() {
    setCompletion(null);
    setRunKey((value) => value + 1);
  }

  if (submitting) {
    return <div className="hiragana-stage__loading">Menyimpan hasil dan menghitung progres...</div>;
  }
  if (completion) {
    return (
      <StageResult moduleCode={bundle.module.code} result={completion} onRetry={retry} />
    );
  }

  switch (bundle.stage.code) {
    case "F1":
      return <HiraganaLearningLab key={runKey} bundle={bundle} onComplete={finishStage} />;
    case "F2":
      return <TraceStage key={runKey} bundle={bundle} onComplete={finishStage} />;
    case "F3":
      return (
        <HiraganaQuiz
          key={runKey}
          stageId={bundle.stage.id}
          questions={recallQuestions}
          writingPassScore={80}
          onComplete={(result) => finishStage(result)}
        />
      );
    case "F4":
      return <BlitzStage key={runKey} bundle={bundle} onComplete={finishStage} />;
    case "F5":
      return (
        <HiraganaQuiz
          key={runKey}
          stageId={bundle.stage.id}
          questions={srsQuestions}
          writingPassScore={80}
          onComplete={(result) => finishStage(result)}
        />
      );
    case "BOSS":
      return (
        <HiraganaQuiz
          key={runKey}
          stageId={bundle.stage.id}
          questions={gateQuestions}
          timeLimitSeconds={numberFrom(bundle.stage.configuration.timeLimitSeconds, 300)}
          writingPassScore={80}
          onComplete={(result) => finishStage(result, { badge: result.correct / result.total >= 0.8 ? "Hiragana 20 Pioneer" : null })}
        />
      );
    default:
      return <div className="hiragana-stage__empty">Stage ini belum memiliki player.</div>;
  }
}
