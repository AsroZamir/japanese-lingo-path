"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Char,
  CharDataLoaderFn,
  CharResult,
} from "@k1low/kakitori";
import type { KanaStrokeData } from "./stroke-geometry";

export type KanaWritingOutcome = {
  score: number;
  matched: boolean;
  totalMistakes: number;
  attempts: number;
};

type CoachMode = "guided" | "recall";

type KanaWritingCoachProps = {
  character: string;
  strokeData: KanaStrokeData | null;
  mode: CoachMode;
  hintLevel?: number;
  onComplete: (outcome: KanaWritingOutcome) => void;
};

type KanaStrokeAnimatorProps = {
  character: string;
  strokeData: KanaStrokeData | null;
};

function localDataLoader(data: KanaStrokeData): CharDataLoaderFn {
  return (_character, onLoad) => {
    onLoad({ strokes: data.strokes, medians: data.medians });
  };
}

function similarityScore(result: CharResult | null): number {
  if (!result || result.perStroke.length === 0) return 0;
  const sum = result.perStroke.reduce(
    (total, stroke) => total + stroke.similarity,
    0,
  );
  return Math.round((sum / result.perStroke.length) * 100);
}

function surfaceSize(host: HTMLDivElement): number {
  const available = host.parentElement?.clientWidth ?? 340;
  return Math.max(220, Math.min(available, 360));
}

export function KanaStrokeAnimator({
  character,
  strokeData,
}: KanaStrokeAnimatorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Char | null>(null);
  const [loading, setLoading] = useState(Boolean(strokeData));
  const [error, setError] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !strokeData) {
      setLoading(false);
      return;
    }

    let disposed = false;
    setLoading(true);
    setError("");
    host.replaceChildren();

    void import("@k1low/kakitori")
      .then(async ({ char }) => {
        if (disposed) return;
        const instance = char.create(character, {
          charDataLoader: localDataLoader(strokeData),
          configLoader: null,
          strokeGroups: strokeData.strokeGroups,
        });
        instanceRef.current = instance;
        instance.mount(host, {
          size: surfaceSize(host),
          padding: 12,
          showGrid: true,
          showOutline: true,
          strokeColor: "#202632",
          outlineColor: "#d9dde2",
          highlightColor: "#d95332",
          strokeAnimationSpeed: 1,
          delayBetweenStrokes: 500,
        });
        await instance.ready();
        if (disposed) return;
        setLoading(false);
        instance.animate();
      })
      .catch(() => {
        if (disposed) return;
        setLoading(false);
        setError("Animasi goresan belum dapat dimuat.");
      });

    return () => {
      disposed = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [character, strokeData]);

  if (!strokeData) {
    return (
      <div className="kana-coach__empty">
        Data goresan belum tersedia untuk karakter ini.
      </div>
    );
  }

  return (
    <div className="kana-coach kana-coach--animation">
      <div ref={hostRef} className="kana-coach__surface" />
      {loading && <span className="kana-coach__status">Memuat gerakan...</span>}
      {error && <span className="kana-coach__status is-error">{error}</span>}
      <button
        type="button"
        className="secondary-button kana-coach__replay"
        disabled={loading || Boolean(error)}
        onClick={() => {
          instanceRef.current?.reset();
          instanceRef.current?.animate();
        }}
      >
        Putar ulang gerakan
      </button>
    </div>
  );
}

export function KanaWritingCoach({
  character,
  strokeData,
  mode,
  hintLevel = 0,
  onComplete,
}: KanaWritingCoachProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onComplete);
  const [runKey, setRunKey] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(Boolean(strokeData));

  useEffect(() => {
    callbackRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !strokeData) {
      setLoading(false);
      return;
    }

    let disposed = false;
    let instance: Char | null = null;
    setLoading(true);
    setStatus("");
    host.replaceChildren();

    void import("@k1low/kakitori")
      .then(async ({ char }) => {
        if (disposed) return;
        instance = char.create(character, {
          charDataLoader: localDataLoader(strokeData),
          configLoader: null,
          strokeGroups: strokeData.strokeGroups,
          leniency: mode === "guided" ? 2.2 : 2,
        });
        instance.mount(host, {
          size: surfaceSize(host),
          padding: 12,
          showGrid: true,
          showOutline: mode === "guided" || hintLevel >= 2,
          showCharacter: false,
          drawingColor: "#c43b2f",
          drawingWidth: 10,
          retainStrokes: true,
          retainedStrokeColor: "#c43b2f",
          retainedStrokeWidth: 10,
          showAcceptedStroke: false,
          correction: mode === "guided" ? "per-stroke" : "per-char",
          maxRetries: mode === "recall" ? 0 : undefined,
          showHintAfterMisses: mode === "guided" ? 1 : false,
          highlightOnComplete: false,
          strokeEndingAsMiss: false,
          onCorrectStroke: (data) => {
            setStatus(
              `Goresan ${data.strokeNum + 1} tepat. Lanjutkan sesuai urutan.`,
            );
          },
          onMistake: (data) => {
            setStatus(
              data.isBackwards
                ? "Arah goresan terbalik. Mulai dari sisi yang ditunjukkan."
                : "Bentuk atau posisi goresan belum cocok. Coba sekali lagi.",
            );
          },
          onComplete: (data) => {
            const result = instance?.result() ?? null;
            const score = similarityScore(result);
            setStatus(
              data.matched
                ? "Bentuk, urutan, dan arah goresan sudah cocok."
                : "Belum cocok pada bentuk, urutan, atau arah goresan.",
            );
            callbackRef.current({
              score,
              matched: data.matched,
              totalMistakes: data.totalMistakes,
              attempts: data.attempts,
            });
          },
        });
        await instance.ready();
        if (disposed) return;
        setLoading(false);
        instance.start();
      })
      .catch(() => {
        if (disposed) return;
        setLoading(false);
        setStatus("Area menulis belum dapat dimuat. Gunakan mode kertas.");
      });

    return () => {
      disposed = true;
      instance?.destroy();
    };
  }, [character, hintLevel, mode, runKey, strokeData]);

  if (!strokeData) {
    return (
      <div className="kana-coach__empty">
        Data goresan belum tersedia. Gunakan mode kertas untuk latihan.
      </div>
    );
  }

  return (
    <div className="kana-coach kana-coach--writing">
      <div ref={hostRef} className="kana-coach__surface" />
      {loading && <span className="kana-coach__status">Menyiapkan area menulis...</span>}
      {status && <span className="kana-coach__status" aria-live="polite">{status}</span>}
      <button
        type="button"
        className="secondary-button kana-coach__replay"
        onClick={() => setRunKey((value) => value + 1)}
      >
        Ulang dari awal
      </button>
    </div>
  );
}
