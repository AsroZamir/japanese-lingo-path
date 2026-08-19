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

// Bagian 4 — M02 Phase 3 (Modified Hiragana), the dakuten/handakuten/youon
// portion (docs/pre n5 modul 2.txt lists these as ONE lesson each — L01
// Dakuten, L02 Handakuten, L03 small-ya/yu/yo — but that would cram 20,
// 5, and 33 characters respectively into a single introduction/writing/
// recognition/assessment cycle, 2-6x bigger than any Phase 2 group ever
// was. Content coverage stays exactly as specified; the DELIVERY is
// chunked into properly-sized phases instead, reusing the exact same
// group+4-lesson pattern seed-hiragana-groups.ts already proved out —
// see docs/curriculum/M02.md for the reasoning. Small-tsu + long vowels
// (the 4th Phase-3 topic) aren't new characters to drill this way — see
// seed-m02-phase3-sokuon.ts for that one, narrative-style like Phase 1.

type PseudoGroupDef = {
  phaseCode: string;
  titleId: string;
  descriptionId: string;
  chars: string[];
  lessonLabel: string; // used in per-lesson titles, e.g. "Dakuten" or "Youon (dasar)"
  words: { kana: string; meaningId: string; meaningEn: string }[];
};

const GROUPS: PseudoGroupDef[] = [
  {
    phaseCode: "P12",
    titleId: "Dakuten — huruf bersuara",
    descriptionId: "Menambahkan tanda dakuten (゛) pada baris か/さ/た/は untuk bunyi bersuara.",
    lessonLabel: "Dakuten",
    chars: ["が", "ぎ", "ぐ", "げ", "ご", "ざ", "じ", "ず", "ぜ", "ぞ", "だ", "ぢ", "づ", "で", "ど", "ば", "び", "ぶ", "べ", "ぼ"],
    words: [
      { kana: "がくせい", meaningId: "murid / mahasiswa", meaningEn: "student" },
      { kana: "かぞく", meaningId: "keluarga", meaningEn: "family" },
      { kana: "めがね", meaningId: "kacamata", meaningEn: "glasses" },
      { kana: "かぜ", meaningId: "angin / masuk angin", meaningEn: "wind / a cold" },
      { kana: "ひざ", meaningId: "lutut", meaningEn: "knee" },
      { kana: "かがみ", meaningId: "cermin", meaningEn: "mirror" },
    ],
  },
  {
    phaseCode: "P13",
    titleId: "Handakuten — huruf p",
    descriptionId: "Menambahkan tanda handakuten (゜) pada baris は untuk bunyi p.",
    lessonLabel: "Handakuten",
    chars: ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"],
    words: [
      { kana: "えんぴつ", meaningId: "pensil", meaningEn: "pencil" },
      { kana: "かんぱい", meaningId: "bersulang", meaningEn: "cheers" },
      { kana: "たんぽぽ", meaningId: "bunga dandelion", meaningEn: "dandelion" },
    ],
  },
  {
    phaseCode: "P14",
    titleId: "Youon (dasar) — きゃ しゃ ちゃ にゃ ひゃ みゃ りゃ",
    descriptionId: "Huruf い-baris + や/ゆ/よ kecil melebur jadi satu suku kata.",
    lessonLabel: "Youon dasar",
    chars: [
      "きゃ", "きゅ", "きょ", "しゃ", "しゅ", "しょ", "ちゃ", "ちゅ", "ちょ",
      "にゃ", "にゅ", "にょ", "ひゃ", "ひゅ", "ひょ", "みゃ", "みゅ", "みょ", "りゃ", "りゅ", "りょ",
    ],
    words: [
      { kana: "きょう", meaningId: "hari ini", meaningEn: "today" },
      { kana: "しゃしん", meaningId: "foto", meaningEn: "photo" },
      { kana: "ひゃく", meaningId: "seratus", meaningEn: "hundred" },
      { kana: "りょこう", meaningId: "wisata / bepergian", meaningEn: "travel" },
      { kana: "おちゃ", meaningId: "teh", meaningEn: "tea" },
      { kana: "でんしゃ", meaningId: "kereta listrik", meaningEn: "train" },
    ],
  },
  {
    phaseCode: "P15",
    titleId: "Youon (bersuara) — ぎゃ じゃ びゃ ぴゃ",
    descriptionId: "Youon dari baris berdakuten/handakuten — pola yang sama, huruf dasarnya sudah bersuara.",
    lessonLabel: "Youon bersuara",
    chars: ["ぎゃ", "ぎゅ", "ぎょ", "じゃ", "じゅ", "じょ", "びゃ", "びゅ", "びょ", "ぴゃ", "ぴゅ", "ぴょ"],
    words: [
      { kana: "じゅぎょう", meaningId: "pelajaran / kelas", meaningEn: "lesson / class" },
      { kana: "びょういん", meaningId: "rumah sakit", meaningEn: "hospital" },
      { kana: "ぎゅうにゅう", meaningId: "susu sapi", meaningEn: "cow's milk" },
      { kana: "じゃがいも", meaningId: "kentang", meaningEn: "potato" },
    ],
  },
];

function lessonDefs(lessonLabel: string) {
  return [
    { code: "L01", titleId: `Perkenalan ${lessonLabel}`, lessonType: "introduction", orderIndex: 1, romajiPolicy: "always" as const, targetThresholds: { visual: 80 }, role: "new" as const },
    { code: "L02", titleId: `Cara Menulis ${lessonLabel}`, lessonType: "writing_practice", orderIndex: 2, romajiPolicy: "on_demand" as const, targetThresholds: { writing: 75 }, role: "review" as const },
    { code: "L03", titleId: `Latihan Mengenali ${lessonLabel}`, lessonType: "recognition_practice", orderIndex: 3, romajiPolicy: "on_demand" as const, targetThresholds: { visual: 85, recall: 80 }, role: "review" as const },
    { code: "L04", titleId: `Mini Test ${lessonLabel}`, lessonType: "assessment", orderIndex: 4, romajiPolicy: "hidden" as const, targetThresholds: { visual: 90, recall: 85, writing: 80 }, role: "review" as const },
  ];
}

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M02"));
    if (!module_) throw new Error("M02 belum ada — jalankan scripts/seed-hiragana-groups.ts dulu.");

    // Semua 46 basic hiragana sudah "diajarkan" begitu Fase 2 selesai —
    // preload supaya kata contoh boleh memakai huruf dasar manapun, tidak
    // cuma yang kebetulan diproses duluan di loop ini.
    const kanaIdByChar = new Map<string, number>();
    const basicRows = await db
      .select({ id: kanaCharacters.id, character: kanaCharacters.character })
      .from(kanaCharacters)
      .where(and(eq(kanaCharacters.script, "hiragana"), eq(kanaCharacters.type, "basic")));
    for (const r of basicRows) kanaIdByChar.set(r.character, r.id);

    let wordCount = 0;
    let lessonItemTotal = 0;

    for (let i = 0; i < GROUPS.length; i++) {
      const group = GROUPS[i];
      const orderIndex = 12 + i; // P2-P11 = Phase 2 groups A-J

      const [phase] = await db
        .insert(kanaPhases)
        .values({
          moduleId: module_.id,
          code: group.phaseCode,
          titleId: group.titleId,
          orderIndex,
          descriptionId: group.descriptionId,
        })
        .onConflictDoUpdate({
          target: [kanaPhases.moduleId, kanaPhases.code],
          set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
        })
        .returning({ id: kanaPhases.id });

      const defs = lessonDefs(group.lessonLabel);
      const lessonRows = await db
        .insert(kanaLessons)
        .values(defs.map((l) => ({
          phaseId: phase.id, code: l.code, titleId: l.titleId, lessonType: l.lessonType,
          orderIndex: l.orderIndex, groupCode: null, romajiPolicy: l.romajiPolicy, targetThresholds: l.targetThresholds,
        })))
        .onConflictDoUpdate({
          target: [kanaLessons.phaseId, kanaLessons.code],
          set: { titleId: sql`excluded.title_id`, lessonType: sql`excluded.lesson_type`, orderIndex: sql`excluded.order_index`, romajiPolicy: sql`excluded.romaji_policy`, targetThresholds: sql`excluded.target_thresholds` },
        })
        .returning({ id: kanaLessons.id, code: kanaLessons.code });
      const lessonIdByCode = new Map(lessonRows.map((l) => [l.code, l.id]));

      const groupChars = await db
        .select({ id: kanaCharacters.id, character: kanaCharacters.character })
        .from(kanaCharacters)
        .where(and(eq(kanaCharacters.script, "hiragana"), inArray(kanaCharacters.character, group.chars)));
      if (groupChars.length !== group.chars.length) {
        throw new Error(`Karakter fase ${group.phaseCode} tidak lengkap di database — ditemukan ${groupChars.length}/${group.chars.length}.`);
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
            .values({ wordKana: word.kana, script: "hiragana", romaji, meaningId: word.meaningId, meaningEn: word.meaningEn, difficultyTier: 2, isLoanword: false })
            .returning({ id: kanaExampleWords.id });
          wordId = inserted.id;
        }

        // Youon words split into TWO logical characters per syllable (base +
        // small ya/yu/yo) in kana_characters, but read as one unit — [...str]
        // would wrongly split them into separate codepoints. wanakana's own
        // tokenizer isn't needed here since every word below is hand-built
        // from a known character list; splitting greedily on the longest
        // known character (checking 2-codepoint youon before falling back
        // to 1) keeps kana_word_characters aligned with kana_characters rows.
        const characters: string[] = [];
        let rest = word.kana;
        while (rest.length > 0) {
          const two = rest.slice(0, 2);
          if (kanaIdByChar.has(two)) {
            characters.push(two);
            rest = rest.slice(2);
          } else {
            characters.push(rest[0]);
            rest = rest.slice(1);
          }
        }

        const rows = characters.map((char, index) => {
          const kanaId = kanaIdByChar.get(char);
          if (kanaId == null) {
            throw new Error(`Kata "${word.kana}" (${group.phaseCode}) mengandung karakter "${char}" yang belum diajarkan sampai fase ini.`);
          }
          return { wordId, kanaId, position: index + 1 };
        });
        await db
          .insert(kanaWordCharacters)
          .values(rows)
          .onConflictDoUpdate({ target: [kanaWordCharacters.wordId, kanaWordCharacters.position], set: { kanaId: sql`excluded.kana_id` } });
        wordCount++;
      }

      console.log(`${group.lessonLabel} (${group.phaseCode}): ${lessonRows.length} lessons, ${group.words.length} kata contoh.`);
    }

    console.log(`\nSelesai. ${lessonItemTotal} lesson_items, ${wordCount} kata contoh diproses.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-modified-hiragana gagal:", error);
  process.exit(1);
});
