import { eq, sql } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { learningModules } from "../db/schema/curriculum";
import { senseiSegments } from "../db/schema/sensei";
import type { SenseiVisualAction } from "../app/lib/sensei-types";
import type { SenseiPose } from "../db/schema/sensei";

// PROMPT-11 Bagian 5 — module_intro for PRE-N5.05 (Kosakata Dasar), using
// the "Indonesian advantage #4" explicitly named in the work order:
// Indonesian and Japanese both skip articles (a/the) and plural marking
// (-s), where English-language courses waste time on it.
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

const KOSAKATA_INTRO: Segment[] = [
  {
    orderIndex: 0,
    boardText: "Modul ini: 111 kosakata dasar dari 16 tema sehari-hari — masing-masing dengan satu frasa pasangan.",
    visualAction: { kind: "text" },
    pose: "netral",
    narrationText:
      "Modul ini isinya 111 kosakata dasar dari 16 tema sehari-hari: alam, hewan, keluarga, makanan, dan lainnya. Tapi ada satu aturan penting — tiap kata TIDAK berdiri sendiri. Kata いぬ, \"anjing\", nyaris tidak berguna kalau cuma dihafal begitu saja. Yang berguna adalah いぬと あそぶ, \"bermain dengan anjing\". Tiap kata di modul ini datang dengan satu frasa pasangan supaya langsung bisa dipakai, bukan cuma dihafal.",
  },
  {
    orderIndex: 1,
    boardText: "Kabar baik keempat: bahasa Indonesia dan Jepang sama-sama tidak punya \"a/the\" dan tidak punya \"-s\" jamak.",
    visualAction: {
      kind: "compare",
      items: [
        { label: "Inggris", example: "a dog / the dog / dogs", note: "harus pilih salah satu — tidak ada padanan di Jepang" },
        { label: "Indonesia & Jepang", example: "anjing / 犬", note: "satu bentuk, konteks yang menentukan" },
      ],
    },
    pose: "memberi-semangat",
    narrationText:
      "Ini kabar baik lagi buat kamu. Bahasa Inggris punya \"a dog\", \"the dog\", \"dogs\" — pembelajar berbahasa Inggris harus memilih salah satu tiap kali. Bahasa Jepang tidak punya konsep itu sama sekali. Dan bahasa Indonesia kamu juga tidak punya — kamu tinggal bilang \"anjing\", titik. Kursus berbahasa Inggris buang banyak waktu menjelaskan ini; kamu bisa lewati bagian itu sepenuhnya.",
  },
  {
    orderIndex: 2,
    boardText: "Satu hal lagi yang sudah kamu kuasai: bahasa Indonesia dan Jepang sama-sama tidak mengubah kata kerja menurut subjek.",
    visualAction: {
      kind: "compare",
      items: [
        { label: "Inggris", example: "I eat / he eats", note: "kata kerja berubah mengikuti subjek" },
        { label: "Indonesia & Jepang", example: "saya makan / dia makan", note: "kata kerja tidak berubah" },
      ],
    },
    pose: "berpikir",
    narrationText:
      "Satu lagi kemiripan yang menguntungkan: bahasa Inggris mengubah kata kerja tergantung siapa pelakunya — \"I eat\" jadi \"he eats\". Bahasa Indonesia dan bahasa Jepang tidak begitu. \"Saya makan\", \"dia makan\" — kata kerjanya tetap sama. Ini satu lagi beban yang tidak perlu kamu pikul.",
  },
  {
    orderIndex: 3,
    boardText: "Dua kekuatan berbeda: MENGENALI arti kata (dengar/lihat) tidak sama dengan BISA MEMPRODUKSINYA sendiri.",
    visualAction: { kind: "text" },
    pose: "menjelaskan",
    narrationText:
      "Terakhir, satu hal penting soal cara belajarnya. Mengenali arti sebuah kata saat kamu dengar atau lihat, itu satu kemampuan. Bisa memproduksi kata itu sendiri — dari ingatan, tanpa dibantu pilihan — itu kemampuan yang BEDA. Modul ini melatih dan menilai keduanya secara terpisah, supaya kamu tahu persis kata mana yang sudah benar-benar kamu kuasai, dan kata mana yang baru sebatas kamu kenali.",
  },
];

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [moduleRow] = await db.select().from(learningModules).where(eq(learningModules.code, "PRE-N5.05"));
    if (!moduleRow) throw new Error("PRE-N5.05 tidak ditemukan.");

    await db
      .delete(senseiSegments)
      .where(sql`${senseiSegments.moduleId} = ${moduleRow.id} and ${senseiSegments.segmentType} = 'module_intro'`);

    for (const segment of KOSAKATA_INTRO) {
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
    console.log(`PRE-N5.05: ${KOSAKATA_INTRO.length} segmen module_intro dimasukkan.`);
    console.log(
      "\nPERLU DITINJAU: naskah di atas belum melalui QA linguistik penutur asli (V2.1 Bagian 16 butir 10).",
    );
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-sensei-modul-5-intro gagal:", error);
  process.exit(1);
});
