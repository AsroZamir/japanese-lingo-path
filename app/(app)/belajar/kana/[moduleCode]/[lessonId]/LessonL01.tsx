"use client";

import { KanaChart } from "@/components/kana/KanaChart";
import { RomajiText } from "@/components/kana/RomajiText";
import { AudioButton } from "@/components/kana/AudioButton";
import type { LessonBundle } from "@/app/lib/lesson-query";

// Pure exploration, nothing to grade — L01 writes nothing to
// user_kana_attempts, on purpose. There's no "answer" to a chart.
export function LessonL01({ bundle }: { bundle: LessonBundle }) {
  const script = bundle.kana[0]?.script ?? "hiragana";

  return (
    <div>
      <KanaChart script={script} phase={bundle.phase.titleId} characters={bundle.chartCharacters} />

      <section style={{ marginTop: 32 }}>
        <div className="curriculum-section-heading">
          <div><span className="card-kicker dark">KATA CONTOH</span><h3>Memakai karakter yang baru dikenal</h3></div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {bundle.words.map((word) => (
            <div key={word.id} className="table-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <RomajiText kana={word.wordKana} romaji={word.romaji} policy="always" />
              <span style={{ color: "var(--muted)", fontSize: 11 }}>{word.meaningId}</span>
              <AudioButton url={word.audioUrl} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
