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
  DialogueBlockContent,
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 5.txt Fase 2.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "table"; content: TableBlockContent; narrationText?: string }
  | { blockType: "dialogue"; content: DialogueBlockContent; narrationText?: string }
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
        code: "P2",
        titleId: "Thanking, Apologizing & Politeness",
        orderIndex: 2,
        descriptionId: "Berterima kasih, meminta maaf, meminta perhatian, dan potongan permintaan sopan.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Thank You", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Apology", lessonType: "orientation", orderIndex: 2, romajiPolicy: "always" as const },
      { code: "L03", titleId: "Excuse Me / Getting Attention", lessonType: "orientation", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Polite Request Chunks", lessonType: "orientation", orderIndex: 4, romajiPolicy: "on_demand" as const },
      { code: "L05", titleId: "Social Response Lab", lessonType: "orientation_practice", orderIndex: 5, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Thank You ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "Tiga cara berterima kasih ini bukan sekadar pilihan bebas — masing-masing membawa nuansa kesopanan yang berbeda, dan memilih yang salah bisa terdengar terlalu santai atau terlalu berlebihan tergantung situasinya.",
        content: {
          kind: "paragraphs",
          heading: "Berterima kasih",
          paragraphs: [
            "ありがとう (arigatou) = terima kasih, santai — untuk teman dekat.",
            "ありがとうございます (arigatou gozaimasu) = terima kasih, sopan — untuk kebanyakan situasi sehari-hari, orang yang tidak terlalu akrab.",
            "どうも (doumo) = ucapan singkat, bisa berarti \"terima kasih\" ringan atau sekadar sapaan singkat tergantung konteks — dipakai ke siapa saja secara netral.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Kapan dipakai",
          columns: ["Ungkapan", "Tingkat", "Situasi"],
          rows: [
            ["ありがとう", "Santai", "Teman dekat, keluarga"],
            ["ありがとうございます", "Sopan", "Kebanyakan situasi sehari-hari"],
            ["どうも", "Netral/singkat", "Ucapan cepat, situasi santai-formal"],
          ],
        } satisfies TableBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "Bentuk terima kasih yang paling sopan untuk situasi sehari-hari adalah...",
        options: [{ id: 1, label: "ありがとう" }, { id: 2, label: "ありがとうございます" }, { id: 3, label: "どうも" }],
        correctOptionId: 2,
        explanation: "ありがとうございます adalah bentuk sopan, cocok untuk kebanyakan situasi sehari-hari.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk ありがとう, dalam romaji.",
        options: [{ id: 1, label: "ありがとう" }],
        correctOptionId: 1,
        explanation: "ありがとう dibaca persis seperti tertulis: arigatou.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Apology ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        narrationText:
          "Ini pasangan yang sering membingungkan pemula karena keduanya bisa diterjemahkan 'maaf' — tapi bobotnya berbeda jauh. すみません jauh lebih ringan dan lebih sering dipakai daripada yang mungkin Anda kira, sementara ごめんなさい dicadangkan untuk kesalahan yang lebih terasa personal.",
        content: {
          kind: "paragraphs",
          heading: "Meminta maaf",
          paragraphs: [
            "ごめんなさい (gomen nasai) = maaf, untuk kesalahan yang lebih personal/terasa — ke teman, keluarga, situasi santai-menengah.",
            "すみません (sumimasen) = lebih serbaguna — bisa berarti \"maaf\" (kesalahan ringan) TAPI JUGA \"permisi\" (meminta perhatian). Konteksnya menentukan artinya.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "important",
          body: "すみません adalah salah satu kata paling serbaguna dalam bahasa Jepang sehari-hari — dipakai untuk minta maaf RINGAN, memanggil pelayan, menyela pembicaraan, bahkan sekadar basa-basi sopan. Anda akan menemuinya berkali-kali di modul ini.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "すみません bisa berarti...",
        options: [{ id: 1, label: "Hanya \"maaf\"" }, { id: 2, label: "\"Maaf\" ATAU \"permisi\", tergantung konteks" }, { id: 3, label: "Hanya \"permisi\"" }],
        correctOptionId: 2,
        explanation: "すみません serbaguna — bisa \"maaf\" (kesalahan ringan) atau \"permisi\" (meminta perhatian).",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "ごめんなさい cenderung dipakai untuk...",
        options: [{ id: 1, label: "Kesalahan yang lebih personal/terasa" }, { id: 2, label: "Memanggil pelayan" }, { id: 3, label: "Sapaan formal" }],
        correctOptionId: 1,
        explanation: "ごめんなさい untuk kesalahan yang lebih personal — ke teman, keluarga.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Excuse Me / Getting Attention ════════
    await insertBlocks("L03", [
      {
        blockType: "text",
        narrationText:
          "Ini fungsi すみません yang KEDUA — bukan minta maaf, tapi meminta perhatian. Bentuknya sama persis, cuma niatnya berbeda, dan konteks di sekitarnya yang membuat pendengar tahu mana yang Anda maksud.",
        content: {
          kind: "paragraphs",
          heading: "Meminta perhatian",
          paragraphs: [
            "すみません juga dipakai untuk memanggil perhatian orang — pelayan toko (店員), guru, atau orang asing yang ingin Anda tanyai sesuatu. Bentuknya sama dengan すみません permintaan maaf, cuma niatnya beda.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "dialogue",
        content: {
          openingKana: "（店員を探しています）",
          prompt: "Anda ingin bertanya sesuatu ke pelayan toko yang sedang sibuk. Bagaimana Anda memulai?",
          choices: [
            { id: "a", kana: "すみません。", correct: true },
            { id: "b", kana: "おやすみなさい。", correct: false },
            { id: "c", kana: "ありがとうございます。", correct: false },
          ],
          followUpKana: "はい、何でしょうか。",
          followUpNarrative: "Pelayan toko menoleh dan menanyakan apa yang Anda butuhkan.",
          closingNote: "すみません adalah cara paling umum untuk memulai percakapan dengan orang asing atau pelayan.",
        } satisfies DialogueBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Cara paling umum memanggil perhatian pelayan toko...",
        options: [{ id: 1, label: "すみません" }, { id: 2, label: "こんばんは" }, { id: 3, label: "さようなら" }],
        correctOptionId: 1,
        explanation: "すみません adalah cara umum memanggil perhatian, termasuk ke pelayan toko.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Polite Request Chunks ════════
    await insertBlocks("L04", [
      {
        blockType: "text",
        narrationText:
          "Empat potongan kalimat ini akan sering Anda pakai begitu mulai berlatih percakapan — お願いします dan ください keduanya berarti 'tolong', tapi dipakai dengan cara yang sedikit berbeda.",
        content: {
          kind: "paragraphs",
          heading: "Potongan permintaan sopan",
          paragraphs: [
            "お願いします (onegaishimasu) = \"tolong\" / \"mohon\" — dipakai berdiri sendiri atau setelah kata benda.",
            "ください (kudasai) = \"tolong berikan\" — dipakai setelah kata benda untuk meminta sesuatu.",
            "もう一度お願いします (mou ichido onegaishimasu) = \"tolong sekali lagi\" — minta pengulangan.",
            "ゆっくりお願いします (yukkuri onegaishimasu) = \"tolong pelan-pelan\" — minta bicara lebih lambat.",
          ],
        } satisfies TextBlockContent,
      },
      { blockType: "callout", content: SPEAKING_NOTE },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "もう一度お願いします artinya...",
        options: [{ id: 1, label: "Tolong pelan-pelan" }, { id: 2, label: "Tolong sekali lagi" }, { id: 3, label: "Tolong bantu saya" }],
        correctOptionId: 2,
        explanation: "もう一度お願いします = \"tolong sekali lagi\" — minta pengulangan.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk ください, dalam romaji.",
        options: [{ id: 1, label: "ください" }],
        correctOptionId: 1,
        explanation: "ください dibaca persis seperti tertulis: kudasai.",
        audioUrl: null,
      },
    ]);

    // ════════ L05 — Social Response Lab ════════
    await insertBlocks("L05", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "dialogue",
        content: {
          openingKana: "（本を落としてしまいました）",
          prompt: "Anda tidak sengaja menjatuhkan buku di depan orang lain. Bagaimana Anda merespons?",
          choices: [
            { id: "a", kana: "ごめんなさい。", correct: true },
            { id: "b", kana: "ありがとうございます。", correct: false },
            { id: "c", kana: "おはようございます。", correct: false },
          ],
          followUpKana: "大丈夫ですよ。",
          followUpNarrative: "Orang itu menjawab bahwa tidak apa-apa.",
          closingNote: "ごめんなさい cocok untuk kesalahan kecil yang personal seperti ini.",
        } satisfies DialogueBlockContent,
      },
    ]);

    await insertExercises("L05", [
      {
        exerciseType: "concept_mcq",
        prompt: "Urutan yang tepat kalau Anda ingin bertanya sesuatu ke orang asing di jalan...",
        options: [
          { id: 1, label: "すみません → pertanyaan → ありがとうございます" },
          { id: 2, label: "ありがとうございます → pertanyaan → すみません" },
          { id: 3, label: "ごめんなさい → すみません → pertanyaan" },
        ],
        correctOptionId: 1,
        explanation: "Mulai dengan すみません untuk menarik perhatian, sampaikan pertanyaan, tutup dengan terima kasih.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat sopan untuk meminta orang bicara lebih pelan...",
        options: [{ id: 1, label: "もう一度お願いします" }, { id: 2, label: "ゆっくりお願いします" }, { id: 3, label: "ください" }],
        correctOptionId: 2,
        explanation: "ゆっくりお願いします = \"tolong pelan-pelan.\"",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M05 Fase 2 (P2) id=${phase.id}: 5 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m05-phase2 gagal:", error);
  process.exit(1);
});
