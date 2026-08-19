import { and, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaCharacters, kanaExampleWords, kanaWordCharacters } from "../db/schema/kana";

// M03 Phase 4 (Loanword Reading Lab) vocabulary — themed, not length-based
// like M02's Reading Lab, so these are hand-picked per lesson rather than
// pulled from a generic pool query. Some already exist from earlier
// phases (パン, コーヒー, ケーキ) — reused, not re-inserted. Romaji
// derived from each component's own kana_characters.romaji (same
// approach as seed-modified-katakana.ts), not wanakana, since several of
// these contain youon/foreign-combo characters wanakana mishandles.

const WORDS: { kana: string; meaningId: string; meaningEn: string }[] = [
  // L01 — Everyday Loanwords
  { kana: "バス", meaningId: "bus", meaningEn: "bus" },
  { kana: "ホテル", meaningId: "hotel", meaningEn: "hotel" },
  { kana: "テレビ", meaningId: "televisi (TV)", meaningEn: "television" },
  { kana: "タクシー", meaningId: "taksi", meaningEn: "taxi" },
  // L02 — Food & Drink
  { kana: "ジュース", meaningId: "jus", meaningEn: "juice" },
  { kana: "アイスクリーム", meaningId: "es krim", meaningEn: "ice cream" },
  { kana: "カレー", meaningId: "kari (curry)", meaningEn: "curry" },
  { kana: "サンドイッチ", meaningId: "sandwich", meaningEn: "sandwich" },
  // L03 — Technology & Modern Life
  { kana: "スマホ", meaningId: "ponsel pintar (smartphone)", meaningEn: "smartphone" },
  { kana: "コンピューター", meaningId: "komputer", meaningEn: "computer" },
  { kana: "インターネット", meaningId: "internet", meaningEn: "internet" },
  { kana: "メール", meaningId: "surel (email)", meaningEn: "email" },
];

async function main() {
  const { db, close } = createSeedClient();
  try {
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

    let inserted = 0;
    let reused = 0;
    for (const word of WORDS) {
      const existing = await db
        .select({ id: kanaExampleWords.id })
        .from(kanaExampleWords)
        .where(and(eq(kanaExampleWords.wordKana, word.kana), eq(kanaExampleWords.script, "katakana")))
        .limit(1);
      if (existing.length > 0) {
        reused++;
        continue;
      }

      const characters = splitWord(word.kana);
      const romaji = characters.map((c) => romajiByChar.get(c) ?? "").join("");
      const [inserted_] = await db
        .insert(kanaExampleWords)
        .values({ wordKana: word.kana, script: "katakana", romaji, meaningId: word.meaningId, meaningEn: word.meaningEn, difficultyTier: 3, isLoanword: true })
        .returning({ id: kanaExampleWords.id });

      const rows = characters.map((char, index) => {
        const kanaId = kanaIdByChar.get(char);
        if (kanaId == null) throw new Error(`Kata "${word.kana}" mengandung karakter "${char}" yang tidak ditemukan.`);
        return { wordId: inserted_.id, kanaId, position: index + 1 };
      });
      await db.insert(kanaWordCharacters).values(rows);
      inserted++;
      console.log(`${word.kana} -> ${romaji} (${word.meaningId})`);
    }

    console.log(`\nSelesai. ${inserted} kata baru, ${reused} sudah ada sebelumnya.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-katakana-loanwords gagal:", error);
  process.exit(1);
});
