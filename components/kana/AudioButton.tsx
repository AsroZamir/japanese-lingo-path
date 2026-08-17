"use client";

import { useAudioPlayer } from "./useAudioPlayer";

export type AudioButtonProps = {
  url: string | null | undefined;
  autoplay?: boolean;
};

export function AudioButton({ url, autoplay = false }: AudioButtonProps) {
  const { state, playing, toggle } = useAudioPlayer(url, { autoplay });

  const disabled = state !== "ready";
  const tooltip =
    state === "unavailable" ? "Audio belum tersedia" :
    state === "error" ? "Audio gagal dimuat" :
    state === "loading" ? "Memuat audio…" :
    playing ? "Sedang memutar — klik untuk berhenti" : "Putar audio";

  return (
    <button
      type="button"
      className={`audio-button ${playing ? "audio-button--playing" : ""}`}
      onClick={toggle}
      disabled={disabled}
      title={tooltip}
      aria-label={tooltip}
    >
      <span className="audio-button__icon" aria-hidden="true">{playing ? "■" : "▶"}</span>
    </button>
  );
}
