"use client";

import { useState } from "react";
import { japaneseWeekday, japaneseDayOfMonth } from "@/app/lib/japanese-date";

export type CalendarGridProps = {
  /** 0=Sunday — which weekday the 1st falls on, for this demo month's layout. Not tied to any real calendar year. */
  startWeekday: number;
  daysInMonth?: number;
  monthLabel?: string;
  mode?: "display" | "interactive";
  /** display mode only — which day to show as selected/highlighted. */
  highlightDay?: number;
};

const WEEKDAY_HEADERS = ["日", "月", "火", "水", "木", "金", "土"];

// A representative month grid, not a real current-date calendar — the
// lessons teach the READING pattern (weekday + day-of-month for
// whichever cell is clicked), which doesn't need to track today's
// actual date or handle leap years/real month lengths.
export function CalendarGrid({ startWeekday, daysInMonth = 30, monthLabel, mode = "interactive", highlightDay }: CalendarGridProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(mode === "display" ? (highlightDay ?? null) : null);

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const activeDay = mode === "display" ? highlightDay : selectedDay;
  const activeWeekdayIndex = activeDay != null ? (startWeekday + activeDay - 1) % 7 : null;

  return (
    <div className="calendar-grid">
      {monthLabel && <p className="calendar-grid__month">{monthLabel}</p>}
      <div className="calendar-grid__weekdays">
        {WEEKDAY_HEADERS.map((h) => <span key={h}>{h}</span>)}
      </div>
      <div className="calendar-grid__cells">
        {cells.map((day, i) =>
          day == null ? (
            <span key={`empty-${i}`} className="calendar-grid__cell calendar-grid__cell--empty" />
          ) : (
            <button
              key={day}
              type="button"
              className={`calendar-grid__cell ${activeDay === day ? "is-selected" : ""}`}
              onClick={() => mode === "interactive" && setSelectedDay(day)}
              disabled={mode === "display"}
            >
              {day}
            </button>
          ),
        )}
      </div>

      {activeDay != null && activeWeekdayIndex != null && (
        <div className="calendar-grid__reading">
          <span className="calendar-grid__reading-kanji">
            {japaneseDayOfMonth(activeDay).kanji} ({japaneseWeekday(activeWeekdayIndex).kanji})
          </span>
          <span className="calendar-grid__reading-romaji">
            {japaneseDayOfMonth(activeDay).romaji}, {japaneseWeekday(activeWeekdayIndex).romaji}
          </span>
        </div>
      )}
    </div>
  );
}
