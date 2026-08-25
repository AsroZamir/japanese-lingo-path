"use client";

import { useRef } from "react";
import { useMouthCueSchedule } from "@/app/lib/lipsync";
import type { SenseiLipSyncData } from "@/app/lib/sensei-query";

// Preston Blair shape -> approximate mouth openness, purely for this
// geometric placeholder. Real mouth art would replace this whole
// mapping with actual images per shape instead of a single scaled oval.
const OPENNESS: Record<string, number> = {
  X: 0.08,
  A: 0.15,
  B: 0.3,
  C: 0.55,
  D: 1,
  E: 0.7,
  F: 0.2,
  G: 0.2,
  H: 0.45,
};

export function LipSyncDemoPlayer({
  id,
  text,
  audioUrl,
  lipSyncData,
}: {
  id: number;
  text: string;
  audioUrl: string | null;
  lipSyncData: SenseiLipSyncData | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shape = useMouthCueSchedule(audioRef, lipSyncData);
  const openness = OPENNESS[shape] ?? 0.08;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "14px 0", borderBottom: "1px solid #ddd" }}>
      <div
        aria-hidden="true"
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "#F6F6F0",
          border: "2px solid #CC5436",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "34px",
            height: (10 + openness * 26) + "px",
            borderRadius: "50%",
            background: "#CC5436",
            transition: "height 40ms linear",
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: "6px", color: "#555" }}>
          #{id} — {text.slice(0, 70)}
          {text.length > 70 ? "…" : ""}
        </div>
        {audioUrl ? (
          <audio ref={audioRef} controls src={audioUrl} style={{ width: "320px", height: "32px" }}>
            <track kind="captions" />
          </audio>
        ) : (
          <span style={{ color: "#c00" }}>Tidak ada narration_url.</span>
        )}
        <span style={{ marginLeft: "12px", color: "#888" }}>bentuk saat ini: {shape}</span>
      </div>
    </div>
  );
}
