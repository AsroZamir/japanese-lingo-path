// Plain module (no "use server") so both the client components building
// SkillOutcome[] and actions.ts can import it — a "use server" file may
// only export async functions, so this helper can't live there.

export type KanaSkill = "visual" | "audio" | "recall" | "writing" | "reading" | "typing";

export type SkillOutcome = { kanaId: number; skill: KanaSkill; correct: boolean };

const EXERCISE_TYPE_SKILL: Record<string, KanaSkill> = {
  recall: "recall",
  visual_to_sound: "visual",
  sound_to_visual: "audio",
  word_reading: "reading",
  typing: "typing",
  dictation: "typing",
  word_arrange: "typing",
  similar_kana_discrimination: "visual",
  timed_recognition: "visual",
  writing: "writing",
};

export function skillForExerciseType(exerciseType: string): KanaSkill {
  return EXERCISE_TYPE_SKILL[exerciseType] ?? "recall";
}
