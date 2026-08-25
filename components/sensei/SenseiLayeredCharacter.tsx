"use client";

import type { SenseiPose } from "@/db/schema/sensei";
import type { SenseiLipSyncData } from "@/app/lib/sensei-query";
import { useMouthCueSchedule, useAutoBlink } from "@/app/lib/lipsync";

// PROMPT-11 Bagian 4 — the layered structure the work order asked for:
// body/pose, mouth, and eyes as INDEPENDENTLY swappable layers. The
// structure is what matters this session, not the art — there is no
// mouth-shape or eye-closed artwork yet (the character is real
// photography; overlaying a cartoon mouth shape on a photo is the exact
// uncanny-valley mistake the work order itself warns against). Both
// asset maps below are intentionally EMPTY today: every pose silently
// falls back to body-only rendering. The moment illustrated (non-photo)
// mouth/eye assets exist for a pose, add them to these two maps —
// nothing else in this component, SenseiBoard.tsx, or the DB needs to
// change.
const MOUTH_ASSETS: Partial<Record<SenseiPose, Partial<Record<string, string>>>> = {};
const EYES_CLOSED_ASSETS: Partial<Record<SenseiPose, string>> = {};

export function SenseiLayeredCharacter({
  pose,
  audioRef,
  lipSyncData,
  className,
}: {
  pose: SenseiPose;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  lipSyncData: SenseiLipSyncData | null;
  className?: string;
}) {
  const mouthShape = useMouthCueSchedule(audioRef, lipSyncData);
  const blinking = useAutoBlink();
  const mouthSrc = MOUTH_ASSETS[pose]?.[mouthShape];
  const eyesSrc = blinking ? EYES_CLOSED_ASSETS[pose] : undefined;

  return (
    <div className="sensei-layered">
      <img
        key={pose}
        className={className ?? "sensei-board__illustration"}
        src={"/sensei/sensei-" + pose + ".webp"}
        alt=""
        width={420}
        height={560}
        loading="eager"
      />
      {mouthSrc && <img className="sensei-layered__mouth" src={mouthSrc} alt="" />}
      {eyesSrc && <img className="sensei-layered__eyes" src={eyesSrc} alt="" />}
    </div>
  );
}

// Re-exported for callers that just need the raw hooks without the
// layered wrapper (e.g. the geometric-placeholder timing demo page).
export { useMouthCueSchedule, useAutoBlink };
