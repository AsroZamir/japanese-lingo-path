"use client";

import {
  RomajiPreferenceProvider,
  useRomajiPreference,
  type GlobalRomajiPreference,
} from "@/components/kana/RomajiPreferenceContext";
import { RomajiText } from "@/components/kana/RomajiText";

const SAMPLES = [
  { kana: "あ", romaji: "a" },
  { kana: "きゃ", romaji: "kya" },
  { kana: "ん", romaji: "n" },
];

const GLOBAL_PREFERENCE_OPTIONS: GlobalRomajiPreference[] = ["follow_content", "always", "on_demand", "hidden"];
const POLICIES = ["always", "on_demand", "hidden"] as const;

function GlobalPreferenceControl() {
  const { preference, setPreference } = useRomajiPreference();
  return (
    <p style={{ marginBottom: 16 }}>
      <strong>Preferensi global user: </strong>
      {GLOBAL_PREFERENCE_OPTIONS.map((opt) => (
        <button
          key={opt}
          onClick={() => setPreference(opt)}
          style={{
            marginRight: 8,
            padding: "4px 10px",
            fontWeight: preference === opt ? 800 : 400,
            border: "1px solid #ccc",
            borderRadius: 6,
            background: preference === opt ? "#eef" : "white",
            cursor: "pointer",
          }}
        >
          {opt}
        </button>
      ))}
      <br />
      <small>
        Kalau bukan &quot;follow_content&quot;, ini menimpa prop <code>policy</code> di semua baris tabel di bawah —
        itulah yang dimaksud &quot;hormati preferensi global user&quot;.
      </small>
    </p>
  );
}

function RomajiTextDemo() {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2>1. RomajiText</h2>
      <GlobalPreferenceControl />
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 6, borderBottom: "2px solid #333" }}>policy (prop)</th>
            <th style={{ textAlign: "left", padding: 6, borderBottom: "2px solid #333" }}>hasil</th>
          </tr>
        </thead>
        <tbody>
          {POLICIES.map((policy) => (
            <tr key={policy}>
              <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>{policy}</td>
              <td style={{ padding: 6, borderBottom: "1px solid #eee", display: "flex", gap: 24, fontSize: 20 }}>
                {SAMPLES.map((s) => (
                  <RomajiText key={s.kana} kana={s.kana} romaji={s.romaji} policy={policy} />
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
        &quot;on_demand&quot;: klik karakternya. &quot;hidden&quot;: romaji tidak pernah muncul, tidak ada apa pun untuk
        diklik.
      </p>
    </section>
  );
}

export default function DevComponentsPage() {
  return (
    <RomajiPreferenceProvider>
      <div style={{ padding: 24, fontFamily: "sans-serif", fontSize: 14 }}>
        <h1 style={{ fontSize: 20 }}>/dev/components — demo komponen Fase 4</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>
          Halaman untuk uji manual komponen reusable sebelum dipakai di halaman produk. Bukan untuk pengguna. Bertambah
          satu section setiap komponen selesai.
        </p>
        <RomajiTextDemo />
      </div>
    </RomajiPreferenceProvider>
  );
}
