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
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 4.txt Fase 2. Sama pola dengan
// seed-m04-phase1.ts — naratif lewat M01LessonView, romaji dalam typing
// exercises HARUS hiragana (dibandingkan terhadap hasil konversi IME
// KanaTypingInput), bukan literal romaji — lihat catatan bug di commit
// Fase 1.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "table"; content: TableBlockContent; narrationText?: string }
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
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M04"));
    if (!module_) throw new Error("M04 belum ada — jalankan scripts/seed-m04-phase1.ts dulu.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P2",
        titleId: "Age, Counting & Basic Counters",
        orderIndex: 2,
        descriptionId: "Menyebut umur, menghitung benda, dan menghitung orang — tiga sistem penghitung dasar.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Age", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Counting Objects", lessonType: "orientation", orderIndex: 2, romajiPolicy: "always" as const },
      { code: "L03", titleId: "Counting People", lessonType: "orientation", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Counter Mini Mastery", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Age ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "何歳ですか artinya 'umur berapa'. Cara jawabnya sederhana — angka yang sudah Anda kuasai, ditambah ～歳 di belakangnya. Tapi ada beberapa angka yang bacanya berubah bentuk saat ditempel 歳, dan satu yang benar-benar tidak mengikuti pola sama sekali.",
        content: {
          kind: "paragraphs",
          heading: "Menyebut umur",
          paragraphs: [
            "何歳ですか (nan-sai desu ka) artinya \"umur berapa?\". Jawabannya: angka + ～歳 (sai), penanda umur.",
            "Sebagian besar angka digabung apa adanya: 三歳 (san-sai) = 3 tahun, 五歳 (go-sai) = 5 tahun. Tapi beberapa berubah bentuk: 一歳 jadi \"issai\" (bukan \"ichisai\"), 八歳 jadi \"hassai\", 十歳 jadi \"jussai\".",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "important",
          body: "20 tahun adalah PENGECUALIAN TOTAL: bukan \"nijussai\" mengikuti pola, tapi 二十歳 dibaca \"hatachi\" — kata yang sama sekali berbeda. Ini angka umur yang paling sering salah diucapkan pemula, jadi hafalkan khusus.",
        } satisfies CalloutBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Contoh umur",
          columns: ["Umur", "Tulisan", "Bacaan"],
          rows: [
            ["3 tahun", "三歳", "san-sai"],
            ["5 tahun", "五歳", "go-sai"],
            ["18 tahun", "十八歳", "juuhassai"],
            ["20 tahun", "二十歳", "hatachi (BUKAN nijussai)"],
          ],
        } satisfies TableBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "二十歳 (20 tahun) dibaca...",
        options: [{ id: 1, label: "nijussai" }, { id: 2, label: "hatachi" }, { id: 3, label: "nijuusai" }],
        correctOptionId: 2,
        explanation: "20 tahun adalah pengecualian total — 二十歳 dibaca \"hatachi\", bukan mengikuti pola angka+sai biasa.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "一歳 (1 tahun) dibaca...",
        options: [{ id: 1, label: "ichisai" }, { id: 2, label: "issai" }, { id: 3, label: "hitosai" }],
        correctOptionId: 2,
        explanation: "一歳 berubah bentuk jadi \"issai\", bukan \"ichisai\".",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik jawaban untuk \"何歳ですか\" kalau umur Anda 8 tahun (dalam romaji, cuma bacaannya).",
        options: [{ id: 1, label: "はっさい" }],
        correctOptionId: 1,
        explanation: "八歳 dibaca \"hassai\" — bukan \"hachisai\".",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Counting Objects ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        narrationText:
          "Ini penghitung paling serbaguna dalam bahasa Jepang — bisa dipakai untuk hampir semua benda, tanpa perlu tahu kategori bendanya (beda dengan penghitung lain yang lebih spesifik). Tapi bacaannya sendiri, dari satu sampai sepuluh, adalah rangkaian kata yang harus dihafal apa adanya — tidak mengikuti pola angka biasa sama sekali.",
        content: {
          kind: "paragraphs",
          heading: "Menghitung benda: ～つ",
          paragraphs: [
            "Penghitung ～つ dipakai untuk benda secara umum — buah, barang, apa saja — tanpa perlu tahu kategorinya. Ini yang paling serbaguna, jadi paling penting dikuasai dulu.",
            "Bacaannya SENDIRI, bukan angka biasa + つ: 一つ (hitotsu), 二つ (futatsu), 三つ (mittsu) — rangkaian kata tersendiri yang perlu dihafal apa adanya, bukan sekadar pola sambung seperti angka murni.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "1-10 dengan ～つ",
          columns: ["Jumlah", "Tulisan", "Bacaan"],
          rows: [
            ["1", "一つ", "hitotsu"],
            ["2", "二つ", "futatsu"],
            ["3", "三つ", "mittsu"],
            ["4", "四つ", "yottsu"],
            ["5", "五つ", "itsutsu"],
            ["6", "六つ", "muttsu"],
            ["7", "七つ", "nanatsu"],
            ["8", "八つ", "yattsu"],
            ["9", "九つ", "kokonotsu"],
            ["10", "十", "too (bukan juttsu)"],
          ],
        } satisfies TableBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Pola ini berhenti di 10 — untuk 11 ke atas, kembali pakai angka biasa + つ jarang dipakai; dalam praktik sehari-hari, jarang perlu menghitung benda lepas lebih dari 10 pakai ～つ.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "三つ (3 benda) dibaca...",
        options: [{ id: 1, label: "santsu" }, { id: 2, label: "mittsu" }, { id: 3, label: "sanko" }],
        correctOptionId: 2,
        explanation: "三つ dibaca \"mittsu\" — rangkaian kata tersendiri, bukan san+tsu.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 七つ (7 benda), dalam romaji.",
        options: [{ id: 1, label: "ななつ" }],
        correctOptionId: 1,
        explanation: "七つ dibaca \"nanatsu\".",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "10 benda dibaca...",
        options: [{ id: 1, label: "juttsu" }, { id: 2, label: "too" }, { id: 3, label: "toosai" }],
        correctOptionId: 2,
        explanation: "十 (10 benda) dibaca \"too\" — pengecualian, bukan mengikuti pola ～つ.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Counting People ════════
    await insertBlocks("L03", [
      {
        blockType: "text",
        narrationText:
          "Kabar baiknya, penghitung orang lebih mudah dari ～つ — cuma dua bacaan pertama yang benar-benar tidak beraturan. Setelah itu, polanya kembali teratur seperti angka biasa ditambah 人.",
        content: {
          kind: "paragraphs",
          heading: "Menghitung orang: ～人",
          paragraphs: [
            "一人 (hitori, 1 orang) dan 二人 (futari, 2 orang) tidak beraturan — dua bacaan yang harus dihafal terpisah.",
            "Mulai 3 orang, polanya kembali teratur: 三人 (san-nin), 四人 (yo-nin — bukan \"yon-nin\"), lalu seterusnya angka + nin.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Contoh konteks",
          columns: ["Jumlah orang", "Tulisan", "Bacaan", "Konteks"],
          rows: [
            ["1", "一人", "hitori", "Keluarga, teman, kelas"],
            ["2", "二人", "futari", "Pasangan, dua sahabat"],
            ["3", "三人", "san-nin", "Kelompok kecil"],
            ["4", "四人", "yo-nin", "Keluarga inti"],
          ],
        } satisfies TableBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "二人 (2 orang) dibaca...",
        options: [{ id: 1, label: "ninin" }, { id: 2, label: "futari" }, { id: 3, label: "nijin" }],
        correctOptionId: 2,
        explanation: "二人 dibaca \"futari\" — tidak beraturan, sama seperti 一人 (hitori).",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 四人 (4 orang), dalam romaji.",
        options: [{ id: 1, label: "よにん" }],
        correctOptionId: 1,
        explanation: "四人 dibaca \"yo-nin\" — bukan \"yon-nin\".",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Counter Mini Mastery ════════
    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "何歳ですか artinya...",
        options: [{ id: 1, label: "Siapa nama Anda?" }, { id: 2, label: "Umur berapa?" }, { id: 3, label: "Dari mana asal Anda?" }],
        correctOptionId: 2,
        explanation: "何歳ですか (nan-sai desu ka) = \"umur berapa?\".",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Penghitung mana yang dipakai untuk benda secara umum?",
        options: [{ id: 1, label: "～歳" }, { id: 2, label: "～つ" }, { id: 3, label: "～人" }],
        correctOptionId: 2,
        explanation: "～つ dipakai untuk benda secara umum, tanpa perlu tahu kategorinya.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 一人 (1 orang), dalam romaji.",
        options: [{ id: 1, label: "ひとり" }],
        correctOptionId: 1,
        explanation: "一人 dibaca \"hitori\".",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "二十歳 (20 tahun) adalah pengecualian karena...",
        options: [{ id: 1, label: "Dibaca hatachi, sama sekali beda kata" }, { id: 2, label: "Tidak bisa dipakai untuk umur" }, { id: 3, label: "Cuma dipakai untuk benda" }],
        correctOptionId: 1,
        explanation: "20 tahun dibaca \"hatachi\" — kata yang sama sekali berbeda dari pola angka+sai biasa.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 五つ (5 benda), dalam romaji.",
        options: [{ id: 1, label: "いつつ" }],
        correctOptionId: 1,
        explanation: "五つ dibaca \"itsutsu\".",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M04 Fase 2 (P2) id=${phase.id}: 4 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m04-phase2 gagal:", error);
  process.exit(1);
});
