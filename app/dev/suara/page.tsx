import fs from "node:fs/promises";
import path from "node:path";

// PROMPT-7 Bagian 2 — halaman internal (tidak ada di navigasi) untuk
// membandingkan kandidat suara VOICEVOX pengganti 四国めたん id=2 (yang
// pemilik nilai terlalu bergaya anime). Sampel dihasilkan lewat
// `npm run generate:voice-samples` (scripts/generate-voice-comparison-
// samples.ts, VOICEVOX harus menyala saat itu) dan file WAV-nya disimpan
// statis di public/dev-suara/ supaya halaman ini tetap jalan tanpa
// VOICEVOX menyala setiap saat. Tidak mengganti suara produksi — pemilik
// yang memilih pakai telinganya sendiri, lihat CLAUDE.md untuk cara
// pindah setelah memilih.
export const dynamic = "force-dynamic";

type ManifestEntry = {
  id: number;
  speaker: string;
  style: string;
  files: { vowels: string; "ka-row": string; sentence: string };
};

export default async function DevSuaraPage() {
  const manifestPath = path.join(process.cwd(), "public", "dev-suara", "manifest.json");
  let candidates: ManifestEntry[] = [];
  let error: string | null = null;
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    candidates = JSON.parse(raw);
  } catch {
    error = "manifest.json tidak ditemukan di public/dev-suara/ — jalankan scripts/tmp/gen-voice-samples.mjs dengan VOICEVOX menyala dulu.";
  }

  return (
    <div style={{ padding: "24px", fontFamily: "monospace", fontSize: "13px", maxWidth: "900px" }}>
      <h1 style={{ fontSize: "18px", marginBottom: "8px" }}>/dev/suara — perbandingan kandidat suara VOICEVOX</h1>
      <p style={{ marginBottom: "16px", maxWidth: "700px" }}>
        Suara sekarang di produksi: <strong>四国めたん (Shikoku Metan) — ノーマル, speaker id 2</strong> — dinilai
        terlalu bergaya anime. {candidates.length} kandidat di bawah dipilih dari daftar lengkap speaker yang
        benar-benar terpasang (dicek langsung, bukan tebakan), diprioritaskan yang namanya menyiratkan gaya netral
        (pembaca berita, dewasa, bukan maskot). <strong>Dengarkan, lalu beri tahu speaker id mana yang dipilih.</strong>
      </p>
      {error && <p style={{ color: "#c00" }}>{error}</p>}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #333" }}>
            <th style={{ padding: "6px 10px" }}>ID</th>
            <th style={{ padding: "6px 10px" }}>Nama karakter · gaya</th>
            <th style={{ padding: "6px 10px" }}>あいうえお</th>
            <th style={{ padding: "6px 10px" }}>かきくけこ</th>
            <th style={{ padding: "6px 10px" }}>わたしのなまえはアスロです</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "8px 10px", fontWeight: 700 }}>{c.id}</td>
              <td style={{ padding: "8px 10px" }}>
                {c.speaker} · {c.style}
              </td>
              <td style={{ padding: "8px 10px" }}>
                <audio controls src={"/dev-suara/" + c.files.vowels} style={{ height: "28px" }}>
                  <track kind="captions" />
                </audio>
              </td>
              <td style={{ padding: "8px 10px" }}>
                <audio controls src={"/dev-suara/" + c.files["ka-row"]} style={{ height: "28px" }}>
                  <track kind="captions" />
                </audio>
              </td>
              <td style={{ padding: "8px 10px" }}>
                <audio controls src={"/dev-suara/" + c.files.sentence} style={{ height: "28px" }}>
                  <track kind="captions" />
                </audio>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
