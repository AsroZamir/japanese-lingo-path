import { sql, inArray, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons, lessonContentBlocks, lessonExercises } from "../db/schema/kana";
import type { CalloutBlockContent, LessonExerciseOption } from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 4.txt Fase 10 — lesson terakhir M04.
//
// Catatan arsitektur penting: M02/M03's LessonMasteryGate.tsx (Targeted
// Remediation via getWeakestKana, Delayed Retention via getDueForReview)
// bergantung pada user_kana_mastery, yang HANYA diisi oleh drill kana
// (recordAttempt dari ExerciseRunner kana). M04's exercises semuanya
// concept_mcq/typing lewat ConceptExerciseRunner -> recordConceptAttempt,
// yang secara SENGAJA tidak menulis ke user_kana_mastery (lihat komentar
// di actions.ts: "soal konsep, bukan soal kana"). Konsekuensinya: M04
// TIDAK punya data per-topik untuk remediasi/retensi yang benar-benar
// personal — L02/L03 di bawah jujur berupa kuis review menyeluruh,
// bukan dipalsukan seolah-olah personal padahal tidak. L04 tetap
// menulis gerbang pass/fail sungguhan ke user_kana_gate_results, sama
// seperti pola M02/M03.

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
        code: "P10",
        titleId: "Mastery + Retention",
        orderIndex: 10,
        descriptionId: "Tes gabungan seluruh M04, review, dan pemeriksaan akhir sebelum lanjut ke M05.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Numbers & Information Mastery Test", lessonType: "orientation_practice", orderIndex: 1, romajiPolicy: "hidden" as const },
      { code: "L02", titleId: "Targeted Remediation", lessonType: "orientation_practice", orderIndex: 2, romajiPolicy: "on_demand" as const },
      { code: "L03", titleId: "Delayed Retention Check", lessonType: "orientation_practice", orderIndex: 3, romajiPolicy: "hidden" as const },
      { code: "L04", titleId: "Final Module Check", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Numbers & Information Mastery Test ════════
    await insertExercises("L01", [
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 五十六 (56), dalam romaji.",
        options: [{ id: 1, label: "ごじゅうろく" }],
        correctOptionId: 1,
        explanation: "五十六 = gojuu (50) + roku (6) = gojuuroku.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "三人 (3 orang) dibaca...",
        options: [{ id: 1, label: "sanri" }, { id: 2, label: "san-nin" }, { id: 3, label: "mittsu" }],
        correctOptionId: 2,
        explanation: "三人 = san-nin — pola teratur mulai dari 3 orang.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 八時半 (8:30), dalam romaji.",
        options: [{ id: 1, label: "はちじはん" }],
        correctOptionId: 1,
        explanation: "八時半 = hachiji-han = 8:30.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "六日 (tanggal 6) dibaca...",
        options: [{ id: 1, label: "rokunichi" }, { id: 2, label: "muika" }, { id: 3, label: "rokka" }],
        correctOptionId: 2,
        explanation: "六日 dibaca \"muika\" — tanggal 1-10 masing-masing kata tersendiri.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk harga 700 yen, dalam romaji.",
        options: [{ id: 1, label: "ななひゃくえん" }],
        correctOptionId: 1,
        explanation: "七百円 = nanahyaku-en = 700 yen.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat yang benar untuk \"saya orang Jepang, guru\"...",
        options: [{ id: 1, label: "日本人です。先生です。" }, { id: 2, label: "日本です。学生です。" }, { id: 3, label: "日本語です。会社です。" }],
        correctOptionId: 1,
        explanation: "日本人 (orang Jepang) + 先生 (guru), keduanya dengan です.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "二十歳 dan 二十日 dibaca berbeda meski sama-sama \"20\". Yang mana \"hatachi\"?",
        options: [{ id: 1, label: "二十歳 (umur)" }, { id: 2, label: "二十日 (tanggal)" }, { id: 3, label: "Keduanya" }],
        correctOptionId: 1,
        explanation: "二十歳 (umur 20) = hatachi. 二十日 (tanggal 20) = hatsuka — dua pengecualian BERBEDA yang kebetulan sama-sama \"20\".",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Targeted Remediation ════════
    await insertBlocks("L02", [
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Remediasi personal (berdasarkan area lemah Anda sendiri) belum tersedia untuk modul ini — soal-soal M04 belum terhubung ke sistem pelacakan kemampuan per-topik yang dipakai modul Hiragana/Katakana. Di bawah ini review menyeluruh mencakup semua topik M04; fokuskan diri sendiri pada bagian yang terasa paling sulit.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "四時, 四月, dan angka 4 biasa masing-masing dibaca...",
        options: [
          { id: 1, label: "yoji, shigatsu, yon" },
          { id: 2, label: "yonji, yongatsu, yon" },
          { id: 3, label: "shiji, shigatsu, shi" },
        ],
        correctOptionId: 1,
        explanation: "Tiga bacaan berbeda untuk angka 4 tergantung konteks: yoji (jam), shigatsu (bulan), yon (angka biasa).",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 十四日 (tanggal 14), dalam romaji.",
        options: [{ id: 1, label: "じゅうよっか" }],
        correctOptionId: 1,
        explanation: "十四日 dibaca \"juuyokka\" — pengecualian.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "何人 (menghitung orang) dan ～人 (kewarganegaraan) memakai karakter yang sama. Apa bedanya?",
        options: [
          { id: 1, label: "Tidak ada beda, artinya selalu sama" },
          { id: 2, label: "何人 menghitung jumlah orang, negara+人 menyatakan kewarganegaraan" },
          { id: 3, label: "何人 cuma dipakai untuk umur" },
        ],
        correctOptionId: 2,
        explanation: "Karakter 人 sama, tapi konteksnya beda: 三人 (3 orang, jumlah) vs 日本人 (orang Jepang, kewarganegaraan).",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Delayed Retention Check ════════
    await insertBlocks("L03", [
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Jadwal review otomatis (H+0/H+1/H+3/H+7) belum tersedia untuk modul ini — sistem SRS yang dipakai modul Hiragana/Katakana melacak per karakter kana, sementara M04 tidak mendrill karakter kana. Anggap lesson ini sebagai review manual: kembali ke sini beberapa hari lagi untuk menguji ingatan Anda.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "九時 dan 九月 dan angka 9 biasa — mana yang bacanya SAMA?",
        options: [{ id: 1, label: "Ketiganya sama: kyuu" }, { id: 2, label: "九時 dan 九月 sama (\"ku\"), angka biasa beda (\"kyuu\")" }, { id: 3, label: "Ketiganya beda semua" }],
        correctOptionId: 2,
        explanation: "九時 (kuji) dan 九月 (kugatsu) sama-sama pakai \"ku\", angka biasa 九 tetap \"kyuu\".",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 二十日 (tanggal 20), dalam romaji.",
        options: [{ id: 1, label: "はつか" }],
        correctOptionId: 1,
        explanation: "二十日 dibaca \"hatsuka\" — pengecualian total.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Final Module Check ════════
    await insertBlocks("L04", [
      {
        blockType: "callout",
        content: {
          kind: "important",
          body: "Ini pemeriksaan akhir M04. Skor Anda ditampilkan, tapi belum ada gerbang keras yang mengunci M05 — M05 sendiri belum dibangun. Sama seperti status M02/M03.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 万 (10.000), dalam romaji.",
        options: [{ id: 1, label: "まん" }],
        correctOptionId: 1,
        explanation: "万 dibaca \"man\" = 10.000.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "五時十五分 dibaca \"goji juugofun\". Jam berapa ini?",
        options: [{ id: 1, label: "5:15" }, { id: 2, label: "5:50" }, { id: 3, label: "15:05" }],
        correctOptionId: 1,
        explanation: "五時 (5) + 十五分 (15 menit) = 5:15.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 会社員 (karyawan perusahaan), dalam romaji.",
        options: [{ id: 1, label: "かいしゃいん" }],
        correctOptionId: 1,
        explanation: "会社員 dibaca \"kaishain\".",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat perkenalan diri paling lengkap untuk konteks resmi...",
        options: [
          { id: 1, label: "はじめまして。[nama]です。[negara]人です。[status]です。よろしくお願いします。" },
          { id: 2, label: "[nama]です。それだけです。" },
          { id: 3, label: "こんにちは。バイバイ。" },
        ],
        correctOptionId: 1,
        explanation: "Perkenalan lengkap: sapaan pembuka, nama, kewarganegaraan, status, penutup sopan.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Manakah yang menggabungkan angka, waktu, DAN harga dengan benar?",
        options: [
          { id: 1, label: "三時に、五百円のコーヒーを飲みます。(Jam 3, minum kopi seharga 500 yen)" },
          { id: 2, label: "三円に、五百時のコーヒーを飲みます。" },
          { id: 3, label: "三日に、五百人のコーヒーを飲みます。" },
        ],
        correctOptionId: 1,
        explanation: "三時 (jam, pakai 時) dan 五百円 (harga, pakai 円) — satuan yang tepat untuk masing-masing konteks.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M04 Fase 10 (P10) id=${phase.id}: 4 lesson. M04 SELESAI.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m04-phase10 gagal:", error);
  process.exit(1);
});
