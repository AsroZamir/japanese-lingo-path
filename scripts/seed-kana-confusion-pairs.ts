import { eq, sql } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaCharacters, kanaConfusionPairs } from "../db/schema/kana";

// M02 Fase 7 (Consolidation) needs kana_confusion_pairs, which nothing
// has ever written to. Classic beginner hiragana mix-ups — well-attested
// pairs (not invented), all "visual" (shape confusion), all hiragana.
// kanaAId < kanaBId is enforced at insert time to satisfy the DB's own
// canonical-order CHECK constraint.
const PAIRS: { a: string; b: string }[] = [
  { a: "ぬ", b: "め" }, // loop direction
  { a: "れ", b: "ね" }, // the "three siblings" れ/ね/わ
  { a: "れ", b: "わ" },
  { a: "ね", b: "わ" },
  { a: "さ", b: "き" }, // top-stroke shape
  { a: "る", b: "ろ" }, // loop vs no loop
  { a: "い", b: "り" }, // stroke count/shape
  { a: "く", b: "し" }, // single curved stroke, mirrored
  { a: "は", b: "ほ" }, // extra stroke
  { a: "お", b: "あ" }, // similar upper structure
];

async function main() {
  const { db, close } = createSeedClient();
  try {
    const rows = await db
      .select({ id: kanaCharacters.id, character: kanaCharacters.character })
      .from(kanaCharacters)
      .where(eq(kanaCharacters.script, "hiragana"));
    const idByChar = new Map(rows.map((r) => [r.character, r.id]));

    let inserted = 0;
    for (const pair of PAIRS) {
      const idA = idByChar.get(pair.a);
      const idB = idByChar.get(pair.b);
      if (idA == null || idB == null) throw new Error(`Pasangan ${pair.a}/${pair.b}: karakter tidak ditemukan.`);
      const [kanaAId, kanaBId] = idA < idB ? [idA, idB] : [idB, idA];

      await db
        .insert(kanaConfusionPairs)
        .values({ kanaAId, kanaBId, confusionType: "visual", isSystemDefault: true })
        .onConflictDoUpdate({
          target: [kanaConfusionPairs.kanaAId, kanaConfusionPairs.kanaBId],
          set: { confusionType: sql`excluded.confusion_type`, isSystemDefault: sql`excluded.is_system_default` },
        });
      inserted++;
      console.log(`${pair.a} / ${pair.b} -> id ${kanaAId}/${kanaBId}`);
    }

    console.log(`\nSelesai. ${inserted} pasangan confusion diproses.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-kana-confusion-pairs gagal:", error);
  process.exit(1);
});
