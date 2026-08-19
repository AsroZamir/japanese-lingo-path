import { sql, inArray, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons, kanaExampleWords, lessonContentBlocks, lessonExercises } from "../db/schema/kana";
import type { TextBlockContent, AudioListBlockContent, LessonExerciseOption } from "../app/lib/lesson-content-types";

// M02 Fase 4 — Reading Lab (docs/curriculum/M02.md "Fase 4"). L01/L02 are
// pure reading_practice lessons — no content blocks/exercises here at
// all, LessonReading builds everything live from getWordPool(). Only L03
// (Bacaan Sungguhan) is narrative and needs seeded content, same pattern
// as seed-m02-phase1.ts.

function audioUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL tidak ditemukan di .env.local.");
  return `${base}/storage/v1/object/public/audio/${path}`;
}

// Sama seperti scripts/seed-m01-content.ts — path ini adalah frasa M01
// yang audionya sudah ada (dbTarget: null di generate-audio-voicevox.ts,
// bukan kana_example_words), jadi URL-nya dihitung ulang secara
// independen di sini, bukan di-query dari DB.
const KONNICHIWA = audioUrl("phrases/konnichiwa.wav");
const ARIGATOU = audioUrl("phrases/arigatou.wav");
const ARIGATOU_GOZAIMASU = audioUrl("phrases/arigatougozaimasu.wav");

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
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M02"));
    if (!module_) throw new Error("M02 belum ada.");

    const wordRows = await db
      .select({ wordKana: kanaExampleWords.wordKana, audioUrl: kanaExampleWords.audioUrl })
      .from(kanaExampleWords)
      .where(inArray(kanaExampleWords.wordKana, ["にほん", "すし", "でんしゃ"]));
    const wordAudioByKana = new Map(wordRows.map((r) => [r.wordKana, r.audioUrl]));

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P17",
        titleId: "Reading Lab",
        orderIndex: 17,
        descriptionId: "Melatih membaca kosakata yang sudah diajarkan — bukan karakter baru.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "2-3 Kata Kana", lessonType: "reading_practice", orderIndex: 1, romajiPolicy: "on_demand" as const },
      { code: "L02", titleId: "4+ Kata Kana", lessonType: "reading_practice", orderIndex: 2, romajiPolicy: "on_demand" as const },
      { code: "L03", titleId: "Bacaan Sungguhan", lessonType: "orientation_practice", orderIndex: 3, romajiPolicy: "always" as const },
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
    const l03Id = lessonIdByCode.get("L03")!;

    await db.delete(lessonContentBlocks).where(inArray(lessonContentBlocks.lessonId, [l03Id]));
    await db.delete(lessonExercises).where(inArray(lessonExercises.lessonId, [l03Id]));

    async function insertBlocks(blocks: BlockInput[]) {
      await db.insert(lessonContentBlocks).values(
        blocks.map((b, i) => ({ lessonId: l03Id, orderIndex: i + 1, blockType: b.blockType, content: b.content, narrationText: b.narrationText ?? null })),
      );
    }
    async function insertExercises(exercises: ExerciseInput[]) {
      await db.insert(lessonExercises).values(exercises.map((e, i) => ({ lessonId: l03Id, orderIndex: i + 1, ...e })));
    }

    await insertBlocks([
      {
        blockType: "text",
        narrationText:
          "Sampai di sini, semua kata yang Anda baca adalah kata latihan yang dipilih supaya cocok dengan huruf yang baru diajarkan. Sekarang coba baca sesuatu yang benar-benar dipakai orang Jepang setiap hari — sapaan yang sudah Anda dengar jauh di awal, di modul orientasi.",
        content: {
          kind: "paragraphs",
          heading: "Bacaan sungguhan pertama Anda",
          paragraphs: [
            "Sampai sini, semua kata yang Anda baca adalah kata latihan. Sekarang coba baca sesuatu yang benar-benar dipakai orang Jepang sehari-hari — sapaan yang sudah Anda dengar di modul orientasi dulu.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "audio_list",
        content: {
          heading: "Sapaan sehari-hari",
          items: [
            { kana: "こんにちは", romaji: "konnichiwa", meaning: "halo / selamat siang", audioUrl: KONNICHIWA },
            { kana: "ありがとう", romaji: "arigatou", meaning: "terima kasih", audioUrl: ARIGATOU },
            { kana: "ありがとうございます", romaji: "arigatou gozaimasu", meaning: "terima kasih (sopan)", audioUrl: ARIGATOU_GOZAIMASU },
          ],
        } satisfies AudioListBlockContent,
      },
      {
        blockType: "text",
        narrationText:
          "Kata-kata pendek seperti ini sering muncul di stasiun, toko, atau kemasan makanan. Anda sudah bisa membacanya sekarang, tanpa bantuan romaji sama sekali.",
        content: {
          kind: "paragraphs",
          heading: "Kata yang mungkin muncul di papan tanda",
          paragraphs: [
            "Kata-kata pendek seperti ini sering muncul di stasiun, toko, atau kemasan makanan — sudah bisa Anda baca sekarang tanpa romaji.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "audio_list",
        content: {
          heading: "Coba baca",
          items: [
            { kana: "にほん", romaji: "nihon", meaning: "Jepang", audioUrl: wordAudioByKana.get("にほん") ?? null },
            { kana: "すし", romaji: "sushi", meaning: "sushi", audioUrl: wordAudioByKana.get("すし") ?? null },
            { kana: "でんしゃ", romaji: "densha", meaning: "kereta listrik", audioUrl: wordAudioByKana.get("でんしゃ") ?? null },
          ],
        } satisfies AudioListBlockContent,
      },
    ]);

    await insertExercises([
      {
        exerciseType: "concept_mcq",
        prompt: "Dengarkan audio. Artinya adalah...",
        options: [
          { id: 1, label: "Halo" },
          { id: 2, label: "Terima kasih" },
          { id: 3, label: "Selamat tinggal" },
        ],
        correctOptionId: 1,
        explanation: "こんにちは artinya halo / selamat siang.",
        audioUrl: KONNICHIWA,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "ありがとうございます adalah versi ___ dari ありがとう.",
        options: [
          { id: 1, label: "Lebih sopan" },
          { id: 2, label: "Lebih santai" },
          { id: 3, label: "Berbeda arti total" },
        ],
        correctOptionId: 1,
        explanation: "ございます menambah kesopanan tanpa mengubah arti dasarnya — tetap \"terima kasih\", cuma lebih formal.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Dengarkan audio. Artinya adalah...",
        options: [
          { id: 1, label: "Mobil" },
          { id: 2, label: "Kereta listrik" },
          { id: 3, label: "Pesawat" },
        ],
        correctOptionId: 2,
        explanation: "でんしゃ artinya kereta listrik.",
        audioUrl: wordAudioByKana.get("でんしゃ") ?? null,
      },
    ]);

    console.log(`Selesai. P17 id=${phase.id}, 3 lesson (L01/L02 reading_practice tanpa konten seed, L03 naratif diseed).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m02-phase4-reading gagal:", error);
  process.exit(1);
});
