import { sql, inArray } from "drizzle-orm";
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

// Sumber konten: docs/pre n5 modul 5.txt Fase 1. M05 modul baru — dibuat
// di sini (sebelumnya belum ada). Pola sama dengan M04: hampir seluruh
// lesson naratif lewat M01LessonView (lesson_content_blocks +
// lesson_exercises), karena tidak ada karakter kana untuk didrill.

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
    const [module_] = await db
      .insert(kanaModules)
      .values({
        code: "M05",
        titleId: "Sapaan & Bahasa Jepang Sosial",
        titleEn: "Greetings & Social Japanese",
        descriptionId: "Menyapa, memperkenalkan diri, berterima kasih, meminta maaf, dan berinteraksi sosial dasar.",
        orderIndex: 5,
      })
      .onConflictDoUpdate({
        target: kanaModules.code,
        set: { titleId: sql`excluded.title_id`, titleEn: sql`excluded.title_en`, descriptionId: sql`excluded.description_id`, orderIndex: sql`excluded.order_index` },
      })
      .returning({ id: kanaModules.id });

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P1",
        titleId: "Japanese Social Basics",
        orderIndex: 1,
        descriptionId: "Kenapa sapaan penting, sapaan dasar, sapaan sesuai konteks.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Why Greetings Matter", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Basic Greetings", lessonType: "orientation", orderIndex: 2, romajiPolicy: "always" as const },
      { code: "L03", titleId: "Greeting in Context", lessonType: "orientation", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Greeting Mini Mastery", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Why Greetings Matter ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "Di Jepang, sapaan bukan sekadar formalitas kosong — melewatkannya bisa terasa sangat kasar, bahkan di situasi santai. Modul ini akan membekali Anda dengan sapaan yang tepat untuk hampir semua situasi sosial dasar yang akan Anda temui.",
        content: {
          kind: "paragraphs",
          heading: "Kenapa sapaan penting",
          paragraphs: [
            "Di banyak budaya, sapaan bisa dilewatkan tanpa masalah besar. Di Jepang, sapaan adalah bagian INTI dari interaksi sosial — melewatkannya, bahkan di situasi paling santai, bisa terasa kasar atau aneh.",
            "Ada dua tingkat: santai (dipakai ke teman dekat, keluarga) dan sopan (dipakai ke orang baru, atasan, orang lebih tua). Modul ini akan menunjukkan keduanya, dan kapan masing-masing dipakai.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Sapaan Jepang juga berubah sesuai WAKTU — pagi, siang, malam, dan sebelum tidur masing-masing punya sapaannya sendiri. Ini akan Anda pelajari di lesson berikutnya.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "Di Jepang, melewatkan sapaan bahkan di situasi santai...",
        options: [{ id: 1, label: "Tidak masalah sama sekali" }, { id: 2, label: "Bisa terasa kasar atau aneh" }, { id: 3, label: "Hanya masalah di acara resmi" }],
        correctOptionId: 2,
        explanation: "Sapaan adalah bagian inti interaksi sosial Jepang — melewatkannya bisa terasa kasar, bahkan di situasi santai.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Dua tingkat kesopanan yang akan Anda pelajari adalah...",
        options: [{ id: 1, label: "Formal dan informal saja" }, { id: 2, label: "Santai dan sopan" }, { id: 3, label: "Tidak ada tingkat, semua sama" }],
        correctOptionId: 2,
        explanation: "Santai (teman/keluarga) dan sopan (orang baru/atasan) — dua tingkat yang akan terus muncul sepanjang modul ini.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Basic Greetings ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        narrationText:
          "Perhatikan polanya: hampir setiap sapaan punya versi santai dan versi sopan, dan bedanya seringkali cuma penambahan ございます di ujung. Begitu Anda hafal pola ini, separuh sapaan Jepang jadi jauh lebih mudah diingat.",
        content: {
          kind: "paragraphs",
          heading: "Enam sapaan dasar",
          paragraphs: [
            "Sapaan Jepang berubah sesuai waktu hari, dan sebagian besar punya pasangan santai/sopan.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Sapaan berdasarkan waktu",
          columns: ["Waktu", "Santai", "Sopan"],
          rows: [
            ["Pagi", "おはよう (ohayou)", "おはようございます (ohayou gozaimasu)"],
            ["Siang/sore", "こんにちは (konnichiwa)", "— (sama untuk keduanya)"],
            ["Malam", "こんばんは (konbanwa)", "— (sama untuk keduanya)"],
            ["Sebelum tidur", "おやすみ (oyasumi)", "おやすみなさい (oyasuminasai)"],
          ],
        } satisfies TableBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "こんにちは dan こんばんは TIDAK punya versi lebih sopan lagi — sudah cukup netral dipakai ke siapa saja. Cuma おはよう dan おやすみ yang punya pasangan santai/sopan.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "Versi sopan dari おはよう adalah...",
        options: [{ id: 1, label: "おはようございます" }, { id: 2, label: "こんにちは" }, { id: 3, label: "おやすみなさい" }],
        correctOptionId: 1,
        explanation: "おはようございます = versi sopan dari おはよう (selamat pagi).",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "こんばんは dipakai untuk menyapa waktu...",
        options: [{ id: 1, label: "Pagi" }, { id: 2, label: "Siang" }, { id: 3, label: "Malam" }],
        correctOptionId: 3,
        explanation: "こんばんは (konbanwa) = sapaan malam.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk おやすみなさい (versi sopan, sebelum tidur), dalam romaji.",
        options: [{ id: 1, label: "おやすみなさい" }],
        correctOptionId: 1,
        explanation: "おやすみなさい dibaca persis seperti tertulis: oyasuminasai.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Greeting in Context ════════
    await insertBlocks("L03", [
      {
        blockType: "text",
        narrationText:
          "Lima situasi ini akan sering Anda temui: di rumah, sekolah, kerja, dengan teman, dan saat bertemu orang baru pertama kali. Perhatikan bagaimana sapaan yang sama bisa dipakai di banyak situasi, tapi pertemuan PERTAMA selalu butuh frasa khusus yang akan Anda pelajari di Fase 3.",
        content: {
          kind: "paragraphs",
          heading: "Sapaan sesuai situasi",
          paragraphs: [
            "Rumah, sekolah, kerja, teman — semuanya bisa memakai sapaan waktu yang sudah Anda pelajari. Tapi PERTEMUAN PERTAMA dengan orang baru butuh frasa khusus (はじめまして) yang akan dibahas mendalam di Fase 3.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "dialogue",
        content: {
          openingKana: "おはようございます。",
          prompt: "Anda baru sampai di kantor pagi hari dan berpapasan dengan rekan kerja. Bagaimana Anda menyapa?",
          choices: [
            { id: "a", kana: "おはようございます。", correct: true },
            { id: "b", kana: "おやすみなさい。", correct: false },
            { id: "c", kana: "こんばんは。", correct: false },
          ],
          followUpKana: "おはようございます。今日もよろしくお願いします。",
          followUpNarrative: "Rekan kerja Anda menyapa balik dan menambahkan salam kerja sama untuk hari ini.",
          closingNote: "おはようございます adalah sapaan pagi yang sopan — cocok untuk konteks kerja/sekolah, bahkan dengan orang yang sudah Anda kenal.",
        } satisfies DialogueBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Saat bertemu orang baru pertama kali, sapaan waktu (おはよう dst.) saja...",
        options: [{ id: 1, label: "Sudah cukup" }, { id: 2, label: "Perlu ditambah frasa khusus はじめまして" }, { id: 3, label: "Tidak pernah dipakai" }],
        correctOptionId: 2,
        explanation: "Pertemuan pertama butuh はじめまして, dibahas mendalam di Fase 3 — sapaan waktu saja tidak cukup untuk konteks ini.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Sapaan yang tepat untuk berpapasan dengan rekan kerja siang hari...",
        options: [{ id: 1, label: "おはようございます" }, { id: 2, label: "こんにちは" }, { id: 3, label: "おやすみなさい" }],
        correctOptionId: 2,
        explanation: "こんにちは = sapaan siang/sore, cocok untuk konteks apapun termasuk kerja.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Greeting Mini Mastery ════════
    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "おはよう (tanpa ございます) cocok dipakai kepada...",
        options: [{ id: 1, label: "Atasan di kantor" }, { id: 2, label: "Teman dekat/keluarga" }, { id: 3, label: "Orang yang baru dikenal" }],
        correctOptionId: 2,
        explanation: "Bentuk santai (tanpa ございます) cocok untuk teman dekat dan keluarga.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk こんにちは, dalam romaji.",
        options: [{ id: 1, label: "こんにちは" }],
        correctOptionId: 1,
        explanation: "こんにちは dibaca persis seperti tertulis: konnichiwa.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Manakah sapaan yang TIDAK punya versi lebih sopan lagi?",
        options: [{ id: 1, label: "おはよう" }, { id: 2, label: "こんにちは" }, { id: 3, label: "おやすみ" }],
        correctOptionId: 2,
        explanation: "こんにちは dan こんばんは sudah netral, tidak punya pasangan santai/sopan seperti おはよう dan おやすみ.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Sapaan yang tepat sebelum tidur, versi sopan...",
        options: [{ id: 1, label: "おやすみ" }, { id: 2, label: "おやすみなさい" }, { id: 3, label: "こんばんは" }],
        correctOptionId: 2,
        explanation: "おやすみなさい = versi sopan dari おやすみ, dipakai sebelum tidur.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M05 id=${module_.id}, Fase 1 (P1) id=${phase.id}: 4 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m05-phase1 gagal:", error);
  process.exit(1);
});
