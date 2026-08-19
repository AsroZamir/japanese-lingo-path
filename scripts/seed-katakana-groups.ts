import * as wanakana from "wanakana";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import {
  kanaModules,
  kanaPhases,
  kanaLessons,
  kanaLessonItems,
  kanaCharacters,
  kanaExampleWords,
  kanaWordCharacters,
} from "../db/schema/kana";

// M03 Phase 2, Groups A-J (docs/pre n5 modul 3.txt) — exact same pattern
// as seed-hiragana-groups.ts (LessonL01-L04 are script-agnostic, nothing
// hardcoded to hiragana). Katakana's own constraint: Phase 2 has no
// dakuten/long-vowel-mark/youon yet (those are Phase 3), so real common
// loanwords are hard to form for the earliest groups — same honest
// tradeoff the modul's own Group A spec makes ("アイ", "ウエ", "アオ" are
// listed as reading fragments, not real words). Real words are used
// everywhere they're actually possible; fragments are clearly labeled.

type GroupDef = {
  code: string;
  chars: string[];
  titleId: string;
  words: { kana: string; meaningId: string; meaningEn: string }[];
};

const GROUPS: GroupDef[] = [
  {
    code: "A",
    chars: ["ア", "イ", "ウ", "エ", "オ"],
    titleId: "Kelompok A — アイウエオ",
    words: [
      { kana: "アイ", meaningId: "(latihan baca — belum ada kata sungguhan dari huruf sesedikit ini)", meaningEn: "(reading practice only)" },
      { kana: "ウエ", meaningId: "(latihan baca)", meaningEn: "(reading practice only)" },
      { kana: "アオ", meaningId: "(latihan baca)", meaningEn: "(reading practice only)" },
    ],
  },
  {
    code: "B",
    chars: ["カ", "キ", "ク", "ケ", "コ"],
    titleId: "Kelompok B — カキクケコ",
    words: [
      { kana: "エコ", meaningId: "ramah lingkungan (eco)", meaningEn: "eco" },
      { kana: "ココア", meaningId: "cokelat panas (cocoa)", meaningEn: "cocoa" },
    ],
  },
  {
    code: "C",
    chars: ["サ", "シ", "ス", "セ", "ソ"],
    titleId: "Kelompok C — サシスセソ",
    words: [
      { kana: "アイス", meaningId: "es krim (ice)", meaningEn: "ice (cream)" },
      { kana: "オアシス", meaningId: "oasis", meaningEn: "oasis" },
    ],
  },
  {
    code: "D",
    chars: ["タ", "チ", "ツ", "テ", "ト"],
    titleId: "Kelompok D — タチツテト",
    words: [
      { kana: "タコ", meaningId: "gurita (octopus)", meaningEn: "octopus" },
      { kana: "テスト", meaningId: "tes (test)", meaningEn: "test" },
    ],
  },
  {
    code: "E",
    chars: ["ナ", "ニ", "ヌ", "ネ", "ノ"],
    titleId: "Kelompok E — ナニヌネノ",
    words: [
      { kana: "カニ", meaningId: "kepiting (crab)", meaningEn: "crab" },
      { kana: "ナイス", meaningId: "bagus (nice)", meaningEn: "nice" },
    ],
  },
  {
    code: "F",
    chars: ["ハ", "ヒ", "フ", "ヘ", "ホ"],
    titleId: "Kelompok F — ハヒフヘホ",
    words: [
      { kana: "ハヒフ", meaningId: "(latihan baca — belum ada kata sungguhan yang pas)", meaningEn: "(reading practice only)" },
      { kana: "フヘホ", meaningId: "(latihan baca)", meaningEn: "(reading practice only)" },
    ],
  },
  {
    code: "G",
    chars: ["マ", "ミ", "ム", "メ", "モ"],
    titleId: "Kelompok G — マミムメモ",
    words: [
      { kana: "マスク", meaningId: "masker (mask)", meaningEn: "mask" },
      { kana: "メモ", meaningId: "catatan (memo)", meaningEn: "memo" },
    ],
  },
  {
    code: "H",
    chars: ["ヤ", "ユ", "ヨ"],
    titleId: "Kelompok H — ヤユヨ",
    words: [
      { kana: "ヤユヨ", meaningId: "(latihan baca — kelompok ini cuma 3 huruf, belum cukup untuk kata sungguhan)", meaningEn: "(reading practice only)" },
    ],
  },
  {
    code: "I",
    chars: ["ラ", "リ", "ル", "レ", "ロ"],
    titleId: "Kelompok I — ラリルレロ",
    words: [
      { kana: "アメリカ", meaningId: "Amerika (America)", meaningEn: "America" },
      { kana: "リス", meaningId: "tupai (squirrel)", meaningEn: "squirrel" },
    ],
  },
  {
    code: "J",
    chars: ["ワ", "ヲ", "ン"],
    titleId: "Kelompok J — ワヲン",
    words: [
      { kana: "ワイン", meaningId: "anggur/wine", meaningEn: "wine" },
    ],
  },
];

function lessonDefs(groupCode: string, groupLabel: string) {
  return [
    { code: "L01", titleId: `Perkenalan ${groupLabel}`, lessonType: "introduction", orderIndex: 1, romajiPolicy: "always" as const, targetThresholds: { visual: 80 }, role: "new" as const },
    { code: "L02", titleId: `Cara Menulis ${groupLabel}`, lessonType: "writing_practice", orderIndex: 2, romajiPolicy: "on_demand" as const, targetThresholds: { writing: 75 }, role: "review" as const },
    { code: "L03", titleId: `Latihan Mengenali ${groupLabel}`, lessonType: "recognition_practice", orderIndex: 3, romajiPolicy: "on_demand" as const, targetThresholds: { visual: 85, recall: 80 }, role: "review" as const },
    { code: "L04", titleId: `Mini Test Kelompok ${groupCode}`, lessonType: "assessment", orderIndex: 4, romajiPolicy: "hidden" as const, targetThresholds: { visual: 90, recall: 85, writing: 80 }, role: "review" as const },
  ];
}

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db
      .insert(kanaModules)
      .values({
        code: "M03",
        titleId: "Katakana Mastery",
        titleEn: "Katakana Mastery",
        descriptionId: "Mengenal, membaca, dan menulis 46 karakter katakana dasar, lalu memakainya membaca kata serapan.",
        orderIndex: 3,
      })
      .onConflictDoUpdate({
        target: kanaModules.code,
        set: { titleId: sql`excluded.title_id`, titleEn: sql`excluded.title_en`, descriptionId: sql`excluded.description_id`, orderIndex: sql`excluded.order_index` },
      })
      .returning({ id: kanaModules.id });

    const kanaIdByChar = new Map<string, number>();
    let wordCount = 0;
    let lessonItemTotal = 0;

    for (let i = 0; i < GROUPS.length; i++) {
      const group = GROUPS[i];
      const phaseCode = `P${i + 2}`; // P1 reserved for M03's own orientation

      const [phase] = await db
        .insert(kanaPhases)
        .values({
          moduleId: module_.id,
          code: phaseCode,
          titleId: group.titleId,
          orderIndex: i + 2,
          descriptionId: `Mengenal lima katakana baris ${group.chars[0]}: bentuk, bunyi, cara menulis, dan latihan pengenalan.`,
        })
        .onConflictDoUpdate({
          target: [kanaPhases.moduleId, kanaPhases.code],
          set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
        })
        .returning({ id: kanaPhases.id });

      const defs = lessonDefs(group.code, group.chars.join(""));
      const lessonRows = await db
        .insert(kanaLessons)
        .values(defs.map((l) => ({
          phaseId: phase.id, code: l.code, titleId: l.titleId, lessonType: l.lessonType,
          orderIndex: l.orderIndex, groupCode: group.code, romajiPolicy: l.romajiPolicy, targetThresholds: l.targetThresholds,
        })))
        .onConflictDoUpdate({
          target: [kanaLessons.phaseId, kanaLessons.code],
          set: { titleId: sql`excluded.title_id`, lessonType: sql`excluded.lesson_type`, orderIndex: sql`excluded.order_index`, groupCode: sql`excluded.group_code`, romajiPolicy: sql`excluded.romaji_policy`, targetThresholds: sql`excluded.target_thresholds` },
        })
        .returning({ id: kanaLessons.id, code: kanaLessons.code });
      const lessonIdByCode = new Map(lessonRows.map((l) => [l.code, l.id]));

      const groupChars = await db
        .select({ id: kanaCharacters.id, character: kanaCharacters.character })
        .from(kanaCharacters)
        .where(and(eq(kanaCharacters.script, "katakana"), inArray(kanaCharacters.character, group.chars)));
      if (groupChars.length !== group.chars.length) {
        throw new Error(`Karakter Group ${group.code} tidak lengkap di database — ditemukan ${groupChars.length}/${group.chars.length}.`);
      }
      for (const c of groupChars) kanaIdByChar.set(c.character, c.id);

      const lessonItemRows = defs.flatMap((l) => {
        const lessonId = lessonIdByCode.get(l.code)!;
        return group.chars.map((char) => ({ lessonId, kanaId: kanaIdByChar.get(char)!, wordId: null, role: l.role }));
      });
      await db
        .insert(kanaLessonItems)
        .values(lessonItemRows)
        .onConflictDoUpdate({ target: [kanaLessonItems.lessonId, kanaLessonItems.kanaId], set: { role: sql`excluded.role` } });
      lessonItemTotal += lessonItemRows.length;

      for (const word of group.words) {
        const romaji = wanakana.toRomaji(word.kana);
        const existing = await db
          .select({ id: kanaExampleWords.id })
          .from(kanaExampleWords)
          .where(and(eq(kanaExampleWords.wordKana, word.kana), eq(kanaExampleWords.script, "katakana")))
          .limit(1);

        let wordId: number;
        if (existing.length > 0) {
          wordId = existing[0].id;
          await db.update(kanaExampleWords).set({ romaji, meaningId: word.meaningId, meaningEn: word.meaningEn }).where(eq(kanaExampleWords.id, wordId));
        } else {
          const [inserted] = await db
            .insert(kanaExampleWords)
            .values({ wordKana: word.kana, script: "katakana", romaji, meaningId: word.meaningId, meaningEn: word.meaningEn, difficultyTier: 1, isLoanword: true })
            .returning({ id: kanaExampleWords.id });
          wordId = inserted.id;
        }

        const characters = [...word.kana];
        const rows = characters.map((char, index) => {
          const kanaId = kanaIdByChar.get(char);
          if (kanaId == null) {
            throw new Error(`Kata "${word.kana}" (Group ${group.code}) mengandung karakter "${char}" yang belum diajarkan sampai grup ini.`);
          }
          return { wordId, kanaId, position: index + 1 };
        });
        await db
          .insert(kanaWordCharacters)
          .values(rows)
          .onConflictDoUpdate({ target: [kanaWordCharacters.wordId, kanaWordCharacters.position], set: { kanaId: sql`excluded.kana_id` } });
        wordCount++;
      }

      console.log(`Group ${group.code} (${phaseCode}): ${lessonRows.length} lessons, ${group.words.length} kata contoh.`);
    }

    console.log(`\nSelesai. M03 id=${module_.id}. ${lessonItemTotal} lesson_items, ${wordCount} kata contoh diproses.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-katakana-groups gagal:", error);
  process.exit(1);
});
