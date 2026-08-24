# PRE-N5.02 — Rencana konten Katakana

Perencanaan murni (Bagian 8, Prompt 4). **Tidak ada kode ditulis untuk
katakana di sesi ini.** Ditulis terlepas dari status Bagian 1–7 — dokumen
tidak melanggar "jangan bangun modul lain sebelum satu modul terbukti"
karena bukan kode.

Sumber: `docs/curriculum-v2.1/rancangan_modul_pre_n5_sampai_n1_v2_1_upgrade_lengkap.md`
Bagian 7, bagian PRE-N5.02 — dan verifikasi langsung ke database (bukan tebakan).

## Cek data yang sudah ada — semuanya lengkap

Dicek langsung lewat query, bukan diasumsikan:

- **46 katakana dasar**: semuanya punya `stroke_data_key` **dan** file JSON-nya
  benar-benar ada di `public/kana-strokes/` (0 hilang), **dan** `audio_url`
  terisi (0 hilang) — sama lengkapnya dengan hiragana.
- **Dakuten (20), handakuten (5), youon (33)** untuk katakana **juga sudah
  ada** di `kana_characters` — pola sama seperti hiragana F6–F12.
- **Dua tipe tambahan yang hiragana tidak punya**: `long_vowel` (1 baris —
  tanda bunyi panjang ー) dan `foreign_combo` (9 baris — kombinasi khusus
  serapan asing, mis. ファ/フィ/フェ/フォ/ティ/ディ). Ini yang dimaksud V2.1
  sebagai "modifiers, kombinasi, prolonged sound mark" untuk katakana.
- **Microset kontras シ/ツ dan ソ/ン yang diminta prompt — datanya SUDAH ADA**
  di `kana_confusion_pairs` (`confusion_type: 'visual'`), tidak perlu
  ditambah. Bonus yang juga sudah ada: ク/ケ, ス/ヌ, フ/ワ (visual), plus 5
  pasangan `cross_script` hiragana↔katakana (あ/ア, き/キ, こ/コ, す/ス,
  め/メ, り/リ) yang bisa dipakai nanti untuk uji "hiragana-katakana baru
  dicampur setelah katakana terkait mencapai Retrievable".
- **151 kata contoh** (`kana_example_words`) sudah tertaut ke minimal satu
  karakter katakana — modal awal untuk "setiap batch segera dipakai dalam
  kata serapan valid".

**Tidak ada yang kurang** untuk membangun P1–P5 core 46. Extension phase
(dakuten/handakuten/youon/long_vowel/foreign_combo) juga siap datanya,
tinggal menunggu core 46 selesai (sama seperti aturan hiragana).

## Peringatan yang sama seperti hiragana: urutan kolom DB tidak bisa dipakai

`group_code`/`order_in_group` untuk katakana **juga tidak berurutan bersih**
secara gojuon (dicek langsung: urutan mentahnya
`カラマヤナアサタワハニミリヒキイヲチユシツムルヌヨクンスウフメケヘエセテネレホトソモコロオノ`
— acak). Implementasi nanti **harus** mendefinisikan array urutan kanonis
sendiri di kode, sama seperti `HIRAGANA_BASIC_CHARACTERS` — jangan percaya
kolom database untuk urutan tampil/chunking.

## Pembagian P1–P5 (paralel dengan hiragana, 46 karakter, 10/10/10/10/6)

| Fase | Baris | Karakter | Jumlah |
|---|---|---|---|
| P1 | vokal + カ | アイウエオ + カキクケコ | 10 |
| P2 | サ + タ | サシスセソ + タチツテト | 10 |
| P3 | ナ + ハ | ナニヌネノ + ハヒフヘホ | 10 |
| P4 | マ + ヤ + ラ(2) | マミムメモ + ヤユヨ + ラリ | 10 |
| P5 | ラ(sisa) + ワ/ヲ/ン | ルレロ + ワヲン | 6 |

Sama persis jumlahnya dengan hiragana — sesuai instruksi prompt "Chunking:
10/10/10/10/6 seperti Hiragana". Pembagian per-fase mengikuti pola baris
yang sama (vokal+K, S+T, N+H, M+Y+separuh-R, sisa-R+W/N) supaya kedua jalur
terasa konsisten bagi pemula.

### Microset kontras — penempatan

- **シ/ツ**: keduanya sudah masuk bank di P2 (シ dari baris サ, ツ dari baris
  タ, dua-duanya baru di fase yang sama). Ditempatkan sebagai **sesi
  discriminate tambahan di akhir P2**, setelah kedua huruf diperkenalkan
  lewat batch normalnya — bukan menunggu fase lain.
- **ソ/ン**: **tidak** bisa satu fase — ソ ada di P2 (baris サ), ン baru
  muncul di P5 (huruf terakhir). Ditempatkan sebagai **sesi discriminate
  khusus di P5**, begitu ン diperkenalkan — sengaja menyandingkan huruf lama
  (ソ, sudah beberapa fase berlalu) dengan huruf baru (ン), karena itu justru
  pasangan yang paling gampang salah pada tahap ini menurut riset yang
  dirujuk V2.1.

Keduanya bisa dibangun lewat mesin `discriminate` yang sudah ada
(`kana_confusion_pairs` generik untuk track mana pun) — **tidak perlu
mekanisme baru**, hanya perlu memastikan urutan pembelajaran (bukan hanya
data confusable-nya) menaruh sesi tambahan di titik yang tepat.

## Alur belajar (V2.1 §7 PRE-N5.02)

> "bentuk dan arah stroke → guided writing → audio mapping → loanword chunk
> → sign/label retrieval"

Ini **berbeda susunan** dari engine hiragana (lihat-dengar → bedakan → ikuti
stroke → tulis dari memori singkat → tulis dari audio → campuran kumulatif).
Katakana menambahkan dua langkah yang hiragana tidak punya: **loanword
chunk** (pakai huruf yang baru dipelajari langsung dalam kata serapan nyata)
dan **sign/label retrieval** (pengenalan dalam konteks papan nama/label,
bukan cuma kartu kata) — mencerminkan fungsi katakana yang beda dari
hiragana (bukan cuma fonetik, tapi penanda kata asing/serapan).

**Keputusan desain untuk nanti**: `HiraganaLearningLab.tsx` (nama generik
meski isinya sudah dipakai ulang untuk ekstensi hiragana) kemungkinan besar
**tidak** bisa dipakai ulang mentah-mentah untuk katakana — perlu varian baru
(atau parameterisasi lebih jauh) yang punya langkah loanword-chunk dan
sign/label-retrieval, bukan discriminate/shortMemory/recall generik. Ini
pekerjaan desain, bukan cuma "arahkan ke characterSet baru" seperti F6–F12.

**Perubahan infrastruktur yang dibutuhkan**: `pre-n5-01-query.ts`'s
`CHARACTER_TRACKS` saat ini hardcode `.eq("script", "hiragana")` di query
`kana_characters` — untuk katakana perlu jadi parameter, bukan konstanta.
Nama-nama file (`pre-n5-01-query.ts`, `HiraganaLearningLab.tsx`,
`HiraganaQuiz.tsx`, `HiraganaStagePlayer.tsx`) juga sudah kadung
hiragana-spesifik di namanya sendiri — layak dipertimbangkan apakah
rename/generalize ke `pre-n5-query.ts` dkk. sepadan sebelum mulai
mengerjakan PRE-N5.02, supaya kode tidak makin membingungkan.

## Gate (V2.1 §7)

> "dua sesi tanpa hint, satu delayed set, dan satu real-world transfer"

Berbeda dari hiragana yang cukup satu `RETENTION` stage setelah BOSS — PRE-N5.02
tersirat butuh **evidence dari beberapa sesi terpisah waktu** ("dua sesi"),
bukan satu percobaan tunggal. Belum jelas dari V2.1 apakah ini berarti dua
hari berbeda, atau dua *attempt* dalam sesi yang sama tapi dipisah jeda
pendek — perlu diklarifikasi ke V2.1 lebih lanjut atau ke pemilik produk
sebelum diimplementasikan, jangan menebak.

## Daftar kata serapan awal per batch

Contoh nyata dari 151 kata yang sudah tertaut (bukan daftar lengkap — ambil
sampel yang jelas relevan per batch di atas; verifikasi ulang saat implementasi
karena daftar ini tidak dikonfirmasi lengkap per-baris):

- **P1 (vokal+カ)**: kata yang dominan huruf アイウエオカキクケコ.
- **P2 (サ+タ)**: kata dengan シ/ツ menonjol — cocok untuk sekaligus
  memperkuat microset kontrasnya (mis. kata yang mengandung シ dan kata
  yang mengandung ツ berdampingan dalam satu sesi retrieval).
- **P3–P5**: sampel serupa per baris huruf.

**Verifikasi konten sesungguhnya (kata mana persis, romaji, makna Indonesia)
belum dilakukan di sesi ini** — 151 adalah angka baris tertaut, bukan daftar
kata yang sudah dikurasi/diverifikasi kualitasnya untuk pembelajaran.
Implementasi nanti perlu query manual per batch dan QA linguistik (sesuai
Bagian 16 kontrak handoff V2.1 butir 10: "Setiap perubahan konten Jepang
memerlukan QA linguistik dan test asset").
