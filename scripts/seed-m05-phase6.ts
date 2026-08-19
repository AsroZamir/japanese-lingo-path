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
  MultiTurnDialogueContent,
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 5.txt Fase 6. L06 "Social Survival
// Simulation" secara eksplisit minta "AI responds" untuk skenario acak
// tanpa skrip — genuinely butuh AI percakapan sungguhan, bukan sesuatu
// yang bisa dibangun dengan MultiTurnDialogue (yang skrip-tetap). Sesuai
// instruksi tugas, lesson ini ditandai jujur BELUM TERSEDIA untuk
// percakapan bebas — strukturnya (skenario, ekspresi yang relevan)
// tetap ditampilkan, tapi tidak dipalsukan seolah AI merespons.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "dialogue"; content: MultiTurnDialogueContent; narrationText?: string }
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

const AI_UNAVAILABLE_NOTE: CalloutBlockContent = {
  kind: "important",
  body: "Percakapan bebas dengan AI (skenario acak, respons dinamis) BELUM TERSEDIA di aplikasi ini. Di bawah ini Anda tetap bisa melihat skenario dan berlatih memilih ekspresi yang tepat lewat soal pilihan ganda — tapi ini bukan simulasi AI sungguhan, dan tidak berpura-pura menjadi satu.",
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
        code: "P6",
        titleId: "Everyday Social Situations",
        orderIndex: 6,
        descriptionId: "Bertemu orang, di toko, di restoran, minta bantuan, situasi publik.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Meeting Someone", lessonType: "orientation_practice", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "At a Shop", lessonType: "orientation_practice", orderIndex: 2, romajiPolicy: "always" as const },
      { code: "L03", titleId: "At a Restaurant", lessonType: "orientation_practice", orderIndex: 3, romajiPolicy: "always" as const },
      { code: "L04", titleId: "Asking for Help", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "on_demand" as const },
      { code: "L05", titleId: "Public Situation", lessonType: "orientation", orderIndex: 5, romajiPolicy: "on_demand" as const },
      { code: "L06", titleId: "Social Survival Simulation", lessonType: "orientation_practice", orderIndex: 6, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Meeting Someone ════════
    await insertBlocks("L01", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "dialogue",
        content: {
          scenario: "Anda bertemu tetangga baru di depan apartemen.",
          turns: [
            {
              npcKana: "こんにちは。",
              prompt: "Tetangga baru menyapa Anda. Bagaimana Anda merespons?",
              choices: [
                { id: "a", kana: "こんにちは。はじめまして。", correct: true },
                { id: "b", kana: "おやすみなさい。", correct: false },
                { id: "c", kana: "いくらですか。", correct: false },
              ],
            },
            {
              npcKana: "はじめまして。鈴木です。よろしくお願いします。",
              prompt: "Tetangga memperkenalkan diri. Bagaimana Anda menutup perkenalan?",
              choices: [
                { id: "a", kana: "アスロです。よろしくお願いします。", correct: true },
                { id: "b", kana: "ありがとうございます。", correct: false },
                { id: "c", kana: "すみません。", correct: false },
              ],
            },
          ],
          closingNote: "Perkenalan singkat sehari-hari menggabungkan sapaan + はじめまして + nama + よろしくお願いします.",
        } satisfies MultiTurnDialogueContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "Elemen yang HARUS ada saat bertemu orang baru pertama kali...",
        options: [{ id: 1, label: "はじめまして" }, { id: 2, label: "いくらですか" }, { id: 3, label: "おやすみなさい" }],
        correctOptionId: 1,
        explanation: "はじめまして wajib untuk pertemuan pertama — review dari Fase 3.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — At a Shop ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Frasa baru: これをください",
          paragraphs: [
            "これをください (kore o kudasai) = \"ini, tolong\" / \"saya mau ini\" — cara paling sederhana meminta barang di toko, sambil menunjuk.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "dialogue",
        content: {
          scenario: "Anda ingin membeli sesuatu di toko kecil.",
          turns: [
            {
              npcKana: "いらっしゃいませ。",
              prompt: "Pelayan toko menyapa Anda saat masuk. Anda ingin membeli barang yang Anda tunjuk. Apa yang Anda katakan?",
              choices: [
                { id: "a", kana: "すみません、これをください。", correct: true },
                { id: "b", kana: "おはようございます。", correct: false },
                { id: "c", kana: "わかりません。", correct: false },
              ],
            },
            {
              npcKana: "はい、五百円です。",
              prompt: "Pelayan menyebutkan harga dan menyerahkan barangnya. Bagaimana Anda menutup interaksi?",
              choices: [
                { id: "a", kana: "ありがとうございます。", correct: true },
                { id: "b", kana: "はじめまして。", correct: false },
                { id: "c", kana: "いいですね。", correct: false },
              ],
            },
          ],
          closingNote: "Interaksi toko singkat: すみません (menarik perhatian) → これをください (meminta barang) → ありがとうございます (menutup).",
        } satisfies MultiTurnDialogueContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "これをください artinya...",
        options: [{ id: 1, label: "Ini apa?" }, { id: 2, label: "Saya mau ini / ini, tolong" }, { id: 3, label: "Ini berapa harganya?" }],
        correctOptionId: 2,
        explanation: "これをください = \"ini, tolong\" — meminta barang yang ditunjuk.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — At a Restaurant ════════
    await insertBlocks("L03", [
      {
        blockType: "dialogue",
        content: {
          scenario: "Anda memesan makanan di restoran kecil.",
          turns: [
            {
              npcKana: "いらっしゃいませ。ご注文は？",
              prompt: "Pelayan menanyakan pesanan Anda. Anda ingin memesan kopi. Apa yang Anda katakan?",
              choices: [
                { id: "a", kana: "コーヒーをください。", correct: true },
                { id: "b", kana: "コーヒーですか。", correct: false },
                { id: "c", kana: "コーヒーは何ですか。", correct: false },
              ],
            },
            {
              npcKana: "かしこまりました。少々お待ちください。",
              prompt: "Pelayan menerima pesanan. Setelah kopi datang, bagaimana Anda merespons?",
              choices: [
                { id: "a", kana: "ありがとうございます。", correct: true },
                { id: "b", kana: "すみません。", correct: false },
                { id: "c", kana: "いいえ。", correct: false },
              ],
            },
          ],
          closingNote: "Pola yang sama dengan toko: sebutkan yang diinginkan + ください, tutup dengan terima kasih.",
        } satisfies MultiTurnDialogueContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Cara memesan kopi di restoran...",
        options: [{ id: 1, label: "コーヒーをください" }, { id: 2, label: "コーヒーです" }, { id: 3, label: "コーヒーがあります" }],
        correctOptionId: 1,
        explanation: "[barang]をください = pola standar memesan/meminta sesuatu.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Asking for Help ════════
    await insertBlocks("L04", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Meminta bantuan",
          paragraphs: [
            "Menggabungkan semua yang sudah Anda kuasai: すみません (menarik perhatian) + お願いします (permintaan sopan) + わかりません (kalau tidak paham jawabannya) + もう一度お願いします (kalau perlu diulang).",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "Urutan yang tepat untuk meminta bantuan dari orang asing...",
        options: [
          { id: 1, label: "すみません → pertanyaan → (kalau tidak paham) わかりません、もう一度お願いします" },
          { id: 2, label: "わかりません → すみません → pertanyaan" },
          { id: 3, label: "もう一度お願いします saja, tanpa pembuka" },
        ],
        correctOptionId: 1,
        explanation: "Mulai dengan すみません, sampaikan pertanyaan, dan siapkan わかりません+もう一度お願いします kalau perlu.",
        audioUrl: null,
      },
    ]);

    // ════════ L05 — Public Situation ════════
    await insertBlocks("L05", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Situasi publik",
          paragraphs: [
            "Stasiun, toko, sekolah, dan interaksi dengan orang asing di jalan semuanya memakai kombinasi ungkapan yang sudah Anda kuasai sejauh ini — bukan kosakata baru, tapi latihan mengenali KAPAN memakai yang mana.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L05", [
      {
        exerciseType: "concept_mcq",
        prompt: "Anda tersesat di stasiun dan ingin bertanya arah ke orang asing. Kalimat pembuka yang tepat...",
        options: [{ id: 1, label: "すみません。" }, { id: 2, label: "はじめまして。" }, { id: 3, label: "いただきます。" }],
        correctOptionId: 1,
        explanation: "すみません adalah pembuka standar untuk meminta bantuan/bertanya ke orang asing.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Anda tidak paham arah yang dijelaskan. Respons yang tepat...",
        options: [{ id: 1, label: "ちょっとわかりません。もう一度お願いします。" }, { id: 2, label: "いいですね。" }, { id: 3, label: "ありがとうございます。" }],
        correctOptionId: 1,
        explanation: "ちょっとわかりません + もう一度お願いします — kombinasi yang sudah dipelajari di Fase 5.",
        audioUrl: null,
      },
    ]);

    // ════════ L06 — Social Survival Simulation ════════
    await insertBlocks("L06", [
      { blockType: "callout", content: AI_UNAVAILABLE_NOTE },
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Skenario acak (versi pilihan ganda)",
          paragraphs: [
            "Setiap soal di bawah menyajikan skenario acak — pilih ekspresi paling tepat, sama seperti simulasi sungguhan akan bekerja begitu percakapan bebas AI tersedia.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L06", [
      {
        exerciseType: "concept_mcq",
        prompt: "Skenario: Anda menabrak seseorang tanpa sengaja di jalan. Respons pertama yang tepat...",
        options: [{ id: 1, label: "ごめんなさい。" }, { id: 2, label: "ありがとうございます。" }, { id: 3, label: "いいですね。" }],
        correctOptionId: 1,
        explanation: "ごめんなさい cocok untuk kesalahan personal ringan seperti ini.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Skenario: Toko sedang ramai, Anda ingin bertanya ke pelayan tapi mereka sibuk. Cara memulai...",
        options: [{ id: 1, label: "すみません。" }, { id: 2, label: "こんばんは。" }, { id: 3, label: "さようなら。" }],
        correctOptionId: 1,
        explanation: "すみません tetap cara paling umum menarik perhatian meski situasi ramai.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Skenario: Teman mengucapkan selamat ulang tahun ke Anda. Respons yang tepat...",
        options: [{ id: 1, label: "ありがとうございます。" }, { id: 2, label: "はじめまして。" }, { id: 3, label: "すみません。" }],
        correctOptionId: 1,
        explanation: "ありがとうございます adalah respons wajar menerima ucapan selamat.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M05 Fase 6 (P6) id=${phase.id}: 6 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m05-phase6 gagal:", error);
  process.exit(1);
});
