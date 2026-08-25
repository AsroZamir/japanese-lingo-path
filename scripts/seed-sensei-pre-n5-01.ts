import fs from "node:fs/promises";
import path from "node:path";
import { eq, and, sql } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { learningModules, learningStages } from "../db/schema/curriculum";
import { kanaCharacters } from "../db/schema/kana";
import { senseiSegments } from "../db/schema/sensei";
import { HIRAGANA_BASIC_CHARACTERS } from "../app/lib/hiragana-mnemonics";
import type { SenseiVisualAction } from "../app/lib/sensei-types";

// PROMPT-9 Bagian 5/6 — authored content for the Mesin Sensei's first
// real instance: PRE-N5.01. See docs/POLA-MODUL-BARU.md for why this
// table is deliberately module-agnostic (any of the other 66 modules can
// add rows the same way, no schema change needed).
//
// PERLU DITINJAU: naskah di bawah ini ditulis oleh Claude Code, belum
// melalui QA linguistik penutur asli (V2.1 Bagian 16 butir 10).

type SegmentSeed = {
  segmentType: "module_intro" | "phase_intro" | "concept_moment";
  stageCode: string | null;
  orderIndex: number;
  boardText: string;
  visualAction: SenseiVisualAction;
  pose: "netral" | "menunjuk" | "menjelaskan" | "memberi-semangat" | "berpikir" | "menulis" | "merayakan" | "prihatin-mendukung";
  narrationText: string;
};

const MODULE_INTRO: SegmentSeed[] = [
  {
    segmentType: "module_intro",
    stageCode: null,
    orderIndex: 0,
    boardText:
      "Selamat datang. Hari ini kita mulai dari fondasi paling dasar bahasa Jepang: cara tulisannya bekerja.",
    visualAction: { kind: "text" },
    pose: "memberi-semangat",
    narrationText:
      "Selamat datang. Sebelum kita mulai menghafal huruf, sensei mau menjelaskan dulu gambaran besarnya, supaya kamu tahu sedang menuju ke mana.",
  },
  {
    segmentType: "module_intro",
    stageCode: null,
    orderIndex: 1,
    boardText: "Bahasa Jepang punya tiga sistem tulisan yang dipakai bersamaan, bukan pilih salah satu.",
    visualAction: {
      kind: "compare",
      items: [
        { label: "Hiragana", example: "ひらがな", note: "kata asli Jepang, bagian gramatikal" },
        { label: "Katakana", example: "カタカナ", note: "kata serapan asing, mis. テレビ" },
        { label: "Kanji", example: "漢字", note: "dari Tiongkok, ribuan, satu huruf = satu makna" },
      ],
    },
    pose: "menunjuk",
    narrationText:
      "Bahasa Jepang punya tiga sistem tulisan, dan ketiganya dipakai bersamaan dalam satu kalimat, bukan dipilih salah satu. Hiragana untuk kata asli Jepang dan bagian gramatikal. Katakana bentuknya lebih bersudut, dipakai untuk kata serapan dari bahasa asing. Kanji berasal dari Tiongkok, jumlahnya ribuan, dan satu huruf membawa satu makna sendiri. Untuk kanji, tidak usah takut dulu — itu jauh di depan, bukan hari ini.",
  },
  {
    segmentType: "module_intro",
    stageCode: null,
    orderIndex: 2,
    boardText: "Hari ini fokus kita hanya satu: hiragana. 46 huruf dasar.",
    visualAction: { kind: "glyph", char: "あ", label: "salah satu dari 46 huruf hiragana dasar" },
    pose: "netral",
    narrationText:
      "Hari ini kita fokus hanya pada hiragana — 46 huruf dasar. Setelah modul ini selesai, kamu akan bisa membaca menu makanan, papan nama, dan tulisan sehari-hari yang pakai hiragana.",
  },
  {
    segmentType: "module_intro",
    stageCode: null,
    orderIndex: 3,
    boardText: "Konsep penting: satu huruf hiragana = satu suku kata, bukan satu bunyi.",
    visualAction: {
      kind: "compare",
      items: [
        { label: "Alfabet Latin", example: "k + a", note: "dua huruf, digabung jadi bunyi \"ka\"" },
        { label: "Hiragana", example: "か", note: "satu huruf, langsung berbunyi \"ka\"" },
      ],
    },
    pose: "menunjuk",
    narrationText:
      "Ini beda penting dari alfabet Latin yang kamu pakai sehari-hari. Di alfabet Latin, huruf k dan a digabung dulu untuk membentuk bunyi \"ka\". Di hiragana, か itu SATU huruf tunggal, dan langsung berbunyi \"ka\" — bukan gabungan dua huruf terpisah. Satu huruf hiragana mewakili satu suku kata utuh.",
  },
  {
    segmentType: "module_intro",
    stageCode: null,
    orderIndex: 4,
    boardText: "Kabar baik: kamu sudah tahu setengah dari bunyinya. Vokal Jepang = vokal Indonesia, persis sama.",
    visualAction: {
      kind: "table",
      columns: ["Hiragana", "Bunyi", "Sama seperti di Indonesia"],
      rows: [
        ["あ", "a", "seperti \"a\" pada kata \"apa\""],
        ["い", "i", "seperti \"i\" pada kata \"ini\""],
        ["う", "u", "seperti \"u\" pada kata \"itu\""],
        ["え", "e", "seperti \"e\" pada kata \"ekor\""],
        ["お", "o", "seperti \"o\" pada kata \"oke\""],
      ],
    },
    pose: "memberi-semangat",
    narrationText:
      "Sekarang kabar baiknya. Pembelajar berbahasa Indonesia punya keuntungan yang tidak dimiliki pembelajar berbahasa Inggris di titik ini: vokal bahasa Jepang — a, i, u, e, o — identik dengan vokal bahasa Indonesia. Bukan mirip, tapi benar-benar sama persis dengan cara kamu mengucapkannya sehari-hari. Konsonan seperti k, s, t, n, h, m, y, r, w juga sama. Yang beda supaya tidak salah kira: つ dibaca \"tsu\", ふ ada di antara \"f\" dan \"h\", dan り bukan \"r\" Indonesia yang digulung di lidah.",
  },
  {
    segmentType: "module_intro",
    stageCode: null,
    orderIndex: 5,
    boardText: "46 huruf dibagi 5 kelompok kecil. Belajar sedikit, lalu uji semua yang sudah dipelajari.",
    visualAction: { kind: "text" },
    pose: "memberi-semangat",
    narrationText:
      "Supaya tidak berat, 46 huruf ini akan dibagi jadi 5 kelompok kecil — tidak dihafal sekaligus. Setiap kelompok, kita belajar sedikit huruf baru, lalu uji semua yang sudah dipelajari sejauh ini. Siap? Mari kita mulai.",
  },
];

const PHASE_INTRO_BY_STAGE: Record<string, SegmentSeed[]> = {
  F1: [
    {
      segmentType: "phase_intro",
      stageCode: "F1",
      orderIndex: 0,
      boardText: "Kelompok 1: baris あ (vokal murni) dan baris か. 10 huruf baru.",
      visualAction: {
        kind: "table",
        columns: ["Baris あ", "Baris か"],
        rows: [["あ i u え お", "か き く け こ"]],
      },
      pose: "menunjuk",
      narrationText:
        "Kelompok pertama: baris あ, yaitu lima vokal murni yang sudah kamu kenal bunyinya, ditambah baris か. Sepuluh huruf baru. Setelah kelompok ini, kamu sudah bisa membaca dan mengucapkan sepuluh huruf hiragana pertamamu.",
    },
  ],
  F2: [
    {
      segmentType: "phase_intro",
      stageCode: "F2",
      orderIndex: 0,
      boardText: "Kelompok 2: baris さ dan baris た. 10 huruf baru, total 20.",
      visualAction: { kind: "text" },
      pose: "menunjuk",
      narrationText:
        "Kelompok dua: baris さ dan baris た, sepuluh huruf baru lagi. Setelah ini totalmu jadi 20 huruf. Ujiannya akan mencampur huruf baru dengan huruf dari kelompok satu — supaya tidak lupa yang lama.",
    },
  ],
  F3: [
    {
      segmentType: "phase_intro",
      stageCode: "F3",
      orderIndex: 0,
      boardText: "Kelompok 3: baris な dan baris は. 10 huruf baru, total 30.",
      visualAction: { kind: "text" },
      pose: "menunjuk",
      narrationText:
        "Kelompok tiga: baris な dan baris は, sepuluh huruf baru. Total jadi 30 huruf — lebih dari setengah jalan.",
    },
  ],
  F4: [
    {
      segmentType: "phase_intro",
      stageCode: "F4",
      orderIndex: 0,
      boardText: "Kelompok 4: baris ま, baris や, dan sebagian baris ら. 10 huruf baru, total 40.",
      visualAction: { kind: "text" },
      pose: "menunjuk",
      narrationText:
        "Kelompok empat: baris ま, baris や, dan dua huruf pertama baris ら. Sepuluh huruf baru, total jadi 40. Tinggal sedikit lagi.",
    },
  ],
  F5: [
    {
      segmentType: "phase_intro",
      stageCode: "F5",
      orderIndex: 0,
      boardText: "Kelompok 5, kelompok terakhir: る れ ろ わ を ん. 6 huruf baru, total 46 — lengkap.",
      visualAction: { kind: "text" },
      pose: "memberi-semangat",
      narrationText:
        "Kelompok terakhir: enam huruf — る, れ, ろ, わ, を, dan ん. Setelah ini kamu punya bank lengkap 46 huruf hiragana dasar, siap untuk ujian akhir gabungan.",
    },
  ],
};

const CONCEPT_MOMENTS: Record<string, SegmentSeed[]> = {
  F6: [
    {
      segmentType: "concept_moment",
      stageCode: "F6",
      orderIndex: 0,
      boardText: "Konsep baru: tanda ゛(dakuten) dan ゜(handakuten) mengubah bunyi huruf.",
      visualAction: {
        kind: "compare",
        items: [
          { label: "か → が", example: "が", note: "\"ka\" jadi \"ga\"" },
          { label: "は → ば", example: "ば", note: "\"ha\" jadi \"ba\"" },
          { label: "は → ぱ", example: "ぱ", note: "\"ha\" jadi \"pa\"" },
        ],
      },
      pose: "berpikir",
      narrationText:
        "Sekarang ada konsep baru. Dua tanda kecil bisa ditambahkan di kanan atas sebuah huruf untuk mengubah bunyinya. Tanda dakuten, dua garis miring kecil, mengubah か menjadi が — dari \"ka\" jadi \"ga\". Huruf yang sama juga bisa berubah lagi dengan tanda handakuten, sebuah lingkaran kecil: は menjadi ぱ, dari \"ha\" jadi \"pa\". Bentuk dasar hurufnya tidak berubah — hanya tandanya yang ditambahkan.",
    },
  ],
  F9: [
    {
      segmentType: "concept_moment",
      stageCode: "F9",
      orderIndex: 0,
      boardText: "Konsep baru: youon. Dua huruf ditulis berdekatan, tapi dibaca sebagai SATU suku kata.",
      visualAction: {
        kind: "compare",
        items: [
          { label: "きゃ", example: "きゃ", note: "\"kya\", bukan \"ki-ya\"" },
          { label: "きゅ", example: "きゅ", note: "\"kyu\", bukan \"ki-yu\"" },
          { label: "きょ", example: "きょ", note: "\"kyo\", bukan \"ki-yo\"" },
        ],
      },
      pose: "berpikir",
      narrationText:
        "Konsep baru lagi: youon. Kamu akan melihat huruf besar diikuti huruf kecil ゃ, ゅ, atau ょ. Contohnya きゃ. Ini BUKAN dua suku kata terpisah \"ki\" lalu \"ya\" — keduanya dibaca sebagai satu suku kata gabungan: \"kya\". Huruf keduanya memang ditulis lebih kecil supaya kamu tahu ini bukan huruf berdiri sendiri.",
    },
  ],
};

// Rough Indonesian stroke-direction narration, computed from the SAME
// median coordinate data KanaStrokeAnimator renders — not hand-authored
// per character (46 characters would be a lot of manual writing), but
// genuinely derived from real geometry, not guessed. PERLU DITINJAU:
// mechanically generated, still needs a native-speaker pass for phrasing
// naturalness (see final report).
type KanaStrokeJson = { strokes: string[]; medians: number[][][]; strokeGroups?: number[][] };

function directionPhrase(dx: number, dy: number): string {
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle >= -22.5 && angle < 22.5) return "ke kanan";
  if (angle >= 22.5 && angle < 67.5) return "diagonal turun ke kanan";
  if (angle >= 67.5 && angle < 112.5) return "lurus ke bawah";
  if (angle >= 112.5 && angle < 157.5) return "diagonal turun ke kiri";
  if (angle >= 157.5 || angle < -157.5) return "ke kiri";
  if (angle >= -157.5 && angle < -112.5) return "diagonal naik ke kiri";
  if (angle >= -112.5 && angle < -67.5) return "lurus ke atas";
  return "diagonal naik ke kanan";
}

function startPositionPhrase(x: number, y: number, bbox: { minX: number; maxX: number; minY: number; maxY: number }): string {
  const midX = (bbox.minX + bbox.maxX) / 2;
  const midY = (bbox.minY + bbox.maxY) / 2;
  const vertical = y > midY ? "atas" : "bawah"; // raw y larger = visually higher
  const horizontal = x < midX ? "kiri" : x > midX ? "kanan" : "tengah";
  return horizontal === "tengah" ? "tengah " + vertical : horizontal + " " + vertical;
}

function buildStrokeNarration(data: KanaStrokeJson): string {
  const groups = data.strokeGroups && data.strokeGroups.length > 0 ? data.strokeGroups : data.medians.map((_, i) => [i]);
  const allPoints = data.medians.flat();
  const bbox = {
    minX: Math.min(...allPoints.map((p) => p[0])),
    maxX: Math.max(...allPoints.map((p) => p[0])),
    minY: Math.min(...allPoints.map((p) => p[1])),
    maxY: Math.max(...allPoints.map((p) => p[1])),
  };

  const lines = groups.map((group, index) => {
    const firstMedian = data.medians[group[0]];
    const lastMedian = data.medians[group[group.length - 1]];
    const start = firstMedian[0];
    const end = lastMedian[lastMedian.length - 1];
    const dx = end[0] - start[0];
    const dy = start[1] - end[1]; // screen-down positive, see script comment
    const direction = directionPhrase(dx, dy);
    const startPos = startPositionPhrase(start[0], start[1], bbox);
    return "Goresan " + (index + 1) + ": mulai dari " + startPos + ", " + direction + ".";
  });

  return (
    "Perhatikan urutan goresannya, satu per satu. " +
    lines.join(" ") +
    " Sensei akan menulisnya sekarang — perhatikan papan tulis."
  );
}

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [moduleRow] = await db.select().from(learningModules).where(eq(learningModules.code, "PRE-N5.01"));
    if (!moduleRow) throw new Error("Modul PRE-N5.01 tidak ditemukan.");
    const moduleId = moduleRow.id;

    const stageRows = await db.select().from(learningStages).where(eq(learningStages.moduleId, moduleId));
    const stageIdByCode = new Map(stageRows.map((row) => [row.code, row.id]));

    // Clear any previous run's rows for this module before re-inserting —
    // makes this script safely re-runnable (content-authoring scripts in
    // this repo are meant to be idempotent, not append-only).
    await db.delete(senseiSegments).where(eq(senseiSegments.moduleId, moduleId));

    const allSegments: SegmentSeed[] = [
      ...MODULE_INTRO,
      ...Object.values(PHASE_INTRO_BY_STAGE).flat(),
      ...Object.values(CONCEPT_MOMENTS).flat(),
    ];

    let inserted = 0;
    for (const segment of allSegments) {
      const stageId = segment.stageCode ? stageIdByCode.get(segment.stageCode) ?? null : null;
      if (segment.stageCode && !stageId) {
        console.warn(`Lewati segmen: stage ${segment.stageCode} tidak ditemukan.`);
        continue;
      }
      await db.insert(senseiSegments).values({
        moduleId,
        stageId,
        kanaId: null,
        segmentType: segment.segmentType,
        orderIndex: segment.orderIndex,
        boardText: segment.boardText,
        visualAction: segment.visualAction,
        senseiPose: segment.pose,
        narrationText: segment.narrationText,
        contentVersion: "v1",
      });
      inserted++;
    }
    console.log(`Segmen module_intro/phase_intro/concept_moment: ${inserted} baris dimasukkan.`);

    // Writing-demo narration for all 46 core hiragana.
    const kanaRows = await db
      .select()
      .from(kanaCharacters)
      .where(and(eq(kanaCharacters.script, "hiragana"), eq(kanaCharacters.type, "basic")));
    const kanaByChar = new Map(kanaRows.map((row) => [row.character, row]));

    let writingInserted = 0;
    let writingSkipped = 0;
    for (const character of HIRAGANA_BASIC_CHARACTERS) {
      const kana = kanaByChar.get(character);
      if (!kana || !kana.strokeDataKey) {
        writingSkipped++;
        console.warn(`Lewati ${character}: tidak ada kana_id atau stroke_data_key.`);
        continue;
      }
      const filePath = path.join(process.cwd(), "public", "kana-strokes", `${kana.strokeDataKey}.json`);
      let data: KanaStrokeJson;
      try {
        data = JSON.parse(await fs.readFile(filePath, "utf8"));
      } catch {
        writingSkipped++;
        console.warn(`Lewati ${character}: file stroke ${filePath} tidak terbaca.`);
        continue;
      }
      const narrationText = buildStrokeNarration(data);
      await db.insert(senseiSegments).values({
        moduleId,
        stageId: null,
        kanaId: kana.id,
        segmentType: "writing_demo",
        orderIndex: 0,
        boardText: "Perhatikan urutan dan arah goresannya.",
        visualAction: { kind: "write_char" },
        senseiPose: "menunjuk",
        narrationText,
        contentVersion: "v1",
      });
      writingInserted++;
    }
    console.log(`Narasi writing_demo: ${writingInserted} karakter dimasukkan, ${writingSkipped} dilewati.`);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(senseiSegments)
      .where(eq(senseiSegments.moduleId, moduleId));
    console.log(`Total baris sensei_segments untuk PRE-N5.01 sekarang: ${count}.`);

    console.log(
      "\nPERLU DITINJAU: seluruh naskah (module_intro/phase_intro/concept_moment) dan narasi writing_demo " +
        "yang dihasilkan otomatis dari data goresan belum melalui QA linguistik penutur asli (V2.1 Bagian 16 butir 10).",
    );
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-sensei-pre-n5-01 gagal:", error);
  process.exit(1);
});
