import fs from "node:fs/promises";
import path from "node:path";

const STROKE_DATA_VERSION = "0.8.0";
const STROKE_CONFIG_VERSION = "0.10.0";
const SOURCE_BASE =
  `https://cdn.jsdelivr.net/npm/@k1low/hanzi-writer-data-jp@${STROKE_DATA_VERSION}`;
const CONFIG_BASE =
  `https://unpkg.com/@k1low/kakitori-data@${STROKE_CONFIG_VERSION}/data`;
const OUTPUT_DIR = path.join(process.cwd(), "public", "kana-strokes", "hiragana");
const BASIC_HIRAGANA = [
  ..."\u3042\u3044\u3046\u3048\u304a",
  ..."\u304b\u304d\u304f\u3051\u3053",
  ..."\u3055\u3057\u3059\u305b\u305d",
  ..."\u305f\u3061\u3064\u3066\u3068",
  ..."\u306a\u306b\u306c\u306d\u306e",
  ..."\u306f\u3072\u3075\u3078\u307b",
  ..."\u307e\u307f\u3080\u3081\u3082",
  ..."\u3084\u3086\u3088",
  ..."\u3089\u308a\u308b\u308c\u308d",
  ..."\u308f\u3092\u3093",
];

type StrokeData = {
  strokes: string[];
  medians: number[][][];
};

type StrokeConfig = {
  character: string;
  strokeGroups?: number[][];
};

function validateGroups(character: string, data: StrokeData, strokeGroups: number[][]) {
  const indices = strokeGroups.flat();
  const valid =
    strokeGroups.length > 0 &&
    indices.length === data.strokes.length &&
    new Set(indices).size === data.strokes.length &&
    indices.every(
      (index) => Number.isInteger(index) && index >= 0 && index < data.strokes.length,
    );
  if (!valid) {
    throw new Error(`strokeGroups tidak valid untuk ${character}.`);
  }
}

async function syncCharacter(character: string) {
  const encoded = encodeURIComponent(character);
  const [dataResponse, configResponse] = await Promise.all([
    fetch(`${SOURCE_BASE}/${encoded}.json`),
    fetch(`${CONFIG_BASE}/${encoded}.json`),
  ]);
  if (!dataResponse.ok) {
    throw new Error(`Data ${character} gagal dimuat: HTTP ${dataResponse.status}.`);
  }

  const data = (await dataResponse.json()) as StrokeData;
  const config = configResponse.ok
    ? ((await configResponse.json()) as StrokeConfig)
    : null;
  const strokeGroups =
    config?.strokeGroups ??
    data.strokes.map((_, index) => [index]);
  validateGroups(character, data, strokeGroups);

  const outputPath = path.join(OUTPUT_DIR, `${character}.json`);
  await fs.writeFile(
    outputPath,
    JSON.stringify({ ...data, strokeGroups }),
    "utf8",
  );
  return {
    character,
    rawSegments: data.strokes.length,
    logicalStrokes: strokeGroups.length,
  };
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const results = [];
  for (const character of BASIC_HIRAGANA) {
    results.push(await syncCharacter(character));
  }

  const grouped = results.filter(
    (result) => result.rawSegments !== result.logicalStrokes,
  );
  console.log(
    `Sinkronisasi selesai: ${results.length} Hiragana dasar, ${grouped.length} memakai pengelompokan segmen.`,
  );
  console.log(
    grouped
      .map(
        (result) =>
          `${result.character}: ${result.rawSegments} segmen -> ${result.logicalStrokes} goresan`,
      )
      .join("\n"),
  );
}

main().catch((error) => {
  console.error("Sinkronisasi stroke Hiragana gagal:", error);
  process.exit(1);
});
