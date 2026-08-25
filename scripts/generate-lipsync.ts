import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { eq, and, isNotNull, isNull, sql } from "drizzle-orm";
import { config as loadEnv } from "dotenv";
import OpenAI from "openai";
import { createSeedClient } from "../db/seed-client";
import { senseiSegments } from "../db/schema/sensei";

loadEnv({ path: ".env.local" });
const execFileAsync = promisify(execFile);

// PROMPT-11 Bagian 4 — lip sync foundation. Generates a Rhubarb Lip
// Sync mouth-cue schedule PER SEGMENT from its existing narrationText,
// stored in sensei_segments.lip_sync_data. Deliberately run on a small
// --limit by default, not the whole table — the work order asks to
// prove the pipeline works, not roll it out at scale before mouth-shape
// ART exists to actually use the data (see components/sensei/
// SenseiLayeredCharacter.tsx's silent fallback when that art is absent).
//
// Two non-obvious fixes baked in here, found while building this:
// 1. Rhubarb only reads .wav/.ogg, not .mp3 — but re-synthesizing as
//    WAV (same text, one extra OpenAI call) is simpler than installing
//    an MP3 decoder/ffmpeg just for this. The WAV is temporary, deleted
//    after Rhubarb runs; the segment's actual PLAYED audio stays the
//    existing MP3 (narrationUrl untouched).
// 2. OpenAI's response_format:"wav" streams the file and never patches
//    the RIFF/data chunk SIZE fields (both come back as 0xFFFFFFFF,
//    the standard "unknown length" streaming placeholder) — Rhubarb's
//    strict WAV parser reads that as a 0-byte, 0-duration file and
//    silently produces an empty cue list. Fixed by rewriting those two
//    4-byte fields to the real byte counts before handing the file to
//    Rhubarb (patchWavHeader below).
const RHUBARB_BIN = path.join(process.cwd(), "tools", "Rhubarb-Lip-Sync-1.14.0-Windows", "rhubarb.exe");

function patchWavHeader(buf: Buffer): Buffer {
  const patched = Buffer.from(buf);
  patched.writeUInt32LE(patched.length - 8, 4); // RIFF chunk size
  patched.writeUInt32LE(patched.length - 44, 40); // data chunk size (standard 44-byte header)
  return patched;
}

type MouthCue = { start: number; end: number; value: string };
type RhubarbOutput = { metadata: { duration: number }; mouthCues: MouthCue[] };

async function runRhubarb(wavPath: string, jsonPath: string): Promise<RhubarbOutput> {
  await execFileAsync(RHUBARB_BIN, ["-r", "phonetic", "-f", "json", "-o", jsonPath, wavPath], { timeout: 60_000 });
  const raw = await fs.readFile(jsonPath, "utf8");
  return JSON.parse(raw) as RhubarbOutput;
}

function requireEnv(name: string, hint: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} tidak ditemukan di .env.local. ${hint}`);
  return value;
}

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
  const force = process.argv.includes("--force");

  try {
    await fs.access(RHUBARB_BIN);
  } catch {
    throw new Error(`Rhubarb tidak ditemukan di ${RHUBARB_BIN}. Unduh dari GitHub releases DanielSWolf/rhubarb-lip-sync dan ekstrak ke tools/.`);
  }

  const openaiApiKey = requireEnv("OPENAI_API_KEY", "Cek .env.local.");
  const openai = new OpenAI({ apiKey: openaiApiKey });
  const { db, close } = createSeedClient();

  const tmpDir = path.join(process.cwd(), "scripts", "tmp");
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    const rows = await db
      .select({ id: senseiSegments.id, narrationText: senseiSegments.narrationText })
      .from(senseiSegments)
      .where(
        force
          ? isNotNull(senseiSegments.narrationText)
          : and(isNotNull(senseiSegments.narrationText), isNull(senseiSegments.lipSyncData)),
      )
      .limit(limit);

    console.log(`Menghasilkan lip sync untuk ${rows.length} segmen (--limit=${limit}${force ? ", --force" : ""}).\n`);

    let ok = 0;
    let failed = 0;

    for (const row of rows) {
      if (!row.narrationText) continue;
      const wavPath = path.join(tmpDir, `lipsync-${row.id}.wav`);
      const jsonPath = path.join(tmpDir, `lipsync-${row.id}.json`);
      try {
        console.log(`🗣  #${row.id}: "${row.narrationText.slice(0, 50)}${row.narrationText.length > 50 ? "…" : ""}"`);
        const speech = await openai.audio.speech.create({
          model: "gpt-4o-mini-tts",
          voice: "marin",
          input: row.narrationText,
          response_format: "wav",
        });
        const rawWav = Buffer.from(await speech.arrayBuffer());
        await fs.writeFile(wavPath, patchWavHeader(rawWav));

        const result = await runRhubarb(wavPath, jsonPath);
        await db
          .update(senseiSegments)
          .set({ lipSyncData: { mouthCues: result.mouthCues, durationSeconds: result.metadata.duration } })
          .where(eq(senseiSegments.id, row.id));

        console.log(`✅ #${row.id}: ${result.mouthCues.length} mouth cues, ${result.metadata.duration.toFixed(2)}s`);
        ok++;
      } catch (err) {
        failed++;
        console.warn(`❌ #${row.id} gagal: ${(err as Error).message}`);
      } finally {
        await fs.rm(wavPath, { force: true });
        await fs.rm(jsonPath, { force: true });
      }
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(senseiSegments)
      .where(isNotNull(senseiSegments.lipSyncData));
    console.log(`\nSelesai. ${ok} berhasil, ${failed} gagal. Total segmen dengan lip_sync_data terisi sekarang: ${count}.`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("generate-lipsync gagal:", error);
  process.exit(1);
});
