import { sql, inArray } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import {
  kanaModules,
  kanaPhases,
  kanaLessons,
  kanaExampleWords,
  lessonContentBlocks,
  lessonExercises,
} from "../db/schema/kana";
import type {
  TextBlockContent,
  ChartBlockContent,
  TableBlockContent,
  AudioListBlockContent,
  DialogueBlockContent,
  CalloutBlockContent,
  LessonExerciseOption,
} from "../app/lib/lesson-content-types";

// Sumber konten: docs/konten-M01-orientasi.md. Baca ulang doc itu kalau
// ada yang tampak janggal di sini — script ini adalah terjemahan
// mekanis dari markdown ke baris DB, bukan sumber kebenaran.

function audioUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL tidak ditemukan di .env.local.");
  return `${base}/storage/v1/object/public/audio/${path}`;
}

// Path ini harus tetap sinkron dengan M01_ITEMS di
// scripts/generate-audio-voicevox.ts — dijalankan sebelum script ini.
const AUDIO = {
  konnichiwa: audioUrl("phrases/konnichiwa.wav"),
  arigatou: audioUrl("phrases/arigatou.wav"),
  arigatouGozaimasu: audioUrl("phrases/arigatougozaimasu.wav"),
  sushi: audioUrl("words/sushi.wav"),
  nihon: audioUrl("words/nihon.wav"),
  contohKalimatNama: audioUrl("sentences/contoh-kalimat-nama.wav"),
  kohii: audioUrl("words/koohii.wav"),
  indoneshia: audioUrl("words/indoneshia.wav"),
  sumaho: audioUrl("words/sumaho.wav"),
  aiuCombined: audioUrl("katakana/aiu-combined.wav"),
};

type BlockInput =
  | { blockType: "text"; content: TextBlockContent }
  | { blockType: "chart"; content: ChartBlockContent }
  | { blockType: "table"; content: TableBlockContent }
  | { blockType: "audio_list"; content: AudioListBlockContent }
  | { blockType: "dialogue"; content: DialogueBlockContent }
  | { blockType: "callout"; content: CalloutBlockContent };

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
    const wordAudio = await db
      .select({ wordKana: kanaExampleWords.wordKana, audioUrl: kanaExampleWords.audioUrl })
      .from(kanaExampleWords)
      .where(inArray(kanaExampleWords.wordKana, ["あお", "いえ", "うえ"]));
    const wordAudioByKana = new Map(wordAudio.map((w) => [w.wordKana, w.audioUrl]));

    const [module_] = await db
      .insert(kanaModules)
      .values({
        code: "M01",
        titleId: "Orientasi Bahasa Jepang",
        titleEn: "Japanese Orientation",
        descriptionId:
          "Kenali tiga sistem tulisan Jepang dan ucapkan hal pertama dalam bahasa Jepang — tanpa hafalan, tanpa nilai kelulusan.",
        orderIndex: 1,
      })
      .onConflictDoUpdate({
        target: kanaModules.code,
        set: {
          titleId: sql`excluded.title_id`,
          titleEn: sql`excluded.title_en`,
          descriptionId: sql`excluded.description_id`,
          orderIndex: sql`excluded.order_index`,
        },
      })
      .returning({ id: kanaModules.id });

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P1",
        titleId: "Orientasi",
        orderIndex: 1,
        descriptionId: "Empat pelajaran pengenalan sebelum masuk ke Hiragana.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: {
          titleId: sql`excluded.title_id`,
          orderIndex: sql`excluded.order_index`,
          descriptionId: sql`excluded.description_id`,
        },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Selamat Datang di Bahasa Jepang", lessonType: "orientation", orderIndex: 1 },
      { code: "L02", titleId: "Berkenalan dengan Hiragana", lessonType: "orientation", orderIndex: 2 },
      { code: "L03", titleId: "Berkenalan dengan Katakana & Kanji", lessonType: "orientation", orderIndex: 3 },
      { code: "L04", titleId: "Bahasa Jepang Pertama Anda", lessonType: "orientation_practice", orderIndex: 4 },
    ];

    const lessonRows = await db
      .insert(kanaLessons)
      .values(
        LESSONS.map((l) => ({
          phaseId: phase.id,
          code: l.code,
          titleId: l.titleId,
          lessonType: l.lessonType,
          orderIndex: l.orderIndex,
          groupCode: null,
          romajiPolicy: "always" as const,
          targetThresholds: null,
        })),
      )
      .onConflictDoUpdate({
        target: [kanaLessons.phaseId, kanaLessons.code],
        set: {
          titleId: sql`excluded.title_id`,
          lessonType: sql`excluded.lesson_type`,
          orderIndex: sql`excluded.order_index`,
          romajiPolicy: sql`excluded.romaji_policy`,
        },
      })
      .returning({ id: kanaLessons.id, code: kanaLessons.code });

    const lessonIdByCode = new Map(lessonRows.map((l) => [l.code, l.id]));
    const lessonIds = [...lessonIdByCode.values()];

    // Idempotent lewat replace-penuh: blok konten & soal M01 tidak
    // punya identitas alami untuk di-upsert baris-per-baris (tidak
    // seperti kana_example_words yang punya word_kana), jadi tiap run
    // menghapus lalu menulis ulang seluruh blok/soal 4 lesson ini.
    await db.delete(lessonContentBlocks).where(inArray(lessonContentBlocks.lessonId, lessonIds));
    await db.delete(lessonExercises).where(inArray(lessonExercises.lessonId, lessonIds));

    async function insertBlocks(lessonCode: string, blocks: BlockInput[]) {
      const lessonId = lessonIdByCode.get(lessonCode)!;
      await db.insert(lessonContentBlocks).values(
        blocks.map((b, i) => ({ lessonId, orderIndex: i + 1, blockType: b.blockType, content: b.content })),
      );
    }
    async function insertExercises(lessonCode: string, exercises: ExerciseInput[]) {
      const lessonId = lessonIdByCode.get(lessonCode)!;
      await db.insert(lessonExercises).values(
        exercises.map((e, i) => ({ lessonId, orderIndex: i + 1, ...e })),
      );
    }

    // ════════ L01 — Selamat Datang di Bahasa Jepang ════════
    await insertBlocks("L01", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Bahasa Jepang itu seperti apa?",
          paragraphs: [
            "Bahasa Jepang dipakai oleh sekitar 125 juta orang. Kalau Anda pernah menonton anime, bermain game Jepang, atau mendengar lagu J-pop, Anda sebenarnya sudah pernah mendengarnya berkali-kali.",
            "Ada satu kabar baik yang jarang disebut: bunyi bahasa Jepang jauh lebih mudah bagi orang Indonesia daripada bagi orang Eropa atau Amerika.",
            "Vokal Jepang ada lima — a, i, u, e, o — dan dibaca hampir sama persis dengan vokal bahasa Indonesia. Bandingkan dengan bahasa Inggris, di mana huruf \"a\" bisa berbunyi berbeda-beda di kata cat, car, dan cake.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "callout",
        content: { kind: "encouragement", body: "Jadi Anda memulai dengan keunggulan yang tidak disadari." } satisfies CalloutBlockContent,
      },
      {
        blockType: "text",
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
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          paragraphs: [
            "Perhatikan kalimat di atas. Bentuk hurufnya tidak seragam — ada yang rumit dan padat, ada yang bulat dan mengalir, ada yang kaku bersudut.",
            "Itu bukan kebetulan. Bahasa Jepang memakai tiga sistem tulisan sekaligus dalam satu kalimat.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          heading: "Tiga sistem tulisan",
          columns: ["Bagian", "Sistem", "Fungsi di kalimat ini"],
          rows: [
            ["私、名前", "Kanji", "Membawa arti inti: \"saya\", \"nama\""],
            ["の、は、です", "Hiragana", "Perekat tata bahasa dan penutup sopan"],
            ["アスロ", "Katakana", "Nama asing — termasuk nama Anda sendiri"],
          ],
        } satisfies TableBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          paragraphs: [
            "**Hiragana** — 46 huruf, bentuknya bulat dan mengalir. Ini fondasinya. Dipakai untuk kata asli Jepang dan seluruh tata bahasa. Ini yang akan Anda pelajari pertama.",
            "**Katakana** — 46 huruf juga, bunyinya sama persis dengan Hiragana, tapi bentuknya kaku dan bersudut. Dipakai khusus untuk kata serapan dari bahasa asing. Nama Anda pun akan ditulis dengan Katakana.",
            "**Kanji** — huruf yang berasal dari Tiongkok. Setiap huruf membawa arti, bukan cuma bunyi. Jumlahnya ribuan, tapi untuk JLPT N5 Anda hanya perlu sekitar 100.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "steps",
          heading: "Peta perjalanan Anda",
          steps: [
            { label: "SEKARANG", title: "Orientasi — Anda di sini" },
            { label: "BERIKUTNYA", title: "Hiragana — 46 huruf, fondasi segalanya" },
            { label: "LALU", title: "Katakana — 46 huruf untuk kata serapan" },
            { label: "KEMUDIAN", title: "Kanji dasar + kosakata + tata bahasa" },
            { label: "TUJUAN", title: "JLPT N5" },
          ],
          closingParagraphs: [
            "Yang perlu Anda tahu: **Hiragana adalah bagian tersulit yang akan Anda lewati di awal** — bukan karena rumit, tapi karena semuanya masih asing.",
            "Setelah Hiragana dikuasai, semua yang datang setelahnya terasa lebih ringan, karena Anda sudah punya alat untuk membaca.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L01", [
      {
        exerciseType: "concept_mcq",
        prompt: "Hiragana punya ciri bentuk yang...",
        options: [
          { id: 1, label: "kaku dan banyak bersudut" },
          { id: 2, label: "bulat dan mengalir" },
          { id: 3, label: "padat dan rumit" },
        ],
        correctOptionId: 2,
        explanation: "Hiragana dikenali dari lengkungannya yang lembut. Katakana justru kaku bersudut, dan Kanji cenderung padat.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kalimat 私の名前はアスロです memakai berapa sistem tulisan?",
        options: [
          { id: 1, label: "Satu" },
          { id: 2, label: "Dua" },
          { id: 3, label: "Tiga" },
        ],
        correctOptionId: 3,
        explanation: "Kanji (私, 名前), Hiragana (の, は, です), dan Katakana (アスロ) muncul bersamaan dalam satu kalimat. Ini normal dalam bahasa Jepang.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Sistem tulisan mana yang akan Anda pelajari pertama?",
        options: [
          { id: 1, label: "Hiragana" },
          { id: 2, label: "Katakana" },
          { id: 3, label: "Kanji" },
        ],
        correctOptionId: 1,
        explanation: "Hiragana adalah fondasinya. Tanpa Hiragana, tata bahasa Jepang tidak bisa dibaca sama sekali.",
        audioUrl: null,
      },
    ]);

    // ════════ L02 — Berkenalan dengan Hiragana ════════
    await insertBlocks("L02", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Apa itu Hiragana?",
          paragraphs: [
            "Hiragana adalah 46 huruf yang menjadi dasar seluruh bahasa Jepang.",
            "Bedanya dengan alfabet Latin: dalam bahasa Indonesia, huruf \"k\" tidak punya bunyi sendiri sampai digabung dengan vokal. Dalam Hiragana, **setiap huruf sudah merupakan satu suku kata utuh.**",
            "か dibaca \"ka\". Bukan \"k\" lalu \"a\" — langsung \"ka\", satu tarikan.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "callout",
        content: {
          kind: "encouragement",
          body: "Ini justru memudahkan: begitu Anda tahu bunyinya, Anda bisa membacanya. Tidak ada aturan pengecualian seperti bahasa Inggris.",
        } satisfies CalloutBlockContent,
      },
      {
        blockType: "chart",
        content: {
          script: "hiragana",
          mode: "dimmed-preview",
          heading: "Lihat seluruh chart",
          paragraphs: [
            "Inilah yang akan Anda kuasai. Terlihat banyak sekarang — itu wajar.",
            "Kita tidak akan menghafalnya sekaligus. Kita membaginya menjadi **10 kelompok, masing-masing 5 huruf.** Satu kelompok bisa diselesaikan dalam satu kali duduk.",
            "Silakan klik huruf mana saja untuk mendengar bunyinya. Tidak perlu dihafal sekarang — cuma untuk membiasakan telinga.",
          ],
        } satisfies ChartBlockContent,
      },
      {
        blockType: "audio_list",
        content: {
          heading: "Dengarkan beberapa contoh",
          items: [
            { kana: "あお", romaji: "ao", meaning: "biru", audioUrl: wordAudioByKana.get("あお") ?? null },
            { kana: "いえ", romaji: "ie", meaning: "rumah", audioUrl: wordAudioByKana.get("いえ") ?? null },
            { kana: "うえ", romaji: "ue", meaning: "atas", audioUrl: wordAudioByKana.get("うえ") ?? null },
          ],
          closingParagraphs: [
            "Dengarkan ketiganya. Perhatikan bahwa tiap huruf dibaca dengan panjang yang sama rata — tidak ada suku kata yang ditekan lebih keras seperti dalam bahasa Inggris.",
            "Ritme bahasa Jepang itu datar dan teratur. Ini terasa aneh di awal, lalu justru jadi memudahkan.",
          ],
        } satisfies AudioListBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "steps",
          heading: "Yang akan terjadi selanjutnya",
          leadParagraphs: ["Mulai modul berikutnya, kita akan mengambil 5 huruf pertama: **あ い う え お**"],
          steps: [
            { title: "Kenali — lihat bentuknya, dengar bunyinya" },
            { title: "Uji — bedakan dari huruf lain yang mirip" },
            { title: "Tulis — dari menjiplak sampai menulis mandiri" },
            { title: "Baca — pakai dalam kata sungguhan" },
          ],
          closingParagraphs: [
            "Anda baru boleh lanjut ke kelompok berikutnya setelah lulus tahap keempat. Ini disengaja — kelompok berikutnya akan terasa jauh lebih berat kalau yang sebelumnya masih goyah.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L02", [
      {
        exerciseType: "concept_mcq",
        prompt: "Berapa jumlah Hiragana dasar?",
        options: [
          { id: 1, label: "26" },
          { id: 2, label: "46" },
          { id: 3, label: "100" },
        ],
        correctOptionId: 2,
        explanation: "46 huruf dasar, dibagi menjadi 10 kelompok kecil.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Huruf か dibaca sebagai...",
        options: [
          { id: 1, label: "\"k\"" },
          { id: 2, label: "\"ka\"" },
          { id: 3, label: "\"a\"" },
        ],
        correctOptionId: 2,
        explanation: "Setiap Hiragana adalah satu suku kata utuh, bukan satu bunyi konsonan terpisah.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Berapa huruf yang Anda dengar?",
        options: [
          { id: 1, label: "satu" },
          { id: 2, label: "dua" },
          { id: 3, label: "tiga" },
        ],
        correctOptionId: 2,
        explanation: "あ dan お — dua huruf, masing-masing dibaca dengan panjang yang sama rata. Inilah ritme datar bahasa Jepang.",
        audioUrl: wordAudioByKana.get("あお") ?? null,
      },
    ]);

    // ════════ L03 — Berkenalan dengan Katakana & Kanji ════════
    await insertBlocks("L03", [
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Katakana itu apa?",
          paragraphs: [
            "Katakana punya 46 huruf dengan bunyi yang sama persis seperti Hiragana. Bedanya hanya bentuk — dan kapan dipakainya.",
            "Bandingkan pasangan berikut. Bunyinya identik:",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          columns: ["Hiragana", "Katakana", "Bunyi"],
          rows: [
            ["あ", "ア", "a"],
            ["い", "イ", "i"],
            ["う", "ウ", "u"],
          ],
          audioUrl: AUDIO.aiuCombined,
        } satisfies TableBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          paragraphs: [
            "Hiragana bulat dan mengalir. Katakana kaku, tajam, banyak sudut.",
            "Katakana dipakai untuk **kata yang datang dari luar Jepang**:",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          columns: ["Katakana", "Romaji", "Asalnya"],
          rows: [
            ["コーヒー", "kōhī", "coffee"],
            ["インドネシア", "indoneshia", "Indonesia"],
            ["スマホ", "sumaho", "smartphone"],
          ],
          rowAudioUrls: [AUDIO.kohii, AUDIO.indoneshia, AUDIO.sumaho],
        } satisfies TableBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          paragraphs: ["Nama Anda juga akan ditulis dengan Katakana. \"Asro\" menjadi **アスロ**."],
        } satisfies TextBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Kanji itu apa?",
          paragraphs: ["Kanji berbeda secara mendasar. Hiragana dan Katakana melambangkan **bunyi**. Kanji melambangkan **arti**."],
        } satisfies TextBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "comparison",
          columns: ["Kanji", "Arti", "Cara baca"],
          rows: [
            ["日", "matahari / hari", "hi, nichi, ka"],
            ["本", "buku / asal", "hon, moto"],
            ["日本", "Jepang", "Nihon"],
          ],
          rowAudioUrls: [null, null, AUDIO.nihon],
        } satisfies TableBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          paragraphs: [
            "Perhatikan yang terjadi di baris ketiga: \"matahari\" digabung dengan \"asal\" menghasilkan **\"asal matahari\"** — itulah arti nama Jepang, negeri matahari terbit.",
            "Inilah kekuatan Kanji. Sekali Anda mengenali sebagian, arti kata baru sering bisa ditebak tanpa pernah mempelajarinya.",
            "Sisi beratnya: satu Kanji bisa punya beberapa cara baca, tergantung pasangannya. Tapi itu urusan nanti.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Kapan mempelajarinya?",
          paragraphs: [
            "**Katakana** — segera setelah Hiragana selesai. Karena bunyinya sama, mempelajarinya akan terasa jauh lebih cepat.",
            "**Kanji** — dicicil sedikit demi sedikit, digabung dengan kosakata. Untuk JLPT N5 cukup sekitar 100 Kanji, dan Anda tidak akan mempelajarinya sebagai daftar hafalan terpisah.",
          ],
        } satisfies TextBlockContent,
      },
      {
        blockType: "callout",
        content: { kind: "important", body: "Jangan cemaskan Kanji sekarang. Fokus Anda satu: **Hiragana.**" } satisfies CalloutBlockContent,
      },
    ]);

    await insertExercises("L03", [
      {
        exerciseType: "concept_mcq",
        prompt: "Katakana punya ciri bentuk yang...",
        options: [
          { id: 1, label: "bulat dan mengalir" },
          { id: 2, label: "kaku dan bersudut" },
          { id: 3, label: "padat dan rumit" },
        ],
        correctOptionId: 2,
        explanation: "Katakana dikenali dari garis lurus dan sudut tajamnya — kebalikan dari Hiragana yang melengkung.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Kata \"Indonesia\" dalam bahasa Jepang ditulis dengan...",
        options: [
          { id: 1, label: "Hiragana" },
          { id: 2, label: "Katakana" },
          { id: 3, label: "Kanji" },
        ],
        correctOptionId: 2,
        explanation: "Nama negara asing dan kata serapan selalu memakai Katakana.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Apa yang membedakan Kanji dari Hiragana?",
        options: [
          { id: 1, label: "Kanji jumlahnya lebih sedikit" },
          { id: 2, label: "Kanji melambangkan arti, bukan sekadar bunyi" },
          { id: 3, label: "Kanji hanya dipakai untuk kata serapan" },
        ],
        correctOptionId: 2,
        explanation: "Hiragana dan Katakana melambangkan bunyi. Kanji membawa arti, itulah sebabnya 日 dan 本 bisa digabung menjadi kata baru.",
        audioUrl: null,
      },
    ]);

    // ════════ L04 — Bahasa Jepang Pertama Anda ════════
    await insertBlocks("L04", [
      {
        blockType: "table",
        content: {
          kind: "vocab-card",
          kana: "こんにちは",
          romaji: "konnichiwa",
          meaning: "Halo / Selamat siang",
          audioUrl: AUDIO.konnichiwa,
          note: "Ini sapaan paling dikenal di dunia. Dipakai dari sekitar pukul 10 pagi sampai matahari terbenam.",
          extra:
            "Satu hal menarik: huruf terakhirnya は yang seharusnya dibaca \"ha\", tapi di sini dibaca **\"wa\"**. Ini sisa dari bentuk kalimat yang lebih panjang di masa lalu. Anda akan bertemu aturan ini lagi nanti sebagai partikel tata bahasa.",
          activity: "Dengar → tirukan → ketik ulang (dilatih di soal terakhir lesson ini).",
        } satisfies TableBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "vocab-card",
          kana: "ありがとう",
          romaji: "arigatou",
          meaning: "Terima kasih",
          audioUrl: AUDIO.arigatou,
          note: "Untuk versi yang lebih sopan, tambahkan ございます di belakangnya: **ありがとうございます** (arigatou gozaimasu).",
          extra: "Pakai versi panjang kepada orang yang lebih tua, atasan, atau orang yang baru dikenal. Versi pendek untuk teman.",
          secondaryLabel: "ありがとうございます",
          secondaryAudioUrl: AUDIO.arigatouGozaimasu,
        } satisfies TableBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "vocab-card",
          kana: "すし",
          romaji: "sushi",
          meaning: "Sushi",
          audioUrl: AUDIO.sushi,
          note: "Anda sudah tahu kata ini. Yang baru hanyalah bentuk tulisannya.",
          extra: "Perhatikan: ditulis dengan **Hiragana**, bukan Katakana — karena sushi adalah makanan asli Jepang, bukan kata serapan.",
        } satisfies TableBlockContent,
      },
      {
        blockType: "table",
        content: {
          kind: "vocab-card",
          kana: "日本",
          romaji: "Nihon",
          meaning: "Jepang",
          audioUrl: AUDIO.nihon,
          note: "Kanji pertama Anda. Dua huruf, satu arti: negeri matahari terbit.",
          extra: "Anda mungkin pernah melihatnya di kemasan produk, poster film, atau logo. Mulai sekarang Anda akan mengenalinya.",
        } satisfies TableBlockContent,
      },
      {
        blockType: "dialogue",
        content: {
          openingKana: "こんにちは！",
          prompt: "Apa yang Anda jawab?",
          choices: [
            { id: "a", kana: "ありがとう" },
            { id: "b", kana: "こんにちは", correct: true },
            { id: "c", kana: "すし" },
          ],
          followUpKana: "ありがとう！",
          followUpNarrative: "Anda memberi sesuatu kepadanya. Dia berkata:",
          closingNote: "Anda baru saja melakukan percakapan pertama dalam bahasa Jepang.",
        } satisfies DialogueBlockContent,
      },
      {
        blockType: "text",
        content: {
          kind: "paragraphs",
          heading: "Anda baru saja menyelesaikan modul pertama.",
          paragraphs: [
            "Anda sekarang tahu tiga sistem tulisan Jepang, tahu apa itu Hiragana, dan sudah bisa mengucapkan empat hal dalam bahasa Jepang.",
            "Berikutnya kita mulai serius: **あ い う え お** — lima huruf pertama.",
          ],
        } satisfies TextBlockContent,
      },
    ]);

    await insertExercises("L04", [
      {
        exerciseType: "concept_mcq",
        prompt: "こんにちは artinya...",
        options: [
          { id: 1, label: "Terima kasih" },
          { id: 2, label: "Halo" },
          { id: 3, label: "Selamat tinggal" },
        ],
        correctOptionId: 2,
        explanation: "Sapaan untuk siang hari, dari sekitar pukul 10 sampai petang.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "Ini artinya...",
        options: [
          { id: 1, label: "Terima kasih" },
          { id: 2, label: "Maaf" },
          { id: 3, label: "Halo" },
        ],
        correctOptionId: 1,
        explanation: "ありがとう adalah cara paling umum mengucapkan terima kasih dalam bahasa Jepang sehari-hari.",
        audioUrl: AUDIO.arigatou,
      },
      {
        exerciseType: "typing",
        prompt: "Ketik \"sushi\" dalam Hiragana",
        options: [{ id: 1, label: "すし" }],
        correctOptionId: 1,
        explanation: "Ketik \"sushi\" dan huruf akan berubah otomatis menjadi すし.",
        audioUrl: null,
      },
      {
        exerciseType: "concept_mcq",
        prompt: "日本 ditulis dengan sistem tulisan apa?",
        options: [
          { id: 1, label: "Hiragana" },
          { id: 2, label: "Katakana" },
          { id: 3, label: "Kanji" },
        ],
        correctOptionId: 3,
        explanation: "Dua huruf Kanji, 日 dan 本. Bentuknya padat dan bersudut rapat — berbeda dari すし yang ditulis dengan Hiragana.",
        audioUrl: null,
      },
    ]);

    console.log(`Selesai. M01 id=${module_.id}, Phase P1 id=${phase.id}.`);
    console.log(`Lessons: ${lessonRows.map((l) => l.code).join(", ")}.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m01-content gagal:", error);
  process.exit(1);
});
