# CLAUDE.md — Japanese Lingo Path

Panduan kerja untuk Claude Code di repo ini. Diperbarui 23 Agustus 2026.

---

## 1. Apa ini

Platform belajar bahasa Jepang **berbahasa Indonesia**, dari pemula total sampai
JLPT N1. Pemilik: Asro Zamir. Live di https://japanese-lingo-path.vercel.app

Celah pasar: semua kompetitor besar (WaniKani, Bunpro, Renshuu, Anki, Duolingo)
berbahasa Inggris, masing-masing kuat di satu aspek saja. Dua celah: bahasa
Indonesia sebagai pengantar, dan satu tempat untuk seluruh jalur belajar.

Pemilik kuat di intuisi produk dan kurikulum, bukan engineer. Jelaskan bertahap
dengan bahasa mudah. Tunjukkan bukti, bukan jargon.

## 2. Stack

| Komponen | Pilihan |
|---|---|
| Framework | Next.js 16 App Router + React 19 + TypeScript |
| Database | Supabase (Postgres), 22 tabel |
| Auth | Supabase Auth — **Google OAuth saja**, tidak ada email/password di UI |
| ORM | Drizzle |
| Deploy | Vercel, auto-deploy dari `main` |
| Audio Jepang | VOICEVOX lokal (四国めたん ノーマル, speaker id 2) |
| Narasi Indonesia | OpenAI TTS (`gpt-4o-mini-tts`, suara `marin`) |
| Data coretan | `@k1low/hanzi-writer-data-jp` |
| Validasi tulisan | `@k1low/kakitori` |
| Kana↔romaji | `wanakana` |
| Font | Plus Jakarta Sans (Indonesia), Noto Sans JP (Jepang) |

### Koneksi database — dua mode, sering tertukar

- Migration dari lokal: **Session pooler, port 5432** → `DATABASE_URL`
- Runtime di Vercel: **Transaction pooler, port 6543** → `DATABASE_URL_POOLED`
- Direct connection Supabase hanya IPv6 — gagal di kebanyakan ISP Indonesia

`drizzle-kit` tidak membaca `.env.local` otomatis (konvensi Next.js). Sudah
ditangani lewat dotenv di `drizzle.config.ts`.

### Identitas visual (nama internal: "Moji")

Aksen terakota `#CC5436`, latar krem `#F6F6F0`, teks `#241E18`.
Referensi: `docs/design-reference/`

Token gerak: press 90ms, spring 200ms, entrance 300–320ms, stagger 60–70ms
Easing: `cubic-bezier(.34,1.56,.64,1)` (spring), `cubic-bezier(.16,1,.3,1)` (out)

## 3. Dua sistem kurikulum hidup berdampingan

**Ini sumber kebingungan terbesar di repo ini. Baca sampai habis sebelum
menyentuh apa pun yang berhubungan dengan kurikulum.**

### V1 (M01–M05) — ada, sudah tidak ditautkan

248 lesson di `kana_modules`/`kana_lessons`: M01 Orientasi (4), M02 Hiragana
Dasar (75), M03 Katakana Mastery (81), M04 Angka (41), M05 Sapaan (47).

Route `/belajar/kana/*` masih hidup lewat URL langsung, tidak ditautkan dari
navigasi mana pun. Datanya utuh — **jangan dihapus**. Kode: `module-query.ts`,
`lesson-query.ts`, `learner-stats.ts`.

### V2 (PRE-N5.01–11) — aktif

Route `/belajar/pre-n5/[moduleCode]/[stageCode]`, dipakai `/belajar` dan
`/beranda`. Kode: `curriculum-v2.ts`, `pre-n5-01-query.ts`.
Tabel: `curriculum_versions`, `curriculum_levels`, `learning_modules` (11),
`learning_stages` (63), `user_learning_module_progress`,
`user_learning_stage_progress`.

Hanya **PRE-N5.01** berstatus `ready`. Sepuluh sisanya `scaffold` — struktur
`learning_stages` (F1–F5 + BOSS; PRE-N5.11 punya A1–A3) ada, kontennya belum.

### ⚠️ Tiga hal yang tidak terlihat dari struktur folder

**1. V1 dan V2 berbagi tabel attempt dan mastery.** V2 menulis ke
`user_kana_attempts` dan `user_kana_mastery` **yang sama** dengan V1, dibedakan
hanya lewat prefix `v2_f1_*` di kolom `exercise_type` — bukan tabel terpisah,
bukan kolom versi. Konsekuensinya query apa pun ke dua tabel itu akan mencampur
data dua kurikulum kecuali di-filter secara eksplisit.

V2 juga sengaja memakai ulang `kana_characters`, `kana_example_words`, file
stroke di `public/kana-strokes/`, dan seluruh audio VOICEVOX dari V1.

**2. Konten V2 hidup di kode, bukan database.** Tidak ada tabel konten untuk V2 —
kata mana, urutan karakter mana, semuanya di file TypeScript. Ini bertentangan
dengan V2.1 Bagian 10.1 yang menuntut single source of truth ber-`item_id` dan
ber-`content_version`. Pekerjaan memindahkannya lebih besar daripada kelihatannya.

**3. Semua attempt V2 masih berlabel `f1`.** Dari 177 attempt V2 yang tercatat,
nol dari F2–F5 atau BOSS. Artinya F5 (retention) **belum pernah dicapai pengguna
mana pun** — bukan cuma tidak ditegakkan, tapi tidak pernah dijalankan. Status
`ready` PRE-N5.01 baru terbukti untuk F1.

⚠️ **Anomali:** `curriculum_versions.status = 'draft'`, `activated_at = null`.
Secara data V2 belum diaktifkan, tapi kodenya sudah jadi jalur aktif tanpa pernah
mengecek status itu.

### V2.1 — sumber kebenaran kurikulum

**`docs/curriculum-v2.1/rancangan_modul_pre_n5_sampai_n1_v2_1_upgrade_lengkap.md`**

Baca dokumen itu sebelum mengambil keputusan kurikulum apa pun. Jangan bekerja
dari ringkasan, termasuk ringkasan di file ini.

⚠️ **`docs/curriculum-v2/PRE_N5_FRAMEWORK.md` SUPERSEDED.** Dokumen itu turunan
rancangan generasi sebelumnya (`rancangan_modul_pre_n5_sampai_n1.pdf`, tanpa
`v2_1`) dan melahirkan pola F1–F5 yang V2.1 tolak. Simpan sebagai catatan
sejarah; jangan pakai sebagai spesifikasi.

Peta bagian dokumen V2.1:

| Butuh apa | Bagian |
|---|---|
| Dipertahankan vs diganti dari V2 | 2 |
| Model penguasaan 5 status, gate awal, hint ladder | 4 |
| Arsitektur sesi mikro & rasio item | 5 |
| Alur tiap engine (kana, kanji, vocab, grammar, listening, reading, interaksi) | 6 |
| Spesifikasi 67 modul satu per satu | 7 |
| Rubric tulisan tangan & blueprint asesmen | 8 |
| Kebijakan mnemonik + desain trial A/B/C | 9 |
| Content quality system & single source of truth | 10 |
| Skema event/telemetry, prioritas scheduler | 11 |
| Aturan migrasi & versioning | 12 |
| **Urutan implementasi P0–P3** | **13** |
| Definition of done per modul | 14 |
| **Kontrak handoff untuk Claude Code** | **16** |

**Perubahan inti:** V2.1 mempertahankan 67 ID modul tapi **menolak pola F1–F5
seragam**. Bagian 2: "Script, grammar, listening, dan interaction membutuhkan
latihan dan bukti penguasaan berbeda." Kerangka modul dipakai ulang;
**mekanika belajar di dalamnya yang diganti.** PRE-N5.11 yang sekarang bernama
"Boss" juga bertentangan — V2.1 menyebutnya "Pre-N5 Integrated Mastery".

#### Model penguasaan lima status

| Status | Syarat |
|---|---|
| New | Belum ada exposure terarah |
| Familiar | Benar pada recognition dengan feedback |
| Retrievable | Benar **tanpa hint** pada cued/free recall |
| Durable | Benar tanpa hint **di sesi berbeda**, termasuk uji tertunda |
| Transferable | Benar dalam konteks baru |

Empat jenis bukti dipisahkan, **hanya dua terakhir boleh memberi mastery**:
exposure (tidak), guided performance (tidak), unaided retrieval (ya),
delayed transfer (ya).

Gate awal (titik awal pilot, harus dikalibrasi):
- Checkpoint akuisisi ≥80% first-attempt — **hanya membuka langkah berikutnya**,
  belum memberi label mastered
- Retention gate ≥85% first-attempt tanpa hint setelah **jeda minimal 72 jam**;
  tiap subskill kritis minimal 75%
- Transfer gate: minimal 3 dari 4 aspek rubric tanpa bantuan yang membocorkan
  jawaban

**Hint ladder V2.1 punya 3 tingkat, implementasi sekarang baru 2.** Yang ada:
`hintLevel` 0/1/2 (tanpa bantuan → petunjuk goresan+teks → animasi lengkap).
Yang diminta: (1) orientasi — kategori/bunyi awal/jumlah stroke, tidak
menunjukkan jawaban; (2) sebagian — pilihan dipersempit, komponen pertama,
siluet tipis; (3) model — jawaban penuh lalu guided retry.
**Reset retrieval:** setelah 2–4 item distraktor item muncul lagi tanpa hint, dan
hanya keberhasilan ini yang boleh memperbarui mastery.

#### Kana Script Engine — bukan F1–F5

Bagian 6.1, tujuh langkah: lihat-dengar → bedakan → ikuti stroke → tulis dari
memori singkat → tulis dari audio → campuran kumulatif → retention.

Chunking PRE-N5.01 sudah ditentukan sampai hurufnya (Bagian 7):

| Fase | Huruf | Jumlah |
|---|---|---|
| P1 | あいうえお + かきくけこ | 10 |
| P2 | さしすせそ + たちつてと | 10 |
| P3 | なにぬねの + はひふへほ | 10 |
| P4 | まみむめも + やゆよ + らり | 10 |
| P5 | るれろわをん | 6 |

Tiap fase dipecah jadi pelajaran 5 huruf. Setelah P2 checkpoint memakai bank 20;
setelah P3 bank 30; P4 bank 40; final bank 46. Dakuten/handakuten dan youon
dibuka **setelah** core 46 checkpoint.

## 4. Kondisi sekarang

Audit lengkap: `docs/handover/` — baca `README.md` di sana dulu.

### Yang jalan (dibuktikan query database)

4 pengguna Google OAuth asli di `profiles`, 3 di antaranya punya attempt ·
494 baris `user_kana_attempts` (317 V1, 177 V2) · 108 `user_kana_mastery` ·
27 `user_kana_lesson_progress` · validasi tulisan `@k1low/kakitori` sungguhan ·
audio VOICEVOX lengkap · `SRS_INTERVALS = [1,3,7,14,30]` dengan `due_at` terisi
benar · 66 entri mnemonik di `hiragana-mnemonics.ts` · **`kana_confusion_pairs`
21 baris** dan **`learning_module_prerequisites` 19 baris** (aset yang sering
terlupakan — V2.1 menuntut confusable set dan prerequisite graph).

### Yang rusak atau belum ada

1. **Antrean review tidak ada.** `due_at` terisi benar, tapi tidak ada satu baris
   kode pun yang membacanya. `/ulangi` 100% hardcode dari `app/lib/mock-data.ts:13`
   (`reviewSummary = { dueNow: 12, learning: 28, mastered: 64 }`). Tombolnya cuma
   memicu toast. **Landing page sudah menjanjikan fitur ini.**
   (Badge di sidebar `AppShell.tsx` sudah sengaja dihapus dengan komentar
   eksplisit — angka "12" hanya di halaman `/ulangi`.)
2. **Retention gate tidak ditegakkan.** Stage "F5 · SRS Retention" di
   `HiraganaStagePlayer.tsx` me-render `<HiraganaLearningLab>` yang sama persis
   dengan F1–F4, di sesi yang sama, seketika.
3. **Status glyph pipeline tidak diketahui.** Kode perbaikan
   (`scripts/fetch-kana-stroke-data.ts`, `STROKE_INDEX_OVERRIDES`) masih utuh,
   tapi klaim "211 karakter terverifikasi" berasal dari perbandingan jumlah
   stroke — yang menurut Bagian 5 tidak membuktikan apa pun. V2.1 menyebut あ dan
   お secara eksplisit sebagai template wajib uji ulang. **Anggap belum
   terverifikasi sampai ada render visual dari aplikasi yang berjalan.**
4. **Mnemonik kemungkinan tampil terlalu awal**, dan field `story`-nya templat
   identik untuk semua 66 entri. V2.1 Bagian 9 mensyaratkan mnemonik sebagai cue
   opsional **setelah** pengguna mencoba mengingat.
5. **First-attempt tidak tercatat sebagai data.** Logika "hint dipakai → tidak
   dihitung mastery" hidup sebagai state React (`recallPassed` dipaksa `false`),
   hilang saat refresh.
6. **Skema V2.1 belum ada.** `curriculum_version`, `content_version`,
   `engine_version`, `hint_level`, `support_level`, `confidence`,
   `first_attempt_correct`, `actual_interval` — semua tidak ada. Yang mirip:
   `srs_interval_days` (≈`scheduled_interval`), `response_time_ms` (≈`latency_ms`).
   Daftar lengkap yang dituntut ada di V2.1 Bagian 11.1.
7. **Skor tulisan tangan satu angka, disimpan sebagai string**
   (`typed_value = 'writing-score:82'`). Tidak bisa di-query.
8. **Placement test tidak ada.** V2.1 Bagian 12 butir 4 mensyaratkannya untuk
   memberi credit ke pengguna aktif saat migrasi.
9. **Landing page tidak sinkron** — masih "Pre-N5 · 5 modul" (hardcode di
   `app/(marketing)/page.tsx`), padahal sistem aktif punya 11 modul.
10. **Dua jalur `learningFlow`** ("legacy" vs default) coexist di
    `HiraganaStagePlayer.tsx` — sisa iterasi 20-huruf vs 46-huruf.
11. **`user_kana_gate_results` 0 baris** — tabel ada, tidak dipakai kode mana pun.
12. **Belum ada suite E2E berulang.** `scripts/auth-setup.ts` terbukti pernah
    berhasil (login lewat `signInWithPassword()`, suntik cookie sesi ke
    Playwright, melewati Google) — ada `.auth/storageState.json` dan screenshot
    halaman terproteksi sebagai bukti. Tapi tidak ada `.spec.ts`, config
    Playwright, atau CI. Screenshot yang ada dari era "20 huruf", sudah usang.
13. **Status deployment Vercel tidak terverifikasi.** Hanya inferensi dari git
    sync; akses API Vercel gagal di sesi audit.

## 5. Aturan keras — mahal didapat, jangan diulang

### Data coretan: baca field `id`, jangan tebak geometris

Dataset stroke menyimpan varian gaya dengan suffix huruf: `1`, `2`, `3a`, `3b`.
**`3a` dan `3b` bukan dua coretan** — itu dua versi dari coretan yang sama.

Benar: kelompokkan berdasarkan awalan angka (`^\d+`), ambil tepat satu varian per
kelompok, dan **pastikan `strokes[]` dan `medians[]` mengambil varian yang sama** —
kalau tidak, gambar dan validasi tulisan tangan tidak sinkron.

Salah (pernah dipakai dan merusak あ お ぬ る の め): membandingkan koordinat,
buang salah satu kalau overlap ≥50%. Ambang tebakan tidak bisa tahu varian mana
yang benar.

Karakter bervarian: あ お す な ぬ ね の は ほ ま み む め よ る
(+ dakuten ば ぱ ず ぼ ぽ, + ょ yang menjalar ke 11 kombinasi youon).
Katakana: tidak ada.

### Verifikasi berbasis jumlah tidak memverifikasi apa pun

Membandingkan `stroke_count` di database dengan `strokes.length` di JSON selalu
sama *by construction*. Karakter bisa punya jumlah benar tapi bentuk rusak.

**Aturan:**
- Perubahan visual → verifikasi dengan render/screenshot
- Perubahan interaksi → jalankan interaksinya
- **Build lolos bukan bukti**
- Verifikasi terhadap **aplikasi yang berjalan**, bukan test harness statis

### "CSS-only" akan diartikan sebagai "ganti warna saja"

Pernah terjadi: instruksi menekankan "hanya lapisan visual". Hasilnya token warna
lama dialihkan ke warna baru — layout tidak tersentuh sama sekali.

**Aturan:** untuk perubahan tampilan, beri **angka konkret** (judul 20px, tombol
tinggi 48px, buang empat baris header ini), bukan prinsip ("perbaiki hierarki").
Nyatakan eksplisit bahwa JSX boleh dirombak total; yang dilindungi hanya query
data dan event handler.

### Next.js 16

- `middleware.ts` deprecated → `proxy.ts`. Kalau tidak di-rename, proteksi route
  **tampak** terpasang padahal tidak aktif.
- Proxy **bukan batas keamanan** (CVE bypass lewat `x-middleware-subrequest`).
  Berlapis: proxy untuk UX, cek di `(app)/layout.tsx` untuk server-side,
  **RLS di Postgres sebagai batas keamanan sebenarnya**.
- Dua folder dinamis berbeda nama di level yang sama dilarang — sebabnya route
  kana harus `/belajar/kana/[moduleCode]`, bukan `/belajar/[moduleCode]`.
- `cookies()` harus di-`await`.

### Supabase

- `@supabase/ssr` wajib `getAll()`/`setAll()`, bukan `get`/`set`/`remove` per-cookie.
- **Jangan taruh kode apa pun** antara `createServerClient` dan
  `supabase.auth.getUser()` di proxy — menyebabkan logout acak.
- Redirect URL harus di-allowlist di dashboard, **termasuk `localhost:3000`**.
  Kalau tidak, Supabase diam-diam fallback ke Site URL — gejalanya login dari
  localhost melompat ke domain production.

### TTS

OpenAI **tidak punya suara Jepang asli** — semuanya identitas berbahasa Inggris
yang membaca Jepang. Tidak ada prompt yang memperbaiki ini.
**VOICEVOX untuk Jepang, OpenAI untuk narasi Indonesia.**

VOICEVOX gratis dan lokal, tapi aplikasinya harus terbuka (server
`localhost:50021`) saat script audio dijalankan. Google Cloud menuntut prepayment
IDR 500.000 untuk Indonesia; Azure free tier menolak akun ini.

Catatan: narasi Indonesia saat ini **hanya ada di V1 (M01)**, lewat
`lesson_content_blocks.narration_url`. V2 belum punya narasi Indonesia sama sekali.

## 6. Pedagogi

- Di modul orientasi, soal menguji **pemahaman konsep yang baru dijelaskan**,
  bukan hafalan arti kata baru. Pernah terjadi soal "日本 berarti apa" di modul
  yang menyatakan dirinya tanpa hafalan.
- Romaji adalah **lapisan tampilan** dengan kebijakan per fase, **bukan bagian
  dari teks konten**. Kalau dijahit ke dalam teks, fase "no-romaji" mustahil.
- Setiap jawaban salah **wajib mencatat distractor mana yang dipilih** — tanpa itu
  fitur confusion pair personal tidak bisa dibuat retroaktif.
  (`user_kana_attempts` sudah punya `selected_option_id`/`correct_option_id` —
  gunakan, jangan buat yang baru.)
- **Rekognisi tanpa produksi menghasilkan ilusi penguasaan.**
- **Mnemonik adalah cue opsional, bukan pengantar.** V2.1 Bagian 9: tampilkan
  bunyi asli + bentuk canonical + satu kata konkret pendek dulu; mnemonik muncul
  setelah pengguna mencoba mengingat. Sediakan 2–3 pilihan anchor (shape, word,
  buat sendiri). **Jangan menambahkan garis atau bentuk dekoratif yang bisa
  dianggap bagian huruf.** Uji efektivitasnya pada delayed recall dan writing,
  bukan rating "seru".
- Contoh kalimat: pakai 私の名前はアスロです, bukan contoh kopi generik.
- Mini-test mengetik butuh tombol konfirmasi, bukan auto-advance saat input benar.

## 7. Kontrak handoff V2.1 (Bagian 16) — berlaku untuk semua pekerjaan di repo ini

1. Jangan menghapus website, database, authentication, routing shell, atau
   infrastructure yang sudah ada.
2. Jangan menganggap teks PDF lama sebagai spesifikasi implementasi setelah ada
   konflik; **keputusan V2.1 menang untuk metode belajar**.
3. Pertahankan 67 module ID kecuali migration eksplisit disepakati.
4. **Implementasi pertama adalah vertical slice PRE-N5.01**, bukan membuat semua
   konten sekaligus.
5. Semua progress baru versioned; progress lama read-only/history sampai mapping
   tervalidasi.
6. Semua attempt yang membuka hint ditandai **assisted** dan tidak memberi mastery
   sebelum unaided retry.
7. Semua module punya immediate checkpoint, retention gate, dan transfer task yang
   sesuai engine-nya.
8. Speed/timer hanya aktif **setelah** accuracy floor.
9. JLPT readiness dan JLP communication selalu dipisah di UI dan data.
10. Setiap perubahan konten Jepang memerlukan QA linguistik dan test asset.

## 8. Cara kerja

- **Satu komponen/halaman per commit.** Waktu tujuh komponen dikerjakan sekaligus,
  sulit melacak mana yang bermasalah.
- **Minta dan beri bukti, bukan laporan.** "Screenshot render karakter, bukan
  tabel angka." "Tunjukkan query SQL yang bisa saya jalankan sendiri."
- **Audit sebelum bangun.** Setiap pindah alat atau sesi, laporkan kondisi nyata
  dulu — jangan mulai dari asumsi sesi sebelumnya.
- Pemilik mengharapkan prompt dieksekusi sampai selesai tanpa berhenti minta
  konfirmasi, kecuali pekerjaan berisiko yang checkpoint-nya dinyatakan eksplisit.
- Kalau sesuatu tidak bisa diverifikasi, **katakan tidak bisa diverifikasi.**
  Jangan melaporkan "selesai" untuk hal yang belum dilihat berjalan.

## 9. Urutan kerja berikutnya

### P0 menurut V2.1 Bagian 13 — kutipan langsung, jangan diurutkan ulang

1. **Canonical glyph pipeline** — satu asset source untuk display, animation,
   trace, dan scoring; perbaiki あ/お dan golden tests.
2. **Mastery evidence model** — pisahkan completion, unaided retrieval, hint
   usage, delayed retention, dan transfer.
3. **Hint ladder + retry semantics** — attempt dibantu tidak menambah mastery.
4. **Cumulative phase graph** — Hiragana 10/10/10/10/6 dengan bank 10/20/30/40/46.
5. **Explainable handwriting score** — tampilkan subscore dan specific correction.
6. **Curriculum versioning** — progress V2 lama tetap aman, V2.1 punya namespace
   baru. (Perhatikan: sekarang V1 dan V2 malah **berbagi** tabel attempt/mastery.)

### Perbaikan produk yang berdiri di luar P0

**Antrean review nyata** — query `user_kana_mastery.due_at`, ganti `mock-data.ts`.
Ini **bukan** bagian P0 V2.1; ini menutup janji landing page yang sudah dibaca
pengguna sungguhan. Datanya sudah ada.

Dua hal yang harus diputuskan sadar sebelum menulis query:

- **`user_kana_mastery` berisi data V1 dan V2 tercampur.** Untuk SRS per-karakter
  ini kemungkinan tidak masalah — huruf あ tidak peduli kurikulum mana yang
  mengajarkannya, dan larangan V2.1 Bagian 12 menyasar konversi progres *modul*,
  bukan status SRS *karakter*. Tapi putuskan eksplisit dan catat, jangan biarkan
  terjadi diam-diam.
- **V2.1 Bagian 11.2:** scheduler tidak boleh menghasilkan review queue tak
  berujung. Wajib ada **daily cap, overdue triage, dan "minimum viable review"**.
  Prioritas naik bila: salah tanpa hint, benar setelah hint, latency jauh di atas
  baseline pada item Durable, confusion pair berulang, retention check gagal,
  atau item jadi prasyarat task dekat.

### P1 — vertical slice Pre-N5 (V2.1 Bagian 13)

1. PRE-N5.01 lengkap sampai delayed Core Gate
2. Dashboard mastery/weak point yang memakai evidence nyata
3. PRE-N5.02 dengan contrast kana dan interleaving terkendali
4. PRE-N5.04 sebagai functional/audio slice untuk membuktikan engine berbeda
5. PRE-N5.11 integrated gate

### Yang jangan dikerjakan dulu

**Mengisi 10 modul scaffold sebelum mekanika V2.1 terbukti di satu modul.**
V2.1 Bagian 15.1: ekspansi 67 modul baru boleh setelah satu script engine, satu
grammar, satu vocab, dan satu listening engine menunjukkan learning gain serta
retention yang dapat dipercaya.

## 10. Perintah

```bash
npm run dev
npx tsc --noEmit
npm run lint
npm run build
npx drizzle-kit generate
npx drizzle-kit migrate
```

### `npm run build` di komputer lokal

`app/dev/kana` membutuhkan `DATABASE_URL_POOLED` saat build. Kalau baris itu tidak
ada di `.env.local`, `npm run build` gagal padahal kodenya sehat. Isi saja dengan
nilai yang sama seperti `DATABASE_URL` — untuk lokal, session pooler cukup.
Production memakai nilai transaction pooler sendiri di Vercel.