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
const STROKE_DATA_VERSION = "0.8.0";
const STROKE_CONFIG_VERSION = "0.10.0";
const SOURCE_BASE =
  `https://cdn.jsdelivr.net/npm/@k1low/hanzi-writer-data-jp@${STROKE_DATA_VERSION}`;
const CONFIG_BASE =
  `https://unpkg.com/@k1low/kakitori-data@${STROKE_CONFIG_VERSION}/data`;
const OUTPUT_DIR = path.join(process.cwd(), "public", "kana-strokes");

type StrokeData = {
  strokes: string[];
  medians: number[][][];
  strokeGroups?: number[][];
};

type StrokeConfig = {
  character: string;
  strokeGroups?: number[][];
};

async function fetchStrokeData(character: string): Promise<StrokeData> {
  const dataUrl = `${SOURCE_BASE}/${encodeURIComponent(character)}.json`;
  const configUrl = `${CONFIG_BASE}/${encodeURIComponent(character)}.json`;
  const [dataResponse, configResponse] = await Promise.all([
    fetch(dataUrl),
    fetch(configUrl),
  ]);
  if (!dataResponse.ok) {
    throw new Error(`HTTP ${dataResponse.status} dari ${dataUrl}`);
  }

  const data = (await dataResponse.json()) as StrokeData;
  const config = configResponse.ok
    ? ((await configResponse.json()) as StrokeConfig)
    : null;
  const strokeGroups =
    config?.strokeGroups ??
    data.strokes.map((_, index) => [index]);
  const groupedIndices = strokeGroups.flat();
  const validGroups =
    strokeGroups.length > 0 &&
    groupedIndices.length === data.strokes.length &&
    new Set(groupedIndices).size === data.strokes.length &&
    groupedIndices.every(
      (index) => Number.isInteger(index) && index >= 0 && index < data.strokes.length,
    );
  if (!validGroups) {
    throw new Error(`Konfigurasi strokeGroups tidak valid untuk ${character}.`);
  }

  return { ...data, strokeGroups };
}

// Sebagian goresan logis dibagi menjadi beberapa path SVG oleh sumber data.
// strokeGroups mempertahankan seluruh path tanpa menghitungnya sebagai goresan tambahan.
function combine(a: StrokeData, b: StrokeData): StrokeData {
  const aGroups = a.strokeGroups ?? a.strokes.map((_, index) => [index]);
  const bGroups = b.strokeGroups ?? b.strokes.map((_, index) => [index]);
  const bOffset = a.strokes.length;
  return {
    strokes: [...a.strokes, ...b.strokes],
    medians: [...a.medians, ...b.medians],
    strokeGroups: [
      ...aGroups,
      ...bGroups.map((group) =>
        group.map((index) => index + bOffset),
      ),
    ],
  };
}

const FORCE = process.argv.includes("--force");

async function main() {
  const { db, close } = createSeedClient();
  const singleCache = new Map<string, StrokeData>();
  const notFound: string[] = [];
  let updated = 0;

  // Reuse a file already on disk instead of re-fetching — makes reruns
  // after a partial failure fast and cheap on the CDN. --force bypasses
  // the cache after a source-data or grouping update.
  async function getSingle(script: string, character: string): Promise<StrokeData> {
    const cacheKey = `${script}:${character}`;
    if (singleCache.has(cacheKey)) return singleCache.get(cacheKey)!;

    const filePath = path.join(OUTPUT_DIR, script, `${character}.json`);
    let data: StrokeData;
    if (!FORCE) {
      try {
        data = JSON.parse(await fs.readFile(filePath, "utf-8"));
        if (
          Array.isArray(data.strokeGroups) &&
          data.strokeGroups.flat().length === data.strokes.length
        ) {
          singleCache.set(cacheKey, data);
          return data;
        }
      } catch {
        // fall through to fetch
      }
    }
    data = await fetchStrokeData(character);
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
        .set({
          strokeCount: data.strokeGroups?.length ?? data.strokes.length,
          strokeDataKey,
        })
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
