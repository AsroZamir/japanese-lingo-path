"use client";

import { useEffect, useState } from "react";
import {
  RomajiPreferenceProvider,
  useRomajiPreference,
  type GlobalRomajiPreference,
} from "@/components/kana/RomajiPreferenceContext";
import { RomajiText } from "@/components/kana/RomajiText";
import { AudioButton } from "@/components/kana/AudioButton";
import { StrokeAnimation, type KanaStrokeData } from "@/components/kana/StrokeAnimation";
import { DEMO_BEEP_URL } from "./demo-audio";

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

function AudioButtonDemo() {
  const rows: { label: string; url: string | null }[] = [
    { label: "null (audio_url belum ada di data — kondisi nyata sekarang)", url: null },
    { label: "URL rusak/404 (simulasi gagal load)", url: "/kana-audio-does-not-exist.mp3" },
    { label: "URL valid (beep 0.3s, generated lokal untuk demo)", url: DEMO_BEEP_URL },
  ];

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>2. AudioButton</h2>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 6, borderBottom: "2px solid #333" }}>url</th>
            <th style={{ textAlign: "left", padding: 6, borderBottom: "2px solid #333" }}>tombol</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>{r.label}</td>
              <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>
                <AudioButton url={r.url} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
        Baris 1: tombol nonaktif, hover untuk lihat tooltip &quot;Audio belum tersedia&quot; — ini kondisi
        <code> audio_url</code> yang sebenarnya sekarang di seluruh <code>kana_characters</code>. Baris 2: tombol
        nonaktif dengan tooltip berbeda (&quot;Audio gagal dimuat&quot;) setelah percobaan load gagal. Baris 3: klik
        untuk memutar/berhenti, ikon berubah jadi ■ dan tombol memerah saat sedang memutar.
      </p>
    </section>
  );
}

const STROKE_ANIMATION_SAMPLES = [
  { label: "あ (3 stroke, sudah dibersihkan dari duplikat Fase 3)", script: "hiragana", character: "あ" },
  { label: "きゃ (youon, dirakit dari き + ゃ)", script: "hiragana", character: "きゃ" },
  { label: "ヲ (katakana)", script: "katakana", character: "ヲ" },
];

function StrokeAnimationDemo() {
  const [dataByChar, setDataByChar] = useState<Record<string, KanaStrokeData | undefined>>({});

  useEffect(() => {
    // Demo-page-only fetch of the static JSON produced in Fase 3 — the
    // component itself never fetches; it only ever receives strokeData
    // as a prop, exactly like a real lesson page would load it.
    STROKE_ANIMATION_SAMPLES.forEach(({ script, character }) => {
      fetch(`/kana-strokes/${script}/${encodeURIComponent(character)}.json`)
        .then((res) => res.json())
        .then((data: KanaStrokeData) => setDataByChar((prev) => ({ ...prev, [character]: data })));
    });
  }, []);

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>3. StrokeAnimation</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {STROKE_ANIMATION_SAMPLES.map(({ label, character }) => (
          <div key={character}>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 6, maxWidth: 220 }}>{label}</p>
            <StrokeAnimation character={character} strokeData={dataByChar[character] ?? null} showGrid />
          </div>
        ))}
        <div>
          <p style={{ fontSize: 12, color: "#666", marginBottom: 6, maxWidth: 220 }}>
            strokeData null (mis. karakter belum diproses Bagian C)
          </p>
          <StrokeAnimation character="ゐ" strokeData={null} />
        </div>
      </div>
      <p style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
        Kontrol: ▶/⏸ putar-jeda, ↻ ulang dari awal, &quot;0.35x&quot; toggle slow motion, ⏭ maju satu coretan.
        Angka kanan bawah = coretan selesai / total.
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
        <AudioButtonDemo />
        <StrokeAnimationDemo />
      </div>
    </RomajiPreferenceProvider>
  );
}
