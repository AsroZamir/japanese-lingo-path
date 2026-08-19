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
  AudioListBlockContent,
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// Sumber konten: docs/curriculum/M04.md ("Fase 1 — Number Foundation").
// M04 bukan drill kana — hampir seluruh lesson naratif lewat
// lesson_content_blocks/lesson_exercises (jalur M01LessonView yang sama
// dipakai M01 dan tiap lesson orientasi M02/M03). Audio sengaja null —
// VOICEVOX belum aktif saat script ini ditulis, sama seperti M03.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "table"; content: TableBlockContent; narrationText?: string }
  | { blockType: "audio_list"; content: AudioListBlockContent; narrationText?: string }
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
        code: "M04",
        titleId: "Angka & Informasi Dasar",
        titleEn: "Numbers & Basic Information Mastery",
        descriptionId: "Membaca, mendengar, dan memakai angka, waktu, tanggal, harga, dan informasi pribadi sederhana.",
        orderIndex: 4,
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
        titleId: "Number Foundation",
        orderIndex: 1,
        descriptionId: "Angka 0-10, pola 11-100, dan satuan besar 100/1.000/10.000.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Meet Japanese Numbers", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Numbers 11-100", lessonType: "orientation", orderIndex: 2, romajiPolicy: "on_demand" as const },
      { code: "L03", titleId: "100, 1.000 & 10.000", lessonType: "orientation", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Number Master Check", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Meet Japanese Numbers ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "Kabar baik: angka Jepang jauh lebih teratur daripada kelihatannya. Begitu Anda hafal 0 sampai 10, sebagian besar angka lain tinggal pola pengulangan — bukan 100 kata baru untuk dihafal satu-satu.",
        content: {
          kind: "paragraphs",
          heading: "Angka Jepang, dari 0",
          paragraphs: [
            "Angka Jepang ditulis dengan Kanji, tapi cara bacanya jauh lebih teratur daripada terlihat. Begitu Anda kuasai 0 sampai 10, angka-angka setelahnya sebagian besar tinggal pola berulang, bukan hafalan baru.",
            "ゼロ (zero) lebih umum dipakai sehari-hari dibanding 〇 (rei), yang lebih formal/tertulis — misalnya di nomor telepon.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "audio_list",
        narrationText:
          "Dengarkan satu per satu. Perhatikan pola dasarnya dulu — sepuluh angka pertama ini adalah fondasi untuk SEMUA angka lain yang akan Anda pelajari, sampai jutaan sekalipun.",
        content: {
          heading: "0 – 10",
          items: [
            { kana: "ゼロ / 〇", romaji: "zero / rei", meaning: "0", audioUrl: null },
            { kana: "一", romaji: "ichi", meaning: "1", audioUrl: null },
            { kana: "二", romaji: "ni", meaning: "2", audioUrl: null },
            { kana: "三", romaji: "san", meaning: "3", audioUrl: null },
            { kana: "四", romaji: "yon", meaning: "4", audioUrl: null },
            { kana: "五", romaji: "go", meaning: "5", audioUrl: null },
            { kana: "六", romaji: "roku", meaning: "6", audioUrl: null },
            { kana: "七", romaji: "nana", meaning: "7", audioUrl: null },
            { kana: "八", romaji: "hachi", meaning: "8", audioUrl: null },
            { kana: "九", romaji: "kyuu", meaning: "9", audioUrl: null },
            { kana: "十", romaji: "juu", meaning: "10", audioUrl: null },
          ],
        } satisfies AudioListBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "四, 七, dan 九 masing-masing punya dua cara baca yang sama-sama umum (yon/shi, nana/shichi, kyuu/ku) — dipakai bergantian tergantung konteks. Belum perlu bingung memilih; cukup kenali keduanya dulu.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "五 dibaca...",
        options: [{ id: 1, label: "go" }, { id: 2, label: "roku" }, { id: 3, label: "yon" }],
        correctOptionId: 1,
        explanation: "五 = go = 5.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Angka 8 ditulis...",
        options: [{ id: 1, label: "七" }, { id: 2, label: "八" }, { id: 3, label: "九" }],
        correctOptionId: 2,
        explanation: "八 (hachi) = 8.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 十 (dalam romaji).",
        options: [{ id: 1, label: "じゅう" }],
        correctOptionId: 1,
        explanation: "十 dibaca \"juu\" = 10.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Numbers 11-100 ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        narrationText:
          "Ini pola yang membebaskan Anda dari menghafal 90 angka satu-satu. 十一 bukan kata baru — itu cuma 十 (10) ditempel 一 (1). Begitu polanya klik, seluruh angka sampai 99 sebenarnya sudah bisa Anda baca sendiri.",
        content: {
          kind: "paragraphs",
          heading: "Pola di balik 11-100",
          paragraphs: [
            "十一 (11) = 十 (10) + 一 (1), ditempel langsung tanpa kata sambung apapun. 二十 (20) = 二 (2) + 十 (10). 二十一 (21) = 二十 (20) + 一 (1).",
            "Pola ini konsisten sampai 九十九 (99). Puncaknya: 百 (hyaku) = 100, angka baru untuk kelipatan seratus.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Contoh polanya",
          columns: ["Angka", "Susunan", "Bacaan"],
          rows: [
            ["11", "十 + 一", "juuichi"],
            ["20", "二 + 十", "nijuu"],
            ["21", "二十 + 一", "nijuuichi"],
            ["45", "四十 + 五", "yonjuugo"],
            ["100", "百", "hyaku"],
          ],
        } satisfies TableBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "number-builder",
          heading: "Coba susun sendiri",
          instruction: "Pilih puluhan, lalu satuan — lihat angkanya tersusun langsung.",
          tensOptions: [
            { label: "—", kanji: "", romaji: "", value: 0 },
            { label: "10", kanji: "十", romaji: "juu", value: 10 },
            { label: "20", kanji: "二十", romaji: "nijuu", value: 20 },
            { label: "30", kanji: "三十", romaji: "sanjuu", value: 30 },
            { label: "40", kanji: "四十", romaji: "yonjuu", value: 40 },
            { label: "50", kanji: "五十", romaji: "gojuu", value: 50 },
            { label: "60", kanji: "六十", romaji: "rokujuu", value: 60 },
            { label: "70", kanji: "七十", romaji: "nanajuu", value: 70 },
            { label: "80", kanji: "八十", romaji: "hachijuu", value: 80 },
            { label: "90", kanji: "九十", romaji: "kyuujuu", value: 90 },
          ],
          onesOptions: [
            { label: "—", kanji: "", romaji: "", value: 0 },
            { label: "1", kanji: "一", romaji: "ichi", value: 1 },
            { label: "2", kanji: "二", romaji: "ni", value: 2 },
            { label: "3", kanji: "三", romaji: "san", value: 3 },
            { label: "4", kanji: "四", romaji: "yon", value: 4 },
            { label: "5", kanji: "五", romaji: "go", value: 5 },
            { label: "6", kanji: "六", romaji: "roku", value: 6 },
            { label: "7", kanji: "七", romaji: "nana", value: 7 },
            { label: "8", kanji: "八", romaji: "hachi", value: 8 },
            { label: "9", kanji: "九", romaji: "kyuu", value: 9 },
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "34 disusun dari...",
        options: [{ id: 1, label: "三十 + 四" }, { id: 2, label: "四十 + 三" }, { id: 3, label: "三 + 四十" }],
        correctOptionId: 1,
        explanation: "34 = 三十 (30) + 四 (4) = 三十四.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 二十一 (dalam romaji).",
        options: [{ id: 1, label: "にじゅういち" }],
        correctOptionId: 1,
        explanation: "二十一 = nijuu (20) + ichi (1) = nijuuichi.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "百 dibaca...",
        options: [{ id: 1, label: "juu" }, { id: 2, label: "hyaku" }, { id: 3, label: "sen" }],
        correctOptionId: 2,
        explanation: "百 (hyaku) = 100.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — 100, 1.000 & 10.000 ════════
    await insertBlocks("L03", [
      {
        blockType: "text",
        narrationText:
          "Ini titik yang sering mengejutkan pemula. Bahasa Indonesia melompat dari ribu ke puluh-ribu tanpa kata baru — cuma 'sepuluh ribu'. Jepang punya KATA BARU di setiap kelipatan 10.000: 万. Begitu Anda sampai ke angka besar, Anda akan menghitung dalam satuan 万, bukan satuan ribu seperti kebiasaan Anda.",
        content: {
          kind: "paragraphs",
          heading: "Satuan besar: 百, 千, 万",
          paragraphs: [
            "百 (hyaku) = 100, 千 (sen) = 1.000, 万 (man) = 10.000 — dipakai untuk harga, populasi, dan kuantitas dasar.",
            "Kejutan umum untuk pemula: 万 adalah satuan hitung besar yang TIDAK punya padanan langsung di sistem ribuan yang Anda kenal. Bahasa Indonesia melompat dari ribu ke puluh-ribu tanpa kata baru; Jepang punya kata baru di setiap kelipatan 10.000.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Konteks pemakaian",
          columns: ["Satuan", "Bacaan", "Konteks umum"],
          rows: [
            ["百 (100)", "hyaku", "Harga barang murah, jumlah kecil"],
            ["千 (1.000)", "sen", "Harga makanan/minuman sehari-hari"],
            ["万 (10.000)", "man", "Harga barang mahal, gaji, populasi kota"],
          ],
        } satisfies TableBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "千 dibaca...",
        options: [{ id: 1, label: "hyaku" }, { id: 2, label: "sen" }, { id: 3, label: "man" }],
        correctOptionId: 2,
        explanation: "千 (sen) = 1.000.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "万 mewakili kelipatan...",
        options: [{ id: 1, label: "1.000" }, { id: 2, label: "10.000" }, { id: 3, label: "100.000" }],
        correctOptionId: 2,
        explanation: "万 (man) = 10.000 — satuan hitung besar yang khas Jepang, tanpa padanan langsung di sistem ribuan.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Number Master Check ════════
    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "六 dibaca...",
        options: [{ id: 1, label: "roku" }, { id: 2, label: "go" }, { id: 3, label: "nana" }],
        correctOptionId: 1,
        explanation: "六 (roku) = 6.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 七十八 (dalam romaji).",
        options: [{ id: 1, label: "ななじゅうはち" }],
        correctOptionId: 1,
        explanation: "七十八 = nanajuu (70) + hachi (8) = nanajuuhachi.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Angka berapa yang dibaca \"gojuusan\"?",
        options: [{ id: 1, label: "35" }, { id: 2, label: "53" }, { id: 3, label: "58" }],
        correctOptionId: 2,
        explanation: "gojuusan = go+juu (50) + san (3) = 53.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "万 dipakai untuk kelipatan...",
        options: [{ id: 1, label: "1.000" }, { id: 2, label: "10.000" }, { id: 3, label: "100" }],
        correctOptionId: 2,
        explanation: "万 (man) = 10.000.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 九 (dalam romaji).",
        options: [{ id: 1, label: "きゅう" }],
        correctOptionId: 1,
        explanation: "九 dibaca \"kyuu\" = 9 (ku juga umum dipakai).",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M04 id=${module_.id}, Fase 1 (P1) id=${phase.id}: 4 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m04-phase1 gagal:", error);
  process.exit(1);
});
