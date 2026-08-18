# KONTEN M01 — ORIENTASI BAHASA JEPANG
**Status: DRAFT — butuh validasi tim**

Modul ini adalah pintu masuk pertama. Pembelajar belum tahu apa pun.
Tujuannya bukan mengajarkan, tapi **menghilangkan rasa takut** dan memberi peta jalan.

Prinsip yang saya pakai:
- Tidak ada hafalan sama sekali di M01
- Tidak ada latihan menulis
- Romaji ditampilkan penuh (`romaji_policy: always`) — ini satu-satunya modul yang begitu
- Latihan hanya bersifat pengenalan, tidak ada nilai kelulusan
- **Soal menguji pemahaman konsep yang baru dijelaskan, BUKAN hafalan arti
  kata baru.** Pembelajar belum pernah belajar kosakata apa pun, jadi soal
  bertipe "kata ini artinya apa" tidak adil di M01. Pengecualian: L04, karena
  keempat kata di sana memang materi utamanya.
- Bahasa Indonesia santai, hindari istilah linguistik

---

# L01 — SELAMAT DATANG DI BAHASA JEPANG

**Tipe lesson:** orientation
**Estimasi:** 5 menit
**Target:** tidak ada (eksplorasi bebas)

## Blok 1 — Bahasa Jepang itu seperti apa?

> Bahasa Jepang dipakai oleh sekitar 125 juta orang. Kalau Anda pernah menonton
> anime, bermain game Jepang, atau mendengar lagu J-pop, Anda sebenarnya sudah
> pernah mendengarnya berkali-kali.
>
> Ada satu kabar baik yang jarang disebut: **bunyi bahasa Jepang jauh lebih mudah
> bagi orang Indonesia daripada bagi orang Eropa atau Amerika.**
>
> Vokal Jepang ada lima — a, i, u, e, o — dan dibaca hampir sama persis dengan
> vokal bahasa Indonesia. Bandingkan dengan bahasa Inggris, di mana huruf "a"
> bisa berbunyi berbeda-beda di kata *cat*, *car*, dan *cake*.
>
> Jadi Anda memulai dengan keunggulan yang tidak disadari.

**Catatan validasi:** klaim "125 juta penutur" — mohon dicek ulang tim, angka ini
berubah tiap tahun.

## Blok 2 — Contoh tulisan Jepang

Tampilkan kalimat ini besar di tengah layar:

```
私の名前はアスロです。
```

Romaji: *watashi no namae wa Asuro desu*
Arti: **Nama saya Asro.**

> Catatan implementasi: bagian アスロ diisi dengan nama pengguna yang sedang
> login, dikonversi ke Katakana. Kalau konversi belum tersedia, pakai
> アスロ sebagai contoh tetap.

> Perhatikan kalimat di atas. Bentuk hurufnya tidak seragam — ada yang rumit
> dan padat, ada yang bulat dan mengalir, ada yang kaku bersudut.
>
> Itu bukan kebetulan. Bahasa Jepang memakai **tiga sistem tulisan sekaligus
> dalam satu kalimat.**

## Blok 3 — Tiga sistem tulisan

Tampilkan kalimat yang sama, tapi dengan tiap sistem diberi warna berbeda:

| Bagian | Sistem | Fungsi di kalimat ini |
|---|---|---|
| 私 、 名前 | Kanji | Membawa arti inti: "saya", "nama" |
| の 、 は 、 です | Hiragana | Perekat tata bahasa dan penutup sopan |
| アスロ | Katakana | Nama asing — termasuk nama Anda sendiri |

> **Hiragana** — 46 huruf, bentuknya bulat dan mengalir. Ini fondasinya.
> Dipakai untuk kata asli Jepang dan seluruh tata bahasa. Ini yang akan
> Anda pelajari pertama.
>
> **Katakana** — 46 huruf juga, bunyinya sama persis dengan Hiragana, tapi
> bentuknya kaku dan bersudut. Dipakai khusus untuk kata serapan dari bahasa
> asing. Nama Anda pun akan ditulis dengan Katakana.
>
> **Kanji** — huruf yang berasal dari Tiongkok. Setiap huruf membawa arti,
> bukan cuma bunyi. Jumlahnya ribuan, tapi untuk JLPT N5 Anda hanya perlu
> sekitar 100.

**Catatan validasi:** apakah tim setuju Katakana disebut "bunyinya sama persis"?
Secara teknis benar untuk 46 dasar, tapi Katakana punya kombinasi tambahan
(ファ, ティ, dll) yang tidak ada di Hiragana. Saya sengaja sederhanakan di M01
dan akan diluruskan di M03.

## Blok 4 — Peta perjalanan Anda

Tampilkan sebagai jalur bertahap:

```
SEKARANG          Orientasi — Anda di sini
     ↓
BERIKUTNYA        Hiragana — 46 huruf, fondasi segalanya
     ↓
LALU              Katakana — 46 huruf untuk kata serapan
     ↓
KEMUDIAN          Kanji dasar + kosakata + tata bahasa
     ↓
TUJUAN            JLPT N5
```

> Yang perlu Anda tahu: **Hiragana adalah bagian tersulit yang akan Anda lewati
> di awal** — bukan karena rumit, tapi karena semuanya masih asing.
>
> Setelah Hiragana dikuasai, semua yang datang setelahnya terasa lebih ringan,
> karena Anda sudah punya alat untuk membaca.

## Latihan L01 — pengenalan, tanpa nilai

Tipe: `visual_to_meaning` (pilihan ganda, tanpa penalti)

**Soal 1**
Prompt: Hiragana punya ciri bentuk yang...
- A) kaku dan banyak bersudut
- B) **bulat dan mengalir** ← BENAR
- C) padat dan rumit
Penjelasan: Hiragana dikenali dari lengkungannya yang lembut. Katakana
justru kaku bersudut, dan Kanji cenderung padat.

**Soal 2**
Prompt: Kalimat 私の名前はアスロです memakai berapa sistem tulisan?
- A) Satu
- B) Dua
- C) **Tiga** ← BENAR
Penjelasan: Kanji (私, 名前), Hiragana (の, は, です), dan Katakana (アスロ)
muncul bersamaan dalam satu kalimat. Ini normal dalam bahasa Jepang.

**Soal 3**
Prompt: Sistem tulisan mana yang akan Anda pelajari pertama?
- A) **Hiragana** ← BENAR
- B) Katakana
- C) Kanji
Penjelasan: Hiragana adalah fondasinya. Tanpa Hiragana, tata bahasa Jepang
tidak bisa dibaca sama sekali.

---

# L02 — BERKENALAN DENGAN HIRAGANA

**Tipe lesson:** orientation
**Estimasi:** 6 menit

## Blok 1 — Apa itu Hiragana?

> Hiragana adalah 46 huruf yang menjadi dasar seluruh bahasa Jepang.
>
> Bedanya dengan alfabet Latin: dalam bahasa Indonesia, huruf "k" tidak punya
> bunyi sendiri sampai digabung dengan vokal. Dalam Hiragana, **setiap huruf
> sudah merupakan satu suku kata utuh.**
>
> か dibaca "ka". Bukan "k" lalu "a" — langsung "ka", satu tarikan.
>
> Ini justru memudahkan: begitu Anda tahu bunyinya, Anda bisa membacanya.
> Tidak ada aturan pengecualian seperti bahasa Inggris.

## Blok 2 — Lihat seluruh chart

Tampilkan `KanaChart` lengkap 46 karakter, semua dalam keadaan redup
(belum diajarkan), bisa diklik untuk mendengar bunyinya.

> Inilah yang akan Anda kuasai. Terlihat banyak sekarang — itu wajar.
>
> Kita tidak akan menghafalnya sekaligus. Kita membaginya menjadi
> **10 kelompok, masing-masing 5 huruf.** Satu kelompok bisa diselesaikan
> dalam satu kali duduk.
>
> Silakan klik huruf mana saja untuk mendengar bunyinya. Tidak perlu dihafal
> sekarang — cuma untuk membiasakan telinga.

**Catatan teknis:** ini butuh audio untuk 46 karakter. Sekarang baru 5 (Grup A)
yang ada. Sisanya akan tampil dengan tombol nonaktif sampai audio lengkap.

## Blok 3 — Dengarkan beberapa contoh

Tampilkan 3 kata dengan audio, tanpa target hafalan:

| Kata | Romaji | Arti |
|---|---|---|
| あお | ao | biru |
| いえ | ie | rumah |
| うえ | ue | atas |

> Dengarkan ketiganya. Perhatikan bahwa tiap huruf dibaca dengan panjang
> yang sama rata — tidak ada suku kata yang ditekan lebih keras seperti
> dalam bahasa Inggris.
>
> Ritme bahasa Jepang itu datar dan teratur. Ini terasa aneh di awal,
> lalu justru jadi memudahkan.

## Blok 4 — Yang akan terjadi selanjutnya

> Mulai modul berikutnya, kita akan mengambil 5 huruf pertama: **あ い う え お**
>
> Untuk setiap kelompok, Anda akan melewati empat tahap:
>
> 1. **Kenali** — lihat bentuknya, dengar bunyinya
> 2. **Uji** — bedakan dari huruf lain yang mirip
> 3. **Tulis** — dari menjiplak sampai menulis mandiri
> 4. **Baca** — pakai dalam kata sungguhan
>
> Anda baru boleh lanjut ke kelompok berikutnya setelah lulus tahap keempat.
> Ini disengaja — kelompok berikutnya akan terasa jauh lebih berat kalau
> yang sebelumnya masih goyah.

## Latihan L02

**Soal 1**
Prompt: Berapa jumlah Hiragana dasar?
- A) 26
- B) **46** ← BENAR
- C) 100
Penjelasan: 46 huruf dasar, dibagi menjadi 10 kelompok kecil.

**Soal 2**
Prompt: Huruf か dibaca sebagai...
- A) "k"
- B) **"ka"** ← BENAR
- C) "a"
Penjelasan: Setiap Hiragana adalah satu suku kata utuh, bukan satu bunyi
konsonan terpisah.

**Soal 3** — audio
Prompt: [putar audio あお] Berapa huruf yang Anda dengar?
- A) satu
- B) **dua** ← BENAR
- C) tiga
Penjelasan: あ dan お — dua huruf, masing-masing dibaca dengan panjang yang
sama rata. Inilah ritme datar bahasa Jepang.

---

# L03 — BERKENALAN DENGAN KATAKANA & KANJI

**Tipe lesson:** orientation
**Estimasi:** 5 menit

## Blok 1 — Katakana itu apa?

> Katakana punya 46 huruf dengan bunyi yang sama persis seperti Hiragana.
> Bedanya hanya bentuk — dan kapan dipakainya.
>
> Bandingkan pasangan berikut. Bunyinya identik:

| Hiragana | Katakana | Bunyi |
|---|---|---|
| あ | ア | a |
| い | イ | i |
| う | ウ | u |

> Hiragana bulat dan mengalir. Katakana kaku, tajam, banyak sudut.
>
> Katakana dipakai untuk **kata yang datang dari luar Jepang**:

| Katakana | Romaji | Asalnya |
|---|---|---|
| コーヒー | kōhī | coffee |
| インドネシア | indoneshia | Indonesia |
| スマホ | sumaho | smartphone |

> Nama Anda juga akan ditulis dengan Katakana. "Asro" menjadi **アスロ**.

**Catatan validasi:** mohon tim cek transliterasi nama contoh. Kalau nama
pengguna dipakai secara dinamis nanti, butuh aturan konversi tersendiri —
ini tidak sesederhana kelihatannya.

## Blok 2 — Kanji itu apa?

> Kanji berbeda secara mendasar. Hiragana dan Katakana melambangkan **bunyi**.
> Kanji melambangkan **arti**.

| Kanji | Arti | Cara baca |
|---|---|---|
| 日 | matahari / hari | hi, nichi, ka |
| 本 | buku / asal | hon, moto |
| 日本 | **Jepang** | Nihon |

> Perhatikan yang terjadi di baris ketiga: "matahari" digabung dengan "asal"
> menghasilkan **"asal matahari"** — itulah arti nama Jepang, negeri matahari terbit.
>
> Inilah kekuatan Kanji. Sekali Anda mengenali sebagian, arti kata baru
> sering bisa ditebak tanpa pernah mempelajarinya.
>
> Sisi beratnya: satu Kanji bisa punya beberapa cara baca, tergantung
> pasangannya. Tapi itu urusan nanti.

## Blok 3 — Kapan mempelajarinya?

> **Katakana** — segera setelah Hiragana selesai. Karena bunyinya sama,
> mempelajarinya akan terasa jauh lebih cepat.
>
> **Kanji** — dicicil sedikit demi sedikit, digabung dengan kosakata.
> Untuk JLPT N5 cukup sekitar 100 Kanji, dan Anda tidak akan
> mempelajarinya sebagai daftar hafalan terpisah.
>
> Jangan cemaskan Kanji sekarang. Fokus Anda satu: **Hiragana.**

## Latihan L03

**Soal 1**
Prompt: Katakana punya ciri bentuk yang...
- A) bulat dan mengalir
- B) **kaku dan bersudut** ← BENAR
- C) padat dan rumit
Penjelasan: Katakana dikenali dari garis lurus dan sudut tajamnya —
kebalikan dari Hiragana yang melengkung.

**Soal 2**
Prompt: Kata "Indonesia" dalam bahasa Jepang ditulis dengan...
- A) Hiragana
- B) **Katakana** ← BENAR
- C) Kanji
Penjelasan: Nama negara asing dan kata serapan selalu memakai Katakana.

**Soal 3**
Prompt: Apa yang membedakan Kanji dari Hiragana?
- A) Kanji jumlahnya lebih sedikit
- B) **Kanji melambangkan arti, bukan sekadar bunyi** ← BENAR
- C) Kanji hanya dipakai untuk kata serapan
Penjelasan: Hiragana dan Katakana melambangkan bunyi. Kanji membawa arti,
itulah sebabnya 日 dan 本 bisa digabung menjadi kata baru.

---

# L04 — BAHASA JEPANG PERTAMA ANDA

**Tipe lesson:** orientation_practice
**Estimasi:** 8 menit

Catatan desain: ini lesson terakhir M01 dan harus terasa sebagai
**kemenangan pertama.** Pembelajar harus keluar dari sini merasa
"saya sudah bisa sesuatu", bukan "saya baru diberi tahu banyak hal".

## Blok 1 — こんにちは

| | |
|---|---|
| Tulisan | こんにちは |
| Romaji | konnichiwa |
| Arti | Halo / Selamat siang |

> Ini sapaan paling dikenal di dunia. Dipakai dari sekitar pukul 10 pagi
> sampai matahari terbenam.
>
> Satu hal menarik: huruf terakhirnya は yang seharusnya dibaca "ha",
> tapi di sini dibaca **"wa"**. Ini sisa dari bentuk kalimat yang lebih
> panjang di masa lalu. Anda akan bertemu aturan ini lagi nanti sebagai
> partikel tata bahasa.

**Aktivitas:** dengar → tirukan → ketik ulang dengan `KanaTypingInput`

## Blok 2 — ありがとう

| | |
|---|---|
| Tulisan | ありがとう |
| Romaji | arigatou |
| Arti | Terima kasih |

> Untuk versi yang lebih sopan, tambahkan ございます di belakangnya:
> **ありがとうございます** (arigatou gozaimasu).
>
> Pakai versi panjang kepada orang yang lebih tua, atasan, atau orang
> yang baru dikenal. Versi pendek untuk teman.

## Blok 3 — すし

| | |
|---|---|
| Tulisan | すし |
| Romaji | sushi |
| Arti | Sushi |

> Anda sudah tahu kata ini. Yang baru hanyalah bentuk tulisannya.
>
> Perhatikan: ditulis dengan **Hiragana**, bukan Katakana — karena sushi
> adalah makanan asli Jepang, bukan kata serapan.

## Blok 4 — 日本

| | |
|---|---|
| Tulisan | 日本 |
| Romaji | Nihon |
| Arti | Jepang |

> Kanji pertama Anda. Dua huruf, satu arti: negeri matahari terbit.
>
> Anda mungkin pernah melihatnya di kemasan produk, poster film, atau
> logo. Mulai sekarang Anda akan mengenalinya.

## Blok 5 — Interaksi pertama

Simulasi percakapan sederhana. Pembelajar memilih respons, bukan mengetik bebas.

```
Seseorang menyapa Anda:
    こんにちは！

Apa yang Anda jawab?
    A) ありがとう
    B) こんにちは      ← BENAR
    C) すし
```

Setelah benar:

```
Anda memberi sesuatu kepadanya. Dia berkata:
    ありがとう！

Anda baru saja melakukan percakapan pertama dalam bahasa Jepang.
```

## Latihan L04

**Soal 1**
Prompt: こんにちは artinya...
- A) Terima kasih
- B) **Halo** ← BENAR
- C) Selamat tinggal
Penjelasan: Sapaan untuk siang hari, dari sekitar pukul 10 sampai petang.

**Soal 2** — audio
Prompt: [putar audio ありがとう] Ini artinya...
- A) **Terima kasih** ← BENAR
- B) Maaf
- C) Halo

**Soal 3** — mengetik
Prompt: Ketik "sushi" dalam Hiragana
Jawaban: すし
Penjelasan: Ketik "sushi" dan huruf akan berubah otomatis menjadi すし.

**Soal 4**
Prompt: 日本 ditulis dengan sistem tulisan apa?
- A) Hiragana
- B) Katakana
- C) **Kanji** ← BENAR
Penjelasan: Dua huruf Kanji, 日 dan 本. Bentuknya padat dan bersudut rapat —
berbeda dari すし yang ditulis dengan Hiragana.

## Penutup modul

> Anda baru saja menyelesaikan modul pertama.
>
> Anda sekarang tahu tiga sistem tulisan Jepang, tahu apa itu Hiragana,
> dan sudah bisa mengucapkan empat hal dalam bahasa Jepang.
>
> Berikutnya kita mulai serius: **あ い う え お** — lima huruf pertama.

---

# YANG DIBUTUHKAN UNTUK MENJALANKAN M01

## Audio baru (di luar 12 file Grup A)

| Item | Tipe |
|---|---|
| こんにちは | frasa |
| ありがとう | frasa |
| ありがとうございます | frasa |
| すし | kata |
| 日本 | kata |
| 私の名前はアスロです | kalimat contoh |
| コーヒー | kata |
| インドネシア | kata |
| スマホ | kata |
| ア、イ、ウ | kana katakana |

Total 10 file tambahan. **Gunakan VOICEVOX, bukan OpenAI** — terutama untuk
kalimat contoh, karena aksen non-Jepang akan sangat terdengar pada kalimat
penuh dibanding pada suku kata tunggal.

## Kebutuhan schema

Tabel `kana_lessons` belum punya tempat untuk konten naratif seperti di atas.
Perlu tambahan — usulan saya: tabel `lesson_content_blocks` dengan kolom
`lesson_id`, `order_index`, `block_type` (text / chart / table / audio_list /
dialogue), dan `content` (jsonb).

Ini keputusan arsitektur, jadi sebaiknya dibahas dengan Claude Code sebelum
konten ini di-seed.

## Yang perlu divalidasi tim

1. Angka 125 juta penutur — cek ulang
2. Penyederhanaan "Katakana bunyinya sama persis dengan Hiragana"
3. Aturan transliterasi nama ke Katakana
4. Nada bahasa secara keseluruhan — apakah sudah cocok dengan audiens Anda?
