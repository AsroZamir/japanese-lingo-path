// M04 Fase 5 (Days, Dates & Calendar). Day-of-month readings (日) are
// the single most irregular set in beginner Japanese — 1-10 are each
// their own word (not "number + nichi"), and three more (14, 20, 24)
// stay irregular even past 10. All 31 are listed explicitly rather than
// derived, since getting even one wrong here is a well-known beginner
// trap this app shouldn't repeat.
const WEEKDAY_KANJI = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"]; // 0=Sunday, matches JS Date.getDay()
const WEEKDAY_ROMAJI = ["nichiyoubi", "getsuyoubi", "kayoubi", "suiyoubi", "mokuyoubi", "kinyoubi", "doyoubi"];

const MONTH_KANJI: Record<number, string> = {
  1: "一月", 2: "二月", 3: "三月", 4: "四月", 5: "五月", 6: "六月",
  7: "七月", 8: "八月", 9: "九月", 10: "十月", 11: "十一月", 12: "十二月",
};
// 四月="shigatsu" (not yongatsu/yogatsu — a THIRD reading of 4, distinct
// from time's "yoji"), 七月="shichigatsu" (matches time), 九月="kugatsu"
// (matches time) — every one of these differs from the general-number
// reading, on purpose, not a typo.
const MONTH_ROMAJI: Record<number, string> = {
  1: "ichigatsu", 2: "nigatsu", 3: "sangatsu", 4: "shigatsu", 5: "gogatsu", 6: "rokugatsu",
  7: "shichigatsu", 8: "hachigatsu", 9: "kugatsu", 10: "juugatsu", 11: "juuichigatsu", 12: "juunigatsu",
};

const DAY_OF_MONTH_KANJI: Record<number, string> = {
  1: "一日", 2: "二日", 3: "三日", 4: "四日", 5: "五日", 6: "六日", 7: "七日", 8: "八日", 9: "九日", 10: "十日",
  11: "十一日", 12: "十二日", 13: "十三日", 14: "十四日", 15: "十五日", 16: "十六日", 17: "十七日", 18: "十八日", 19: "十九日", 20: "二十日",
  21: "二十一日", 22: "二十二日", 23: "二十三日", 24: "二十四日", 25: "二十五日", 26: "二十六日", 27: "二十七日", 28: "二十八日", 29: "二十九日", 30: "三十日", 31: "三十一日",
};
const DAY_OF_MONTH_ROMAJI: Record<number, string> = {
  1: "tsuitachi", 2: "futsuka", 3: "mikka", 4: "yokka", 5: "itsuka", 6: "muika", 7: "nanoka", 8: "youka", 9: "kokonoka", 10: "tooka",
  11: "juuichinichi", 12: "juuninichi", 13: "juusannichi", 14: "juuyokka", 15: "juugonichi", 16: "juurokunichi", 17: "juushichinichi", 18: "juuhachinichi", 19: "juukunichi", 20: "hatsuka",
  21: "nijuuichinichi", 22: "nijuuninichi", 23: "nijuusannichi", 24: "nijuuyokka", 25: "nijuugonichi", 26: "nijuurokunichi", 27: "nijuushichinichi", 28: "nijuuhachinichi", 29: "nijuukunichi", 30: "sanjuunichi", 31: "sanjuuichinichi",
};

export function japaneseWeekday(dayIndex: number): { kanji: string; romaji: string } {
  const i = ((dayIndex % 7) + 7) % 7;
  return { kanji: WEEKDAY_KANJI[i], romaji: WEEKDAY_ROMAJI[i] };
}

export function japaneseMonth(month: number): { kanji: string; romaji: string } {
  return { kanji: MONTH_KANJI[month] ?? `${month}月`, romaji: MONTH_ROMAJI[month] ?? `${month}gatsu` };
}

export function japaneseDayOfMonth(day: number): { kanji: string; romaji: string } {
  return { kanji: DAY_OF_MONTH_KANJI[day] ?? `${day}日`, romaji: DAY_OF_MONTH_ROMAJI[day] ?? `${day}nichi` };
}
