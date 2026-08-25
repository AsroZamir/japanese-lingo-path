import { eq, sql } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { learningModules } from "../db/schema/curriculum";
import { senseiSegments } from "../db/schema/sensei";
import type { SenseiVisualAction } from "../app/lib/sensei-types";
import type { SenseiPose } from "../db/schema/sensei";

// PROMPT-9 Bagian 7 — module_intro only (no phase_intro/concept_moment/
// writing_demo) for PRE-N5.02 and PRE-N5.03, reusing the exact same
// Mesin Sensei infrastructure built for PRE-N5.01. Deliberately lean —
// "kalau tidak sempat, jangan paksa; mesin dan hiragana lebih penting."
//
// PERLU DITINJAU: naskah di bawah belum melalui QA linguistik penutur
// asli (V2.1 Bagian 16 butir 10).

type Segment = {
  orderIndex: number;
  boardText: string;
  visualAction: SenseiVisualAction;
  pose: SenseiPose;
  narrationText: string;
};

const KATAKANA_INTRO: Segment[] = [
  {
    orderIndex: 0,
    boardText: "Kamu sudah menguasai hiragana. Sekarang: kenapa bahasa Jepang butuh sistem tulisan KEDUA?",
    visualAction: { kind: "text" },
    pose: "berpikir",
    narrationText:
      "Kamu sudah menguasai hiragana. Sekarang pertanyaannya: kenapa bahasa Jepang masih butuh satu sistem tulisan lagi? Sensei jelaskan alasannya.",
  },
  {
    orderIndex: 1,
    boardText: "Katakana khusus untuk kata serapan dari bahasa asing — bentuknya lebih bersudut, lebih tegas.",
    visualAction: {
      kind: "compare",
      items: [
        { label: "テレビ", example: "terebi", note: "dari bahasa Inggris \"television\"" },
        { label: "コーヒー", example: "koohii", note: "dari bahasa Belanda \"koffie\"" },
      ],
    },
    pose: "menunjuk",
    narrationText:
      "Katakana dipakai khusus untuk kata serapan dari bahasa asing — kata yang aslinya bukan bahasa Jepang. Bentuknya sengaja lebih bersudut dan tegas, beda dari hiragana yang bentuknya melengkung lembut. Contohnya テレビ, dibaca \"terebi\", dari kata bahasa Inggris \"television\". Atau コーヒー, dibaca \"koohii\" — kamu pasti sudah bisa menebak artinya.",
  },
  {
    orderIndex: 2,
    boardText: "Bunyinya sama persis dengan hiragana yang sudah kamu kuasai — hanya bentuknya yang beda.",
    visualAction: { kind: "compare", items: [{ label: "か / カ", example: "ka", note: "bunyi sama, bentuk beda" }] },
    pose: "memberi-semangat",
    narrationText:
      "Kabar baiknya: bunyi katakana sama persis dengan hiragana yang sudah kamu kuasai. か dan カ, dua-duanya dibaca \"ka\". Kamu tidak belajar bunyi baru di modul ini — hanya bentuk tulisan baru untuk bunyi yang sudah kamu kenal.",
  },
];

const ANGKA_INTRO: Segment[] = [
  {
    orderIndex: 0,
    boardText: "Modul ini: angka, waktu, harga, dan cara menghitung benda dalam bahasa Jepang.",
    visualAction: { kind: "text" },
    pose: "netral",
    narrationText:
      "Modul ini tentang angka, waktu, harga, dan cara menghitung benda dalam bahasa Jepang. Ini keterampilan yang langsung kepakai — di kasir konbini, di jadwal kereta, di mana saja.",
  },
  {
    orderIndex: 1,
    boardText: "Bahasa Indonesia sudah punya konsep ini: sehelai kertas, seekor kucing, sebatang rokok.",
    visualAction: {
      kind: "compare",
      items: [
        { label: "Indonesia", example: "seekor kucing", note: "kata penggolong \"ekor\" untuk hewan" },
        { label: "Jepang", example: "一匹 (ippiki)", note: "kata penggolong 匹 untuk hewan kecil" },
      ],
    },
    pose: "memberi-semangat",
    narrationText:
      "Ini bagian yang menguntungkan pembelajar berbahasa Indonesia. Bahasa Jepang punya \"kata penggolong\" — kata khusus yang berubah tergantung jenis benda yang dihitung. Ini terdengar asing untuk pembelajar berbahasa Inggris, tapi bahasa Indonesia sudah punya konsep yang sama persis: sehelai kertas, seekor kucing, sebatang rokok, seorang anak. Kamu tidak belajar konsep baru — kamu tinggal belajar kata penggolong versi Jepangnya.",
  },
  {
    orderIndex: 2,
    boardText: "Satu kejutan: cara Jepang mengelompokkan angka besar beda dari Indonesia — 万 (10.000) jadi satu kelompok baru.",
    visualAction: {
      kind: "compare",
      items: [
        { label: "Indonesia", example: "1.000.000", note: "dikelompokkan per 3 digit: ribu, juta" },
        { label: "Jepang", example: "百万", note: "dikelompokkan per 4 digit: 万 (10.000) sebagai satuan baru" },
      ],
    },
    pose: "berpikir",
    narrationText:
      "Satu hal yang perlu perhatian khusus. Bahasa Indonesia mengelompokkan angka besar per tiga digit — ribu, lalu juta. Bahasa Jepang mengelompokkan per empat digit, dengan 万 sebagai satuan baru untuk sepuluh ribu. Jadi satu juta rupiah, dalam logika Jepang, dihitung sebagai seratus kali sepuluh-ribu — 百万. Ini bukan soal hafalan, tapi soal membiasakan cara berpikir yang beda. Nanti kita latih pelan-pelan dengan contoh harga Rupiah asli.",
  },
];

// PROMPT-10 Bagian 6 — module_intro for PRE-N5.04, using the exact
// Indonesian-politeness bridge the work order itself specified.
const SAPAAN_INTRO: Segment[] = [
  {
    orderIndex: 0,
    boardText: "Modul ini bukan tentang menghafal kata — tapi tentang tahu MANA yang pantas dikatakan, kepada siapa.",
    visualAction: { kind: "text" },
    pose: "menjelaskan",
    narrationText:
      "Modul ini beda dari yang sebelumnya. Ini bukan tentang menghafal arti kata — おはよう dan おはようございます artinya sama persis, \"selamat pagi\". Yang beda adalah kepada siapa boleh dipakai. Ini yang paling sering gagal diajarkan kursus lain.",
  },
  {
    orderIndex: 1,
    boardText: "Kabar baik: bahasa Indonesia sudah punya sistem kesopanan yang sama seperti Jepang.",
    visualAction: {
      kind: "table",
      columns: ["Jepang", "Setara Indonesia", "Kepada siapa"],
      rows: [
        ["おはようございます", "\"Selamat pagi, Pak/Bu\"", "atasan, guru, orang tua, orang baru"],
        ["おはよう", "\"Pagi!\"", "teman dekat, adik, sebaya akrab"],
        ["すみません", "\"Permisi\" / \"Maaf\"", "serbaguna — dua fungsi sekaligus"],
      ],
    },
    pose: "memberi-semangat",
    narrationText:
      "Kabar baiknya: kamu sudah paham konsep ini secara naluri. \"Selamat pagi, Pak\" berbeda dari \"Pagi!\" — kamu sudah tahu ada Bapak, Ibu, Mas, Mbak untuk orang yang berbeda. Penutur bahasa Inggris tidak punya ini, jadi kursus berbahasa Inggris harus menjelaskan panjang lebar. Kamu tinggal diberi pemetaannya — lihat tabel ini.",
  },
  {
    orderIndex: 2,
    boardText: "Lima situasi: sapaan & waktu, rutinitas rumah, makan, terima kasih & maaf, perkenalan.",
    visualAction: { kind: "text" },
    pose: "netral",
    narrationText:
      "Kita akan lewati lima situasi sehari-hari: sapaan dan waktu, rutinitas keluar-masuk rumah, ungkapan sebelum dan sesudah makan, terima kasih dan maaf, dan perkenalan diri. Tiap situasi, kamu akan diminta memilih ungkapan yang PALING PANTAS — bukan cuma yang benar secara bahasa.",
  },
];

async function seedModule(db: Awaited<ReturnType<typeof createSeedClient>>["db"], code: string, segments: Segment[]) {
  const [moduleRow] = await db.select().from(learningModules).where(eq(learningModules.code, code));
  if (!moduleRow) {
    console.warn(`Modul ${code} tidak ditemukan — dilewati.`);
    return 0;
  }
  await db
    .delete(senseiSegments)
    .where(sql`${senseiSegments.moduleId} = ${moduleRow.id} and ${senseiSegments.segmentType} = 'module_intro'`);

  for (const segment of segments) {
    await db.insert(senseiSegments).values({
      moduleId: moduleRow.id,
      stageId: null,
      kanaId: null,
      segmentType: "module_intro",
      orderIndex: segment.orderIndex,
      boardText: segment.boardText,
      visualAction: segment.visualAction,
      senseiPose: segment.pose,
      narrationText: segment.narrationText,
      contentVersion: "v1",
    });
  }
  console.log(`${code}: ${segments.length} segmen module_intro dimasukkan.`);
  return segments.length;
}

async function main() {
  const { db, close } = createSeedClient();
  try {
    await seedModule(db, "PRE-N5.02", KATAKANA_INTRO);
    await seedModule(db, "PRE-N5.03", ANGKA_INTRO);
    await seedModule(db, "PRE-N5.04", SAPAAN_INTRO);
    console.log(
      "\nPERLU DITINJAU: naskah di atas belum melalui QA linguistik penutur asli (V2.1 Bagian 16 butir 10).",
    );
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-sensei-modul-2-3-intro gagal:", error);
  process.exit(1);
});
