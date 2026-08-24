import fs from "node:fs/promises";
import path from "node:path";

// PROMPT-7 Bagian 2 — regenerasi sampel perbandingan suara untuk
// /dev/suara. VOICEVOX (localhost:50021) harus menyala saat script ini
// dijalankan. Kandidat dipilih dari daftar speaker yang benar-benar
// terpasang (dicek langsung lewat GET /speakers), bukan dari ingatan —
// versi VOICEVOX yang terpasang bisa berbeda-beda, dan speaker id yang
// sama bisa jadi karakter berbeda di instalasi lain. Kalau daftar
// kandidat di bawah tidak lagi cocok dengan hasil GET /speakers di
// komputer yang menjalankan ini, perbarui dulu sebelum generate ulang.
const VOICEVOX_BASE_URL = process.env.VOICEVOX_BASE_URL ?? "http://localhost:50021";
const OUT_DIR = path.join(process.cwd(), "public", "dev-suara");

const CANDIDATES = [
  { id: 30, speaker: "No.7", style: "アナウンス" },
  { id: 29, speaker: "No.7", style: "ノーマル" },
  { id: 11, speaker: "玄野武宏", style: "ノーマル" },
  { id: 13, speaker: "青山龍星", style: "ノーマル" },
  { id: 20, speaker: "もち子さん", style: "ノーマル" },
  { id: 74, speaker: "琴詠ニア", style: "ノーマル" },
  { id: 9, speaker: "波音リツ", style: "ノーマル" },
  { id: 99, speaker: "離途", style: "ノーマル" },
  { id: 108, speaker: "東北きりたん", style: "ノーマル" },
  { id: 21, speaker: "剣崎雌雄", style: "ノーマル" },
  { id: 8, speaker: "春日部つむぎ", style: "ノーマル" },
  { id: 100, speaker: "黒沢冴白", style: "ノーマル" },
];

const SAMPLES = [
  { key: "vowels", text: "あいうえお" },
  { key: "ka-row", text: "かきくけこ" },
  { key: "sentence", text: "わたしのなまえはアスロです" },
] as const;

async function synthesize(text: string, speakerId: number): Promise<Buffer> {
  const queryUrl = `${VOICEVOX_BASE_URL}/audio_query?${new URLSearchParams({ text, speaker: String(speakerId) })}`;
  const queryRes = await fetch(queryUrl, { method: "POST" });
  if (!queryRes.ok) {
    throw new Error(`audio_query gagal (speaker ${speakerId}, "${text}"): HTTP ${queryRes.status}`);
  }
  const audioQuery = await queryRes.json();

  const synthUrl = `${VOICEVOX_BASE_URL}/synthesis?${new URLSearchParams({ speaker: String(speakerId) })}`;
  const synthRes = await fetch(synthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(audioQuery),
  });
  if (!synthRes.ok) {
    throw new Error(`synthesis gagal (speaker ${speakerId}, "${text}"): HTTP ${synthRes.status}`);
  }
  return Buffer.from(await synthRes.arrayBuffer());
}

async function main() {
  try {
    const ping = await fetch(`${VOICEVOX_BASE_URL}/speakers`);
    if (!ping.ok) throw new Error(`HTTP ${ping.status}`);
  } catch (err) {
    throw new Error(
      `Tidak bisa terhubung ke VOICEVOX di ${VOICEVOX_BASE_URL}. Buka aplikasi VOICEVOX dulu. Detail: ${(err as Error).message}`,
    );
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const manifest: Array<(typeof CANDIDATES)[number] & { files: Record<string, string> }> = [];
  for (const candidate of CANDIDATES) {
    const files: Record<string, string> = {};
    for (const sample of SAMPLES) {
      const buf = await synthesize(sample.text, candidate.id);
      const filename = `${candidate.id}-${sample.key}.wav`;
      await fs.writeFile(path.join(OUT_DIR, filename), buf);
      files[sample.key] = filename;
      console.log("generated", filename, `(${buf.length} bytes)`);
    }
    manifest.push({ ...candidate, files });
  }

  await fs.writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nSelesai — ${manifest.length} kandidat, ${manifest.length * SAMPLES.length} file WAV di public/dev-suara/.`);
  console.log("Buka /dev/suara untuk membandingkan.");
}

main().catch((err) => {
  console.error("generate-voice-comparison-samples gagal:", err.message ?? err);
  process.exit(1);
});
