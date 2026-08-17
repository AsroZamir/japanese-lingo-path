# Japanese Lingo Path — CLAUDE.md

Dokumen ini adalah hasil pembacaan menyeluruh codebase pada 2026-08-17. Tidak ada file yang diubah saat penyusunan dokumen ini.

## 1. Stack

- **Framework**: Next.js `^16.2.6` (lihat `package.json:15`)
- **Router**: **App Router** (`app/layout.tsx`, `app/page.tsx` — bukan Pages Router, tidak ada folder `pages/`)
- **Bahasa**: **TypeScript** (`tsconfig.json`, semua source file `.ts`/`.tsx`, `strict: true`)
- **React**: `19.2.6`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss` di `postcss.config.mjs`, `@import "tailwindcss";` di `app/globals.css:1`) — **tapi** hampir seluruh UI sebenarnya memakai class CSS custom buatan sendiri (mis. `.hero-card`, `.unit-card`, `.lesson-blueprint-rail`) yang didefinisikan manual di `app/globals.css` (657 baris), bukan utility class Tailwind di JSX. Jadi Tailwind terpasang tapi praktis tidak dipakai sebagai utility-first di komponen.
- **State management**: Tidak ada library state management. Hanya `useState` bawaan React, semuanya lokal di komponen (routing tab `view`, `selectedUnit`, `toast`, index pelajaran aktif, input textarea tutor). Tidak ada Context API, Redux, Zustand, dll.
- **Package manager**: **npm** (ada `package-lock.json`; tidak ada `yarn.lock`/`pnpm-lock.yaml`)
- **Font**: `next/font/google` (Geist, Geist Mono) di `app/layout.tsx`

Catatan tambahan: ada folder `.wrangler/` dan `.vinext/` di root yang mengindikasikan pernah dicoba deployment via Cloudflare (Wrangler). Git log menunjukkan commit `"Migrate deployment from Sites to Vercel"`, jadi kemungkinan besar ini sisa artefak dari percobaan sebelum pindah ke Vercel. Tidak ada dependency `wrangler` di `package.json`, jadi tooling Cloudflare **tidak** aktif dipakai sekarang — UNKNOWN — perlu dikonfirmasi apakah folder ini boleh dihapus.

## 2. Struktur folder

```
Japanese-Lingo-Path/
├── app/
│   ├── layout.tsx          # Root layout, metadata (OG/Twitter), font setup
│   ├── page.tsx            # SATU file berisi seluruh UI aplikasi (client component)
│   ├── curriculum-data.ts  # Seluruh data kurikulum hardcoded + generator lesson blueprint
│   └── globals.css         # Seluruh styling (Tailwind import + ~650 baris CSS custom)
├── public/
│   └── og.png              # Gambar Open Graph/Twitter card
├── .vercel/                 # Metadata project Vercel (gitignored)
├── dist/, .wrangler/, .vinext/  # Artefak build/deploy lama, tidak dipakai aktif (gitignored)
├── next.config.ts          # Kosong/default, tidak ada konfigurasi custom
├── eslint.config.mjs       # Flat config ESLint (next/core-web-vitals, jsx-a11y, react-hooks, dst)
├── tsconfig.json
├── package.json
└── README.md
```

**Tidak ada** folder `components/`, `lib/`, `hooks/`, `api/`, `db/`, atau `types/` terpisah. Seluruh aplikasi (9 "halaman"/view: dashboard, learn, practice, review, tutor, conversation, jlpt, progress, settings, lesson) diimplementasikan sebagai fungsi-fungsi komponen di dalam **satu file** `app/page.tsx` (388 baris), yang dirender kondisional berdasarkan state `view` — bukan routing berbasis file/URL Next.js. Tidak ada route lain (`app/xxx/page.tsx`) sama sekali.

## 3. Di mana konten pelajaran disimpan?

**Hardcode di file TypeScript**: `app/curriculum-data.ts` (357 baris).

- Data unit kurikulum (11 modul Pre-N5 + 12 modul N5) di-hardcode sebagai array literal `preN5` dan `n5` (baris 79–268), berisi field seperti `title`, `subtitle`, `objectives`, `canDo`, `skills`, `previews`, `checkpoint`.
- Detail cakupan per modul (`unitOperations`, baris 270–294) juga hardcode, berupa string deskriptif seperti `"30 hiragana-only core words"` — bukan angka terstruktur, hanya teks.
- **Penting**: isi pelajaran per-lesson (objective, contentTargets, practiceFlow, skillTasks, assets, examples) **tidak ditulis manual satu per satu**. Semua itu di-generate on-the-fly oleh fungsi `getLessonBlueprint()` (baris 310–348) yang menyusun teks template berbahasa Indonesia + angka hasil pembagian (`perLessonTarget()`, baris 301–308) dari total cakupan modul dibagi jumlah lesson. Jadi tidak ada soal, kosakata individual, atau materi kanji yang benar-benar ada — hanya kerangka/label yang dihasilkan secara sintetik.
- Tidak ada file JSON, seed file, atau database sama sekali. Grep untuk `localStorage`, `fetch(`, `prisma`, `drizzle`, `sqlite`, `postgres`, `mongodb` di seluruh `app/` menghasilkan nol match.

## 4. Bagaimana data user "Asro" muncul?

**Hardcode string literal**, tersebar di beberapa tempat di `app/page.tsx`, bukan lewat model/context/auth:

- Sapaan dashboard: `"おはよう, Asro!"` — `app/page.tsx:28`
- Sidebar (avatar inisial "AR" + nama "Asro" + level "Pemula · Pre-N5") — `app/page.tsx:366`
- Form Settings, `defaultValue="Asro"` pada input nama tampilan — `app/page.tsx:273`

Tidak ada `User` type, tidak ada context provider, tidak ada auth/session apa pun. Nilai "Asro" hanya string yang diketik ulang manual di beberapa tempat — mengubahnya butuh edit di 3 lokasi berbeda, bukan satu sumber data.

## 5. Bagaimana SRS "Ulangi 12 item" bekerja?

**Tidak ada logika SRS sama sekali** — murni tampilan statis:

- Badge "12" di sidebar nav: hardcode `badge: "12"` pada `navItems` — `app/page.tsx:14`
- Halaman Review (`Review` component, `app/page.tsx:198-213`): angka "12 items" dan breakdown (7 Words/3 Kanji/2 Grammar) adalah JSX literal statis, bukan hasil kalkulasi.
- Daftar antrian review (`items` array, `app/page.tsx:199`) adalah 3 contoh hardcode (食べる, 学, ～たい) dengan label waktu jatuh tempo ("Due now", "In 2 hours") yang juga statis.
- Tombol "Start review" hanya memanggil `notify(...)` yang menampilkan toast: *"Review player shell is ready. Spaced-repetition logic will be connected later."*

Tidak ada algoritma spaced repetition (SM-2, Leitner, dsb), tidak ada state due-date, tidak ada penyimpanan hasil review.

## 6. Bagaimana progres lesson disimpan?

**Tidak disimpan sama sekali.** Tidak ada `localStorage`, tidak ada cookie, tidak ada database, tidak ada server-side persistence (dikonfirmasi lewat grep, nol hasil). Satu-satunya "state" terkait progres adalah:
- `activeLessonIndex` (`useState`, `app/page.tsx:280`) — index pelajaran yang sedang dilihat di dalam satu modul, hilang begitu komponen unmount/reload.
- Status "done/active/next" pada 3 baris lesson di Dashboard (`app/page.tsx:21-25`) — hardcode statis, tidak berubah walau user berinteraksi.

Refresh halaman = semua state hilang, kembali ke default.

## 7. Apa arti status "Shell" pada lesson?

"Shell" **bukan** field/enum formal dalam type system (tidak ada di `CurriculumUnit`, `LessonBlueprint`, atau tipe lain). Ia hanya muncul sebagai potongan teks di dua tempat pada array `lessons` dashboard:

```ts
// app/page.tsx:23-24
{ no: "02", title: "Japanese Sounds", meta: "Shell · Pronunciation", state: "active" },
{ no: "03", title: "Japanese Sentence Basics", meta: "Shell · Grammar awareness", state: "next" },
```

Artinya sesuai konteks README (`"empty lesson and content-block containers"`): lesson tersebut sudah punya **kerangka/wadah UI** tapi **belum ada konten pembelajaran sungguhan** di dalamnya — murni penanda informal untuk pembaca kode/desainer, bukan mekanisme yang dibaca oleh logika aplikasi.

## 8. Environment variables

Grep `process.env` di seluruh `app/` dan `next.config.ts` → **nol hasil**. Aplikasi ini **tidak memakai environment variable custom apa pun**.

Satu-satunya isi `.vercel/.env.production.local` (gitignored, tidak masuk repo) adalah variabel sistem bawaan Vercel/Turbo yang di-inject otomatis saat build (`VERCEL_*`, `TURBO_*`, `NX_DAEMON`) — bukan variabel yang didefinisikan atau dibaca oleh kode aplikasi.

## 9. Perintah dev/build/lint/test & deploy

Dari `package.json`:

```bash
npm install      # install dependencies
npm run dev      # next dev
npm run build    # next build
npm run start    # next start (menjalankan hasil build)
npm run lint     # eslint . --ignore-pattern dist --ignore-pattern .next --ignore-pattern .vercel
```

- **Test**: tidak ada script `test` di `package.json`, dan tidak ada dependency Jest/Vitest/Playwright/Testing Library — **tidak ada test framework terpasang sama sekali**.
- **Deploy ke Vercel**: project sudah linked ke Vercel (`.vercel/project.json`, `projectName: "japanese-lingo-path"`, `projectId: prj_fTdhgJ5Luj9ckANetQYDjWkAFXN7`). Namun repo git lokal **tidak punya remote** (`git remote -v` kosong) dan ada 3 file yang sedang unstaged-modified di working tree saat ini (`app/curriculum-data.ts`, `app/globals.css`, `app/page.tsx`). Jadi mekanisme deploy saat ini kemungkinan besar manual via `vercel` CLI (`vercel deploy` / `vercel --prod`), bukan otomatis lewat git push — UNKNOWN — perlu dikonfirmasi ke pemilik project bagaimana alur deploy sebenarnya dijalankan.

## 10. Fitur: benar-benar berfungsi vs. UI kosong

| Fitur | Status |
|---|---|
| Navigasi antar 9 "halaman" (dashboard/learn/practice/review/tutor/conversation/jlpt/progress/settings) via state `view` | **Berfungsi** — murni client-side tab switching |
| Menampilkan daftar 23 modul kurikulum (Pre-N5 + N5) dari data hardcode | **Berfungsi** — render dari `curriculum-data.ts` |
| Detail modul + daftar lesson + "lesson blueprint" generatif per lesson | **Berfungsi sebagai tampilan**, tapi isinya template teks generik, bukan materi asli |
| Toast notification (`notify()`) | **Berfungsi** — tampil lalu hilang otomatis setelah 3.6 detik |
| Tombol "Start review", "Start 5-minute session", "Save changes", scenario percakapan, dsb | **UI kosong** — semua hanya memicu toast "shell is ready, will be connected later" |
| Spaced repetition / algoritma review | **Tidak ada** — hardcode statis |
| AI Tutor (`Tutor` component) | **UI kosong** — textarea berfungsi secara lokal, tapi submit hanya menampilkan toast, tidak memanggil AI service apa pun |
| Practice/Quiz sungguhan (soal, jawaban, skor) | **Tidak ada** |
| Progress tracking (jam belajar, skor, streak) | **UI kosong** — semua angka (3h 42m, 76% akurasi, 7 hari streak) hardcode statis di `Progress` component |
| Login/akun/profil tersimpan | **Tidak ada** — form Settings tidak menyimpan apa pun, `Save changes` hanya toast |
| Persistensi progres lesson (localStorage/DB) | **Tidak ada sama sekali** |
| Responsive layout (desktop sidebar / mobile bottom nav) | **Berfungsi** — diatur lewat CSS media query di `globals.css` |

---

## Ringkasan implikasi untuk menambahkan auth & database

1. **Tidak ada satu pun titik integrasi siap pakai** — semua data (user "Asro", progres, review queue, kurikulum) adalah string/array hardcode yang tersebar di JSX, bukan lewat satu sumber data yang bisa gampang di-swap ke API call.
2. **Tidak ada model data formal** untuk User, LessonProgress, atau ReviewItem — perlu didesain dari nol; type yang ada (`CurriculumUnit`, `LessonBlueprint`) hanya menggambarkan struktur kurikulum statis, bukan data per-user.
3. **`app/page.tsx` adalah monolith 388 baris** berisi seluruh UI — menambahkan data dinamis (fetch user, fetch progress) akan memaksa refactor besar untuk memisahkan komponen dan menambahkan Server Components/data fetching, karena saat ini seluruh file adalah satu client component (`"use client"` di baris 1) yang me-render semua view sekaligus tanpa routing per-URL.
4. **Konten lesson itu sendiri sintetik** (`getLessonBlueprint()`), jadi menyambungkan ke database soal/materi sungguhan berarti mengganti generator ini dengan query nyata, bukan sekadar menambah lapisan penyimpanan di atas data yang sudah ada.
5. Tidak ada environment variable, tidak ada API route (`app/api/`), tidak ada middleware — semua infrastruktur untuk auth/DB (secrets, API handler, session) harus dibangun dari nol.
