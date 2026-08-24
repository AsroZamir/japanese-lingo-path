# Potret PRE-N5.01 apa adanya — 2026-08-24

Audit baca-saja (tidak ada kode yang diubah). File yang dibaca: `app/(app)/belajar/pre-n5/[moduleCode]/page.tsx`, `.../[stageCode]/page.tsx`, `HiraganaStagePlayer.tsx`, `HiraganaLearningLab.tsx`, `HiraganaQuiz.tsx`, `actions.ts`, `app/lib/curriculum-v2.ts`, `app/lib/pre-n5-01-query.ts`, `app/lib/hiragana-mnemonics.ts`, plus query langsung ke database (`learning_stages.configuration`, `user_kana_attempts.exercise_type`, `learning_module_prerequisites`).

## 1. Apa bedanya F1/F2/F3/F4/F5/BOSS?

F1–F5 me-render **komponen yang persis sama**: `HiraganaLearningLab`. Bedanya hanya data batch huruf yang dikirim ke komponen itu (`defaultScopes` di `pre-n5-01-query.ts`): F1=10 huruf baru (kumulatif 10), F2=+10 (20), F3=+10 (30), F4=+10 (40), F5=+6 (46). Hanya BOSS yang benar-benar beda komponen — dia me-render `HiraganaQuiz` dengan soal gabungan dari seluruh 46 huruf.

## 2. Dua jalur `learningFlow` — "legacy" vs default

`HiraganaStagePlayer.tsx` punya percabangan: kalau `bundle.stage.configuration.learningFlow === "legacy"`, dipakai komponen lama (`TraceStage` untuk F2, `HiraganaQuiz` recall untuk F3, `BlitzStage` untuk F4, `HiraganaQuiz` SRS untuk F5). Saya cek langsung ke database: keenam baris `learning_stages` milik PRE-N5.01 (F1, F2, F3, F4, F5, BOSS) semuanya punya `configuration->>'learningFlow' = null`. **Jalur "legacy" adalah kode mati sekarang — tidak pernah aktif untuk siapa pun.** Satu-satunya jalur yang jalan adalah jalur default (`HiraganaLearningLab` untuk F1–F5, `HiraganaQuiz` untuk BOSS), dan yang menentukan jalur mana yang jalan adalah isi kolom `configuration` per baris di database.

## 3. Berapa huruf yang benar-benar diajarkan (20 atau 46)?

**46**, bukan 20. Daftarnya di-hardcode sebagai array `HIRAGANA_BASIC_CHARACTERS` (46 karakter, urutan gojuon standar) di `app/lib/hiragana-mnemonics.ts`, lalu dicocokkan ke tabel `kana_characters` di database. Pembagian per-stage sudah persis sama dengan tabel Fase P1–P5 di V2.1 §3.1 (10/10/10/10/6, kumulatif 10/20/30/40/46) — angka-angkanya sudah benar sejak sekarang, yang belum sesuai adalah cara belajarnya (lihat poin 7).

## 4. Exercise type apa saja, dan string apa yang ditulis ke `user_kana_attempts`?

Kode mengenal 11 jenis (`checkpoint`, `trace`, `type_romaji`, `reverse_recall`, `audio_visual`, `write_from_audio`, `blitz`, `srs`, `gate_recognition`, `gate_audio`, `gate_writing`), lalu `actions.ts` menambahkan awalan `v2_{kode_stage}_` sebelum disimpan. Saya cek langsung ke database — yang **benar-benar** tertulis hanya 6 baris: `v2_f1_audio_visual` (27), `v2_f1_checkpoint` (31), `v2_f1_trace` (46), `v2_f1_type_romaji` (6), `v2_f1_write_from_audio` (83), dan `v2_f2_trace` (hanya 1 baris). Artinya secara nyata baru F1 yang betul-betul dipakai orang; F2 baru disentuh sekali, dan F3/F4/F5/BOSS belum pernah disentuh siapa pun.

## 5. Mnemonic muncul sebelum atau sesudah user mencoba mengingat?

**Sebelum** — bertentangan dengan V2.1 §9. Fase pertama "anchor" (label UI: "Kenali") menampilkan kana, mnemonic, dan audio SEBELUM user mencoba apa pun. Fase "recall" (label UI: "Ingat" — menulis dari ingatan) baru terjadi setelahnya, dan secara default TIDAK menampilkan mnemonic; mnemonic/petunjuk hanya muncul lagi kalau user secara sadar meminta hint level 1.

## 6. Apakah `learning_module_prerequisites` (19 baris) dipaksakan di kode, atau cuma tampilan?

**Cuma tampilan (soft), bukan hard lock.** Nilai `locked` di `curriculum-v2.ts` hanya dipakai untuk gaya kartu terkunci di halaman `/belajar` (`app/(app)/belajar/page.tsx`) — tidak ada pengecekan di server saat route modul dibuka langsung. Kebetulan ini tidak berbahaya sekarang karena hanya PRE-N5.01 yang punya halaman sungguhan (10 modul lain masih "scaffold" dan tidak punya route sama sekali, otomatis 404 kalau diakses langsung). Kondisi ini kebetulan sudah sesuai keinginan V2.1 §5.3 (soft prerequisite), meski itu bukan karena didesain begitu — melainkan karena modul lain belum dibangun.

## 7. Berapa tingkat hint ladder sekarang, dan isi masing-masing?

**2 tingkat**, bukan 3, dan keduanya hanya ada di fase "recall":
- Level 1 "Petunjuk ringan": jumlah goresan + teks `strokeCue` — TIDAK menampilkan bentuk huruf. Ini mirip tier "Orientation" di V2.1 §4.2.
- Level 2 "Gerakan lengkap": animasi goresan penuh. Ini mirip tier "Model".
- Tier "Partial" (garis pertama saja / siluet tipis / dipersempit jadi 2 pilihan) **belum ada**.

Reset wajib setelah pakai hint SUDAH ada secara logika: kalau `hintLevel > 0` saat submit, hasil tidak dihitung lulus meski jawaban benar (`setRecallPassed(false)`) — user harus tutup hint dan ulangi TANPA hint dulu. Tapi ini reset langsung pada karakter yang sama, bukan "muncul lagi setelah 2–4 item lain" seperti diminta V2.1 §4.2. Dan yang paling penting: `hintLevel` yang dipakai **tidak pernah disimpan ke database** — hanya React state, hilang begitu halaman di-refresh. Ini alasan utama kenapa Bagian 3.4 (kolom baru di `user_kana_attempts`) diperlukan.
