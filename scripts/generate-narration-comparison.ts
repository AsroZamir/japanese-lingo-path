import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import OpenAI from "openai";
import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });

// PROMPT-11 Bagian 2 — comparison samples so the owner can pick an
// `instructions` variant BY EAR before anything gets regenerated at
// scale. IMPORTANT correction to the work order's own premise: the
// `instructions` parameter was NOT missing — scripts/generate-narration.ts
// (M01) and generate-sensei-narration.ts (Mesin Sensei) have both used
// it since PROMPT-3/PROMPT-9. What's being tested here is whether a
// MORE DETAILED instruction (explicit audience + emotional intent, per
// this work order's own suggested starting point) sounds better than
// the current one — not "on vs off".
const MODEL = "gpt-4o-mini-tts" as const;
const VOICE = "marin" as const; // per CLAUDE.md, already the OpenAI-recommended voice — not being re-tested here
const BUCKET = "audio";

// Same representative Indonesian paragraph, read once per variant so the
// only thing that changes is the instruction.
const SAMPLE_TEXT =
  "Kabar baiknya, kamu sudah tahu setengah dari bunyinya. Vokal bahasa Jepang — a, i, u, e, o — sama persis dengan vokal bahasa Indonesia. Bukan mirip, tapi benar-benar sama.";

const VARIANTS: { id: string; label: string; instructions: string }[] = [
  {
    id: "current",
    label: "Sekarang dipakai (baseline)",
    instructions:
      "You are narrating explanatory commentary in Indonesian for a Japanese-language lesson slide, read by a patient, " +
      "calm teacher — NOT cheerful, NOT energetic, NOT a cheerleader. Warm but measured, like someone explaining a concept " +
      "quietly to one student sitting next to them. Moderate pace, natural pauses at commas and sentence breaks. Do not " +
      "add commentary beyond the given text, do not repeat it, do not add greetings or sign-offs.",
  },
  {
    id: "worksheet",
    label: "Sesuai contoh di prompt (empat komponen eksplisit)",
    instructions:
      "You are a warm, patient Indonesian language teacher speaking to an adult beginner who is nervous about learning " +
      "Japanese. Speak naturally and conversationally, as if sitting across a table — not reading from a script. Use " +
      "natural pauses between ideas. Slightly slower than normal conversation, but never robotic or over-enunciated. " +
      "Sound encouraging and genuinely interested, never sing-song or overly cheerful. When mentioning Japanese words, " +
      "pronounce them clearly and slow down slightly.",
  },
  {
    id: "conversational",
    label: "Lebih santai, seperti ngobrol berdua",
    instructions:
      "You're a friendly, down-to-earth Indonesian tutor chatting one-on-one with a nervous adult beginner, like over " +
      "coffee. Talk like a real person having a relaxed conversation, not narrating a textbook — include natural " +
      "breathing pauses, slight variation in pace, occasional gentle emphasis on key words. Sound genuinely warm and " +
      "a little playful, but never sing-song or performative. Slow down and articulate clearly whenever a Japanese " +
      "word comes up.",
  },
  {
    id: "deliberate",
    label: "Lebih pelan dan mantap, seperti mentor sabar",
    instructions:
      "You are a calm, reassuring mentor gently walking a nervous beginner through a new idea, one small step at a " +
      "time. Your pacing is unhurried and deliberate, with a clear pause after each idea so it has room to sink in — " +
      "think of a patient tutor who never rushes the room. Voice stays low-key and grounded, never performative or " +
      "sing-song. Slow down noticeably and enunciate whenever a Japanese word appears.",
  },
];

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
  const openaiApiKey = requireEnv("OPENAI_API_KEY", "Isi dengan API key dari platform.openai.com/api-keys.");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "Cek .env.local.");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", "Diperlukan untuk upload ke Storage.");

  const openai = new OpenAI({ apiKey: openaiApiKey });
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
  await ensureBucket(supabaseAdmin);

  const manifest: { id: string; label: string; url: string; sizeKb: number }[] = [];

  for (const variant of VARIANTS) {
    console.log(`🎙  ${variant.id} — "${variant.label}"`);
    const speech = await openai.audio.speech.create({
      model: MODEL,
      voice: VOICE,
      input: SAMPLE_TEXT,
      instructions: variant.instructions,
      response_format: "mp3",
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    const storagePath = `narration-comparison/${variant.id}.mp3`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: "audio/mpeg", upsert: true });
    if (uploadError) throw new Error(`Gagal upload "${storagePath}": ${uploadError.message}`);
    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
    manifest.push({ id: variant.id, label: variant.label, url: publicUrlData.publicUrl, sizeKb: Math.round(buffer.byteLength / 1024) });
    console.log(`✅ ${variant.id} → ${publicUrlData.publicUrl} (${Math.round(buffer.byteLength / 1024)} KB)`);
  }

  const manifestPath = path.join(process.cwd(), "public", "narasi-comparison-manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify({ sampleText: SAMPLE_TEXT, variants: manifest }, null, 2));
  console.log(`\nManifest ditulis ke ${manifestPath}. Buka /pengaturan/narasi untuk mendengarkan.`);
}

main().catch((error) => {
  console.error("generate-narration-comparison gagal:", error);
  process.exit(1);
});
