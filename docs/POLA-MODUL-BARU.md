# Pola membangun modul baru di atas mesin yang sudah ada

> **PROMPT-8 (2026-08-25):** bagian di atas ditulis setelah katakana
> (modul KEDUA, tipe SAMA — bentuk huruf). Bagian di bawah, "Modul dengan
> TIPE BERBEDA — Vocabulary Engine", ditulis setelah PRE-N5.03 (modul
> KETIGA, tipe BEDA — angka/waktu/harga, bukan bentuk huruf). Baca
> keduanya: yang pertama bilang mana yang generik ANTAR-MODUL-SEJENIS,
> yang kedua bilang mana yang generik ANTAR-TIPE-MODUL — dua pertanyaan
> berbeda, jawabannya tidak selalu sama.

Ditulis setelah membangun PRE-N5.02 (Katakana) di atas mesin yang sebelumnya
hanya melayani PRE-N5.01 (Hiragana) — PROMPT-7 Bagian 9. Tujuannya: modul
ketiga (PRE-N5.03, Angka & Waktu — beda KARAKTER dari kana, jadi sebagian
pola di sini tidak langsung berlaku) atau modul kana berikutnya bisa
dikerjakan jauh lebih cepat daripada katakana dikerjakan dari hiragana.

## Ringkasan: katakana selesai dalam satu sesi karena...

1. Baris `learning_stages` untuk PRE-N5.02 **sudah ada** sejak awal (status
   `scaffold`, konten generik lama) — jadi ini kerjanya UPDATE, bukan
   INSERT dari nol. Modul lain mungkin tidak seberuntung ini; cek dulu
   `select * from learning_stages where module_id = (select id from
   learning_modules where code='PRE-N5.0X')` sebelum asumsi harus insert.
2. Chunking 10/10/10/10/6 katakana **kebetulan identik** dengan hiragana —
   `defaultScopes` di `pre-n5-01-query.ts` (nilai batchStart/
   newCharacterCount/cumulativeCharacterCount per kode stage F1-F5/BOSS)
   dipakai ulang tanpa perlu override apa pun di `configuration`. Modul
   dengan jumlah item beda per fase HARUS mengisi `configuration.batchStart`
   dkk. secara eksplisit per baris — jangan andalkan default itu.
3. Struktur gojuon (5,5,5,5,5,5,5,3,5,3 per baris あ/か/さ/た/な/は/ま/や/ら/わ)
   **sama persis** untuk hiragana dan katakana — `MasteryMap.tsx`'s
   `ROW_SIZES` dan `buildUnits()`'s pembagian 2-kelompok jalan tanpa
   perubahan. Modul non-kana (angka, partikel, dst.) TIDAK akan punya
   struktur ini — bagian UI yang mengasumsikan bentuk gojuon perlu ditulis
   ulang, bukan dipakai ulang.

## Yang bisa dipakai ulang TANPA diubah

- **Routing**: `app/(app)/belajar/pre-n5/[moduleCode]/[stageCode]/` sudah
  dynamic route sejak awal — halaman, komponen, dan action di dalamnya
  otomatis melayani modul apa pun begitu datanya ada. Tidak perlu folder
  baru per modul.
- **Komponen mesin belajar**: `HiraganaLearningLab.tsx` (7 fase),
  `HiraganaQuiz.tsx` (BOSS/RETENTION/review), `HiraganaStagePlayer.tsx`
  (router fase↔komponen). Namanya masih "Hiragana" tapi isinya sudah
  murni bekerja dari `HiraganaStageBundle`/`HiraganaLearningItem` generik
  — tidak ada karakter hiragana yang di-hardcode di dalamnya.
- **Logika gerbang**: `gate-logic.ts` (checkpoint 80%, retention 85% + 72
  jam) — murni fungsi, sudah lintas-modul dari awal.
- **Matematika SRS**: `app/lib/srs.ts` (`nextSrsInterval`/`nextSrsEase`).
- **Derivasi status penguasaan**: `app/lib/mastery-tier.ts`.
- **Antrean review**: `app/lib/review-query.ts` — sudah lintas-kurikulum
  DAN lintas-skrip dari desainnya sejak PROMPT-6 (`user_kana_mastery`
  tidak difilter per modul). Perlu satu penyesuaian kecil untuk skrip
  baru: lihat bagian "yang dinetralkan" di bawah.

## Yang SELALU perlu disesuaikan per modul (tidak ada jalan pintas)

1. **Array urutan kanonis karakter.** `group_code`/`order_in_group` di
   `kana_characters` TERBUKTI acak untuk hiragana dan katakana — jangan
   percaya kolom itu untuk modul apa pun. Definisikan array urutan sendiri
   di kode (lihat `KATAKANA_BASIC_CHARACTERS` di `app/lib/katakana-data.ts`),
   verifikasi manual sekali dengan query langsung.
2. **Isi baris `learning_stages`**: title/description/mechanic per batch,
   plus `configuration.script` (WAJIB diisi eksplisit — default kalau
   kosong adalah `"hiragana"`, lihat bagian generalisasi di bawah) dan
   `configuration.characterSet`.
3. **Data konten**: `kana_example_words` + `kana_word_characters` untuk
   langkah "Baca" (cek dulu jumlah kata yang eligible per batch kumulatif
   dengan query manual — lihat pola verifikasi di
   `docs/PRE-N5.02-PLAN.md` — sebelum asumsi datanya cukup),
   `kana_confusion_pairs` untuk pasangan mirip (cek yang sudah ada, isi
   yang kurang).
4. **Mnemonik** (opsional, tapi kalau mau dikerjakan): perlu set
   Indonesia-asli baru per modul, tidak ada shortcut — lihat catatan di
   bawah soal katakana belum dikerjakan.

## Bagian mesin yang MASIH terikat ke satu modul — sudah dinetralkan sesi ini

Ditemukan dan diperbaiki langsung (bukan cuma dicatat), supaya modul
berikutnya tidak mengulang penemuan yang sama:

- **`pre-n5-01-query.ts`'s `getHiraganaStageBundle`** dulu hardcode
  `HIRAGANA_MODULE_CODE` dan `.eq("script","hiragana")`. Sekarang
  menerima `moduleCode` sebagai parameter kedua, dan `script` diturunkan
  dari `stage.configuration.script` (bukan konstanta). `CHARACTER_TRACKS`
  sekarang dua tingkat: `{ [script]: { [trackKey]: characters[] } }`.
- **`actions.ts`'s `getStageContext`** dulu menolak modul apa pun selain
  `PRE-N5.01`. Sekarang cek terhadap `SUPPORTED_MODULE_CODES` (array,
  tinggal tambah kode modul baru di situ).
- **`recordHiraganaAttempt`'s validasi kana** dulu memaksa
  `.eq("script","hiragana")`. Dihapus — `stageId` cuma membuktikan "ini
  panggilan sah ke modul yang didukung", bukan "kanaId harus skrip yang
  sama dengan stage-nya". Ini PENTING karena `/ulangi` sengaja mencampur
  skrip dalam satu sesi kuis (satu `stageId` anchor, banyak skrip
  kanaId) — validasi skrip yang ketat akan menolak separuh sesi review
  campuran.
- **`V21_PHASE_CODE_BY_STAGE` (F1-F5/BOSS/RETENTION → P1-P5/CORE_GATE)**
  akan BENTROK kalau dipakai mentah oleh modul kedua — katakana F1 dan
  hiragana F1 sama-sama akan menghasilkan `phase_code="P1"`, membuat
  `exercise_type` dan query `completeHiraganaStage`'s RETENTION-check
  (yang TIDAK memfilter per kana_id, cuma per `phase_code`+
  `exercise_type`) bisa mencampur data dua modul. Diselesaikan dengan
  `resolvePhaseCode(stageCode, script)` di `app/lib/katakana-data.ts` —
  kembalikan mapping berprefiks (`KP1`..`KP5`, `K_CORE_GATE`,
  `K_RETENTION`) kalau `script==="katakana"`. **Modul ketiga HARUS
  menambah cabang serupa di sini, bukan menimpa map yang sama.**
- **`buildUnits()`'s judul kelompok** ("Hiragana Dasar · Kelompok N")
  hardcode. Sekarang menerima `script`, judul jadi
  "Hiragana Dasar"/"Katakana Dasar" sesuai konteks.
- **`VocalBridgeIntro`** (layar pembuka vokal) sengaja HANYA muncul kalau
  `configuration.script` hiragana (atau kosong) — konsepnya memang
  spesifik-hiragana ("vokal Indonesia = vokal Jepang"), bukan sesuatu
  yang perlu digeneralisasi.
- **`ReadStep`'s pratinjau wanakana** (`wanakana.toHiragana`) dulu
  hardcode ke hiragana. Sekarang menerima `script`, pakai
  `wanakana.toKatakana` kalau perlu.
- **Distractor pool di `/ulangi`** (`getHiraganaDistractorPool`,
  `pickDistractors` di `build-questions.ts`) dulu hanya ambil karakter
  hiragana — soal pilihan-ganda katakana bisa saja menyandingkan
  distraktor hiragana. Diperbaiki: pool sekarang lintas-skrip, skrip
  target diturunkan dari titik kode Unicode karakternya sendiri
  (`scriptOf()`), bukan field baru yang harus di-thread ke mana-mana.

## Bagian yang BELUM dinetralkan — sengaja, laporkan ke sesi berikutnya

- **Mnemonik katakana belum ditulis.** `HIRAGANA_LAB_MNEMONICS`/
  `HIRAGANA_MNEMONICS` di `hiragana-mnemonics.ts` cuma berisi hiragana —
  karakter katakana jatuh ke fallback generik
  (`{emoji:"✦", title:"Bentuk dan bunyi X", ...}`). Ini SENGAJA dilewati
  sesi ini (PROMPT-7 Bagian 7 poin 5: "belum wajib, kalau sempat
  kerjakan, kalau tidak laporkan") — bukan bug, bukan lupa.
- **`speed-drill-query.ts` (menu Latihan) masih hiragana-only** — memanggil
  `getHiraganaMasteryMap()` tanpa parameter skrip. Tidak diminta eksplisit
  oleh PROMPT-7 Bagian 7 poin 4 (yang cuma menyebut `/ulangi` dan
  `/progres`), jadi belum disentuh. Perbaikannya kecil kalau dibutuhkan:
  tinggal panggil dengan parameter `"katakana"` juga dan gabungkan poolnya.
- **`HIRAGANA_WORD_UNLOCKS`** (kata-kata yang "terbuka" di layar unlock
  antar-kelompok) hiragana-only, key-nya tidak cocok dengan
  `unit.code` katakana — otomatis jatuh ke cabang fallback yang sudah
  ada ("Kelompok selesai; ingatan lama tetap aktif"), jadi TIDAK pecah,
  cuma tidak menampilkan kata contoh spesifik untuk katakana. Tidak
  darurat untuk diperbaiki.
- **Nama file/fungsi masih menyebut "Hiragana"** meski isinya sudah
  lintas-modul: `pre-n5-01-query.ts`, `getHiraganaStageBundle`,
  `HiraganaLearningLab.tsx`, `HiraganaQuiz.tsx`, `HiraganaStagePlayer.tsx`,
  `recordHiraganaAttempt`, `completeHiraganaStage`. Rename murni kosmetik
  (tidak mengubah perilaku), sengaja tidak dikerjakan sesi ini karena
  risiko salah-ganti-impor di banyak file untuk manfaat yang cuma
  kejelasan nama — pertimbangkan kalau modul keempat/kelima mulai
  membuat nama "Hiragana"-di-mana-mana terasa benar-benar membingungkan,
  bukan sebelum itu.
- **Porsi antar-fase belum benar-benar berbeda** antara hiragana dan
  katakana meski V2.1 memintanya ("kurangi goresan, tambah bedakan/baca"
  untuk katakana). Yang benar-benar diimplementasikan: `readWordsPerRound`
  jadi 5 untuk katakana (vs 3 default hiragana) — satu knob kecil, bukan
  perombakan urutan/porsi fase. Merombak porsi sungguhan (mis. dua ronde
  "Bedakan" alih-alih satu) perlu perubahan struktural ke state machine
  fase di `HiraganaLearningLab.tsx`, bukan sekadar parameter — belum
  dikerjakan, dicatat sebagai kerja lanjutan.

## Checklist singkat untuk modul kana berikutnya (mis. dakuten/handakuten/youon sebagai modul sendiri, atau PRE-N5.03 kalau ternyata pakai kana lagi)

1. Cek `learning_stages` sudah ada scaffold atau belum untuk modul itu.
2. Cek data (`kana_characters`, `kana_example_words`, `kana_confusion_pairs`)
   sudah lengkap — jangan asumsikan, query langsung (lihat pola di
   `docs/PRE-N5.02-PLAN.md`).
3. Tulis array urutan kanonis kalau belum ada.
4. Isi `configuration.script` + `characterSet` di tiap baris stage, plus
   tambah entri di `resolvePhaseCode` (`katakana-data.ts`) untuk modul
   baru itu supaya `phase_code`-nya tidak bentrok dengan modul lain.
5. UPDATE (bukan INSERT baru) baris scaffold yang sudah ada, isi RETENTION
   kalau modulnya butuh gerbang tertunda.
6. Jalankan `npx tsc --noEmit`, `npm run lint`, `npm run build` — kalau
   bersih, itu sinyal kuat integrasi tidak merusak modul yang sudah ada.
7. Verifikasi nyata: buka halaman modul + F1 di browser sungguhan (bukan
   cuma percaya build lulus), dan buktikan jalur simpan data (recordRead
   Attempt/recordHiraganaAttempt) lewat pemanggilan server action langsung
   seperti sesi-sesi lalu — canvas tulisan tangan tetap di luar jangkauan
   otomatisasi, itu tidak berubah.

## Modul dengan TIPE BERBEDA — Vocabulary Engine (lahir dari PRE-N5.03)

Katakana (di atas) adalah modul kedua tapi TIPE YANG SAMA dengan hiragana
— sama-sama "kenali/bedakan/tulis BENTUK huruf". PRE-N5.03 (Angka, Waktu,
Harga & Counter Dasar) adalah modul pertama dengan TIPE BENAR-BENAR BEDA:
tidak ada bentuk huruf yang dipelajari, yang dipelajari adalah kosakata +
pola + pengecualian + aritmetika ringan. Dugaan awal PROMPT-8 ("mesin
kana tidak akan pas") terbukti benar — bukan soal generalisasi kecil,
tapi butuh MESIN BARU. Berikut peta mana yang tetap generik lintas TIPE
modul, dan mana yang harus ditulis ulang.

### Yang ternyata SUDAH generik lintas-tipe sebelum kode baru ditulis

Dibuktikan lewat pemakaian TANPA PERUBAHAN, bukan cuma diklaim:

- **`getPreN5ModuleOverview` (`pre-n5-01-query.ts`)** — lapisan daftar
  modul/stage, status kunci, delayed-gate. `getVocabStageBundle`
  (`vocab-engine-query.ts`) memanggilnya PERSIS TANPA UBAHAN. Ini
  membuktikan lapisan "modul apa saja isinya, stage mana yang terbuka"
  sudah lepas dari asumsi bentuk-huruf sejak sesi katakana, bukan cuma
  lepas dari asumsi hiragana-vs-katakana.
- **`gate-logic.ts`** (4 fungsi murni: checkpoint 80%, retention 85%+72
  jam) dan **`app/lib/srs.ts`** — dipakai ulang persis oleh
  `vocab-actions.ts`, nol perubahan.
- **Tabel progres** `user_learning_stage_progress` /
  `user_learning_module_progress` — skema sama sekali tidak tahu soal
  "kana" atau "vocab", cuma `stage_id`/`module_id` + status/skor. Tidak
  perlu tabel progres baru untuk tipe modul baru, hanya tabel KONTEN
  (lihat di bawah) yang baru.
- **Kelas CSS wadah** `.hiragana-lab` / `.hiragana-lab__rail` /
  `.hiragana-lab__main` / `.hiragana-lab__header` / `.hiragana-lab__steps`
  / `.hiragana-lab__checkpoint*` — dipakai ulang APA ADANYA (nama kelas
  yang sama persis) oleh `VocabLearningLab.tsx`. Cuma konten PER-SOAL di
  dalamnya yang perlu kelas baru (`.vocab-lab__step`, `.vocab-lab__choices`,
  dst, ditulis di `app/globals.css`).

### Yang TERNYATA TIDAK generik — harus ditulis ulang untuk PRE-N5.03

- **Skema DB konten**: `kana_characters` tidak masuk akal untuk angka —
  dibuat 3 tabel baru sengaja NETRAL-TIPE (`db/schema/vocab.ts`):
  `vocab_items` (item + `is_irregular`/`irregular_of` untuk pasangan
  kontras), `user_vocab_attempts` (termasuk kolom `error_type` khusus
  untuk split bahasa/matematika, lihat di bawah), `user_vocab_mastery`
  (skill: recognition/production/listening, terpisah dari
  `user_kana_mastery`'s visual/audio/writing — himpunan skill BEDA per
  tipe modul, jangan disamakan paksa).
- **State machine fase belajar**: `HiraganaLearningLab.tsx` py fase (buka
  kunci→anchor→isyarat→latihan→retrieval→baca→checkpoint) itu dirancang
  untuk "kenali bentuk→ulang tanpa isyarat→baca dalam kata" — TIDAK pas
  untuk kosakata. `VocabLearningLab.tsx` pakai state machine baru yang
  lebih sederhana: dengar-pilih (recognition) → bangun-jawaban (production,
  ketik romaji) → kontras-pengecualian (HANYA kalau unit itu punya item
  irregular) → checkpoint. Ini BUKAN versi kana yang dipangkas — polanya
  memang beda dari akarnya (V2.1 §6.3: dengar-bangun-ucap, bukan
  kenali-bedakan-tulis).
- **`KanaWritingCoach` / data goresan** — sama sekali tidak relevan;
  modul vocab tidak (dan mungkin tidak akan pernah) punya komponen
  tulisan tangan. Ini murni tipe-spesifik-kana, jangan dicoba
  digeneralisasi.
- **Kapsul ujian akhir (BOSS)**: hiragana/katakana pakai kuis 46-huruf
  biasa untuk BOSS. PRE-N5.03 punya `KonbiniSimulation.tsx` — simulasi
  belanja konbini 2-langkah (dengar total → hitung kembalian) yang V2.1
  sebut sebagai kapsul modul ini secara eksplisit. Pola 2-langkahnya
  (langkah 1 murni menguji DENGAR, langkah 2 selalu pakai harga yang
  SUDAH terbukti benar dari langkah 1, jadi salah di langkah 2 pasti
  salah HITUNG bukan salah DENGAR) dicatat sebagai `error_type: "language"
  | "math"` di `user_vocab_attempts` — pola "pisahkan bukti-paham dari
  bukti-hitung" ini bisa dipakai ulang modul lain yang butuh hal serupa
  (bukan cuma konbini), tapi komponennya sendiri (`KonbiniSimulation.tsx`)
  spesifik-konten, bukan spesifik-teknik.
- **Halaman ringkasan modul** (`app/(app)/belajar/pre-n5/[moduleCode]/
  page.tsx`) — TERNYATA masih ada string hardcode "46 HIRAGANA DASAR"/
  "46 KATAKANA DASAR" dan rel progres huruf 10/20/30/40/46 yang
  mengasumsikan kurikulum berbentuk huruf kumulatif. Ini lolos tak
  kelihatan sampai PRE-N5.03 dibangun karena PRE-N5.02 (katakana) punya
  bentuk kurikulum yang SAMA (46 huruf) — baru ketahuan tidak generik
  begitu ada modul dengan bentuk kurikulum beda. Sudah dicabangkan per
  `moduleOverview.code === "PRE-N5.03"` di file ini. **Modul keempat
  dengan bentuk lain lagi kemungkinan akan menemukan celah serupa di
  file yang sama — cek dulu, jangan asumsikan sudah aman.**

### Yang SENGAJA belum diselesaikan — dicatat, bukan lupa

- ~~`resolvePhaseCode`-style disambiguation belum diterapkan ke
  `vocab-actions.ts`.~~ **Sudah diterapkan (PROMPT-10, 2026-08-25)** —
  modul KEDUA di jalur vocab-engine (PRE-N5.04 sapaan) memang membuat
  F1-nya bentrok `phase_code` dengan F1-nya PRE-N5.03 persis seperti
  diperkirakan. Diselesaikan dengan `resolveVocabPhaseCode(moduleCode,
  stageCode)` di `vocab-actions.ts` — map kecil `VOCAB_PHASE_PREFIX`
  (`{"PRE-N5.04": "V04"}`), diterapkan di KEDUA titik yang menulis/baca
  `phase_code` (`recordVocabAttempt` dan `completeVocabStage`'s
  retention-check query). **Sengaja tidak menyentuh PRE-N5.03** — modul
  yang tidak ada di map itu tetap pakai kode stage mentah tanpa prefiks,
  supaya data PRE-N5.03 yang sudah ada (dan pengguna asli yang mungkin
  sudah memakainya) tidak berubah format di tengah jalan. Diverifikasi
  langsung: attempt PRE-N5.04 F1 tersimpan sebagai `phase_code='V04_F1'`,
  attempt PRE-N5.03 F1 tetap `phase_code='F1'`, tidak ada percampuran.
  **Modul vocab-engine ketiga (05 kosakata / 10 listening) tinggal
  tambah satu baris ke `VOCAB_PHASE_PREFIX`, bukan menulis ulang
  mekanismenya.** **Sudah dilakukan (PROMPT-11, 2026-08-25)** — PRE-N5.05
  ditambahkan sebagai `"PRE-N5.05": "V05"`, diverifikasi langsung sama
  seperti V04: attempt PRE-N5.05 F1 tersimpan sebagai `phase_code='V05_F1'`.
- ~~`/progres` dan `/ulangi` tidak pernah membaca `user_vocab_mastery`
  sama sekali~~ **Ditemukan dan diselesaikan (PROMPT-11, 2026-08-25)** —
  grep sebelum sesi ini mengonfirmasi nol referensi ke
  `user_vocab_mastery`/`vocab_items` di `review-query.ts`,
  `mastery-tier.ts`, atau `/progres`, artinya mastery kosakata Modul 3
  dan 4 tidak pernah tampil di mana pun sejak dibangun. Ditambahkan
  `app/lib/vocab-mastery-query.ts` (`getVocabMasteryMap`,
  `getVocabReviewQueue`) plus `VocabMasteryList.tsx` di `/progres` dan
  satu seksi antrean di `/ulangi` — recognition dan production
  ditampilkan sebagai DUA badge terpisah per kata, bukan digabung
  (V2.1 §6.3). **Penyederhanaan yang disengaja**: tidak ada tingkat
  "transferable" untuk kosakata (butuh sinyal lolos RETENTION tanpa
  bantuan seperti kana punya; belum dibangun ulang di sini) — plafonnya
  "durable". `/ulangi`-nya juga baru daftar antrean, BUKAN sesi review
  interaktif otomatis-dinilai seperti kana punya (`ReviewRunner.tsx`
  tidak diperluas ke vocab) — kalau ada sesi depan yang butuh itu, bangun
  `VocabReviewRunner` terpisah, jangan paksa masuk ke `ReviewRunner`
  yang bentuk soalnya kana-spesifik. Diverifikasi lewat
  `recordVocabAttempt` sungguhan (server action asli, bukan tiruan):
  kata くも, skill `production`, langsung muncul di `/progres` sebagai
  `production: familiar` sementara `recognition` tetap `new` — buktinya
  kedua arah benar-benar terpisah.
- **Simulasi konbini masih sederhana** (5 transaksi acak dari kategori
  `price`, uang dibayar dipilih dari [1000,5000,10000] terdekat ke atas)
  — belum ada variasi skenario (mis. minta kembalian dalam pecahan
  koin/uang tertentu, dialog kasir yang lebih panjang). Fungsional dan
  teruji, tapi kedalamannya sengaja minimal untuk PROMPT-8; V2.1 sendiri
  menyebut ini kapsul, bukan menjabarkan detail wajib lain.
- **QA linguistik penutur asli belum dilakukan** atas 98 item yang
  di-seed `scripts/seed-pre-n5-03-vocab.ts` — skrip itu sendiri mencetak
  peringatan ini di akhir jalannya (lihat V2.1 §16 butir 10). Kontennya
  fakta buku teks standar dengan keyakinan tinggi, tapi belum direview
  manusia penutur asli.
- **Verifikasi visual/UI browser sungguhan tidak dilakukan sesi ini** —
  classifier keamanan memblokir penyuntikan cookie sesi akun test ke tab
  Chrome; pemilik memilih lewati langkah ini dan andalkan verifikasi
  fungsional (server action asli via HTTP + query DB langsung, lihat
  laporan akhir PROMPT-8) plus `tsc`/`lint`/`build` bersih. Modul ini
  TIDAK punya canvas tulisan tangan (satu-satunya alasan sesi kana
  selalu terpaksa pakai jalur server-action), jadi verifikasi visual
  browser sungguhan SEBENARNYA memungkinkan di sini — tinggal
  dilakukan pemilik sendiri, atau sesi berikutnya kalau classifier-nya
  bisa dilewati dengan cara lain.

### Checklist untuk modul vocab-engine berikutnya (04 sapaan / 05 kosakata / 10 listening)

1. Pastikan dulu apakah modulnya BENAR-BENAR cocok dengan mesin ini
   (dengar→bangun→kontras→checkpoint) atau perlu variasi lagi — jangan
   asumsikan otomatis cocok hanya karena "sama-sama bukan kana".
2. **Tambah entri prefiks `phase_code`** (lihat poin di atas) SEBELUM
   modul kedua ini di-deploy bersamaan dengan PRE-N5.03 di production.
3. Isi `vocab_items` untuk modul baru (kategori baru sesuai konten),
   `learning_stages.configuration.categories` per fase.
4. Kalau kontennya tidak punya pengecualian (`is_irregular`), fase
   kontras otomatis dilewati (`VocabLearningLab` sudah cek
   `unit.irregularItems.length > 0`) — tidak perlu kerja ekstra.
5. Kalau BOSS-nya bukan skenario belanja, jangan paksa pakai
   `KonbiniSimulation.tsx` — tulis komponen kapsul baru, tapi
   pertimbangkan pakai ulang pola 2-langkah bahasa/matematika kalau
   relevan.
6. Jalankan `npx tsc --noEmit`, `npm run lint`, `npm run build`, lalu
   verifikasi server action langsung (`recordVocabAttempt`/
   `completeVocabStage` via `tests/support/serverActions.ts`) — dan kalau
   memungkinkan, verifikasi visual browser sungguhan juga (modul
   non-tulisan-tangan tidak punya alasan untuk melewatinya).
7. **Isi `learning_stages.pass_criteria` secara eksplisit untuk SETIAP
   baris stage.** Ditemukan sesi PROMPT-10: baris scaffold PRE-N5.04
   punya `pass_criteria = '{}'::jsonb` (default kolom) karena hanya
   `configuration` yang diisi saat mengaktifkan modul, `pass_criteria`
   lupa disentuh. Akibatnya `completeVocabStage` sempat meloloskan skor
   berapa pun ("minimal 0%") — gerbang SERVER-nya bocor total meski UI
   klien sudah menegakkan 80% dengan benar. Ketahuan lewat verifikasi
   server-action langsung (`requiredLabel: 'minimal 0%'` di respons),
   bukan lewat membaca kode. **Selalu verifikasi `requiredLabel` di
   respons `completeVocabStage`/`completeHiraganaStage` sungguhan
   menyebut angka yang benar (80%/85%), jangan cuma cek `passed: true`
   — angka default kosong bisa membuat semuanya "lulus" secara diam-diam.**

## Modul KETIGA di jalur Vocabulary Engine — PRE-N5.04 (PROMPT-10)

PRE-N5.04 (Sapaan & Ungkapan Dasar) membuktikan mesin ini reusable
sungguhan, bukan cuma teori: engine yang sama (skema `vocab_items`,
`vocab-engine-query.ts`, `vocab-actions.ts`) melahirkan modul dengan
KEMAMPUAN BEDA — bukan hafal kosakata (PRE-N5.03), tapi memilih
ungkapan yang PANTAS untuk situasi sosial tertentu (register:
formal/casual, lihat `db/schema/vocab.ts`'s `register`/`registerOf`,
kolom baru yang ditambahkan modul ini — netral untuk modul yang tidak
butuh, tidak memaksa skema lama berubah bentuk).

- **Yang dipakai ulang APA ADANYA**: `vocab_items` (+2 kolom baru,
  aditif), `gate-logic.ts`, SRS math, `VocabQuiz.tsx` (BOSS/RETENTION
  generik — walau modul ini akhirnya TIDAK pakai VocabQuiz untuk BOSS-nya,
  lihat poin di bawah), pola stage-player (`VocabStagePlayer.tsx` cukup
  ditambah dua baris percabangan: `roleplayTransfer` dan
  `bundle.module.code === "PRE-N5.04"`).
- **Yang TERNYATA tidak cocok dipakai ulang**: `VocabLearningLab.tsx`
  (listen→build→contrast) — bentuknya "kenali lalu produksi item
  tunggal", sedangkan engine pragmatik butuh "baca SITUASI, pilih/
  hasilkan ungkapan yang PANTAS untuknya" — bentuk soal yang beda secara
  struktural (prompt = situasi, bukan audio/kana item itu sendiri).
  Ditulis `SapaanLearningLab.tsx` baru, TAPI tetap pakai ulang
  `.hiragana-lab`/`.hiragana-lab__rail` dkk. untuk wadah visualnya —
  bagian VISUAL generik, bagian STATE MACHINE tidak.
- **`VocabQuiz.tsx` juga ternyata tidak cocok untuk BOSS-nya** (soal
  situasional ganda menampilkan audio/kana item sebagai bagian prompt —
  itu justru membocorkan jawaban untuk soal "situasi → pilih ungkapan").
  Ditulis `SapaanRoleplay.tsx` baru, mengikuti pola `KonbiniSimulation.tsx`
  (komponen kapsul bespoke ketika bentuk interaksinya beda), bukan
  dipaksakan ke komponen generik yang ada.
- **Skenario situasional (situasi → ungkapan yang benar) sengaja BUKAN
  di database** — ditulis sebagai data TypeScript di
  `app/lib/sapaan-scenarios.ts`, dikunci ke `vocab_items.reading` (field
  stabil), bukan ke id baris atau ke key lokal skrip seed. Ini konten
  pedagogis kecil dan sangat spesifik-modul (~19 baris), bukan sesuatu
  yang berulang lintas modul seperti `vocab_items` sendiri — tabel
  generik baru untuk ini akan jadi over-engineering untuk satu modul.
- **Shadowing (V2.1 §6.7's "chunk shadowing") sengaja TIDAK
  disimpan/dinilai sama sekali** — sesuai izin eksplisit prompt
  ("kalau penilaian suara terlalu rumit, jangan paksa"), langkah ini
  murni UI self-report ("sudah dicoba?" lanjut) tanpa panggilan server
  action. Kalau penilaian produksi suara sungguhan dikerjakan nanti,
  ini titik yang perlu diisi — bukan bug, sengaja kosong.
- **Dua suara VOICEVOX per item** (V2.1 §6.7) — kolom baru
  `audio_url_speaker_2` di `vocab_items`, diisi lewat pemanggilan
  `synthesize()` dua kali per item di seed script. Modul lain yang ingin
  fitur sama tinggal tambah kolom yang sama (sudah ada), tidak perlu
  desain baru.
