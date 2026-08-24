import { eq, sql } from "drizzle-orm";
import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSeedClient } from "../db/seed-client";
import { vocabItems } from "../db/schema/vocab";
import { learningModules } from "../db/schema/curriculum";

// PROMPT-8 Bagian 4 — content for PRE-N5.03 (Angka, Waktu, Harga & Counter).
// Scope is deliberately bounded, not exhaustive to 9999 — a real, teachable
// core covering every explicitly-required irregular reading, verified
// against standard textbook facts. NOT linguistically QA'd by a native
// speaker (V2.1 Bagian 16 butir 10 requires that for any new Japanese
// content) — flag this in the final report every time this script is run.

const VOICEVOX_BASE_URL = process.env.VOICEVOX_BASE_URL ?? "http://localhost:50021";
const BUCKET = "audio";
const DEFAULT_SPEAKER_ID = 2; // matches production until PROMPT-8 Bagian 3 picks a replacement
function resolveSpeakerId(): number {
  return process.env.VOICEVOX_SPEAKER_ID ? Number(process.env.VOICEVOX_SPEAKER_ID) : DEFAULT_SPEAKER_ID;
}

type ItemSeed = {
  key: string; // local reference key, only used to wire irregularOfKey -> id
  category: string;
  termKana: string;
  reading: string;
  meaningId: string;
  numericValue: number | null;
  isIrregular: boolean;
  irregularOfKey: string | null;
  orderIndex: number;
};

let order = 0;
function next(): number {
  order += 1;
  return order;
}

const ITEMS: ItemSeed[] = [
  // ── number: 0-10, regular readings first, irregular alternates flagged ──
  { key: "num-0", category: "number", termKana: "ゼロ", reading: "zero", meaningId: "nol (0)", numericValue: 0, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "num-0b", category: "number", termKana: "れい", reading: "rei", meaningId: "nol (0), bacaan lain", numericValue: 0, isIrregular: true, irregularOfKey: "num-0", orderIndex: next() },
  { key: "num-1", category: "number", termKana: "いち", reading: "ichi", meaningId: "satu (1)", numericValue: 1, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "num-2", category: "number", termKana: "に", reading: "ni", meaningId: "dua (2)", numericValue: 2, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "num-3", category: "number", termKana: "さん", reading: "san", meaningId: "tiga (3)", numericValue: 3, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "num-4", category: "number", termKana: "よん", reading: "yon", meaningId: "empat (4)", numericValue: 4, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "num-4b", category: "number", termKana: "し", reading: "shi", meaningId: "empat (4), bacaan lain — dipakai di beberapa konteks tetap seperti tanggal", numericValue: 4, isIrregular: true, irregularOfKey: "num-4", orderIndex: next() },
  { key: "num-5", category: "number", termKana: "ご", reading: "go", meaningId: "lima (5)", numericValue: 5, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "num-6", category: "number", termKana: "ろく", reading: "roku", meaningId: "enam (6)", numericValue: 6, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "num-7", category: "number", termKana: "なな", reading: "nana", meaningId: "tujuh (7)", numericValue: 7, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "num-7b", category: "number", termKana: "しち", reading: "shichi", meaningId: "tujuh (7), bacaan lain — dipakai untuk jam 7", numericValue: 7, isIrregular: true, irregularOfKey: "num-7", orderIndex: next() },
  { key: "num-8", category: "number", termKana: "はち", reading: "hachi", meaningId: "delapan (8)", numericValue: 8, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "num-9", category: "number", termKana: "きゅう", reading: "kyuu", meaningId: "sembilan (9)", numericValue: 9, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "num-9b", category: "number", termKana: "く", reading: "ku", meaningId: "sembilan (9), bacaan lain — dipakai untuk jam 9", numericValue: 9, isIrregular: true, irregularOfKey: "num-9", orderIndex: next() },
  { key: "num-10", category: "number", termKana: "じゅう", reading: "juu", meaningId: "sepuluh (10)", numericValue: 10, isIrregular: false, irregularOfKey: null, orderIndex: next() },

  // ── tens_hundreds ──
  { key: "th-20", category: "tens_hundreds", termKana: "にじゅう", reading: "nijuu", meaningId: "dua puluh (20)", numericValue: 20, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-30", category: "tens_hundreds", termKana: "さんじゅう", reading: "sanjuu", meaningId: "tiga puluh (30)", numericValue: 30, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-40", category: "tens_hundreds", termKana: "よんじゅう", reading: "yonjuu", meaningId: "empat puluh (40)", numericValue: 40, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-50", category: "tens_hundreds", termKana: "ごじゅう", reading: "gojuu", meaningId: "lima puluh (50)", numericValue: 50, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-60", category: "tens_hundreds", termKana: "ろくじゅう", reading: "rokujuu", meaningId: "enam puluh (60)", numericValue: 60, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-70", category: "tens_hundreds", termKana: "ななじゅう", reading: "nanajuu", meaningId: "tujuh puluh (70)", numericValue: 70, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-80", category: "tens_hundreds", termKana: "はちじゅう", reading: "hachijuu", meaningId: "delapan puluh (80)", numericValue: 80, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-90", category: "tens_hundreds", termKana: "きゅうじゅう", reading: "kyuujuu", meaningId: "sembilan puluh (90)", numericValue: 90, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-100", category: "tens_hundreds", termKana: "ひゃく", reading: "hyaku", meaningId: "seratus (100)", numericValue: 100, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-200", category: "tens_hundreds", termKana: "にひゃく", reading: "nihyaku", meaningId: "dua ratus (200)", numericValue: 200, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-300", category: "tens_hundreds", termKana: "さんびゃく", reading: "sanbyaku", meaningId: "tiga ratus (300) — bunyi 'hyaku' berubah jadi 'byaku'", numericValue: 300, isIrregular: true, irregularOfKey: "th-100", orderIndex: next() },
  { key: "th-400", category: "tens_hundreds", termKana: "よんひゃく", reading: "yonhyaku", meaningId: "empat ratus (400)", numericValue: 400, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-500", category: "tens_hundreds", termKana: "ごひゃく", reading: "gohyaku", meaningId: "lima ratus (500)", numericValue: 500, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-600", category: "tens_hundreds", termKana: "ろっぴゃく", reading: "roppyaku", meaningId: "enam ratus (600) — bunyi 'hyaku' berubah jadi 'pyaku'", numericValue: 600, isIrregular: true, irregularOfKey: "th-100", orderIndex: next() },
  { key: "th-700", category: "tens_hundreds", termKana: "ななひゃく", reading: "nanahyaku", meaningId: "tujuh ratus (700)", numericValue: 700, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "th-800", category: "tens_hundreds", termKana: "はっぴゃく", reading: "happyaku", meaningId: "delapan ratus (800) — bunyi 'hyaku' berubah jadi 'pyaku'", numericValue: 800, isIrregular: true, irregularOfKey: "th-100", orderIndex: next() },
  { key: "th-900", category: "tens_hundreds", termKana: "きゅうひゃく", reading: "kyuuhyaku", meaningId: "sembilan ratus (900)", numericValue: 900, isIrregular: false, irregularOfKey: null, orderIndex: next() },

  // ── hour (1-12時) ──
  { key: "hr-1", category: "hour", termKana: "いちじ", reading: "ichiji", meaningId: "jam 1", numericValue: 1, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "hr-2", category: "hour", termKana: "にじ", reading: "niji", meaningId: "jam 2", numericValue: 2, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "hr-3", category: "hour", termKana: "さんじ", reading: "sanji", meaningId: "jam 3", numericValue: 3, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "hr-4", category: "hour", termKana: "よじ", reading: "yoji", meaningId: "jam 4 — BUKAN 'yonji'", numericValue: 4, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "hr-5", category: "hour", termKana: "ごじ", reading: "goji", meaningId: "jam 5", numericValue: 5, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "hr-6", category: "hour", termKana: "ろくじ", reading: "rokuji", meaningId: "jam 6", numericValue: 6, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "hr-7", category: "hour", termKana: "しちじ", reading: "shichiji", meaningId: "jam 7 — BUKAN 'nanaji'", numericValue: 7, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "hr-8", category: "hour", termKana: "はちじ", reading: "hachiji", meaningId: "jam 8", numericValue: 8, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "hr-9", category: "hour", termKana: "くじ", reading: "kuji", meaningId: "jam 9 — BUKAN 'kyuuji'", numericValue: 9, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "hr-10", category: "hour", termKana: "じゅうじ", reading: "juuji", meaningId: "jam 10", numericValue: 10, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "hr-11", category: "hour", termKana: "じゅういちじ", reading: "juuichiji", meaningId: "jam 11", numericValue: 11, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "hr-12", category: "hour", termKana: "じゅうにじ", reading: "juuniji", meaningId: "jam 12", numericValue: 12, isIrregular: false, irregularOfKey: null, orderIndex: next() },

  // ── minute (1-10分 + setengah) ──
  { key: "mn-1", category: "minute", termKana: "いっぷん", reading: "ippun", meaningId: "1 menit", numericValue: 1, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "mn-2", category: "minute", termKana: "にふん", reading: "nifun", meaningId: "2 menit", numericValue: 2, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "mn-3", category: "minute", termKana: "さんぷん", reading: "sanpun", meaningId: "3 menit", numericValue: 3, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "mn-4", category: "minute", termKana: "よんふん", reading: "yonfun", meaningId: "4 menit", numericValue: 4, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "mn-5", category: "minute", termKana: "ごふん", reading: "gofun", meaningId: "5 menit", numericValue: 5, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "mn-6", category: "minute", termKana: "ろっぷん", reading: "roppun", meaningId: "6 menit", numericValue: 6, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "mn-7", category: "minute", termKana: "ななふん", reading: "nanafun", meaningId: "7 menit", numericValue: 7, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "mn-8", category: "minute", termKana: "はっぷん", reading: "happun", meaningId: "8 menit", numericValue: 8, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "mn-9", category: "minute", termKana: "きゅうふん", reading: "kyuufun", meaningId: "9 menit", numericValue: 9, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "mn-10", category: "minute", termKana: "じゅっぷん", reading: "juppun", meaningId: "10 menit", numericValue: 10, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "mn-half", category: "minute", termKana: "はん", reading: "han", meaningId: "setengah (30 menit)", numericValue: 30, isIrregular: false, irregularOfKey: null, orderIndex: next() },

  // ── date (tanggal, 1-10/14/20/24 sepenuhnya tidak beraturan; beberapa contoh reguler untuk kontras) ──
  { key: "dt-1", category: "date", termKana: "ついたち", reading: "tsuitachi", meaningId: "tanggal 1 — murni hafalan", numericValue: 1, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-2", category: "date", termKana: "ふつか", reading: "futsuka", meaningId: "tanggal 2 — murni hafalan", numericValue: 2, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-3", category: "date", termKana: "みっか", reading: "mikka", meaningId: "tanggal 3 — murni hafalan", numericValue: 3, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-4", category: "date", termKana: "よっか", reading: "yokka", meaningId: "tanggal 4 — murni hafalan", numericValue: 4, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-5", category: "date", termKana: "いつか", reading: "itsuka", meaningId: "tanggal 5 — murni hafalan", numericValue: 5, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-6", category: "date", termKana: "むいか", reading: "muika", meaningId: "tanggal 6 — murni hafalan", numericValue: 6, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-7", category: "date", termKana: "なのか", reading: "nanoka", meaningId: "tanggal 7 — murni hafalan", numericValue: 7, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-8", category: "date", termKana: "ようか", reading: "youka", meaningId: "tanggal 8 — murni hafalan", numericValue: 8, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-9", category: "date", termKana: "ここのか", reading: "kokonoka", meaningId: "tanggal 9 — murni hafalan", numericValue: 9, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-10", category: "date", termKana: "とおか", reading: "tooka", meaningId: "tanggal 10 — murni hafalan", numericValue: 10, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-11", category: "date", termKana: "じゅういちにち", reading: "juuichinichi", meaningId: "tanggal 11 — pola beraturan, kontras dengan yang di atas", numericValue: 11, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "dt-12", category: "date", termKana: "じゅうににち", reading: "juuninichi", meaningId: "tanggal 12 — pola beraturan", numericValue: 12, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "dt-13", category: "date", termKana: "じゅうさんにち", reading: "juusannichi", meaningId: "tanggal 13 — pola beraturan", numericValue: 13, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "dt-14", category: "date", termKana: "じゅうよっか", reading: "juuyokka", meaningId: "tanggal 14 — murni hafalan (pola 4 muncul lagi)", numericValue: 14, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-15", category: "date", termKana: "じゅうごにち", reading: "juugonichi", meaningId: "tanggal 15 — pola beraturan", numericValue: 15, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "dt-20", category: "date", termKana: "はつか", reading: "hatsuka", meaningId: "tanggal 20 — murni hafalan", numericValue: 20, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "dt-24", category: "date", termKana: "にじゅうよっか", reading: "nijuuyokka", meaningId: "tanggal 24 — murni hafalan (pola 4 muncul lagi)", numericValue: 24, isIrregular: true, irregularOfKey: null, orderIndex: next() },

  // ── price (menggabungkan angka + 円; memperkenalkan pengelompokan 万) ──
  { key: "pr-100", category: "price", termKana: "ひゃくえん", reading: "hyakuen", meaningId: "100 yen", numericValue: 100, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "pr-500", category: "price", termKana: "ごひゃくえん", reading: "gohyakuen", meaningId: "500 yen", numericValue: 500, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "pr-1000", category: "price", termKana: "せんえん", reading: "sen'en", meaningId: "1.000 yen", numericValue: 1000, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "pr-2000", category: "price", termKana: "にせんえん", reading: "nisen'en", meaningId: "2.000 yen", numericValue: 2000, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "pr-3000", category: "price", termKana: "さんぜんえん", reading: "sanzen'en", meaningId: "3.000 yen — bunyi 'sen' berubah jadi 'zen'", numericValue: 3000, isIrregular: true, irregularOfKey: "pr-1000", orderIndex: next() },
  { key: "pr-5000", category: "price", termKana: "ごせんえん", reading: "gosen'en", meaningId: "5.000 yen", numericValue: 5000, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "pr-8000", category: "price", termKana: "はっせんえん", reading: "hassen'en", meaningId: "8.000 yen — bunyi 'sen' menguat jadi 'ssen'", numericValue: 8000, isIrregular: true, irregularOfKey: "pr-1000", orderIndex: next() },
  { key: "pr-10000", category: "price", termKana: "いちまんえん", reading: "ichiman'en", meaningId: "10.000 yen — di sinilah bahasa Jepang mulai berkelompok per 4 digit (万), bukan per 3 digit seperti bahasa Indonesia", numericValue: 10000, isIrregular: false, irregularOfKey: null, orderIndex: next() },

  // ── counter: 人 (nin, orang) ──
  { key: "ctn-1", category: "counter_nin", termKana: "ひとり", reading: "hitori", meaningId: "1 orang — bacaan unik, bukan 'ichinin'", numericValue: 1, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "ctn-2", category: "counter_nin", termKana: "ふたり", reading: "futari", meaningId: "2 orang — bacaan unik, bukan 'ninin'", numericValue: 2, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "ctn-3", category: "counter_nin", termKana: "さんにん", reading: "sannin", meaningId: "3 orang — mulai pola beraturan", numericValue: 3, isIrregular: false, irregularOfKey: null, orderIndex: next() },

  // ── counter: 匹 (hiki, ekor hewan kecil) ──
  { key: "cth-1", category: "counter_hiki", termKana: "いっぴき", reading: "ippiki", meaningId: "1 ekor", numericValue: 1, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "cth-2", category: "counter_hiki", termKana: "にひき", reading: "nihiki", meaningId: "2 ekor", numericValue: 2, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "cth-3", category: "counter_hiki", termKana: "さんびき", reading: "sanbiki", meaningId: "3 ekor", numericValue: 3, isIrregular: true, irregularOfKey: null, orderIndex: next() },

  // ── counter: 本 (hon, benda panjang) ──
  { key: "cthn-1", category: "counter_hon", termKana: "いっぽん", reading: "ippon", meaningId: "1 batang", numericValue: 1, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "cthn-2", category: "counter_hon", termKana: "にほん", reading: "nihon", meaningId: "2 batang", numericValue: 2, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "cthn-3", category: "counter_hon", termKana: "さんぼん", reading: "sanbon", meaningId: "3 batang", numericValue: 3, isIrregular: true, irregularOfKey: null, orderIndex: next() },

  // ── counter: 枚 (mai, benda tipis) — hampir semua beraturan, kontras sengaja ──
  { key: "ctm-1", category: "counter_mai", termKana: "いちまい", reading: "ichimai", meaningId: "1 lembar — pola beraturan penuh", numericValue: 1, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "ctm-2", category: "counter_mai", termKana: "にまい", reading: "nimai", meaningId: "2 lembar", numericValue: 2, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "ctm-3", category: "counter_mai", termKana: "さんまい", reading: "sanmai", meaningId: "3 lembar", numericValue: 3, isIrregular: false, irregularOfKey: null, orderIndex: next() },

  // ── counter: 台 (dai, mesin) — juga beraturan penuh ──
  { key: "ctd-1", category: "counter_dai", termKana: "いちだい", reading: "ichidai", meaningId: "1 unit — pola beraturan penuh", numericValue: 1, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "ctd-2", category: "counter_dai", termKana: "にだい", reading: "nidai", meaningId: "2 unit", numericValue: 2, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "ctd-3", category: "counter_dai", termKana: "さんだい", reading: "sandai", meaningId: "3 unit", numericValue: 3, isIrregular: false, irregularOfKey: null, orderIndex: next() },

  // ── counter: 個 (ko, benda umum) ──
  { key: "ctk-1", category: "counter_ko", termKana: "いっこ", reading: "ikko", meaningId: "1 buah", numericValue: 1, isIrregular: true, irregularOfKey: null, orderIndex: next() },
  { key: "ctk-2", category: "counter_ko", termKana: "にこ", reading: "niko", meaningId: "2 buah", numericValue: 2, isIrregular: false, irregularOfKey: null, orderIndex: next() },
  { key: "ctk-3", category: "counter_ko", termKana: "さんこ", reading: "sanko", meaningId: "3 buah", numericValue: 3, isIrregular: false, irregularOfKey: null, orderIndex: next() },
];

function toSlug(romajiReading: string): string {
  return romajiReading.toLowerCase().replace(/[^a-z]/g, "");
}

async function synthesize(text: string, speakerId: number): Promise<Buffer> {
  const queryUrl = `${VOICEVOX_BASE_URL}/audio_query?${new URLSearchParams({ text, speaker: String(speakerId) })}`;
  const queryRes = await fetch(queryUrl, { method: "POST" });
  if (!queryRes.ok) throw new Error(`audio_query gagal untuk "${text}": HTTP ${queryRes.status}`);
  const audioQuery = await queryRes.json();

  const synthUrl = `${VOICEVOX_BASE_URL}/synthesis?${new URLSearchParams({ speaker: String(speakerId) })}`;
  const synthRes = await fetch(synthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(audioQuery),
  });
  if (!synthRes.ok) throw new Error(`synthesis gagal untuk "${text}": HTTP ${synthRes.status}`);
  return Buffer.from(await synthRes.arrayBuffer());
}

async function ensureBucket(supabaseAdmin: SupabaseClient) {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw new Error(`Gagal membaca daftar bucket storage: ${listError.message}`);
  if (buckets?.find((b) => b.name === BUCKET)) return;
  const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  if (createError) throw new Error(`Gagal membuat bucket "${BUCKET}": ${createError.message}`);
}

function requireEnv(name: string, hint: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} tidak ditemukan di .env.local. ${hint}`);
  return value;
}

async function main() {
  const speakerId = resolveSpeakerId();
  const skipAudio = process.argv.includes("--no-audio");
  console.log(`Target: ${ITEMS.length} vocab_items untuk PRE-N5.03${skipAudio ? " (tanpa audio)" : ` (audio speaker ${speakerId})`}.\n`);

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "Cek .env.local.");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", "Diperlukan untuk upload ke Storage.");
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
  const { db, close } = createSeedClient();

  let audioOk = 0;
  let audioFailed = 0;

  try {
    if (!skipAudio) {
      try {
        const ping = await fetch(`${VOICEVOX_BASE_URL}/speakers`);
        if (!ping.ok) throw new Error(`HTTP ${ping.status}`);
        await ensureBucket(supabaseAdmin);
      } catch (err) {
        console.warn(`VOICEVOX/storage tidak siap (${(err as Error).message}) — lanjut TANPA audio.`);
      }
    }

    const [moduleRow] = await db.select().from(learningModules).where(eq(learningModules.code, "PRE-N5.03"));
    if (!moduleRow) throw new Error("Modul PRE-N5.03 tidak ditemukan.");

    const idByKey = new Map<string, number>();

    // Pass 1: insert every item with irregularOf left null, audio generated
    // where possible. Two passes because irregularOf needs a real row id
    // that only exists after its "regular" counterpart is inserted.
    for (const item of ITEMS) {
      let audioUrl: string | null = null;
      if (!skipAudio) {
        try {
          const buf = await synthesize(item.termKana, speakerId);
          const storagePath = `vocab/pre-n5-03/${item.category}/${toSlug(item.reading)}.wav`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(storagePath, buf, { contentType: "audio/wav", upsert: true });
          if (uploadError) throw uploadError;
          const { data: publicUrl } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
          audioUrl = publicUrl.publicUrl;
          audioOk += 1;
        } catch (err) {
          audioFailed += 1;
          console.warn(`  audio gagal untuk "${item.termKana}": ${(err as Error).message}`);
        }
      }

      const [inserted] = await db
        .insert(vocabItems)
        .values({
          moduleId: moduleRow.id,
          category: item.category,
          termKana: item.termKana,
          reading: item.reading,
          meaningId: item.meaningId,
          numericValue: item.numericValue,
          isIrregular: item.isIrregular,
          irregularOf: null,
          audioUrl,
          orderIndex: item.orderIndex,
        })
        .returning({ id: vocabItems.id });
      idByKey.set(item.key, inserted.id);
      console.log(`inserted ${item.key} (${item.termKana}) -> id ${inserted.id}${audioUrl ? " [audio]" : ""}`);
    }

    // Pass 2: wire up irregularOf now that every id exists.
    for (const item of ITEMS) {
      if (!item.irregularOfKey) continue;
      const selfId = idByKey.get(item.key)!;
      const targetId = idByKey.get(item.irregularOfKey);
      if (!targetId) {
        console.warn(`  irregularOfKey "${item.irregularOfKey}" tidak ditemukan untuk ${item.key}`);
        continue;
      }
      await db.execute(sql`update vocab_items set irregular_of = ${targetId} where id = ${selfId}`);
    }

    console.log(`\nSelesai — ${ITEMS.length} item, audio: ${audioOk} berhasil / ${audioFailed} gagal / ${skipAudio ? ITEMS.length : 0} dilewati.`);
    console.log("PERLU DITINJAU: konten ini belum melalui QA linguistik penutur asli (V2.1 Bagian 16 butir 10).");
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error("seed-pre-n5-03-vocab gagal:", err.message ?? err);
  process.exit(1);
});
