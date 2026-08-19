import { getLessonBundle } from "@/app/lib/lesson-query";

// Temporary verification page for Bagian B (Fase 5) — dumps the raw
// getLessonBundle("M02", "P2", "L01") result so it can be sanity-checked
// through a real authenticated session (RLS requires `authenticated`,
// so this can't be verified from an anonymous script). Superseded by
// the real lesson page in Bagian C.
export const dynamic = "force-dynamic";

export default async function DevLessonBundlePage() {
  const bundle = await getLessonBundle("M02", "P2", "L01");

  return (
    <div style={{ padding: 24, fontFamily: "monospace", fontSize: 12 }}>
      <h1 style={{ fontSize: 18 }}>/dev/lesson-bundle — getLessonBundle(&quot;M02&quot;, &quot;P2&quot;, &quot;L01&quot;)</h1>
      {!bundle ? (
        <p style={{ color: "#c00" }}>null — lesson tidak ditemukan.</p>
      ) : (
        <>
          <p>
            kana: {bundle.kana.length} · words: {bundle.words.length} · chartCharacters: {bundle.chartCharacters.length} ·{" "}
            kana dengan strokeData terisi: {bundle.kana.filter((k) => k.strokeData != null).length}/{bundle.kana.length}
          </p>
          <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 8, overflowX: "auto" }}>
            {JSON.stringify(
              bundle,
              (key, value) =>
                key === "strokeData" && value ? `[loaded — ${value.strokes.length} strokes]` : value,
              2,
            )}
          </pre>
        </>
      )}
    </div>
  );
}
