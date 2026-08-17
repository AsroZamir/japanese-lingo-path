import * as wanakana from "wanakana";
import { sql } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaCharacters } from "../db/schema/kana";

type Script = "hiragana" | "katakana";
type KanaType = "basic" | "dakuten" | "handakuten" | "youon" | "sokuon" | "long_vowel";

// ── Structural data (rows/groups), not romaji — romaji is always derived. ──
const GOJUON_ROWS: { code: string; chars: string[] }[] = [
  { code: "A", chars: ["あ", "い", "う", "え", "お"] },
  { code: "B", chars: ["か", "き", "く", "け", "こ"] },
  { code: "C", chars: ["さ", "し", "す", "せ", "そ"] },
  { code: "D", chars: ["た", "ち", "つ", "て", "と"] },
  { code: "E", chars: ["な", "に", "ぬ", "ね", "の"] },
  { code: "F", chars: ["は", "ひ", "ふ", "へ", "ほ"] },
  { code: "G", chars: ["ま", "み", "む", "め", "も"] },
  { code: "H", chars: ["や", "ゆ", "よ"] },
  { code: "I", chars: ["ら", "り", "る", "れ", "ろ"] },
  { code: "J", chars: ["わ", "を", "ん"] },
];
const DAKUTEN_ROWS = ["B", "C", "D", "F"]; // か さ た は
const HANDAKUTEN_ROWS = ["F"]; // は only
const YOUON_BASES = ["き", "し", "ち", "に", "ひ", "み", "り", "ぎ", "じ", "び", "ぴ"];
const SMALL_Y = ["ゃ", "ゅ", "ょ"];

// Characters where automatic romaji derivation is wrong or has no answer.
const ROMAJI_OVERRIDES: Record<string, string> = {
  "を": "o", // wanakana gives "wo"; actual pronunciation is "o"
  "ヲ": "o",
  "っ": "-", // no independent sound; doubles the following consonant
  "ッ": "-",
};

const NOTES_OVERRIDES: Record<string, string> = {
  "ん": "Bunyi bervariasi tergantung konsonan berikutnya (n/m/ny) — tidak punya satu padanan romaji yang tetap.",
  "ン": "Bunyi bervariasi tergantung konsonan berikutnya (n/m/ny) — tidak punya satu padanan romaji yang tetap.",
  "じ": "Sebunyi dengan ぢ pada bahasa Jepang modern. じ dipakai di hampir semua kata; ぢ hanya muncul lewat rendaku dari ち.",
  "ぢ": "Sebunyi dengan じ pada bahasa Jepang modern — bukan kesalahan ketik. Muncul lewat rendaku dari ち (mis. はな + ちる → はなぢる).",
  "ジ": "Sebunyi dengan ヂ pada bahasa Jepang modern. Bentuk ヂ sangat jarang dipakai di luar kata serapan tertentu.",
  "ヂ": "Sebunyi dengan ジ pada bahasa Jepang modern — bentuk ini jarang dipakai.",
  "ず": "Sebunyi dengan づ pada bahasa Jepang modern. ず dipakai di hampir semua kata; づ hanya muncul lewat rendaku dari つ.",
  "づ": "Sebunyi dengan ず pada bahasa Jepang modern — bukan kesalahan ketik. Muncul lewat rendaku dari つ (mis. て + つづき → てつづき).",
  "ズ": "Sebunyi dengan ヅ pada bahasa Jepang modern. Bentuk ヅ sangat jarang dipakai di luar kata serapan tertentu.",
  "ヅ": "Sebunyi dengan ズ pada bahasa Jepang modern — bentuk ini jarang dipakai.",
  "っ": "Tidak punya bunyi sendiri — menggandakan konsonan suku kata berikutnya (mis. がっこう dibaca gakkou).",
  "ッ": "Tidak punya bunyi sendiri — menggandakan konsonan suku kata berikutnya, dipakai di kata serapan (mis. ベッド dibaca beddo).",
  "ー": "Tanda perpanjangan vokal, khusus katakana (mis. コーヒー dibaca koohii).",
};

function romajiFor(character: string): string {
  if (character in ROMAJI_OVERRIDES) return ROMAJI_OVERRIDES[character];
  const romaji = wanakana.toRomaji(character);
  if (!romaji) {
    throw new Error(
      `wanakana tidak bisa menerjemahkan romaji untuk "${character}". Tambahkan entri manual di ROMAJI_OVERRIDES sebelum menjalankan script ini lagi.`,
    );
  }
  return romaji;
}

function key(script: Script, character: string) {
  return `${script}:${character}`;
}

type PendingKana = {
  script: Script;
  character: string;
  type: KanaType;
  groupCode: string | null;
  orderInGroup: number | null;
  baseCharacterKey: string | null;
};

function buildPendingKana(): PendingKana[] {
  const pending: PendingKana[] = [];

  // 1. Basic 46 hiragana + mirrored katakana (derived via wanakana, not typed by hand).
  for (const row of GOJUON_ROWS) {
    row.chars.forEach((h, index) => {
      const k = wanakana.toKatakana(h);
      pending.push({ script: "hiragana", character: h, type: "basic", groupCode: row.code, orderInGroup: index + 1, baseCharacterKey: null });
      pending.push({ script: "katakana", character: k, type: "basic", groupCode: row.code, orderInGroup: index + 1, baseCharacterKey: null });
    });
  }

  // 2. Dakuten — hiragana/katakana blocks place the voiced form exactly one
  // codepoint after the base (か U+304B -> が U+304C), so we derive rather
  // than hand-type these too.
  for (const row of GOJUON_ROWS.filter((r) => DAKUTEN_ROWS.includes(r.code))) {
    for (const h of row.chars) {
      const k = wanakana.toKatakana(h);
      const dakutenH = String.fromCodePoint(h.codePointAt(0)! + 1);
      const dakutenK = String.fromCodePoint(k.codePointAt(0)! + 1);
      pending.push({ script: "hiragana", character: dakutenH, type: "dakuten", groupCode: null, orderInGroup: null, baseCharacterKey: key("hiragana", h) });
      pending.push({ script: "katakana", character: dakutenK, type: "dakuten", groupCode: null, orderInGroup: null, baseCharacterKey: key("katakana", k) });
    }
  }

  // 3. Handakuten — は row only, base + 2 codepoints (は -> ば -> ぱ).
  for (const row of GOJUON_ROWS.filter((r) => HANDAKUTEN_ROWS.includes(r.code))) {
    for (const h of row.chars) {
      const k = wanakana.toKatakana(h);
      const handakutenH = String.fromCodePoint(h.codePointAt(0)! + 2);
      const handakutenK = String.fromCodePoint(k.codePointAt(0)! + 2);
      pending.push({ script: "hiragana", character: handakutenH, type: "handakuten", groupCode: null, orderInGroup: null, baseCharacterKey: key("hiragana", h) });
      pending.push({ script: "katakana", character: handakutenK, type: "handakuten", groupCode: null, orderInGroup: null, baseCharacterKey: key("katakana", k) });
    }
  }

  // 4. Youon (standard pedagogical set of 33 per script; rare/obsolete
  // combinations like ぢゃ are intentionally excluded).
  for (const base of YOUON_BASES) {
    for (const small of SMALL_Y) {
      const h = base + small;
      const k = wanakana.toKatakana(base) + wanakana.toKatakana(small);
      pending.push({ script: "hiragana", character: h, type: "youon", groupCode: null, orderInGroup: null, baseCharacterKey: null });
      pending.push({ script: "katakana", character: k, type: "youon", groupCode: null, orderInGroup: null, baseCharacterKey: null });
    }
  }

  // 5. Sokuon
  pending.push({ script: "hiragana", character: "っ", type: "sokuon", groupCode: null, orderInGroup: null, baseCharacterKey: null });
  pending.push({ script: "katakana", character: "ッ", type: "sokuon", groupCode: null, orderInGroup: null, baseCharacterKey: null });

  // 6. Long vowel mark (katakana only)
  pending.push({ script: "katakana", character: "ー", type: "long_vowel", groupCode: null, orderInGroup: null, baseCharacterKey: null });

  return pending;
}

// Columns this script owns. onConflictDoUpdate only ever touches these —
// audio_url / stroke_count / stroke_data_key are filled by later scripts
// (Bagian C+) and must survive re-runs of this one.
const OWNED_UPDATE_SET = {
  romaji: sql`excluded.romaji`,
  type: sql`excluded.type`,
  groupCode: sql`excluded.group_code`,
  orderInGroup: sql`excluded.order_in_group`,
  notesId: sql`excluded.notes_id`,
};

async function seed() {
  const pending = buildPendingKana();
  const { db, close } = createSeedClient();

  try {
    const basics = pending.filter((p) => p.type === "basic");
    const basicRows = basics.map((p) => ({
      script: p.script,
      character: p.character,
      romaji: romajiFor(p.character),
      type: p.type,
      groupCode: p.groupCode,
      orderInGroup: p.orderInGroup,
      notesId: NOTES_OVERRIDES[p.character] ?? null,
    }));

    const insertedBasics = await db
      .insert(kanaCharacters)
      .values(basicRows)
      .onConflictDoUpdate({
        target: [kanaCharacters.script, kanaCharacters.character],
        set: OWNED_UPDATE_SET,
      })
      .returning({ id: kanaCharacters.id, script: kanaCharacters.script, character: kanaCharacters.character });

    const idMap = new Map(insertedBasics.map((r) => [key(r.script as Script, r.character), r.id]));

    const rest = pending.filter((p) => p.type !== "basic");
    const restRows = rest.map((p) => {
      const baseCharacterId = p.baseCharacterKey ? idMap.get(p.baseCharacterKey) ?? null : null;
      if (p.baseCharacterKey && baseCharacterId == null) {
        throw new Error(
          `Tidak menemukan base_character_id untuk "${p.character}" (mencari kunci "${p.baseCharacterKey}"). Karakter dasarnya belum ter-insert — periksa urutan batch.`,
        );
      }
      return {
        script: p.script,
        character: p.character,
        romaji: romajiFor(p.character),
        type: p.type,
        groupCode: p.groupCode,
        orderInGroup: p.orderInGroup,
        baseCharacterId,
        notesId: NOTES_OVERRIDES[p.character] ?? null,
      };
    });

    await db
      .insert(kanaCharacters)
      .values(restRows)
      .onConflictDoUpdate({
        target: [kanaCharacters.script, kanaCharacters.character],
        set: { ...OWNED_UPDATE_SET, baseCharacterId: sql`excluded.base_character_id` },
      });

    const byType = [...basicRows, ...restRows].reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = (acc[r.type] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`Selesai. Total ${basicRows.length + restRows.length} karakter kana:`, byType);
  } finally {
    await close();
  }
}

seed().catch((error) => {
  console.error("Seed gagal:", error);
  process.exit(1);
});
