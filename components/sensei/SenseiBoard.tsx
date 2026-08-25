"use client";

import { useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import type { SenseiSegmentRow } from "@/app/lib/sensei-query";
import { SenseiWritingDemo } from "./SenseiWritingDemo";

// PROMPT-9 Bagian 2 — the generic "papan tulis" presentation player.
// Module-agnostic on purpose: takes whatever segments the caller fetched
// (module_intro / phase_intro+concept_moment / a single writing_demo) and
// steps through them. Teks selalu tampil; narasi HANYA lewat tombol putar
// (AudioButton, sudah click-to-play/stop) — tidak pernah autoplay, dan
// tidak ada video sama sekali (Bagian 2 aturan berat butir 1-2).
export function SenseiBoard({
  segments,
  onFinish,
  finishLabel = "Mulai belajar",
}: {
  segments: SenseiSegmentRow[];
  onFinish: () => void;
  finishLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  if (segments.length === 0) return null;
  const segment = segments[index];
  const isLast = index === segments.length - 1;

  return (
    <div className="sensei-board">
      <div className="sensei-board__stage">
        <img
          className="sensei-board__illustration"
          src={"/sensei/sensei-" + segment.senseiPose + ".svg"}
          alt=""
          width={140}
          height={182}
        />
        <div className="sensei-board__board">
          <div className="sensei-board__visual">
            {segment.visualAction.kind === "glyph" && (
              <div className="sensei-board__glyph">
                <span>{segment.visualAction.char}</span>
                {segment.visualAction.label && <small>{segment.visualAction.label}</small>}
              </div>
            )}
            {segment.visualAction.kind === "table" && (
              <table className="sensei-board__table">
                <thead>
                  <tr>
                    {segment.visualAction.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {segment.visualAction.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {segment.visualAction.kind === "compare" && (
              <div className="sensei-board__compare">
                {segment.visualAction.items.map((item) => (
                  <div className="sensei-board__compare-item" key={item.label}>
                    <b>{item.label}</b>
                    <span className="sensei-board__compare-example">{item.example}</span>
                    {item.note && <small>{item.note}</small>}
                  </div>
                ))}
              </div>
            )}
            {segment.visualAction.kind === "write_char" && segment.kanaCharacter && (
              <SenseiWritingDemo character={segment.kanaCharacter} strokeDataUrl={segment.strokeDataUrl} />
            )}
          </div>
          <p className="sensei-board__text">{segment.boardText}</p>
          {segment.narrationUrl && (
            <div className="sensei-board__narration">
              <AudioButton url={segment.narrationUrl} />
              <span>Dengarkan penjelasan</span>
            </div>
          )}
        </div>
      </div>

      <div className="sensei-board__controls">
        <span className="sensei-board__progress">
          {index + 1}/{segments.length}
        </span>
        <div className="sensei-board__actions">
          <button type="button" className="secondary-button" onClick={onFinish}>
            Lewati
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => (isLast ? onFinish() : setIndex((value) => value + 1))}
          >
            {isLast ? finishLabel : "Lanjut →"}
          </button>
        </div>
      </div>
    </div>
  );
}
