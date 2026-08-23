# Kondisi Nyata Proyek — Audit 2026-08-23

Audit murni, tidak ada perubahan kode. Semua temuan diverifikasi langsung
(query database sungguhan lewat `DATABASE_URL`, baca kode di disk, curl ke
production) — bukan dibaca dari `CLAUDE.md` atau memori sesi sebelumnya.
`CLAUDE.md` di root repo sudah SANGAT usang (menggambarkan versi paling awal
proyek — satu file `app/page.tsx` 388 baris, tanpa database) dan tidak
mencerminkan kondisi sekarang sama sekali; abaikan isinya.

**Peringatan penting untuk pembaca:** sesi sebelumnya (Codex) membangun
sistem kurikulum V2 yang PARALEL dengan sistem lama (M01-M05) yang dibangun
sesi-sesi sebelum itu. Kedua sistem masih hidup di database dan di kode.
Halaman aktif (`/belajar`, `/beranda`) sekarang membaca V2. Laporan ini
membedakan keduanya secara eksplisit di setiap bagian.

---

## 1. Versi yang Live

**Commit terakhir di `main`:**
```
ce85a8f5aefdf8a976b271faad4c3010cb83fcfe
Codex <codex@openai.com>
2026-08-23 18:11:30 +0700
feat: expand hiragana path to cumulative 46
```

**Branch:** `main` adalah satu-satunya branch aktif. `origin/main` == `main`
lokal persis (0 commit beda di kedua arah) — semua yang tercatat sudah
ter-push.

Ada 11 branch lokal lain (`feat/connect-kana-system`, `feat/first-lesson`,
`feat/kana-components`, `feat/kana-schema`, `feat/kana-seed`,
`feat/m01-content`, `feat/moji-visual-refresh`, `feat/public-landing`,
`feat/supabase-auth`, `fix/drizzle-config-env`, `refactor/routing-skeleton`)
— **semuanya sudah ter-merge ke `main`** (diverifikasi dengan
`git merge-base --is-ancestor` satu per satu). Ini sisa pointer branch lama
dari awal proyek, tidak ada kerja yang belum di-merge di dalamnya.

**Perubahan belum di-commit di working tree** (3 file, 148 baris):
- `app/(app)/belajar/pre-n5/[moduleCode]/[stageCode]/HiraganaLearningLab.tsx`
- `app/(app)/belajar/pre-n5/[moduleCode]/page.tsx`
- `app/globals.css`

Ini pekerjaan yang sedang berjalan (in-progress), **tidak ter-push, tidak
ada di production**. Kalau sesi berikutnya melanjutkan kerja ini, perubahan
ini masih di sana menunggu commit.

**Production (`https://japanese-lingo-path.vercel.app`):**
- `git log` lokal == `origin/main` persis, dan riwayat sebelumnya di sesi
  ini sudah mengonfirmasi Vercel auto-deploy dari push berjalan — jadi
  production **kemungkinan besar** mencerminkan `ce85a8f`. Saya tidak
  punya akses API Vercel yang berfungsi di sesi ini untuk konfirmasi
  deployment ID secara langsung (dicoba, dapat 404 pada
  `get_deployment`/akses proyek kosong) — jadi status deployment EXACT
  adalah **UNKNOWN**, hanya inferensi dari git sync.
- **Landing page MASIH menyebut "Pre-N5 · 5 modul"** — dikonfirmasi lewat
  curl langsung ke production, teks persis: *"Fondasi Bahasa Jepang untuk
  Pemula · 5 modul"*. Ini teks lama yang saya tulis untuk sistem M01-M05,
  **tidak diperbarui** untuk mencerminkan 11 modul PRE-N5.01-PRE-N5.11 versi
  V2. Sumbernya: `app/(marketing)/page.tsx`, hardcode string, tidak dibaca
  dari database sama sekali baik versi lama maupun V2.
- Halaman `/belajar` dan `/beranda` yang sebenarnya (butuh login) **tidak
  bisa saya verifikasi visual di production** — perlu login Google OAuth
  yang tidak saya punya di sesi ini.

---

## 2. Database — Hasil Query Sungguhan

Semua di bawah ini hasil `SELECT` langsung ke `DATABASE_URL` dari
`.env.local`, bukan dibaca dari skema Drizzle.

### a) Semua tabel + jumlah baris

| Tabel | Baris |
|---|---|
| curriculum_levels | 1 |
| curriculum_versions | 1 |
| kana_characters | 220 |
| kana_confusion_pairs | 21 |
| kana_example_words | 137 |
| kana_lesson_items | 868 |
| kana_lessons | 248 |
| kana_modules | 5 |
| kana_phases | 64 |
| kana_word_characters | 370 |
| learning_module_prerequisites | 19 |
| learning_modules | 11 |
| learning_stages | 63 |
| lesson_content_blocks | 198 |
| lesson_exercises | 257 |
| profiles | 4 |
| user_kana_attempts | 494 |
| user_kana_gate_results | 0 |
| user_kana_lesson_progress | 27 |
| user_kana_mastery | 108 |
| user_learning_module_progress | 1 |
| user_learning_stage_progress | 3 |

22 tabel total. Tidak ada tabel konten khusus untuk V2 (mis. "learning
exercises" atau "learning content") — konten unit V2 (kata mana, urutan
karakter mana) ada di **kode**, bukan database (lihat Bagian 3).

### b) Isi kurikulum, dikelompokkan

**Sistem lama (`kana_modules`) — kode M01-M05:**

| Kode | Judul | Fase | Lesson |
|---|---|---|---|
| M01 | Orientasi Bahasa Jepang | 1 | 4 |
| M02 | Hiragana Dasar | 21 | 75 |
| M03 | Katakana Mastery | 22 | 81 |
| M04 | Angka & Informasi Dasar | 10 | 41 |
| M05 | Sapaan & Bahasa Jepang Sosial | 10 | 47 |

Total 248 lesson — **utuh, tidak berubah** sejak sesi sebelumnya.

**Sistem baru (`learning_modules`) — kode PRE-N5.01 s/d PRE-N5.11:**

| Kode | Judul | Tipe | Status |
|---|---|---|---|
| PRE-N5.01 | Hiragana Path: 46 Huruf Dasar | SCR | **ready** |
| PRE-N5.02 | Katakana Master | SCR | scaffold |
| PRE-N5.03 | Angka, Waktu & Counter | VOC | scaffold |
| PRE-N5.04 | Sapaan & Ungkapan Dasar | FUN | scaffold |
| PRE-N5.05 | Kosakata Dasar 100 | VOC | scaffold |
| PRE-N5.06 | Kata Ganti & Kosakata Lokasi | VOC | scaffold |
| PRE-N5.07 | Partikel Dasar は・が・の | GRA | scaffold |
| PRE-N5.08 | Kalimat Polite です・ます | GRA | scaffold |
| PRE-N5.09 | Partikel Lokasi に・で・へ | GRA | scaffold |
| PRE-N5.10 | Listening Pre-N5 | LIS | scaffold |
| PRE-N5.11 | Boss: Pre-N5 Mastery | BOS | scaffold |

**Hanya PRE-N5.01 yang `status = 'ready'`. 10 modul lainnya `scaffold`** —
strukturnya ada (masing-masing 6 `learning_stages`: F1-F5 + BOSS, kecuali
PRE-N5.11 yang punya A1-A3), tapi tidak ada bukti kontennya sudah diisi.
`learning_module_prerequisites` (19 baris) mendefinisikan graph prasyarat
antar modul (mis. PRE-N5.11 butuh 1-10 semua lulus).

Kode modulnya memang **dua-duanya ada sekaligus**: M01-M05 (sistem lama,
masih di database, tidak dihapus) DAN PRE-N5.01-11 (sistem baru). Bukan
salah satu — literally kedua skema hidup berdampingan.

### c) Skema kolom lengkap

**`user_kana_attempts`:** id, user_id (uuid), kana_id, word_id, lesson_id,
exercise_type (text), is_correct (boolean), selected_option_id,
correct_option_id, response_time_ms, created_at, typed_value (text)

**`user_kana_mastery`:** user_id (uuid), kana_id, skill (enum), attempts,
correct, accuracy (real), streak, srs_interval_days, srs_ease (real),
due_at (timestamptz), last_seen_at (timestamptz)

**`user_kana_lesson_progress`:** user_id (uuid), lesson_id, status (text),
score_json (jsonb), attempts, completed_at (timestamptz)

**`lesson_content_blocks`:** id, lesson_id, order_index, block_type (enum),
content (jsonb), created_at, narration_text (text), narration_url (text)

### d) Field V2.1 — ADA / TIDAK ADA

Dicek di SELURUH kolom seluruh tabel public, bukan cuma tabel yang disebut:

| Field | Status |
|---|---|
| `curriculum_version` | TIDAK ADA (yang ada: `curriculum_versions.code`, tabel terpisah, bukan kolom versi di tabel lain) |
| `content_version` | TIDAK ADA |
| `engine_version` | TIDAK ADA |
| `hint_level` | TIDAK ADA sebagai kolom DB — ada sebagai **state React** (`hintLevel`) di `HiraganaLearningLab.tsx`, tidak dipersist |
| `support_level` | TIDAK ADA |
| `confidence` | TIDAK ADA |
| `first_attempt_correct` (terpisah dari final) | TIDAK ADA — lihat Bagian 4 untuk penjelasan bagaimana ini ditangani (atau tidak) |
| `scheduled_interval` | TIDAK ADA sebagai nama kolom — yang ada `user_kana_mastery.srs_interval_days` (nama beda, konsep sama) |
| `actual_interval` | TIDAK ADA |
| `latency_ms` | TIDAK ADA sebagai nama kolom — yang ada `user_kana_attempts.response_time_ms` (nama beda, konsep sama) |

Kesimpulan: **skema V2.1 yang dirancang (dengan nama field persis di atas)
tidak pernah diimplementasikan di database ini.** Yang ada adalah skema V2
dengan pendekatan berbeda — nama tabel/kolom berbeda, dan beberapa konsep
(hint level, first-attempt) hidup sebagai state aplikasi, bukan kolom
database.

### e) Pemakaian nyata

**`user_kana_attempts`: 494 baris. `user_kana_mastery`: 108 baris.**
Ini BUKAN data kosong — ada pemakaian nyata. Rincian `exercise_type`:

| exercise_type | Jumlah | Sistem |
|---|---|---|
| writing | 111 | lama |
| v2_f1_write_from_audio | 77 | V2 |
| recall | 58 | lama |
| concept_mcq | 52 | lama |
| visual_to_sound | 48 | lama |
| v2_f1_trace | 43 | V2 |
| v2_f1_checkpoint | 28 | V2 |
| typing | 27 | lama |
| v2_f1_audio_visual | 23 | V2 |
| word_arrange | 9 | lama |
| dictation | 9 | lama |
| v2_f1_type_romaji | 6 | V2 |
| timed_recognition | 3 | lama |

317 attempt dari sistem lama, 177 dari V2 (semua masih berlabel `f1` —
tidak ada bukti F2-F5/BOSS pernah benar-benar dicoba). **3 user_id
berbeda** tercatat di `user_kana_attempts`; 4 baris di `profiles` (semua
login Google asli — Asro Zamir, Randii Anwarrr, Farrell Syaddad, dan satu
tanpa nama). `user_kana_lesson_progress` (sistem lama) juga terisi 27
baris nyata dari 2026-08-18 s/d 2026-08-21. `user_kana_gate_results` tetap
0 baris (tidak pernah dipakai kode manapun, lama maupun V2).

---

## 3. Kurikulum V2.1

**File `rancangan_modul_pre_n5_sampai_n1_v2_1_*` yang Anda sebut TIDAK ADA
di repo ini.** Yang ada adalah `docs/curriculum-v2/PRE_N5_FRAMEWORK.md`,
yang di baris pertamanya menyebut sumbernya sebagai
`rancangan_modul_pre_n5_sampai_n1.pdf` (tanpa akhiran "v2_1") — PDF itu
sendiri juga tidak ada di repo, hanya disebut sebagai referensi. Kalau
dokumen "v2.1" yang Anda maksud adalah revisi terpisah dari yang
diringkas di `PRE_N5_FRAMEWORK.md`, dokumen itu belum pernah masuk repo.

- **Format ID `PRE-N5.01` dst. sudah dipakai** — nyata di kode
  (`learning_modules.code`, route `/belajar/pre-n5/[moduleCode]`) dan di
  data (`learning_modules` table, `user_learning_module_progress`).
- **244 lesson lama (M01-M05) masih utuh** di `kana_modules`/`kana_lessons`
  — dikonfirmasi lewat query Bagian 2b. (Catatan: hitungan "244" dari
  laporan sesi sebelumnya adalah M02-M05 saja; M01 4 lesson lagi
  menjadikannya 248 total kalau M01 disertakan — keduanya benar,
  tergantung apakah M01 dihitung.)
- **File migrasi/rencana migrasi**: `docs/curriculum-v2/PRE_N5_FRAMEWORK.md`
  berisi "Keputusan migrasi" (bagian naratif, bukan skrip) yang menyatakan
  eksplisit: kurikulum lama TIDAK dihapus pada tahap kerangka, progres V1
  TIDAK dipetakan otomatis ke V2, dan V1 baru boleh dihapus permanen
  setelah PRE-N5.01 lulus verifikasi end-to-end dan rollback V2 terbukti.
  Tidak ada skrip migrasi data (SQL/TS) yang saya temukan — ini murni
  keputusan kebijakan tertulis, bukan alat otomatis.
- **Namespace terpisah**: ya, cukup bersih di tiga lapis — database
  (`curriculum_versions`/`curriculum_levels`/`learning_modules`/
  `learning_stages`/`user_learning_module_progress`/
  `user_learning_stage_progress` vs `kana_modules`/`kana_phases`/
  `kana_lessons`/dst), kode (`app/lib/curriculum-v2.ts` +
  `app/lib/pre-n5-01-query.ts` vs `app/lib/module-query.ts` +
  `app/lib/lesson-query.ts` + `app/lib/learner-stats.ts`), dan route
  (`/belajar/pre-n5/*` vs `/belajar/kana/*`). **Kecuali**: V2 SENGAJA
  reuse `kana_characters`, `kana_example_words`, file stroke
  (`public/kana-strokes/*.json`), dan audio VOICEVOX dari sistem lama —
  juga menulis ke tabel `user_kana_attempts`/`user_kana_mastery` YANG
  SAMA dengan sistem lama (dibedakan lewat prefix `v2_f1_*` di
  `exercise_type`, bukan tabel terpisah).

---

## 4. Fitur

| Fitur | Status | Bukti |
|---|---|---|
| Antrean review query `due_at` | **TIDAK ADA** | `app/(app)/ulangi/page.tsx` — 100% hardcode dari `app/lib/mock-data.ts` (`reviewSummary = { dueNow: 12, learning: 28, mastered: 64 }`, array `items` 3 baris hardcode). Tombol "Start review" cuma memicu toast "Spaced-repetition logic will be connected later." Ironisnya `user_kana_mastery.due_at` **sungguhan terisi** dengan tanggal masa depan yang benar (lihat Bagian 2e) — datanya ada, tidak ada satu baris kode pun yang membacanya kembali. |
| Placement test | **TIDAK ADA** | Nol hasil grep untuk "placement" di seluruh `app/`. |
| Hint ladder (bantuan bertahap) | **SEBAGIAN** | `HiraganaLearningLab.tsx` — `hintLevel` 0/1/2 (tanpa bantuan → petunjuk goresan+teks → animasi lengkap). Kalau hint dipakai (`hintLevel > 0`), hasil tetap dicatat ke `user_kana_attempts` tapi `recallPassed` dipaksa `false` (baris 349-352) — tidak dihitung sebagai penguasaan sampai diulang tanpa bantuan. Ini logika di memori komponen (state React), bukan kolom database — hilang kalau halaman di-refresh di tengah proses. |
| first_attempt terpisah dari final | **TIDAK ADA sebagai data** | Tidak ada kolom `first_attempt_correct` di database (dikonfirmasi 2d). Yang paling dekat: efek "hint dipakai → tidak dihitung mastery" di atas, tapi itu logika klien sesaat, bukan field yang bisa di-query nanti. |
| Retention gate (uji tertunda 3-7 hari) | **SEBAGIAN, secara fungsional TIDAK ADA** | `actions.ts` punya `SRS_INTERVALS = [1, 3, 7, 14, 30]` dan menulis `due_at` masa depan yang BENAR ke `user_kana_mastery` (dikonfirmasi data nyata di 2e). Tapi stage "F5 · SRS Retention" di `HiraganaStagePlayer.tsx` (baris 832-838) me-render `<HiraganaLearningLab>` **yang sama persis dengan F1-F4, di sesi yang sama, seketika** — tidak ada logika yang menahan/mengunci F5 sampai `due_at` sungguhan lewat. Penjadwalannya nyata, penegakannya tidak ada. |
| Validasi tulisan tangan dengan subskor terpisah | **SEBAGIAN** | `components/kana/KanaWritingCoach.tsx` pakai library sungguhan `@k1low/kakitori` (bukan palsu) — `KanaWritingOutcome = { score, matched, totalMistakes, attempts }`. **Satu skor gabungan**, bukan subskor terpisah (mis. skor urutan goresan vs bentuk vs arah sebagai angka-angka berbeda). Skor ini lalu dijejalkan sebagai STRING ke `user_kana_attempts.typed_value` (mis. `'writing-score:82'`) — bukan kolom numerik sendiri. |
| Narasi audio bahasa Indonesia | **TIDAK ADA di V2** | V2 (`app/lib/pre-n5-01-query.ts`) reuse `kana_characters.audio_url`/`kana_example_words.audio_url` — itu audio JEPANG (VOICEVOX, untuk pengucapan karakter/kata), bukan narasi Indonesia. Narasi Indonesia (OpenAI TTS, `lesson_content_blocks.narration_url`) hanya ada di sistem LAMA (M01), yang sudah di luar jalur navigasi aktif. |
| Mnemonik | **JALAN** | `app/lib/hiragana-mnemonics.ts` — 66 entri (`HIRAGANA_LAB_MNEMONICS`), tiap karakter punya emoji, anchor word Jepang asli (mis. あ = あめ/ame/hujan), sound cue, shape cue, stroke cue. Konten nyata per-karakter, bukan generik — kecuali field `story` yang templat sama untuk semua ("Kata nyata menjadi pegangan awal..."). Dipakai aktif di `HiraganaLearningLab.tsx`. |
| Verifikasi E2E dengan login terprogram | **SEBAGIAN, terbukti pernah jalan** | `scripts/auth-setup.ts` (dibangun sesi ini, sebelum Codex mengambil alih) — login lewat Supabase Auth langsung, suntik cookie sesi persis format `@supabase/ssr`. **Terbukti PERNAH berhasil**: `.auth/storageState.json` baru (dimodifikasi 2026-08-23 20:47) dan `.auth/hiragana-anchor.png` (screenshot nyata halaman `/belajar/pre-n5/...` dengan user asli "claudetesting" login) — bukti konkret sesi login terprogram ini benar-benar berfungsi di lingkungan lain (kemungkinan dev lokal Codex, bukan production — `E2E_APP_URL` default ke `localhost:3000`). **Tidak ada suite verifikasi terulang** (`verify-screens.ts` seperti yang saya usulkan sebelumnya tidak pernah dibuat) — hanya satu screenshot manual dari versi "20 huruf" yang sudah usang (sebelum commit "expand ke 46"), dan tidak ada file `.spec.ts`/config Playwright sama sekali. |

**Soal "Ulangi 12" secara spesifik:** angka itu **hardcode**, bukan query.
Sumbernya `app/lib/mock-data.ts:13` — `export const reviewSummary: ReviewSummary = { dueNow: 12, learning: 28, mastered: 64 };`
— muncul di kartu "DUE NOW" pada halaman `/ulangi`
(`app/(app)/ulangi/page.tsx`). Catatan tambahan: badge angka di sidebar
nav (`AppShell.tsx`) SUDAH SENGAJA dihapus — ada komentar eksplisit di
kode (baris 10-12) yang menjelaskan kenapa: *"No 'due for review' badge
here — that needs a real SRS due-count query... showing a number would be
exactly the kind of guess this reskin was told not to make."* Jadi angka
"12" yang mungkin Anda ingat bukan dari badge sidebar (itu sudah tidak
ada), tapi dari isi halaman `/ulangi` itu sendiri.

---

## 5. Yang Rusak / Belum Terverifikasi

**Dari laporan sebelumnya (sesi saya sendiri), status sekarang:**

1. **あ/お/ぬ/る/の/め coretan cacat** — kode perbaikannya (`scripts/fetch-kana-stroke-data.ts`, `STROKE_INDEX_OVERRIDES`) masih utuh dan tidak disentuh sejak commit saya. File `public/kana-strokes/*.json` yang dihasilkan juga masih ada. V2 memakai file stroke yang SAMA (dikonfirmasi Bagian di atas) — jadi perbaikan ini ikut berlaku di V2 juga. **Belum pernah saya verifikasi visual di aplikasi sungguhan** (hanya lewat harness statis) — tapi setidaknya kodenya tidak mundur/hilang.
2. **Layout desktop kartu jawaban (Bagian 2)** — CSS di `app/globals.css` untuk `.exercise-runner`/`.exercise-runner__option--card` masih ada persis seperti saya tulis (untuk sistem LAMA saja — `/belajar/kana/*`). Karena rute ini sudah tidak ditautkan dari navigasi manapun, **kemungkinan besar tidak pernah dilihat pengguna nyata lagi** kecuali lewat URL langsung. Tidak relevan untuk V2 (V2 punya UI kartu/quiz sendiri di `HiraganaQuiz.tsx`/`HiraganaLearningLab.tsx` yang belum saya audit untuk masalah layout serupa).
3. **Alur mengetik (Bagian 3)** — perbaikan `KanaTypingInput`/`ExerciseRunner` masih utuh, dan DATA MEMBUKTIKAN dipakai (494 attempt termasuk 27 `typing`, 9 `dictation`, 9 `word_arrange` dari sistem lama). Tapi ini semua sebelum V2 mengambil alih navigasi — tidak ada bukti pengguna memakainya SETELAH V2 live.
4. **Variasi soal Mini Test (Bagian 4)** — sama, kodenya utuh, datanya membuktikan pernah dipakai (`word_arrange`, `dictation`, `timed_recognition` tercatat). Status sama seperti di atas: sudah tidak di jalur navigasi aktif.

**Temuan baru dari audit ini:**

5. **10 dari 11 modul V2 berstatus `scaffold`** — hanya struktur (`learning_stages` kosong-konten), belum ada bukti implementasi nyata seperti PRE-N5.01. Kalau pengguna mengeklik modul manapun selain Hiragana Path, kemungkinan besar akan menemukan halaman kosong atau error — **saya tidak verifikasi ini secara langsung** (butuh login), jadi UNKNOWN persisnya apa yang tampil, tapi status `scaffold` di database adalah sinyal kuat belum siap.
6. **`curriculum_versions.status = 'draft'`, `activated_at = null`** — secara data, V2 belum pernah "diaktifkan" secara formal, tapi kode (`getCurriculumV2ModuleSummaries`) sudah dipakai sebagai jalur AKTIF di `/belajar` dan `/beranda` tanpa syarat status ini. Ada jarak antara apa yang dikatakan tabel status dan apa yang sungguhan berjalan.
7. **Retention gate tidak ditegakkan** (dijelaskan di Bagian 4) — `due_at` terjadwal benar tapi tidak pernah dibaca kembali oleh kode manapun (baik F5 V2 maupun `/ulangi` lama).
8. **Skor tulisan tangan disimpan sebagai string di kolom yang salah niat** (`typed_value = 'writing-score:82'`) — bekerja, tapi rapuh untuk query/analisis nanti (butuh parsing string, bukan `WHERE score > 80`).
9. **Landing page pemasaran tidak sinkron** — masih bilang "5 modul" padahal sistem yang sekarang aktif punya 11 modul definisi (1 siap, 10 scaffold). Berpotensi membingungkan pengguna baru.
10. **3 file kerja belum di-commit** di working tree lokal (lihat Bagian 1) — kalau mesin ini restart/sesi hilang tanpa commit, perubahan itu hilang.
11. **Dua jalur `learningFlow` ("legacy" vs default) coexist** di `HiraganaStagePlayer.tsx` (baris 805-830) — sisa dari iterasi "20 huruf trial" vs "46 huruf" yang disebut riwayat commit, belum dibersihkan jadi satu jalur saja.
12. **E2E belum jadi suite berulang** — satu script login (`auth-setup.ts`) terbukti pernah berhasil sekali di luar sesi ini, tapi tidak ada `verify-screens.ts`, tidak ada `.spec.ts`, tidak ada CI. Di sesi SAYA sendiri, browser yang di-launch dari lingkungan kerja ini tidak bisa mempertahankan cookie sama sekali (dicoba menyeluruh: Chromium bundel vs Chrome sistem, sandbox vs `--no-sandbox`, HTTP vs HTTPS, situs eksternal sekalipun) — jadi verifikasi otomatis dari sesi kerja SAYA spesifik masih terblokir, meski terbukti bisa jalan di lingkungan lain.

---

## Build/Lint (diagnostik, bukan perbaikan)

`npx tsc --noEmit`: bersih. `npm run lint`: bersih. `npx next build`
(termasuk 3 file belum-commit di atas): sukses, 20 route ter-generate
termasuk `/belajar/pre-n5/[moduleCode]` dan `/belajar/pre-n5/[moduleCode]/[stageCode]`
baru berdampingan dengan `/belajar/kana/[moduleCode]` lama. Kondisi kode
di disk saat ini SEHAT secara build, terlepas dari kesenjangan fitur di
atas.
