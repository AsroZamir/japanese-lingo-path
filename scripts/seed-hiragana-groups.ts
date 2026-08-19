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

// Bagian 4 — M02 Phase 2, Groups A-J (docs/pre n5 modul 2.txt). Group A
// was already seeded one-off by seed-first-lesson.ts; this script
// generalizes that exact same pattern (same 4 lesson types, same
// kana_lesson_items/kana_example_words/kana_word_characters shape) to
// all 10 groups, since LessonL01-L04 are already fully data-driven —
// no new UI needed, just data. Group A is included too (idempotent
// re-seed) so this one script is the single source of truth for all of
// Phase 2 going forward.
//
// Example words only ever use CUMULATIVELY-taught characters (this
// group's + every earlier group's) — same convention seed-first-
// lesson.ts already established for Group A. LessonL01 renders a word
// as one indivisible unit with no per-character taught/dimmed state,
// so a word using an untaught letter would silently look identical to
// one using only taught letters; the "dimmed untaught letter" allowance
// in the Bagian 4 pedagogical rules needs that per-character UI first,
// which doesn't exist yet — flagged in the report, not built here.

type GroupDef = {
  code: string; // A-J, matches kana_characters.group_code and the kana_lessons_group_code_range check
  chars: string[];
  titleId: string; // phase title
  words: { kana: string; meaningId: string; meaningEn: string }[];
};

const GROUPS: GroupDef[] = [
  {
    code: "A",
    chars: ["あ", "い", "う", "え", "お"],
    titleId: "Kelompok A — あ い う え お",
    words: [
      { kana: "あお", meaningId: "biru", meaningEn: "blue" },
      { kana: "いえ", meaningId: "rumah", meaningEn: "house" },
      { kana: "うえ", meaningId: "atas", meaningEn: "above" },
      { kana: "あい", meaningId: "cinta", meaningEn: "love" },
      { kana: "あう", meaningId: "bertemu", meaningEn: "to meet" },
      { kana: "いう", meaningId: "berkata", meaningEn: "to say" },
      { kana: "いいえ", meaningId: "tidak", meaningEn: "no" },
    ],
  },
  {
    code: "B",
    chars: ["か", "き", "く", "け", "こ"],
    titleId: "Kelompok B — か き く け こ",
    words: [
      { kana: "かお", meaningId: "wajah", meaningEn: "face" },
      { kana: "いけ", meaningId: "kolam", meaningEn: "pond" },
      { kana: "あか", meaningId: "merah", meaningEn: "red" },
      { kana: "きく", meaningId: "mendengar / bunga krisan", meaningEn: "to listen / chrysanthemum" },
      { kana: "こえ", meaningId: "suara", meaningEn: "voice" },
      { kana: "あき", meaningId: "musim gugur", meaningEn: "autumn" },
    ],
  },
  {
    code: "C",
    chars: ["さ", "し", "す", "せ", "そ"],
    titleId: "Kelompok C — さ し す せ そ",
    words: [
      { kana: "あさ", meaningId: "pagi", meaningEn: "morning" },
      { kana: "かさ", meaningId: "payung", meaningEn: "umbrella" },
      { kana: "すし", meaningId: "sushi", meaningEn: "sushi" },
      { kana: "いす", meaningId: "kursi", meaningEn: "chair" },
      { kana: "うそ", meaningId: "bohong", meaningEn: "lie" },
      { kana: "しお", meaningId: "garam", meaningEn: "salt" },
    ],
  },
  {
    code: "D",
    chars: ["た", "ち", "つ", "て", "と"],
    titleId: "Kelompok D — た ち つ て と",
    words: [
      { kana: "たこ", meaningId: "gurita / layang-layang", meaningEn: "octopus / kite" },
      { kana: "つき", meaningId: "bulan", meaningEn: "moon" },
      { kana: "くつ", meaningId: "sepatu", meaningEn: "shoes" },
      { kana: "した", meaningId: "bawah", meaningEn: "under" },
      { kana: "たいこ", meaningId: "genderang", meaningEn: "drum" },
      { kana: "とけい", meaningId: "jam", meaningEn: "clock" },
    ],
  },
  {
    code: "E",
    chars: ["な", "に", "ぬ", "ね", "の"],
    titleId: "Kelompok E — な に ぬ ね の",
    words: [
      { kana: "なつ", meaningId: "musim panas", meaningEn: "summer" },
      { kana: "いぬ", meaningId: "anjing", meaningEn: "dog" },
      { kana: "ねこ", meaningId: "kucing", meaningEn: "cat" },
      { kana: "かに", meaningId: "kepiting", meaningEn: "crab" },
      { kana: "なす", meaningId: "terong", meaningEn: "eggplant" },
      { kana: "きのう", meaningId: "kemarin", meaningEn: "yesterday" },
    ],
  },
  {
    code: "F",
    chars: ["は", "ひ", "ふ", "へ", "ほ"],
    titleId: "Kelompok F — は ひ ふ へ ほ",
    words: [
      { kana: "はな", meaningId: "bunga", meaningEn: "flower" },
      { kana: "ふね", meaningId: "kapal", meaningEn: "boat" },
      { kana: "ほし", meaningId: "bintang", meaningEn: "star" },
      { kana: "はこ", meaningId: "kotak", meaningEn: "box" },
      { kana: "はは", meaningId: "ibu (kata sendiri)", meaningEn: "mother (own)" },
      { kana: "ひと", meaningId: "orang", meaningEn: "person" },
    ],
  },
  {
    code: "G",
    chars: ["ま", "み", "む", "め", "も"],
    titleId: "Kelompok G — ま み む め も",
    words: [
      { kana: "うま", meaningId: "kuda", meaningEn: "horse" },
      { kana: "くも", meaningId: "awan / laba-laba", meaningEn: "cloud / spider" },
      { kana: "あめ", meaningId: "hujan / permen", meaningEn: "rain / candy" },
      { kana: "みみ", meaningId: "telinga", meaningEn: "ear" },
      { kana: "むし", meaningId: "serangga", meaningEn: "insect" },
      { kana: "まめ", meaningId: "kacang", meaningEn: "bean" },
    ],
  },
  {
    code: "H",
    chars: ["や", "ゆ", "よ"],
    titleId: "Kelompok H — や ゆ よ",
    words: [
      { kana: "やま", meaningId: "gunung", meaningEn: "mountain" },
      { kana: "ゆき", meaningId: "salju", meaningEn: "snow" },
      { kana: "はやい", meaningId: "cepat", meaningEn: "fast" },
      { kana: "やすい", meaningId: "murah", meaningEn: "cheap" },
      { kana: "よこ", meaningId: "samping", meaningEn: "side" },
    ],
  },
  {
    code: "I",
    chars: ["ら", "り", "る", "れ", "ろ"],
    titleId: "Kelompok I — ら り る れ ろ",
    words: [
      { kana: "さくら", meaningId: "bunga sakura", meaningEn: "cherry blossom" },
      { kana: "そら", meaningId: "langit", meaningEn: "sky" },
      { kana: "くるま", meaningId: "mobil", meaningEn: "car" },
      { kana: "とり", meaningId: "burung", meaningEn: "bird" },
      { kana: "これ", meaningId: "ini", meaningEn: "this" },
      { kana: "いろ", meaningId: "warna", meaningEn: "color" },
    ],
  },
  {
    code: "J",
    chars: ["わ", "を", "ん"],
    titleId: "Kelompok J — わ を ん",
    words: [
      { kana: "わたし", meaningId: "saya", meaningEn: "I / me" },
      { kana: "ほん", meaningId: "buku", meaningEn: "book" },
      { kana: "かわ", meaningId: "sungai", meaningEn: "river" },
      { kana: "わかる", meaningId: "mengerti", meaningEn: "to understand" },
      { kana: "にほん", meaningId: "Jepang", meaningEn: "Japan" },
      { kana: "さかな", meaningId: "ikan", meaningEn: "fish" },
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
        code: "M02",
        titleId: "Hiragana Dasar",
        titleEn: "Basic Hiragana",
        descriptionId: "Mengenal, membaca, dan menulis 46 karakter hiragana dasar per kelompok baris.",
        orderIndex: 2,
      })
      .onConflictDoUpdate({
        target: kanaModules.code,
        set: { titleId: sql`excluded.title_id`, titleEn: sql`excluded.title_en`, descriptionId: sql`excluded.description_id`, orderIndex: sql`excluded.order_index` },
      })
      .returning({ id: kanaModules.id });

    // Cumulative taught-character lookup, grows as we move through
    // groups — a later group's example words are allowed to use any
    // earlier group's characters too (e.g. Group B's かお reuses お).
    const kanaIdByChar = new Map<string, number>();
    let wordCount = 0;
    let lessonItemTotal = 0;

    for (let i = 0; i < GROUPS.length; i++) {
      const group = GROUPS[i];
      const phaseCode = `P${i + 2}`; // P1 reserved for M02's own orientation (not seeded by this script)

      const [phase] = await db
        .insert(kanaPhases)
        .values({
          moduleId: module_.id,
          code: phaseCode,
          titleId: group.titleId,
          orderIndex: i + 2,
          descriptionId: `Mengenal lima hiragana baris ${group.chars[0]}: bentuk, bunyi, cara menulis, dan latihan pengenalan.`,
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
        .where(and(eq(kanaCharacters.script, "hiragana"), inArray(kanaCharacters.character, group.chars)));
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
          .where(and(eq(kanaExampleWords.wordKana, word.kana), eq(kanaExampleWords.script, "hiragana")))
          .limit(1);

        let wordId: number;
        if (existing.length > 0) {
          wordId = existing[0].id;
          await db.update(kanaExampleWords).set({ romaji, meaningId: word.meaningId, meaningEn: word.meaningEn }).where(eq(kanaExampleWords.id, wordId));
        } else {
          const [inserted] = await db
            .insert(kanaExampleWords)
            .values({ wordKana: word.kana, script: "hiragana", romaji, meaningId: word.meaningId, meaningEn: word.meaningEn, difficultyTier: 1, isLoanword: false })
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

    console.log(`\nSelesai. M02 id=${module_.id}. ${lessonItemTotal} lesson_items, ${wordCount} kata contoh diproses.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-hiragana-groups gagal:", error);
  process.exit(1);
});
