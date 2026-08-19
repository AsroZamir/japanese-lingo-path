// M04 Fase 4 (Time & Clock). Hour readings for 時 have two real
// irregulars — 四時 is "yoji" (never "yonji") and 九時 is "kuji" (never
// "kyuuji") — plus 七時 conventionally reads "shichiji" for clock time
// specifically (nanaji is understood but not the textbook form). These
// aren't guesses; they're the standard N5 time-telling readings.
const HOUR_KANJI: Record<number, string> = {
  1: "一時", 2: "二時", 3: "三時", 4: "四時", 5: "五時", 6: "六時",
  7: "七時", 8: "八時", 9: "九時", 10: "十時", 11: "十一時", 12: "十二時",
};
const HOUR_ROMAJI: Record<number, string> = {
  1: "ichiji", 2: "niji", 3: "sanji", 4: "yoji", 5: "goji", 6: "rokuji",
  7: "shichiji", 8: "hachiji", 9: "kuji", 10: "juuji", 11: "juuichiji", 12: "juuniji",
};

// Scoped to the four stops components/numbers/AnalogClock's interactive
// mode actually offers (:00/:15/:30/:45) — half hour uses 半 (han), the
// natural idiomatic form learners actually hear, not 三十分 literally.
const MINUTE_KANJI: Record<number, string> = { 0: "", 15: "十五分", 30: "半", 45: "四十五分" };
const MINUTE_ROMAJI: Record<number, string> = { 0: "", 15: "juugofun", 30: "han", 45: "yonjuugofun" };

export function japaneseTimeReading(hour: number, minute: number): { kanji: string; romaji: string } {
  const h = ((hour - 1) % 12) + 1; // normalize 0/13+ defensively, keep 1-12
  const hourKanji = HOUR_KANJI[h] ?? `${h}時`;
  const hourRomaji = HOUR_ROMAJI[h] ?? `${h}ji`;
  const minuteKanji = MINUTE_KANJI[minute] ?? `${minute}分`;
  const minuteRomaji = MINUTE_ROMAJI[minute] ?? `${minute}fun`;
  return {
    kanji: `${hourKanji}${minuteKanji}`,
    romaji: minuteRomaji ? `${hourRomaji}-${minuteRomaji}` : hourRomaji,
  };
}
