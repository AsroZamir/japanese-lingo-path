import fs from "node:fs/promises";
import path from "node:path";

// PROMPT-11 Bagian 2 — halaman perbandingan arahan (`instructions`)
// narasi TTS, pola sama seperti /pengaturan/suara (di luar /dev/* yang
// diblokir di production, tidak ada di navigasi, tetap butuh login).
//
// Koreksi jujur atas asumsi pekerjaan ini: `instructions` BUKAN
// parameter yang belum pernah dipakai — scripts/generate-narration.ts
// dan generate-sensei-narration.ts sudah memakainya sejak sesi-sesi
// sebelumnya. Yang diuji di sini murni: apakah arahan yang LEBIH RINCI
// (empat komponen eksplisit sesuai contoh di prompt ini) terdengar lebih
// baik daripada arahan yang sudah ada. Belum ada narasi produksi yang
// diganti — pemilik memilih dulu di halaman ini.
export const dynamic = "force-dynamic";

type ManifestVariant = { id: string; label: string; url: string; sizeKb: number };
type Manifest = { sampleText: string; variants: ManifestVariant[] };

export default async function NarasiComparisonPage() {
  const manifestPath = path.join(process.cwd(), "public", "narasi-comparison-manifest.json");
  let manifest: Manifest | null = null;
  let error: string | null = null;
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    manifest = JSON.parse(raw);
  } catch {
    error =
      "narasi-comparison-manifest.json tidak ditemukan — jalankan `npm run generate:narration-comparison` " +
      "(perlu OPENAI_API_KEY dan SUPABASE_SERVICE_ROLE_KEY di .env.local).";
  }

  return (
    <div style={{ padding: "24px", fontFamily: "monospace", fontSize: "13px", maxWidth: "800px" }}>
      <h1 style={{ fontSize: "18px", marginBottom: "8px" }}>Perbandingan arahan narasi (instructions)</h1>
      <p style={{ marginBottom: "8px", maxWidth: "680px" }}>
        Suara: <strong>marin</strong> (sudah tepat, tidak diganti). Yang dibandingkan di sini hanya kalimat arahan
        gaya bicara (<code>instructions</code>) — naskah yang dibacakan sama persis untuk semua kandidat.
      </p>
      {manifest && (
        <p style={{ marginBottom: "16px", padding: "10px 14px", background: "#f6f6f0", borderRadius: "8px", maxWidth: "680px" }}>
          &ldquo;{manifest.sampleText}&rdquo;
        </p>
      )}
      {error && <p style={{ color: "#c00" }}>{error}</p>}
      {manifest && (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #333" }}>
              <th style={{ padding: "6px 10px" }}>Kandidat</th>
              <th style={{ padding: "6px 10px" }}>Putar</th>
              <th style={{ padding: "6px 10px" }}>Ukuran</th>
            </tr>
          </thead>
          <tbody>
            {manifest.variants.map((v) => (
              <tr key={v.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "10px", fontWeight: 700 }}>{v.label}</td>
                <td style={{ padding: "10px" }}>
                  <audio controls src={v.url} style={{ height: "32px", width: "260px" }}>
                    <track kind="captions" />
                  </audio>
                </td>
                <td style={{ padding: "10px", color: "#888" }}>{v.sizeKb} KB</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ marginTop: "20px", maxWidth: "680px" }}>
        <strong>Dengarkan, lalu beri tahu kandidat mana yang paling enak didengar</strong> — narasi produksi
        (M01 dan Mesin Sensei) belum diregenerasi dengan arahan baru sampai Anda memilih.
      </p>
    </div>
  );
}
