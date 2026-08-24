import { V21_PHASE_CODE_BY_STAGE } from "@/app/lib/hiragana-mnemonics";

// PROMPT-7 Bagian 7 — katakana-specific constants, kept separate from
// hiragana-mnemonics.ts rather than crammed into it, since that file's
// name is already hiragana-specific and this is the first genuinely
// netral-modul split point. kana_characters.group_code/order_in_group
// is NOT clean gojuon order for katakana either (verified directly:
// raw order is scrambled — same warning as hiragana's F6-F12 build) —
// this canonical array is the only thing implementation code may trust
// for display/chunking order.
export const KATAKANA_MODULE_CODE = "PRE-N5.02";

export const KATAKANA_BASIC_CHARACTERS = [
  "ア", "イ", "ウ", "エ", "オ",
  "カ", "キ", "ク", "ケ", "コ",
  "サ", "シ", "ス", "セ", "ソ",
  "タ", "チ", "ツ", "テ", "ト",
  "ナ", "ニ", "ヌ", "ネ", "ノ",
  "ハ", "ヒ", "フ", "ヘ", "ホ",
  "マ", "ミ", "ム", "メ", "モ",
  "ヤ", "ユ", "ヨ",
  "ラ", "リ", "ル", "レ", "ロ",
  "ワ", "ヲ", "ン",
] as const;

// V21_PHASE_CODE_BY_STAGE (hiragana-mnemonics.ts) maps F1-F5/BOSS to
// P1-P5/CORE_GATE — reusing those same phase codes for katakana's own
// F1-F5/BOSS stages would collide in exercise_type/phase_code (both
// would produce "v21_p1_..." for two different characters' worth of
// data, distinguishable only by kana_id, not by phase_code itself).
// Prefixed with K so katakana's own attempts stay independently
// queryable without needing to cross-reference kana_id.script.
export const KATAKANA_PHASE_CODE_BY_STAGE: Record<string, string> = {
  F1: "KP1",
  F2: "KP2",
  F3: "KP3",
  F4: "KP4",
  F5: "KP5",
  BOSS: "K_CORE_GATE",
  // RETENTION isn't in V21_PHASE_CODE_BY_STAGE either — it falls back to
  // its own raw stage code ("RETENTION") for hiragana. Without a katakana
  // override here, both modules' RETENTION stages would produce the same
  // phase_code, and completeHiraganaStage's retention-score query has no
  // kana_id filter of its own (it trusts phase_code + exercise_type alone)
  // — an unmapped RETENTION would let a katakana retention check pick up
  // hiragana attempt rows and vice versa. Must stay mapped.
  RETENTION: "K_RETENTION",
};

// Single entry point for resolving a stage's phase code, aware of which
// script it belongs to — used everywhere V21_PHASE_CODE_BY_STAGE used to
// be read directly. `script` comes from the stage's own
// configuration.script field (defaults to "hiragana" for pre-existing
// rows that never set it).
export function resolvePhaseCode(stageCode: string, script: string): string {
  if (script === "katakana") {
    return KATAKANA_PHASE_CODE_BY_STAGE[stageCode] ?? stageCode;
  }
  return V21_PHASE_CODE_BY_STAGE[stageCode] ?? stageCode;
}
