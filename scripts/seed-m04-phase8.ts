import { sql, inArray, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import {
  kanaModules,
  kanaPhases,
  kanaLessons,
  lessonContentBlocks,
  lessonExercises,
} from "../db/schema/kana";
import type { TextBlockContent, CalloutBlockContent, LessonExerciseOption } from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 4.txt Fase 8. L01 (Sound -> Information)
// idealnya audio-driven — VOICEVOX tidak aktif saat ditulis, exercise
// tetap dibangun dengan audioUrl: null (UI menangani null dengan baik),
// siap terisi begitu audio digenerate. L03 (Speak from Memory) ditandai
// jujur belum tersedia untuk penilaian ucapan.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
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
  body: "Latihan bicara sungguhan (rekam & nilai pengucapan) belum tersedia di aplikasi ini. Gunakan lesson ini untuk melatih diri sendiri secara lisan — tidak dinilai otomatis oleh aplikasi.",
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
        code: "P8",
        titleId: "Active Recall & Writing",
        orderIndex: 8,
        descriptionId: "Dengar dan pahami, ketik dalam bahasa Jepang, dan latihan bicara dari ingatan.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Sound → Information", lessonType: "orientation_practice", orderIndex: 1, romajiPolicy: "hidden" as const },
      { code: "L02", titleId: "Information → Japanese", lessonType: "orientation_practice", orderIndex: 2, romajiPolicy: "hidden" as const },
      { code: "L03", titleId: "Speak from Memory", lessonType: "orientation_practice", orderIndex: 3, romajiPolicy: "always" as const },
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

    // ════════ L01 — Sound → Information ════════
    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "五時 dibaca \"goji\". Ini jam berapa?",
        options: [{ id: 1, label: "5:00" }, { id: 2, label: "4:00" }, { id: 3, label: "9:00" }],
        correctOptionId: 1,
        explanation: "五時 = goji = jam 5.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "十八歳 dibaca \"juuhassai\". Ini umur berapa?",
        options: [{ id: 1, label: "8 tahun" }, { id: 2, label: "18 tahun" }, { id: 3, label: "80 tahun" }],
        correctOptionId: 2,
        explanation: "十八歳 = juuhassai = 18 tahun.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "二千円 dibaca \"nisen-en\". Ini harga berapa?",
        options: [{ id: 1, label: "200 yen" }, { id: 2, label: "2.000 yen" }, { id: 3, label: "20.000 yen" }],
        correctOptionId: 2,
        explanation: "二千円 = nisen-en = 2.000 yen.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "五日 dibaca \"itsuka\". Ini tanggal berapa?",
        options: [{ id: 1, label: "5" }, { id: 2, label: "50" }, { id: 3, label: "15" }],
        correctOptionId: 1,
        explanation: "五日 = itsuka = tanggal 5.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Information → Japanese ════════
    await insertExercises("L02", [
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk jam 8:00, dalam romaji.",
        options: [{ id: 1, label: "はちじ" }],
        correctOptionId: 1,
        explanation: "八時 dibaca \"hachiji\".",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk umur 20 tahun, dalam romaji.",
        options: [{ id: 1, label: "はたち" }],
        correctOptionId: 1,
        explanation: "二十歳 dibaca \"hatachi\".",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk harga 100 yen, dalam romaji.",
        options: [{ id: 1, label: "ひゃくえん" }],
        correctOptionId: 1,
        explanation: "百円 dibaca \"hyaku-en\".",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk tanggal 10, dalam romaji.",
        options: [{ id: 1, label: "とおか" }],
        correctOptionId: 1,
        explanation: "十日 dibaca \"tooka\".",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Cara menyatakan \"saya orang Indonesia\" adalah...",
        options: [{ id: 1, label: "インドネシア人です。" }, { id: 2, label: "インドネシアです。" }, { id: 3, label: "インドネシア語です。" }],
        correctOptionId: 1,
        explanation: "インドネシア人です = \"saya orang Indonesia.\"",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Speak from Memory ════════
    await insertBlocks("L03", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "text",
        content: {
          kind: "steps",
          heading: "Latihan bicara dari ingatan",
          leadParagraphs: ["Coba ucapkan kelimanya keras-keras, tanpa melihat catatan dulu, baru cek jawabannya:"],
          steps: [
            { title: "Sebutkan umur Anda" },
            { title: "Sebutkan tanggal hari ini" },
            { title: "Sebutkan jam sekarang" },
            { title: "Sebutkan negara asal Anda" },
            { title: "Perkenalkan diri singkat: nama, kewarganegaraan, status" },
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat perkenalan diri yang lengkap dan runtut...",
        options: [
          { id: 1, label: "アスロです。インドネシア人です。学生です。" },
          { id: 2, label: "学生です。アスロです。インドネシア人です。" },
          { id: 3, label: "インドネシア人です。学生です。アスロです。" },
        ],
        correctOptionId: 1,
        explanation: "Urutan alami: nama dulu, lalu kewarganegaraan, baru status.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M04 Fase 8 (P8) id=${phase.id}: 3 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m04-phase8 gagal:", error);
  process.exit(1);
});
