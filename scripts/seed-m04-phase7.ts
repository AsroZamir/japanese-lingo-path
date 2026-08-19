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

// Sumber konten: docs/pre n5 modul 4.txt Fase 7 — gabungan semua yang
// sudah diajarkan Fase 1-6 (angka, waktu, tanggal, harga, info pribadi)
// dalam konteks "dunia nyata": profil, jadwal, label harga.

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
        code: "P7",
        titleId: "Integrated Information Lab",
        orderIndex: 7,
        descriptionId: "Menggabungkan angka, waktu, tanggal, harga, dan info pribadi dalam konteks dunia nyata.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Read Information", lessonType: "orientation_practice", orderIndex: 1, romajiPolicy: "on_demand" as const },
      { code: "L02", titleId: "Listen for Information", lessonType: "orientation_practice", orderIndex: 2, romajiPolicy: "hidden" as const },
      { code: "L03", titleId: "Fill in the Information", lessonType: "orientation_practice", orderIndex: 3, romajiPolicy: "hidden" as const },
      { code: "L04", titleId: "Real-life Mini Simulation", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "always" as const },
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

    // ════════ L01 — Read Information ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "Ini titik di mana semua yang Anda pelajari sejauh ini bertemu dalam satu potongan teks nyata — bukan lagi diuji satu-satu, tapi digabung seperti yang benar-benar Anda temui: kartu profil, jadwal, label harga.",
        content: {
          kind: "paragraphs",
          heading: "Membaca kartu informasi",
          paragraphs: [
            "Kartu profil sederhana biasanya menggabungkan nama, umur, kewarganegaraan, dan status dalam beberapa baris pendek — semua pola yang sudah Anda kuasai satu per satu di Fase 1-6.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Contoh kartu profil",
          columns: ["Baris", "Isi"],
          rows: [
            ["名前", "アスロ"],
            ["国", "インドネシア"],
            ["歳", "二十五歳"],
            ["仕事", "会社員"],
          ],
        } satisfies TableBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "Dari kartu profil di atas, orang ini berumur...",
        options: [{ id: 1, label: "20 tahun" }, { id: 2, label: "25 tahun" }, { id: 3, label: "15 tahun" }],
        correctOptionId: 2,
        explanation: "二十五歳 = nijuugo-sai = 25 tahun.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Menu bertuliskan コーヒー 三百円. Ini artinya kopi seharga...",
        options: [{ id: 1, label: "30 yen" }, { id: 2, label: "300 yen" }, { id: 3, label: "3.000 yen" }],
        correctOptionId: 2,
        explanation: "三百円 = sanbyaku-en = 300 yen.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Sebuah jadwal bertuliskan \"会議：三時半\". Rapat dimulai jam...",
        options: [{ id: 1, label: "3:00" }, { id: 2, label: "3:15" }, { id: 3, label: "3:30" }],
        correctOptionId: 3,
        explanation: "三時半 = sanji-han = 3:30.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Listen for Information ════════
    await insertBlocks("L02", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Mendengar informasi",
          paragraphs: [
            "Lesson ini melatih menangkap detail spesifik dari kalimat yang didengar — nama, umur, jam, tanggal, harga, jumlah — tanpa perlu memahami setiap kata dalam kalimat.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat: 私は二十三歳です。 Berapa umur pembicara?",
        options: [{ id: 1, label: "13" }, { id: 2, label: "23" }, { id: 3, label: "33" }],
        correctOptionId: 2,
        explanation: "二十三歳 = nijuusan-sai = 23 tahun.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat: これは五百円です。 Berapa harganya?",
        options: [{ id: 1, label: "50 yen" }, { id: 2, label: "500 yen" }, { id: 3, label: "5.000 yen" }],
        correctOptionId: 2,
        explanation: "五百円 = gohyaku-en = 500 yen.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat: 今日は月曜日です。 Hari apa hari ini?",
        options: [{ id: 1, label: "Minggu" }, { id: 2, label: "Senin" }, { id: 3, label: "Sabtu" }],
        correctOptionId: 2,
        explanation: "月曜日 = getsuyoubi = Senin.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Fill in the Information ════════
    await insertExercises("L03", [
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 名前 (nama), dalam romaji.",
        options: [{ id: 1, label: "なまえ" }],
        correctOptionId: 1,
        explanation: "名前 dibaca \"namae\".",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 二十歳 (umur 20 tahun), dalam romaji.",
        options: [{ id: 1, label: "はたち" }],
        correctOptionId: 1,
        explanation: "二十歳 dibaca \"hatachi\" — review dari Fase 2.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 千円 (1.000 yen), dalam romaji.",
        options: [{ id: 1, label: "せんえん" }],
        correctOptionId: 1,
        explanation: "千円 dibaca \"sen-en\" — review dari Fase 3.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat yang benar untuk \"Saya orang Jepang\" adalah...",
        options: [{ id: 1, label: "日本人です。" }, { id: 2, label: "日本語です。" }, { id: 3, label: "日本です。" }],
        correctOptionId: 1,
        explanation: "日本人です = \"saya orang Jepang.\" (日本語 artinya \"bahasa Jepang\", bukan kewarganegaraan.)",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Real-life Mini Simulation ════════
    await insertBlocks("L04", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "dialogue",
        content: {
          openingKana: "すみません、これはいくらですか。",
          prompt: "Anda petugas toko. Pembeli menanyakan harga barang seharga 800 yen. Bagaimana Anda menjawab?",
          choices: [
            { id: "a", kana: "八百円です。", correct: true },
            { id: "b", kana: "八時です。", correct: false },
            { id: "c", kana: "八歳です。", correct: false },
          ],
          followUpKana: "わかりました。ありがとうございます。",
          followUpNarrative: "Pembeli mengerti dan berterima kasih.",
          closingNote: "八百円です (happyaku-en desu) = \"800 yen.\" — menggabungkan angka Fase 1 dengan pola harga Fase 3.",
        } satisfies DialogueBlockContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "Anda ingin tahu jam berapa sekarang. Kalimat yang tepat...",
        options: [{ id: 1, label: "今何時ですか。" }, { id: 2, label: "何歳ですか。" }, { id: 3, label: "いくらですか。" }],
        correctOptionId: 1,
        explanation: "今何時ですか = \"sekarang jam berapa?\"",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Seseorang bertanya お名前は何ですか kepada Anda. Respons yang tepat...",
        options: [{ id: 1, label: "[Nama Anda]です。" }, { id: 2, label: "はじめまして。" }, { id: 3, label: "ありがとう。" }],
        correctOptionId: 1,
        explanation: "お名前は何ですか (siapa nama Anda?) dijawab dengan nama + です.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M04 Fase 7 (P7) id=${phase.id}: 4 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m04-phase7 gagal:", error);
  process.exit(1);
});
