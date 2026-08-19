import { sql, inArray, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons, lessonContentBlocks, lessonExercises } from "../db/schema/kana";
import type { MultiTurnDialogueContent, CalloutBlockContent, LessonExerciseOption } from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 5.txt Fase 8. L01-L04 me-review
// konten Fase 1/3/2/5 khusus untuk latihan bicara (roleplay skrip via
// MultiTurnDialogue) — bukan materi baru. L05 "Free Basic Social
// Conversation" eksplisit "AI starts conversation... AI asks follow-up"
// — genuinely butuh AI percakapan bebas, ditandai jujur belum tersedia.

type BlockInput =
  | { blockType: "dialogue"; content: MultiTurnDialogueContent }
  | { blockType: "callout"; content: CalloutBlockContent };

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
  body: "Latihan bicara sungguhan (rekam & nilai pengucapan) belum tersedia di aplikasi ini. Gunakan roleplay ini untuk berlatih lisan sendiri — pilihan yang benar menunjukkan kalimat yang tepat untuk diucapkan, tidak dinilai otomatis.",
};

const AI_UNAVAILABLE_NOTE: CalloutBlockContent = {
  kind: "important",
  body: "Percakapan bebas dengan AI (AI memulai, bertanya lanjutan, merespons dinamis) BELUM TERSEDIA di aplikasi ini. Di bawah ini Anda tetap bisa melihat contoh alur percakapan dan berlatih memilih respons yang tepat — bukan simulasi AI sungguhan.",
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
        code: "P8",
        titleId: "Speaking & Roleplay Lab",
        orderIndex: 8,
        descriptionId: "Roleplay sapaan, pertemuan pertama, minta bantuan, kelas — fokus latihan lisan.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Greeting Roleplay", lessonType: "orientation_practice", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "First Meeting Roleplay", lessonType: "orientation_practice", orderIndex: 2, romajiPolicy: "always" as const },
      { code: "L03", titleId: "Asking for Help (Roleplay)", lessonType: "orientation_practice", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Classroom Roleplay", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "on_demand" as const },
      { code: "L05", titleId: "Free Basic Social Conversation", lessonType: "orientation_practice", orderIndex: 5, romajiPolicy: "hidden" as const },
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
      await db.insert(lessonContentBlocks).values(blocks.map((b, i) => ({ lessonId, orderIndex: i + 1, blockType: b.blockType, content: b.content, narrationText: null })));
    }
    async function insertExercises(lessonCode: string, exercises: ExerciseInput[]) {
      const lessonId = lessonIdByCode.get(lessonCode)!;
      await db.insert(lessonExercises).values(exercises.map((e, i) => ({ lessonId, orderIndex: i + 1, ...e })));
    }

    // ════════ L01 — Greeting Roleplay ════════
    await insertBlocks("L01", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "dialogue",
        content: {
          scenario: "Latihan sapaan tiga waktu berbeda dalam satu hari.",
          turns: [
            { npcKana: "（朝、同僚に会いました）", prompt: "Pagi hari, Anda bertemu rekan kerja. Sapaan yang tepat?", choices: [{ id: "a", kana: "おはようございます。", correct: true }, { id: "b", kana: "こんばんは。", correct: false }, { id: "c", kana: "おやすみなさい。", correct: false }] },
            { npcKana: "（午後、また会いました）", prompt: "Siang harinya, Anda bertemu lagi. Sapaan yang tepat?", choices: [{ id: "a", kana: "こんにちは。", correct: true }, { id: "b", kana: "おはようございます。", correct: false }, { id: "c", kana: "はじめまして。", correct: false }] },
            { npcKana: "（夜、帰る前に会いました）", prompt: "Malam hari sebelum pulang, Anda bertemu sekali lagi. Sapaan yang tepat?", choices: [{ id: "a", kana: "こんばんは。", correct: true }, { id: "b", kana: "こんにちは。", correct: false }, { id: "c", kana: "いくらですか。", correct: false }] },
          ],
          closingNote: "Tiga sapaan waktu yang sama sekali berbeda dalam satu hari — pastikan Anda bisa membedakannya secara refleks.",
        } satisfies MultiTurnDialogueContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "Sapaan yang berubah sesuai waktu hari, urut dari pagi...",
        options: [{ id: 1, label: "おはようございます → こんにちは → こんばんは" }, { id: 2, label: "こんばんは → こんにちは → おはようございます" }, { id: 3, label: "こんにちは saja sepanjang hari" }],
        correctOptionId: 1,
        explanation: "Urutan waktu: pagi (おはようございます) → siang (こんにちは) → malam (こんばんは).",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — First Meeting Roleplay ════════
    await insertBlocks("L02", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "dialogue",
        content: {
          scenario: "Latihan perkenalan diri lengkap dari awal sampai akhir.",
          turns: [
            { npcKana: "（新しい人に会いました）", prompt: "Anda bertemu orang baru. Bagaimana Anda membuka?", choices: [{ id: "a", kana: "はじめまして。", correct: true }, { id: "b", kana: "ありがとうございます。", correct: false }, { id: "c", kana: "すみません。", correct: false }] },
            { npcKana: "はじめまして。田中です。", prompt: "Orang itu menyebut namanya. Sebutkan nama Anda.", choices: [{ id: "a", kana: "アスロです。", correct: true }, { id: "b", kana: "二十五歳です。", correct: false }, { id: "c", kana: "学生です。", correct: false }] },
            { npcKana: "アスロさんは何人ですか。", prompt: "Ditanya kewarganegaraan Anda.", choices: [{ id: "a", kana: "インドネシア人です。", correct: true }, { id: "b", kana: "日本です。", correct: false }, { id: "c", kana: "いいですね。", correct: false }] },
            { npcKana: "そうですか。よろしくお願いします。", prompt: "Menutup perkenalan.", choices: [{ id: "a", kana: "よろしくお願いします。", correct: true }, { id: "b", kana: "おやすみなさい。", correct: false }, { id: "c", kana: "いくらですか。", correct: false }] },
          ],
          closingNote: "Perkenalan diri lengkap 4-giliran — pola yang sama dari Fase 3, sekarang khusus untuk latihan lisan berulang.",
        } satisfies MultiTurnDialogueContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "Empat elemen perkenalan diri lengkap urutannya...",
        options: [{ id: 1, label: "はじめまして → nama → kewarganegaraan → よろしくお願いします" }, { id: 2, label: "よろしくお願いします → はじめまして → nama" }, { id: 3, label: "Nama saja sudah cukup" }],
        correctOptionId: 1,
        explanation: "Urutan standar: buka dengan はじめまして, sebut nama, jawab pertanyaan lanjutan, tutup dengan よろしくお願いします.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Asking for Help (Roleplay) ════════
    await insertBlocks("L03", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "dialogue",
        content: {
          scenario: "Anda tersesat dan butuh bantuan orang asing.",
          turns: [
            { npcKana: "（道に迷いました）", prompt: "Anda tersesat. Bagaimana Anda memulai meminta bantuan?", choices: [{ id: "a", kana: "すみません。", correct: true }, { id: "b", kana: "こんばんは。", correct: false }, { id: "c", kana: "いただきます。", correct: false }] },
            { npcKana: "はい、何でしょうか。", prompt: "Orang itu bersedia membantu. Bagaimana Anda meminta bantuannya?", choices: [{ id: "a", kana: "お願いします。駅はどこですか。", correct: true }, { id: "b", kana: "ありがとうございます。", correct: false }, { id: "c", kana: "いいですね。", correct: false }] },
            { npcKana: "あそこです。", prompt: "Orang itu menunjukkan arahnya. Bagaimana Anda menutup?", choices: [{ id: "a", kana: "ありがとうございます。", correct: true }, { id: "b", kana: "すみません。", correct: false }, { id: "c", kana: "はじめまして。", correct: false }] },
          ],
          closingNote: "すみません (buka) → お願いします+pertanyaan (minta bantuan) → ありがとうございます (tutup) — pola meminta bantuan yang bisa dipakai di banyak situasi.",
        } satisfies MultiTurnDialogueContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Pola dasar meminta bantuan dari orang asing...",
        options: [{ id: 1, label: "すみません → permintaan → ありがとうございます" }, { id: 2, label: "ありがとうございます → すみません" }, { id: 3, label: "Langsung bertanya tanpa pembuka" }],
        correctOptionId: 1,
        explanation: "すみません membuka, sampaikan permintaan, ありがとうございます menutup.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Classroom Roleplay ════════
    await insertBlocks("L04", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "dialogue",
        content: {
          scenario: "Latihan lisan skenario kelas — review dari Fase 5.",
          turns: [
            { npcKana: "「いただきます」について勉強します。", prompt: "Guru menjelaskan cepat. Minta pelan-pelan.", choices: [{ id: "a", kana: "ゆっくりお願いします。", correct: true }, { id: "b", kana: "ありがとうございます。", correct: false }, { id: "c", kana: "いくらですか。", correct: false }] },
            { npcKana: "はい、わかりました。", prompt: "Guru bersedia. Bagaimana Anda konfirmasi paham setelah penjelasan?", choices: [{ id: "a", kana: "わかりました。", correct: true }, { id: "b", kana: "わかりません。", correct: false }, { id: "c", kana: "そうですね。", correct: false }] },
          ],
          closingNote: "Kombinasi minta pelan + konfirmasi paham — dua alat kontrol percakapan paling penting di kelas.",
        } satisfies MultiTurnDialogueContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "Setelah paham penjelasan guru, respons yang tepat...",
        options: [{ id: 1, label: "わかりました" }, { id: 2, label: "わかりません" }, { id: 3, label: "ちょっと…" }],
        correctOptionId: 1,
        explanation: "わかりました = \"saya mengerti\" — respons setelah paham.",
        audioUrl: null,
      },
    ]);

    // ════════ L05 — Free Basic Social Conversation ════════
    await insertBlocks("L05", [{ blockType: "callout", content: AI_UNAVAILABLE_NOTE }]);

    await insertExercises("L05", [
      {
        exerciseType: "concept_mcq",
        prompt: "Kalau lawan bicara AI (hipotetis) bertanya はじめまして sebagai pembuka, respons yang tepat...",
        options: [{ id: 1, label: "はじめまして。[nama]です。" }, { id: 2, label: "ありがとうございます。" }, { id: 3, label: "いいえ。" }],
        correctOptionId: 1,
        explanation: "はじめまして dibalas dengan はじめまして + perkenalan diri.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalau lawan bicara bertanya lanjutan お仕事は何ですか (pekerjaan Anda apa?), respons yang tepat...",
        options: [{ id: 1, label: "[Status/pekerjaan Anda]です。" }, { id: 2, label: "二十五歳です。" }, { id: 3, label: "五百円です。" }],
        correctOptionId: 1,
        explanation: "お仕事は何ですか menanyakan pekerjaan — dijawab dengan status/pekerjaan, bukan umur atau harga.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M05 Fase 8 (P8) id=${phase.id}: 5 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m05-phase8 gagal:", error);
  process.exit(1);
});
