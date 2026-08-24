# Pola membangun modul baru di atas mesin yang sudah ada

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
