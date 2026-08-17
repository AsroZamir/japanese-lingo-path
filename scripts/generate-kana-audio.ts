import * as wanakana from "wanakana";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSeedClient } from "../db/seed-client";
import { kanaCharacters, kanaExampleWords } from "../db/schema/kana";

// Scope: HANYA Group A (Fase 5 vertical slice) — 5 kana あいうえお +
// 7 kata contoh yang sudah di-seed lewat seed-first-lesson.ts. Model:
// gpt-4o-mini-tts (satu-satunya model TTS OpenAI saat ini yang punya
// parameter `instructions` untuk kontrol pengucapan — dicek lewat
// dokumentasi resmi platform.openai.com/docs/guides/text-to-speech,
// bukan dari ingatan; tts-1/tts-1-hd tidak punya kontrol ini).
const MODEL = "gpt-4o-mini-tts" as const;
const VOICE = "coral" as const;
const BUCKET = "audio";
const FORCE = process.argv.includes("--force");

const GROUP_A_KANA = ["あ", "い", "う", "え", "お"] as const;
const GROUP_A_WORDS = ["あお", "いえ", "うえ", "あい", "あう", "いう", "いいえ"] as const;

// Vokal tunggal (huruf hiragana Group A semuanya vokal tunggal) rawan
// terpotong di awal/akhir oleh TTS karena tidak ada konsonan pembuka
// yang memberi "ancang-ancang". Override ini TIDAK mengubah bunyi yang
// diucapkan — hanya menambah jeda kosong (…) sebelum dan tanda henti
// (。) sesudah karakter, supaya proses generate tidak memotong suara
// aslinya. Kata (2+ mora) tidak butuh ini, jadi tabelnya kosong untuk
// GROUP_A_WORDS dan fallback ke teks kata itu sendiri.
const PRONUNCIATION_OVERRIDES: Record<string, string> = {
  あ: "…あ。",
  い: "…い。",
  う: "…う。",
  え: "…え。",
  お: "…お。",
};

const INSTRUCTIONS =
  "You are pronouncing a single Japanese hiragana character or word in isolation, for a language-learning flashcard app. " +
  "Speak it clearly, slowly, and naturally, as an isolated native Japanese pronunciation — not as part of a sentence. " +
  "Leave a brief natural silence before and after the sound. Do not say anything else, do not add commentary, do not repeat it.";

type AudioTarget = {
  kind: "kana" | "word";
  id: number;
  displayText: string; // karakter/kata asli, ditampilkan di log dan dipakai sbg fallback teks TTS
  romajiSlug: string; // nama file, selalu diturunkan lewat wanakana — tidak pernah diketik manual
  existingAudioUrl: string | null;
};

function requireEnv(name: string, hint: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} tidak ditemukan di .env.local. ${hint}`);
  }
  return value;
}

function toSlug(displayText: string): string {
  // wanakana.toRomaji tidak menjamin hasil aman-untuk-nama-file secara
  // umum, tapi untuk domain terbatas kita (hiragana Group A + kata yang
  // seluruhnya tersusun dari kana itu) hasilnya selalu huruf latin
  // polos — cukup dirapikan ke lowercase tanpa spasi.
  return wanakana.toRomaji(displayText).toLowerCase().replace(/[^a-z]/g, "");
}

async function ensureBucket(supabaseAdmin: SupabaseClient) {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw new Error(`Gagal membaca daftar bucket storage: ${listError.message}`);

  const existing = buckets?.find((b) => b.name === BUCKET);
  if (existing) {
    console.log(`Bucket "${BUCKET}" sudah ada (public=${existing.public}).`);
    return;
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  if (createError) throw new Error(`Gagal membuat bucket "${BUCKET}": ${createError.message}`);
  console.log(`Bucket "${BUCKET}" dibuat (public=true).`);
}

async function main() {
  const openaiApiKey = requireEnv(
    "OPENAI_API_KEY",
    "Isi dengan API key dari platform.openai.com/api-keys.",
  );
  const supabaseUrl = requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    "Ini seharusnya sudah ada — cek kembali .env.local.",
  );
  const serviceRoleKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "Diperlukan untuk membuat bucket Storage dan mengunggah file audio (bukan operasi yang bisa dilakukan lewat SQL biasa). Ambil dari Supabase Dashboard → Project Settings → API → service_role key. JANGAN pernah pakai prefix NEXT_PUBLIC_ untuk key ini, dan pastikan .env.local tetap ada di .gitignore.",
  );

  const openai = new OpenAI({ apiKey: openaiApiKey });
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
  const { db, close } = createSeedClient();

  try {
    await ensureBucket(supabaseAdmin);

    const kanaRows = await db
      .select({ id: kanaCharacters.id, character: kanaCharacters.character, audioUrl: kanaCharacters.audioUrl })
      .from(kanaCharacters);
    const kanaByChar = new Map(kanaRows.map((r) => [r.character, r]));

    const wordRows = await db
      .select({ id: kanaExampleWords.id, wordKana: kanaExampleWords.wordKana, audioUrl: kanaExampleWords.audioUrl })
      .from(kanaExampleWords);
    const wordByKana = new Map(wordRows.map((r) => [r.wordKana, r]));

    const targets: AudioTarget[] = [];

    for (const char of GROUP_A_KANA) {
      const row = kanaByChar.get(char);
      if (!row) {
        throw new Error(
          `Kana "${char}" tidak ditemukan di kana_characters. Pastikan seed:kana sudah dijalankan (Fase 3).`,
        );
      }
      targets.push({ kind: "kana", id: row.id, displayText: char, romajiSlug: toSlug(char), existingAudioUrl: row.audioUrl });
    }

    for (const wordKana of GROUP_A_WORDS) {
      const row = wordByKana.get(wordKana);
      if (!row) {
        throw new Error(
          `Kata "${wordKana}" tidak ditemukan di kana_example_words. Pastikan seed:first-lesson (Fase 5 Bagian A) sudah dijalankan.`,
        );
      }
      targets.push({ kind: "word", id: row.id, displayText: wordKana, romajiSlug: toSlug(wordKana), existingAudioUrl: row.audioUrl });
    }

    console.log(`Target: ${targets.length} item (${GROUP_A_KANA.length} kana + ${GROUP_A_WORDS.length} kata).`);

    const results: { displayText: string; url: string; skipped: boolean }[] = [];

    for (const target of targets) {
      const storagePath = `${target.kind === "kana" ? "kana" : "words"}/${target.romajiSlug}.mp3`;

      if (target.existingAudioUrl && !FORCE) {
        console.log(`⏭  ${target.displayText} — sudah punya audio_url, dilewati (pakai --force untuk generate ulang).`);
        results.push({ displayText: target.displayText, url: target.existingAudioUrl, skipped: true });
        continue;
      }

      const ttsInput = PRONUNCIATION_OVERRIDES[target.displayText] ?? target.displayText;
      console.log(`🎙  Generate audio untuk "${target.displayText}" (teks dikirim ke API: "${ttsInput}")...`);

      const speech = await openai.audio.speech.create({
        model: MODEL,
        voice: VOICE,
        input: ttsInput,
        instructions: INSTRUCTIONS,
        response_format: "mp3",
      });
      const buffer = Buffer.from(await speech.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: "audio/mpeg", upsert: true });
      if (uploadError) {
        throw new Error(`Gagal upload "${storagePath}" ke Storage: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
      const audioUrl = publicUrlData.publicUrl;

      if (target.kind === "kana") {
        await db.update(kanaCharacters).set({ audioUrl }).where(eq(kanaCharacters.id, target.id));
      } else {
        await db.update(kanaExampleWords).set({ audioUrl }).where(eq(kanaExampleWords.id, target.id));
      }

      console.log(`✅ ${target.displayText} → ${audioUrl}`);
      results.push({ displayText: target.displayText, url: audioUrl, skipped: false });
    }

    console.log("\n=== Ringkasan (12 item Group A) ===");
    for (const r of results) {
      console.log(`${r.skipped ? "[sudah ada]" : "[baru]     "} ${r.displayText.padEnd(6, " ")} ${r.url}`);
    }
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("generate-kana-audio gagal:", error);
  process.exit(1);
});
