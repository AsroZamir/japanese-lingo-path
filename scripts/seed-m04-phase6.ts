import { sql, inArray, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import {
  kanaModules,
  kanaPhases,
  kanaLessons,
  lessonContentBlocks,
  lessonExercises,
} from "../db/schema/kana";
import type {
  TextBlockContent,
  TableBlockContent,
  DialogueBlockContent,
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// Sumber konten: docs/pre n5 modul 4.txt Fase 6. L01 pakai "name-showcase"
// yang sama dengan M01 L01 (personalisasi nama pengguna, dikonversi ke
// Katakana) — sudah ada, tidak perlu dibangun ulang. L03 (Age) sengaja
// ringkas — modul sendiri menandainya "Review" dari Fase 2, bukan materi
// baru. L05 pakai DialogueBlockContent seperti roleplay Fase 3/4.

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "table"; content: TableBlockContent; narrationText?: string }
  | { blockType: "dialogue"; content: DialogueBlockContent; narrationText?: string }
  | { blockType: "callout"; content: CalloutBlockContent; narrationText?: string };

type ExerciseInput = {
  exerciseType: "concept_mcq" | "typing";
  prompt: string;
  options: LessonExerciseOption[] | null;
  correctOptionId: number | null;
  explanation: string | null;
  audioUrl: string | null;
};

const SPEAKING_NOTE: CalloutBlockContent = {
  kind: "tip",
  body: "Latihan bicara sungguhan (rekam & nilai pengucapan) belum tersedia di aplikasi ini. Dengarkan audio native, ucapkan mengikuti sesuai kemampuan Anda sendiri — bagian ini tidak dinilai otomatis.",
};

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M04"));
    if (!module_) throw new Error("M04 belum ada.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P6",
        titleId: "Basic Personal Information",
        orderIndex: 6,
        descriptionId: "Nama, negara/kewarganegaraan, umur (review), dan status dasar.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Name", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Country & Nationality", lessonType: "orientation", orderIndex: 2, romajiPolicy: "always" as const },
      { code: "L03", titleId: "Age (Review)", lessonType: "orientation_practice", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Basic Status", lessonType: "orientation", orderIndex: 4, romajiPolicy: "on_demand" as const },
      { code: "L05", titleId: "Personal Information Interview", lessonType: "orientation_practice", orderIndex: 5, romajiPolicy: "always" as const },
    ];

    const lessonRows = await db
      .insert(kanaLessons)
      .values(LESSONS.map((l) => ({
        phaseId: phase.id, code: l.code, titleId: l.titleId, lessonType: l.lessonType,
        orderIndex: l.orderIndex, groupCode: null, romajiPolicy: l.romajiPolicy, targetThresholds: null,
      })))
      .onConflictDoUpdate({
        target: [kanaLessons.phaseId, kanaLessons.code],
        set: { titleId: sql`excluded.title_id`, lessonType: sql`excluded.lesson_type`, orderIndex: sql`excluded.order_index`, romajiPolicy: sql`excluded.romaji_policy` },
      })
      .returning({ id: kanaLessons.id, code: kanaLessons.code });
    const lessonIdByCode = new Map(lessonRows.map((l) => [l.code, l.id]));
    const lessonIds = [...lessonIdByCode.values()];

    await db.delete(lessonContentBlocks).where(inArray(lessonContentBlocks.lessonId, lessonIds));
    await db.delete(lessonExercises).where(inArray(lessonExercises.lessonId, lessonIds));

    async function insertBlocks(lessonCode: string, blocks: BlockInput[]) {
      const lessonId = lessonIdByCode.get(lessonCode)!;
      await db.insert(lessonContentBlocks).values(
        blocks.map((b, i) => ({ lessonId, orderIndex: i + 1, blockType: b.blockType, content: b.content, narrationText: b.narrationText ?? null })),
      );
    }
    async function insertExercises(lessonCode: string, exercises: ExerciseInput[]) {
      const lessonId = lessonIdByCode.get(lessonCode)!;
      await db.insert(lessonExercises).values(exercises.map((e, i) => ({ lessonId, orderIndex: i + 1, ...e })));
    }

    // ════════ L01 — Name ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "名前 artinya nama, tapi begitu ditanyakan ke orang lain, お dihormat ditambahkan di depan jadi お名前 — kesopanan kecil yang sering muncul di kata benda dasar bahasa Jepang, dan akan Anda temui berkali-kali ke depannya.",
        content: {
          kind: "paragraphs",
          heading: "Menyebut nama",
          paragraphs: [
            "名前 (namae) = nama. Saat menanyakan nama ORANG LAIN, お ditambahkan di depan sebagai penghormatan: お名前 (o-namae).",
            "お名前は何ですか (o-namae wa nan desu ka) = \"siapa nama Anda?\". Jawabannya: [nama]です.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "text",
        narrationText: "Perhatikan baik-baik kalimat berikutnya — itu nama Anda sendiri, ditulis dalam bahasa Jepang.",
        content: {
          kind: "name-showcase",
          prefixKana: "私の名前は",
          suffixKana: "です。",
          prefixRomaji: "watashi no namae wa",
          suffixRomaji: "desu",
          fallbackNameKana: "アスロ",
          meaningTemplate: "Nama saya {name}.",
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "お名前は何ですか artinya...",
        options: [{ id: 1, label: "Umur berapa?" }, { id: 2, label: "Siapa nama Anda?" }, { id: 3, label: "Dari mana asal Anda?" }],
        correctOptionId: 2,
        explanation: "お名前は何ですか = \"siapa nama Anda?\" — bentuk sopan menanyakan nama.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "お di depan 名前 berfungsi sebagai...",
        options: [{ id: 1, label: "Penanda pertanyaan" }, { id: 2, label: "Penghormatan/kesopanan" }, { id: 3, label: "Bentuk jamak" }],
        correctOptionId: 2,
        explanation: "お adalah awalan penghormatan — dipakai saat menanyakan sesuatu milik orang lain.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Country & Nationality ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        narrationText:
          "Pola ini sederhana dan konsisten: negara + 人 (orang) menghasilkan kewarganegaraan. Begitu Anda tahu nama negaranya dalam bahasa Jepang, kewarganegaraannya tinggal tempel 人 di belakang — sama seperti pola-pola lain yang sudah Anda pelajari.",
        content: {
          kind: "paragraphs",
          heading: "Negara dan kewarganegaraan",
          paragraphs: [
            "国 (kuni) = negara. 日本 (nihon) = Jepang. Nama negara asing biasanya ditulis Katakana — インドネシア (Indonesia), sudah Anda kenal sejak M03.",
            "Pola kewarganegaraan: negara + 人 (jin, orang) = kewarganegaraan. 日本人 (nihonjin) = orang Jepang. インドネシア人 (Indonesia-jin) = orang Indonesia.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Contoh negara + 人",
          columns: ["Negara", "Kewarganegaraan"],
          rows: [
            ["日本 (Jepang)", "日本人 (nihonjin)"],
            ["インドネシア (Indonesia)", "インドネシア人 (Indonesia-jin)"],
            ["アメリカ (Amerika)", "アメリカ人 (Amerika-jin)"],
          ],
        } satisfies TableBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Ini penghitung 人 yang SAMA dengan yang Anda pelajari untuk menghitung orang (一人, 二人) di Fase 2 — dipakai kembali, bukan pola baru.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "日本人 artinya...",
        options: [{ id: 1, label: "Negara Jepang" }, { id: 2, label: "Orang Jepang" }, { id: 3, label: "Bahasa Jepang" }],
        correctOptionId: 2,
        explanation: "日本人 (nihonjin) = orang Jepang — 日本 (negara) + 人 (orang).",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Pola untuk menyatakan kewarganegaraan adalah...",
        options: [{ id: 1, label: "人 + negara" }, { id: 2, label: "negara + 人" }, { id: 3, label: "negara + です saja" }],
        correctOptionId: 2,
        explanation: "Pola: negara + 人 (jin). Nama negara di depan, 人 di belakang.",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Age (Review) ════════
    await insertBlocks("L03", [
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Lesson ini review dari Fase 2 — 何歳ですか dan ～歳です. Kalau masih ragu, boleh kembali ke Fase 2 dulu sebelum lanjut ke lesson berikutnya.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "何歳ですか artinya...",
        options: [{ id: 1, label: "Siapa nama Anda?" }, { id: 2, label: "Umur berapa?" }, { id: 3, label: "Dari mana asal Anda?" }],
        correctOptionId: 2,
        explanation: "何歳ですか = \"umur berapa?\" — review dari Fase 2.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "二十歳 (20 tahun) dibaca...",
        options: [{ id: 1, label: "nijussai" }, { id: 2, label: "hatachi" }, { id: 3, label: "nisai" }],
        correctOptionId: 2,
        explanation: "二十歳 dibaca \"hatachi\" — pengecualian yang sudah dipelajari di Fase 2.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Basic Status ════════
    await insertBlocks("L04", [
      {
        blockType: "text",
        narrationText:
          "Ini kosakata dasar untuk memperkenalkan pekerjaan atau status Anda — empat kata yang paling sering dipakai dalam perkenalan diri sederhana.",
        content: {
          kind: "paragraphs",
          heading: "Status dasar",
          paragraphs: [
            "学生 (gakusei) = pelajar/mahasiswa. 先生 (sensei) = guru/dosen (juga dipakai sebagai sapaan hormat). 会社員 (kaishain) = karyawan perusahaan. 会社 (kaisha) = perusahaan.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Contoh kalimat status",
          columns: ["Kalimat", "Arti"],
          rows: [
            ["学生です。", "Saya pelajar/mahasiswa."],
            ["先生です。", "Saya guru/dosen."],
            ["会社員です。", "Saya karyawan perusahaan."],
          ],
        } satisfies TableBlockContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "学生 artinya...",
        options: [{ id: 1, label: "Guru" }, { id: 2, label: "Pelajar/mahasiswa" }, { id: 3, label: "Karyawan" }],
        correctOptionId: 2,
        explanation: "学生 (gakusei) = pelajar/mahasiswa.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "会社員 artinya...",
        options: [{ id: 1, label: "Perusahaan" }, { id: 2, label: "Karyawan perusahaan" }, { id: 3, label: "Pemilik perusahaan" }],
        correctOptionId: 2,
        explanation: "会社員 (kaishain) = karyawan perusahaan — 会社 (perusahaan) + 員 (anggota).",
        audioUrl: null,
      },
    ]);

    // ════════ L05 — Personal Information Interview ════════
    await insertBlocks("L05", [
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "dialogue",
        content: {
          openingKana: "はじめまして。お名前は何ですか。",
          prompt: "Seseorang baru saja memperkenalkan diri dan bertanya nama Anda. Bagaimana Anda menjawab?",
          choices: [
            { id: "a", kana: "アスロです。", correct: true },
            { id: "b", kana: "二十歳です。", correct: false },
            { id: "c", kana: "学生です。", correct: false },
          ],
          followUpKana: "アスロさんですね。よろしくお願いします。",
          followUpNarrative: "Orang itu mengulangi nama Anda dengan sapaan hormat さん, lalu menutup perkenalan.",
          closingNote: "さん adalah sapaan hormat yang ditambahkan setelah nama orang lain — jangan pernah dipakai untuk nama Anda sendiri.",
        } satisfies DialogueBlockContent,
      },
    ]);

    await insertExercises("L05", [
      {
        exerciseType: "concept_mcq",
        prompt: "Urutan yang tepat untuk memperkenalkan diri lengkap adalah...",
        options: [
          { id: 1, label: "Nama → Negara/kewarganegaraan → Umur → Status" },
          { id: 2, label: "Umur → Nama → Status → Negara" },
          { id: 3, label: "Status → Umur → Nama → Negara" },
        ],
        correctOptionId: 1,
        explanation: "Urutan alami: nama dulu, lalu asal/kewarganegaraan, umur, baru status/pekerjaan.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "さん ditambahkan setelah nama untuk...",
        options: [{ id: 1, label: "Nama sendiri, sebagai kesopanan" }, { id: 2, label: "Nama orang lain, sebagai sapaan hormat" }, { id: 3, label: "Nama negara saja" }],
        correctOptionId: 2,
        explanation: "さん adalah sapaan hormat untuk NAMA ORANG LAIN — tidak pernah dipakai untuk nama sendiri.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat lengkap untuk \"Saya orang Indonesia, mahasiswa, umur 20 tahun\" yang benar urutannya...",
        options: [
          { id: 1, label: "インドネシア人です。学生です。二十歳です。" },
          { id: 2, label: "二十歳です。学生です。インドネシア人です。" },
          { id: 3, label: "学生です。二十歳です。インドネシア人です。" },
        ],
        correctOptionId: 1,
        explanation: "Kewarganegaraan → status → umur adalah urutan yang natural untuk kalimat pendek berurutan seperti ini.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M04 Fase 6 (P6) id=${phase.id}: 5 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m04-phase6 gagal:", error);
  process.exit(1);
});
