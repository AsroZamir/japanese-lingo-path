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
  MultiTurnDialogueContent,
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 5.txt Fase 3. L05 pemakaian pertama
// MultiTurnDialogue — "Native character -> user introduction -> follow-up
// question -> user response -> closing" adalah roleplay skrip 3-giliran,
// persis yang mesin ini dirancang untuk.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "table"; content: TableBlockContent; narrationText?: string }
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

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M05"));
    if (!module_) throw new Error("M05 belum ada.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P3",
        titleId: "Self Introduction",
        orderIndex: 3,
        descriptionId: "Pertemuan pertama, menyebut nama, asal negara, dan roleplay perkenalan diri.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "First Meeting", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Saying Your Name", lessonType: "orientation", orderIndex: 2, romajiPolicy: "always" as const },
      { code: "L03", titleId: "Where Are You From?", lessonType: "orientation", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Basic Personal Introduction", lessonType: "orientation", orderIndex: 4, romajiPolicy: "on_demand" as const },
      { code: "L05", titleId: "Self-Introduction Roleplay", lessonType: "orientation_practice", orderIndex: 5, romajiPolicy: "always" as const },
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

    // ════════ L01 — First Meeting ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "はじめまして cuma dipakai SEKALI — pertama kali bertemu seseorang, tidak pernah lagi setelahnya. よろしくお願いします menutup perkenalan dengan harapan hubungan baik ke depan — ungkapan yang akan sangat sering Anda dengar di berbagai konteks, bukan cuma perkenalan.",
        content: {
          kind: "paragraphs",
          heading: "Pertemuan pertama",
          paragraphs: [
            "はじめまして (hajimemashite) = \"senang berkenalan\" — HANYA dipakai saat pertama kali bertemu seseorang, tidak pernah dipakai lagi setelah itu.",
            "よろしくお願いします (yoroshiku onegaishimasu) menutup perkenalan — kurang lebih \"mohon bantuannya/kerja samanya ke depan\". Urutan sosial standarnya: はじめまして → [perkenalan diri] → よろしくお願いします.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "はじめまして dipakai...",
        options: [{ id: 1, label: "Setiap kali bertemu siapapun" }, { id: 2, label: "Hanya saat pertama kali bertemu seseorang" }, { id: 3, label: "Cuma di acara resmi" }],
        correctOptionId: 2,
        explanation: "はじめまして hanya untuk pertemuan PERTAMA — tidak pernah dipakai lagi setelahnya ke orang yang sama.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Urutan sosial standar perkenalan pertama...",
        options: [
          { id: 1, label: "よろしくお願いします → はじめまして" },
          { id: 2, label: "はじめまして → perkenalan diri → よろしくお願いします" },
          { id: 3, label: "Perkenalan diri saja, tanpa sapaan" },
        ],
        correctOptionId: 2,
        explanation: "はじめまして membuka, perkenalan diri di tengah, よろしくお願いします menutup.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Saying Your Name ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Menyebut nama",
          paragraphs: [
            "私は＿＿＿です (watashi wa ___ desu) = \"saya ___\" — pola paling dasar menyebut nama sendiri. 私 (watashi) = saya, boleh dihilangkan kalau sudah jelas dari konteks.",
            "Review dari M04: 名前 (namae) = nama, お名前は何ですか = \"siapa nama Anda?\" (bertanya ke orang lain).",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 私 (saya), dalam romaji.",
        options: [{ id: 1, label: "わたし" }],
        correctOptionId: 1,
        explanation: "私 dibaca \"watashi\".",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Pola dasar menyebut nama sendiri...",
        options: [{ id: 1, label: "私は＿＿＿です" }, { id: 2, label: "＿＿＿は私です" }, { id: 3, label: "私＿＿＿ですか" }],
        correctOptionId: 1,
        explanation: "私は＿＿＿です = \"saya ___\" — pola paling dasar.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Where Are You From? ════════
    await insertBlocks("L03", [
      {
        blockType: "text",
        narrationText: "Ini review langsung dari M04 Fase 6 — pola negara+人 yang sama, sekarang dipakai dalam konteks perkenalan diri.",
        content: {
          kind: "paragraphs",
          heading: "Menyebut asal negara",
          paragraphs: [
            "Review dari M04: 国 (kuni) = negara, negara+人 = kewarganegaraan. インドネシア人です = \"saya orang Indonesia.\"",
          ],
        } satisfies TextBlockContent,
      },
      { blockType: "callout", content: { kind: "tip", body: "Pola ini sama persis dengan yang sudah Anda pelajari di M04 — bukan materi baru, cuma dipakai lagi dalam konteks perkenalan." } satisfies CalloutBlockContent },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Cara menyatakan \"saya orang Indonesia\"...",
        options: [{ id: 1, label: "インドネシア人です" }, { id: 2, label: "インドネシアです" }, { id: 3, label: "インドネシア語です" }],
        correctOptionId: 1,
        explanation: "インドネシア人です — review dari M04 Fase 6.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Basic Personal Introduction ════════
    await insertBlocks("L04", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Menggabungkan semua",
          paragraphs: [
            "Perkenalan diri dasar menggabungkan lima elemen yang sudah Anda kuasai: nama, negara, umur, status pelajar/kerja, dan sekarang — status belajar bahasa Jepang Anda sendiri.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Contoh perkenalan lengkap",
          columns: ["Elemen", "Contoh"],
          rows: [
            ["Nama", "アスロです。"],
            ["Negara", "インドネシア人です。"],
            ["Umur", "二十五歳です。"],
            ["Status", "学生です。"],
            ["Belajar Jepang", "日本語を勉強しています。"],
          ],
        } satisfies TableBlockContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "日本語を勉強しています artinya...",
        options: [{ id: 1, label: "Saya orang Jepang" }, { id: 2, label: "Saya sedang belajar bahasa Jepang" }, { id: 3, label: "Saya guru bahasa Jepang" }],
        correctOptionId: 2,
        explanation: "日本語を勉強しています = \"saya sedang belajar bahasa Jepang.\"",
        audioUrl: null,
      },
    ]);

    // ════════ L05 — Self-Introduction Roleplay ════════
    await insertBlocks("L05", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "dialogue",
        content: {
          scenario: "Anda bertemu teman baru di kelas bahasa Jepang. Ini pertemuan pertama Anda.",
          turns: [
            {
              npcKana: "はじめまして。田中です。よろしくお願いします。",
              prompt: "Teman baru Anda memperkenalkan diri. Bagaimana Anda merespons?",
              choices: [
                { id: "a", kana: "はじめまして。アスロです。よろしくお願いします。", correct: true },
                { id: "b", kana: "ありがとうございます。", correct: false },
                { id: "c", kana: "すみません。", correct: false },
              ],
            },
            {
              npcKana: "アスロさんは何人ですか。",
              prompt: "田中-san menanyakan kewarganegaraan Anda.",
              choices: [
                { id: "a", kana: "インドネシア人です。", correct: true },
                { id: "b", kana: "二十五歳です。", correct: false },
                { id: "c", kana: "学生です。", correct: false },
              ],
            },
            {
              npcKana: "そうですか。よろしくお願いします。",
              prompt: "田中-san menutup perkenalan. Bagaimana Anda menutupnya juga?",
              choices: [
                { id: "a", kana: "よろしくお願いします。", correct: true },
                { id: "b", kana: "おやすみなさい。", correct: false },
                { id: "c", kana: "いくらですか。", correct: false },
              ],
            },
          ],
          closingNote: "Anda baru saja menyelesaikan perkenalan diri lengkap: buka dengan はじめまして, sebut nama, jawab pertanyaan lanjutan, tutup dengan よろしくお願いします.",
        } satisfies MultiTurnDialogueContent,
      },
    ]);

    await insertExercises("L05", [
      {
        exerciseType: "concept_mcq",
        prompt: "Setelah menjawab pertanyaan lanjutan dari lawan bicara, cara menutup perkenalan yang wajar...",
        options: [{ id: 1, label: "よろしくお願いします" }, { id: 2, label: "さようなら langsung" }, { id: 3, label: "Diam tanpa respons" }],
        correctOptionId: 1,
        explanation: "よろしくお願いします adalah penutup standar perkenalan diri.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M05 Fase 3 (P3) id=${phase.id}: 5 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m05-phase3 gagal:", error);
  process.exit(1);
});
