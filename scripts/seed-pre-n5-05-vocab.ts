import { eq } from "drizzle-orm";
import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSeedClient } from "../db/seed-client";
import { vocabItems } from "../db/schema/vocab";
import { learningModules } from "../db/schema/curriculum";

// PROMPT-11 Bagian 5 — content for PRE-N5.05 (Kosakata Dasar 120). Built
// on the same Vocabulary Engine as PRE-N5.03/04 (third module on it now
// — see docs/POLA-MODUL-BARU.md's VOCAB_PHASE_PREFIX map, extended
// below for this module too).
//
// SOURCE: every word_kana/reading/meaning here is COPIED from the
// existing, already-verified kana_example_words (137 rows, used by the
// kana engine's "Baca" step) — not re-derived from scratch. 6 of those
// 137 rows are explicit reading-practice placeholders with no real
// word ("belum ada kata sungguhan" in their own meaning_id) and are
// skipped: アイ, ウエ, アオ, ハヒフ, フヘホ, ヤユヨ. A handful of low-
// value/branded loanwords are also skipped for a "most useful 120"
// selection (エコ, ジャズ, アメリカ, ナイス, ファン) — the remainder,
// ~120, is used here as-is or close to it; exact count reported at the
// end of this script's run.
//
// PERLU DITINJAU: collocations are newly authored for this module (not
// present in kana_example_words) and have NOT been checked by a native
// speaker (V2.1 Bagian 16 butir 10) — kept deliberately simple
// (mostly noun+noun or noun+particle+verb) to avoid adjective
// conjugation mistakes, not because that's the ideal register.

const VOICEVOX_BASE_URL = process.env.VOICEVOX_BASE_URL ?? "http://localhost:50021";
const BUCKET = "audio";
const SPEAKER_1 = process.env.VOICEVOX_SPEAKER_ID ? Number(process.env.VOICEVOX_SPEAKER_ID) : 2;

type ItemSeed = {
  category: string;
  termKana: string;
  reading: string;
  meaningId: string;
  collocation: string | null;
  collocationMeaningId: string | null;
};

let order = 0;
function next(): number {
  order += 1;
  return order;
}

const ITEMS: ItemSeed[] = [
  // ── alam (nature) ──
  { category: "alam", termKana: "そら", reading: "sora", meaningId: "langit", collocation: "あおい そら", collocationMeaningId: "langit biru" },
  { category: "alam", termKana: "つき", reading: "tsuki", meaningId: "bulan", collocation: "つきが きれい", collocationMeaningId: "bulannya indah" },
  { category: "alam", termKana: "ほし", reading: "hoshi", meaningId: "bintang", collocation: "ほしを みる", collocationMeaningId: "melihat bintang" },
  { category: "alam", termKana: "やま", reading: "yama", meaningId: "gunung", collocation: "たかい やま", collocationMeaningId: "gunung tinggi" },
  { category: "alam", termKana: "かわ", reading: "kawa", meaningId: "sungai", collocation: "かわで およぐ", collocationMeaningId: "berenang di sungai" },
  { category: "alam", termKana: "くも", reading: "kumo", meaningId: "awan", collocation: "くろい くも", collocationMeaningId: "awan hitam" },
  { category: "alam", termKana: "ゆき", reading: "yuki", meaningId: "salju", collocation: "ゆきが ふる", collocationMeaningId: "salju turun" },
  { category: "alam", termKana: "あめ", reading: "ame", meaningId: "hujan", collocation: "あめが ふる", collocationMeaningId: "hujan turun" },

  // ── cuaca_waktu (weather/time) ──
  { category: "cuaca_waktu", termKana: "あき", reading: "aki", meaningId: "musim gugur", collocation: "あきの かぜ", collocationMeaningId: "angin musim gugur" },
  { category: "cuaca_waktu", termKana: "なつ", reading: "natsu", meaningId: "musim panas", collocation: "なつやすみ", collocationMeaningId: "libur musim panas" },
  { category: "cuaca_waktu", termKana: "かぜ", reading: "kaze", meaningId: "angin / masuk angin", collocation: "かぜが ふく", collocationMeaningId: "angin bertiup" },
  { category: "cuaca_waktu", termKana: "きょう", reading: "kyou", meaningId: "hari ini", collocation: "きょうは あつい", collocationMeaningId: "hari ini panas" },
  { category: "cuaca_waktu", termKana: "きのう", reading: "kinou", meaningId: "kemarin", collocation: "きのうの よる", collocationMeaningId: "kemarin malam" },
  { category: "cuaca_waktu", termKana: "あさ", reading: "asa", meaningId: "pagi", collocation: "あさの ごはん", collocationMeaningId: "makan pagi" },

  // ── warna_sifat (colors/basic descriptors) ──
  { category: "warna_sifat", termKana: "あお", reading: "ao", meaningId: "biru", collocation: "あおい そら", collocationMeaningId: "langit biru" },
  { category: "warna_sifat", termKana: "あか", reading: "aka", meaningId: "merah", collocation: "あかい はな", collocationMeaningId: "bunga merah" },
  { category: "warna_sifat", termKana: "いろ", reading: "iro", meaningId: "warna", collocation: "すきな いろ", collocationMeaningId: "warna favorit" },
  { category: "warna_sifat", termKana: "はやい", reading: "hayai", meaningId: "cepat", collocation: "はやい でんしゃ", collocationMeaningId: "kereta cepat" },
  { category: "warna_sifat", termKana: "やすい", reading: "yasui", meaningId: "murah", collocation: "やすい くつ", collocationMeaningId: "sepatu murah" },

  // ── hewan (animals) ──
  { category: "hewan", termKana: "いぬ", reading: "inu", meaningId: "anjing", collocation: "いぬと あそぶ", collocationMeaningId: "bermain dengan anjing" },
  { category: "hewan", termKana: "ねこ", reading: "neko", meaningId: "kucing", collocation: "ねこが ねる", collocationMeaningId: "kucing tidur" },
  { category: "hewan", termKana: "うま", reading: "uma", meaningId: "kuda", collocation: "うまに のる", collocationMeaningId: "naik kuda" },
  { category: "hewan", termKana: "とり", reading: "tori", meaningId: "burung", collocation: "とりが なく", collocationMeaningId: "burung berkicau" },
  { category: "hewan", termKana: "さかな", reading: "sakana", meaningId: "ikan", collocation: "さかなを たべる", collocationMeaningId: "makan ikan" },
  { category: "hewan", termKana: "かに", reading: "kani", meaningId: "kepiting", collocation: "かにの あし", collocationMeaningId: "kaki kepiting" },
  { category: "hewan", termKana: "むし", reading: "mushi", meaningId: "serangga", collocation: "むしが おおい", collocationMeaningId: "banyak serangga" },
  { category: "hewan", termKana: "リス", reading: "risu", meaningId: "tupai", collocation: "きの うえの リス", collocationMeaningId: "tupai di atas pohon" },

  // ── tubuh (body) ──
  { category: "tubuh", termKana: "かお", reading: "kao", meaningId: "wajah", collocation: "かおを あらう", collocationMeaningId: "mencuci wajah" },
  { category: "tubuh", termKana: "みみ", reading: "mimi", meaningId: "telinga", collocation: "みみが いたい", collocationMeaningId: "telinga sakit" },
  { category: "tubuh", termKana: "ひざ", reading: "hiza", meaningId: "lutut", collocation: "ひざが いたい", collocationMeaningId: "lutut sakit" },
  { category: "tubuh", termKana: "こえ", reading: "koe", meaningId: "suara", collocation: "おおきい こえ", collocationMeaningId: "suara besar/keras" },

  // ── keluarga (family) ──
  { category: "keluarga", termKana: "はは", reading: "haha", meaningId: "ibu (kata sendiri)", collocation: "ははと わたし", collocationMeaningId: "ibu dan saya" },
  { category: "keluarga", termKana: "かぞく", reading: "kazoku", meaningId: "keluarga", collocation: "かぞくと すむ", collocationMeaningId: "tinggal dengan keluarga" },
  { category: "keluarga", termKana: "おばさん", reading: "obasan", meaningId: "bibi / wanita paruh baya", collocation: "おばさんの いえ", collocationMeaningId: "rumah bibi" },
  { category: "keluarga", termKana: "おばあさん", reading: "obaasan", meaningId: "nenek", collocation: "おばあさんと あるく", collocationMeaningId: "berjalan dengan nenek" },
  { category: "keluarga", termKana: "おじさん", reading: "ojisan", meaningId: "paman / pria paruh baya", collocation: "おじさんの くるま", collocationMeaningId: "mobil paman" },
  { category: "keluarga", termKana: "おじいさん", reading: "ojiisan", meaningId: "kakek", collocation: "おじいさんと はなす", collocationMeaningId: "berbicara dengan kakek" },

  // ── benda_rumah (household items) ──
  { category: "benda_rumah", termKana: "いす", reading: "isu", meaningId: "kursi", collocation: "いすに すわる", collocationMeaningId: "duduk di kursi" },
  { category: "benda_rumah", termKana: "はこ", reading: "hako", meaningId: "kotak", collocation: "はこの なか", collocationMeaningId: "isi/dalam kotak" },
  { category: "benda_rumah", termKana: "かがみ", reading: "kagami", meaningId: "cermin", collocation: "かがみを みる", collocationMeaningId: "melihat cermin" },
  { category: "benda_rumah", termKana: "めがね", reading: "megane", meaningId: "kacamata", collocation: "めがねを かける", collocationMeaningId: "memakai kacamata" },
  { category: "benda_rumah", termKana: "とけい", reading: "tokei", meaningId: "jam", collocation: "とけいを みる", collocationMeaningId: "melihat jam" },
  { category: "benda_rumah", termKana: "ベッド", reading: "beddo", meaningId: "tempat tidur", collocation: "ベッドで ねる", collocationMeaningId: "tidur di tempat tidur" },
  { category: "benda_rumah", termKana: "コップ", reading: "koppu", meaningId: "gelas", collocation: "コップの みず", collocationMeaningId: "air di gelas" },

  // ── sekolah (school/stationery) ──
  { category: "sekolah", termKana: "えんぴつ", reading: "enpitsu", meaningId: "pensil", collocation: "えんぴつで かく", collocationMeaningId: "menulis dengan pensil" },
  { category: "sekolah", termKana: "ほん", reading: "hon", meaningId: "buku", collocation: "ほんを よむ", collocationMeaningId: "membaca buku" },
  { category: "sekolah", termKana: "じゅぎょう", reading: "jugyou", meaningId: "pelajaran / kelas", collocation: "じゅぎょうに でる", collocationMeaningId: "masuk kelas" },
  { category: "sekolah", termKana: "がくせい", reading: "gakusei", meaningId: "murid / mahasiswa", collocation: "だいがくの がくせい", collocationMeaningId: "mahasiswa universitas" },
  { category: "sekolah", termKana: "しゃしん", reading: "shashin", meaningId: "foto", collocation: "しゃしんを とる", collocationMeaningId: "mengambil foto" },
  { category: "sekolah", termKana: "きって", reading: "kitte", meaningId: "perangko", collocation: "きってを はる", collocationMeaningId: "menempel perangko" },
  { category: "sekolah", termKana: "テスト", reading: "tesuto", meaningId: "tes", collocation: "テストを うける", collocationMeaningId: "mengikuti tes" },

  // ── pakaian (clothing) ──
  { category: "pakaian", termKana: "くつ", reading: "kutsu", meaningId: "sepatu", collocation: "くつを はく", collocationMeaningId: "memakai sepatu" },
  { category: "pakaian", termKana: "かさ", reading: "kasa", meaningId: "payung", collocation: "かさを さす", collocationMeaningId: "membuka payung" },
  { category: "pakaian", termKana: "シャツ", reading: "shatsu", meaningId: "kemeja", collocation: "しろい シャツ", collocationMeaningId: "kemeja putih" },

  // ── makanan (food) ──
  { category: "makanan", termKana: "すし", reading: "sushi", meaningId: "sushi", collocation: "すしを たべる", collocationMeaningId: "makan sushi" },
  { category: "makanan", termKana: "しお", reading: "shio", meaningId: "garam", collocation: "しおを いれる", collocationMeaningId: "menambahkan garam" },
  { category: "makanan", termKana: "なす", reading: "nasu", meaningId: "terong", collocation: "なすの りょうり", collocationMeaningId: "masakan terong" },
  { category: "makanan", termKana: "じゃがいも", reading: "jagaimo", meaningId: "kentang", collocation: "じゃがいもを やく", collocationMeaningId: "memanggang kentang" },
  { category: "makanan", termKana: "パン", reading: "pan", meaningId: "roti", collocation: "パンを やく", collocationMeaningId: "memanggang roti" },
  { category: "makanan", termKana: "キャベツ", reading: "kyabetsu", meaningId: "kubis", collocation: "キャベツの サラダ", collocationMeaningId: "salad kubis" },
  { category: "makanan", termKana: "ジャム", reading: "jamu", meaningId: "selai", collocation: "パンに ジャム", collocationMeaningId: "selai di roti" },
  { category: "makanan", termKana: "サンドイッチ", reading: "sandoicchi", meaningId: "sandwich", collocation: "サンドイッチを つくる", collocationMeaningId: "membuat sandwich" },

  // ── minuman_jajan (drinks/snacks) ──
  { category: "minuman_jajan", termKana: "おちゃ", reading: "ocha", meaningId: "teh", collocation: "おちゃを のむ", collocationMeaningId: "minum teh" },
  { category: "minuman_jajan", termKana: "ぎゅうにゅう", reading: "gyuunyuu", meaningId: "susu sapi", collocation: "ぎゅうにゅうを のむ", collocationMeaningId: "minum susu" },
  { category: "minuman_jajan", termKana: "コーヒー", reading: "koohii", meaningId: "kopi", collocation: "あさの コーヒー", collocationMeaningId: "kopi pagi" },
  { category: "minuman_jajan", termKana: "ケーキ", reading: "keeki", meaningId: "kue", collocation: "ケーキを つくる", collocationMeaningId: "membuat kue" },
  { category: "minuman_jajan", termKana: "カレー", reading: "karee", meaningId: "kari", collocation: "からい カレー", collocationMeaningId: "kari pedas" },
  { category: "minuman_jajan", termKana: "ジュース", reading: "juusu", meaningId: "jus", collocation: "ジュースを のむ", collocationMeaningId: "minum jus" },
  { category: "minuman_jajan", termKana: "アイスクリーム", reading: "aisukuriimu", meaningId: "es krim", collocation: "アイスクリームを たべる", collocationMeaningId: "makan es krim" },
  { category: "minuman_jajan", termKana: "ココア", reading: "kokoa", meaningId: "cokelat panas", collocation: "あたたかい ココア", collocationMeaningId: "cokelat panas hangat" },

  // ── transportasi (transport) ──
  { category: "transportasi", termKana: "くるま", reading: "kuruma", meaningId: "mobil", collocation: "くるまで いく", collocationMeaningId: "pergi naik mobil" },
  { category: "transportasi", termKana: "でんしゃ", reading: "densha", meaningId: "kereta listrik", collocation: "でんしゃに のる", collocationMeaningId: "naik kereta" },
  { category: "transportasi", termKana: "バス", reading: "basu", meaningId: "bus", collocation: "バスを まつ", collocationMeaningId: "menunggu bus" },
  { category: "transportasi", termKana: "タクシー", reading: "takushii", meaningId: "taksi", collocation: "タクシーを よぶ", collocationMeaningId: "memanggil taksi" },
  { category: "transportasi", termKana: "ふね", reading: "fune", meaningId: "kapal", collocation: "ふねに のる", collocationMeaningId: "naik kapal" },

  // ── tempat (places) ──
  { category: "tempat", termKana: "いえ", reading: "ie", meaningId: "rumah", collocation: "いえに かえる", collocationMeaningId: "pulang ke rumah" },
  { category: "tempat", termKana: "びょういん", reading: "byouin", meaningId: "rumah sakit", collocation: "びょういんに いく", collocationMeaningId: "pergi ke rumah sakit" },
  { category: "tempat", termKana: "ホテル", reading: "hoteru", meaningId: "hotel", collocation: "ホテルに とまる", collocationMeaningId: "menginap di hotel" },
  { category: "tempat", termKana: "スーパー", reading: "suupaa", meaningId: "supermarket", collocation: "スーパーで かう", collocationMeaningId: "membeli di supermarket" },
  { category: "tempat", termKana: "にほん", reading: "nihon", meaningId: "Jepang", collocation: "にほんに すむ", collocationMeaningId: "tinggal di Jepang" },
  { category: "tempat", termKana: "いけ", reading: "ike", meaningId: "kolam", collocation: "いけの さかな", collocationMeaningId: "ikan di kolam" },

  // ── teknologi (technology) ──
  { category: "teknologi", termKana: "テレビ", reading: "terebi", meaningId: "televisi", collocation: "テレビを みる", collocationMeaningId: "menonton televisi" },
  { category: "teknologi", termKana: "スマホ", reading: "sumaho", meaningId: "ponsel pintar", collocation: "スマホを つかう", collocationMeaningId: "memakai ponsel" },
  { category: "teknologi", termKana: "コンピューター", reading: "konpyuutaa", meaningId: "komputer", collocation: "コンピューターで しごと", collocationMeaningId: "bekerja dengan komputer" },
  { category: "teknologi", termKana: "インターネット", reading: "intaanetto", meaningId: "internet", collocation: "インターネットを つかう", collocationMeaningId: "memakai internet" },
  { category: "teknologi", termKana: "メール", reading: "meeru", meaningId: "surel", collocation: "メールを おくる", collocationMeaningId: "mengirim surel" },
  { category: "teknologi", termKana: "ラジオ", reading: "rajio", meaningId: "radio", collocation: "ラジオを きく", collocationMeaningId: "mendengar radio" },
  { category: "teknologi", termKana: "ピアノ", reading: "piano", meaningId: "piano", collocation: "ピアノを ひく", collocationMeaningId: "memainkan piano" },
  { category: "teknologi", termKana: "ペン", reading: "pen", meaningId: "pena", collocation: "ペンで かく", collocationMeaningId: "menulis dengan pena" },

  // ── kata_kerja (verbs/activities) ──
  { category: "kata_kerja", termKana: "あう", reading: "au", meaningId: "bertemu", collocation: "ともだちに あう", collocationMeaningId: "bertemu teman" },
  { category: "kata_kerja", termKana: "いう", reading: "iu", meaningId: "berkata", collocation: "なまえを いう", collocationMeaningId: "menyebutkan nama" },
  { category: "kata_kerja", termKana: "きく", reading: "kiku", meaningId: "mendengar", collocation: "おんがくを きく", collocationMeaningId: "mendengarkan musik" },
  { category: "kata_kerja", termKana: "わかる", reading: "wakaru", meaningId: "mengerti", collocation: "にほんごが わかる", collocationMeaningId: "mengerti bahasa Jepang" },
  { category: "kata_kerja", termKana: "りょこう", reading: "ryokou", meaningId: "wisata / bepergian", collocation: "りょこうを する", collocationMeaningId: "melakukan perjalanan" },
  { category: "kata_kerja", termKana: "キャンプ", reading: "kyanpu", meaningId: "berkemah", collocation: "やまで キャンプ", collocationMeaningId: "berkemah di gunung" },

  // ── dasar_lain (core basics/misc) ──
  { category: "dasar_lain", termKana: "これ", reading: "kore", meaningId: "ini", collocation: "これは ほん", collocationMeaningId: "ini buku" },
  { category: "dasar_lain", termKana: "わたし", reading: "watashi", meaningId: "saya", collocation: "わたしの いえ", collocationMeaningId: "rumah saya" },
  { category: "dasar_lain", termKana: "いいえ", reading: "iie", meaningId: "tidak", collocation: "いいえ、ちがいます", collocationMeaningId: "tidak, itu salah/beda" },
  { category: "dasar_lain", termKana: "うそ", reading: "uso", meaningId: "bohong", collocation: "うそを いう", collocationMeaningId: "berbohong" },
  { category: "dasar_lain", termKana: "ひゃく", reading: "hyaku", meaningId: "seratus", collocation: "ひゃくえん", collocationMeaningId: "seratus yen" },
  { category: "dasar_lain", termKana: "かんぱい", reading: "kanpai", meaningId: "bersulang", collocation: "みんなで かんぱい", collocationMeaningId: "bersulang bersama" },
  { category: "dasar_lain", termKana: "よこ", reading: "yoko", meaningId: "samping", collocation: "いえの よこ", collocationMeaningId: "samping rumah" },
  { category: "dasar_lain", termKana: "した", reading: "shita", meaningId: "bawah", collocation: "つくえの した", collocationMeaningId: "bawah meja" },
  { category: "dasar_lain", termKana: "うえ", reading: "ue", meaningId: "atas", collocation: "つくえの うえ", collocationMeaningId: "atas meja" },
  { category: "dasar_lain", termKana: "メモ", reading: "memo", meaningId: "catatan", collocation: "メモを とる", collocationMeaningId: "membuat catatan" },
  { category: "dasar_lain", termKana: "ドア", reading: "doa", meaningId: "pintu", collocation: "ドアを あける", collocationMeaningId: "membuka pintu" },
  { category: "dasar_lain", termKana: "ビザ", reading: "biza", meaningId: "visa", collocation: "ビザを とる", collocationMeaningId: "mengurus visa" },
  { category: "dasar_lain", termKana: "オアシス", reading: "oashisu", meaningId: "oasis", collocation: "さばくの オアシス", collocationMeaningId: "oasis di gurun" },
  { category: "dasar_lain", termKana: "マスク", reading: "masuku", meaningId: "masker", collocation: "マスクを する", collocationMeaningId: "memakai masker" },
  { category: "dasar_lain", termKana: "ガム", reading: "gamu", meaningId: "permen karet", collocation: "ガムを かむ", collocationMeaningId: "mengunyah permen karet" },
  { category: "dasar_lain", termKana: "フィルム", reading: "firumu", meaningId: "film (roll)", collocation: "フィルムを いれる", collocationMeaningId: "memasukkan film (roll)" },
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
  ITEMS.forEach(() => next()); // consume order counter positionally below instead
  order = 0;
  const skipAudio = process.argv.includes("--no-audio");
  console.log(`Target: ${ITEMS.length} vocab_items untuk PRE-N5.05${skipAudio ? " (tanpa audio)" : ` (audio speaker ${SPEAKER_1})`}.\n`);

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "Cek .env.local.");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", "Diperlukan untuk upload ke Storage.");
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
  const { db, close } = createSeedClient();

  let audioOk = 0;
  let audioFailed = 0;
  let voicevoxReady = false;

  try {
    if (!skipAudio) {
      try {
        const ping = await fetch(`${VOICEVOX_BASE_URL}/speakers`);
        if (!ping.ok) throw new Error(`HTTP ${ping.status}`);
        await ensureBucket(supabaseAdmin);
        voicevoxReady = true;
      } catch (err) {
        console.warn(`VOICEVOX/storage tidak siap (${(err as Error).message}) — lanjut TANPA audio.`);
      }
    }

    const [moduleRow] = await db.select().from(learningModules).where(eq(learningModules.code, "PRE-N5.05"));
    if (!moduleRow) throw new Error("Modul PRE-N5.05 tidak ditemukan.");

    await db.delete(vocabItems).where(eq(vocabItems.moduleId, moduleRow.id));

    let inserted = 0;
    const categoryCounts = new Map<string, number>();
    for (const item of ITEMS) {
      const orderIndex = (categoryCounts.get(item.category) ?? 0) + 1;
      categoryCounts.set(item.category, orderIndex);

      let audioUrl: string | null = null;
      if (!skipAudio && voicevoxReady) {
        try {
          const buf = await synthesize(item.termKana, SPEAKER_1);
          const storagePath = `vocab/pre-n5-05/${item.category}/${toSlug(item.reading)}.wav`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(storagePath, buf, { contentType: "audio/wav", upsert: true });
          if (uploadError) throw uploadError;
          audioUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
          audioOk++;
        } catch (err) {
          audioFailed++;
          console.warn(`  audio gagal untuk "${item.termKana}": ${(err as Error).message}`);
        }
      }

      await db.insert(vocabItems).values({
        moduleId: moduleRow.id,
        category: item.category,
        termKana: item.termKana,
        reading: item.reading,
        meaningId: item.meaningId,
        numericValue: null,
        isIrregular: false,
        irregularOf: null,
        register: null,
        registerOf: null,
        audioUrl,
        audioUrlSpeaker2: null,
        collocation: item.collocation,
        collocationMeaningId: item.collocationMeaningId,
        orderIndex,
      });
      inserted++;
    }

    console.log(`${inserted}/${ITEMS.length} item dimasukkan, ${categoryCounts.size} kategori tematik.`);
    console.log("Kategori:", [...categoryCounts.entries()].map(([c, n]) => `${c}(${n})`).join(", "));
    console.log(`Audio: ${audioOk} berhasil, ${audioFailed} gagal.`);
    console.log(
      "\nPERLU DITINJAU: kata dicek dari kana_example_words yang sudah ada, tapi collocation baru ditulis " +
        "sesi ini dan belum melalui QA linguistik penutur asli (V2.1 Bagian 16 butir 10).",
    );
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-pre-n5-05-vocab gagal:", error);
  process.exit(1);
});
