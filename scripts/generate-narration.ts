import { eq, isNotNull } from "drizzle-orm";
import OpenAI from "openai";
import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSeedClient } from "../db/seed-client";
import { lessonContentBlocks } from "../db/schema/kana";

// Bagian 3 — Indonesian explanatory narration for M01 slides. Model
// choice mirrors generate-kana-audio.ts's own research (checked against
// platform.openai.com/docs/guides/text-to-speech at the time of writing,
// not from memory): gpt-4o-mini-tts is the only current OpenAI TTS model
// with an `instructions` parameter for tone control — tts-1/tts-1-hd
// don't have it. Voice is deliberately DIFFERENT from the kana-audio
// script's "coral" (used for isolated Japanese sound pronunciation) —
// this is a distinct calm-explainer voice, not the same character.
const MODEL = "gpt-4o-mini-tts" as const;
const VOICE = "marin" as const; // per OpenAI's own docs, recommended alongside "cedar" for best quality on this model
const BUCKET = "audio";
const FORCE = process.argv.includes("--force");

const INSTRUCTIONS =
  "You are narrating explanatory commentary in Indonesian for a Japanese-language lesson slide, read by a patient, " +
  "calm teacher — NOT cheerful, NOT energetic, NOT a cheerleader. Warm but measured, like someone explaining a concept " +
  "quietly to one student sitting next to them. Moderate pace, natural pauses at commas and sentence breaks. Do not " +
  "add commentary beyond the given text, do not repeat it, do not add greetings or sign-offs.";

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
  const openaiApiKey = requireEnv("OPENAI_API_KEY", "Isi dengan API key dari platform.openai.com/api-keys.");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "Ini seharusnya sudah ada — cek kembali .env.local.");
  const serviceRoleKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "Diperlukan untuk mengunggah file audio ke Storage. Ambil dari Supabase Dashboard → Project Settings → API → service_role key.",
  );

  const openai = new OpenAI({ apiKey: openaiApiKey });
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
  const { db, close } = createSeedClient();

  try {
    await ensureBucket(supabaseAdmin);

    const rows = await db
      .select({ id: lessonContentBlocks.id, narrationText: lessonContentBlocks.narrationText, narrationUrl: lessonContentBlocks.narrationUrl })
      .from(lessonContentBlocks)
      .where(isNotNull(lessonContentBlocks.narrationText));

    console.log(`Blok dengan narration_text: ${rows.length}.`);

    let generated = 0;
    let skipped = 0;

    for (const row of rows) {
      if (row.narrationUrl && !FORCE) {
        skipped++;
        continue;
      }
      if (!row.narrationText) continue; // narrows the type; already filtered by the query above

      const storagePath = `narration/block-${row.id}.mp3`;
      console.log(`🎙  Blok #${row.id}: "${row.narrationText.slice(0, 60)}${row.narrationText.length > 60 ? "…" : ""}"`);

      const speech = await openai.audio.speech.create({
        model: MODEL,
        voice: VOICE,
        input: row.narrationText,
        instructions: INSTRUCTIONS,
        response_format: "mp3",
      });
      const buffer = Buffer.from(await speech.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: "audio/mpeg", upsert: true });
      if (uploadError) throw new Error(`Gagal upload "${storagePath}": ${uploadError.message}`);

      const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
      await db.update(lessonContentBlocks).set({ narrationUrl: publicUrlData.publicUrl }).where(eq(lessonContentBlocks.id, row.id));

      console.log(`✅ #${row.id} → ${publicUrlData.publicUrl}`);
      generated++;
    }

    console.log(`\nSelesai. ${generated} audio baru dibuat, ${skipped} dilewati (sudah punya narration_url — pakai --force untuk generate ulang).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("generate-narration gagal:", error);
  process.exit(1);
});
