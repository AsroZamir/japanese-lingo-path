import { sql } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaCharacters } from "../db/schema/kana";

// M03 Phase 3 L05 (docs/pre n5 modul 3.txt) — extended katakana
// combinations for representing foreign sounds not in native Japanese
// (テ+ィ, フ+ァ/ィ/ェ/ォ, ウ+ィ/ェ/ォ). Assembled from components exactly
// like youon in seed-kana-characters.ts, but that script doesn't cover
// this set (it wasn't part of the original 33-youon plan) — kept as its
// own addon script rather than folded into it, since this is Bagian-4-
// specific scope, not part of the base curriculum's structural seed.
//
// wanakana.toRomaji gets these wrong (plain concatenation — "ティ" ->
// "tei" instead of "ti") because they're a special reading convention
// for loanwords, not a regular combination rule; romaji is hardcoded
// here instead.
const COMBOS: { character: string; romaji: string; base: string; small: string }[] = [
  { character: "ティ", romaji: "ti", base: "テ", small: "ィ" },
  { character: "ディ", romaji: "di", base: "デ", small: "ィ" },
  { character: "ファ", romaji: "fa", base: "フ", small: "ァ" },
  { character: "フィ", romaji: "fi", base: "フ", small: "ィ" },
  { character: "フェ", romaji: "fe", base: "フ", small: "ェ" },
  { character: "フォ", romaji: "fo", base: "フ", small: "ォ" },
  { character: "ウィ", romaji: "wi", base: "ウ", small: "ィ" },
  { character: "ウェ", romaji: "we", base: "ウ", small: "ェ" },
  { character: "ウォ", romaji: "wo", base: "ウ", small: "ォ" },
];

async function main() {
  const { db, close } = createSeedClient();
  try {
    await db
      .insert(kanaCharacters)
      .values(
        COMBOS.map((c) => ({
          script: "katakana" as const,
          character: c.character,
          romaji: c.romaji,
          type: "foreign_combo" as const,
          groupCode: null,
          orderInGroup: null,
          notesId: `Kombinasi katakana untuk bunyi asing, dibaca "${c.base}" + "${c.small}" kecil — bukan bunyi gabungan biasa.`,
        })),
      )
      .onConflictDoUpdate({
        target: [kanaCharacters.script, kanaCharacters.character],
        set: { romaji: sql`excluded.romaji`, type: sql`excluded.type`, notesId: sql`excluded.notes_id` },
      });

    console.log(`Selesai. ${COMBOS.length} karakter foreign_combo diproses: ${COMBOS.map((c) => c.character).join(" ")}`);
    console.log(`Jalankan "npx tsx scripts/fetch-kana-stroke-data.ts" sesudah ini untuk mengisi stroke data (perlu update logika assembly-nya dulu untuk type foreign_combo).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-katakana-foreign-combos gagal:", error);
  process.exit(1);
});
