# JAPANESE LINGO PATH — DOKUMEN SERAH TERIMA
### Untuk memulai sesi baru. Disusun 23 Agustus 2026.

Dokumen ini berisi kondisi **nyata** proyek — diverifikasi lewat query database
sungguhan, pembacaan kode di disk, dan curl ke production. Bukan dari ingatan
atau laporan yang mengklaim "selesai".

---

# 1. APA INI

**Japanese Lingo Path** — platform belajar bahasa Jepang **berbahasa Indonesia**,
dari pemula total sampai JLPT N1. Pemiliknya Asro Zamir.

Live di `https://japanese-lingo-path.vercel.app`
Repo: `github.com/AsroZamir/japanese-lingo-path` (private)
Lokal: `C:\Users\asroz\Japanese-Lingo-Path`

**Posisi pasar:** semua kompetitor besar (WaniKani, Bunpro, Renshuu, Anki,
Duolingo) berbahasa Inggris dan masing-masing hanya kuat di satu aspek —
review independen selalu menyimpulkan "pakai 5 aplikasi sekaligus". Dua celah
yang belum terisi: **bahasa Indonesia sebagai bahasa pengantar**, dan **satu
tempat yang menangani seluruh jalur belajar**.

**Latar belakang pemilik:** kuat di intuisi produk dan pemikiran kurikulum,
tapi latar belakang teknisnya tidak dalam. Butuh penjelasan bertahap dengan
bahasa yang mudah dipahami. Mengerjakan implementasi lewat Claude Code
(dan sempat lewat Codex).

---

# 2. BATAS AKSES — BACA INI DULU

Ini sumber hampir semua kesalahan verifikasi di proyek ini.

**Asisten di chat TIDAK BISA:**
- Membuka database Supabase (tidak ada kredensial di chat)
- Membuka dashboard Vercel
- Login ke aplikasi (Google OAuth tidak bisa diotomasi)
- Melihat halaman mana pun di balik login

**Yang BISA dilihat dari chat:** landing page publik saja.

**Claude Code BISA:** query database lewat `DATABASE_URL` di `.env.local`,
baca kode, jalankan build, curl ke production.

**Konsekuensi praktis:** setiap kali asisten chat menilai tampilan atau
perilaku aplikasi, itu berdasarkan screenshot yang dikirim pengguna. Jangan
berpura-pura tahu lebih dari itu.

**Ada jalan keluar yang sudah terbukti sebagian:** `scripts/auth-setup.ts`
melakukan login lewat `supabase.auth.signInWithPassword()` lalu menyuntikkan
cookie sesi ke browser Playwright — melewati Google sepenuhnya. Terbukti
pernah berhasil (ada `.auth/storageState.json` dan screenshot halaman
terproteksi). Tapi belum jadi suite berulang, dan di sebagian lingkungan
kerja browser-nya tidak bisa mempertahankan cookie.

---

# 3. STACK TEKNIS

| Komponen | Pilihan |
|---|---|
| Framework | Next.js 16 App Router + React 19 + TypeScript |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth, **Google OAuth saja** — tidak ada email/password di UI |
| ORM | Drizzle |
| Deploy | Vercel, auto-deploy dari `main` |
| Audio Jepang | VOICEVOX lokal (四国めたん ノーマル, speaker id 2) |
| Narasi Indonesia | OpenAI TTS (`gpt-4o-mini-tts`, suara `marin`) |
| Data coretan | `@k1low/hanzi-writer-data-jp` |
| Validasi tulisan | `@k1low/kakitori` |
| Kana↔romaji | `wanakana` |
| Font | Plus Jakarta Sans (Indonesia), Noto Sans JP (Jepang) |

**Koneksi database — dua mode berbeda, sering tertukar:**
- Migration dari komputer lokal: **Session pooler, port 5432** (`DATABASE_URL`)
- Runtime di Vercel: **Transaction pooler, port 6543** (`DATABASE_URL_POOLED`)
- Direct connection Supabase hanya IPv6 — gagal di kebanyakan ISP Indonesia

**Penting:** `drizzle-kit` tidak membaca `.env.local` secara otomatis
(itu konvensi Next.js). Sudah diperbaiki lewat dotenv di `drizzle.config.ts`.

**Identitas visual (dari Claude Design, nama internal "Moji"):**
- Aksen terakota `#CC5436`, latar krem `#F6F6F0`, teks `#241E18`
- Referensi lengkap di `docs/design-reference/`
- Token gerak: press 90ms, spring 200ms, entrance 300-320ms, stagger 60-70ms
- Easing: `cubic-bezier(.34,1.56,.64,1)` (spring), `cubic-bezier(.16,1,.3,1)` (out)

---

# 4. KONDISI SEKARANG — TIGA LAPIS YANG HARUS DIBEDAKAN

Ini bagian paling penting. Ada **tiga versi kurikulum** yang statusnya berbeda.

## Lapis 1 — V1 (M01–M05): ADA TAPI SUDAH TIDAK DIPAKAI

248 pelajaran ter-seed penuh di database (`kana_modules`, `kana_lessons`):

| Kode | Judul | Fase | Pelajaran |
|---|---|---|---|
| M01 | Orientasi Bahasa Jepang | 1 | 4 |
| M02 | Hiragana Dasar | 21 | 75 |
| M03 | Katakana Mastery | 22 | 81 |
| M04 | Angka & Informasi Dasar | 10 | 41 |
| M05 | Sapaan & Bahasa Jepang Sosial | 10 | 47 |

Route `/belajar/kana/*` masih hidup dan bisa dibuka lewat URL langsung,
tapi **tidak ditautkan dari navigasi mana pun**. Datanya utuh, tidak dihapus.

Aset yang tetap dipakai lintas versi: `kana_characters` (220 baris),
`kana_example_words` (137), file stroke di `public/kana-strokes/`, dan
seluruh audio VOICEVOX.

## Lapis 2 — V2 (PRE-N5.01–11): AKTIF, DIBANGUN CODEX

Ini yang sekarang jadi jalur aktif di `/belajar` dan `/beranda`.
Route: `/belajar/pre-n5/[moduleCode]/[stageCode]`

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

**Hanya 1 dari 11 yang benar-benar berisi.** Sepuluh sisanya `scaffold` —
struktur `learning_stages` ada (F1–F5 + BOSS), kontennya belum.

Anomali: `curriculum_versions.status = 'draft'`, `activated_at = null` —
secara data V2 belum "diaktifkan", tapi kodenya sudah dipakai sebagai
jalur aktif tanpa mengecek status itu.

## Lapis 3 — V2.1: DIRANCANG, BELUM DIIMPLEMENTASIKAN

Dokumen `rancangan_modul_pre_n5_sampai_n1_v2_1_upgrade.pdf` (+ versi `.md`).
**Belum ada di repo** — harus dimasukkan ke `docs/` sebelum sesi kerja apa pun.

### ⚠️ TEMUAN PALING PENTING

**V2 yang dibangun Codex memakai pola F1–F5 seragam untuk semua modul.
V2.1 secara eksplisit menolak pola itu.**

Kutipan langsung dari V2.1 Bagian 2:
> "Satu pola F1-F5 untuk semua modul → **Ganti** → Script, grammar, listening,
> dan interaction membutuhkan latihan dan bukti penguasaan berbeda"

> "Satu boss langsung memberi label 'mastered' → **Ganti** dengan immediate
> gate + retention gate"

Jadi PRE-N5.11 yang sekarang bernama "Boss" juga bertentangan dengan V2.1,
yang menyebutnya "Pre-N5 Integrated Mastery".

**Tapi kerangka modulnya cocok.** V2.1 Bagian 2 menyatakan "67 ID modul
Pre-N5–N1 → **Pertahankan**". Sebelas kode modul yang dibangun Codex sudah
sesuai dengan V2.1, hanya beda kecil (V2.1 minta Core Vocabulary **120**,
Codex membangun **100**).

**Kesimpulannya: kerangka V2 bisa dipakai ulang. Yang harus diganti adalah
mekanika belajar di dalam tiap modul, bukan daftar modulnya.**

### Inti perubahan V2.1

Model penguasaan lima status menggantikan "selesai = menguasai":

| Status | Syarat |
|---|---|
| New | Belum ada exposure |
| Familiar | Benar pada recognition dengan feedback |
| Retrievable | Benar **tanpa hint** pada cued/free recall |
| Durable | Benar tanpa hint **di sesi berbeda**, termasuk uji tertunda |
| Transferable | Benar dalam konteks baru |

Empat jenis bukti dipisahkan, dan hanya dua terakhir yang boleh memberi mastery:
exposure (tidak), guided performance (tidak), unaided retrieval (ya),
delayed transfer (ya).

Hint ladder 3 tingkat; attempt yang memakai hint ditandai *assisted* dan tidak
menambah mastery sampai berhasil ulang tanpa bantuan setelah 2–4 item distraktor.

Gate awal: checkpoint ≥80% first-attempt (hanya membuka langkah berikutnya),
retention gate ≥85% first-attempt tanpa hint setelah **jeda minimal 72 jam**.

Mesin belajar berbeda per jenis konten: Kana Script, Kanji, Vocabulary,
Grammar, Listening, Reading, Interaction, JLPT Simulation.

Pemisahan **JLPT Readiness** dari **JLP Communication** — JLPT memang tidak
punya seksi berbicara/menulis, dan sejak 2010 tidak lagi menerbitkan daftar
resmi kosakata/kanji/grammar. Jangan mengklaim angka sebagai daftar resmi.

Urutan implementasi yang diminta V2.1 (Bagian 13): P0 fondasi glyph & model
bukti → P1 vertical slice PRE-N5.01 sampai delayed gate → P2 engine reusable
→ P3 rollout level.

---

# 5. YANG BENAR-BENAR JALAN (dibuktikan data)

| Hal | Bukti |
|---|---|
| Auth Google OAuth | 4 pengguna asli di `profiles` |
| Pemakaian nyata | 494 baris `user_kana_attempts`, 108 `user_kana_mastery` |
| Mnemonik | `app/lib/hiragana-mnemonics.ts` — 66 entri lengkap dengan anchor word Jepang asli, sound cue, shape cue, stroke cue |
| Validasi tulisan tangan | `@k1low/kakitori` sungguhan, bukan placebo |
| Audio Jepang | VOICEVOX, 0 karakter/kata tanpa audio |
| Narasi Indonesia | Ada, tapi hanya di M01 (jalur lama) |
| Hint ladder | Ada di `HiraganaLearningLab.tsx` — hint>0 memaksa `recallPassed=false` |
| Penjadwalan SRS | `SRS_INTERVALS = [1,3,7,14,30]`, `due_at` terisi benar |
| Data coretan | 211 karakter terverifikasi terhadap jumlah baku |
| Build | `tsc --noEmit`, `lint`, `next build` semua bersih |

---

# 6. YANG RUSAK ATAU BELUM ADA

Diurutkan berdasarkan dampak.

**1. Antrean review tidak ada.** `due_at` terisi benar di database, tapi
**tidak ada satu baris kode pun yang membacanya kembali**. Halaman `/ulangi`
100% hardcode dari `app/lib/mock-data.ts:13`
(`reviewSummary = { dueNow: 12, learning: 28, mastered: 64 }`).
Tombolnya cuma memicu toast "Spaced-repetition logic will be connected later."
Landing page **sudah menjanjikan fitur ini** ("materi diulang otomatis di
waktu yang tepat"). Janji yang belum ditepati.

**2. Retention gate tidak ditegakkan.** Stage "F5 · SRS Retention" merender
komponen yang sama persis dengan F1–F4, di sesi yang sama, seketika. Tidak
ada logika yang menahan F5 sampai `due_at` sungguhan lewat. Penjadwalannya
nyata, penegakannya nol.

**3. Sepuluh dari sebelas modul V2 kosong.** Status `scaffold`. Belum
diverifikasi apa yang tampil kalau pengguna mengekliknya.

**4. First-attempt tidak tercatat sebagai data.** Logika "hint dipakai →
tidak dihitung mastery" hidup sebagai state React, hilang saat refresh.
Tidak ada kolom yang bisa di-query nanti.

**5. Placement test tidak ada.** Nol hasil grep untuk "placement".

**6. Skema V2.1 belum ada sama sekali.** Field yang dituntut V2.1 Bagian 11.1
— `curriculum_version`, `content_version`, `engine_version`, `hint_level`,
`support_level`, `confidence`, `first_attempt_correct`, `actual_interval` —
**semuanya tidak ada**. Yang mirip: `srs_interval_days` (≈scheduled_interval),
`response_time_ms` (≈latency_ms).

**7. Skor tulisan tangan satu angka, disimpan sebagai string.**
`typed_value = 'writing-score:82'`. Bekerja, tapi tidak bisa di-query
(`WHERE score > 80` mustahil tanpa parsing). V2.1 Bagian 8.2 menuntut
subskor terpisah: kelengkapan 40%, urutan/arah 25%, proporsi 20%,
kelancaran 15%.

**8. Landing page tidak sinkron.** Masih menyebut "Pre-N5 · 5 modul"
(hardcode di `app/(marketing)/page.tsx`), padahal sistem aktif punya 11 modul.

**9. `CLAUDE.md` sangat usang.** Masih menggambarkan versi paling awal
(satu file `page.tsx` 388 baris, tanpa database). **Abaikan isinya, tulis ulang.**

**10. Tiga file belum di-commit** di working tree lokal:
`HiraganaLearningLab.tsx`, `belajar/pre-n5/[moduleCode]/page.tsx`,
`globals.css`. Hilang kalau mesin restart.

**11. Dua jalur `learningFlow` ("legacy" vs default)** masih coexist di
`HiraganaStagePlayer.tsx` — sisa iterasi 20-huruf vs 46-huruf.

**12. `user_kana_gate_results` 0 baris** — tabel ada, tidak pernah dipakai
kode mana pun.

**13. Belum ada suite E2E berulang.** Ada `scripts/auth-setup.ts` yang
terbukti pernah berhasil, tapi tidak ada `.spec.ts`, tidak ada config
Playwright, tidak ada CI.

---

# 7. PELAJARAN TEKNIS YANG MAHAL DIDAPAT

Jangan mengulang kesalahan ini.

## Data coretan: baca field `id`, jangan tebak geometris

Dataset stroke menyimpan varian gaya dengan suffix huruf: `1`, `2`, `3a`, `3b`.
`3a` dan `3b` **bukan dua coretan** — itu dua versi coretan yang sama.

Metode yang benar: kelompokkan berdasarkan awalan angka (`^\d+`), ambil tepat
satu varian per kelompok, dan **pastikan `strokes[]` dan `medians[]` mengambil
varian yang sama** — kalau tidak, gambar dan validasi tulisan tangan tidak sinkron.

Metode yang salah (pernah dipakai dan merusak あ/お/ぬ/る/の/め): membandingkan
koordinat, kalau overlap ≥50% buang salah satu. Ambang tebakan tidak bisa tahu
varian mana yang benar.

Karakter yang punya varian: あ お す な ぬ ね の は ほ ま み む め よ る
(+ turunan dakuten ば ぱ ず ぼ ぽ, + ょ yang menjalar ke 11 kombinasi youon).
Katakana: tidak ada.

## Verifikasi berbasis jumlah tidak memverifikasi apa pun

Pernah terjadi: membandingkan `stroke_count` di database dengan
`strokes.length` di JSON. Keduanya selalu sama *by construction* — jadi
pengecekan itu tidak membuktikan apa-apa. Karakter bisa punya jumlah benar
tapi bentuk rusak.

**Aturan:** untuk perubahan visual, verifikasi dengan render/screenshot.
Untuk perubahan interaksi, jalankan interaksinya. Build lolos bukan bukti.

## "CSS-only" akan diartikan sebagai "ganti warna saja"

Pernah terjadi: instruksi menekankan "hanya lapisan visual, jangan tulis
ulang". Hasilnya token warna lama dialihkan ke warna baru — secara mekanis
memang hanya warna yang berubah, layout tidak tersentuh sama sekali.

**Aturan:** untuk perubahan tampilan, beri **angka konkret** (judul 20px,
tombol tinggi 48px, buang empat baris header ini), bukan prinsip
("perbaiki hierarki"). Dan nyatakan eksplisit bahwa JSX boleh dirombak total;
yang dilindungi hanya query data dan event handler.

## Next.js 16

`middleware.ts` sudah deprecated, diganti `proxy.ts`. File `middleware.ts`
tidak lagi dicari secara default — kalau tidak di-rename, proteksi route
tampak terpasang padahal tidak aktif.

Proxy **bukan batas keamanan** (ada CVE bypass lewat header
`x-middleware-subrequest`). Proteksi berlapis: proxy untuk UX, cek di
`(app)/layout.tsx` untuk server-side, **RLS di Postgres sebagai batas
keamanan sebenarnya**.

Dua folder dinamis berbeda nama di level yang sama dilarang — itu sebabnya
route kana harus `/belajar/kana/[moduleCode]` bukan `/belajar/[moduleCode]`.

## Supabase

`@supabase/ssr` wajib pakai `getAll()`/`setAll()`, bukan `get`/`set`/`remove`
per-cookie. Jangan taruh kode apa pun antara `createServerClient` dan
`supabase.auth.getUser()` di proxy — menyebabkan logout acak.
`cookies()` harus di-`await` di Next 16.

Redirect URL harus di-allowlist di dashboard, termasuk `localhost:3000`.
Kalau tidak, Supabase diam-diam fallback ke Site URL — gejalanya login dari
localhost melompat ke domain production.

## TTS

OpenAI **tidak punya suara Jepang asli** — semua suaranya identitas berbahasa
Inggris yang bisa membaca Jepang. Tidak ada prompt yang memperbaiki ini.
Pembagian yang benar: **VOICEVOX untuk Jepang, OpenAI untuk narasi Indonesia.**

Google Cloud menuntut prepayment IDR 500.000 untuk Indonesia. Azure free tier
menolak akun ini. VOICEVOX gratis, lokal, dan harus aplikasinya terbuka
(server di `localhost:50021`) saat script audio dijalankan.

## Pedagogi

Di modul orientasi, soal harus menguji **pemahaman konsep yang baru
dijelaskan**, bukan hafalan arti kata baru. Pernah terjadi soal "日本 berarti
apa" di modul yang menyatakan dirinya tanpa hafalan.

Romaji adalah **lapisan tampilan** dengan kebijakan per fase, bukan bagian
dari teks konten. Kalau dijahit ke dalam teks, fase "no-romaji" mustahil dibuat.

Setiap jawaban salah **wajib mencatat distractor mana yang dipilih** —
tanpa itu, fitur confusion pair personal tidak bisa dibuat retroaktif.

Rekognisi tanpa produksi menghasilkan ilusi penguasaan.

---

# 8. CARA KERJA YANG TERBUKTI EFEKTIF

- **Satu komponen/halaman per commit**, jangan digabung. Waktu tujuh komponen
  dikerjakan sekaligus, sulit melacak mana yang bermasalah.
- **Minta bukti, bukan laporan.** "Screenshot render karakter, bukan tabel
  angka." "Tunjukkan query SQL yang bisa saya jalankan sendiri."
- **Checkpoint eksplisit** — "kerjakan bagian A, lapor, tunggu persetujuan"
  untuk pekerjaan berisiko; "kerjakan sampai selesai tanpa berhenti" untuk
  pekerjaan yang sudah jelas.
- **Audit sebelum bangun.** Setiap kali pindah alat atau sesi, minta laporan
  kondisi nyata dulu.

---

# 9. LANGKAH BERIKUTNYA YANG DISARANKAN

## Sebelum coding apa pun

1. **Masukkan dokumen V2.1 ke repo** (`docs/curriculum-v2.1/`). Sekarang
   belum ada di sana, jadi Claude Code tidak bisa membacanya.
2. **Tulis ulang `CLAUDE.md`** — yang sekarang menggambarkan proyek dari
   berbulan lalu dan menyesatkan.
3. **Commit 3 file yang menggantung** di working tree.
4. **Putuskan secara sadar:** V2 (F1–F5 seragam) diperbaiki jadi V2.1, atau
   dibiarkan dan V2.1 dibangun terpisah? Rekomendasi: perbaiki V2, karena
   kerangka 11 modulnya sudah sesuai V2.1.

## P0 — fondasi (sesuai V2.1 Bagian 13)

1. **Skema bukti belajar.** Tambah kolom yang membedakan first-attempt dari
   final, mencatat `hint_level` yang dipakai, dan menandai attempt sebagai
   assisted. Tanpa ini, model mastery lima status tidak mungkin dijalankan.
2. **Antrean review yang nyata.** Query `user_kana_mastery.due_at`, ganti
   `mock-data.ts`. Ini item nomor satu — datanya sudah ada, tinggal dibaca.
3. **Retention gate ditegakkan.** F5 tidak boleh dibuka sebelum `due_at` lewat.
4. **Subskor tulisan tangan** sebagai kolom numerik terpisah, bukan string.
5. **Verifikasi visual coretan** di aplikasi sungguhan (selama ini hanya
   lewat harness statis).

## P1 — vertical slice

PRE-N5.01 lengkap sampai delayed gate, dengan mekanika V2.1 (hint ladder
yang persisten, cumulative bank 10/20/30/40/46, retention gate 3–7 hari).
Baru setelah itu modul lain diisi.

## Yang jangan dikerjakan dulu

Mengisi 10 modul scaffold sebelum mekanika V2.1 terbukti di satu modul.
V2.1 Bagian 15.1 menyatakan ini eksplisit: jangan ekspansi 67 modul sebelum
satu engine menunjukkan learning gain dan retensi yang bisa dipercaya.

---

# 10. RINGKASAN SATU PARAGRAF

Aplikasinya berdiri dan dipakai 4 orang sungguhan. Auth jalan, database
terisi, audio lengkap, mnemonik ada, validasi tulisan tangan nyata. Tapi
**fitur yang paling dijanjikan — review terjadwal — belum ada sama sekali**,
meski datanya sudah tersimpan rapi menunggu dibaca. Ada tiga versi kurikulum
bertumpuk: V1 (248 pelajaran, tidak dipakai), V2 (11 modul, 1 berisi), dan
V2.1 (dirancang matang, belum disentuh). V2.1 mempertahankan kerangka modul
V2 tapi mengganti mekanika belajarnya — termasuk menolak pola F1–F5 seragam
yang justru baru saja dibangun. Fondasinya kuat; yang hilang adalah lapisan
yang membuat orang kembali besok.
