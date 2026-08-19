import { sql, inArray, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons, lessonContentBlocks, lessonExercises } from "../db/schema/kana";
import type { CalloutBlockContent, LessonExerciseOption } from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 5.txt Fase 7. L04 "Listen & Respond"
// eksplisit minta "no answer choices, user speaks, AI judges relevance/
// intelligibility" — genuinely butuh AI percakapan + speech scoring.
// Ditandai jujur belum tersedia, versi pilihan-ganda sebagai gantinya.

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
  body: "Percakapan bebas dengan AI (tanpa pilihan jawaban, dinilai otomatis) BELUM TERSEDIA di aplikasi ini. Di bawah ini Anda tetap berlatih memilih respons yang relevan lewat pilihan ganda — bukan simulasi AI sungguhan.",
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
        code: "P7",
        titleId: "Listening & Response Lab",
        orderIndex: 7,
        descriptionId: "Mengenali situasi, mengenali maksud, memilih respons, dan mendengar-merespons.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Hear the Situation", lessonType: "orientation_practice", orderIndex: 1, romajiPolicy: "hidden" as const },
      { code: "L02", titleId: "Hear the Intention", lessonType: "orientation_practice", orderIndex: 2, romajiPolicy: "hidden" as const },
      { code: "L03", titleId: "Choose the Response", lessonType: "orientation_practice", orderIndex: 3, romajiPolicy: "hidden" as const },
      { code: "L04", titleId: "Listen & Respond", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Hear the Situation ════════
    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat: おはようございます。今日もいい天気ですね。 Situasi apa ini?",
        options: [{ id: 1, label: "Pertemuan pertama" }, { id: 2, label: "Sapaan pagi biasa" }, { id: 3, label: "Meminta maaf" }],
        correctOptionId: 2,
        explanation: "おはようございます menandakan sapaan pagi biasa, bukan pertemuan pertama (tidak ada はじめまして).",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat: いらっしゃいませ。ご注文は？ Situasi apa ini?",
        options: [{ id: 1, label: "Di restoran/toko" }, { id: 2, label: "Di kelas" }, { id: 3, label: "Di rumah" }],
        correctOptionId: 1,
        explanation: "いらっしゃいませ (selamat datang) + ご注文は (pesanan Anda?) menandakan konteks restoran/toko.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat: 今日は「いただきます」について勉強します。 Situasi apa ini?",
        options: [{ id: 1, label: "Di kelas" }, { id: 2, label: "Di toko" }, { id: 3, label: "Pertemuan pertama" }],
        correctOptionId: 1,
        explanation: "\"...について勉強します\" (belajar tentang...) menandakan konteks kelas.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Hear the Intention ════════
    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat: ごめんなさい。 Maksud pembicara adalah...",
        options: [{ id: 1, label: "Meminta maaf" }, { id: 2, label: "Berterima kasih" }, { id: 3, label: "Bertanya" }],
        correctOptionId: 1,
        explanation: "ごめんなさい = maksudnya meminta maaf.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat: これをください。 Maksud pembicara adalah...",
        options: [{ id: 1, label: "Meminta sesuatu" }, { id: 2, label: "Berterima kasih" }, { id: 3, label: "Menyapa" }],
        correctOptionId: 1,
        explanation: "これをください = maksudnya meminta/memesan sesuatu.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat: これは何ですか。 Maksud pembicara adalah...",
        options: [{ id: 1, label: "Bertanya" }, { id: 2, label: "Meminta maaf" }, { id: 3, label: "Menyapa" }],
        correctOptionId: 1,
        explanation: "これは何ですか = maksudnya bertanya.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Choose the Response ════════
    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Anda dengar: ありがとうございます。 Respons paling wajar...",
        options: [{ id: 1, label: "どういたしまして。(sama-sama)" }, { id: 2, label: "はじめまして。" }, { id: 3, label: "いくらですか。" }],
        correctOptionId: 1,
        explanation: "どういたしまして (sama-sama) adalah respons standar menerima terima kasih.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Anda dengar: すみません、これはいくらですか。 Respons paling wajar...",
        options: [{ id: 1, label: "五百円です。" }, { id: 2, label: "ありがとうございます。" }, { id: 3, label: "はじめまして。" }],
        correctOptionId: 1,
        explanation: "Pertanyaan harga dijawab dengan harga + です.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Listen & Respond ════════
    await insertBlocks("L04", [{ blockType: "callout", content: AI_UNAVAILABLE_NOTE }]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "Anda dengar: お名前は何ですか。 Respons yang relevan...",
        options: [{ id: 1, label: "[Nama Anda]です。" }, { id: 2, label: "五百円です。" }, { id: 3, label: "ちょっと…" }],
        correctOptionId: 1,
        explanation: "お名前は何ですか (siapa nama Anda?) dijawab dengan nama + です.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Anda dengar: もう一度言ってください。 Ini permintaan untuk...",
        options: [{ id: 1, label: "Mengulang perkataan" }, { id: 2, label: "Berbicara lebih cepat" }, { id: 3, label: "Diam" }],
        correctOptionId: 1,
        explanation: "もう一度言ってください = \"tolong katakan sekali lagi\" — permintaan mengulang.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M05 Fase 7 (P7) id=${phase.id}: 4 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m05-phase7 gagal:", error);
  process.exit(1);
});
