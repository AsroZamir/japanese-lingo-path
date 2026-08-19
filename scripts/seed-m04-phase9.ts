import { sql, inArray, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons, lessonContentBlocks, lessonExercises } from "../db/schema/kana";
import type { CalloutBlockContent, LessonExerciseOption } from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 4.txt Fase 9. Konsolidasi acak lintas
// seluruh Fase 1-7 — tanpa komponen baru.

type ExerciseInput = {
  exerciseType: "concept_mcq" | "typing";
  prompt: string;
  options: LessonExerciseOption[] | null;
  correctOptionId: number | null;
  explanation: string | null;
  audioUrl: string | null;
};

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M04"));
    if (!module_) throw new Error("M04 belum ada.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P9",
        titleId: "Consolidation",
        orderIndex: 9,
        descriptionId: "Angka/waktu acak, campuran info, dan tantangan tanpa romaji.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Random Numbers & Time", lessonType: "orientation_practice", orderIndex: 1, romajiPolicy: "hidden" as const },
      { code: "L02", titleId: "Information Mix", lessonType: "orientation_practice", orderIndex: 2, romajiPolicy: "hidden" as const },
      { code: "L03", titleId: "No-Romaji Information Challenge", lessonType: "orientation_practice", orderIndex: 3, romajiPolicy: "hidden" as const },
    ];

    const lessonRows = await db
      .insert(kanaLessons)
      .values(LESSONS.map((l) => ({
        phaseId: phase.id, code: l.code, titleId: l.titleId, lessonType: l.lessonType,
        orderIndex: l.orderIndex, groupCode: null, romajiPolicy: l.romajiPolicy, targetThresholds: null,
      })))
      .onConflictDoUpdate({
        target: [kanaLessons.phaseId, kanaLessons.code],
        set: { titleId: sql`excluded.title_id`, lessonType: sql`excluded.lesson_type`, orderIndex: sql`excluded.order_index`, romajiPolicy: sql`excluded.romaji_policy` },
      })
      .returning({ id: kanaLessons.id, code: kanaLessons.code });
    const lessonIdByCode = new Map(lessonRows.map((l) => [l.code, l.id]));
    const lessonIds = [...lessonIdByCode.values()];

    await db.delete(lessonContentBlocks).where(inArray(lessonContentBlocks.lessonId, lessonIds));
    await db.delete(lessonExercises).where(inArray(lessonExercises.lessonId, lessonIds));

    async function insertBlocks(lessonCode: string, blocks: { blockType: "callout"; content: CalloutBlockContent }[]) {
      const lessonId = lessonIdByCode.get(lessonCode)!;
      await db.insert(lessonContentBlocks).values(blocks.map((b, i) => ({ lessonId, orderIndex: i + 1, blockType: b.blockType, content: b.content, narrationText: null })));
    }
    async function insertExercises(lessonCode: string, exercises: ExerciseInput[]) {
      const lessonId = lessonIdByCode.get(lessonCode)!;
      await db.insert(lessonExercises).values(exercises.map((e, i) => ({ lessonId, orderIndex: i + 1, ...e })));
    }

    // ════════ L01 — Random Numbers & Time ════════
    await insertExercises("L01", [
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 六十七 (67), dalam romaji.",
        options: [{ id: 1, label: "ろくじゅうしち" }],
        correctOptionId: 1,
        explanation: "六十七 = rokujuu (60) + shichi/nana (7) = rokujuushichi.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "十時半 dibaca \"juuji-han\". Jam berapa ini?",
        options: [{ id: 1, label: "10:00" }, { id: 2, label: "10:30" }, { id: 3, label: "10:15" }],
        correctOptionId: 2,
        explanation: "十時半 = juuji-han = jam setengah 11 (10:30).",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk umur 15 tahun, dalam romaji.",
        options: [{ id: 1, label: "じゅうごさい" }],
        correctOptionId: 1,
        explanation: "十五歳 dibaca \"juugo-sai\" — angka 5 di sini teratur, tidak berubah bentuk.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "三千円 artinya harga...",
        options: [{ id: 1, label: "300 yen" }, { id: 2, label: "3.000 yen" }, { id: 3, label: "30.000 yen" }],
        correctOptionId: 2,
        explanation: "三千円 = sanzen-en = 3.000 yen.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Information Mix ════════
    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "田中さんは二十八歳、日本人、会社員です。 Berapa umur Tanaka-san?",
        options: [{ id: 1, label: "18" }, { id: 2, label: "28" }, { id: 3, label: "8" }],
        correctOptionId: 2,
        explanation: "二十八歳 = nijuuhassai = 28 tahun.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "同上の文で、田中さんの仕事は？(Dari kalimat di atas, apa pekerjaan Tanaka-san?)",
        options: [{ id: 1, label: "学生" }, { id: 2, label: "先生" }, { id: 3, label: "会社員" }],
        correctOptionId: 3,
        explanation: "会社員 = karyawan perusahaan.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "会議は木曜日の三時です。 Rapat hari apa dan jam berapa?",
        options: [{ id: 1, label: "Rabu, jam 3" }, { id: 2, label: "Kamis, jam 3" }, { id: 3, label: "Kamis, jam 4" }],
        correctOptionId: 2,
        explanation: "木曜日 = Kamis, 三時 = jam 3.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — No-Romaji Information Challenge ════════
    await insertBlocks("L03", [
      {
        blockType: "callout",
        content: {
          kind: "important",
          body: "Lesson ini sengaja tanpa romaji sama sekali di soal maupun pilihan jawaban — uji diri Anda membaca murni dari Kanji/Kana.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Baca kalimat ini, tanpa bantuan romaji: 今日は八日です。 Tanggal berapa hari ini?",
        options: [{ id: 1, label: "八日" }, { id: 2, label: "四日" }, { id: 3, label: "二日" }],
        correctOptionId: 1,
        explanation: "八日 (youka) = tanggal 8 — sudah tertulis langsung di kalimatnya.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Baca kalimat ini, tanpa bantuan romaji: これは千二百円です。 Berapa harganya?",
        options: [{ id: 1, label: "百二十円" }, { id: 2, label: "千二百円" }, { id: 3, label: "一万二千円" }],
        correctOptionId: 2,
        explanation: "千二百円 (sen nihyaku en) = 1.200 yen.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Baca kalimat ini, tanpa bantuan romaji: 山田さんはインドネシア人です。 Kewarganegaraan Yamada-san?",
        options: [{ id: 1, label: "日本人" }, { id: 2, label: "インドネシア人" }, { id: 3, label: "アメリカ人" }],
        correctOptionId: 2,
        explanation: "インドネシア人 (Indonesia-jin) = orang Indonesia — sudah tertulis langsung di kalimatnya.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M04 Fase 9 (P9) id=${phase.id}: 3 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m04-phase9 gagal:", error);
  process.exit(1);
});
