import { sql, inArray, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons, kanaExampleWords, lessonContentBlocks, lessonExercises } from "../db/schema/kana";
import type { TextBlockContent, AudioListBlockContent, LessonExerciseOption } from "../app/lib/lesson-content-types";

// M03 Fase 4 — Loanword Reading Lab (docs/curriculum/M03.md "Fase 4").
// L01-L03 are pure reading_practice, themed by an explicit word list in
// page.tsx (READING_THEME_BY_CODE) — no lesson_content_blocks needed,
// LessonReading builds everything live via getWordsByKana(). Only L04
// (Nama/Tempat/Teks Dunia Nyata) is narrative and needs seeded content,
// same pattern as seed-m02-phase4-reading.ts's L03.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "audio_list"; content: AudioListBlockContent; narrationText?: string };

type ExerciseInput = {
  exerciseType: "concept_mcq";
  prompt: string;
  options: LessonExerciseOption[];
  correctOptionId: number;
  explanation: string;
  audioUrl: string | null;
};

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M03"));
    if (!module_) throw new Error("M03 belum ada.");

    const wordRows = await db
      .select({ wordKana: kanaExampleWords.wordKana, audioUrl: kanaExampleWords.audioUrl })
      .from(kanaExampleWords)
      .where(inArray(kanaExampleWords.wordKana, ["アメリカ", "ワイン"]));
    const wordAudioByKana = new Map(wordRows.map((r) => [r.wordKana, r.audioUrl]));

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P18",
        titleId: "Loanword Reading Lab",
        orderIndex: 18,
        descriptionId: "Membaca kosakata serapan nyata per tema — sehari-hari, makanan, teknologi, nama/tempat.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Kosakata Sehari-hari", lessonType: "reading_practice", orderIndex: 1, romajiPolicy: "on_demand" as const },
      { code: "L02", titleId: "Makanan & Minuman", lessonType: "reading_practice", orderIndex: 2, romajiPolicy: "on_demand" as const },
      { code: "L03", titleId: "Teknologi & Kehidupan Modern", lessonType: "reading_practice", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Nama, Tempat & Teks Dunia Nyata", lessonType: "orientation_practice", orderIndex: 4, romajiPolicy: "always" as const },
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
    const l04Id = lessonIdByCode.get("L04")!;

    await db.delete(lessonContentBlocks).where(inArray(lessonContentBlocks.lessonId, [l04Id]));
    await db.delete(lessonExercises).where(inArray(lessonExercises.lessonId, [l04Id]));

    async function insertBlocks(blocks: BlockInput[]) {
      await db.insert(lessonContentBlocks).values(
        blocks.map((b, i) => ({ lessonId: l04Id, orderIndex: i + 1, blockType: b.blockType, content: b.content, narrationText: b.narrationText ?? null })),
      );
    }
    async function insertExercises(exercises: ExerciseInput[]) {
      await db.insert(lessonExercises).values(exercises.map((e, i) => ({ lessonId: l04Id, orderIndex: i + 1, ...e })));
    }

    // ════════ L04 — Nama, Tempat & Teks Dunia Nyata ════════
    await insertBlocks([
      {
        blockType: "text",
        narrationText:
          "Ini aturan yang tidak berubah-ubah: nama orang, negara, atau kota di luar Jepang HAMPIR SELALU ditulis Katakana, tanpa kecuali. Nama Anda sendiri pun, kalau ditulis dalam bahasa Jepang, akan pakai Katakana — bukan Hiragana atau Kanji.",
        content: {
          kind: "paragraphs",
          heading: "Nama asing selalu pakai Katakana",
          paragraphs: [
            "Aturan ini konsisten: nama orang, negara, kota, atau tempat yang berasal dari luar Jepang ditulis dengan Katakana. Indonesia menjadi インドネシア, Amerika menjadi アメリカ — sudah Anda temui sejak awal modul ini.",
            "Ini juga berlaku untuk nama Anda sendiri kalau ditulis dalam huruf Jepang — bukan Hiragana, bukan Kanji, tapi Katakana.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "audio_list",
        content: {
          heading: "Nama negara yang sudah Anda kenal",
          items: [
            { kana: "アメリカ", romaji: "amerika", meaning: "Amerika", audioUrl: wordAudioByKana.get("アメリカ") ?? null },
          ],
        } satisfies AudioListBlockContent,
      },
      {
        blockType: "text",
        narrationText:
          "Di dunia nyata, Katakana muncul di tanda toko, menu restoran, dan label produk — sering dicampur dengan Hiragana dan Kanji dalam satu kalimat. Begitu Anda bisa membaca Katakana dengan lancar, sebagian besar menu restoran Jepang untuk makanan/minuman asing sudah bisa Anda baca sendiri.",
        content: {
          kind: "paragraphs",
          heading: "Katakana di dunia nyata",
          paragraphs: [
            "Tanda toko, menu restoran, dan label produk sering memakai Katakana untuk kata serapan — dicampur dengan Hiragana dan Kanji dalam kalimat yang sama.",
            "Contoh yang sudah Anda kuasai: ワイン (anggur) di daftar minuman, コーヒー di menu kafe, タクシー di papan pemberhentian.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises([
      {
        exerciseType: "concept_mcq",
        prompt: "Nama orang atau negara asing di teks Jepang biasanya ditulis dengan...",
        options: [
          { id: 1, label: "Hiragana" },
          { id: 2, label: "Katakana" },
          { id: 3, label: "Kanji" },
        ],
        correctOptionId: 2,
        explanation: "Nama asing (orang, negara, kota) hampir selalu ditulis Katakana — aturan yang konsisten.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalau nama Anda ditulis dalam huruf Jepang, sistem tulisan yang dipakai adalah...",
        options: [
          { id: 1, label: "Katakana" },
          { id: 2, label: "Hiragana" },
          { id: 3, label: "Kanji" },
        ],
        correctOptionId: 1,
        explanation: "Nama asing (termasuk nama Anda) ditulis Katakana, sama seperti nama negara dan kata serapan lainnya.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. P18 id=${phase.id}, 4 lesson (L01-L03 reading_practice tanpa konten seed, L04 naratif diseed).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m03-phase4-loanwords gagal:", error);
  process.exit(1);
});
