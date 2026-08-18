import * as wanakana from "wanakana";
import { eq } from "drizzle-orm";
import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSeedClient } from "../db/seed-client";
import { kanaCharacters, kanaExampleWords } from "../db/schema/kana";

// Cadangan lama tetap ada di scripts/generate-kana-audio.ts (OpenAI TTS).
// Script ini menggantikannya sebagai sumber audio utama — suara VOICEVOX
// adalah penutur Jepang asli (engine OpenJTalk), bukan model TTS Inggris
// yang "dipaksa" bicara Jepang.

const VOICEVOX_BASE_URL = process.env.VOICEVOX_BASE_URL ?? "http://localhost:50021";
const BUCKET = "audio";
const FORCE = process.argv.includes("--force");

const DEFAULT_SPEAKER_ID = 2; // 四国めたん (Shikoku Metan) — ノーマル

function resolveSpeakerId(): number {
  const argMatch = process.argv.find((a) => a.startsWith("--speaker="));
  if (argMatch) return Number(argMatch.split("=")[1]);
  if (process.env.VOICEVOX_SPEAKER_ID) return Number(process.env.VOICEVOX_SPEAKER_ID);
  return DEFAULT_SPEAKER_ID;
}

type VoicevoxStyle = { name: string; id: number; type: string };
type VoicevoxSpeaker = { name: string; speaker_uuid: string; styles: VoicevoxStyle[] };

async function printSpeakerList(): Promise<void> {
  let speakers: VoicevoxSpeaker[];
  try {
    const res = await fetch(`${VOICEVOX_BASE_URL}/speakers`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    speakers = await res.json();
  } catch (err) {
    throw new Error(
      `Tidak bisa terhubung ke VOICEVOX di ${VOICEVOX_BASE_URL}. ` +
        `Penyebab paling umum: aplikasi VOICEVOX belum dibuka di komputer ini. ` +
        `Buka aplikasi VOICEVOX (bukan cuma servernya) lalu coba lagi. Detail error: ${(err as Error).message}`,
    );
  }

  console.log(`\n=== Daftar speaker VOICEVOX (${VOICEVOX_BASE_URL}) ===`);
  for (const speaker of speakers) {
    const styleList = speaker.styles.map((s) => `${s.name}=${s.id}`).join(", ");
    console.log(`${speaker.name}: ${styleList}`);
  }
  console.log("Pilih ID lewat --speaker=<id> atau env VOICEVOX_SPEAKER_ID. Default saat ini: " + DEFAULT_SPEAKER_ID + " (四国めたん ノーマル).\n");
}

async function synthesize(text: string, speakerId: number): Promise<Buffer> {
  const queryUrl = `${VOICEVOX_BASE_URL}/audio_query?${new URLSearchParams({ text, speaker: String(speakerId) })}`;
  const queryRes = await fetch(queryUrl, { method: "POST" });
  if (!queryRes.ok) {
    throw new Error(`audio_query gagal untuk "${text}" (HTTP ${queryRes.status}): ${await queryRes.text()}`);
  }
  const audioQuery = await queryRes.json();

  const synthUrl = `${VOICEVOX_BASE_URL}/synthesis?${new URLSearchParams({ speaker: String(speakerId) })}`;
  const synthRes = await fetch(synthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(audioQuery),
  });
  if (!synthRes.ok) {
    throw new Error(`synthesis gagal untuk "${text}" (HTTP ${synthRes.status}): ${await synthRes.text()}`);
  }
  return Buffer.from(await synthRes.arrayBuffer());
}

function toSlug(text: string): string {
  // Sama seperti scripts/generate-kana-audio.ts: romaji selalu diturunkan
  // lewat wanakana, tidak pernah diketik manual — hanya dipakai sebagai
  // nama file penyimpanan, bukan sebagai romaji yang ditampilkan ke user.
  return wanakana.toRomaji(text).toLowerCase().replace(/[^a-z]/g, "");
}

type DbTarget =
  | { table: "kana_characters"; script: "hiragana" | "katakana"; character: string }
  | { table: "kana_example_words"; wordKana: string }
  | null;

type AudioItem = {
  text: string; // teks yang dikirim ke VOICEVOX
  label: string; // untuk log
  storagePath: string;
  dbTarget: DbTarget;
};

const GROUP_A_KANA_ITEMS: AudioItem[] = (["あ", "い", "う", "え", "お"] as const).map((char) => ({
  text: char,
  label: char,
  storagePath: `kana/${toSlug(char)}.wav`,
  dbTarget: { table: "kana_characters", script: "hiragana", character: char },
}));

const GROUP_A_WORD_ITEMS: AudioItem[] = (["あお", "いえ", "うえ", "あい", "あう", "いう", "いいえ"] as const).map((word) => ({
  text: word,
  label: word,
  storagePath: `words/${toSlug(word)}.wav`,
  dbTarget: { table: "kana_example_words", wordKana: word },
}));

// 10 item baru M01 — tidak ada baris kana_characters/kana_example_words
// yang cocok untuk sebagian besar ini (frasa, kalimat, dan kata berkanji
// tidak masuk model "kata tersusun dari kana" yang dipakai sistem drill
// kana). URL publiknya deterministik (bucket+path), jadi scripts/
// seed-m01-content.ts menghitung URL yang sama secara independen tanpa
// perlu serah-terima data dari script ini.
const M01_ITEMS: AudioItem[] = [
  { text: "こんにちは", label: "こんにちは (halo)", storagePath: "phrases/konnichiwa.wav", dbTarget: null },
  { text: "ありがとう", label: "ありがとう (terima kasih)", storagePath: "phrases/arigatou.wav", dbTarget: null },
  { text: "ありがとうございます", label: "ありがとうございます (terima kasih, sopan)", storagePath: "phrases/arigatougozaimasu.wav", dbTarget: null },
  { text: "すし", label: "すし (sushi)", storagePath: `words/${toSlug("すし")}.wav`, dbTarget: null },
  { text: "日本", label: "日本 (Nihon/Jepang)", storagePath: "words/nihon.wav", dbTarget: null }, // manual slug: 日本 berkanji, wanakana tidak bisa membaca kanji
  { text: "私の名前はアスロです", label: "私の名前はアスロです (kalimat contoh)", storagePath: "sentences/contoh-kalimat-nama.wav", dbTarget: null }, // manual slug: mengandung kanji 私
  { text: "コーヒー", label: "コーヒー (kopi)", storagePath: `words/${toSlug("コーヒー")}.wav`, dbTarget: null },
  { text: "インドネシア", label: "インドネシア (Indonesia)", storagePath: `words/${toSlug("インドネシア")}.wav`, dbTarget: null },
  { text: "スマホ", label: "スマホ (smartphone)", storagePath: `words/${toSlug("スマホ")}.wav`, dbTarget: null },
  // Satu file gabungan, dibaca sebagai satu urutan — sesuai tabel
  // kebutuhan audio di docs/konten-M01-orientasi.md yang mendaftarkan
  // "ア、イ、ウ" sebagai SATU baris/item, bukan tiga. ア/イ/ウ individual
  // masih null sampai audio katakana lengkap dibuat (sama seperti sisa
  // 41 hiragana lain yang belum ada audionya).
  { text: "ア、イ、ウ", label: "ア、イ、ウ (gabungan)", storagePath: "katakana/aiu-combined.wav", dbTarget: null },
];

async function objectExists(supabaseAdmin: SupabaseClient, path: string): Promise<boolean> {
  const dir = path.split("/").slice(0, -1).join("/");
  const filename = path.split("/").pop()!;
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(dir, { search: filename });
  if (error) return false;
  return (data ?? []).some((f) => f.name === filename);
}

async function ensureBucket(supabaseAdmin: SupabaseClient) {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw new Error(`Gagal membaca daftar bucket storage: ${listError.message}`);
  if (buckets?.find((b) => b.name === BUCKET)) return;
  const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  if (createError) throw new Error(`Gagal membuat bucket "${BUCKET}": ${createError.message}`);
  console.log(`Bucket "${BUCKET}" dibuat (public=true).`);
}

function requireEnv(name: string, hint: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} tidak ditemukan di .env.local. ${hint}`);
  return value;
}

async function main() {
  const speakerId = resolveSpeakerId();
  await printSpeakerList();
  console.log(`Memakai speaker ID: ${speakerId}\n`);

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "Ini seharusnya sudah ada — cek kembali .env.local.");
  const serviceRoleKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "Diperlukan untuk upload ke Storage. Ambil dari Supabase Dashboard → Project Settings → API → service_role key.",
  );
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
  const { db, close } = createSeedClient();

  try {
    await ensureBucket(supabaseAdmin);

    const items = [...GROUP_A_KANA_ITEMS, ...GROUP_A_WORD_ITEMS, ...M01_ITEMS];
    console.log(`Target: ${items.length} file (${GROUP_A_KANA_ITEMS.length + GROUP_A_WORD_ITEMS.length} regenerate Grup A + ${M01_ITEMS.length} baru M01).\n`);

    const results: { label: string; url: string; skipped: boolean }[] = [];

    for (const item of items) {
      const alreadyExists = await objectExists(supabaseAdmin, item.storagePath);
      if (alreadyExists && !FORCE) {
        const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(item.storagePath);
        console.log(`⏭  ${item.label} — sudah ada di ${item.storagePath}, dilewati (pakai --force untuk menimpa).`);
        results.push({ label: item.label, url: data.publicUrl, skipped: true });
        continue;
      }

      console.log(`🎙  Sintesis "${item.label}"...`);
      const wav = await synthesize(item.text, speakerId);

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(item.storagePath, wav, { contentType: "audio/wav", upsert: true });
      if (uploadError) throw new Error(`Gagal upload "${item.storagePath}": ${uploadError.message}`);

      const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(item.storagePath);
      const audioUrl = publicUrlData.publicUrl;

      if (item.dbTarget?.table === "kana_characters") {
        await db
          .update(kanaCharacters)
          .set({ audioUrl })
          .where(eq(kanaCharacters.character, item.dbTarget.character));
      } else if (item.dbTarget?.table === "kana_example_words") {
        await db
          .update(kanaExampleWords)
          .set({ audioUrl })
          .where(eq(kanaExampleWords.wordKana, item.dbTarget.wordKana));
      }

      console.log(`✅ ${item.label} → ${audioUrl}`);
      results.push({ label: item.label, url: audioUrl, skipped: false });
    }

    console.log(`\n=== Ringkasan (${results.length} item) ===`);
    for (const r of results) {
      console.log(`${r.skipped ? "[sudah ada]" : "[baru]     "} ${r.label.padEnd(38, " ")} ${r.url}`);
    }
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("generate-audio-voicevox gagal:", error.message ?? error);
  process.exit(1);
});
