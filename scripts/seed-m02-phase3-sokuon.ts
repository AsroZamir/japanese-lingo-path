import * as wanakana from "wanakana";
import { sql, inArray, eq, and } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import {
  kanaModules,
  kanaPhases,
  kanaLessons,
  kanaExampleWords,
  kanaWordCharacters,
  kanaCharacters,
  lessonContentBlocks,
  lessonExercises,
} from "../db/schema/kana";
import type {
  TextBlockContent,
  AudioListBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// M02 Phase 3's 4th topic (small-tsu + long vowels) — see docs/curriculum/M02.md
// "P16". Unlike dakuten/handakuten/youon, these aren't new characters to
// drill (っ already exists as a kana_characters row; long vowels are just
// repeated/different vowels) — this is a reading PATTERN, so it's
// narrative like Phase 1, not LessonL01-L04 like P12-P15.
//
// Run order: this script upserts the 8 example words FIRST (idempotent),
// then seeds lesson content that reads back their audio_url. Run
// `npm run generate:kana-audio-remaining` between two runs of this script
// if the words are new — the first run's content blocks will have
// audioUrl: null until audio exists, same two-pass pattern
// seed-m01-content.ts already uses for its word audio.

const WORDS: { kana: string; meaningId: string; meaningEn: string }[] = [
  { kana: "きて", meaningId: "datang (bentuk te)", meaningEn: "come (te-form)" },
  { kana: "きって", meaningId: "perangko", meaningEn: "postage stamp" },
  { kana: "さか", meaningId: "tanjakan / lereng", meaningEn: "slope" },
  { kana: "さっか", meaningId: "penulis", meaningEn: "author" },
  { kana: "おばさん", meaningId: "bibi / wanita paruh baya", meaningEn: "aunt / middle-aged woman" },
  { kana: "おばあさん", meaningId: "nenek", meaningEn: "grandmother" },
  { kana: "おじさん", meaningId: "paman / pria paruh baya", meaningEn: "uncle / middle-aged man" },
  { kana: "おじいさん", meaningId: "kakek", meaningEn: "grandfather" },
];

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

    const allChars = await db
      .select({ id: kanaCharacters.id, character: kanaCharacters.character })
      .from(kanaCharacters)
      .where(eq(kanaCharacters.script, "hiragana"));
    const kanaIdByChar = new Map(allChars.map((c) => [c.character, c.id]));

    const wordIdByKana = new Map<string, number>();
    for (const word of WORDS) {
      const romaji = wanakana.toRomaji(word.kana);
      const existing = await db
        .select({ id: kanaExampleWords.id })
        .from(kanaExampleWords)
        .where(and(eq(kanaExampleWords.wordKana, word.kana), eq(kanaExampleWords.script, "hiragana")))
        .limit(1);

      let wordId: number;
      if (existing.length > 0) {
        wordId = existing[0].id;
        await db.update(kanaExampleWords).set({ romaji, meaningId: word.meaningId, meaningEn: word.meaningEn }).where(eq(kanaExampleWords.id, wordId));
      } else {
        const [inserted] = await db
          .insert(kanaExampleWords)
          .values({ wordKana: word.kana, script: "hiragana", romaji, meaningId: word.meaningId, meaningEn: word.meaningEn, difficultyTier: 2, isLoanword: false })
          .returning({ id: kanaExampleWords.id });
        wordId = inserted.id;
      }
      wordIdByKana.set(word.kana, wordId);

      // No youon in this word list — every character here is a single
      // codepoint, so plain spread is correct (unlike seed-modified-
      // hiragana.ts, which needs the 2-codepoint lookahead for youon).
      const rows = [...word.kana].map((char, index) => {
        const kanaId = kanaIdByChar.get(char);
        if (kanaId == null) throw new Error(`Kata "${word.kana}" mengandung karakter "${char}" yang tidak ditemukan.`);
        return { wordId, kanaId, position: index + 1 };
      });
      await db
        .insert(kanaWordCharacters)
        .values(rows)
        .onConflictDoUpdate({ target: [kanaWordCharacters.wordId, kanaWordCharacters.position], set: { kanaId: sql`excluded.kana_id` } });
    }

    const audioRows = await db
      .select({ wordKana: kanaExampleWords.wordKana, audioUrl: kanaExampleWords.audioUrl })
      .from(kanaExampleWords)
      .where(inArray(kanaExampleWords.wordKana, WORDS.map((w) => w.kana)));
    const audioByKana = new Map(audioRows.map((r) => [r.wordKana, r.audioUrl]));
    const missingAudio = WORDS.filter((w) => !audioByKana.get(w.kana));
    if (missingAudio.length > 0) {
      console.log(
        `Peringatan: ${missingAudio.length} kata belum punya audio (${missingAudio.map((w) => w.kana).join(", ")}). ` +
          `Jalankan "npm run generate:kana-audio-remaining" lalu jalankan script ini lagi supaya audioUrl terisi.`,
      );
    }

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P16",
        titleId: "Sokuon + Bunyi Panjang",
        orderIndex: 16,
        descriptionId: "Pola baca っ (jeda kecil) dan bunyi vokal panjang — bukan karakter baru, tapi cara membacanya.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Huruf Kecil っ dan Bunyi Panjang", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Latihan Diskriminasi っ dan Bunyi Panjang", lessonType: "orientation_practice", orderIndex: 2, romajiPolicy: "on_demand" as const },
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

    const a = (kana: string) => audioByKana.get(kana) ?? null;

    // ════════ L01 — Huruf Kecil っ dan Bunyi Panjang ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "Dengarkan baik-baik perbedaan dua kata ini. きて dibaca mengalir tanpa jeda. きって punya jeda kecil sebelum bunyi \"te\" — seperti menahan napas sepersekian detik. Jeda itu yang ditandai huruf kecil っ.",
        content: {
          kind: "paragraphs",
          heading: "Huruf kecil っ",
          paragraphs: [
            "っ ditulis kecil, diselipkan sebelum konsonan lain, dan artinya: tahan sejenak sebelum melafalkan suku kata berikutnya — seperti jeda kecil di tengah kata. Ia sendiri tidak punya bunyi vokal.",
            "Bandingkan: **きて** (kite, \"datang\") dengan **きって** (kitte, \"perangko\"). Satu っ mengubah artinya total.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "audio_list",
        content: {
          heading: "Dengarkan pasangan kata berikut",
          items: [
            { kana: "きて", romaji: "kite", meaning: "datang", audioUrl: a("きて") },
            { kana: "きって", romaji: "kitte", meaning: "perangko", audioUrl: a("きって") },
            { kana: "さか", romaji: "saka", meaning: "tanjakan", audioUrl: a("さか") },
            { kana: "さっか", romaji: "sakka", meaning: "penulis", audioUrl: a("さっか") },
          ],
        } satisfies AudioListBlockContent,
      },
      {
        blockType: "text",
        narrationText:
          "Ini pasangan kata yang sangat sering bikin pemula salah paham. おばさん itu bibi atau wanita paruh baya. おばあさん, dengan bunyi \"baa\" yang ditahan dua ketuk, itu nenek. Kalau lupa menahannya, artinya bisa berubah total, dan ini bisa jadi situasi yang cukup canggung kalau salah sebut ke orang yang lebih tua.",
        content: {
          kind: "paragraphs",
          heading: "Bunyi panjang (long vowel)",
          paragraphs: [
            "Kadang satu vokal dibaca dua ketuk, bukan satu — ditulis dengan menambah huruf vokal yang sama (atau う setelah baris お/え). Ini bukan sekadar \"lebih lantang\", tapi benar-benar dua ketuk waktu.",
            "Bandingkan: **おばさん** (obasan, \"bibi/tante\") dengan **おばあさん** (obaasan, \"nenek\"). Satu huruf あ tambahan mengubah artinya total — sama seperti っ tadi.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "audio_list",
        content: {
          heading: "Dengarkan pasangan kata berikut",
          items: [
            { kana: "おばさん", romaji: "obasan", meaning: "bibi", audioUrl: a("おばさん") },
            { kana: "おばあさん", romaji: "obaasan", meaning: "nenek", audioUrl: a("おばあさん") },
            { kana: "おじさん", romaji: "ojisan", meaning: "paman", audioUrl: a("おじさん") },
            { kana: "おじいさん", romaji: "ojiisan", meaning: "kakek", audioUrl: a("おじいさん") },
          ],
        } satisfies AudioListBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "きって dibaca berbeda dari きて karena...",
        options: [
          { id: 1, label: "Ada jeda kecil sebelum \"te\"" },
          { id: 2, label: "Huruf き diulang" },
          { id: 3, label: "Tidak ada bedanya" },
        ],
        correctOptionId: 1,
        explanation: "Huruf kecil っ menandai jeda kecil sebelum konsonan berikutnya — きって punya jeda itu, きて tidak.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "おばあさん punya arti berbeda dari おばさん karena...",
        options: [
          { id: 1, label: "Hurufnya ditulis kanji" },
          { id: 2, label: "Bunyi \"a\" ditahan dua ketuk, bukan satu" },
          { id: 3, label: "Diucapkan lebih keras" },
        ],
        correctOptionId: 2,
        explanation: "おばあさん punya bunyi panjang (dua ketuk) pada \"ba\" — itu yang membedakannya dari おばさん (bibi) menjadi nenek.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Fungsi huruf kecil っ adalah...",
        options: [
          { id: 1, label: "Menambah huruf vokal" },
          { id: 2, label: "Menandai jeda sebelum konsonan berikutnya" },
          { id: 3, label: "Mengubah huruf jadi katakana" },
        ],
        correctOptionId: 2,
        explanation: "っ bukan huruf yang dibaca sendiri — ia menandai jeda kecil sebelum konsonan berikutnya diucapkan.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Latihan Diskriminasi ════════
    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "Dengarkan audio, lalu pilih ejaan yang benar.",
        options: [
          { id: 1, label: "きて" },
          { id: 2, label: "きって" },
        ],
        correctOptionId: 2,
        explanation: "Jeda kecil sebelum \"te\" menandai huruf っ — きって, bukan きて.",
        audioUrl: a("きって"),
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Dengarkan audio, lalu pilih ejaan yang benar.",
        options: [
          { id: 1, label: "さか" },
          { id: 2, label: "さっか" },
        ],
        correctOptionId: 1,
        explanation: "Tidak ada jeda sebelum \"ka\" — さか, bukan さっか.",
        audioUrl: a("さか"),
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Dengarkan audio, lalu pilih ejaan yang benar.",
        options: [
          { id: 1, label: "おばさん" },
          { id: 2, label: "おばあさん" },
        ],
        correctOptionId: 2,
        explanation: "Bunyi \"baa\" yang ditahan dua ketuk menandai bunyi panjang — おばあさん, bukan おばさん.",
        audioUrl: a("おばあさん"),
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Dengarkan audio, lalu pilih ejaan yang benar.",
        options: [
          { id: 1, label: "おじさん" },
          { id: 2, label: "おじいさん" },
        ],
        correctOptionId: 1,
        explanation: "Bunyi \"ji\" pendek, tidak ditahan — おじさん, bukan おじいさん.",
        audioUrl: a("おじさん"),
      },
    ]);

    console.log(`Selesai. P16 id=${phase.id}, 2 lesson, ${WORDS.length} kata (audio siap: ${WORDS.length - missingAudio.length}/${WORDS.length}).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m02-phase3-sokuon gagal:", error);
  process.exit(1);
});
