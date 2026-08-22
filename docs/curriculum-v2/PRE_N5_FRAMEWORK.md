# Kurikulum V2 — Kerangka Pre-N5

Sumber produk: `rancangan_modul_pre_n5_sampai_n1.pdf`.

## Keputusan migrasi

- Kurikulum lama `kana_modules` M01-M05 tidak dihapus dari database pada tahap kerangka.
- Halaman `/belajar` dan dashboard membaca tabel V2 sehingga kurikulum lama tidak lagi berada di jalur aktif.
- Data karakter kana, stroke, audio, akun, Supabase SSR, dan infrastruktur latihan lama dipertahankan sebagai aset yang dapat digunakan ulang.
- Progres V1 tidak dipetakan otomatis ke V2 karena definisi modul, fase, dan kelulusannya berubah.
- V1 baru dapat dihapus permanen setelah PRE-N5.01 lulus verifikasi end-to-end dan rollback V2 terbukti.

## Model V2

- `curriculum_versions`: memisahkan V1 dan V2.
- `curriculum_levels`: profil kesulitan per level.
- `learning_modules`: tujuh tipe modul SCR, VOC, GRA, FUN, LIS, REA, dan BOS.
- `learning_module_prerequisites`: prerequisite graph bercabang.
- `learning_stages`: Discover, Trace/Deconstruct, Recall/Produce, Blitz/Pressure, SRS, Boss, atau assessment.
- `user_learning_module_progress` dan `user_learning_stage_progress`: progres V2 terpisah dengan RLS per pengguna.

## Profil kesulitan Pre-N5

| Parameter | Nilai |
| --- | --- |
| Recognition speed | 3.000 ms |
| Distractor | Tidak mirip |
| Production | Pilih 3 mirip |
| Context | 1 kalimat pendek |
| AI roleplay | 3 turn scripted |
| Furigana | 100% |

## Modul dan prasyarat

| Kode | Modul | Tipe | Prasyarat |
| --- | --- | --- | --- |
| PRE-N5.01 | Hiragana Master | SCR | - |
| PRE-N5.02 | Katakana Master | SCR | PRE-N5.01 |
| PRE-N5.03 | Angka, Waktu & Counter | VOC | PRE-N5.01 |
| PRE-N5.04 | Sapaan & Ungkapan Dasar | FUN | PRE-N5.01 |
| PRE-N5.05 | Kosakata Dasar 100 | VOC | PRE-N5.01 |
| PRE-N5.06 | Kata Ganti & Kosakata Lokasi | VOC | PRE-N5.05 |
| PRE-N5.07 | Partikel Dasar は・が・の | GRA | PRE-N5.05 |
| PRE-N5.08 | Kalimat Polite です・ます | GRA | PRE-N5.07 |
| PRE-N5.09 | Partikel Lokasi に・で・へ | GRA | PRE-N5.08 |
| PRE-N5.10 | Listening Pre-N5 | LIS | PRE-N5.04 |
| PRE-N5.11 | Boss Pre-N5 Mastery | BOS | PRE-N5.01 sampai PRE-N5.10 |

## Tahap berikutnya

PRE-N5.01 menjadi vertical slice pertama. Implementasi dimulai dari kontrak unit/exercise, kemudian F1-F5 dan Hiragana Gate, diikuti verifikasi desktop, mobile, progres, RLS, dan interaksi nyata.
