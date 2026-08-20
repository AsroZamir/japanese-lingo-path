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
import { WritingCanvas, type WritingCanvasMode, type WritingCanvasResult } from "@/components/kana/WritingCanvas";
import { KanaTypingInput, type KanaTypingStatus } from "@/components/kana/KanaTypingInput";
import { KanaChart, type KanaChartCharacter } from "@/components/kana/KanaChart";
import { ExerciseRunner, type ExerciseItem, type ExerciseRunnerResult } from "@/components/kana/ExerciseRunner";
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

const WRITING_MODES: WritingCanvasMode[] = ["trace", "guided", "copy", "faint_grid", "blind"];
const WRITING_CANVAS_CHARACTER = "あ";

function WritingCanvasDemo() {
  const [strokeData, setStrokeData] = useState<KanaStrokeData | null>(null);
  const [mode, setMode] = useState<WritingCanvasMode>("trace");
  const [result, setResult] = useState<WritingCanvasResult | null>(null);
  // Forces WritingCanvas to remount (clean slate) when switching mode —
  // demo-page convenience, not something WritingCanvas needs itself.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    fetch(`/kana-strokes/hiragana/${encodeURIComponent(WRITING_CANVAS_CHARACTER)}.json`)
      .then((res) => res.json())
      .then(setStrokeData);
  }, []);

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>4. WritingCanvas</h2>
      <p style={{ marginBottom: 12 }}>
        <strong>Mode (Stage 1–5): </strong>
        {WRITING_MODES.map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setResult(null);
              setResetKey((k) => k + 1);
            }}
            style={{
              marginRight: 8,
              padding: "4px 10px",
              fontWeight: mode === m ? 800 : 400,
              border: "1px solid #ccc",
              borderRadius: 6,
              background: mode === m ? "#eef" : "white",
              cursor: "pointer",
            }}
          >
            {m}
          </button>
        ))}
      </p>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <WritingCanvas key={resetKey} character={WRITING_CANVAS_CHARACTER} strokeData={strokeData} mode={mode} onResult={setResult} />
        <div style={{ maxWidth: 320, fontSize: 12 }}>
          <p style={{ color: "#666" }}>
            Gambar {strokeData?.strokes.length ?? "…"} coretan あ dengan mouse atau sentuhan. Warna coretan yang sudah
            digambar: <span style={{ color: "#22886c" }}>hijau</span> = semua benar,{" "}
            <span style={{ color: "#c98a1e" }}>kuning</span> = bentuk oke tapi arah/urutan meleset,{" "}
            <span style={{ color: "#c0392b" }}>merah</span> = bentuk jauh dari target.
          </p>
          {result && (
            <pre style={{ background: "#f5f5f5", padding: 10, borderRadius: 8, overflowX: "auto", fontSize: 11 }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </section>
  );
}

const TYPING_TARGETS = ["あ", "ア", "きゃ", "たべる"];

function KanaTypingInputDemo() {
  const [log, setLog] = useState<{ expected: string; typed: string; correct: boolean }[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, KanaTypingStatus>>({});

  function submit(target: string) {
    const typed = values[target] ?? "";
    const correct = typed === target;
    setStatuses((prev) => ({ ...prev, [target]: correct ? "correct" : "incorrect" }));
    setLog((prev) => [{ expected: target, typed, correct }, ...prev].slice(0, 8));
  }

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>5. KanaTypingInput</h2>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        Ketik romaji-nya (mis. &quot;a&quot; untuk あ, &quot;kya&quot; untuk きゃ) — wanakana mengubahnya jadi kana
        otomatis saat mengetik, tanpa keyboard Jepang. Tekan Enter untuk cek jawaban (tidak lagi auto-submit begitu
        benar — komponen ini sekarang parent-controlled, sama seperti dipakai lewat Periksa/Lanjutkan di ExerciseRunner).
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        {TYPING_TARGETS.map((target) => (
          <KanaTypingInput
            key={target}
            expected={target}
            status={statuses[target] ?? "idle"}
            onChange={(value) => setValues((prev) => ({ ...prev, [target]: value }))}
            onSubmit={() => submit(target)}
          />
        ))}
      </div>
      {log.length > 0 && (
        <pre style={{ background: "#f5f5f5", padding: 10, borderRadius: 8, overflowX: "auto", fontSize: 11 }}>
          {JSON.stringify(log, null, 2)}
        </pre>
      )}
    </section>
  );
}

const KANA_CHART_ROWS: { group: string; entries: [string, string][] }[] = [
  { group: "A", entries: [["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"]] },
  { group: "B", entries: [["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"]] },
  { group: "C", entries: [["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"]] },
];

function buildInitialCharacters(): KanaChartCharacter[] {
  let id = 0;
  return KANA_CHART_ROWS.flatMap((row) =>
    row.entries.map(([character, romaji], index) => ({
      id: id++,
      character,
      romaji,
      groupCode: row.group,
      orderInGroup: index + 1,
      audioUrl: null, // matches the real current state — no kana audio recorded yet
      strokeData: null as KanaStrokeData | null,
      taught: row.group === "A", // simulate "Phase 1 L01 has only taught the あ row so far"
    })),
  );
}

function KanaChartDemo() {
  // Lazy initializer instead of setState in an effect — the row/romaji
  // data is static, so there's no external system to synchronize with
  // at mount, just an initial value to compute once.
  const [characters, setCharacters] = useState<KanaChartCharacter[] | null>(buildInitialCharacters);

  useEffect(() => {
    (characters ?? []).forEach((item) => {
      fetch(`/kana-strokes/hiragana/${encodeURIComponent(item.character)}.json`)
        .then((res) => res.json())
        .then((data: KanaStrokeData) => {
          setCharacters((prev) => prev?.map((c) => (c.id === item.id ? { ...c, strokeData: data } : c)) ?? null);
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-on-mount by design; `characters` only ever gains strokeData afterward, re-running this on that change would refetch forever.
  }, []);

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>6. KanaChart</h2>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        Baris A dianggap sudah diajarkan (terang, bisa diklik untuk audio — meski hasilnya &quot;belum tersedia&quot;
        karena memang belum ada). Baris B/C dianggap belum diajarkan: redup tapi tetap bisa dijelajahi. Arahkan mouse
        ke karakter mana pun (atau tekan-tahan di layar sentuh) untuk preview animasi coretan.
      </p>
      {characters && <KanaChart script="hiragana" phase="Modul 02 · Phase 1 · L01" characters={characters} />}
    </section>
  );
}

// id: あ=1 い=2 う=3 か=4 き=5 — reused across items so the "wrong answer"
// coloring and selectedOptionId in the result log are easy to read.
const CHOICES_AIUKAKI = [
  { id: 1, label: "あ" },
  { id: 2, label: "い" },
  { id: 3, label: "う" },
  { id: 4, label: "か" },
];

const EXERCISE_ITEMS: ExerciseItem[] = [
  {
    id: "1", type: "recall", kanaId: 1,
    promptRomaji: "a",
    options: CHOICES_AIUKAKI,
    correctOptionId: 1,
  },
  {
    id: "2", type: "visual_to_sound", kanaId: 2,
    promptKana: "い", promptAudioUrl: null,
    options: [{ id: 1, label: "a" }, { id: 2, label: "i" }, { id: 3, label: "u" }, { id: 4, label: "ka" }],
    correctOptionId: 2,
  },
  {
    id: "3", type: "typing", kanaId: 3,
    promptKana: "う",
    expectedTyping: "う",
  },
  {
    id: "4", type: "sound_to_visual", kanaId: 1,
    promptAudioUrl: null, // real block: no audio exists yet, see BlockedNote
    options: CHOICES_AIUKAKI,
    correctOptionId: 1,
  },
  {
    id: "5", type: "timed_recognition", kanaId: 4,
    promptRomaji: "ka",
    options: CHOICES_AIUKAKI,
    correctOptionId: 4,
    timeLimitSeconds: 6,
  },
];

function ExerciseRunnerDemo() {
  const [result, setResult] = useState<ExerciseRunnerResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>7. ExerciseRunner</h2>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        5 soal berturutan: recall, visual→sound, typing, sound→visual (butuh audio — lihat catatan kuning), lalu
        timed_recognition (6 detik). Klik jawaban salah dulu di soal manapun untuk lihat sorot merah +
        selected_option_id tercatat di hasil JSON.
      </p>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <ExerciseRunner key={runKey} items={EXERCISE_ITEMS} onComplete={setResult} />
        <div style={{ maxWidth: 380 }}>
          <button
            onClick={() => { setResult(null); setRunKey((k) => k + 1); }}
            style={{ marginBottom: 8, padding: "6px 12px", border: "1px solid #ccc", borderRadius: 6, background: "white", cursor: "pointer" }}
          >
            ↻ Ulang dari soal 1
          </button>
          {result && (
            <pre style={{ background: "#f5f5f5", padding: 10, borderRadius: 8, overflowX: "auto", fontSize: 11 }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
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
        <WritingCanvasDemo />
        <KanaTypingInputDemo />
        <KanaChartDemo />
        <ExerciseRunnerDemo />
      </div>
    </RomajiPreferenceProvider>
  );
}
