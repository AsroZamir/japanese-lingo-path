"use client";

import { useMemo, useState } from "react";
import type { SpeedDrillItem } from "@/app/lib/speed-drill-query";
import { recordSpeedAttempt } from "./actions";

const TIMEOUT_MS = 6000;

type Outcome = "correct" | "wrong" | "timeout";

function pickChoices(item: SpeedDrillItem, pool: SpeedDrillItem[]): string[] {
  const distractors = pool
    .filter((candidate) => candidate.id !== item.id && candidate.romaji !== item.romaji)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((candidate) => candidate.romaji);
  return [item.romaji, ...distractors].sort(() => Math.random() - 0.5);
}

function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(1).replace(".", ",") + " detik";
}

function elapsedSince(startedAt: number): number {
  return Date.now() - startedAt;
}

export function SpeedDrillRunner({
  items,
  baselineMs,
}: {
  items: SpeedDrillItem[];
  baselineMs: number | null;
}) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [answered, setAnswered] = useState<{ outcome: Outcome; selected: string | null } | null>(null);

  const current = items[index];
  const choices = useMemo(() => (current ? pickChoices(current, items) : []), [current, items]);

  async function submit(outcome: Outcome, selected: string | null) {
    if (!current || answered) return;
    const elapsed = elapsedSince(startedAt);
    setAnswered({ outcome, selected });
    setSaving(true);
    await recordSpeedAttempt({
      kanaId: current.id,
      outcome,
      selectedRomaji: selected,
      correctRomaji: current.romaji,
      responseTimeMs: Math.min(elapsed, TIMEOUT_MS),
    });
    setSaving(false);
    setTimes((value) => [...value, Math.min(elapsed, TIMEOUT_MS)]);
    setOutcomes((value) => [...value, outcome]);
  }

  function next() {
    if (index + 1 >= items.length) {
      setIndex(items.length);
      return;
    }
    setIndex((value) => value + 1);
    setAnswered(null);
    setStartedAt(Date.now());
  }

  if (!started) {
    return (
      <section className="speed-drill__intro">
        <h3>Latihan Kecepatan</h3>
        <p>
          {items.length} huruf yang sudah kamu kenal akan ditampilkan satu per satu.
          Jawab bunyinya secepat yang terasa alami — tidak ada nilai lulus/gagal, ini
          cuma untuk melihat perkembangan kecepatanmu sendiri.
        </p>
        {baselineMs != null && (
          <p className="speed-drill__baseline">
            Rata-rata kecepatanmu sejauh ini: <strong>{formatSeconds(baselineMs)}</strong>
          </p>
        )}
        <button type="button" className="primary-button" onClick={() => setStarted(true)}>
          Mulai →
        </button>
      </section>
    );
  }

  if (index >= items.length) {
    const answeredCount = outcomes.length;
    const correctCount = outcomes.filter((o) => o === "correct").length;
    const timeoutCount = outcomes.filter((o) => o === "timeout").length;
    const sessionAvgMs =
      times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

    return (
      <section className="speed-drill__result">
        <span className="speed-drill__result-icon">SELESAI</span>
        <h3>Sesi latihan kecepatan selesai</h3>
        <p>
          {correctCount}/{answeredCount} benar
          {timeoutCount > 0 ? " · " + timeoutCount + " kehabisan waktu (bukan berarti tidak tahu)" : ""}
        </p>
        {sessionAvgMs != null && baselineMs != null && (
          <p className="speed-drill__compare">
            Rata-rata sebelumnya <strong>{formatSeconds(baselineMs)}</strong> → sesi ini{" "}
            <strong>{formatSeconds(sessionAvgMs)}</strong>
          </p>
        )}
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setStarted(false);
            setIndex(0);
            setTimes([]);
            setOutcomes([]);
            setAnswered(null);
          }}
        >
          Kembali ke ringkasan
        </button>
      </section>
    );
  }

  return (
    <section className="speed-drill">
      <header>
        <span>
          {index + 1}/{items.length}
        </span>
      </header>
      <div className="speed-drill__kana">{current.character}</div>
      <div className="speed-drill__choices">
        {choices.map((choice) => {
          const isSelected = answered?.selected === choice;
          const isCorrectChoice = choice === current.romaji;
          const stateClass = answered
            ? isCorrectChoice
              ? "is-correct"
              : isSelected
                ? "is-wrong"
                : ""
            : "";
          return (
            <button
              type="button"
              key={choice}
              disabled={Boolean(answered) || saving}
              className={stateClass}
              onClick={() => void submit(choice === current.romaji ? "correct" : "wrong", choice)}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {!answered && (
        <button
          type="button"
          className="text-button speed-drill__skip"
          onClick={() => void submit("timeout", null)}
        >
          Belum ingat, lewati
        </button>
      )}
      {answered && (
        <button type="button" className="primary-button" disabled={saving} onClick={next}>
          {saving ? "Menyimpan..." : "Lanjut"}
        </button>
      )}
    </section>
  );
}
