import * as wanakana from "wanakana";
import { eq, isNull } from "drizzle-orm";
import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSeedClient } from "../db/seed-client";
import { kanaCharacters, kanaExampleWords } from "../db/schema/kana";

// Sibling to generate-audio-voicevox.ts, same VOICEVOX synth pattern, tetapi
// DATA-DRIVEN (query audio_url IS NULL) alih-alih hardcode per-item — dipakai
// untuk Grup B-J (36 karakter) + 53 kata contoh baru dari seed-hiragana-groups.ts,
// karena hardcode ~90 item satu-satu tidak praktis dan rawan salah ketik. Untuk
// M01's 10 item non-kana (frasa/kalimat/kanji), tetap pakai generate-audio-voicevox.ts
// aslinya karena item itu tidak punya baris kana_characters/kana_example_words.
//
// Script-agnostic sejak M03: hiragana dan katakana punya romaji yang
// sering identik (あい/アイ keduanya "ai", か/カ keduanya "ka") — slug
// filename SAJA akan bertabrakan across scripts. Path hiragana yang
// sudah ada (kana/${slug}.wav, words/${slug}.wav, dari sebelum M03)
// dibiarkan tidak berprefix supaya tidak perlu upload ulang/redirect
// referensi lama; katakana baru dapat prefix "katakana-" di nama file.

const VOICEVOX_BASE_URL = process.env.VOICEVOX_BASE_URL ?? "http://localhost:50021";
const BUCKET = "audio";
const FORCE = process.argv.includes("--force");

const DEFAULT_SPEAKER_ID = 2; // 四国めたん (Shikoku Metan) — ノーマル, sama seperti Grup A

function resolveSpeakerId(): number {
  const argMatch = process.argv.find((a) => a.startsWith("--speaker="));
  if (argMatch) return Number(argMatch.split("=")[1]);
  if (process.env.VOICEVOX_SPEAKER_ID) return Number(process.env.VOICEVOX_SPEAKER_ID);
  return DEFAULT_SPEAKER_ID;
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

function toSlug(text: string, script: "hiragana" | "katakana"): string {
  // っ/ッ sendirian tidak punya romaji (glottal stop, bukan mora yang
  // bisa dibaca lepas) — wanakana.toRomaji mengembalikan "", yang akan
  // menghasilkan nama file kosong ("kana/.wav"). Fallback manual untuk
  // kasus ini saja; karakter lain semuanya diturunkan lewat wanakana.
  if (text === "っ" || text === "ッ") return script === "katakana" ? "katakana-sokuon" : "sokuon";
  if (text === "ー") return "katakana-chouonpu";
  const slug = wanakana.toRomaji(text).toLowerCase().replace(/[^a-z]/g, "");
  if (!slug) throw new Error(`toSlug("${text}") menghasilkan slug kosong — perlu fallback manual seperti "っ".`);
  return script === "katakana" ? `katakana-${slug}` : slug;
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
  console.log(`Memakai speaker ID: ${speakerId} (VOICEVOX di ${VOICEVOX_BASE_URL})\n`);

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "Ini seharusnya sudah ada — cek kembali .env.local.");
  const serviceRoleKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "Diperlukan untuk upload ke Storage. Ambil dari Supabase Dashboard → Project Settings → API → service_role key.",
  );
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
  const { db, close } = createSeedClient();

  try {
    await ensureBucket(supabaseAdmin);

    const kanaRows = FORCE
      ? await db.select().from(kanaCharacters)
      : await db.select().from(kanaCharacters).where(isNull(kanaCharacters.audioUrl));

    const wordRows = FORCE
      ? await db.select().from(kanaExampleWords)
      : await db.select().from(kanaExampleWords).where(isNull(kanaExampleWords.audioUrl));

    console.log(`Target: ${kanaRows.length} karakter kana + ${wordRows.length} kata contoh yang belum punya audio_url.\n`);

    let generated = 0;

    for (const row of kanaRows) {
      const storagePath = `kana/${toSlug(row.character, row.script)}.wav`;
      console.log(`🎙  Sintesis karakter "${row.character}" (${row.romaji})...`);
      const wav = await synthesize(row.character, speakerId);

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, wav, { contentType: "audio/wav", upsert: true });
      if (uploadError) throw new Error(`Gagal upload "${storagePath}": ${uploadError.message}`);

      const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
      await db.update(kanaCharacters).set({ audioUrl: publicUrlData.publicUrl }).where(eq(kanaCharacters.id, row.id));

      console.log(`✅ ${row.character} → ${publicUrlData.publicUrl}`);
      generated++;
    }

    for (const row of wordRows) {
      const storagePath = `words/${toSlug(row.wordKana, row.script)}.wav`;
      console.log(`🎙  Sintesis kata "${row.wordKana}" (${row.meaningId})...`);
      const wav = await synthesize(row.wordKana, speakerId);

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, wav, { contentType: "audio/wav", upsert: true });
      if (uploadError) throw new Error(`Gagal upload "${storagePath}": ${uploadError.message}`);

      const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
      await db.update(kanaExampleWords).set({ audioUrl: publicUrlData.publicUrl }).where(eq(kanaExampleWords.id, row.id));

      console.log(`✅ ${row.wordKana} → ${publicUrlData.publicUrl}`);
      generated++;
    }

    console.log(`\nSelesai. ${generated} audio dibuat/diperbarui.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("generate-audio-remaining-kana gagal:", error.message ?? error);
  process.exit(1);
});
