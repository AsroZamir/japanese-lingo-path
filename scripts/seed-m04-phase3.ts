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

// Sumber konten: docs/pre n5 modul 4.txt Fase 3. L03's ROLEPLAY dipakai
// via DialogueBlockContent yang sudah ada (satu giliran NPC -> pilihan
// -> tindak lanjut) — cukup untuk "tanya-jawab harga" satu putaran, tidak
// perlu mesin dialog bercabang baru. SPEAKING activities ditandai jujur
// lewat callout, bukan penilaian ucapan palsu.

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

const SPEAKING_NOTE: CalloutBlockContent = {
  kind: "tip",
  body: "Latihan bicara sungguhan (rekam & nilai pengucapan) belum tersedia di aplikasi ini. Dengarkan audio native, ucapkan mengikuti sesuai kemampuan Anda sendiri — bagian ini tidak dinilai otomatis.",
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
        code: "P3",
        titleId: "Money & Prices",
        orderIndex: 3,
        descriptionId: "Mata uang Jepang, membaca harga, dan bertanya harga.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Japanese Money", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Reading Prices", lessonType: "orientation", orderIndex: 2, romajiPolicy: "on_demand" as const },
      { code: "L03", titleId: "Asking Price", lessonType: "orientation", orderIndex: 3, romajiPolicy: "always" as const },
      { code: "L04", titleId: "Shopping Price Challenge", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Japanese Money ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "円 adalah satuan mata uang Jepang, ditulis setelah angka — persis kebalikan dari cara kita menulis \"Rp\" di depan angka. Begitu Anda tahu angkanya, membaca harga cuma soal menempelkan 円 di belakang, dengan sedikit penyesuaian bunyi yang sama seperti yang sudah Anda pelajari untuk umur dan penghitung.",
        content: {
          kind: "paragraphs",
          heading: "Mata uang Jepang: 円",
          paragraphs: [
            "円 (en) adalah satuan mata uang Jepang — ditulis SETELAH angka, kebalikan dari \"Rp1.000\" dalam bahasa Indonesia. 1.000 yen ditulis 千円, dibaca dari angkanya dulu baru satuannya.",
            "百円 (hyaku-en) = 100 yen, 千円 (sen-en) = 1.000 yen. Formatnya konsisten: angka yang sudah Anda kuasai, ditempel 円.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Contoh harga",
          columns: ["Harga", "Tulisan", "Bacaan"],
          rows: [
            ["100 yen", "百円", "hyaku-en"],
            ["1.000 yen", "千円", "sen-en"],
            ["4 yen", "四円", "yo-en (bukan yon-en)"],
          ],
        } satisfies TableBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Sama seperti 四人 (yo-nin) dan 四歳 (bukan yon-sai — walau ini justru teratur), 四円 dibaca \"yo-en\", bukan \"yon-en\". Pola \"yo\" muncul lagi di sini.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "円 ditulis...",
        options: [{ id: 1, label: "Sebelum angka, seperti \"Rp\"" }, { id: 2, label: "Setelah angka" }, { id: 3, label: "Terpisah dari angka" }],
        correctOptionId: 2,
        explanation: "円 ditulis setelah angka — 千円 (1.000 yen), bukan sebelum seperti \"Rp1.000\".",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 百円 (100 yen), dalam romaji.",
        options: [{ id: 1, label: "ひゃくえん" }],
        correctOptionId: 1,
        explanation: "百円 dibaca \"hyaku-en\".",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Reading Prices ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        narrationText:
          "Harga besar cuma menggabungkan satuan yang sudah Anda kuasai — 百 (100), 千 (1.000), 万 (10.000) — persis seperti Fase 1. Tidak ada yang baru di sini selain menempelkan 円 di ujungnya.",
        content: {
          kind: "paragraphs",
          heading: "Membaca harga besar",
          paragraphs: [
            "Harga yang lebih besar cuma menggabungkan satuan yang sudah Anda kuasai (百/千/万) dengan angka di depannya — sama seperti Fase 1, ditambah 円 di ujung.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Latihan membaca",
          columns: ["Harga", "Tulisan", "Bacaan"],
          rows: [
            ["500 yen", "五百円", "gohyaku-en"],
            ["1.000 yen", "千円", "sen-en"],
            ["2.500 yen", "二千五百円", "nisen gohyaku-en"],
          ],
        } satisfies TableBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 五百円 (500 yen), dalam romaji.",
        options: [{ id: 1, label: "ごひゃくえん" }],
        correctOptionId: 1,
        explanation: "五百円 dibaca \"gohyaku-en\".",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "二千五百円 artinya harga...",
        options: [{ id: 1, label: "250 yen" }, { id: 2, label: "2.500 yen" }, { id: 3, label: "25.000 yen" }],
        correctOptionId: 2,
        explanation: "二千五百円 = 二千 (2.000) + 五百 (500) + 円 = 2.500 yen.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 千円 (1.000 yen), dalam romaji.",
        options: [{ id: 1, label: "せんえん" }],
        correctOptionId: 1,
        explanation: "千円 dibaca \"sen-en\".",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Asking Price ════════
    await insertBlocks("L03", [
      {
        blockType: "text",
        narrationText:
          "Ini pola tanya-jawab paling praktis untuk belanja: いくらですか untuk bertanya harga, dan ～円です untuk menjawabnya. これ (ini) ditambahkan di depan kalau Anda menunjuk barang tertentu.",
        content: {
          kind: "paragraphs",
          heading: "Bertanya harga",
          paragraphs: [
            "いくらですか (ikura desu ka) = \"berapa harganya?\". これはいくらですか (kore wa ikura desu ka) = \"ini berapa harganya?\" — dipakai sambil menunjuk barang.",
            "Jawabannya sederhana: harga + ～円です. Contoh: 五百円です (gohyaku-en desu) = \"500 yen.\"",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "callout",
        content: SPEAKING_NOTE,
      },
      {
        blockType: "dialogue",
        content: {
          openingKana: "いらっしゃいませ。何をお探しですか。",
          prompt: "Anda menunjuk sebuah barang dan ingin tahu harganya. Apa yang Anda katakan?",
          choices: [
            { id: "a", kana: "これはいくらですか。", correct: true },
            { id: "b", kana: "何歳ですか。", correct: false },
            { id: "c", kana: "お名前は何ですか。", correct: false },
          ],
          followUpKana: "これは五百円です。",
          followUpNarrative: "Petugas toko menjawab harganya.",
          closingNote: "五百円です = \"500 yen.\" — pola ～円です inilah yang akan sering Anda dengar sebagai jawaban.",
        } satisfies DialogueBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "これはいくらですか artinya...",
        options: [{ id: 1, label: "Ini apa?" }, { id: 2, label: "Ini berapa harganya?" }, { id: 3, label: "Ini punya siapa?" }],
        correctOptionId: 2,
        explanation: "これはいくらですか = \"ini berapa harganya?\".",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Cara menjawab harga 300 yen adalah...",
        options: [{ id: 1, label: "三百円です" }, { id: 2, label: "三百円ですか" }, { id: 3, label: "三百歳です" }],
        correctOptionId: 1,
        explanation: "三百円です (sanbyaku-en desu) = \"300 yen.\"",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Shopping Price Challenge ════════
    await insertBlocks("L04", [
      { blockType: "callout", content: SPEAKING_NOTE },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 三百円 (300 yen), dalam romaji.",
        options: [{ id: 1, label: "さんびゃくえん" }],
        correctOptionId: 1,
        explanation: "三百円 dibaca \"sanbyaku-en\" (300 mengalami perubahan bunyi hyaku->byaku).",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Menu bertuliskan コーヒー 四百円. Berapa harga kopinya?",
        options: [{ id: 1, label: "40 yen" }, { id: 2, label: "400 yen" }, { id: 3, label: "4.000 yen" }],
        correctOptionId: 2,
        explanation: "四百円 = yonhyaku-en = 400 yen.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Anda membeli barang 二百円 dan 三百円. Total harganya?",
        options: [{ id: 1, label: "四百円" }, { id: 2, label: "五百円" }, { id: 3, label: "六百円" }],
        correctOptionId: 2,
        explanation: "二百 (200) + 三百 (300) = 五百 (500) — 五百円.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Respons yang tepat untuk pertanyaan いくらですか adalah...",
        options: [{ id: 1, label: "はじめまして" }, { id: 2, label: "千円です" }, { id: 3, label: "ありがとう" }],
        correctOptionId: 2,
        explanation: "いくらですか (berapa harganya?) dijawab dengan harga + です.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M04 Fase 3 (P3) id=${phase.id}: 4 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m04-phase3 gagal:", error);
  process.exit(1);
});
