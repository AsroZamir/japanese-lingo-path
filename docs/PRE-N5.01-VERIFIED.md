# PRE-N5.01 — Verifikasi otomatis 2026-08-24

Menutup dua celah yang disebutkan laporan sesi sebelumnya: langkah **Ikuti**
dan **Uji** belum teruji, dan **F2–F5/BOSS** belum dicoba langsung di browser
(cuma diasumsikan sama karena strukturnya identik dengan F1).

`scripts/auth-setup.ts` dipakai lagi untuk login (akun test khusus,
`E2E_TEST_EMAIL`, bukan akun sungguhan), tapi kali ini hasilnya ditulis
sebagai test Playwright tersimpan (`.spec.ts`), bukan script sekali pakai —
bisa dijalankan ulang kapan saja dengan `npx playwright test`.

## Cara menjalankan ulang

```bash
npx tsx scripts/auth-setup.ts   # perlu sekali di awal / kalau sesi kedaluwarsa
npm run dev                     # di terminal terpisah, biarkan berjalan
npx playwright test             # 11 test, semua di database akun test saja
```

## Yang terbukti (11/11 test, dijalankan 2x berturut-turut untuk pastikan stabil)

**1. F1 sampai langkah Ikuti** (`tests/e2e/f1-ikuti-flow.spec.ts`) —
Login, buka F1, lewati 5 layar Kenali, lalu 5 layar Bedakan (memilih huruf
yang benar setiap kali). Terbukti:
- Halaman sampai ke langkah Ikuti tanpa error.
- Kelima attempt (`v21_p1_discriminate`) benar-benar tersimpan di database,
  masing-masing dengan `phase_code='P1'` dan `curriculum_version='v2.1'`.

**2. Gerbang checkpoint ≥80%** (`tests/unit/gate-logic.spec.ts`) — Logika
`evaluateCheckpointPass` (fungsi PERSIS yang dipanggil `completeHiraganaStage`
di `actions.ts`, sekarang dipisah ke `gate-logic.ts` supaya bisa diuji
langsung) diuji dengan skenario **sengaja salah**: 7/10 (70%) HARUS ditolak,
8/10 (80%) HARUS lulus, 15/19 (78.9%) HARUS ditolak meski dekat. Semua benar.
- **Catatan jujur:** ini bukan uji lewat browser yang benar-benar menulis
  tangan dan menjawab soal Uji sampai selesai — mensimulasikan tulisan tangan
  asli lewat robot browser (harus meniru gerakan pena persis di atas kanvas)
  di luar jangkauan waktu sesi ini. Yang terbukti adalah logika PENILAIANNYA
  sendiri, memakai fungsi yang sama persis yang dipakai aplikasi — bukan
  tiruan/reimplementasi.

**3. F2, F3, F4, F5, BOSS via URL langsung** (`tests/e2e/phase-batches.spec.ts`)
— Progres F1..sebelumnya ditandai selesai lewat database (khusus akun test),
lalu tiap stage dibuka langsung lewat URL. Terbukti setiap stage menampilkan
**huruf batch-nya sendiri**, bukan sisa dari fase lain:

| Stage | Kelompok 1 | Kelompok 2 |
|---|---|---|
| F2 | さしすせそ | たちつてと |
| F3 | なにぬねの | はひふへほ |
| F4 | まみむめも | やゆよらり |
| F5 | るれろ | わをん |
| BOSS | — (Gate 46, "Soal 1/46") | — |

Screenshot masing-masing tersimpan di `test-results/batch-{KODE}.png`
(tidak di-commit — folder ini di-gitignore).

## Temuan penting selama membangun test ini

Server dev (`npm run dev`) yang dipakai untuk uji ini punya dua karakteristik
yang **tidak terkait dengan kode V2.1 yang dibangun** — keduanya sudah
diverifikasi lewat percobaan langsung (curl + log server), bukan dugaan:

1. **Rute pertama kali dibuka sesudah server baru menyala bisa 404 sesaat**
   (Turbopack meng-compile tiap rute secara malas saat pertama diakses).
   Test sekarang menunggu (`warmUpRoute`) sampai rute benar-benar siap
   sebelum mulai, bukan langsung percaya percobaan pertama.
2. **`recordHiraganaAttempt` (penyimpan attempt) sengaja tidak ditunggu
   (fire-and-forget) di seluruh kode — bukan hal baru dari sesi ini.**
   Di server dev ini, satu panggilan bisa makan lebih dari satu detik untuk
   benar-benar sampai ke server. Karena UI tidak menunggu, test awalnya
   kehilangan sebagian besar attempt (klik selesai duluan sebelum
   permintaan sampai). Sekarang test menunggu setiap permintaan sungguh
   selesai sebelum lanjut. **Ini juga risiko nyata untuk pengguna asli**:
   kalau seseorang menutup tab tepat setelah klik terakhir, attempt yang
   belum sempat terkirim bisa hilang — pola ini sudah ada sejak sebelum
   sesi ini (dipakai juga di `HiraganaQuiz.tsx`), jadi bukan sesuatu yang
   baru rusak, tapi layak diketahui pemilik repo.

## Yang belum diuji otomatis

- Langkah **Ikuti** (menulis dengan panduan), **Ingat Singkat**, dan
  **Dengar & Tulis** tidak diselesaikan lewat tulisan tangan robot — hanya
  dibuktikan halamannya tampil dan bisa dibuka (lihat screenshot di sesi
  sebelumnya untuk あ dan お). Menyelesaikannya penuh butuh mensimulasikan
  goresan pena asli di atas kanvas, di luar jangkauan sesi ini.
- Devtools Next.js menampilkan badge "1 Issue" di beberapa screenshot —
  dicek log server, tidak ada error/warning yang berkorelasi. Kemungkinan
  besar catatan devtools yang tidak berbahaya, tapi belum ditelusuri sampai
  tuntas karena tidak menghalangi fungsi apa pun.
