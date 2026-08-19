"use client";

import { useState } from "react";

export type AnalogClockProps = {
  /** 1-12. */
  hour: number;
  /** 0-59. */
  minute: number;
  /** "display": read-only, driven entirely by hour/minute props (teaching slides). "interactive": clickable hour dial + a minute stepper, calling onChange as the learner sets it (practice slides). */
  mode?: "display" | "interactive";
  onChange?: (hour: number, minute: number) => void;
  size?: number;
};

const HOUR_POSITIONS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
// Teaching scope for M04 Fase 4 is whole hours (L01) and half-hours
// (L03) — a full 0-59 drag-settable minute hand is real-clock fidelity
// this app doesn't need for its actual lessons, and free-dragging a
// hand accurately with pointer-angle math is a lot of engineering for a
// precision the lessons never test. Four fixed stops cover both.
const MINUTE_STOPS = [0, 15, 30, 45];

function handAngle(hour: number, minute: number): { hourDeg: number; minuteDeg: number } {
  const hour12 = hour % 12;
  const minuteDeg = (minute / 60) * 360;
  const hourDeg = (hour12 / 12) * 360 + (minute / 60) * 30; // hour hand creeps forward as minutes pass
  return { hourDeg, minuteDeg };
}

export function AnalogClock({ hour, minute, mode = "display", onChange, size = 220 }: AnalogClockProps) {
  const [internalHour, setInternalHour] = useState(hour);
  const [internalMinute, setInternalMinute] = useState(minute);
  const isInteractive = mode === "interactive";
  const currentHour = isInteractive ? internalHour : hour;
  const currentMinute = isInteractive ? internalMinute : minute;
  const { hourDeg, minuteDeg } = handAngle(currentHour, currentMinute);

  function setHour(h: number) {
    setInternalHour(h);
    onChange?.(h, currentMinute);
  }
  function setMinute(m: number) {
    setInternalMinute(m);
    onChange?.(currentHour, m);
  }

  const radius = size / 2;
  const faceRadius = radius - 10;

  return (
    <div className="analog-clock" style={{ width: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Jam menunjukkan ${currentHour}:${String(currentMinute).padStart(2, "0")}`}>
        <circle cx={radius} cy={radius} r={faceRadius} className="analog-clock__face" />
        {HOUR_POSITIONS.map((h) => {
          const angle = (h / 12) * 2 * Math.PI - Math.PI / 2;
          const labelR = faceRadius - 22;
          const x = radius + labelR * Math.cos(angle);
          const y = radius + labelR * Math.sin(angle);
          const isCurrent = h === currentHour || (h === 12 && currentHour === 0);
          return isInteractive ? (
            <g key={h} onClick={() => setHour(h)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r={14} className={`analog-clock__hour-hit ${isCurrent ? "is-current" : ""}`} />
              <text x={x} y={y} className="analog-clock__hour-label" textAnchor="middle" dominantBaseline="central">{h}</text>
            </g>
          ) : (
            <text key={h} x={x} y={y} className="analog-clock__hour-label" textAnchor="middle" dominantBaseline="central">{h}</text>
          );
        })}
        <line
          x1={radius} y1={radius}
          x2={radius + faceRadius * 0.5 * Math.sin((hourDeg * Math.PI) / 180)}
          y2={radius - faceRadius * 0.5 * Math.cos((hourDeg * Math.PI) / 180)}
          className="analog-clock__hand analog-clock__hand--hour"
        />
        <line
          x1={radius} y1={radius}
          x2={radius + faceRadius * 0.75 * Math.sin((minuteDeg * Math.PI) / 180)}
          y2={radius - faceRadius * 0.75 * Math.cos((minuteDeg * Math.PI) / 180)}
          className="analog-clock__hand analog-clock__hand--minute"
        />
        <circle cx={radius} cy={radius} r={5} className="analog-clock__pivot" />
      </svg>

      {isInteractive && (
        <div className="analog-clock__minute-stops">
          {MINUTE_STOPS.map((m) => (
            <button
              key={m}
              type="button"
              className={`exercise-runner__option ${currentMinute === m ? "is-selected" : ""}`}
              onClick={() => setMinute(m)}
            >
              :{String(m).padStart(2, "0")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
