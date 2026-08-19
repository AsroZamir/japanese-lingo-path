import { sql, inArray, eq } from "drizzle-orm";
import * as wanakana from "wanakana";
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
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";
import { japaneseWeekday, japaneseMonth, japaneseDayOfMonth } from "../app/lib/japanese-date";

// Sumber konten: docs/pre n5 modul 4.txt Fase 5. Komponen baru
// components/numbers/CalendarGrid.tsx — lihat app/lib/japanese-date.ts
// untuk aturan baca hari/bulan/tanggal (tanggal 1-10 semuanya kata
// tersendiri, plus 14/20/24 tetap tidak beraturan). Typing-exercise
// expected value diturunkan dari fungsi tsb + wanakana.toHiragana.

function hira(romaji: string): string {
  return wanakana.toHiragana(romaji);
}

type BlockInput =
  | { blockType: "text"; content: TextBlockContent; narrationText?: string }
  | { blockType: "table"; content: TableBlockContent; narrationText?: string }
  | { blockType: "callout"; content: CalloutBlockContent; narrationText?: string };

type ExerciseInput = {
  exerciseType: "concept_mcq" | "typing";
  prompt: string;
  options: LessonExerciseOption[] | null;
  correctOptionId: number | null;
  explanation: string | null;
  audioUrl: string | null;
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
        code: "P5",
        titleId: "Days, Dates & Calendar",
        orderIndex: 5,
        descriptionId: "Hari dalam seminggu, hari ini/besok/kemarin, bulan, dan tanggal.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Days of the Week", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Today / Tomorrow / Yesterday", lessonType: "orientation", orderIndex: 2, romajiPolicy: "always" as const },
      { code: "L03", titleId: "Months", lessonType: "orientation", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Dates", lessonType: "orientation", orderIndex: 4, romajiPolicy: "on_demand" as const },
      { code: "L05", titleId: "Calendar Challenge", lessonType: "orientation_practice", orderIndex: 5, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Days of the Week ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "Ada pola tersembunyi di nama-nama hari ini: masing-masing berasal dari unsur alam — bulan, api, air, kayu, emas, tanah, matahari. Kalau Anda sudah kenal sedikit Kanji unsur ini, nama harinya jadi jauh lebih mudah diingat, bukan sekadar tujuh kata acak.",
        content: {
          kind: "paragraphs",
          heading: "Hari dalam seminggu",
          paragraphs: [
            "Nama hari Jepang semuanya diakhiri 曜日 (youbi), didahului unsur alam: 月 (bulan), 火 (api), 水 (air), 木 (kayu), 金 (emas), 土 (tanah), 日 (matahari).",
            "月曜日 (getsuyoubi) = Senin, sampai 日曜日 (nichiyoubi) = Minggu — bacaannya semua teratur, tidak ada pengecualian di sini.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Tujuh hari",
          columns: ["Hari", "Tulisan", "Bacaan"],
          rows: [
            ["Senin", "月曜日", "getsuyoubi"],
            ["Selasa", "火曜日", "kayoubi"],
            ["Rabu", "水曜日", "suiyoubi"],
            ["Kamis", "木曜日", "mokuyoubi"],
            ["Jumat", "金曜日", "kinyoubi"],
            ["Sabtu", "土曜日", "doyoubi"],
            ["Minggu", "日曜日", "nichiyoubi"],
          ],
        } satisfies TableBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "水曜日 artinya hari...",
        options: [{ id: 1, label: "Senin" }, { id: 2, label: "Rabu" }, { id: 3, label: "Jumat" }],
        correctOptionId: 2,
        explanation: "水曜日 (suiyoubi) = Rabu — 水 berarti air.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 金曜日 (Jumat), dalam romaji.",
        options: [{ id: 1, label: hira(japaneseWeekday(5).romaji) }],
        correctOptionId: 1,
        explanation: "金曜日 dibaca \"kinyoubi\".",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Today / Tomorrow / Yesterday ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        narrationText:
          "Tiga kata ini akan Anda pakai setiap hari begitu mulai bicara dalam kalimat nyata — cuma tiga kata pendek, tidak ada pengecualian bunyi yang perlu dikhawatirkan di sini.",
        content: {
          kind: "paragraphs",
          heading: "Hari ini, besok, kemarin",
          paragraphs: [
            "今日 (kyou) = hari ini, 明日 (ashita) = besok, 昨日 (kinou) = kemarin. Ketiganya kata mandiri — dipakai langsung di awal atau tengah kalimat, bukan disusun dari pola angka atau hari.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "tip",
          body: "Ketiga kata ini TIDAK dibentuk dari nama hari atau tanggal — beda pola sama sekali dari yang akan Anda pelajari di lesson berikutnya. Cukup hafal sebagai tiga kata mandiri.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "明日 artinya...",
        options: [{ id: 1, label: "Kemarin" }, { id: 2, label: "Hari ini" }, { id: 3, label: "Besok" }],
        correctOptionId: 3,
        explanation: "明日 (ashita) = besok.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 昨日 (kemarin), dalam romaji.",
        options: [{ id: 1, label: "きのう" }],
        correctOptionId: 1,
        explanation: "昨日 dibaca \"kinou\".",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Months ════════
    await insertBlocks("L03", [
      {
        blockType: "text",
        narrationText:
          "Perhatikan baik-baik: bulan 4 dibaca 'shigatsu', BUKAN 'yongatsu' atau 'yogatsu' seperti yang mungkin Anda duga dari jam. Ini bacaan KETIGA untuk angka 4 yang Anda temui di modul ini — satu untuk angka biasa, satu untuk jam, satu lagi untuk bulan. Terdengar membingungkan, tapi telinga Anda akan terbiasa lebih cepat dari yang Anda kira.",
        content: {
          kind: "paragraphs",
          heading: "Dua belas bulan",
          paragraphs: [
            "何月ですか (nan-gatsu desu ka) = \"bulan apa?\". Sebagian besar bulan teratur (angka+月), tapi tiga menyimpang: 四月 (shigatsu — BUKAN yongatsu/yogatsu), 七月 (shichigatsu), 九月 (kugatsu).",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "12 bulan",
          columns: ["Bulan", "Tulisan", "Bacaan"],
          rows: [
            ["Januari", "一月", "ichigatsu"],
            ["April", "四月", "shigatsu"],
            ["Juli", "七月", "shichigatsu"],
            ["September", "九月", "kugatsu"],
            ["Desember", "十二月", "juunigatsu"],
          ],
        } satisfies TableBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "important",
          body: "Angka 4 punya TIGA bacaan berbeda tergantung konteks: \"yon\" (angka biasa), \"yo\" (jam — 四時), \"shi\" (bulan — 四月). Bukan salah ketik — memang begitu polanya.",
        } satisfies CalloutBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "calendar-demo",
          heading: "Coba klik tanggalnya",
          instruction: "Kalender contoh — klik tanggal mana saja untuk melihat bacaan hari dan tanggalnya.",
          startWeekday: 3,
          monthLabel: "三月 (Maret, contoh)",
          mode: "interactive",
        },
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "四月 (bulan April) dibaca...",
        options: [{ id: 1, label: "yongatsu" }, { id: 2, label: "shigatsu" }, { id: 3, label: "yogatsu" }],
        correctOptionId: 2,
        explanation: "四月 dibaca \"shigatsu\" — bacaan ketiga untuk angka 4, khusus bulan.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 九月 (bulan September), dalam romaji.",
        options: [{ id: 1, label: hira(japaneseMonth(9).romaji) }],
        correctOptionId: 1,
        explanation: "九月 dibaca \"kugatsu\".",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Dates ════════
    await insertBlocks("L04", [
      {
        blockType: "text",
        narrationText:
          "Ini bagian paling tidak beraturan dari seluruh modul angka — sepuluh tanggal pertama masing-masing kata TERSENDIRI, tidak mengikuti pola apapun. Kabar baiknya: begitu Anda hafal sepuluh ini, sisanya (11 ke atas) sebagian besar kembali teratur, kecuali tiga pengecualian lagi.",
        content: {
          kind: "paragraphs",
          heading: "Tanggal — bagian paling tidak beraturan",
          paragraphs: [
            "何日ですか (nan-nichi desu ka) = \"tanggal berapa?\". Tanggal 1 sampai 10 masing-masing kata SENDIRI, tidak mengikuti pola angka+日 sama sekali.",
            "Dari tanggal 11, pola kembali teratur (十一日 = juuichinichi), KECUALI tiga: 十四日 (14, juuyokka), 二十日 (20, hatsuka — pengecualian total), 二十四日 (24, nijuuyokka).",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Tanggal 1-10 (semua tidak beraturan)",
          columns: ["Tanggal", "Tulisan", "Bacaan"],
          rows: [
            ["1", "一日", "tsuitachi"],
            ["2", "二日", "futsuka"],
            ["3", "三日", "mikka"],
            ["4", "四日", "yokka"],
            ["5", "五日", "itsuka"],
            ["6", "六日", "muika"],
            ["7", "七日", "nanoka"],
            ["8", "八日", "youka"],
            ["9", "九日", "kokonoka"],
            ["10", "十日", "tooka"],
          ],
        } satisfies TableBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "important",
          body: "二十日 (tanggal 20) dibaca \"hatsuka\" — pengecualian total, sama seperti 二十歳 (hatachi) yang sudah Anda pelajari di Fase 2. Pola \"20 = kata sendiri\" muncul lagi di sini.",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "一日 (tanggal 1) dibaca...",
        options: [{ id: 1, label: "ichinichi" }, { id: 2, label: "tsuitachi" }, { id: 3, label: "hitsuka" }],
        correctOptionId: 2,
        explanation: "一日 dibaca \"tsuitachi\" — tidak beraturan sama sekali.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 八日 (tanggal 8), dalam romaji.",
        options: [{ id: 1, label: hira(japaneseDayOfMonth(8).romaji) }],
        correctOptionId: 1,
        explanation: "八日 dibaca \"youka\".",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "二十日 (tanggal 20) dibaca...",
        options: [{ id: 1, label: "nijuunichi" }, { id: 2, label: "hatsuka" }, { id: 3, label: "hatachi" }],
        correctOptionId: 2,
        explanation: "二十日 dibaca \"hatsuka\" — pengecualian total (jangan tertukar dengan 二十歳 \"hatachi\", umur 20 tahun).",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 十四日 (tanggal 14), dalam romaji.",
        options: [{ id: 1, label: hira(japaneseDayOfMonth(14).romaji) }],
        correctOptionId: 1,
        explanation: "十四日 dibaca \"juuyokka\" — pengecualian, bukan \"juuyonnichi\".",
        audioUrl: null,
      },
    ]);

    // ════════ L05 — Calendar Challenge ════════
    await insertBlocks("L05", [
      {
        blockType: "text",
        content: {
          kind: "calendar-demo",
          heading: "Tantangan kalender",
          instruction: "Klik beberapa tanggal berbeda dan uji diri Anda membaca hasilnya sebelum menjawab soal di bawah.",
          startWeekday: 5,
          monthLabel: "七月 (Juli, contoh)",
          mode: "interactive",
        },
      },
    ]);

    await insertExercises("L05", [
      {
        exerciseType: "concept_mcq",
        prompt: "月曜日 artinya...",
        options: [{ id: 1, label: "Senin" }, { id: 2, label: "Kamis" }, { id: 3, label: "Minggu" }],
        correctOptionId: 1,
        explanation: "月曜日 (getsuyoubi) = Senin.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 今日 (hari ini), dalam romaji.",
        options: [{ id: 1, label: "きょう" }],
        correctOptionId: 1,
        explanation: "今日 dibaca \"kyou\".",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "七月 (bulan Juli) dibaca...",
        options: [{ id: 1, label: "nanagatsu" }, { id: 2, label: "shichigatsu" }, { id: 3, label: "shitsugatsu" }],
        correctOptionId: 2,
        explanation: "七月 dibaca \"shichigatsu\".",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 二十四日 (tanggal 24), dalam romaji.",
        options: [{ id: 1, label: hira(japaneseDayOfMonth(24).romaji) }],
        correctOptionId: 1,
        explanation: "二十四日 dibaca \"nijuuyokka\" — pengecualian, mengikuti pola 十四日.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Manakah kata yang berdiri sendiri — TIDAK dibentuk dari pola nama hari (～曜日) atau tanggal (～日)?",
        options: [{ id: 1, label: "今日" }, { id: 2, label: "月曜日" }, { id: 3, label: "十日" }],
        correctOptionId: 1,
        explanation: "今日 (hari ini) adalah kata mandiri — berbeda dari 月曜日 (mengikuti pola ～曜日) dan 十日 (mengikuti pola ～日).",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M04 Fase 5 (P5) id=${phase.id}: 5 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m04-phase5 gagal:", error);
  process.exit(1);
});
