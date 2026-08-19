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
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// Sumber konten: docs/curriculum/M02.md ("Fase 1 — Orientasi"). Baca ulang
// doc itu kalau ada yang tampak janggal di sini — script ini adalah
// terjemahan mekanis dari markdown ke baris DB, pola yang sama dengan
// scripts/seed-m01-content.ts.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "chart"; content: ChartBlockContent; narrationText?: string }
  | { blockType: "table"; content: TableBlockContent; narrationText?: string }
  | { blockType: "callout"; content: CalloutBlockContent; narrationText?: string };

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
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M02"));
    if (!module_) throw new Error("M02 belum ada — jalankan scripts/seed-hiragana-groups.ts dulu.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P1",
        titleId: "Orientasi Hiragana",
        orderIndex: 1,
        descriptionId: "Dua pelajaran pengenalan sebelum masuk ke kelompok huruf pertama.",
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

    const LESSONS = [
      { code: "L01", titleId: "Apa itu Hiragana?", lessonType: "orientation", orderIndex: 1 },
      { code: "L02", titleId: "Cara Menulis Hiragana", lessonType: "orientation", orderIndex: 2 },
    ];

    const lessonRows = await db
      .insert(kanaLessons)
      .values(
        LESSONS.map((l) => ({
          phaseId: phase.id,
          code: l.code,
          titleId: l.titleId,
          lessonType: l.lessonType,
          orderIndex: l.orderIndex,
          groupCode: null,
          romajiPolicy: "always" as const,
          targetThresholds: null,
        })),
      )
      .onConflictDoUpdate({
        target: [kanaLessons.phaseId, kanaLessons.code],
        set: {
          titleId: sql`excluded.title_id`,
          lessonType: sql`excluded.lesson_type`,
          orderIndex: sql`excluded.order_index`,
          romajiPolicy: sql`excluded.romaji_policy`,
        },
      })
      .returning({ id: kanaLessons.id, code: kanaLessons.code });

    const lessonIdByCode = new Map(lessonRows.map((l) => [l.code, l.id]));
    const lessonIds = [...lessonIdByCode.values()];

    // Idempotent lewat replace-penuh, sama seperti seed-m01-content.ts —
    // blok/soal tidak punya identitas alami untuk di-upsert baris-per-baris.
    await db.delete(lessonContentBlocks).where(inArray(lessonContentBlocks.lessonId, lessonIds));
    await db.delete(lessonExercises).where(inArray(lessonExercises.lessonId, lessonIds));

    async function insertBlocks(lessonCode: string, blocks: BlockInput[]) {
      const lessonId = lessonIdByCode.get(lessonCode)!;
      await db.insert(lessonContentBlocks).values(
        blocks.map((b, i) => ({
          lessonId,
          orderIndex: i + 1,
          blockType: b.blockType,
          content: b.content,
          narrationText: b.narrationText ?? null,
        })),
      );
    }
    async function insertExercises(lessonCode: string, exercises: ExerciseInput[]) {
      const lessonId = lessonIdByCode.get(lessonCode)!;
      await db.insert(lessonExercises).values(exercises.map((e, i) => ({ lessonId, orderIndex: i + 1, ...e })));
    }

    // ════════ L01 — Apa itu Hiragana? ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "Anggap Hiragana sebagai fondasi rumah. Kanji itu dinding dan atapnya — bagian yang paling terlihat. Tapi tanpa fondasi Hiragana yang menyambungkan semuanya, dindingnya tidak berdiri sebagai kalimat yang bisa dibaca. Itu sebabnya Hiragana yang dipelajari lebih dulu.",
        content: {
          kind: "paragraphs",
          heading: "Apa itu Hiragana?",
          paragraphs: [
            "Hiragana adalah salah satu dari tiga sistem tulisan Jepang, dan yang akan Anda kuasai lebih dulu. Fungsinya dua: menuliskan kata-kata asli Jepang (bukan serapan asing), dan menjadi \"perekat\" tata bahasa — partikel, akhiran kata kerja, kata sambung, semuanya lewat Hiragana.",
            "Tanpa Hiragana, kalimat Jepang tidak bisa dibaca sama sekali — bahkan kalimat yang penuh Kanji pun tetap disambung oleh Hiragana di sela-selanya.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Hiragana satu-satunya sistem yang benar-benar cukup untuk menulis SELURUH bahasa Jepang sendirian — anak-anak Jepang belajar membaca dengan Hiragana dulu, sebelum Kanji.",
        } satisfies CalloutBlockContent,
      },
      {
        blockType: "text",
        narrationText:
          "Ini konsep yang paling penting untuk dipegang sebelum lanjut. Satu huruf Hiragana bukan potongan bunyi yang perlu digabung-gabung seperti huruf Latin — satu huruf sudah satu suku kata utuh. Begitu Anda hafal bentuknya, Anda otomatis tahu bunyinya, di kata apapun ia muncul, tanpa kecuali.",
        content: {
          kind: "paragraphs",
          heading: "Konsep \"character = sound\"",
          paragraphs: [
            "Ini beda mendasar dengan alfabet Latin. Huruf \"k\" sendirian tidak berbunyi apa-apa — harus digabung vokal dulu (\"ka\", \"ki\", \"ku\"...).",
            "Di Hiragana, **setiap huruf sudah mewakili satu suku kata utuh, siap dibaca langsung.** か bukan \"k\" lalu \"a\" digabung — か itu sendiri SATU unit bunyi \"ka\".",
            "Konsekuensinya: begitu Anda tahu satu huruf, Anda langsung bisa membacanya di kata manapun ia muncul. Tidak ada bunyi yang berubah-ubah tergantung konteks, seperti huruf \"a\" di bahasa Inggris (cat/car/cake).",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        narrationText:
          "Cara tercepat membedakan ketiganya sekilas pandang: kalau bentuknya bulat dan lembut, itu Hiragana. Kalau kaku dan bersudut tajam, itu Katakana — bunyinya sama persis dengan Hiragana, cuma bentuknya beda, khusus untuk kata dari luar Jepang. Kalau padat dan rumit dengan banyak goresan, itu Kanji, dan itu satu-satunya yang membawa arti langsung, bukan sekadar bunyi.",
        content: {
          kind: "comparison",
          heading: "Tiga sistem tulisan, tiga peran berbeda",
          columns: ["Sistem", "Bentuk", "Fungsi"],
          rows: [
            ["Hiragana", "Bulat, mengalir", "Kata asli Jepang + seluruh tata bahasa"],
            ["Katakana", "Kaku, bersudut", "Kata serapan asing, nama asing, penekanan"],
            ["Kanji", "Padat, banyak goresan", "Membawa arti (bukan cuma bunyi)"],
          ],
        } satisfies TableBlockContent,
      },
      {
        blockType: "chart",
        narrationText:
          "Silakan coba sekarang — klik huruf mana saja di peta ini untuk mendengar bunyinya. Kalau menggunakan mouse, arahkan kursor ke satu huruf tanpa mengklik untuk melihat pratinjau urutan coretannya. Tidak ada yang perlu dihafal di layar ini — cukup biasakan mata dan telinga Anda dengan bentuk serta bunyinya dulu.",
        content: {
          script: "hiragana",
          mode: "dimmed-preview",
          heading: "Peta 46 Hiragana Dasar",
          paragraphs: [
            "Inilah seluruh peta yang akan Anda kuasai, dibagi 10 kelompok berisi 5 huruf (Kelompok J berisi 3). Klik huruf mana saja untuk mendengar bunyinya, atau arahkan kursor untuk melihat urutan coretannya. Belum perlu dihafal — ini baru perkenalan.",
          ],
        } satisfies ChartBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "Apa yang dimaksud dengan \"character = sound\" di Hiragana?",
        options: [
          { id: 1, label: "Satu huruf harus digabung vokal dulu baru berbunyi" },
          { id: 2, label: "Satu huruf sudah mewakili satu suku kata utuh" },
          { id: 3, label: "Setiap huruf punya banyak kemungkinan bunyi" },
        ],
        correctOptionId: 2,
        explanation:
          "Berbeda dari huruf Latin, satu huruf Hiragana = satu suku kata utuh yang langsung bisa dibaca, tanpa digabung huruf lain.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Fungsi utama Hiragana dalam kalimat Jepang adalah...",
        options: [
          { id: 1, label: "Hanya untuk nama orang asing" },
          { id: 2, label: "Menulis kata asli Jepang dan seluruh tata bahasa" },
          { id: 3, label: "Menggantikan Kanji yang sulit" },
        ],
        correctOptionId: 2,
        explanation:
          "Hiragana menulis kata asli Jepang DAN jadi perekat tata bahasa (partikel, akhiran kata kerja). Katakana yang khusus untuk nama/kata serapan asing.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Sistem tulisan mana yang bentuknya kaku dan bersudut?",
        options: [
          { id: 1, label: "Hiragana" },
          { id: 2, label: "Katakana" },
          { id: 3, label: "Semua sistem bentuknya sama" },
        ],
        correctOptionId: 2,
        explanation:
          "Katakana punya bunyi sama persis dengan Hiragana tapi bentuknya kaku bersudut — Hiragana bulat dan mengalir.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Cara Menulis Hiragana ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        narrationText:
          "Urutan coretan ini sering diabaikan pemula karena terlihat seperti detail kecil — toh hasil akhirnya kelihatan sama saja. Tapi begitu Anda menulis lebih cepat, urutan yang salah akan membuat bentuk hurufnya berantakan. Membiasakan urutan yang benar sejak awal jauh lebih mudah daripada memperbaikinya belakangan.",
        content: {
          kind: "paragraphs",
          heading: "Sebelum mulai menulis: konsep dasarnya",
          paragraphs: [
            "Setiap huruf Hiragana punya urutan coretan (stroke order) yang baku — bukan sekadar formalitas. Urutan yang benar membuat tulisan tangan Anda proporsional, mudah dibaca, dan — kalau nanti Anda menulis cepat atau menyambung huruf — tetap konsisten bentuknya.",
            "Aturan umum arah menulis: **dari atas ke bawah, dari kiri ke kanan** — mirip pola umum banyak sistem tulisan Asia Timur lainnya.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        narrationText:
          "Bedanya baru terasa nyata begitu Anda menulis cepat, atau kalau tulisan tangan Anda suatu saat dibaca oleh aplikasi pengenal huruf — keduanya sangat bergantung pada urutan coretan yang konsisten, bukan cuma bentuk akhirnya.",
        content: {
          kind: "comparison",
          heading: "Kenapa urutan penting",
          columns: ["Situasi", "Urutan benar", "Kalau urutan terbalik"],
          rows: [
            ["Menulis lambat, hati-hati", "Bentuk rapi, proporsional", "Masih terlihat mirip"],
            ["Menulis cepat / tulisan sambung", "Bentuk tetap terjaga", "Bentuk mudah berantakan, sulit dibaca"],
            ["Diperiksa aplikasi pengenal tulisan tangan", "Dikenali dengan akurat", "Sering salah dikenali"],
          ],
        } satisfies TableBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Proporsi karakter",
          paragraphs: [
            "Bayangkan setiap huruf Hiragana muat dalam satu kotak persegi yang sama besar — seperti kertas berpetak yang dipakai anak-anak Jepang belajar menulis. Semua coretan sebuah huruf harus seimbang di dalam kotak itu: tidak terlalu mepet ke satu sisi, tidak keluar kotak.",
            "Nanti saat berlatih menulis sungguhan, Anda akan memakai kanvas dengan kotak bantu seperti ini.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "chart",
        narrationText:
          "Ini kesempatan Anda untuk benar-benar melihatnya, bukan cuma dijelaskan. Coba beberapa huruf yang berbeda bentuknya — perhatikan bagaimana animasinya selalu bergerak dari atas ke bawah, kiri ke kanan, langkah demi langkah.",
        content: {
          script: "hiragana",
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
            { title: "Kenali ulang — uji supaya tidak tertukar huruf mirip" },
            { title: "Uji kelompok — pastikan lima huruf ini benar-benar melekat sebelum lanjut" },
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "Arah umum menulis Hiragana adalah...",
        options: [
          { id: 1, label: "Dari atas ke bawah, kiri ke kanan" },
          { id: 2, label: "Dari kanan ke kiri" },
          { id: 3, label: "Tidak ada aturan arah tertentu" },
        ],
        correctOptionId: 1,
        explanation:
          "Aturan umumnya dari atas ke bawah dan kiri ke kanan — sama seperti pola umum sistem tulisan Asia Timur lainnya.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kenapa urutan coretan yang benar penting?",
        options: [
          { id: 1, label: "Supaya terlihat lebih rumit" },
          { id: 2, label: "Supaya tulisan tetap proporsional dan konsisten saat ditulis cepat" },
          { id: 3, label: "Hanya soal formalitas tanpa dampak nyata" },
        ],
        correctOptionId: 2,
        explanation:
          "Urutan yang benar menjaga bentuk huruf tetap rapi dan konsisten, terutama saat menulis cepat atau saat tulisan dibaca aplikasi pengenal huruf.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Setiap huruf Hiragana idealnya muat di dalam...",
        options: [
          { id: 1, label: "Ruang bebas tanpa batas" },
          { id: 2, label: "Kotak persegi berukuran sama" },
          { id: 3, label: "Garis lurus horizontal saja" },
        ],
        correctOptionId: 2,
        explanation:
          "Bayangkan kotak berpetak seperti yang dipakai anak-anak Jepang belajar menulis — semua coretan sebuah huruf harus seimbang di dalam kotak itu.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M02 Fase 1 (P1) id=${phase.id}: 2 lesson, ${lessonIds.length} lesson id disiapkan.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m02-phase1 gagal:", error);
  process.exit(1);
});
