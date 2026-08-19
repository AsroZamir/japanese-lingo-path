import { eq, sql } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaCharacters, kanaConfusionPairs } from "../db/schema/kana";

// M03 Fase 7 (Katakana Consolidation) needs two kinds of pairs:
// (1) visual — classic katakana-only mix-ups, per docs/pre n5 modul 3.txt
//     Phase 7 L01 itself (シ/ツ, ソ/ン, ク/ケ, ヌ/ス, フ/ワ).
// (2) cross_script — Hiragana vs Katakana confusion (Phase 7 L02),
//     the enum value existed in the schema since Bagian 3 but nothing
//     ever wrote a cross_script row until now.
const VISUAL_PAIRS: { a: string; b: string }[] = [
  { a: "シ", b: "ツ" }, // stroke direction (diagonal vs near-vertical)
  { a: "ソ", b: "ン" }, // near-identical stroke angle, tiny difference
  { a: "ク", b: "ケ" }, // extra stroke
  { a: "ヌ", b: "ス" }, // loop vs open curve
  { a: "フ", b: "ワ" }, // similar hook shape
];

// { hiragana, katakana } — kanaAId < kanaBId enforced at insert time
// regardless of which script ends up smaller, same as the visual pairs.
const CROSS_SCRIPT_PAIRS: { hiragana: string; katakana: string }[] = [
  { hiragana: "あ", katakana: "ア" },
  { hiragana: "き", katakana: "キ" },
  { hiragana: "す", katakana: "ス" },
  { hiragana: "こ", katakana: "コ" },
  { hiragana: "め", katakana: "メ" },
  { hiragana: "り", katakana: "リ" },
];

async function main() {
  const { db, close } = createSeedClient();
  try {
    const katakanaRows = await db
      .select({ id: kanaCharacters.id, character: kanaCharacters.character })
      .from(kanaCharacters)
      .where(eq(kanaCharacters.script, "katakana"));
    const katakanaIdByChar = new Map(katakanaRows.map((r) => [r.character, r.id]));

    const hiraganaRows = await db
      .select({ id: kanaCharacters.id, character: kanaCharacters.character })
      .from(kanaCharacters)
      .where(eq(kanaCharacters.script, "hiragana"));
    const hiraganaIdByChar = new Map(hiraganaRows.map((r) => [r.character, r.id]));

    let inserted = 0;

    async function upsertPair(idA: number, idB: number, confusionType: "visual" | "cross_script") {
      const [kanaAId, kanaBId] = idA < idB ? [idA, idB] : [idB, idA];
      await db
        .insert(kanaConfusionPairs)
        .values({ kanaAId, kanaBId, confusionType, isSystemDefault: true })
        .onConflictDoUpdate({
          target: [kanaConfusionPairs.kanaAId, kanaConfusionPairs.kanaBId],
          set: { confusionType: sql`excluded.confusion_type`, isSystemDefault: sql`excluded.is_system_default` },
        });
      inserted++;
    }

    for (const pair of VISUAL_PAIRS) {
      const idA = katakanaIdByChar.get(pair.a);
      const idB = katakanaIdByChar.get(pair.b);
      if (idA == null || idB == null) throw new Error(`Pasangan visual ${pair.a}/${pair.b}: karakter tidak ditemukan.`);
      await upsertPair(idA, idB, "visual");
      console.log(`[visual] ${pair.a} / ${pair.b}`);
    }

    for (const pair of CROSS_SCRIPT_PAIRS) {
      const idA = hiraganaIdByChar.get(pair.hiragana);
      const idB = katakanaIdByChar.get(pair.katakana);
      if (idA == null || idB == null) throw new Error(`Pasangan cross_script ${pair.hiragana}/${pair.katakana}: karakter tidak ditemukan.`);
      await upsertPair(idA, idB, "cross_script");
      console.log(`[cross_script] ${pair.hiragana} / ${pair.katakana}`);
    }

    console.log(`\nSelesai. ${inserted} pasangan confusion diproses.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-katakana-confusion-pairs gagal:", error);
  process.exit(1);
});
