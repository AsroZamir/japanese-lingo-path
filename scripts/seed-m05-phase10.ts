import { sql, inArray, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons, lessonContentBlocks, lessonExercises } from "../db/schema/kana";
import type { CalloutBlockContent, LessonExerciseOption } from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 5.txt Fase 10 — lesson terakhir M05
// (dan lesson terakhir seluruh cakupan Bagian 4, M02-M05).
//
// Sama seperti M04 Fase 10: user_kana_mastery/getWeakestKana/
// getDueForReview hanya diisi oleh drill kana (M02/M03), sementara M05
// semuanya concept_mcq/typing lewat recordConceptAttempt yang sengaja
// tidak menulis ke sana. L02/L03 karena itu jujur berupa review
// menyeluruh, bukan remediasi/retensi personal yang dipalsukan.
// L04 "Final Social Simulation" eksplisit "AI conversation, no script,
// follow-up" di modul sumber — genuinely butuh AI, ditandai jujur
// belum tersedia. Skor akhir ditampilkan tapi tanpa gerbang keras
// (M06 belum dibangun, di luar cakupan Bagian 4).

type ExerciseInput = {
  exerciseType: "concept_mcq" | "typing";
  prompt: string;
  options: LessonExerciseOption[] | null;
  correctOptionId: number | null;
  explanation: string | null;
  audioUrl: string | null;
};

const AI_UNAVAILABLE_NOTE: CalloutBlockContent = {
  kind: "important",
  body: "Percakapan bebas dengan AI (skenario acak, tanpa skrip, AI merespons dinamis) BELUM TERSEDIA di aplikasi ini. Di bawah ini Anda tetap berlatih lewat skenario pilihan-ganda sebagai gantinya — bukan simulasi AI sungguhan.",
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
        code: "P10",
        titleId: "Mastery + Retention",
        orderIndex: 10,
        descriptionId: "Tes gabungan seluruh M05, review, retensi, dan simulasi sosial akhir.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Social Japanese Mastery Test", lessonType: "orientation_practice", orderIndex: 1, romajiPolicy: "hidden" as const },
      { code: "L02", titleId: "Targeted Remediation", lessonType: "orientation_practice", orderIndex: 2, romajiPolicy: "on_demand" as const },
      { code: "L03", titleId: "Delayed Retention", lessonType: "orientation_practice", orderIndex: 3, romajiPolicy: "hidden" as const },
      { code: "L04", titleId: "Final Social Simulation", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Social Japanese Mastery Test ════════
    await insertBlocks("L01", [
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Bagian \"Speaking\" dari tes ini (dinilai lewat rekaman suara) belum tersedia — soal di bawah menguji listening, pengenalan situasi, pemilihan ungkapan, relevansi respons, dan penyelesaian percakapan lewat teks/pilihan-ganda.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat: いらっしゃいませ。ご注文は？ Situasi apa ini?",
        options: [{ id: 1, label: "Di restoran/toko" }, { id: 2, label: "Pertemuan pertama" }, { id: 3, label: "Di kelas" }],
        correctOptionId: 1,
        explanation: "いらっしゃいませ + ご注文は menandakan konteks restoran/toko.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Situasi: Anda baru bertemu orang baru. Ungkapan pembuka yang tepat...",
        options: [{ id: 1, label: "はじめまして。" }, { id: 2, label: "こんにちは。" }, { id: 3, label: "いただきます。" }],
        correctOptionId: 1,
        explanation: "はじめまして khusus untuk pertemuan pertama, beda dengan こんにちは yang bisa dipakai kapan saja.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Anda dengar すみません、これはいくらですか。 Respons yang relevan...",
        options: [{ id: 1, label: "五百円です。" }, { id: 2, label: "ありがとうございます。" }, { id: 3, label: "はじめまして。" }],
        correctOptionId: 1,
        explanation: "Pertanyaan harga dijawab dengan harga + です — respons harus relevan dengan pertanyaan, bukan sekadar sopan.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Urutan penyelesaian percakapan perkenalan yang lengkap...",
        options: [{ id: 1, label: "はじめまして → nama+negara+status → よろしくお願いします" }, { id: 2, label: "よろしくお願いします → はじめまして" }, { id: 3, label: "Nama saja, tanpa penutup" }],
        correctOptionId: 1,
        explanation: "Percakapan perkenalan yang selesai dengan baik selalu ditutup dengan よろしくお願いします.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan (romaji) untuk ちょっとわかりません.",
        options: [{ id: 1, label: "ちょっとわかりません" }],
        correctOptionId: 1,
        explanation: "ちょっとわかりません = versi halus dari わかりません.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Teman mengajak Anda ke acara yang tidak ingin Anda hadiri. Penolakan paling halus...",
        options: [{ id: 1, label: "ちょっと…" }, { id: 2, label: "いいえ、絶対嫌です。" }, { id: 3, label: "わかりません。" }],
        correctOptionId: 1,
        explanation: "ちょっと... menolak tanpa terdengar kasar — dipakai luas di budaya Jepang untuk penolakan halus.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Targeted Remediation ════════
    await insertBlocks("L02", [
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Remediasi personal (berdasarkan area lemah Anda sendiri) belum tersedia untuk modul ini — soal-soal M05 belum terhubung ke sistem pelacakan kemampuan per-topik yang dipakai modul Hiragana/Katakana. Di bawah ini review menyeluruh mencakup titik-titik yang paling sering keliru; fokuskan diri sendiri pada bagian yang terasa paling sulit.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "ごめんなさい vs すみません — perbedaan utamanya...",
        options: [{ id: 1, label: "すみません lebih serbaguna (maaf ATAU permisi), ごめんなさい cuma maaf" }, { id: 2, label: "Artinya identik, bisa dipakai bebas gantian" }, { id: 3, label: "ごめんなさい dipakai untuk situasi formal" }],
        correctOptionId: 1,
        explanation: "すみません bisa berarti \"maaf\" ATAU \"permisi/meminta perhatian\" — ごめんなさい murni permintaan maaf.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "はい/いいえ dibandingkan そうです/そうではありません — kapan pakai yang mana?",
        options: [{ id: 1, label: "はい/いいえ untuk jawaban langsung, そうです untuk konfirmasi/sangkal pernyataan" }, { id: 2, label: "Keduanya sama persis" }, { id: 3, label: "そうです hanya untuk pertanyaan ya/tidak" }],
        correctOptionId: 1,
        explanation: "はい/いいえ menjawab pertanyaan langsung; そうです/そうではありません mengonfirmasi atau menyangkal sebuah pernyataan.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan (romaji) untuk もう一度お願いします.",
        options: [{ id: 1, label: "もういちどおねがいします" }],
        correctOptionId: 1,
        explanation: "もう一度お願いします dibaca \"mou ichido onegaishimasu\" = \"tolong sekali lagi.\"",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Delayed Retention ════════
    await insertBlocks("L03", [
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Jadwal review otomatis (hari sama/H+1/H+3/H+7) belum tersedia untuk modul ini — sistem SRS yang dipakai modul Hiragana/Katakana melacak per karakter kana, sementara M05 tidak mendrill karakter kana. Anggap lesson ini sebagai review manual: kembali ke sini beberapa hari lagi untuk menguji ingatan Anda sendiri.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Tanpa melihat catatan, apa arti どういたしまして?",
        options: [{ id: 1, label: "Sama-sama (respons terima kasih)" }, { id: 2, label: "Permisi" }, { id: 3, label: "Selamat tinggal" }],
        correctOptionId: 1,
        explanation: "どういたしまして = respons standar terhadap ucapan terima kasih.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Tanpa melihat catatan, kapan これは日本語で何ですか dipakai?",
        options: [{ id: 1, label: "Menanyakan istilah Jepang dari sesuatu" }, { id: 2, label: "Meminta maaf" }, { id: 3, label: "Menyapa di pagi hari" }],
        correctOptionId: 1,
        explanation: "これは日本語で何ですか secara spesifik menanyakan istilah Jepangnya.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Final Social Simulation ════════
    await insertBlocks("L04", [
      { blockType: "callout", content: AI_UNAVAILABLE_NOTE },
      {
        blockType: "callout",
        content: {
          kind: "important",
          body: "Ini pemeriksaan akhir M05 — modul terakhir dari cakupan kurikulum saat ini. Skor Anda ditampilkan, tapi belum ada gerbang keras yang mengunci modul berikutnya (M06 belum dibangun).",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "Skenario: Orang asing menyapa はじめまして di sebuah acara. Respons pembuka Anda...",
        options: [{ id: 1, label: "はじめまして。[nama]です。" }, { id: 2, label: "ありがとうございます。" }, { id: 3, label: "いくらですか。" }],
        correctOptionId: 1,
        explanation: "はじめまして dibalas dengan はじめまして + perkenalan diri.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Skenario (lanjutan): Orang itu bertanya lanjutan お仕事は何ですか。 Respons Anda...",
        options: [{ id: 1, label: "[Status/pekerjaan Anda]です。" }, { id: 2, label: "五百円です。" }, { id: 3, label: "こんばんは。" }],
        correctOptionId: 1,
        explanation: "お仕事は何ですか menanyakan pekerjaan — dijawab dengan status/pekerjaan.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Skenario (penutup): Percakapan hampir selesai. Penutup paling wajar...",
        options: [{ id: 1, label: "今日は会えてよかったです。よろしくお願いします。" }, { id: 2, label: "いくらですか。" }, { id: 3, label: "わかりません。" }],
        correctOptionId: 1,
        explanation: "Menutup percakapan dengan kesan positif + よろしくお願いします adalah pola penutup sosial yang wajar.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M05 Fase 10 (P10) id=${phase.id}: 4 lesson. M05 SELESAI.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m05-phase10 gagal:", error);
  process.exit(1);
});
