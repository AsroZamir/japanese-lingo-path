"use client";

import { useEffect, useState } from "react";
import { KanaStrokeAnimator } from "@/components/kana/KanaWritingCoach";
import type { KanaStrokeData } from "@/components/kana/stroke-geometry";

// PROMPT-9 Bagian 3 — "Sensei menulis huruf". Reuses KanaStrokeAnimator
// (already built, already correct per CLAUDE.md's data rules — see the
// same-shaped fetch as HiraganaLearningLab.tsx's useStrokeData) instead
// of introducing a second, parallel renderer via the "hanzi-writer"
// package: kakitori's Char.animate() already IS a stroke-by-stroke SVG
// animation, proven in production. Duplicating that with a different
// library for a cosmetically different demo would be two rendering
// paths for the same underlying stroke data — a real risk of the two
// drifting out of sync, not a shortcut.
export function SenseiWritingDemo({
  character,
  strokeDataUrl,
}: {
  character: string;
  strokeDataUrl: string | null;
}) {
  // Same shape as HiraganaLearningLab.tsx's useStrokeData: one state slot
  // keyed by the url it resolved, loading derived by comparison — so every
  // setState call below happens inside a promise callback, not
  // synchronously in the effect body (react-hooks/set-state-in-effect).
  const [loaded, setLoaded] = useState<{ url: string; data: KanaStrokeData | null } | null>(null);

  useEffect(() => {
    if (!strokeDataUrl) return;
    const controller = new AbortController();
    fetch(strokeDataUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Stroke data gagal dimuat.");
        return response.json() as Promise<KanaStrokeData>;
      })
      .then((data) => setLoaded({ url: strokeDataUrl, data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoaded({ url: strokeDataUrl, data: null });
      });
    return () => controller.abort();
  }, [strokeDataUrl]);

  const data = loaded?.url === strokeDataUrl ? loaded.data : null;
  const loading = Boolean(strokeDataUrl && loaded?.url !== strokeDataUrl);

  if (loading) {
    return <div className="sensei-board__writing-loading">Memuat papan tulis...</div>;
  }

  return <KanaStrokeAnimator character={character} strokeData={data} />;
}
