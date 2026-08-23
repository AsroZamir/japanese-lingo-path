import fs from "node:fs/promises";
import path from "node:path";
import { createSeedClient } from "../db/seed-client";
import { kanaCharacters } from "../db/schema/kana";

// Bagian 2 — verifies stroke_count / stroke-data path count for all 211
// kana_characters rows against a canonical (textbook) stroke count,
// independent of whatever the CDN source (@k1low/hanzi-writer-data-jp)
// happened to produce. Canonical counts for the 92 basic characters are
// hardcoded from the reference table given for this task; dakuten (+2),
// handakuten (+1), youon (base + small ya/yu/yo), sokuon, and long_vowel
// are all DERIVED the same way seed-kana-characters.ts derives the
// characters themselves, so this can't silently drift from what's
// actually seeded.

const OUTPUT_DIR = path.join(process.cwd(), "public", "kana-strokes");

// ── Canonical stroke counts, basic 46 (from the reference table) ──
const BASE_HIRAGANA: Record<string, number> = {
  あ: 3, い: 2, う: 2, え: 2, お: 3,
  か: 3, き: 4, く: 1, け: 3, こ: 2,
  さ: 3, し: 1, す: 2, せ: 3, そ: 1,
  た: 4, ち: 2, つ: 1, て: 1, と: 2,
  な: 4, に: 3, ぬ: 2, ね: 2, の: 1,
  は: 3, ひ: 1, ふ: 4, へ: 1, ほ: 4,
  ま: 3, み: 2, む: 3, め: 2, も: 3,
  や: 3, ゆ: 2, よ: 2,
  ら: 2, り: 2, る: 1, れ: 2, ろ: 1,
  わ: 2, を: 3, ん: 1,
};
const BASE_KATAKANA: Record<string, number> = {
  ア: 2, イ: 2, ウ: 3, エ: 3, オ: 3,
  カ: 2, キ: 3, ク: 2, ケ: 3, コ: 2,
  サ: 3, シ: 3, ス: 2, セ: 2, ソ: 2,
  タ: 3, チ: 3, ツ: 3, テ: 3, ト: 2,
  ナ: 2, ニ: 2, ヌ: 2, ネ: 4, ノ: 1,
  ハ: 2, ヒ: 2, フ: 1, ヘ: 1, ホ: 4,
  マ: 2, ミ: 3, ム: 2, メ: 2, モ: 3,
  ヤ: 2, ユ: 2, ヨ: 3,
  ラ: 2, リ: 2, ル: 2, レ: 1, ロ: 3,
  ワ: 2, ヲ: 3, ン: 2,
};
// Small ya/yu/yo retain the same stroke count as their full-size
// counterpart (they're smaller, not simplified) — used to derive youon.
const SMALL_Y_HIRAGANA: Record<string, number> = { ゃ: 3, ゅ: 2, ょ: 2 };
const SMALL_Y_KATAKANA: Record<string, number> = { ャ: 2, ュ: 2, ョ: 3 };

type StrokeData = {
  strokes: string[];
  strokeGroups?: number[][];
};

async function readActual(script: string, character: string): Promise<number | null> {
  try {
    const raw = await fs.readFile(path.join(OUTPUT_DIR, script, `${character}.json`), "utf-8");
    const data = JSON.parse(raw) as StrokeData;
    if (!data.strokeGroups) return data.strokes.length;

    const indices = data.strokeGroups.flat();
    const valid =
      data.strokeGroups.length > 0 &&
      indices.length === data.strokes.length &&
      new Set(indices).size === data.strokes.length &&
      indices.every(
        (index) =>
          Number.isInteger(index) &&
          index >= 0 &&
          index < data.strokes.length,
      );
    if (!valid) throw new Error(`strokeGroups tidak valid untuk ${character}.`);
    return data.strokeGroups.length;
  } catch {
    return null;
  }
}

function canonicalBasic(script: string, character: string): number | null {
  const table = script === "hiragana" ? BASE_HIRAGANA : BASE_KATAKANA;
  return table[character] ?? null;
}

async function main() {
  const { db, close } = createSeedClient();
  try {
    const rows = await db.select().from(kanaCharacters);
    const byId = new Map(rows.map((r) => [r.id, r]));

    type Result = { script: string; character: string; type: string; dbCount: number | null; jsonCount: number | null; canonical: number | null; note: string };
    const results: Result[] = [];

    for (const row of rows) {
      const jsonCount = await readActual(row.script, row.character);
      let canonical: number | null = null;
      let note = "";

      if (row.type === "basic") {
        canonical = canonicalBasic(row.script, row.character);
      } else if (row.type === "dakuten" || row.type === "handakuten") {
        const base = row.baseCharacterId != null ? byId.get(row.baseCharacterId) : null;
        const baseCanonical = base ? canonicalBasic(base.script, base.character) : null;
        if (baseCanonical != null) {
          canonical = baseCanonical + (row.type === "dakuten" ? 2 : 1);
          note = `= ${base!.character}(${baseCanonical}) + ${row.type === "dakuten" ? 2 : 1}`;
        }
      } else if (row.type === "youon") {
        const [baseChar, smallChar] = [...row.character];
        const baseRow = rows.find((r) => r.script === row.script && r.character === baseChar);
        const baseCanonical = baseRow
          ? baseRow.type === "basic"
            ? canonicalBasic(row.script, baseChar)
            : (() => {
                const b2 = baseRow.baseCharacterId != null ? byId.get(baseRow.baseCharacterId) : null;
                const b2c = b2 ? canonicalBasic(b2.script, b2.character) : null;
                return b2c != null ? b2c + (baseRow.type === "dakuten" ? 2 : 1) : null;
              })()
          : null;
        const smallTable = row.script === "hiragana" ? SMALL_Y_HIRAGANA : SMALL_Y_KATAKANA;
        const smallCanonical = smallTable[smallChar] ?? null;
        if (baseCanonical != null && smallCanonical != null) {
          canonical = baseCanonical + smallCanonical;
          note = `= ${baseChar}(${baseCanonical}) + ${smallChar}(${smallCanonical})`;
        }
      } else if (row.type === "sokuon") {
        // っ/ッ = small tsu, same stroke count as つ/ツ.
        canonical = row.script === "hiragana" ? BASE_HIRAGANA["つ"] : BASE_KATAKANA["ツ"];
      } else if (row.type === "long_vowel") {
        canonical = 1; // ー — a single dash stroke.
      }

      results.push({
        script: row.script,
        character: row.character,
        type: row.type,
        dbCount: row.strokeCount,
        jsonCount,
        canonical,
        note,
      });
    }

    const mismatches = results.filter((r) => r.canonical != null && r.jsonCount !== r.canonical);
    const dbJsonMismatches = results.filter((r) => r.jsonCount != null && r.dbCount !== r.jsonCount);
    const noCanonical = results.filter((r) => r.canonical == null);
    const missingJson = results.filter((r) => r.jsonCount == null);

    console.log(`Total karakter: ${results.length}`);
    console.log(`Cocok (JSON == kanonik): ${results.length - mismatches.length - noCanonical.length - missingJson.length}`);
    console.log(`Tidak punya kanonik (perlu dirakit manual): ${noCanonical.length}`);
    console.log(`File JSON hilang: ${missingJson.length}`);
    console.log(`\n=== MISMATCH: JSON vs kanonik ===`);
    console.log("script\tchar\ttype\tdb\tjson\tkanonik\tket");
    for (const r of mismatches) {
      console.log(`${r.script}\t${r.character}\t${r.type}\t${r.dbCount}\t${r.jsonCount}\t${r.canonical}\t${r.note}`);
    }
    console.log(`\n=== MISMATCH: DB vs JSON (harus 0 kalau fetch-kana-stroke-data.ts sudah dijalankan setelah edit JSON terakhir) ===`);
    for (const r of dbJsonMismatches) {
      console.log(`${r.script}\t${r.character}\t${r.type}\tdb=${r.dbCount}\tjson=${r.jsonCount}`);
    }
    console.log(`\n=== Tidak punya kanonik (butuh perakitan manual / cek referensi tambahan) ===`);
    for (const r of noCanonical) {
      console.log(`${r.script}\t${r.character}\t${r.type}\tjson=${r.jsonCount}`);
    }
    console.log(`\n=== File JSON hilang ===`);
    for (const r of missingJson) {
      console.log(`${r.script}\t${r.character}\t${r.type}`);
    }
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("Verifikasi gagal:", error);
  process.exit(1);
});
