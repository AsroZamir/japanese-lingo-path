import { db } from "@/db/client";
import { kanaCharacters } from "@/db/schema/kana";

// Debug page reading live DB state — must never be statically prerendered
// (that would freeze the table at build time and also require DB access
// during `next build`, which shouldn't depend on a live connection).
export const dynamic = "force-dynamic";

export default async function DevKanaPage() {
  const rows = await db
    .select()
    .from(kanaCharacters)
    .orderBy(kanaCharacters.script, kanaCharacters.id);

  const missing = rows.filter((r) => r.strokeCount == null);

  return (
    <div style={{ padding: "24px", fontFamily: "monospace", fontSize: "13px" }}>
      <h1 style={{ fontSize: "18px", marginBottom: "8px" }}>/dev/kana — verifikasi data kana_characters</h1>
      <p style={{ marginBottom: "16px" }}>
        Total baris: <strong>{rows.length}</strong> · stroke_count kosong:{" "}
        <strong style={{ color: missing.length > 0 ? "#c00" : "#080" }}>{missing.length}</strong>
        {missing.length > 0 && (
          <>
            {" "}— {missing.map((r) => `${r.character} (${r.script})`).join(", ")}
          </>
        )}
      </p>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["script", "character", "romaji", "type", "group", "stroke_count"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "2px solid #333", padding: "4px 10px" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              style={{
                borderBottom: "1px solid #ddd",
                background: r.strokeCount == null ? "#fee" : undefined,
              }}
            >
              <td style={{ padding: "4px 10px" }}>{r.script}</td>
              <td style={{ padding: "4px 10px", fontSize: "16px" }}>{r.character}</td>
              <td style={{ padding: "4px 10px" }}>{r.romaji}</td>
              <td style={{ padding: "4px 10px" }}>{r.type}</td>
              <td style={{ padding: "4px 10px" }}>{r.groupCode ?? "—"}</td>
              <td style={{ padding: "4px 10px" }}>{r.strokeCount ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
