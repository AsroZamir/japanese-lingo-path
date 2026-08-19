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
  ChartBlockContent,
  TableBlockContent,
  AudioListBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// Sumber konten: docs/curriculum/M03.md ("Fase 1 — Orientasi Katakana").
// Pola sama persis dengan seed-m02-phase1.ts. Audio kata (コーヒー dst.)
// disengaja null — VOICEVOX belum aktif saat script ini ditulis; UI
// sudah menangani audioUrl null dengan baik (tombol nonaktif, aria-label
// jujur), jadi lesson tetap bisa di-seed sekarang dan bersuara belakangan
// begitu generate-audio-remaining-kana.ts dijalankan untuk katakana.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "chart"; content: ChartBlockContent; narrationText?: string }
  | { blockType: "table"; content: TableBlockContent; narrationText?: string }
  | { blockType: "audio_list"; content: AudioListBlockContent; narrationText?: string };

type ExerciseInput = {
  exerciseType: "concept_mcq";
  prompt: string;
  options: LessonExerciseOption[];
  correctOptionId: number;
  explanation: string;
  audioUrl: null;
};

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M03"));
    if (!module_) throw new Error("M03 belum ada — jalankan scripts/seed-katakana-groups.ts dulu.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P1",
        titleId: "Orientasi Katakana",
        orderIndex: 1,
        descriptionId: "Dua pelajaran pengenalan sebelum masuk ke kelompok huruf pertama.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Apa itu Katakana?", lessonType: "orientation", orderIndex: 1 },
      { code: "L02", titleId: "Cara Menulis Katakana", lessonType: "orientation", orderIndex: 2 },
    ];

    const lessonRows = await db
      .insert(kanaLessons)
      .values(LESSONS.map((l) => ({
        phaseId: phase.id, code: l.code, titleId: l.titleId, lessonType: l.lessonType,
        orderIndex: l.orderIndex, groupCode: null, romajiPolicy: "always" as const, targetThresholds: null,
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

    // ════════ L01 — Apa itu Katakana? ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "Kabar baiknya: Anda tidak belajar dari nol. Katakana punya bunyi yang sama persis dengan Hiragana yang baru saja Anda kuasai — か dan カ sama-sama dibaca \"ka\". Yang berubah cuma bentuknya. Jadi ini bukan 46 bunyi baru untuk dihafal, cuma 46 bentuk baru untuk bunyi yang sudah Anda kenal.",
        content: {
          kind: "paragraphs",
          heading: "Apa itu Katakana?",
          paragraphs: [
            "Katakana adalah sistem tulisan kedua yang akan Anda kuasai — bentuknya kaku dan bersudut, kebalikan dari Hiragana yang bulat mengalir. Fungsi utamanya: menuliskan kata serapan dari bahasa asing, nama orang/tempat di luar Jepang, dan kadang untuk penekanan (mirip huruf miring/kapital di bahasa Indonesia).",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Hiragana vs Katakana",
          columns: ["", "Hiragana", "Katakana"],
          rows: [
            ["Bentuk", "Bulat, mengalir", "Kaku, bersudut"],
            ["Dipakai untuk", "Kata asli Jepang, tata bahasa", "Kata serapan asing, nama asing, penekanan"],
            ["Bunyi", "—", "Sama persis dengan Hiragana"],
          ],
        } satisfies TableBlockContent,
      },
      {
        blockType: "text",
        narrationText:
          "Begitu Anda mulai memperhatikan, Katakana muncul di mana-mana — menu restoran, iklan, kemasan produk. Kalau Anda pernah melihat tulisan Jepang dengan bentuk huruf yang kaku dan tajam di antara huruf-huruf yang bulat, itu Katakana, dan hampir selalu menandai sesuatu yang berasal dari luar Jepang.",
        content: {
          kind: "paragraphs",
          heading: "Kapan Katakana dipakai?",
          paragraphs: [
            "Tiga situasi utama: (1) kata serapan dari bahasa asing — kopi jadi コーヒー, (2) nama orang/tempat di luar Jepang — Indonesia jadi インドネシア, (3) efek suara atau penekanan dalam tulisan santai/manga.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "chart",
        narrationText:
          "Perhatikan bentuknya — kaku dan bersudut, beda jauh dari Hiragana. Klik huruf mana saja untuk mendengar bunyinya. Bunyinya sama persis dengan Hiragana yang sudah Anda kenal, jadi telinga Anda sebenarnya sudah siap — tinggal mata yang perlu membiasakan diri dengan bentuk barunya.",
        content: {
          script: "katakana",
          mode: "dimmed-preview",
          heading: "Peta 46 Katakana Dasar",
          paragraphs: [
            "Perhatikan bentuknya — kaku dan bersudut, beda jauh dari Hiragana. Klik huruf mana saja untuk mendengar bunyinya (bunyinya sama persis dengan Hiragana yang sudah Anda kenal).",
          ],
        } satisfies ChartBlockContent,
      },
      {
        blockType: "audio_list",
        narrationText:
          "Coba baca keempatnya. Anda mungkin sudah mengenali bunyinya bahkan sebelum tahu artinya — itu karena semuanya kata serapan dari bahasa Inggris, cuma dibaca dengan gaya Jepang.",
        content: {
          heading: "Kata-kata yang mungkin sudah Anda kenali",
          items: [
            { kana: "コーヒー", romaji: "koohii", meaning: "kopi", audioUrl: null },
            { kana: "ホテル", romaji: "hoteru", meaning: "hotel", audioUrl: null },
            { kana: "テレビ", romaji: "terebi", meaning: "televisi", audioUrl: null },
            { kana: "バス", romaji: "basu", meaning: "bus", audioUrl: null },
          ],
        } satisfies AudioListBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "Katakana paling sering dipakai untuk...",
        options: [
          { id: 1, label: "Tata bahasa dan kata asli Jepang" },
          { id: 2, label: "Kata serapan asing dan nama asing" },
          { id: 3, label: "Menggantikan Kanji yang sulit" },
        ],
        correctOptionId: 2,
        explanation: "Katakana adalah \"sinyal\" bahwa sebuah kata berasal dari luar Jepang — kata serapan, nama asing, atau penekanan.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Bunyi karakter Katakana dibandingkan Hiragana yang setara...",
        options: [
          { id: 1, label: "Sama persis" },
          { id: 2, label: "Mirip tapi tidak sama" },
          { id: 3, label: "Selalu berbeda" },
        ],
        correctOptionId: 1,
        explanation: "か dan カ sama-sama \"ka\". Anda tidak belajar bunyi baru — cuma bentuk baru untuk bunyi yang sudah dikenal.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "コーヒー adalah kata serapan dari bahasa Inggris untuk...",
        options: [
          { id: 1, label: "Teh" },
          { id: 2, label: "Kopi" },
          { id: 3, label: "Susu" },
        ],
        correctOptionId: 2,
        explanation: "コーヒー (koohii) diserap dari kata Inggris \"coffee\".",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Cara Menulis Katakana ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        narrationText:
          "Urutan coretan tetap penting sama seperti di Hiragana — arahnya juga sama, dari atas ke bawah, kiri ke kanan. Yang beda cuma bentuk akhirnya.",
        content: {
          kind: "paragraphs",
          heading: "Sebelum mulai menulis: konsep dasarnya",
          paragraphs: [
            "Setiap huruf Katakana juga punya urutan coretan yang baku, sama pentingnya seperti di Hiragana. Aturan arah menulis tetap sama: **dari atas ke bawah, dari kiri ke kanan**.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "text",
        narrationText:
          "Karena Katakana didominasi garis lurus dan sudut tajam — bukan lengkungan lembut seperti Hiragana — banyak pembelajar justru merasa gerakan tangannya lebih cepat terbiasa, meski bentuknya terlihat lebih rumit di awal.",
        content: {
          kind: "paragraphs",
          heading: "Bentuknya beda, prinsipnya sama",
          paragraphs: [
            "Katakana didominasi garis lurus dan sudut tajam, sementara Hiragana didominasi lengkungan. Ini kadang membuat Katakana lebih cepat dikuasai secara motorik, meski bentuknya terlihat lebih \"kaku\" dibanding Hiragana.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "chart",
        narrationText:
          "Coba beberapa huruf yang berbeda bentuknya — perhatikan bagaimana animasinya bergerak dalam garis-garis lurus dan sudut tajam, berbeda dari lengkungan Hiragana yang sudah Anda lihat sebelumnya.",
        content: {
          script: "katakana",
          mode: "dimmed-preview",
          heading: "Coba lihat urutannya sendiri",
          paragraphs: [
            "Arahkan kursor ke huruf mana saja di bawah ini (atau tekan-tahan di layar sentuh) untuk memutar animasi urutan coretannya secara langsung.",
          ],
        } satisfies ChartBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "steps",
          heading: "Yang akan terjadi selanjutnya",
          leadParagraphs: ["Mulai kelompok berikutnya, pola belajar tiap huruf akan selalu sama:"],
          steps: [
            { title: "Kenali — lihat bentuknya, dengar bunyinya" },
            { title: "Tulis — jiplak dulu mengikuti kanvas berpetak, baru coba mandiri" },
            { title: "Kenali ulang — uji supaya tidak tertukar huruf mirip, atau dengan Hiragana" },
            { title: "Uji kelompok — pastikan lima huruf ini benar-benar melekat sebelum lanjut" },
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "Arah umum menulis Katakana adalah...",
        options: [
          { id: 1, label: "Dari atas ke bawah, kiri ke kanan" },
          { id: 2, label: "Dari kanan ke kiri" },
          { id: 3, label: "Tidak ada aturan arah tertentu" },
        ],
        correctOptionId: 1,
        explanation: "Sama seperti Hiragana — dari atas ke bawah dan kiri ke kanan.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Perbedaan visual utama Katakana dibanding Hiragana adalah...",
        options: [
          { id: 1, label: "Katakana didominasi garis lurus dan sudut tajam" },
          { id: 2, label: "Katakana didominasi lengkungan lembut" },
          { id: 3, label: "Tidak ada perbedaan visual" },
        ],
        correctOptionId: 1,
        explanation: "Katakana kaku dan bersudut; Hiragana bulat dan mengalir.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Setiap huruf Katakana idealnya muat di dalam...",
        options: [
          { id: 1, label: "Ruang bebas tanpa batas" },
          { id: 2, label: "Kotak persegi berukuran sama" },
          { id: 3, label: "Garis lurus horizontal saja" },
        ],
        correctOptionId: 2,
        explanation: "Sama seperti Hiragana — bayangkan kotak berpetak yang membagi ruang secara seimbang.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M03 Fase 1 (P1) id=${phase.id}: 2 lesson, ${lessonIds.length} lesson id disiapkan.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m03-phase1 gagal:", error);
  process.exit(1);
});
