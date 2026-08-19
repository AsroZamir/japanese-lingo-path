import { sql, inArray, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons, lessonContentBlocks, lessonExercises } from "../db/schema/kana";
import type { CalloutBlockContent, MultiTurnDialogueContent, LessonExerciseOption } from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 5.txt Fase 9. L03 "No-Choice
// Challenge" eksplisit "no multiple choice, user speaks, AI evaluates"
// — genuinely butuh AI percakapan + evaluasi. L01/L02/L04 murni
// recall/consolidation, bisa diuji lewat concept_mcq/typing/dialogue
// skrip tanpa AI.

type BlockInput =
  | { blockType: "callout"; content: CalloutBlockContent }
  | { blockType: "dialogue"; content: MultiTurnDialogueContent };

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
  body: "Tantangan tanpa pilihan jawaban (Anda bicara bebas, AI menilai) BELUM TERSEDIA di aplikasi ini. Di bawah ini situasi tetap ditampilkan, dengan versi pilihan-ganda sebagai gantinya — bukan simulasi AI sungguhan.",
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
        code: "P9",
        titleId: "Consolidation & Active Recall",
        orderIndex: 9,
        descriptionId: "Recall ekspresi, ganti konteks, tantangan tanpa pilihan, dan tantangan sosial campuran.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Expression Recall", lessonType: "orientation_practice", orderIndex: 1, romajiPolicy: "hidden" as const },
      { code: "L02", titleId: "Context Switching", lessonType: "orientation_practice", orderIndex: 2, romajiPolicy: "hidden" as const },
      { code: "L03", titleId: "No-Choice Challenge", lessonType: "orientation_practice", orderIndex: 3, romajiPolicy: "hidden" as const },
      { code: "L04", titleId: "Mixed Social Challenge", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Expression Recall ════════
    await insertExercises("L01", [
      {
        exerciseType: "typing",
        prompt: "Arti: \"terima kasih (santai)\". Ketik ungkapan Jepangnya dalam romaji.",
        options: [{ id: 1, label: "どうも" }],
        correctOptionId: 1,
        explanation: "どうも (doumo) adalah ucapan terima kasih paling santai dari tiga tingkat yang dipelajari.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Situasi: Anda menabrak bahu orang tanpa sengaja di jalan yang ramai. Ungkapan yang tepat...",
        options: [{ id: 1, label: "すみません。" }, { id: 2, label: "ありがとうございます。" }, { id: 3, label: "いいですね。" }],
        correctOptionId: 1,
        explanation: "すみません dipakai untuk kesalahan kecil/insidental seperti ini.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Anda dengar seseorang berkata どういたしまして setelah Anda mengucapkan sesuatu. Apa yang tadi Anda ucapkan?",
        options: [{ id: 1, label: "ありがとうございます。" }, { id: 2, label: "すみません。" }, { id: 3, label: "はじめまして。" }],
        correctOptionId: 1,
        explanation: "どういたしまして (sama-sama) adalah respons terhadap ucapan terima kasih.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan (romaji) untuk ungkapan \"tolong pelan-pelan\".",
        options: [{ id: 1, label: "ゆっくりおねがいします" }],
        correctOptionId: 1,
        explanation: "ゆっくりお願いします dibaca \"yukkuri onegaishimasu.\"",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Context Switching ════════
    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "すみません bisa berarti \"maaf\" ATAU \"permisi\" tergantung konteks. Saat Anda memanggil pelayan restoran, fungsinya adalah...",
        options: [{ id: 1, label: "Meminta perhatian (permisi)" }, { id: 2, label: "Meminta maaf" }, { id: 3, label: "Berterima kasih" }],
        correctOptionId: 1,
        explanation: "Memanggil pelayan = fungsi \"permisi/meminta perhatian\", bukan permintaan maaf, walau katanya sama persis.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Ungkapan yang sama, ちょっと..., dipakai untuk menolak undangan teman dekat maupun atasan. Kenapa ungkapan ini cocok untuk keduanya?",
        options: [{ id: 1, label: "Karena bentuknya sangat halus dan tidak langsung, cocok lintas tingkat kesopanan" }, { id: 2, label: "Karena artinya berubah tergantung siapa yang bicara" }, { id: 3, label: "Karena hanya dipakai pada situasi formal" }],
        correctOptionId: 1,
        explanation: "ちょっと... adalah penolakan halus yang tidak menyebut alasan eksplisit — fleksibel dipakai di berbagai tingkat kedekatan karena tidak terdengar kasar di situasi manapun.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "こんにちは dan こんばんは TIDAK punya versi lebih sopan lagi (beda dengan おはよう/おはようございます). Kenapa demikian secara register?",
        options: [{ id: 1, label: "Karena keduanya sudah netral secara kesopanan sejak awal" }, { id: 2, label: "Karena keduanya termasuk kata kasar" }, { id: 3, label: "Karena keduanya hanya dipakai pada anak-anak" }],
        correctOptionId: 1,
        explanation: "こんにちは/こんばんは sudah netral (bisa dipakai ke siapa saja) — berbeda dari おはよう yang punya pasangan santai/sopan eksplisit.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — No-Choice Challenge ════════
    await insertBlocks("L03", [{ blockType: "callout", content: AI_UNAVAILABLE_NOTE }]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Situasi: Anda baru masuk toko dan pelayan berkata いらっしゃいませ。何かお探しですか。 (Selamat datang. Sedang mencari sesuatu?) Respons yang relevan...",
        options: [{ id: 1, label: "いいえ、大丈夫です。見ているだけです。 (Tidak, tidak apa-apa. Cuma lihat-lihat.)" }, { id: 2, label: "はじめまして。" }, { id: 3, label: "いくらですか。" }],
        correctOptionId: 1,
        explanation: "Menjawab dengan menolak halus + alasan singkat adalah respons paling wajar saat belum butuh bantuan spesifik.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Situasi: Teman bertanya 週末何をしますか。 (Akhir pekan mau ngapain?) tapi Anda belum tahu jawabannya. Respons paling wajar...",
        options: [{ id: 1, label: "まだわかりません。 (Belum tahu.)" }, { id: 2, label: "ありがとうございます。" }, { id: 3, label: "すみません、初めまして。" }],
        correctOptionId: 1,
        explanation: "まだわかりません (belum tahu) adalah respons jujur dan wajar untuk pertanyaan yang belum ada jawabannya.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Mixed Social Challenge ════════
    await insertBlocks("L04", [
      {
        blockType: "dialogue",
        content: {
          scenario: "Acara kantor: Anda bertemu rekan baru dan melalui rangkaian interaksi sosial lengkap dalam satu percakapan — sapaan, perkenalan, terima kasih, minta maaf, permintaan, klarifikasi, dan penutup.",
          turns: [
            { npcKana: "（会社のイベントで会いました）", prompt: "Sore hari, Anda bertemu rekan baru pertama kali. Bagaimana Anda membuka?", choices: [{ id: "a", kana: "こんにちは。はじめまして。", correct: true }, { id: "b", kana: "おやすみなさい。", correct: false }, { id: "c", kana: "いくらですか。", correct: false }] },
            { npcKana: "はじめまして。鈴木です。", prompt: "Dia menyebut namanya. Perkenalkan diri Anda.", choices: [{ id: "a", kana: "アスロです。よろしくお願いします。", correct: true }, { id: "b", kana: "五百円です。", correct: false }, { id: "c", kana: "そうですね。", correct: false }] },
            { npcKana: "アスロさんは何人ですか。", prompt: "Ditanya kewarganegaraan. Jawab.", choices: [{ id: "a", kana: "インドネシア人です。", correct: true }, { id: "b", kana: "日本語です。", correct: false }, { id: "c", kana: "学生です。", correct: false }] },
            { npcKana: "（鈴木さんが飲み物を持ってきてくれました）", prompt: "Rekan itu membawakan Anda minuman. Berterima kasihlah.", choices: [{ id: "a", kana: "ありがとうございます。", correct: true }, { id: "b", kana: "ごめんなさい。", correct: false }, { id: "c", kana: "いいえ。", correct: false }] },
            { npcKana: "（アスロさんが誤って鈴木さんの飲み物をこぼしてしまいました）", prompt: "Anda tidak sengaja menumpahkan minuman rekan itu. Minta maaflah.", choices: [{ id: "a", kana: "すみません！大丈夫ですか。", correct: true }, { id: "b", kana: "ありがとうございます。", correct: false }, { id: "c", kana: "いいですね。", correct: false }] },
            { npcKana: "大丈夫ですよ。あ、ティッシュ取ってもらえますか。", prompt: "Dia minta tolong ambilkan tisu. Anda ingin memastikan Anda paham — minta dia mengulang dulu sebelum membantu.", choices: [{ id: "a", kana: "すみません、もう一度お願いします。", correct: true }, { id: "b", kana: "はじめまして。", correct: false }, { id: "c", kana: "いくらですか。", correct: false }] },
            { npcKana: "ティッシュを取ってもらえますか、と言いました。", prompt: "Dia mengulang lebih jelas. Sekarang tutup percakapan dengan sopan setelah membantu.", choices: [{ id: "a", kana: "はい、どうぞ。今日は会えてよかったです。", correct: true }, { id: "b", kana: "いいえ、わかりません。", correct: false }, { id: "c", kana: "こんばんは。", correct: false }] },
          ],
          closingNote: "Anda baru saja melewati tujuh fungsi sosial dalam satu percakapan: sapaan, perkenalan, terima kasih, minta maaf, permintaan, klarifikasi, dan penutup — rangkuman seluruh M05.",
        } satisfies MultiTurnDialogueContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "Tujuh fungsi sosial yang baru saja Anda latih dalam roleplay di atas mencakup semua BERIKUT INI, kecuali...",
        options: [{ id: 1, label: "Menawar harga" }, { id: 2, label: "Meminta klarifikasi" }, { id: 3, label: "Meminta maaf" }],
        correctOptionId: 1,
        explanation: "Roleplay mencakup sapaan, perkenalan, terima kasih, minta maaf, permintaan, klarifikasi, dan penutup — tidak termasuk tawar-menawar harga.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M05 Fase 9 (P9) id=${phase.id}: 4 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m05-phase9 gagal:", error);
  process.exit(1);
});
