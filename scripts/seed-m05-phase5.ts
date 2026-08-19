import { sql, inArray, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import {
  kanaModules,
  kanaPhases,
  kanaLessons,
  lessonContentBlocks,
  lessonExercises,
} from "../db/schema/kana";
import type {
  TextBlockContent,
  MultiTurnDialogueContent,
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 5.txt Fase 5.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "dialogue"; content: MultiTurnDialogueContent; narrationText?: string }
  | { blockType: "callout"; content: CalloutBlockContent; narrationText?: string };

type ExerciseInput = {
  exerciseType: "concept_mcq" | "typing";
  prompt: string;
  options: LessonExerciseOption[] | null;
  correctOptionId: number | null;
  explanation: string | null;
  audioUrl: string | null;
};

const SPEAKING_NOTE: CalloutBlockContent = {
  kind: "tip",
  body: "Latihan bicara sungguhan (rekam & nilai pengucapan) belum tersedia di aplikasi ini. Dengarkan audio native, ucapkan mengikuti sesuai kemampuan Anda sendiri — bagian ini tidak dinilai otomatis.",
};

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M05"));
    if (!module_) throw new Error("M05 belum ada.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P5",
        titleId: "Classroom Japanese",
        orderIndex: 5,
        descriptionId: "Bertanya arti sesuatu, minta pengulangan, minta bicara pelan, dan bilang tidak paham.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Asking What Something Is", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Asking for Repetition", lessonType: "orientation", orderIndex: 2, romajiPolicy: "on_demand" as const },
      { code: "L03", titleId: "Asking Someone to Slow Down", lessonType: "orientation", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Saying You Don't Understand", lessonType: "orientation", orderIndex: 4, romajiPolicy: "on_demand" as const },
      { code: "L05", titleId: "Classroom Roleplay", lessonType: "orientation_practice", orderIndex: 5, romajiPolicy: "always" as const },
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

    async function insertBlocks(lessonCode: string, blocks: BlockInput[]) {
      const lessonId = lessonIdByCode.get(lessonCode)!;
      await db.insert(lessonContentBlocks).values(
        blocks.map((b, i) => ({ lessonId, orderIndex: i + 1, blockType: b.blockType, content: b.content, narrationText: b.narrationText ?? null })),
      );
    }
    async function insertExercises(lessonCode: string, exercises: ExerciseInput[]) {
      const lessonId = lessonIdByCode.get(lessonCode)!;
      await db.insert(lessonExercises).values(exercises.map((e, i) => ({ lessonId, orderIndex: i + 1, ...e })));
    }

    // ════════ L01 — Asking What Something Is ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Menanyakan sesuatu",
          paragraphs: [
            "これは何ですか (kore wa nan desu ka) = \"ini apa?\" — menunjuk sesuatu dan bertanya artinya.",
            "これは日本語で何ですか (kore wa nihongo de nan desu ka) = \"ini dalam bahasa Jepang apa?\" — spesifik menanyakan istilah Jepangnya.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "これは日本語で何ですか artinya...",
        options: [{ id: 1, label: "Ini apa?" }, { id: 2, label: "Ini dalam bahasa Jepang apa?" }, { id: 3, label: "Ini punya siapa?" }],
        correctOptionId: 2,
        explanation: "これは日本語で何ですか secara spesifik menanyakan istilah Jepangnya.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Asking for Repetition ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Meminta pengulangan",
          paragraphs: [
            "もう一度お願いします (review Fase 2) = \"tolong sekali lagi\". もう一度言ってください (mou ichido itte kudasai) = \"tolong katakan sekali lagi\" — lebih spesifik, memakai 言う (mengatakan) + ください.",
          ],
        } satisfies TextBlockContent,
      },
      { blockType: "callout", content: SPEAKING_NOTE },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk もう一度, dalam romaji.",
        options: [{ id: 1, label: "もういちど" }],
        correctOptionId: 1,
        explanation: "もう一度 dibaca \"mou ichido\" = \"sekali lagi.\"",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Asking Someone to Slow Down ════════
    await insertBlocks("L03", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Meminta bicara pelan",
          paragraphs: [
            "ゆっくりお願いします (review Fase 2) = \"tolong pelan-pelan\" — dipakai saat lawan bicara berbicara terlalu cepat untuk Anda ikuti.",
          ],
        } satisfies TextBlockContent,
      },
      { blockType: "callout", content: SPEAKING_NOTE },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Kalau lawan bicara terlalu cepat, kalimat yang tepat...",
        options: [{ id: 1, label: "ゆっくりお願いします" }, { id: 2, label: "もう一度お願いします" }, { id: 3, label: "ありがとうございます" }],
        correctOptionId: 1,
        explanation: "ゆっくりお願いします = \"tolong pelan-pelan\" — spesifik untuk kecepatan bicara, bukan pengulangan.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Saying You Don't Understand ════════
    await insertBlocks("L04", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Bilang tidak paham",
          paragraphs: [
            "わかりません (review Fase 4) = \"saya tidak mengerti\". ちょっとわかりません (chotto wakarimasen) = \"agak tidak mengerti\" — versi lebih halus, sering dipakai supaya tidak terdengar terlalu blak-blakan.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "ちょっとわかりません dibandingkan わかりません...",
        options: [{ id: 1, label: "Artinya sama sekali berbeda" }, { id: 2, label: "Versi lebih halus dari yang sama" }, { id: 3, label: "Berarti \"saya paham sepenuhnya\"" }],
        correctOptionId: 2,
        explanation: "ちょっとわかりません adalah versi lebih halus dari わかりません — sama artinya, nadanya lebih lembut.",
        audioUrl: null,
      },
    ]);

    // ════════ L05 — Classroom Roleplay ════════
    await insertBlocks("L05", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "dialogue",
        content: {
          scenario: "Anda di kelas bahasa Jepang, guru sedang menjelaskan sesuatu yang cepat.",
          turns: [
            {
              npcKana: "今日は「いただきます」について勉強します。",
              prompt: "Guru bicara terlalu cepat untuk Anda ikuti. Apa yang Anda katakan?",
              choices: [
                { id: "a", kana: "ゆっくりお願いします。", correct: true },
                { id: "b", kana: "ありがとうございます。", correct: false },
                { id: "c", kana: "いくらですか。", correct: false },
              ],
            },
            {
              npcKana: "はい、わかりました。今日は、いただきます、について、勉強します。",
              prompt: "Guru mengulang lebih pelan, tapi Anda masih belum yakin paham. Apa yang Anda katakan?",
              choices: [
                { id: "a", kana: "ちょっとわかりません。もう一度お願いします。", correct: true },
                { id: "b", kana: "そうですね。", correct: false },
                { id: "c", kana: "はじめまして。", correct: false },
              ],
            },
            {
              npcKana: "いいですよ。ゆっくり説明しますね。",
              prompt: "Guru bersedia menjelaskan lagi dengan lebih pelan. Bagaimana Anda merespons?",
              choices: [
                { id: "a", kana: "ありがとうございます。", correct: true },
                { id: "b", kana: "いいえ。", correct: false },
                { id: "c", kana: "すみません。", correct: false },
              ],
            },
          ],
          closingNote: "Anda baru saja mempraktikkan tiga alat kontrol percakapan penting: minta pelan-pelan, bilang tidak paham + minta ulang, dan berterima kasih.",
        } satisfies MultiTurnDialogueContent,
      },
    ]);

    await insertExercises("L05", [
      {
        exerciseType: "concept_mcq",
        prompt: "Kalau Anda paham sebagian tapi tidak yakin sepenuhnya, kalimat paling halus...",
        options: [{ id: 1, label: "ちょっとわかりません。もう一度お願いします。" }, { id: 2, label: "わかりません！" }, { id: 3, label: "ぜんぜんわかりません。" }],
        correctOptionId: 1,
        explanation: "ちょっとわかりません lebih halus, dan menambahkan もう一度お願いします memberi solusi konkret.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M05 Fase 5 (P5) id=${phase.id}: 5 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m05-phase5 gagal:", error);
  process.exit(1);
});
