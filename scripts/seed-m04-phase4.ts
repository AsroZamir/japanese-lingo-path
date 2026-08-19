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
  DialogueBlockContent,
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";
import { japaneseTimeReading } from "../app/lib/japanese-time";

// Sumber konten: docs/pre n5 modul 4.txt Fase 4. Komponen baru
// components/numbers/{AnalogClock,ClockDemo}.tsx — lihat
// app/lib/japanese-time.ts untuk aturan baca jam (irregular: 四時=yoji,
// 九時=kuji, bukan yonji/kyuuji). Typing-exercise expected values
// diturunkan dari japaneseTimeReading + wanakana.toHiragana, bukan
// ditulis tangan, supaya tidak mengulang bug romaji-vs-hiragana Fase 1-3.

function hiraganaReading(hour: number, minute: number): string {
  return wanakana.toHiragana(japaneseTimeReading(hour, minute).romaji.replace(/-/g, ""));
}

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
        code: "P4",
        titleId: "Time & Clock",
        orderIndex: 4,
        descriptionId: "Membaca jam, menit, setengah jam, dan bertanya-jawab waktu.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Hours", lessonType: "orientation", orderIndex: 1, romajiPolicy: "always" as const },
      { code: "L02", titleId: "Minutes", lessonType: "orientation", orderIndex: 2, romajiPolicy: "on_demand" as const },
      { code: "L03", titleId: "Half Hour", lessonType: "orientation", orderIndex: 3, romajiPolicy: "on_demand" as const },
      { code: "L04", titleId: "Ask & Answer Time", lessonType: "orientation", orderIndex: 4, romajiPolicy: "always" as const },
      { code: "L05", titleId: "Time Mini Mastery", lessonType: "orientation_practice", orderIndex: 5, romajiPolicy: "hidden" as const },
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

    // ════════ L01 — Hours ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        narrationText:
          "何時ですか artinya 'jam berapa'. Sebagian besar jam cuma angka+時, tapi ada dua pengecualian yang wajib dihafal terpisah: jam 4 dan jam 9 tidak mengikuti pola bunyi angka biasa sama sekali.",
        content: {
          kind: "paragraphs",
          heading: "Menyebut jam",
          paragraphs: [
            "何時ですか (nan-ji desu ka) = \"jam berapa?\". Jawabannya: angka + 時 (ji), penanda jam.",
            "Sebagian besar teratur: 三時 (sanji) = jam 3, 六時 (rokuji) = jam 6. Tapi 四時 dibaca \"yoji\" (BUKAN yonji) dan 九時 dibaca \"kuji\" (BUKAN kyuuji) — dua pengecualian yang perlu dihafal terpisah.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "clock-demo",
          heading: "Coba sendiri",
          instruction: "Klik angka jam untuk mengubahnya — bacaannya berubah otomatis.",
          hour: 3,
          minute: 0,
          mode: "interactive",
        },
      },
      {
        blockType: "callout",
        content: {
          kind: "important",
          body: "四時 = \"yoji\", 九時 = \"kuji\" — dua pengecualian yang paling sering salah diucapkan pemula. Sisanya (1,2,3,5,6,8,10,11,12) mengikuti pola angka biasa; 七時 konvensinya dibaca \"shichiji\" untuk jam (bukan \"nanaji\").",
        } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "四時 (jam 4) dibaca...",
        options: [{ id: 1, label: "yonji" }, { id: 2, label: "yoji" }, { id: 3, label: "shiji" }],
        correctOptionId: 2,
        explanation: "四時 dibaca \"yoji\" — pengecualian, bukan \"yonji\".",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 九時 (jam 9), dalam romaji.",
        options: [{ id: 1, label: hiraganaReading(9, 0) }],
        correctOptionId: 1,
        explanation: "九時 dibaca \"kuji\" — pengecualian, bukan \"kyuuji\".",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 七時 (jam 7), dalam romaji.",
        options: [{ id: 1, label: hiraganaReading(7, 0) }],
        correctOptionId: 1,
        explanation: "七時 konvensinya dibaca \"shichiji\" untuk jam.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Minutes ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        narrationText:
          "Sama seperti jam, sebagian bunyi menit berubah bentuk saat digabung dengan angka tertentu — ini pola bunyi Jepang yang sama juga muncul di penghitung lain yang sudah Anda pelajari, cuma dengan hasil berbeda-beda tiap penghitung.",
        content: {
          kind: "paragraphs",
          heading: "Menyebut menit: ～分",
          paragraphs: [
            "何分 (nan-pun) = \"menit berapa?\". Penanda menitnya sendiri berubah bunyi tergantung angka di depannya — 一分 (ippun), 三分 (sanpun), 四分 (yonpun), 六分 (roppun), 八分 (happun), 十分 (juppun).",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Perubahan bunyi ～分",
          columns: ["Menit", "Tulisan", "Bacaan"],
          rows: [
            ["1分", "一分", "ippun"],
            ["3分", "三分", "sanpun"],
            ["4分", "四分", "yonpun"],
            ["6分", "六分", "roppun"],
            ["8分", "八分", "happun"],
            ["10分", "十分", "juppun"],
            ["15分", "十五分", "juugofun"],
          ],
        } satisfies TableBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "十分 (10 menit) dibaca...",
        options: [{ id: 1, label: "juufun" }, { id: 2, label: "juppun" }, { id: 3, label: "toobun" }],
        correctOptionId: 2,
        explanation: "十分 dibaca \"juppun\" — bunyi 分 berubah jadi \"ppun\" setelah 十.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 十五分 (15 menit), dalam romaji.",
        options: [{ id: 1, label: "じゅうごふん" }],
        correctOptionId: 1,
        explanation: "十五分 dibaca \"juugofun\".",
        audioUrl: null,
      },
    ]);

    // ════════ L03 — Half Hour ════════
    await insertBlocks("L03", [
      {
        blockType: "text",
        narrationText:
          "半 jauh lebih sering dipakai untuk setengah jam daripada mengucapkan '30分' secara literal — ini bentuk yang natural, bukan sekadar alternatif formal. Begitu Anda dengar 'han' di ujung sebuah jam, langsung tahu itu artinya lewat setengah jam.",
        content: {
          kind: "paragraphs",
          heading: "Setengah jam: 半",
          paragraphs: [
            "半 (han) berarti \"setengah\" — dipakai untuk menandai lewat 30 menit. 三時半 (sanji-han) = jam setengah 4 (3:30). Bentuk ini jauh lebih natural dan lebih sering dipakai daripada mengucapkan \"三十分\" secara literal.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "clock-demo",
          heading: "三時半",
          hour: 3,
          minute: 30,
          mode: "display",
          readingKanji: "三時半",
          readingRomaji: "sanji-han",
        },
      },
      {
        blockType: "text",
        content: {
          kind: "clock-demo",
          heading: "七時半",
          hour: 7,
          minute: 30,
          mode: "display",
          readingKanji: "七時半",
          readingRomaji: "shichiji-han",
        },
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "三時半 artinya jam...",
        options: [{ id: 1, label: "3:00" }, { id: 2, label: "3:30" }, { id: 3, label: "3:15" }],
        correctOptionId: 2,
        explanation: "半 (han) = setengah — 三時半 = 3:30.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 七時半 (7:30), dalam romaji.",
        options: [{ id: 1, label: hiraganaReading(7, 30) }],
        correctOptionId: 1,
        explanation: "七時半 dibaca \"shichiji-han\".",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Ask & Answer Time ════════
    await insertBlocks("L04", [
      {
        blockType: "text",
        narrationText:
          "Ini pola tanya-jawab jam yang paling praktis. 今何時ですか artinya benar-benar 'sekarang jam berapa' — kata 今 (sekarang) yang membedakannya dari pertanyaan jam secara umum.",
        content: {
          kind: "paragraphs",
          heading: "Bertanya jam",
          paragraphs: [
            "何時ですか (nan-ji desu ka) = \"jam berapa?\". 今何時ですか (ima nan-ji desu ka) = \"sekarang jam berapa?\" — 今 (ima, sekarang) menegaskan Anda bertanya waktu SAAT INI.",
            "Jawabannya: jam + ～時です, atau + ～時半です untuk setengah jam.",
          ],
        } satisfies TextBlockContent,
      },
      { blockType: "callout", content: SPEAKING_NOTE },
      {
        blockType: "dialogue",
        content: {
          openingKana: "すみません、今何時ですか。",
          prompt: "Seseorang bertanya jam berapa sekarang. Jam menunjukkan 5:00. Bagaimana Anda menjawab?",
          choices: [
            { id: "a", kana: "五時です。", correct: true },
            { id: "b", kana: "五歳です。", correct: false },
            { id: "c", kana: "五円です。", correct: false },
          ],
          followUpKana: "ありがとうございます。",
          followUpNarrative: "Orang itu berterima kasih atas jawaban Anda.",
          closingNote: "五時です (goji desu) = \"jam 5.\" — pola ～時です inilah jawaban standar untuk pertanyaan waktu.",
        } satisfies DialogueBlockContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "今何時ですか artinya...",
        options: [{ id: 1, label: "Jam berapa besok?" }, { id: 2, label: "Sekarang jam berapa?" }, { id: 3, label: "Jam berapa kemarin?" }],
        correctOptionId: 2,
        explanation: "今何時ですか = \"sekarang jam berapa?\" — 今 menegaskan waktu saat ini.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik jawaban untuk jam 6:00 (dalam romaji, cuma bacaannya + desu).",
        options: [{ id: 1, label: `${hiraganaReading(6, 0)}です` }],
        correctOptionId: 1,
        explanation: "六時です (rokuji desu) = \"jam 6.\"",
        audioUrl: null,
      },
    ]);

    // ════════ L05 — Time Mini Mastery ════════
    await insertExercises("L05", [
      {
        exerciseType: "concept_mcq",
        prompt: "九時 (jam 9) dibaca...",
        options: [{ id: 1, label: "kyuuji" }, { id: 2, label: "kuji" }, { id: 3, label: "kokonoji" }],
        correctOptionId: 2,
        explanation: "九時 dibaca \"kuji\" — pengecualian.",
        audioUrl: null,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik bacaan untuk 四時半 (4:30), dalam romaji.",
        options: [{ id: 1, label: hiraganaReading(4, 30) }],
        correctOptionId: 1,
        explanation: "四時半 dibaca \"yoji-han\" (四時 tetap \"yoji\", pengecualian yang sama berlaku di sini).",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "十分 (10 menit) dibaca...",
        options: [{ id: 1, label: "juppun" }, { id: 2, label: "juufun" }, { id: 3, label: "jippun" }],
        correctOptionId: 1,
        explanation: "十分 dibaca \"juppun\".",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Jawaban yang tepat untuk 今何時ですか kalau jam menunjukkan 2:30 adalah...",
        options: [{ id: 1, label: "二時半です" }, { id: 2, label: "二時ですか" }, { id: 3, label: "二分です" }],
        correctOptionId: 1,
        explanation: "二時半です (niji-han desu) = \"jam setengah 3 (2:30).\"",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M04 Fase 4 (P4) id=${phase.id}: 5 lesson.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m04-phase4 gagal:", error);
  process.exit(1);
});
