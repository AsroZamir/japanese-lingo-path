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

// Some raw entries from the source contain a leftover duplicate stroke —
// a median that shares most of its points with an earlier one in the
// same character (e.g. あ's raw data has 4 medians, but #2 and #3 share
// ~77% of their points; の has 2 medians sharing ~94%). Real distinct
// strokes in this dataset never exceed ~27% incidental point overlap
// (checked across the whole 211-character set), so this is a clean,
// well-separated signal, not a guess. Stripped here — at the source —
// rather than just subtracting from stroke_count, since a leftover path
// would otherwise also corrupt stroke-order animation and handwriting
// validation downstream.
const DUPLICATE_OVERLAP_THRESHOLD = 0.5;

function pointKey(point: number[]) {
  return `${point[0]},${point[1]}`;
}

function overlapRatio(a: number[][], b: number[][]): number {
  const setA = new Set(a.map(pointKey));
  const setB = new Set(b.map(pointKey));
  let shared = 0;
  for (const key of setA) if (setB.has(key)) shared++;
  return shared / Math.min(setA.size, setB.size);
}

function dedupeStrokes(character: string, data: StrokeData): StrokeData {
  const keptStrokes: string[] = [];
  const keptMedians: number[][][] = [];

  data.medians.forEach((median, index) => {
    const duplicateOf = keptMedians.findIndex(
      (kept) => overlapRatio(kept, median) >= DUPLICATE_OVERLAP_THRESHOLD,
    );
    if (duplicateOf !== -1) {
      console.warn(`  "${character}": stroke ${index} dibuang (duplikat stroke ${duplicateOf})`);
      return;
    }
    keptStrokes.push(data.strokes[index]);
    keptMedians.push(median);
  });

  return { strokes: keptStrokes, medians: keptMedians };
}

function combine(a: StrokeData, b: StrokeData): StrokeData {
  return { strokes: [...a.strokes, ...b.strokes], medians: [...a.medians, ...b.medians] };
}

async function main() {
  const { db, close } = createSeedClient();
  const singleCache = new Map<string, StrokeData>();
  const notFound: string[] = [];
  let updated = 0;

  // Reuse a file already on disk instead of re-fetching — makes reruns
  // after a partial failure fast and cheap on the CDN.
  async function getSingle(script: string, character: string): Promise<StrokeData> {
    const cacheKey = `${script}:${character}`;
    if (singleCache.has(cacheKey)) return singleCache.get(cacheKey)!;

    const filePath = path.join(OUTPUT_DIR, script, `${character}.json`);
    let data: StrokeData;
    try {
      data = JSON.parse(await fs.readFile(filePath, "utf-8"));
    } catch {
      data = dedupeStrokes(character, await fetchStrokeData(character));
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data));
    }
    singleCache.set(cacheKey, data);
    return data;
  }

  try {
    const rows = await db.select().from(kanaCharacters);
    console.log(`Memproses ${rows.length} karakter...`);

    for (const row of rows) {
      let data: StrokeData;
      try {
        if (row.type === "youon") {
          const [base, small] = [...row.character];
          const [baseData, smallData] = await Promise.all([
            getSingle(row.script, base),
            getSingle(row.script, small),
          ]);
          data = combine(baseData, smallData);
          // Youon's combined file is stored under its own two-character
          // key so it doesn't collide with the base character's file.
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
