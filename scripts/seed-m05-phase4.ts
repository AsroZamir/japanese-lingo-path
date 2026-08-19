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
  TableBlockContent,
  DialogueBlockContent,
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 5.txt Fase 4.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "table"; content: TableBlockContent; narrationText?: string }
  | { blockType: "dialogue"; content: DialogueBlockContent; narrationText?: string }
  | { blockType: "callout"; content: CalloutBlockContent; narrationText?: string };

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
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M05"));
    if (!module_) throw new Error("M05 belum ada.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P4",
        titleId: "Basic Responses & Conversation Control",
        orderIndex: 4,
        descriptionId: "Ya/tidak/konfirmasi, memahami, persetujuan sederhana, dan respons ragu-ragu.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Yes / No / Confirm", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Understanding", lessonType: "orientation", orderIndex: 2, romajiPolicy: "always" as const },
      { code: "L03", titleId: "Simple Agreement", lessonType: "orientation", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Simple Hesitation / Response", lessonType: "orientation", orderIndex: 4, romajiPolicy: "on_demand" as const },
      { code: "L05", titleId: "Conversation Control Lab", lessonType: "orientation_practice", orderIndex: 5, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Yes / No / Confirm ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "はい dan いいえ jadi fondasi respons paling dasar, tapi そうです dan そうではありません sedikit berbeda — keduanya lebih tentang MENGONFIRMASI sebuah pernyataan, bukan sekadar menjawab pertanyaan ya/tidak biasa.",
        content: {
          kind: "paragraphs",
          heading: "Ya, tidak, dan konfirmasi",
          paragraphs: [
            "はい (hai) = ya. いいえ (iie) = tidak. Dua respons paling dasar.",
            "そうです (sou desu) = \"benar (seperti itu)\" — mengonfirmasi sebuah pernyataan. そうではありません (sou dewa arimasen) = \"bukan begitu\" — menyangkal pernyataan.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Perbedaan pemakaian",
          columns: ["Ungkapan", "Dipakai untuk"],
          rows: [
            ["はい / いいえ", "Menjawab pertanyaan langsung"],
            ["そうです", "Mengonfirmasi sebuah pernyataan/dugaan"],
            ["そうではありません", "Menyangkal sebuah pernyataan/dugaan"],
          ],
        } satisfies TableBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "そうです dipakai untuk...",
        options: [{ id: 1, label: "Menjawab pertanyaan ya/tidak biasa" }, { id: 2, label: "Mengonfirmasi sebuah pernyataan" }, { id: 3, label: "Meminta maaf" }],
        correctOptionId: 2,
        explanation: "そうです = \"benar\" — mengonfirmasi pernyataan/dugaan lawan bicara.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk いいえ, dalam romaji.",
        options: [{ id: 1, label: "いいえ" }],
        correctOptionId: 1,
        explanation: "いいえ dibaca persis seperti tertulis: iie.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Understanding ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Menyatakan paham/tidak paham",
          paragraphs: [
            "わかりました (wakarimashita) = \"saya mengerti\" — respons setelah menerima penjelasan. わかりません (wakarimasen) = \"saya tidak mengerti\".",
            "もう一度お願いします (review dari Fase 2) = \"tolong sekali lagi\" — dipakai kalau Anda tidak paham dan ingin penjelasan diulang.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "わかりません artinya...",
        options: [{ id: 1, label: "Saya mengerti" }, { id: 2, label: "Saya tidak mengerti" }, { id: 3, label: "Tolong ulangi" }],
        correctOptionId: 2,
        explanation: "わかりません = \"saya tidak mengerti.\"",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Simple Agreement ════════
    await insertBlocks("L03", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Persetujuan sederhana",
          paragraphs: [
            "そうですね (sou desu ne) = \"benar, ya\" — setuju dengan nada ramah, sering dipakai sambil berpikir sejenak. いいですね (ii desu ne) = \"bagus, ya\" — menyetujui sebuah ide/usulan.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Teman mengusulkan pergi makan bersama. Respons setuju yang wajar...",
        options: [{ id: 1, label: "いいですね" }, { id: 2, label: "わかりません" }, { id: 3, label: "そうではありません" }],
        correctOptionId: 1,
        explanation: "いいですね = \"bagus, ya\" — cocok untuk menyetujui usulan.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Simple Hesitation / Response ════════
    await insertBlocks("L04", [
      {
        blockType: "text",
        narrationText:
          "ちょっと... adalah salah satu cara Jepang menolak dengan halus — jarang orang Jepang menolak langsung dengan いいえ dalam situasi sosial, ちょっと... yang menggantung di ujung kalimat sudah cukup menyampaikan keraguan atau penolakan sopan.",
        content: {
          kind: "paragraphs",
          heading: "Respons ragu-ragu",
          paragraphs: [
            "ちょっと... (chotto...) = \"agak...\" — dibiarkan menggantung, sering berarti penolakan halus tanpa menyebut alasan secara langsung.",
            "そうですか (sou desu ka) = \"oh begitu ya\" — respons netral menerima informasi baru. ええ (ee) = \"ya\" versi lebih santai dari はい.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "important",
          body: "ちょっと... yang dibiarkan menggantung adalah cara SOPAN menolak di budaya Jepang — jauh lebih umum daripada menolak langsung dengan いいえ.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "ちょっと... yang dibiarkan menggantung di akhir kalimat biasanya berarti...",
        options: [{ id: 1, label: "Setuju penuh" }, { id: 2, label: "Penolakan halus" }, { id: 3, label: "Pertanyaan" }],
        correctOptionId: 2,
        explanation: "ちょっと... adalah cara sopan menolak tanpa menyebut alasan langsung.",
        audioUrl: null,
      },
    ]);

    // ════════ L05 — Conversation Control Lab ════════
    await insertBlocks("L05", [
      {
        blockType: "dialogue",
        content: {
          openingKana: "明日、パーティーがあります。来ますか。",
          prompt: "Anda diundang ke pesta tapi tidak bisa datang. Bagaimana Anda merespons dengan sopan?",
          choices: [
            { id: "a", kana: "ちょっと…", correct: true },
            { id: "b", kana: "いいですね！", correct: false },
            { id: "c", kana: "はじめまして。", correct: false },
          ],
          followUpKana: "そうですか。わかりました。",
          followUpNarrative: "Lawan bicara mengerti tanpa memaksa Anda menjelaskan alasan.",
          closingNote: "ちょっと... cukup untuk menyampaikan Anda tidak bisa datang, tanpa terasa kasar.",
        } satisfies DialogueBlockContent,
      },
    ]);

    await insertExercises("L05", [
      {
        exerciseType: "concept_mcq",
        prompt: "Kalau seseorang menjelaskan sesuatu dan Anda paham, respons yang tepat...",
        options: [{ id: 1, label: "わかりました" }, { id: 2, label: "わかりません" }, { id: 3, label: "ちょっと…" }],
        correctOptionId: 1,
        explanation: "わかりました = \"saya mengerti\" — respons setelah paham penjelasan.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalau Anda tidak paham dan ingin penjelasan diulang, kalimat yang tepat...",
        options: [{ id: 1, label: "わかりません。もう一度お願いします。" }, { id: 2, label: "いいですね。" }, { id: 3, label: "そうです。" }],
        correctOptionId: 1,
        explanation: "わかりません (tidak mengerti) + もう一度お願いします (tolong sekali lagi) — kombinasi natural.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M05 Fase 4 (P4) id=${phase.id}: 5 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m05-phase4 gagal:", error);
  process.exit(1);
});
