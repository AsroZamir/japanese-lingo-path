import { createClient } from "@/lib/supabase/server";
import type { SenseiLipSyncData } from "@/app/lib/sensei-query";
import { LipSyncDemoPlayer } from "./LipSyncDemoPlayer";

// PROMPT-11 Bagian 4 point 3 — "uji dengan bentuk sementara sederhana
// (misalnya bentuk geometris) untuk membuktikan waktunya tepat." This
// page is that proof: real narration audio, real Rhubarb-generated
// mouth-cue data from sensei_segments.lip_sync_data, driving a plain
// colored shape (not real mouth art — none exists yet) that changes
// openness live as the audio plays. Same /pengaturan/* pattern as
// /pengaturan/suara and /pengaturan/narasi (outside /dev/*, which is
// blocked in production; not in the nav; still requires login).
export const dynamic = "force-dynamic";

export default async function LipSyncDemoPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("sensei_segments")
    .select("id, narration_text, narration_url, lip_sync_data")
    .not("lip_sync_data", "is", null)
    .limit(5);

  return (
    <div style={{ padding: "24px", fontFamily: "monospace", fontSize: "13px", maxWidth: "760px" }}>
      <h1 style={{ fontSize: "18px", marginBottom: "8px" }}>Demo fondasi lip sync</h1>
      <p style={{ marginBottom: "16px", maxWidth: "640px" }}>
        Bentuk oranye di bawah adalah <strong>placeholder geometris sementara</strong> — bukan aset mulut
        sungguhan (belum ada). Tingginya berubah mengikuti jadwal bentuk mulut asli dari Rhubarb Lip Sync,
        disinkronkan langsung ke pemutaran audio narasi asli. Ini membuktikan jalur waktunya benar; begitu
        ada aset ilustrasi mulut, ganti bentuk ini tanpa mengubah logika pewaktuannya sama sekali.
      </p>
      {error && <p style={{ color: "#c00" }}>{error.message}</p>}
      {(!rows || rows.length === 0) && !error && (
        <p style={{ color: "#c00" }}>
          Belum ada segmen dengan lip_sync_data. Jalankan <code>npm run generate:lipsync</code> dulu
          (VOICEVOX tidak diperlukan untuk ini, tapi butuh OPENAI_API_KEY dan Rhubarb di tools/).
        </p>
      )}
      {rows?.map((row) => (
        <LipSyncDemoPlayer
          key={row.id}
          id={row.id}
          text={row.narration_text ?? ""}
          audioUrl={row.narration_url}
          lipSyncData={row.lip_sync_data as SenseiLipSyncData | null}
        />
      ))}
    </div>
  );
}
