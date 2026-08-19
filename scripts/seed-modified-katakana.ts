import { and, eq, inArray, sql } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import {
  kanaModules,
  kanaPhases,
  kanaLessons,
  kanaLessonItems,
  kanaCharacters,
  kanaExampleWords,
  kanaWordCharacters,
} from "../db/schema/kana";

// M03 Phase 3 (docs/pre n5 modul 3.txt) — dakuten/handakuten/youon/
// foreign-combo portion. Same reasoning as seed-modified-hiragana.ts:
// the modul lists dakuten+handakuten COMBINED as one 25-character topic
// and youon as another 33-character topic — even bigger than hiragana's
// already-oversized groupings — so content coverage stays exactly as
// specified, delivery is chunked into properly-sized phases reusing the
// same group+4-lesson pattern. Small-ッ + long-vowel-mark ー (the two
// remaining Phase-3 topics) aren't characters to drill this way — see
// seed-m03-phase3-choon.ts, narrative-style like Phase 1.

type PseudoGroupDef = {
  phaseCode: string;
  titleId: string;
  descriptionId: string;
  chars: string[];
  lessonLabel: string;
  words: { kana: string; meaningId: string; meaningEn: string }[];
};

const GROUPS: PseudoGroupDef[] = [
  {
    phaseCode: "P12",
    titleId: "Dakuten — huruf bersuara",
    descriptionId: "Menambahkan tanda dakuten (゛) pada baris カ/サ/タ/ハ untuk bunyi bersuara.",
    lessonLabel: "Dakuten",
    chars: ["ガ", "ギ", "グ", "ゲ", "ゴ", "ザ", "ジ", "ズ", "ゼ", "ゾ", "ダ", "ヂ", "ヅ", "デ", "ド", "バ", "ビ", "ブ", "ベ", "ボ"],
    words: [
      { kana: "ガム", meaningId: "permen karet (gum)", meaningEn: "gum" },
      { kana: "ラジオ", meaningId: "radio", meaningEn: "radio" },
      { kana: "ドア", meaningId: "pintu (door)", meaningEn: "door" },
      { kana: "ビザ", meaningId: "visa", meaningEn: "visa" },
    ],
  },
  {
    phaseCode: "P13",
    titleId: "Handakuten — huruf p",
    descriptionId: "Menambahkan tanda handakuten (゜) pada baris ハ untuk bunyi p.",
    lessonLabel: "Handakuten",
    chars: ["パ", "ピ", "プ", "ペ", "ポ"],
    words: [
      { kana: "パン", meaningId: "roti (bread)", meaningEn: "bread" },
      { kana: "ピアノ", meaningId: "piano", meaningEn: "piano" },
      { kana: "ペン", meaningId: "pena (pen)", meaningEn: "pen" },
    ],
  },
  {
    phaseCode: "P14",
    titleId: "Youon (dasar) — キャ シャ チャ ニャ ヒャ ミャ リャ",
    descriptionId: "Huruf イ-baris + ャ/ュ/ョ kecil melebur jadi satu suku kata.",
    lessonLabel: "Youon dasar",
    chars: [
      "キャ", "キュ", "キョ", "シャ", "シュ", "ショ", "チャ", "チュ", "チョ",
      "ニャ", "ニュ", "ニョ", "ヒャ", "ヒュ", "ヒョ", "ミャ", "ミュ", "ミョ", "リャ", "リュ", "リョ",
    ],
    words: [
      { kana: "キャンプ", meaningId: "berkemah (camp)", meaningEn: "camp" },
      { kana: "キャベツ", meaningId: "kubis (cabbage)", meaningEn: "cabbage" },
      { kana: "シャツ", meaningId: "kemeja (shirt)", meaningEn: "shirt" },
    ],
  },
  {
    phaseCode: "P15",
    titleId: "Youon (bersuara) — ギャ ジャ ビャ ピャ",
    descriptionId: "Youon dari baris berdakuten/handakuten — pola yang sama, huruf dasarnya sudah bersuara.",
    lessonLabel: "Youon bersuara",
    chars: ["ギャ", "ギュ", "ギョ", "ジャ", "ジュ", "ジョ", "ビャ", "ビュ", "ビョ", "ピャ", "ピュ", "ピョ"],
    words: [
      { kana: "ジャム", meaningId: "selai (jam)", meaningEn: "jam" },
      { kana: "ジャズ", meaningId: "musik jazz", meaningEn: "jazz" },
    ],
  },
  {
    phaseCode: "P16",
    titleId: "Kombinasi Bunyi Asing — ティ ファ ウィ dst.",
    descriptionId: "Kombinasi khusus katakana untuk bunyi yang tidak ada padanan alaminya di bahasa Jepang.",
    lessonLabel: "Kombinasi Bunyi Asing",
    chars: ["ティ", "ディ", "ファ", "フィ", "フェ", "フォ", "ウィ", "ウェ", "ウォ"],
    words: [
      { kana: "ファン", meaningId: "penggemar (fan)", meaningEn: "fan" },
      { kana: "フィルム", meaningId: "film (roll)", meaningEn: "film" },
    ],
  },
];

function lessonDefs(lessonLabel: string) {
  return [
    { code: "L01", titleId: `Perkenalan ${lessonLabel}`, lessonType: "introduction", orderIndex: 1, romajiPolicy: "always" as const, targetThresholds: { visual: 80 }, role: "new" as const },
    { code: "L02", titleId: `Cara Menulis ${lessonLabel}`, lessonType: "writing_practice", orderIndex: 2, romajiPolicy: "on_demand" as const, targetThresholds: { writing: 75 }, role: "review" as const },
    { code: "L03", titleId: `Latihan Mengenali ${lessonLabel}`, lessonType: "recognition_practice", orderIndex: 3, romajiPolicy: "on_demand" as const, targetThresholds: { visual: 85, recall: 80 }, role: "review" as const },
    { code: "L04", titleId: `Mini Test ${lessonLabel}`, lessonType: "assessment", orderIndex: 4, romajiPolicy: "hidden" as const, targetThresholds: { visual: 90, recall: 85, writing: 80 }, role: "review" as const },
  ];
}

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M03"));
    if (!module_) throw new Error("M03 belum ada — jalankan scripts/seed-katakana-groups.ts dulu.");

    // Semua 46 basic katakana sudah "diajarkan" begitu Fase 2 selesai.
    const kanaIdByChar = new Map<string, number>();
    const basicRows = await db
      .select({ id: kanaCharacters.id, character: kanaCharacters.character })
      .from(kanaCharacters)
      .where(and(eq(kanaCharacters.script, "katakana"), eq(kanaCharacters.type, "basic")));
    for (const r of basicRows) kanaIdByChar.set(r.character, r.id);

    let wordCount = 0;
    let lessonItemTotal = 0;

    for (let i = 0; i < GROUPS.length; i++) {
      const group = GROUPS[i];
      const orderIndex = 12 + i; // P2-P11 = Phase 2 groups A-J

      const [phase] = await db
        .insert(kanaPhases)
        .values({ moduleId: module_.id, code: group.phaseCode, titleId: group.titleId, orderIndex, descriptionId: group.descriptionId })
        .onConflictDoUpdate({
          target: [kanaPhases.moduleId, kanaPhases.code],
          set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
        })
        .returning({ id: kanaPhases.id });

      const defs = lessonDefs(group.lessonLabel);
      const lessonRows = await db
        .insert(kanaLessons)
        .values(defs.map((l) => ({
          phaseId: phase.id, code: l.code, titleId: l.titleId, lessonType: l.lessonType,
          orderIndex: l.orderIndex, groupCode: null, romajiPolicy: l.romajiPolicy, targetThresholds: l.targetThresholds,
        })))
        .onConflictDoUpdate({
          target: [kanaLessons.phaseId, kanaLessons.code],
          set: { titleId: sql`excluded.title_id`, lessonType: sql`excluded.lesson_type`, orderIndex: sql`excluded.order_index`, romajiPolicy: sql`excluded.romaji_policy`, targetThresholds: sql`excluded.target_thresholds` },
        })
        .returning({ id: kanaLessons.id, code: kanaLessons.code });
      const lessonIdByCode = new Map(lessonRows.map((l) => [l.code, l.id]));

      const groupChars = await db
        .select({ id: kanaCharacters.id, character: kanaCharacters.character })
        .from(kanaCharacters)
        .where(and(eq(kanaCharacters.script, "katakana"), inArray(kanaCharacters.character, group.chars)));
      if (groupChars.length !== group.chars.length) {
        throw new Error(`Karakter fase ${group.phaseCode} tidak lengkap di database — ditemukan ${groupChars.length}/${group.chars.length}.`);
      }
      for (const c of groupChars) kanaIdByChar.set(c.character, c.id);

      const lessonItemRows = defs.flatMap((l) => {
        const lessonId = lessonIdByCode.get(l.code)!;
        return group.chars.map((char) => ({ lessonId, kanaId: kanaIdByChar.get(char)!, wordId: null, role: l.role }));
      });
      await db
        .insert(kanaLessonItems)
        .values(lessonItemRows)
        .onConflictDoUpdate({ target: [kanaLessonItems.lessonId, kanaLessonItems.kanaId], set: { role: sql`excluded.role` } });
      lessonItemTotal += lessonItemRows.length;

      for (const word of group.words) {
        const existing = await db
          .select({ id: kanaExampleWords.id })
          .from(kanaExampleWords)
          .where(and(eq(kanaExampleWords.wordKana, word.kana), eq(kanaExampleWords.script, "katakana")))
          .limit(1);

        // Romaji derived by splitting the same way as kana_word_characters
        // below (greedy longest-known-character match) and concatenating
        // each component's own DB romaji — wanakana can't be trusted for
        // extended/youon combos (see seed-katakana-foreign-combos.ts).
        const characters: string[] = [];
        let rest = word.kana;
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

        let wordId: number;
        if (existing.length > 0) {
          wordId = existing[0].id;
        } else {
          const [inserted] = await db
            .insert(kanaExampleWords)
            .values({ wordKana: word.kana, script: "katakana", romaji: "", meaningId: word.meaningId, meaningEn: word.meaningEn, difficultyTier: 2, isLoanword: true })
            .returning({ id: kanaExampleWords.id });
          wordId = inserted.id;
        }

        const rows = characters.map((char, index) => {
          const kanaId = kanaIdByChar.get(char);
          if (kanaId == null) {
            throw new Error(`Kata "${word.kana}" (${group.phaseCode}) mengandung karakter "${char}" yang belum diajarkan sampai fase ini.`);
          }
          return { wordId, kanaId, position: index + 1 };
        });
        await db
          .insert(kanaWordCharacters)
          .values(rows)
          .onConflictDoUpdate({ target: [kanaWordCharacters.wordId, kanaWordCharacters.position], set: { kanaId: sql`excluded.kana_id` } });

        const charRomajiRows = await db
          .select({ character: kanaCharacters.character, romaji: kanaCharacters.romaji })
          .from(kanaCharacters)
          .where(inArray(kanaCharacters.id, characters.map((c) => kanaIdByChar.get(c)!)));
        const romajiByChar = new Map(charRomajiRows.map((r) => [r.character, r.romaji]));
        const romaji = characters.map((c) => romajiByChar.get(c) ?? "").join("");
        await db.update(kanaExampleWords).set({ romaji, meaningId: word.meaningId, meaningEn: word.meaningEn }).where(eq(kanaExampleWords.id, wordId));

        wordCount++;
      }

      console.log(`${group.lessonLabel} (${group.phaseCode}): ${lessonRows.length} lessons, ${group.words.length} kata contoh.`);
    }

    console.log(`\nSelesai. ${lessonItemTotal} lesson_items, ${wordCount} kata contoh diproses.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-modified-katakana gagal:", error);
  process.exit(1);
});
