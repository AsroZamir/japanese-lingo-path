export type DailyGoal = { minutesCompleted: number; minutesTarget: number };
export const dailyGoal: DailyGoal = { minutesCompleted: 18, minutesTarget: 30 };

// Curriculum-progress labels, not identity/session data — no backing
// column yet, stays here until Fase 5/6 wires up real progress tracking.
export const learnerLevel = "Pemula · Pre-N5";
export const learningGoal = "General Japanese";

export type Streak = { days: number };
export const streak: Streak = { days: 7 };

export type ReviewSummary = { dueNow: number; learning: number; mastered: number };
export const reviewSummary: ReviewSummary = { dueNow: 12, learning: 28, mastered: 64 };

export type ReviewBreakdownItem = { type: string; count: number; dot: "red" | "blue" | "pink" };
export const reviewBreakdown: ReviewBreakdownItem[] = [
  { type: "Words", count: 7, dot: "red" },
  { type: "Kanji", count: 3, dot: "blue" },
  { type: "Grammar", count: 2, dot: "pink" },
];
