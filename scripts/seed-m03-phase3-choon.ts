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

// M03 Phase 3's remaining 2 topics (small-ッ, long-vowel-mark ー) — see
// docs/curriculum/M03.md. Same reasoning as seed-m02-phase3-sokuon.ts:
// neither is a new character to drill (ッ and ー are already single
// kana_characters rows), this is a reading PATTERN, so it's narrative.
// Unlike hiragana's small-tsu, katakana loanwords rarely have a natural
// minimal-pair contrast (no real word "コプ" to contrast with "コップ"),
// so content demonstrates the pattern directly through real loanwords
// instead of forcing a contrast pair — matches how the modul itself
// lists these (plain examples, not pairs) for M03 specifically.
//
// Run order: same two-pass pattern as seed-m02-phase3-sokuon.ts — words
// upserted first, content seeded reading back whatever audio_url exists
// (null is fine; VOICEVOX wasn't running when this was first seeded).

const WORDS: { kana: string; meaningId: string; meaningEn: string }[] = [
  { kana: "コップ", meaningId: "gelas (cup)", meaningEn: "cup" },
  { kana: "ベッド", meaningId: "tempat tidur (bed)", meaningEn: "bed" },
  { kana: "コーヒー", meaningId: "kopi (coffee)", meaningEn: "coffee" },
  { kana: "ケーキ", meaningId: "kue (cake)", meaningEn: "cake" },
  { kana: "スーパー", meaningId: "supermarket", meaningEn: "supermarket" },
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
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M03"));
    if (!module_) throw new Error("M03 belum ada.");

    const allChars = await db
      .select({ id: kanaCharacters.id, character: kanaCharacters.character, romaji: kanaCharacters.romaji })
      .from(kanaCharacters)
      .where(eq(kanaCharacters.script, "katakana"));
    const kanaIdByChar = new Map(allChars.map((c) => [c.character, c.id]));
    const romajiByChar = new Map(allChars.map((c) => [c.character, c.romaji]));

    function splitWord(kana: string): string[] {
      const characters: string[] = [];
      let rest = kana;
      while (rest.length > 0) {
        const two = rest.slice(0, 2);
        if (kanaIdByChar.has(two)) {
          characters.push(two);
          rest = rest.slice(2);
        } else {
          characters.push(rest[0]);
          rest = rest.slice(1);
        }
      }
      return characters;
    }

    const wordIdByKana = new Map<string, number>();
    for (const word of WORDS) {
      const characters = splitWord(word.kana);
      const romaji = characters.map((c) => romajiByChar.get(c) ?? "").join("");

      const existing = await db
        .select({ id: kanaExampleWords.id })
        .from(kanaExampleWords)
        .where(and(eq(kanaExampleWords.wordKana, word.kana), eq(kanaExampleWords.script, "katakana")))
        .limit(1);

      let wordId: number;
      if (existing.length > 0) {
        wordId = existing[0].id;
        await db.update(kanaExampleWords).set({ romaji, meaningId: word.meaningId, meaningEn: word.meaningEn }).where(eq(kanaExampleWords.id, wordId));
      } else {
        const [inserted] = await db
          .insert(kanaExampleWords)
          .values({ wordKana: word.kana, script: "katakana", romaji, meaningId: word.meaningId, meaningEn: word.meaningEn, difficultyTier: 2, isLoanword: true })
          .returning({ id: kanaExampleWords.id });
        wordId = inserted.id;
      }
      wordIdByKana.set(word.kana, wordId);

      const rows = characters.map((char, index) => {
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
          `Jalankan "npm run generate:kana-audio-remaining" (perlu VOICEVOX aktif) lalu jalankan script ini lagi supaya audioUrl terisi.`,
      );
    }

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P17",
        titleId: "Sokuon + Bunyi Panjang",
        orderIndex: 17,
        descriptionId: "Huruf kecil ッ dan tanda bunyi panjang ー — bukan karakter baru, tapi cara membacanya di kata serapan.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Huruf Kecil ッ dan Bunyi Panjang ー", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Latihan Diskriminasi ッ dan ー", lessonType: "orientation_practice", orderIndex: 2, romajiPolicy: "on_demand" as const },
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

    // ════════ L01 — Huruf Kecil ッ dan Bunyi Panjang ー ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "Anda sudah tahu konsep ini dari Hiragana — huruf kecil っ menandai jeda sebelum konsonan berikutnya. Di Katakana persis sama, cuma bentuknya ッ, dan sering muncul di kata serapan seperti コップ dan ベッド.",
        content: {
          kind: "paragraphs",
          heading: "Huruf kecil ッ",
          paragraphs: [
            "ッ punya fungsi sama persis dengan っ di Hiragana: menandai jeda kecil sebelum konsonan berikutnya, menggandakan bunyinya. Sangat sering muncul di kata serapan.",
            "Contoh: **コップ** (koppu, \"gelas\") dan **ベッド** (beddo, \"tempat tidur\") — perhatikan jeda kecil sebelum \"p\" dan \"d\".",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "audio_list",
        content: {
          heading: "Dengarkan kata-kata ini",
          items: [
            { kana: "コップ", romaji: "koppu", meaning: "gelas", audioUrl: a("コップ") },
            { kana: "ベッド", romaji: "beddo", meaning: "tempat tidur", audioUrl: a("ベッド") },
          ],
        } satisfies AudioListBlockContent,
      },
      {
        blockType: "text",
        narrationText:
          "Ini konsep yang KHUSUS katakana — tidak ada tanda bunyi panjang seperti ini di Hiragana. ー menandakan vokal sebelumnya ditahan dua ketuk. Perhatikan コーヒー — ada DUA tanda ー di kata yang sama, masing-masing menahan vokal sebelumnya.",
        content: {
          kind: "paragraphs",
          heading: "Tanda bunyi panjang ー",
          paragraphs: [
            "ー adalah tanda khusus Katakana yang tidak ada padanannya di Hiragana — sebuah garis yang menandakan vokal sebelumnya ditahan dua ketuk waktu, bukan satu.",
            "Contoh: **コーヒー** (koohii, \"kopi\") punya DUA tanda ー. **ケーキ** (keeki, \"kue\") dan **スーパー** (suupaa, \"supermarket\") masing-masing satu.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "audio_list",
        content: {
          heading: "Dengarkan kata-kata ini",
          items: [
            { kana: "コーヒー", romaji: "koohii", meaning: "kopi", audioUrl: a("コーヒー") },
            { kana: "ケーキ", romaji: "keeki", meaning: "kue", audioUrl: a("ケーキ") },
            { kana: "スーパー", romaji: "suupaa", meaning: "supermarket", audioUrl: a("スーパー") },
          ],
        } satisfies AudioListBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "Fungsi huruf kecil ッ di Katakana sama dengan...",
        options: [
          { id: 1, label: "っ di Hiragana" },
          { id: 2, label: "ー di Katakana sendiri" },
          { id: 3, label: "Tidak ada padanannya" },
        ],
        correctOptionId: 1,
        explanation: "ッ punya fungsi sama persis dengan っ di Hiragana — menandai jeda sebelum konsonan berikutnya.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Tanda ー menandakan...",
        options: [
          { id: 1, label: "Vokal sebelumnya ditahan dua ketuk" },
          { id: 2, label: "Kata berikutnya adalah nama orang" },
          { id: 3, label: "Bunyi konsonan digandakan" },
        ],
        correctOptionId: 1,
        explanation: "ー adalah tanda khusus Katakana untuk memperpanjang vokal sebelumnya menjadi dua ketuk waktu.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Berapa kali tanda ー muncul di コーヒー?",
        options: [
          { id: 1, label: "Satu kali" },
          { id: 2, label: "Dua kali" },
          { id: 3, label: "Tidak ada" },
        ],
        correctOptionId: 2,
        explanation: "コーヒー punya dua tanda ー — satu setelah コ, satu lagi setelah ヒ.",
        audioUrl: a("コーヒー"),
      },
    ]);

    // ════════ L02 — Latihan Diskriminasi ════════
    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "Dengarkan audio, lalu pilih ejaan yang benar.",
        options: [
          { id: 1, label: "コプ" },
          { id: 2, label: "コップ" },
        ],
        correctOptionId: 2,
        explanation: "Ada jeda kecil sebelum \"p\" — コップ, dengan huruf kecil ッ.",
        audioUrl: a("コップ"),
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Dengarkan audio, lalu pilih ejaan yang benar.",
        options: [
          { id: 1, label: "ケキ" },
          { id: 2, label: "ケーキ" },
        ],
        correctOptionId: 2,
        explanation: "Vokal \"e\" ditahan dua ketuk — ケーキ, dengan tanda ー.",
        audioUrl: a("ケーキ"),
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Dengarkan audio, lalu pilih ejaan yang benar.",
        options: [
          { id: 1, label: "ベット" },
          { id: 2, label: "ベッド" },
        ],
        correctOptionId: 2,
        explanation: "Huruf terakhir bersuara \"d\", bukan \"t\" — ベッド, bukan ベット.",
        audioUrl: a("ベッド"),
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Dengarkan audio, lalu pilih ejaan yang benar.",
        options: [
          { id: 1, label: "スパー" },
          { id: 2, label: "スーパー" },
        ],
        correctOptionId: 2,
        explanation: "Vokal \"u\" di awal ditahan dua ketuk — スーパー, dengan tanda ー.",
        audioUrl: a("スーパー"),
      },
    ]);

    console.log(`Selesai. P17 id=${phase.id}, 2 lesson, ${WORDS.length} kata (audio siap: ${WORDS.length - missingAudio.length}/${WORDS.length}).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m03-phase3-choon gagal:", error);
  process.exit(1);
});
