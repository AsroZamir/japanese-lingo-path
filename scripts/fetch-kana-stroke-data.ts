import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaCharacters } from "../db/schema/kana";

// Source chosen after comparing against kana-svg-data (archived 2022,
// missing katakana ー): @k1low/hanzi-writer-data-jp covers all 151
// single-codepoint characters we need, including ー, and is actively
// maintained. Youon (きゃ) isn't a single Unicode codepoint in either
// source, so it's assembled here from its two component characters.
const SOURCE_BASE = "https://cdn.jsdelivr.net/npm/@k1low/hanzi-writer-data-jp@latest";
const OUTPUT_DIR = path.join(process.cwd(), "public", "kana-strokes");

type StrokeData = { strokes: string[]; medians: number[][][] };

async function fetchStrokeData(character: string): Promise<StrokeData> {
  const url = `${SOURCE_BASE}/${encodeURIComponent(character)}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} dari ${url}`);
  }
  return res.json();
}

// PERBAIKAN KRITIS (lihat commit): mekanisme dedupe geometris lama (ambang
// overlap titik median 0.5) DIHAPUS TOTAL — terbukti salah untuk beberapa
// karakter meski stroke_count akhirnya kebetulan cocok dengan tabel baku.
// Kasus nyata yang ditemukan lewat rendering visual langsung (bukan cuma
// hitung angka):
//   - の: median milik stroke SPIRAL PENUH (benar) py overlap tinggi
//     dengan stroke lain yang JUSTRU berupa fragmen kecil/rusak (salah) —
//     ambang overlap membuang yang benar, menyisakan yang rusak.
//   - ぬ/め: stroke loop (lingkaran, secara fisik berbeda dari stroke
//     garis pertama) py overlap median tinggi dengan salah satu VARIAN
//     GAYA stroke garis pertama — ambang overlap salah mengira loop itu
//     "duplikat" lalu membuangnya, menyisakan dua varian garis yang sama
//     tanpa loop sama sekali.
// Median (centerline pena yang disederhanakan) TIDAK selalu berkorelasi
// dengan bentuk fill SVG yang sebenarnya sangat berbeda — overlap tinggi
// pada median tidak berarti dua stroke itu "sama".
//
// Sumber data (@k1low/hanzi-writer-data-jp) TIDAK punya field "id" per
// stroke seperti kana-svg-data (yang menandai varian gaya dengan suffix
// "3a"/"3b") — jadi pengelompokan berbasis id tidak bisa diterapkan
// langsung di sini. Bahkan aturan sederhana "selalu ambil varian
// pertama" terbukti salah juga (untuk の, varian yang benar justru raw
// index 1, bukan index 0).
//
// Perbaikan: setiap karakter di bawah ini diverifikasi SATU PER SATU
// secara visual — merender SEMUA kombinasi C(raw, kanonik) dari stroke
// mentah lalu memilih yang benar-benar terlihat seperti karakter yang
// dituju (bukan tebakan geometris). Ini SATU-SATUNYA 20 karakter di
// seluruh 211 kana dasar+dakuten+handakuten+sokuon+long_vowel yang
// jumlah stroke mentahnya melebihi jumlah baku (diverifikasi lewat
// survei penuh terhadap sumber CDN) — sisanya sudah 1:1 raw==kanonik,
// tidak butuh seleksi sama sekali.
const STROKE_INDEX_OVERRIDES: Record<string, number[]> = {
  // 15 hiragana dasar yang jumlah stroke mentahnya > baku
  "あ": [0, 1, 2],
  "お": [0, 1, 2],
  "ぬ": [0, 2],
  "の": [1],
  "め": [1, 2],
  "は": [0, 2, 3],
  "ほ": [0, 1, 3, 4],
  "み": [0, 1],
  "よ": [0, 1],
  "る": [0],
  "す": [1, 2],
  "ね": [1, 2],
  "ま": [0, 2, 3],
  "む": [0, 1, 2],
  "な": [0, 1, 2, 3],
  // dakuten/handakuten yang mewarisi masalah yang sama dari basis-nya
  // (di-fetch terpisah sebagai codepoint sendiri, bukan diturunkan dari
  // basis + tanda, jadi punya set stroke mentahnya sendiri)
  "ば": [0, 2, 3, 4, 5],
  "ぱ": [0, 2, 3, 4],
  "ず": [0, 1, 3, 4],
  "ぼ": [0, 1, 3, 4, 5, 6],
  "ぽ": [0, 1, 3, 4, 5],
  // small ょ (dipakai di 11 youon hiragana: きょしょちょ dst.) — bukan
  // baris kana_characters sendiri, tapi tetap kena masalah yang sama
  // karena diambil lewat getSingle() yang sama untuk perakitan youon.
  // Ditemukan setelah fix awal karena SEMUA kombo -ょ tetap +1 stroke
  // dari kanonik. ぁ/ぉ (kecil) juga punya masalah serupa tapi TIDAK
  // dipakai di kana_characters manapun saat ini — sengaja tidak
  // diperbaiki karena tidak mempengaruhi data yang benar-benar disajikan.
  "ょ": [0, 1],
};

function dedupeStrokes(character: string, data: StrokeData): StrokeData {
  const override = STROKE_INDEX_OVERRIDES[character];
  if (!override) return data;
  return {
    strokes: override.map((i) => data.strokes[i]),
    medians: override.map((i) => data.medians[i]),
  };
}

function combine(a: StrokeData, b: StrokeData): StrokeData {
  return { strokes: [...a.strokes, ...b.strokes], medians: [...a.medians, ...b.medians] };
}

const FORCE = process.argv.includes("--force");

async function main() {
  const { db, close } = createSeedClient();
  const singleCache = new Map<string, StrokeData>();
  const notFound: string[] = [];
  let updated = 0;

  // Reuse a file already on disk instead of re-fetching — makes reruns
  // after a partial failure fast and cheap on the CDN. --force bypasses
  // the cache (e.g. after changing STROKE_INDEX_OVERRIDES for a
  // character whose file was already written by an older dedupe rule).
  async function getSingle(script: string, character: string): Promise<StrokeData> {
    const cacheKey = `${script}:${character}`;
    if (singleCache.has(cacheKey)) return singleCache.get(cacheKey)!;

    const filePath = path.join(OUTPUT_DIR, script, `${character}.json`);
    let data: StrokeData;
    if (!FORCE) {
      try {
        data = JSON.parse(await fs.readFile(filePath, "utf-8"));
        singleCache.set(cacheKey, data);
        return data;
      } catch {
        // fall through to fetch
      }
    }
    data = dedupeStrokes(character, await fetchStrokeData(character));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data));
    singleCache.set(cacheKey, data);
    return data;
  }

  try {
    const rows = await db.select().from(kanaCharacters);
    console.log(`Memproses ${rows.length} karakter...`);

    for (const row of rows) {
      let data: StrokeData;
      try {
        if (row.type === "youon" || row.type === "foreign_combo") {
          // foreign_combo (ティ/ファ/ウィ etc., M03 Phase 3 L05) is the
          // same base+small-vowel assembly as youon — just a different
          // small component (ァィゥェォ instead of ゃゅょ).
          const [base, small] = [...row.character];
          const [baseData, smallData] = await Promise.all([
            getSingle(row.script, base),
            getSingle(row.script, small),
          ]);
          data = combine(baseData, smallData);
          // Combined file is stored under its own two-character key so
          // it doesn't collide with the base character's file.
          const filePath = path.join(OUTPUT_DIR, row.script, `${row.character}.json`);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, JSON.stringify(data));
        } else {
          data = await getSingle(row.script, row.character);
        }
      } catch (error) {
        console.warn(`  tidak ditemukan: "${row.character}" (${row.script}) — ${(error as Error).message}`);
        notFound.push(`${row.character} (${row.script})`);
        continue;
      }

      const strokeDataKey = `${row.script}/${row.character}`;
      await db
        .update(kanaCharacters)
        .set({ strokeCount: data.strokes.length, strokeDataKey })
        .where(eq(kanaCharacters.id, row.id));

      updated++;
    }

    console.log(`Selesai. ${updated}/${rows.length} baris diperbarui dengan stroke_count + stroke_data_key.`);
    if (notFound.length > 0) {
      console.log(`Tidak ditemukan data stroke untuk ${notFound.length} karakter:`, notFound.join(", "));
    }
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("Fetch stroke data gagal:", error);
  process.exit(1);
});
