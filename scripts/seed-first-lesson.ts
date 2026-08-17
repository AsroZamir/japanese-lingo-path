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

const GROUP_A = ["あ", "い", "う", "え", "お"];

const LESSONS = [
  { code: "L01", titleId: "Perkenalan あいうえお", lessonType: "introduction", orderIndex: 1, romajiPolicy: "always" as const, targetThresholds: { visual: 80 }, role: "new" as const },
  { code: "L02", titleId: "Cara Menulis あいうえお", lessonType: "writing_practice", orderIndex: 2, romajiPolicy: "on_demand" as const, targetThresholds: { writing: 75 }, role: "review" as const },
  { code: "L03", titleId: "Latihan Mengenali あいうえお", lessonType: "recognition_practice", orderIndex: 3, romajiPolicy: "on_demand" as const, targetThresholds: { visual: 85, recall: 80 }, role: "review" as const },
  { code: "L04", titleId: "Mini Test Kelompok A", lessonType: "assessment", orderIndex: 4, romajiPolicy: "hidden" as const, targetThresholds: { visual: 90, recall: 85, writing: 80 }, role: "review" as const },
];

const EXAMPLE_WORDS = [
  { kana: "あお", meaningId: "biru", meaningEn: "blue" },
  { kana: "いえ", meaningId: "rumah", meaningEn: "house" },
  { kana: "うえ", meaningId: "atas", meaningEn: "above" },
  { kana: "あい", meaningId: "cinta", meaningEn: "love" },
  { kana: "あう", meaningId: "bertemu", meaningEn: "to meet" },
  { kana: "いう", meaningId: "berkata", meaningEn: "to say" },
  { kana: "いいえ", meaningId: "tidak", meaningEn: "no" },
];

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
        set: {
          titleId: sql`excluded.title_id`,
          titleEn: sql`excluded.title_en`,
          descriptionId: sql`excluded.description_id`,
          orderIndex: sql`excluded.order_index`,
        },
      })
      .returning({ id: kanaModules.id });

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P2",
        titleId: "Kelompok A — あ い う え お",
        orderIndex: 2,
        descriptionId: "Mengenal lima hiragana dasar baris あ: bentuk, bunyi, cara menulis, dan latihan pengenalan.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: {
          titleId: sql`excluded.title_id`,
          orderIndex: sql`excluded.order_index`,
          descriptionId: sql`excluded.description_id`,
        },
      })
      .returning({ id: kanaPhases.id });

    const lessonRows = await db
      .insert(kanaLessons)
      .values(
        LESSONS.map((l) => ({
          phaseId: phase.id,
          code: l.code,
          titleId: l.titleId,
          lessonType: l.lessonType,
          orderIndex: l.orderIndex,
          groupCode: "A",
          romajiPolicy: l.romajiPolicy,
          targetThresholds: l.targetThresholds,
        })),
      )
      .onConflictDoUpdate({
        target: [kanaLessons.phaseId, kanaLessons.code],
        set: {
          titleId: sql`excluded.title_id`,
          lessonType: sql`excluded.lesson_type`,
          orderIndex: sql`excluded.order_index`,
          groupCode: sql`excluded.group_code`,
          romajiPolicy: sql`excluded.romaji_policy`,
          targetThresholds: sql`excluded.target_thresholds`,
        },
      })
      .returning({ id: kanaLessons.id, code: kanaLessons.code });

    const lessonIdByCode = new Map(lessonRows.map((l) => [l.code, l.id]));

    const groupAChars = await db
      .select({ id: kanaCharacters.id, character: kanaCharacters.character })
      .from(kanaCharacters)
      .where(and(eq(kanaCharacters.script, "hiragana"), inArray(kanaCharacters.character, GROUP_A)));

    if (groupAChars.length !== GROUP_A.length) {
      throw new Error(
        `Karakter Group A tidak lengkap di database — ditemukan ${groupAChars.length}/${GROUP_A.length}. Pastikan seed Fase 3 (seed-kana-characters) sudah dijalankan.`,
      );
    }
    const kanaIdByChar = new Map(groupAChars.map((c) => [c.character, c.id]));

    const lessonItemRows = LESSONS.flatMap((l) => {
      const lessonId = lessonIdByCode.get(l.code)!;
      return GROUP_A.map((char) => ({
        lessonId,
        kanaId: kanaIdByChar.get(char)!,
        wordId: null,
        role: l.role,
      }));
    });

    await db
      .insert(kanaLessonItems)
      .values(lessonItemRows)
      .onConflictDoUpdate({
        target: [kanaLessonItems.lessonId, kanaLessonItems.kanaId],
        set: { role: sql`excluded.role` },
      });

    // kana_example_words has no unique constraint in the schema (Fase 2
    // didn't ask for one), so idempotency here is handled at the
    // application level: look up by (word_kana, script) before deciding
    // insert vs update, rather than relying on ON CONFLICT.
    let wordCount = 0;
    for (const word of EXAMPLE_WORDS) {
      const romaji = wanakana.toRomaji(word.kana);
      const existing = await db
        .select({ id: kanaExampleWords.id })
        .from(kanaExampleWords)
        .where(and(eq(kanaExampleWords.wordKana, word.kana), eq(kanaExampleWords.script, "hiragana")))
        .limit(1);

      let wordId: number;
      if (existing.length > 0) {
        wordId = existing[0].id;
        await db
          .update(kanaExampleWords)
          .set({ romaji, meaningId: word.meaningId, meaningEn: word.meaningEn })
          .where(eq(kanaExampleWords.id, wordId));
      } else {
        const [inserted] = await db
          .insert(kanaExampleWords)
          .values({
            wordKana: word.kana,
            script: "hiragana",
            romaji,
            meaningId: word.meaningId,
            meaningEn: word.meaningEn,
            difficultyTier: 1,
            isLoanword: false,
          })
          .returning({ id: kanaExampleWords.id });
        wordId = inserted.id;
      }

      const characters = [...word.kana];
      const rows = characters.map((char, index) => {
        const kanaId = kanaIdByChar.get(char);
        if (kanaId == null) {
          throw new Error(`Kata "${word.kana}" mengandung karakter "${char}" di luar Group A あいうえお.`);
        }
        return { wordId, kanaId, position: index + 1 };
      });

      await db
        .insert(kanaWordCharacters)
        .values(rows)
        .onConflictDoUpdate({
          target: [kanaWordCharacters.wordId, kanaWordCharacters.position],
          set: { kanaId: sql`excluded.kana_id` },
        });

      wordCount++;
    }

    console.log(`Selesai. M02 id=${module_.id}, Phase P2 id=${phase.id}.`);
    console.log(`Lessons: ${lessonRows.map((l) => l.code).join(", ")} (${lessonItemRows.length} lesson_items).`);
    console.log(`${wordCount} kata contoh diproses (kana_example_words + kana_word_characters).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("Seed first lesson gagal:", error);
  process.exit(1);
});
