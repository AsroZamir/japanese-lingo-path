// Curriculum units in app/curriculum-data.ts are being replaced, module
// by module, with real DB-backed content in kana_modules. This is the
// explicit, manually-curated map from a legacy unit id to the
// kana_modules.code that supersedes it — only add an entry once that
// module's lessons are actually seeded, since presence here only makes
// a unit ELIGIBLE to be shown as connected; /belajar still checks the
// code actually exists in kana_modules before treating it as available
// (see getExistingKanaModuleCodes).
export const LEGACY_UNIT_TO_KANA_MODULE: Record<string, string> = {
  P0: "M01", // Orientasi Bahasa Jepang → Orientasi Bahasa Jepang
  P1: "M02", // Hiragana Foundation → Hiragana Dasar
};
