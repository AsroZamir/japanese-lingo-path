# CLAUDE.md — Japanese Lingo Path

Panduan kerja untuk Claude Code di repo ini. Diperbarui 25 Agustus 2026 (PROMPT-9).

**PROMPT-8 (25 Agustus 2026, ringkas — laporan lengkap di riwayat sesi):**
kunci antar-modul di `/belajar` dibuka oleh `NEXT_PUBLIC_DEV_UNLOCK_ALL`
(dulu cuma kunci antar-tahap) DAN sekarang benar-benar ditegakkan di
level route (`isModuleLockedByPrerequisites`, `app/lib/curriculum-v2.ts`)
— sebelumnya `learning_module_prerequisites` cuma tampilan kartu, tanpa
penegakan nyata. **PRE-N5.03 (Angka, Waktu, Harga & Counter Dasar) aktif**
— modul KETIGA, TIPE BEDA dari kana (bukan bentuk huruf) — melahirkan
**Vocabulary Engine** (`db/schema/vocab.ts`: `vocab_items`/
`user_vocab_attempts`/`user_vocab_mastery`, `app/lib/vocab-engine-query.ts`,
`vocab-actions.ts` di folder stage yang sama dengan hiragana) yang
disiapkan untuk dipakai ulang modul 04/05/10. Detail lengkap type-neutral
vs type-specific: `docs/POLA-MODUL-BARU.md`.

**PROMPT-9 (25 Agustus 2026) — Mesin Sensei:** fitur "papan tulis" —
materi muncul bertahap dengan narasi Indonesia opsional (tombol putar,
BUKAN autoplay, TIDAK ADA video) dan ilustrasi sensei diam (4 pose:
neutral/pointing/smiling/thinking, SVG placeholder di `public/sensei/`,
**butuh ilustrator sungguhan** — lihat laporan). Tabel baru
`sensei_segments` (`db/schema/sensei.ts`) — netral-modul dari awal,
di-scope ke `learning_modules`/`learning_stages` (BUKAN ke
`kanaLessons`/V1), satu baris = satu "beat" di papan (teks + aksi visual
jsonb + pose + narasi opsional), dipakai ulang untuk SEMUA 67 modul lewat
`segment_type` (`module_intro`/`phase_intro`/`concept_moment`/
`writing_demo`). Query: `app/lib/sensei-query.ts`. Render: `components/
sensei/SenseiBoard.tsx` (pemutar generik) + `SenseiIntroGate.tsx`
(overlay dismissible per sesi browser lewat sessionStorage, BUKAN kolom
DB — sengaja ringan, sama seperti `VocalBridgeIntro` lama yang sekarang
DIHAPUS dan isinya digabung ke module_intro PRE-N5.01).

**"Sensei Menulis" (Bagian 3) TIDAK membangun renderer baru dari
`hanzi-writer`** meski paket itu ada di `package.json` — `@k1low/
kakitori`'s `Char.animate()` (dipakai `KanaStrokeAnimator`,
`components/kana/KanaWritingCoach.tsx`) SUDAH menganimasikan goresan
persis seperti yang diminta, jadi dipakai ulang langsung (via
`SenseiWritingDemo.tsx`) — bukan direimplementasi. Trigger-nya di Hint
3 (`RetrievalStep`'s "Masih lupa - lihat gerakan lengkap") yang MEMANG
sudah hanya muncul setelah percobaan gagal, bukan tombol baru terpisah.
Narasi arah goresan untuk 46 huruf inti **dihasilkan otomatis** dari
koordinat `medians`/`strokeGroups` asli (`scripts/seed-sensei-
pre-n5-01.ts`'s `buildStrokeNarration`), bukan ditulis manual satu-satu
— **perlu ditinjau penutur asli** untuk kealamian bahasanya, tapi
arahnya sendiri terbukti benar dari data.

**Verifikasi あ/お tanpa login:** karena login browser otomatis diblokir
classifier keamanan sesi ini (baik lewat suntik cookie sesi test maupun
form login sungguhan), verifikasi visual wajib "render あ dan お, hitung
goresan" dikerjakan lewat file HTML statis mandiri yang membaca
`public/kana-strokes/hiragana/{あ,お}.json` langsung dan menggambar SVG
manual (server statis lokal di luar Next.js, tanpa proxy/auth) — bukan
lewat aplikasi yang sedang berjalan. Hasilnya: 3 goresan masing-masing,
bentuk benar. Teknik ini dicatat di sini karena berguna untuk verifikasi
karakter lain di masa depan tanpa perlu login.

PROMPT-7 Bagian 1-5 (hiragana): `/latihan` diganti total dari mock jadi
latihan kecepatan nyata (`app/lib/speed-drill-query.ts`,
`app/(app)/latihan/`) — hanya huruf "Bisa diingat" ke atas, terbuka
setelah minimal 10 huruf capai tingkat itu, `exercise_type` berprefix
`v21_speed_`, membedakan salah-karena-waktu-habis (`typed_value:
"timeout"`, lewat tombol "Belum ingat, lewati" — tidak ada timer paksa)
dari salah-karena-jawaban-salah. `app/lib/hiragana-mnemonics.ts`'s
`HIRAGANA_LAB_MNEMONICS` ditulis ulang penuh untuk 46 huruf inti dengan
jangkar bunyi Indonesia asli (bukan jangkar kata Jepang seperti versi
lama) — **perlu ditinjau pemilik repo**, lihat komentar di file itu.
Langkah "Baca" bertambah jadi langkah ke-7 di label UI ("Langkah X/7").
Layar pembuka vokal (`VocalBridgeIntro.tsx`) muncul sekali sebelum F1
batch 1 pertama kali, tidak persisten ke database.

**Bagian 2 (VOICEVOX) — selesai belakangan** (25 Agustus 2026, setelah
pemilik menyalakan VOICEVOX sendiri). Halaman awalnya ditaruh di
`/dev/suara` — TERNYATA `proxy.ts` sengaja mem-block SELURUH path
`/dev/*` dengan 404 murni di production (lihat komentar di dalamnya
sendiri: halaman dev tidak boleh bocor ke publik) — jadi halaman itu
tidak akan PERNAH bisa dibuka di situs live, berapa pun lama ditunggu.
**Bukan bug deploy.** Dipindah ke **`/pengaturan/suara`** (tidak ada di
navigasi, tapi tetap butuh login seperti halaman lain) supaya benar-benar
bisa dibuka di situs live. Kalau ada halaman internal serupa di masa
depan, jangan taruh di bawah `/dev/` kalau memang perlu diakses dari
situs live — pola ini akan berulang.

Halaman itu menampilkan 12 kandidat suara pengganti
四国めたん id=2 (dinilai terlalu anime), masing-masing dengan 3 sampel
audio nyata (あいうえお, かきくけこ, kalimat). File WAV-nya disimpan statis
di `public/dev-suara/` (~2 MB, sudah di-commit) supaya halaman tetap
jalan tanpa VOICEVOX menyala terus-menerus — regenerasi lewat
`npm run generate:voice-samples` (`scripts/generate-voice-comparison-
samples.ts`), VOICEVOX harus menyala saat itu. **Suara produksi belum
diganti** — pemilik yang memilih dulu lewat `/pengaturan/suara`, baru speaker id
dipindah (satu env var `VOICEVOX_SPEAKER_ID`, sudah tersentralisasi sejak
sebelumnya) di `scripts/generate-audio-voicevox.ts` dan
`scripts/generate-audio-remaining-kana.ts`, lalu audio kana yang sudah
ada perlu digenerasi ulang dengan speaker baru itu.

PROMPT-7 Bagian 7-9 (katakana): **PRE-N5.02 aktif** — status modul
`ready` (dulu `scaffold`), 7 baris `learning_stages` (F1-F5, BOSS,
RETENTION) diisi konten V2.1 nyata, memakai ULANG mesin hiragana
sepenuhnya (routing, 7 fase, gate-logic, SRS) setelah beberapa titik
yang ternyata masih terikat hiragana dinetralkan — daftar lengkap +
alasan di **`docs/POLA-MODUL-BARU.md`** (baca itu dulu sebelum membangun
modul kana berikutnya, jangan menemukan ulang hal yang sama). Titik
paling penting untuk diingat: `V21_PHASE_CODE_BY_STAGE` akan BENTROK
kalau dipakai mentah oleh modul kedua (F1 hiragana dan F1 katakana
sama-sama jadi phase_code "P1") — selalu lewat `resolvePhaseCode()`
(`app/lib/katakana-data.ts`), dan modul ketiga harus menambah cabangnya
sendiri di situ, bukan menimpa map yang sama. Mnemonik katakana **belum
ditulis** (fallback generik aktif, sesuai instruksi "belum wajib").
9 pasangan huruf katakana yang sering tertukar ditambahkan ke
`kana_confusion_pairs` (ク/ワ, ク/タ, ノ/メ, ノ/ヌ, メ/ヌ, フ/ラ, ワ/ラ,
コ/ユ, チ/テ) — total 14 pasangan katakana sekarang. `/ulangi` dan
`/progres` sudah menampilkan katakana (dibuktikan lewat data nyata, bukan
cuma baca kode) — `/latihan` (speed drill) **belum**, masih hiragana-only,
lihat gap list di `docs/POLA-MODUL-BARU.md`.

Nama produk yang **terlihat pengguna** sekarang **"BaraJapan"** (diganti dari
"Japanese Lingo Path" per permintaan pemilik). Repo, folder, domain Vercel,
nama tabel database, dan nama variabel kode **sengaja tidak diubah** —
tetap "japanese-lingo-path"/"Japanese Lingo Path" di sana, itu bukan
kelalaian. `public/og.png` (gambar OG untuk share sosial media) juga masih
memuat logo lama secara visual — belum diganti, lihat Bagian 4 poin 14.

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
  tiap subskill kritis minimal 75%. **Sudah diimplementasikan — posisinya
  penting, sempat salah sekali, baca kotak di bawah.**
- Transfer gate: minimal 3 dari 4 aspek rubric tanpa bantuan yang membocorkan
  jawaban

> ⚠️ **Posisi retention gate: SETELAH BOSS, bukan sebelum F5.** Implementasi
> pertama (23 Agustus 2026) salah menaruh gerbang 72 jam di depan pintu masuk
> F5 — ditemukan dan diperbaiki 24 Agustus 2026. Posisi yang benar (V2.1
> Bagian 4.1 + 9.2 langkah 7): F1→F5 hanya checkpoint langsung ≥80%, tanpa
> jeda; BOSS (Hiragana Gate 46) juga langsung, ≥80%, **belum** memberi status
> "dikuasai"; baru **setelah** BOSS ada stage baru **`RETENTION`**
> (`learning_stages.code`, `order_index` disisipkan di antara BOSS dan F6)
> yang menutup pintu 72 jam sejak BOSS pertama lolos
> (`user_learning_stage_progress.first_completed_at` milik BOSS — kolom ini
> beda dari `completed_at`, yang tertimpa tiap kali stage diulang; jangan
> pernah pakai `completed_at` untuk "kapan PERTAMA kali lolos"), lalu
> mengambil sampel dari **seluruh 46 huruf** dan butuh ≥85% first-attempt
> tanpa hint. Lolos `RETENTION` itulah yang menandai
> `user_learning_module_progress.status = 'completed'` ("dikuasai") **dan**
> yang membuka F6 (ekstensi dakuten) — bukan lolos BOSS saja.
>
> Mesinnya (`evaluateDelayedGateEligibility` + `evaluateRetentionScore`,
> `gate-logic.ts`) generik lewat `learning_stages.configuration.
> delayedGateHours` + `.retentionGate` — kalau perlu gerbang tertunda serupa
> di modul lain, pakai ulang lewat konfigurasi, jangan tulis mesin baru.
> **Gerbang ini ditegakkan di DUA lapis**: halaman (`pre-n5-01-query.ts`
> menampilkan layar "Belum waktunya kembali" alih-alih redirect diam) **dan**
> server action `completeHiraganaStage` sendiri (menolak memproses kalau
> gerbang belum terbuka, terlepas dari apa yang diklaim caller) — sempat
> hanya lapis pertama yang ada, celah itu tertutup 24 Agustus 2026 setelah
> ditemukan lewat test yang memanggil server action langsung.

**Hint ladder V2.1 3 tingkat — sudah diimplementasikan** (24 Agustus 2026,
`HiraganaLearningLab.tsx`'s `RetrievalStep`): `hintLevel` 0/1/2/3 — (1) orientasi:
jumlah goresan + teks cue, tidak menunjukkan bentuk; (2) sebagian: animasi
goresan pertama saja; (3) model: animasi lengkap + guided retry
(`KanaWritingCoach`'s built-in outline, dipicu hanya di level 3, bukan 2).
**Reset retrieval juga sudah ada:** item yang pakai hint di-antre ulang 2–4 item
kemudian di fase yang sama (queue-based, lihat `requeueAfterHint`), tanpa hint
lagi — hanya keberhasilan tanpa hint di percobaan itu yang menaikkan
`freeWrittenKanaIds`. Bukti tersimpan di database lewat kolom `hint_level`,
`assisted`, `first_attempt_correct` pada `user_kana_attempts` (ditambahkan
23–24 Agustus 2026, nullable/aditif) — bukan lagi hanya state React.

#### Kana Script Engine — bukan F1–F5, dan sudah diimplementasikan

Bagian 7, urutan: lihat-dengar (anchor) → bedakan (minimal contrast) → ikuti
stroke (guided) → tulis dari memori singkat (ghost trace) → tulis dari audio
→ **baca mora/kata pendek** → campuran kumulatif. **Semua tujuh langkah per-
karakter sudah diimplementasikan** di `HiraganaLearningLab.tsx` sebagai fase
`anchor` → `discriminate` → `guided` → `shortMemory` → `recall` → `read` →
`checkpoint` (langkah `read`/"Baca" ditambahkan 24 Agustus 2026, PROMPT-6
Bagian 4 — lihat Bagian 4 poin 15 di atas). Enam fase pertama dijalankan
**per-round** (semua item di satu kelompok lewat satu fase dulu, baru pindah
fase) — bukan satu item lewat semua fase lalu pindah item — supaya reset
retrieval (di atas) punya item lain untuk diselipkan; `read` sedikit beda:
kata (bukan karakter tunggal) dari `bundle.readWords`, 3 kata per unit,
diprioritaskan yang memuat huruf baru unit ini. Retention (gerbang tertunda,
di luar alur per-karakter ini) dibahas terpisah di bawah.

Kode stage database (F1–F5, BOSS) **belum diganti nama** jadi P1–P5 seperti
istilah V2.1 — pemetaan kode↔istilah ada di `V21_PHASE_CODE_BY_STAGE`
(`hiragana-mnemonics.ts`). Stage yang tidak ada di peta itu (F6–F12, RETENTION)
memakai kode stage-nya sendiri sebagai `phase_code`.

Chunking PRE-N5.01 sudah ditentukan sampai hurufnya (Bagian 7) **dan sudah
diimplementasikan persis sesuai tabel ini** (`pre-n5-01-query.ts`'s
`defaultScopes` + baris `learning_stages.configuration`):

| Fase | Kode stage | Huruf | Jumlah |
|---|---|---|---|
| P1 | F1 | あいうえお + かきくけこ | 10 |
| P2 | F2 | さしすせそ + たちつてと | 10 |
| P3 | F3 | なにぬねの + はひふへほ | 10 |
| P4 | F4 | まみむめも + やゆよ + らり | 10 |
| P5 | F5 | るれろわをん | 6 |

Tiap fase dipecah jadi pelajaran 5 huruf (F5 jadi 3+3) — pembelahan genap ini
ada di `buildUnits()`, **bukan** ikut kolom `group_code`/`order_in_group` di
`kana_characters` (kolom itu tidak berurutan bersih untuk keperluan ini,
sudah diverifikasi lewat query langsung). Setelah P2 checkpoint memakai bank
20; setelah P3 bank 30; P4 bank 40; final bank 46.

**Ekstensi dakuten/handakuten/youon — dibuka setelah core 46, sudah
diimplementasikan** (7 stage baru, 24 Agustus 2026, `learning_stages.code`
F6–F12, `order_index` 8–14 setelah RETENTION):

| Stage | Isi | Jumlah |
|---|---|---|
| F6 | が-baris + ざ-baris (dakuten) | 10 |
| F7 | だ-baris + ば-baris (dakuten) | 10 |
| F8 | ぱ-baris (handakuten) | 5 |
| F9 | きゃ/ぎゃ/しゃ-baris (youon) | 9 |
| F10 | じゃ/ちゃ/にゃ-baris (youon) | 9 |
| F11 | ひゃ/びゃ/ぴゃ-baris (youon) | 9 |
| F12 | みゃ/りゃ-baris (youon) | 6 |

Sokuon (っ) **sengaja tidak** dimasukkan fase ini — datanya ada dan lengkap di
database, tapi tidak diminta di prompt yang membangunnya. Mesin belajarnya
**dipakai ulang 100%** dari core 46 lewat `configuration.characterSet`
(`'core46'` default / `'dakuten_handakuten'` / `'youon'`) di
`pre-n5-01-query.ts` — jangan bangun ulang mesin terpisah untuk konten ini.

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

1. ~~Antrean review tidak ada.~~ **Sudah ada** (24 Agustus 2026, PROMPT-6
   Bagian 3) — `/ulangi` sekarang query nyata (`app/lib/review-query.ts`):
   ambil item `user_kana_mastery.due_at` yang sudah lewat (lintas
   kurikulum V1/V2/V2.1, sengaja tidak difilter — SRS per-karakter tidak
   peduli kurikulum mana yang mengajarkannya), batas 40/hari, prioritas
   dari sinyal nyata (salah tanpa bantuan, benar-tapi-dibantu, lambat,
   pasangan confusable yang juga jatuh tempo, gagal RETENTION), dan
   "minimum viable review" (top-up dari huruf terlemah kalau yang jatuh
   tempo terlalu sedikit, supaya sesi tidak pernah kosong). Latihannya
   pakai ulang `HiraganaQuiz` (mesin yang sama dengan F1-F12/BOSS), disimpan
   lewat `recordHiraganaAttempt` yang sudah ada (dipanggil dengan
   `phaseCode: "review"` → `exercise_type` jadi `v21_review_*`) — tidak ada
   action baru untuk ini. `/beranda` juga menampilkan ringkasan jatuh tempo
   sekarang (dulu tidak ada sama sekali, bukan cuma dead number).
2. ~~Retention gate tidak ditegakkan.~~ **Sudah ditegakkan** (24 Agustus
   2026) — stage `RETENTION` setelah BOSS, dua lapis (halaman + server
   action). Lihat kotak peringatan posisi gerbang di Bagian 3 file ini.
3. **Status glyph pipeline tidak diketahui.** Kode perbaikan
   (`scripts/fetch-kana-stroke-data.ts`, `STROKE_INDEX_OVERRIDES`) masih utuh,
   tapi klaim "211 karakter terverifikasi" berasal dari perbandingan jumlah
   stroke — yang menurut Bagian 5 tidak membuktikan apa pun. V2.1 menyebut あ dan
   お secara eksplisit sebagai template wajib uji ulang. **Anggap belum
   terverifikasi sampai ada render visual dari aplikasi yang berjalan.**
4. **Mnemonik kemungkinan tampil terlalu awal**, dan field `story`-nya templat
   identik untuk semua 66 entri. V2.1 Bagian 9 mensyaratkan mnemonik sebagai cue
   opsional **setelah** pengguna mencoba mengingat.
5. ~~First-attempt tidak tercatat sebagai data.~~ **Sudah tercatat** (24
   Agustus 2026) — `first_attempt_correct`/`hint_level`/`assisted` di
   `user_kana_attempts` (nullable, null untuk semua baris lama by design).
6. **Skema V2.1 sebagian ada.** `curriculum_version`, `hint_level`,
   `first_attempt_correct` **sudah ada** (24 Agustus 2026, di
   `user_kana_attempts`). Masih tidak ada: `content_version`,
   `engine_version`, `support_level`, `confidence`, `actual_interval`. Yang
   mirip: `srs_interval_days` (≈`scheduled_interval`), `response_time_ms`
   (≈`latency_ms`). Daftar lengkap yang dituntut ada di V2.1 Bagian 11.1.
7. **Skor tulisan tangan satu angka, disimpan sebagai string**
   (`typed_value = 'writing-score:82'`). Tidak bisa di-query.
8. **Placement test tidak ada.** V2.1 Bagian 12 butir 4 mensyaratkannya untuk
   memberi credit ke pengguna aktif saat migrasi.
9. ~~Landing page tidak sinkron~~ **Sudah diperbaiki** (24 Agustus 2026,
   PROMPT-6 Bagian 7) — sekarang "Pre-N5 · 11 modul", angka nyata (bukan
   query live: tabel `learning_modules` RLS-nya `to: authenticatedRole`
   saja, jadi query dari halaman publik yang belum login diam-diam
   mengembalikan 0 baris — ditemukan langsung waktu diverifikasi di
   browser, sempat menampilkan "0 modul" sebelum diperbaiki. Membuat
   query itu benar-benar live butuh keputusan keamanan: apakah metadata
   kurikulum boleh dibaca publik (`anon` role). Itu keputusan pemilik,
   bukan sesuatu yang diubah sepihak di sesi ini — lihat Bagian 4 poin 14).
10. ~~Dua jalur `learningFlow` coexist.~~ **Jalur legacy sudah dihapus**
    (24 Agustus 2026) — dikonfirmasi tidak pernah aktif di database
    (`configuration->>'learningFlow'` selalu `null` untuk semua stage) sebelum
    dihapus.
11. **`user_kana_gate_results` 0 baris** — tabel ada, tidak dipakai kode mana pun.
12. ~~Belum ada suite E2E berulang.~~ **Sudah ada** (23–24 Agustus 2026):
    `playwright.config.ts` + `tests/e2e/*.spec.ts` + `tests/unit/*.spec.ts`,
    jalankan dengan `npx playwright test` (lihat Bagian 10). Termasuk
    pendekatan yang lebih kuat dari sekadar klik UI: `tests/support/
    serverActions.ts` memanggil server action Next.js **langsung** (replay
    protokol HTTP asli, ID action dibaca dari `server-reference-manifest.json`
    hasil build — jangan pernah di-hardcode, berubah tiap build) dengan data
    evaluasi tulisan tangan buatan, tanpa perlu menggambar sungguhan di
    kanvas. Ini yang membuktikan Ikuti/Uji/RETENTION benar di level
    penyimpanan data — bukan bukti bahwa pengenalan tulisan tangan terasa
    baik untuk manusia, itu tetap butuh dicoba manual.
13. **Status deployment Vercel tidak terverifikasi.** Hanya inferensi dari git
    sync; akses API Vercel gagal di sesi audit.
14. **Konten kurikulum (`learning_modules`, `kana_characters`, dst.) tidak
    bisa dibaca pengguna yang belum login** — RLS-nya `to: authenticatedRole`
    saja (lihat `readByAuthenticated()` di `db/schema/kana.ts`). Ini
    berdampak nyata ke landing page publik (poin 9 di atas) dan ke `og.png`
    (masih logo "Japanese Lingo Path" lama secara visual — ganti nama di
    Bagian 6 PROMPT-6 sengaja tidak menyentuh gambar, "jangan buat logo baru
    sendiri"). Kalau landing page butuh data live dari database di masa
    depan, ini yang harus diputuskan dulu: buka `anon` read untuk tabel
    konten tertentu, atau tetap pakai angka statis yang diperbarui manual.
15. ~~Langkah "Baca" (V2.1 §7) tidak ada.~~ **Sudah ada** (24 Agustus 2026,
    PROMPT-6 Bagian 4) — langkah ke-7 di `HiraganaLearningLab.tsx`, di
    antara "Dengar & Tulis" dan "Uji". Sumber kata: `kana_example_words`,
    disaring supaya SETIAP huruf dalam kata sudah ada di bank aktif
    (`getReadWordsForCharacters` di `pre-n5-01-query.ts` — subset-check
    dua tahap, bukan sekadar "kata ini terhubung ke huruf ini"). Data
    ternyata cukup di semua batch tanpa perlu kombinasi mora buatan (13
    kata untuk F1's 10 huruf pertama, naik ke 62 untuk 46 huruf penuh —
    lihat laporan PROMPT-6). Disimpan lewat action baru
    `recordReadAttempt` (bukan `recordHiraganaAttempt` — kata punya
    banyak `kana_id`, bukan satu, jadi tidak cocok dengan bentuk lama;
    `user_kana_attempts.word_id` dipakai, `kana_id` null untuk baris ini),
    `exercise_type` berprefix `v21_read_`, memperkuat mastery skill
    `"reading"` untuk SEMUA huruf dalam kata itu sekaligus.
16. **Peta penguasaan 46 huruf sudah ada** (24 Agustus 2026, PROMPT-6
    Bagian 5) — `/progres` (dulu 100% mock: "Vocabulary 42%, Grammar 31%,
    ..." untuk fitur yang tidak pernah dibangun). Status 5 tingkat
    diturunkan di `app/lib/mastery-tier.ts`, cara turunnya didokumentasikan
    di sana dan di laporan PROMPT-6 — belum ada kolom status di database,
    ini derivasi dari `attempts`/`accuracy`/`streak`/`srs_interval_days`
    dan bukti lolos RETENTION tanpa bantuan.
17. **Sakelar mode dev ada** (24 Agustus 2026, PROMPT-6 Bagian 2) —
    `NEXT_PUBLIC_DEV_UNLOCK_ALL=true` aktif di Production Vercel sekarang,
    supaya pemilik bisa lompat ke tahap mana pun tanpa menyelesaikan
    prasyarat atau menunggu gerbang 72 jam. Baca `app/lib/dev-mode.ts` —
    satu fungsi (`isDevUnlockAllActive`), dipakai di dua tempat yang
    HARUS tetap sinkron: `pre-n5-01-query.ts` (kunci halaman) dan
    `actions.ts`'s `completeHiraganaStage` (kunci server action, supaya
    tidak bisa dilewati dengan memanggil action langsung). Label "MODE DEV"
    tampil di layar (`DevUnlockBanner`) kapan pun sakelar ini aktif — kalau
    banner itu tidak muncul tapi tahap tetap kebuka semua, itu bug.
    **Sebelum rilis komersial: hapus/matikan env var ini di Vercel
    (`vercel env rm NEXT_PUBLIC_DEV_UNLOCK_ALL production`, atau set ke
    apa pun selain `"true"`), lalu redeploy.** Logika penguncian aslinya
    tidak disentuh — mati otomatis begitu sakelar mati.

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

Catatan: narasi Indonesia ada di dua tempat sekarang — V1 (M01) lewat
`lesson_content_blocks.narration_url`, dan V2 lewat `sensei_segments.
narration_url` (PROMPT-9, Mesin Sensei) untuk PRE-N5.01 (module_intro,
5 phase_intro, 2 concept_moment, 46 narasi writing_demo) serta
module_intro PRE-N5.02/03. Dua tabel terpisah, dua pipeline generate
terpisah (`generate-narration.ts` vs `generate-sensei-narration.ts`)
tapi model/suara/pola upload yang sama persis — lihat Bagian atas file
ini untuk detail Mesin Sensei.

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
   trace, dan scoring; perbaiki あ/お dan golden tests. **Belum dikerjakan.**
2. ~~Mastery evidence model~~ — **sebagian besar sudah** (24 Agustus 2026):
   unaided retrieval vs hint usage terpisah dan tersimpan
   (`first_attempt_correct`/`hint_level`/`assisted`), delayed retention ada
   (`RETENTION` stage). Yang belum: transfer gate (Bagian 4.1's "3 dari 4
   aspek rubric") sama sekali belum ada bentuknya.
3. ~~Hint ladder + retry semantics~~ — **sudah** (24 Agustus 2026), 3 tingkat +
   reset retrieval. Lihat Bagian 3.
4. ~~Cumulative phase graph~~ — **sudah**, termasuk ekstensi dakuten/
   handakuten/youon (F6–F12). Lihat Bagian 3.
5. **Explainable handwriting score** — **belum**, masih satu angka gabungan
   dari `@k1low/kakitori` (`writing-score:NN` di kolom `typed_value`, string,
   tidak bisa di-query). Tidak disentuh sesi 23–24 Agustus 2026 — eksplisit
   di luar cakupan prompt yang mengerjakannya.
6. **Curriculum versioning** — **sebagian**: kolom `curriculum_version`
   sekarang ada di `user_kana_attempts` (isi `'v2.1'` untuk attempt baru,
   `null` untuk lama), tapi V1 dan V2/V2.1 masih **berbagi** tabel
   attempt/mastery yang sama, dibedakan lewat prefix `exercise_type`
   (`v2_f1_*` lama, `v21_*` baru) — bukan lewat kolom versi itu sendiri untuk
   baris lama. Migrasi struktural yang lebih dalam belum dikerjakan.

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

### Test Playwright (E2E + unit), sejak 23–24 Agustus 2026

```bash
npx tsx scripts/auth-setup.ts   # sekali di awal, atau kalau sesi kedaluwarsa (~1 jam)
npm run dev                     # di terminal terpisah, biarkan berjalan
npx playwright test             # semua test, tests/e2e/*.spec.ts + tests/unit/*.spec.ts
npx playwright test tests/e2e/retention-gate.spec.ts   # satu file saja
```

`workers: 1` di `playwright.config.ts` **sengaja**, jangan dihapus — beberapa
test menembak server action lewat `tests/support/serverActions.ts`, yang
membaca ID action dari `.next/dev/server/**/server-reference-manifest.json`
hasil `npm run dev` yang sedang berjalan (bukan hasil `npm run build`, path
beda). Semua test memakai akun E2E khusus (`E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`
di `.env.local`) lewat `tests/support/db.ts` — **tidak pernah** menyentuh baris
milik 4 pengguna Google OAuth asli.

### `npm run build` di komputer lokal

`app/dev/kana` membutuhkan `DATABASE_URL_POOLED` saat build. Kalau baris itu tidak
ada di `.env.local`, `npm run build` gagal padahal kodenya sehat. Isi saja dengan
nilai yang sama seperti `DATABASE_URL` — untuk lokal, session pooler cukup.
Production memakai nilai transaction pooler sendiri di Vercel.