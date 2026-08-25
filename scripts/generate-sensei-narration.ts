import { eq, isNotNull, and, isNull } from "drizzle-orm";
import OpenAI from "openai";
import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSeedClient } from "../db/seed-client";
import { senseiSegments } from "../db/schema/sensei";

// PROMPT-9 Bagian 2 — narration for the Sensei Engine. Same TTS choice
// and voice-tuning approach as scripts/generate-narration.ts (M01),
// reused deliberately rather than reinvented — this repo already
// established gpt-4o-mini-tts + "instructions" as the right model for
// tone control, and a calm-teacher voice already exists for exactly
// this kind of explanatory narration. Files go to Supabase Storage
// (bucket "audio", same as M01) — NEVER into the git repo (Bagian 2
// aturan berat butir 4: 67 modules worth of narration would bloat the
// repo permanently).
const MODEL = "gpt-4o-mini-tts" as const;
const VOICE = "marin" as const;
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
      .select({ id: senseiSegments.id, narrationText: senseiSegments.narrationText, narrationUrl: senseiSegments.narrationUrl })
      .from(senseiSegments)
      .where(
        FORCE
          ? isNotNull(senseiSegments.narrationText)
          : and(isNotNull(senseiSegments.narrationText), isNull(senseiSegments.narrationUrl)),
      );

    console.log(`Segmen dengan narration_text yang perlu audio: ${rows.length}.`);

    let generated = 0;
    let failed = 0;
    let totalBytes = 0;
    let totalChars = 0;

    for (const row of rows) {
      if (!row.narrationText) continue;
      const storagePath = `narration/sensei-${row.id}.mp3`;
      console.log(`🎙  Segmen #${row.id}: "${row.narrationText.slice(0, 60)}${row.narrationText.length > 60 ? "…" : ""}"`);

      try {
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
        if (uploadError) throw new Error(uploadError.message);

        const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
        await db.update(senseiSegments).set({ narrationUrl: publicUrlData.publicUrl }).where(eq(senseiSegments.id, row.id));

        totalBytes += buffer.byteLength;
        totalChars += row.narrationText.length;
        console.log(`✅ #${row.id} → ${publicUrlData.publicUrl} (${(buffer.byteLength / 1024).toFixed(0)} KB)`);
        generated++;
      } catch (error) {
        console.error(`❌ #${row.id} gagal:`, error instanceof Error ? error.message : error);
        failed++;
      }
    }

    // Rough size-per-minute estimate: OpenAI TTS reads roughly 14-15
    // Indonesian characters/second at this model's default pace (measured
    // informally against generate-narration.ts's own output for M01) —
    // used only to report an approximate KB/min figure, not to control
    // generation itself (the API doesn't expose a bitrate/mono parameter
    // directly; response_format="mp3" is its own fixed encoding).
    const estimatedMinutes = totalChars / 15 / 60;
    const kbPerMinute = estimatedMinutes > 0 ? totalBytes / 1024 / estimatedMinutes : 0;

    console.log(
      `\nSelesai. ${generated} audio baru dibuat, ${failed} gagal. Total ${(totalBytes / 1024 / 1024).toFixed(2)} MB ` +
        `untuk ~${estimatedMinutes.toFixed(1)} menit narasi (perkiraan) — sekitar ${kbPerMinute.toFixed(0)} KB/menit.`,
    );
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("generate-sensei-narration gagal:", error);
  process.exit(1);
});
