# JAPANESE LINGO PATH

## Rancangan Kurikulum V2.1 - Evidence-Informed, Adaptive, dan Siap Implementasi

**Cakupan:** Pre-N5 sampai N1  
**Status:** Pengganti metode pembelajaran pada Kurikulum V2; website, database, autentikasi, dan arsitektur aplikasi tetap dipertahankan.  
**Tanggal rancangan:** Agustus 2026  
**Tujuan dokumen:** Menjadi sumber kebenaran produk dan handoff implementasi ke Claude/Claude Code.

---

## 1. Ringkasan keputusan utama

Kurikulum V2 memiliki ide yang kuat - active recall, pengulangan, multimodal, dan tugas komunikatif - tetapi penerapannya terlalu seragam dan linear. Versi V2.1 mempertahankan 67 ID modul agar tetap kompatibel dengan arsitektur produk, lalu mengganti cara belajar, urutan buka, evaluasi, dan definisi penguasaan.

Perubahan paling penting:

1. **Belajar dalam unit kecil, lalu terus dicampur.** Satu fase berisi maksimal 10 unit baru; pelajaran di dalamnya biasanya 3-5 unit. Setelah 20 unit, semua latihan campuran memakai bank 20; setelah 30, bank 30; dan seterusnya.
2. **Lulus langsung bukan berarti dikuasai.** Penguasaan baru diberikan setelah jawaban benar tanpa bantuan pada sesi berbeda dan lolos uji tertunda.
3. **Bantuan adalah mekanisme pemulihan, bukan kegagalan.** User dapat meminta petunjuk bertahap ketika lupa. Attempt yang dibantu tidak dihitung sebagai mastery sampai user berhasil lagi tanpa petunjuk.
4. **Akurasi mendahului kecepatan.** Time pressure hanya muncul setelah respons stabil. Batas 0,3-3 detik yang sama untuk semua user dihapus; target kecepatan mengikuti baseline personal dan jenis tugas.
5. **Setiap mesin belajar mempunyai alur berbeda.** Kana, kanji, kosakata, grammar, listening, reading, dan percakapan tidak lagi dipaksa memakai lima fase identik.
6. **Tiga hasil dipisahkan:** retensi jangka panjang, transfer komunikatif, dan kesiapan format JLPT. JLPT tidak menguji conversation atau composition; tugas berbicara/menulis tetap penting sebagai kompetensi JLP, tetapi tidak boleh disebut bagian skor JLPT.[1][2][3]
7. **Jumlah kanji/kosakata adalah target internal, bukan daftar resmi JLPT.** Sejak revisi 2010, JLPT tidak menerbitkan daftar kosakata, kanji, dan grammar resmi. Target konten harus disusun dari fungsi level, bentuk soal resmi, corpus, dan sampel resmi.[3]
8. **N1 bukan “native level”.** Sasaran N1 adalah pemahaman bahasa yang kompleks dan abstrak dalam beragam situasi, bukan klaim setara penutur asli.[1]

## 2. Apa yang dipertahankan dan apa yang diganti

| Komponen V2 | Keputusan V2.1 | Alasan |
|---|---|---|
| 67 ID modul Pre-N5-N1 | Pertahankan | Menjaga kompatibilitas routing, progress, dan konten |
| Active recall | Perkuat | Retrieval meningkatkan retensi tertunda dibanding hanya belajar ulang.[5] |
| Spaced repetition | Perkuat dan adaptif | Jarak optimal bergantung pada target retensi; jadwal harus responsif terhadap performa.[6] |
| Multimodal input | Pertahankan secara selektif | Visual/audio/motorik hanya dipakai bila mendukung tujuan, bukan sebagai dekorasi |
| Satu pola F1-F5 untuk semua modul | Ganti | Script, grammar, listening, dan interaction membutuhkan latihan dan bukti penguasaan berbeda |
| Semua konten dibuka linear | Ganti dengan spiral paralel | Kosakata, grammar, reading, dan listening harus saling mendaur ulang sejak awal |
| Mnemonic wajib untuk setiap huruf | Ganti menjadi cue opsional | Mnemonic membantu masuk, tetapi bentuk, bunyi, kata, dan retrieval tetap sumber belajar utama |
| Ambang waktu tetap | Hapus | Mengukur refleks/perangkat dapat mengalahkan tujuan bahasa; waktu hanya dipakai setelah akurat |
| Satu skor AI sebagai hard gate | Ganti dengan subskor dan fallback | User harus tahu apa yang salah; AI tidak boleh menjadi satu-satunya penentu untuk suara/tulisan |
| Satu boss langsung memberi label “mastered” | Ganti dengan immediate gate + retention gate | Performa langsung sering melebihkan kemampuan yang bertahan |
| Target jam 390-470 | Ganti dengan sesi aktif + waktu kalender | Belajar tahan lama memerlukan jeda; jam aplikasi tidak sama dengan waktu menuju retensi |

## 3. Landasan pembelajaran dan konsekuensi produk

### 3.1 Retrieval dengan umpan balik

User harus mencoba mengambil jawaban dari ingatan sebelum melihat jawaban. Penelitian retrieval practice menunjukkan manfaat besar pada tes tertunda.[5] Untuk JLP, urutannya adalah **commit jawaban -> feedback spesifik -> perbaiki -> retrieval ulang setelah distraktor**. Menyalin setelah melihat contoh tidak dihitung sebagai recall.

### 3.2 Spacing yang adaptif

Spacing lebih efektif daripada pengulangan massal, tetapi tidak ada satu jadwal universal.[6] Default awal JLP adalah review pada sesi yang sama, sekitar 1 hari, 3 hari, 7 hari, 14 hari, dan 30 hari; scheduler boleh memajukan atau menunda berdasarkan keberhasilan, latency, dan penggunaan hint. Angka ini adalah hipotesis produk yang harus dikalibrasi melalui data, bukan hukum tetap.

### 3.3 Interleaving setelah fondasi minimal

Latihan campuran membantu diskriminasi kategori yang mirip.[7] Namun item baru tidak langsung dicampur secara ekstrem. JLP memakai pola **blocked singkat untuk memahami bentuk -> interleaved untuk membedakan -> cumulative untuk bertahan**.

### 3.4 Produksi bertahap

Pilihan ganda berguna untuk orientasi dan diagnosis, tetapi tidak cukup untuk mastery. Tugas bergerak dari recognition, cued recall, free recall, sampai transfer. Pada bahasa kedua, retrieval berulang meningkatkan pembelajaran kosakata; jumlah retrieval ditambah tanpa membuat satu sesi menjadi maraton.[9]

### 3.5 Interaksi dan feedback

Percakapan menjadi tugas yang memaksa user memahami maksud, merespons, menerima clarification/recast, lalu mencoba ulang. Interaksi yang memicu modifikasi output mendukung perkembangan bahasa kedua.[8] AI menilai keterpahaman dan kecocokan fungsi, bukan kemiripan mutlak dengan suara native.

### 3.6 Tulisan tangan sebagai alat belajar, bukan jebakan skor

Latihan menulis dapat membantu pembentukan representasi huruf, tetapi manfaatnya tidak membenarkan evaluator yang menolak bentuk benar karena toleransi algoritma buruk.[10] Penilaian tulisan wajib memisahkan: kelengkapan stroke, urutan/arah, struktur/topologi, dan proporsi. User harus melihat subskor dan contoh koreksi.

## 4. Model penguasaan JLP

Setiap item bergerak melalui status berikut:

| Status | Arti | Syarat minimum |
|---|---|---|
| New | Belum dipelajari | Belum ada exposure terarah |
| Familiar | Dapat dikenali | Benar pada recognition dengan feedback |
| Retrievable | Dapat dihasilkan | Benar tanpa hint pada cued/free recall |
| Durable | Bertahan | Benar tanpa hint pada sesi berbeda, termasuk uji tertunda |
| Transferable | Dapat digunakan | Benar dalam konteks baru, kalimat, teks, audio, atau interaksi |

### 4.1 Default gate awal

Default berikut dipakai sebagai titik awal pilot, lalu dikalibrasi:

- **Checkpoint akuisisi:** >=80% first-attempt, tetapi hanya membuka langkah berikutnya; belum memberi label mastered.
- **Retention gate:** >=85% first-attempt tanpa hint setelah jeda minimal 72 jam; setiap subskill kritis minimal 75%.
- **Transfer gate:** minimal 3 dari 4 aspek rubric terpenuhi tanpa bantuan yang membocorkan jawaban.
- **Remediasi:** item lemah masuk jalur review; satu item tidak selalu mengunci seluruh modul kecuali merupakan prasyarat kritis.
- **Mastery confidence:** dihitung per item dan per skill, bukan hanya rata-rata modul.

### 4.2 Hint ladder

1. **Hint 1 - orientasi:** kategori, bunyi awal, fungsi, atau jumlah stroke; tidak menunjukkan jawaban.
2. **Hint 2 - sebagian:** pilihan dipersempit, komponen pertama, siluet tipis, atau satu kata konteks.
3. **Hint 3 - model:** jawaban/contoh penuh diperlihatkan, lalu user melakukan guided retry.
4. **Reset retrieval:** setelah 2-4 item distraktor, item muncul kembali tanpa hint. Hanya keberhasilan ini yang boleh memperbarui mastery.

### 4.3 Kecepatan

- Tidak ada tekanan waktu ketika status masih New/Familiar.
- Latency dicatat setelah user commit, dengan penyesuaian jenis perangkat.
- Speed drill terbuka setelah akurasi stabil pada dua set.
- Target adalah perbaikan terhadap baseline pribadi dan kestabilan, bukan angka global ekstrem.
- Salah karena timeout tidak disamakan dengan salah konsep.

## 5. Arsitektur sesi dan spiral

### 5.1 Satu sesi mikro 8-18 menit

1. **Warm retrieval (1-2 menit):** 3-5 item lama tanpa hint.
2. **New set (3-6 menit):** 3-5 unit baru melalui contoh dan contrast.
3. **Guided practice (2-4 menit):** deconstruct/trace/substitution.
4. **Unaided retrieval (2-4 menit):** user menghasilkan jawaban.
5. **Cumulative mix (2-4 menit):** item baru + item lama, terutama pasangan yang sering tertukar.
6. **Exit ticket (1 menit):** 2 item target + pilihan confidence “ingat/ragu/lupa”.

### 5.2 Rasio item

- Saat bank <=10: sekitar 70% baru, 30% lama.
- Saat bank 11-20: sekitar 55% baru, 45% lama.
- Setelah bank >20: sekitar 35-45% baru dan 55-65% lama/weak points.
- Scheduler boleh mengubah rasio berdasarkan error pattern, bukan sekadar jumlah.

### 5.3 Unlock antarmodul

Hard lock hanya dipakai bila user benar-benar tidak dapat mengerjakan modul berikutnya. Yang lain memakai soft prerequisite:

- Kana core diperlukan sebelum teks tanpa romaji.
- Kosakata, kanji, grammar, reading, dan listening berjalan paralel dalam satu level.
- Reading/listening tidak menunggu seluruh bank vocab/grammar selesai; materi dibatasi pada subset yang sudah dipelajari dan sedikit input baru yang dapat diinferensikan.
- Modul mastery memerlukan retention gate, bukan sekadar completion.

## 6. Mesin pembelajaran per jenis konten

### 6.1 Kana Script Engine

Urutan: lihat-dengar -> bedakan -> ikuti stroke -> tulis dari memori singkat -> tulis dari audio -> campuran kumulatif -> retention. Canonical glyph berasal dari satu dataset SVG/stroke versioned. Validator otomatis mengecek jumlah path, urutan, arah, bounding box, dan bahwa tidak ada stroke hilang.

Rubric tulisan kana:

- Kelengkapan dan topologi: 40%
- Urutan serta arah stroke: 25%
- Proporsi dan posisi relatif: 20%
- Kelancaran/continuity: 15%

Tidak boleh lulus bila ada stroke wajib hilang. Namun variasi gaya yang masih sah tidak boleh gagal hanya karena berbeda beberapa piksel dari template.

### 6.2 Kanji Engine

Kanji dipelajari **word-first**, bukan menghafal semua on-yomi/kun-yomi terpisah. Alur: kata dan makna -> komponen pembeda -> reading dalam kata -> contrast dengan kanji mirip -> retrieval dalam compound/sentence -> handwriting selektif. Semua kanji wajib dikuasai untuk recognition, reading, dan typing; handwriting penuh diprioritaskan untuk subset fungsional, bukan menjadi hard gate untuk 2.000 karakter.

### 6.3 Vocabulary Engine

Satu microset berisi 6-10 kata pada Pre-N5/N5 dan 8-12 lexical units pada level lebih tinggi. Set mencakup form, bunyi, makna, satu collocation, satu contoh konteks, register, dan pasangan confusable bila ada. Retrieval dua arah dan penggunaan konteks dipisahkan; mengenali arti tidak otomatis berarti bisa memproduksi kata.

### 6.4 Grammar Engine

Urutan: **meaning first -> contrast -> input choice -> form reconstruction -> constrained production -> contextual production -> delayed transfer**. Tabel konjugasi adalah alat referensi setelah pola dipahami, bukan layar belajar utama. Satu set membandingkan 2-3 pola yang benar-benar mudah tertukar; penjelasan muncul setelah user membuat prediksi.

### 6.5 Listening Engine

1. Dengarkan sekali tanpa teks untuk tugas global.
2. Jawab main point/action.
3. Dengarkan per chunk untuk detail.
4. Buka transcript atau furigana hanya bila diperlukan.
5. Dictation selektif dan shadowing chunk pendek.
6. Uji transfer dengan audio baru, speaker baru, dan kecepatan natural.

Audio lambat adalah bantuan belajar, bukan format kelulusan.

### 6.6 Reading Engine

Tujuan membaca ditetapkan sebelum teks: scan informasi, memahami inti, melacak referensi, atau menganalisis argumen. Furigana tersedia on-demand berdasarkan mastery kata, bukan persentase tetap per level. Pemakaian furigana dicatat sebagai bantuan. Teks baru harus mengandung sekitar 90-95% unsur yang telah dikenal untuk latihan kefasihan; teks challenge boleh lebih rendah dengan dukungan.

### 6.7 Interaction and Pragmatics Engine

Loop: observe situation -> notice intent/register -> choose or build response -> roleplay -> feedback -> repair turn -> replay in new scenario. Rubric: task completion, comprehensibility, grammar/lexis, dan social appropriateness. Pronunciation memakai intelligibility; pitch/accent diberikan sebagai coaching, bukan hard gate tunggal.

### 6.8 JLPT Simulation Engine

Mock mengikuti tipe item dan waktu resmi.[2] Skor latihan adalah raw score/estimasi internal dan tidak boleh ditampilkan sebagai scaled score resmi. Readiness memerlukan dua parallel forms, section floor, dan stabilitas - bukan satu mock. Speaking/writing dilaporkan pada panel “JLP Communication”, terpisah dari “JLPT Readiness”.[3][4]

## 7. Struktur level baru

| Level | Fokus nyata | Spiral utama | Hasil akhir |
|---|---|---|---|
| Pre-N5 | Literasi kana dan survival language | Script + bunyi + ungkapan + pola paling dasar | Membaca/menulis kana dasar dan menyelesaikan tugas survival sederhana |
| N5 | Fondasi kalimat dan informasi harian | Kanji/vocab paralel dengan grammar, reading, listening | Memahami sebagian bahasa Jepang dasar sesuai fungsi N5[1] |
| N4 | Bahasa dasar yang lebih luas | Bentuk kata kerja, konektor, collocation, teks/percakapan harian | Memahami bahasa Jepang dasar sesuai fungsi N4[1] |
| N3 | Jembatan menuju discourse | Nuance, register, paragraf/percakapan lebih panjang | Memahami bahasa harian sampai tingkat tertentu[1] |
| N2 | Bahasa luas dan formal | Editorial, news/lecture, register, keigo | Memahami situasi harian dan beragam situasi sampai tingkat tertentu[1] |
| N1 | Discourse kompleks dan abstrak | Struktur argumen, implikatur, register, multi-speaker | Memahami bahasa Jepang dalam beragam keadaan[1] |

Target ledger kanji/kosakata pada produk bersifat **cumulative coverage band**, bukan klaim daftar resmi: N5 kira-kira 80-120 kanji dan 700-900 lexical units; N4 250-350 dan 1.500-1.800; N3 600-750 dan 3.000-4.000; N2 1.000-1.200 dan 6.000-8.000; N1 1.800-2.200 recognition dan 10.000+ lexical families. Daftar final harus dibangun dari corpus, fungsi level, dan sampel resmi, lalu diberi version.

# LEVEL PRE-N5 - 11 MODUL

## Spiral Pre-N5

- **Gelombang A:** PRE-N5.01 kelompok Hiragana 1-2 berjalan bersama potongan audio/sapaan PRE-N5.04.
- **Gelombang B:** Hiragana kelompok 3-5, lalu Katakana kelompok 1-2; angka dan vocab memakai hanya kana yang sudah stabil.
- **Gelombang C:** Katakana selesai; demonstratives, partikel, dan polite sentences mulai berjalan paralel.
- **Gelombang D:** listening kumulatif dan integrated Pre-N5 gate.

## PRE-N5.01 - Hiragana Core and Extensions

- **Outcome:** mengenali bunyi, membaca, dan menulis 46 hiragana dasar dari ingatan; kemudian mengenali dakuten/handakuten dan kombinasi kecil. Mnemonic hanya cue awal.
- **Chunking:** P1 = あいうえお + かきくけこ; P2 = さしすせそ + たちつてと; P3 = なにぬねの + はひふへほ; P4 = まみむめも + やゆよ + らり; P5 = るれろわをん. Setiap fase 10/10/10/10/6 dibagi lagi menjadi pelajaran 5 huruf. Setelah P2, semua checkpoint memakai bank 20; setelah P3 bank 30; setelah P4 bank 40; final bank 46.
- **Workflow:** sound-shape anchor -> minimal contrast -> guided stroke -> ghost trace -> write from audio -> read short mora/word -> cumulative mix. Anchor ayam untuk あ boleh menjadi salah satu opsi, tetapi default harus memakai anchor yang tidak mengubah persepsi bentuk canonical; user dapat memilih shape anchor, word anchor, atau personal anchor.
- **Hint:** jumlah stroke/bunyi awal -> siluet atau first stroke -> animasi penuh -> retry tanpa bantuan setelah distraktor.
- **Gate:** tidak ada stroke hilang; tulisan menunjukkan urutan/arah logis; recognition dan audio mapping >=85% first-attempt pada uji tertunda. Guided attempt tidak dihitung mastery.
- **Extensions:** dakuten/handakuten dan youon dibuka setelah core 46 checkpoint, melalui set kecil dan contrast bunyi; keduanya tidak dicampur dengan semua bentuk baru pada satu sesi.

## PRE-N5.02 - Katakana Core, Contrast, and Loanwords

- **Outcome:** mengenali/menulis 46 katakana dasar, modifiers, kombinasi, prolonged sound mark, dan membaca loanword umum.
- **Chunking:** 10/10/10/10/6 seperti Hiragana. Contrast シ/ツ dan ソ/ン mendapat microset khusus. Hiragana-katakana baru dicampur setelah katakana terkait mencapai Retrievable.
- **Workflow:** bentuk dan arah stroke -> guided writing -> audio mapping -> loanword chunk -> sign/label retrieval. Loanword meaning tidak boleh menggantikan latihan bacaan.
- **Gate:** dua sesi tanpa hint, satu delayed set, dan satu real-world transfer. Similar-character error harus turun di bawah threshold personal.
- **Upgrade:** modul tidak menunggu semua katakana selesai untuk memberi makna; setiap batch segera digunakan dalam kata serapan yang valid.

## PRE-N5.03 - Angka, Waktu, Harga, dan Counter Dasar

- **Outcome:** memahami/mengucapkan angka, waktu, tanggal, harga, dan counter dasar dalam tugas harian.
- **Chunking:** angka 0-10 -> puluhan/ratusan -> jam/menit -> tanggal/hari -> harga -> counter per bentuk, masing-masing dengan irregular pronunciation terpisah.
- **Workflow:** hear-build-say -> pattern induction -> contrast irregular form -> information gap -> konbini simulation. Speed math hanya setelah audio recognition stabil.
- **Gate:** user menangkap angka dari dua speaker, membangun jawaban, dan menyelesaikan transaksi baru; salah hitung dipisahkan dari salah bahasa.
- **Retention:** campurkan angka lama ke listening, vocab, dan roleplay berikutnya.

## PRE-N5.04 - Sapaan dan Social Routines

- **Outcome:** memilih dan mengucapkan ungkapan yang sesuai waktu, hubungan, dan situasi; bukan hanya menerjemahkan.
- **Chunking:** greeting/time -> home routines -> meals -> thanks/apology -> introduction. Maksimal 4-5 expressions per scene set.
- **Workflow:** video/audio situation -> predict intent -> notice expression -> chunk shadowing -> response choice -> response production -> new scene.
- **Gate:** task appropriateness dan comprehensibility; intonasi diberi coaching, bukan skor native-match mutlak.
- **Transfer:** 3 micro-roleplays dengan variasi partner dan urutan; ungkapan yang salah konteks masuk weak-point pair.

## PRE-N5.05 - Core Vocabulary 120

- **Outcome:** menguasai 120 lexical units paling berguna sebagai receptive dan productive knowledge, lengkap dengan satu collocation/phrase.
- **Chunking:** 6-8 kata per microset, 15-18 set tematik; angka target lama 100 boleh dipertahankan sebagai minimum, tetapi 120 memberi ruang untuk verbs/adjectives yang dibutuhkan grammar.
- **Workflow:** image/object + audio -> form -> contrast -> recall dua arah -> phrase frame -> recycle ke sentence/listening. Gambar dipakai bila concrete; kata abstrak memakai situasi.
- **Gate:** tidak cukup image-to-word; user juga harus mengenali audio dan memakai kata dalam frame baru setelah jeda.
- **Upgrade:** modul adalah track berjalan, bukan blok yang wajib selesai sebelum grammar.

## PRE-N5.06 - Person Reference, Demonstratives, and Space

- **Outcome:** memakai これ/それ/あれ, この/その/あの, ここ/そこ/あそこ dan referensi orang secara sesuai.
- **Chunking:** object series -> noun modifier series -> place series -> question forms -> person reference and name avoidance.
- **Workflow:** shared visual space -> perspective switch -> point/drag -> listen and act -> sentence production. Speaker-listener positions berubah agar user benar-benar memahami deixis.
- **Gate:** generalisasi pada layout baru, bukan hafal posisi tombol.
- **Cultural note:** あなた tidak diajarkan sebagai pengganti universal “kamu”; gunakan nama/peran/ellipsis sesuai konteks dasar.

## PRE-N5.07 - Topic, Subject, and Relation: は・が・の

- **Outcome:** memetakan form ke meaning dasar: topic/comment, existence/focus, possession/attribution.
- **Chunking:** の relation -> は topic frame -> が with existence/identification -> controlled は/が contrast. Jangan mengajarkan seluruh teori は vs が sekaligus.
- **Workflow:** interpret two contrasting scenes -> choose meaning -> reconstruct sentence -> substitute -> produce from picture -> explain changed meaning.
- **Gate:** uji harus memasukkan minimal pairs; warna adalah scaffold dan hilang sebelum retention gate.
- **Upgrade:** error correction menyebut konsekuensi makna, bukan hanya “partikel salah”.

## PRE-N5.08 - Polite Predicate Foundations: です・ます

- **Outcome:** membuat pernyataan, negasi, dan pertanyaan sederhana untuk noun, adjective awal, dan high-frequency verbs.
- **Chunking:** noun + です -> question/answer -> negative -> verbs + ます -> negative/past secara bertahap. Bentuk yang belum menjadi target tidak dimasukkan sebagai distractor.
- **Workflow:** scene meaning -> sentence frame -> polarity/timeline contrast -> reconstruction -> short self-expression.
- **Gate:** user memproduksi minimal satu kalimat baru per function; sentence factory hanya latihan awal.
- **Transfer:** introduction, preferences, dan routine mini-dialogue.

## PRE-N5.09 - Place, Time, Destination, and Action: に・で・へ

- **Outcome:** memilih partikel berdasarkan relation, bukan terjemahan kata “di/ke”.
- **Chunking:** existence に -> time に -> action place で -> destination に/へ -> contrast set.
- **Workflow:** animated map -> predict relation -> input choice -> map action -> sentence building -> route narration.
- **Gate:** lokasi dan verb baru; user menjelaskan perbedaan pada minimal pair seperti いえにいます / いえでたべます.
- **Retention:** partikel lama は/が/の tetap ikut tetapi tidak mendominasi batch baru.

## PRE-N5.10 - Survival Listening

- **Outcome:** menangkap greeting, angka, harga, waktu, lokasi, dan instruksi sangat pendek pada kecepatan natural yang jelas.
- **Chunking:** audio 3-8 detik; satu target information per set, lalu dua target.
- **Workflow:** blind listen -> perform action/main point -> replay chunk -> transcript on-demand -> selective dictation -> new voice transfer.
- **Gate:** minimal dua suara, audio baru, dan tidak menggunakan transcript pada first attempt.
- **Upgrade:** 0,5x bukan langkah wajib; hanya recovery tool. Penilaian final selalu natural clear speech.

## PRE-N5.11 - Pre-N5 Integrated Mastery

- **Outcome:** membuktikan literasi kana, retensi, dan kemampuan menyelesaikan tugas survival sederhana.
- **Format:** (A) kana recognition/audio/writing; (B) language knowledge and listening; (C) tiga functional tasks. Jangan memakai 100 soal dalam 5 menit karena mengukur tapping lebih besar daripada pemahaman.
- **Gate:** immediate integration >=80%, delayed kana check >=85% setelah 3-7 hari, dan minimal 3/4 rubric pada 2 dari 3 functional tasks.
- **Reporting:** tampilkan profil per skill, bukan satu angka. User dapat lanjut N5 dengan remediation lane bila hanya satu subskill nonkritis tertinggal.
- **Label:** “JLP Pre-N5 Foundation Complete”, bukan sertifikasi eksternal.

# LEVEL N5 - 10 MODUL

## Spiral N5

Kanji dan kosakata adalah track sepanjang level. Grammar, listening, dan reading tidak menunggu kedua ledger selesai. Satu cycle mengambil subset kanji/kata, satu fungsi grammar, satu mini-text, satu audio, dan satu tugas komunikasi. Setelah beberapa cycle, bank lama mendapat porsi lebih besar.

## N5.01 - Kanji N5 Context Track

- **Outcome:** mengenali, membaca, mengetik, dan memahami kanji inti dalam kata N5; menulis tangan subset yang sangat fungsional.
- **Chunking:** 6-8 kanji per set berdasarkan kata/tema dan komponen pembeda, bukan 80 karakter sekaligus. Setiap kanji masuk melalui 2-4 kata, bukan daftar semua reading.
- **Workflow:** word/audio -> meaning -> component contrast -> reading retrieval -> compound/sentence -> selective writing -> delayed mixed set.
- **Gate:** first-attempt reading dan contextual use pada dua sesi; similar-kanji discrimination; handwriting dilaporkan terpisah dari JLPT readiness.
- **Upgrade:** kanji track dibuka paralel dengan N5.02 dan didaur ulang di semua modul.

## N5.02 - Vocabulary N5 Continuous Track

- **Outcome:** mencapai coverage internal sekitar 700-900 lexical units cumulative, dengan core productive subset dan collocation dasar.
- **Chunking:** 8-10 items per microset; maksimal 30-40 baru sebelum consolidation block. Kategori lama dipecah menjadi fungsi seperti makan, berpindah, jadwal, kesehatan, dan transaksi.
- **Workflow:** audio/form/meaning -> collocation -> recall -> sentence frame -> listening/reading recycling. Productive dan receptive strength disimpan terpisah.
- **Gate:** 7-day retention dan penggunaan konteks; tidak ada satu “Vocab 800 Gate” yang baru muncul setelah seluruh daftar selesai.
- **Content QA:** frekuensi, dispersion, usefulness, dan kebutuhan module menentukan urutan; angka 800 bukan daftar resmi JLPT.[3]

## N5.03 - Verb Systems: Godan, Ichidan, and Irregular

- **Outcome:** mengenali jenis verb serta membentuk/memahami ます, dictionary, て, た, dan ない pada high-frequency verbs.
- **Chunking:** meaning/use of each form -> one verb family -> contrast -> irregulars. Jangan mengajarkan empat paradigma penuh pada satu sesi.
- **Workflow:** timeline/scene -> predict form -> sound change noticing -> guided transformation -> sentence choice -> oral/written production.
- **Gate:** novel verbs dan connected speech, bukan hanya mengubah verb yang sama; error type disimpan per ending rule.
- **Transfer:** routine, completed action, request chain, dan simple negative plan.

## N5.04 - Core Particles: を・と・も・から・まで

- **Outcome:** memahami object, accompaniment/quotation awal, addition, dan range/origin.
- **Chunking:** を -> と bersama -> も -> から/まで -> cumulative contrast dengan は/が/の/に/で/へ.
- **Workflow:** scene interpretation -> choose relation -> sentence reconstruction -> minimal contrast -> information gap.
- **Gate:** kalimat baru dengan verb dan noun baru; alasan pilihan partikel harus konsisten dengan meaning.
- **Upgrade:** blitz hanya setelah mixed accuracy stabil; warna scaffold hilang bertahap.

## N5.05 - い and な Adjectives in Time and Polarity

- **Outcome:** mendeskripsikan dan membandingkan benda/pengalaman pada present/past dan positive/negative.
- **Chunking:** identify type -> attributive/predicate -> negative -> past -> past-negative -> contrast. Perhatian khusus untuk きれい dan いい.
- **Workflow:** scene/time switch -> form prediction -> guided transform -> compare two items -> personal description.
- **Gate:** novel adjective and context; no cue table on final; spoken and written form checked separately.
- **Correction:** bentuk + すぎる diajarkan secara benar, misalnya あまい -> あますぎる, bukan あまいすぎる.

## N5.06 - Questions, Answers, and Repair

- **Outcome:** bertanya dan menjawab tentang siapa, apa, lokasi, waktu, harga, cara, dan alasan; meminta pengulangan bila tidak paham.
- **Chunking:** one question family per set, lalu mixed information gap. Short answer, full answer, dan natural ellipsis diperkenalkan bertahap.
- **Workflow:** missing-information scene -> choose question intent -> build -> listen to answer -> extract information -> follow-up.
- **Gate:** AI/partner memiliki informasi yang tidak dilihat user; keberhasilan dinilai dari informasi yang diperoleh, bukan sekadar pola kalimat.
- **Transfer:** schedule planning, shopping, and introduction.

## N5.07 - Everyday Functions N5

- **Outcome:** request, permission, prohibition, invitation, desire, ability, experience, dan basic advice.
- **Chunking:** maksimal dua fungsi berdekatan per set, misalnya request vs permission; conjugation prasyarat dipanggil just-in-time.
- **Workflow:** situation -> predict function -> notice form/intonation -> controlled response -> repair -> new roleplay.
- **Gate:** appropriateness + comprehensibility + target form; tidak semua fungsi harus muncul pada satu percakapan.
- **Retention:** satu fungsi lama selalu disisipkan pada roleplay berikutnya.

## N5.08 - Reading N5 from Day One

- **Outcome:** mengambil informasi dari sign, menu, message, schedule, dan short passage; memahami main point dan detail.
- **Chunking:** 40-80 characters awal, naik ke teks pendek sesuai bentuk resmi; teks dibangun dari ledger yang sedang aktif.
- **Workflow:** reading purpose -> scan/read -> commit answer -> evidence highlight -> language recycle -> parallel text transfer.
- **Gate:** dua teks baru, termasuk information retrieval; furigana on-demand dihitung sebagai bantuan.
- **Upgrade:** modul adalah track dari cycle awal, sedangkan halaman N5.08 menjadi dashboard/gate agregat.

## N5.09 - Listening N5 from Day One

- **Outcome:** memahami key point, quick response, verbal expression, dan task-based audio sederhana sesuai bentuk N5.[2]
- **Chunking:** 5-20 second clips, lalu short dialogues; variasi speaker dan noise ringan hanya setelah clear audio stabil.
- **Workflow:** blind task -> answer -> focused replay -> transcript recovery -> response/shadow -> new audio.
- **Gate:** natural clear speed, unseen recording, first-listen metric terpisah dari after-replay metric.
- **Upgrade:** listening berjalan paralel, bukan menunggu reading selesai.

## N5.10 - N5 Readiness and JLP Communication Gate

- **Outcome:** menunjukkan kesiapan format N5 dan kemampuan komunikasi dasar sebagai dua laporan berbeda.
- **Format JLPT:** official-like item types/timing, dua parallel forms, section profile, dan raw score. Gunakan overall/section readiness buffer; jangan mengklaim scaled score resmi.[2][4]
- **Format JLP:** short spoken interaction dan guided writing sebagai competency extension, tidak dicampur ke skor mock JLPT.[3]
- **Gate:** dua mock stabil, tidak ada section collapse, retention check kosakata/kanji/grammar, dan 3/4 rubric untuk functional task.
- **Label:** “JLP N5 Readiness”, bukan “N5 Certified”. Sertifikasi hanya berasal dari penyelenggara JLPT.

# LEVEL N4 - 10 MODUL

## Spiral N4

Level dibagi ke beberapa cycle yang menggabungkan kanji/vocab, satu contrast grammar, satu reading, satu listening, dan satu task. Reading/listening dimulai sejak cycle pertama. Text coverage dan furigana mengikuti mastery item, bukan angka 50% yang seragam.

## N4.01 - Kanji N4 Context and Contrast Track

- **Outcome:** memperluas cumulative recognition/reading ke band internal N4 melalui compounds dan sentences.
- **Chunking:** 8-12 kanji per set; family by component dipakai hanya bila membantu membedakan, bukan mengajarkan radikal sebagai arti pasti.
- **Workflow:** high-frequency word -> component -> contrast -> reading in context -> typing/limited writing -> delayed mixed review.
- **Gate:** reading in unseen compounds, context, dan similar-character sets; semua-reading recall tidak wajib.
- **Transfer:** kanji target muncul kembali di N4.02, N4.07, dan functional tasks.

## N4.02 - Vocabulary N4 Context and Collocation Track

- **Outcome:** mencapai cumulative 1.500-1.800 lexical units dengan productive core, adverb, word family, dan collocation.
- **Chunking:** 8-12 units per microset; kategori besar dipecah menjadi situations dan semantic contrasts.
- **Workflow:** short context -> meaning prediction -> form/audio -> collocation -> productive recall -> paragraph/audio recycling.
- **Gate:** delayed context choice dan production; daftar terjemahan tunggal tidak cukup.
- **Upgrade:** vocab berjalan sepanjang N4, bukan prasyarat penuh untuk grammar.

## N4.03 - Potential, Intention, and Plans

- **Outcome:** menyatakan ability, possibility, intention, dan plan dengan potential/volitional forms yang sesuai.
- **Chunking:** potential meaning -> conjugation by verb class -> volitional -> ～ようと思う -> contrast with schedule/decision.
- **Workflow:** ability scenario -> interpretation -> guided form -> information gap -> future plan discussion.
- **Gate:** novel verbs dan difference in intent; pronunciation changes included in listening.
- **Transfer:** planning activity with constraints.

## N4.04 - Conditions and Passive Perspective

- **Outcome:** memahami/memakai core conditions (と, たら, ば, なら) dan passive dasar tanpa mencampur semua nuansa sekaligus.
- **Chunking:** habitual と -> event たら -> general ば -> contextual なら; passive menjadi subtrack terpisah lalu diintegrasikan.
- **Workflow:** predict consequence -> choose condition -> timeline -> controlled production -> perspective scene for passive.
- **Gate:** minimal-pair meaning and novel scenario. Conjugation accuracy dan appropriateness dipisahkan.
- **Upgrade:** jika error tinggi, passive tidak ikut cumulative set sampai conditional core Retrievable.

## N4.05 - Polite Requests and Basic Honorific Awareness

- **Outcome:** memilih tingkat sopan untuk request, permission, advice, reporting, dan mengenali high-frequency honorific forms.
- **Chunking:** relationship map -> polite request -> softener -> selected sonkeigo/kenjougo recognition. ～になります tidak diajarkan sebagai generic keigo transformer.
- **Workflow:** social scene -> choose distance -> listen/notice -> shadow chunk -> build request -> repair after feedback.
- **Gate:** context appropriateness lebih berat daripada menghafal label keigo.
- **Transfer:** store, clinic, school, and workplace reception.

## N4.06 - Connectors, Purpose, Reason, and Contrast

- **Outcome:** memahami dan memakai のに, ように, ために, ので, から, dan けれども berdasarkan relation/nuance.
- **Chunking:** reason から/ので -> purpose ように/ために -> contrast のに/けれども; そう forms dipisah sesuai fungsi.
- **Workflow:** two-clause meaning -> contrast selection -> reconstruction -> paragraph link -> personal explanation.
- **Gate:** unseen contexts and discourse flow, bukan slot grammar tanpa konteks.
- **Retention:** connector lama diintegrasikan ke reading dan listening.

## N4.07 - Reading N4: Narrative and Practical Text

- **Outcome:** memahami letters, instructions, notices, dan short/mid passages serta melacak referent.
- **Workflow:** purpose -> first-pass -> evidence marking -> reference chain -> summary -> parallel text. Vocabulary lookup dibatasi dan dicatat.
- **Scaffold:** furigana on-demand per item; no-furigana core words. User dapat membuka gloss setelah first attempt.
- **Gate:** main point, detail, reference, dan information retrieval pada teks baru; akurasi dan waktu dilaporkan terpisah.
- **Transfer:** satu real-world composite page seperti schedule + notice.

## N4.08 - Listening N4: Intent and Action

- **Outcome:** memahami percakapan harian yang lebih panjang, key points, intent, dan tindakan berikutnya.
- **Workflow:** blind listen -> choose action -> replay for evidence -> speaker map -> transcript recovery -> new recording.
- **Chunking:** 20-45 seconds, naik bertahap; speed natural jelas sejak awal, bukan always slowed.
- **Gate:** first-listen and final-comprehension metrics; unseen speaker; verbal expression/quick response sesuai tujuan resmi.[2]
- **Transfer:** phone message, appointment, and service interaction.

## N4.09 - Collocation and Phrase Frames

- **Outcome:** menguasai high-frequency word partnerships dan light-verb phrases sebagai unit penggunaan.
- **Chunking:** 6-8 phrase frames per set, grouped by head word atau situation; contrast seperti 気にする/気をつける.
- **Workflow:** context prediction -> phrase assembly -> retrieval -> sentence completion -> short spoken use.
- **Gate:** lexical choice in new context dan productive use; arti kata per kata tidak cukup.
- **Integration:** phrase strength meningkatkan vocab dan grammar mastery secara bersamaan.

## N4.10 - N4 Readiness and Integrated Function

- **Format:** dua official-like mock forms plus separate JLP functional tasks; raw score dan section floor sesuai struktur N4/N5.[2][4]
- **Gate:** stable performance, no weak section, delayed retrieval subset, dan one integrated daily-life scenario.
- **Remediation:** diagnosis dikembalikan ke item/skill, misalnya reference tracking, conditional nuance, atau audio number detail.
- **Label:** JLP N4 Readiness; tidak menggunakan istilah certified.
- **Upgrade:** writing kanji dan conversation tetap ditampilkan sebagai tambahan platform, bukan bagian skor JLPT.

# LEVEL N3 - 12 MODUL

## Spiral N3

N3 adalah bridging level. Fokus bergeser dari kalimat terpisah ke paragraph/discourse, dari arti tunggal ke nuance/register, dan dari percakapan pendek ke summary. Kecepatan dibangun melalui repeated fluent exposure, bukan tekanan ekstrem.

## N3.01 - Kanji N3 in Word Families and Context

- **Outcome:** membaca kanji/compounds N3, memilih reading berdasarkan kata dan context, serta membedakan confusables.
- **Chunking:** word families and thematic sets; ateji/irregular reading diajarkan saat high-frequency, bukan sebagai koleksi trap.
- **Workflow:** word first -> reading prediction -> component contrast -> sentence retrieval -> typing/selected writing -> delayed mix.
- **Gate:** unseen word/context inference plus known compound recall; tidak perlu menyebut semua possible readings.
- **Integration:** reading speed hanya diukur pada kata yang sudah Durable.

## N3.02 - Vocabulary N3: Register, Idiom, and Abstract Core

- **Outcome:** memperluas cumulative 3.000-4.000 lexical units dengan register, collocation, onomatopoeia, dan abstract high-frequency words.
- **Chunking:** 8-12 lexical units; one semantic field + contrast + discourse example. Niche politics/science menjadi reading context, bukan daftar wajib terpisah.
- **Workflow:** context inference -> nuance grid -> recall -> paraphrase -> sentence/summary use.
- **Gate:** exact choice in new context, paraphrase, and productive core; one-translation matching tidak cukup.
- **Retention:** item diuji lintas mode dan lintas module.

## N3.03 - Agency: Causative, Passive-Causative, and Permission

- **Outcome:** memahami siapa menyebabkan/mengizinkan/terpaksa melakukan apa, lalu memilih form dan register.
- **Chunking:** causative meaning -> passive-causative -> benefactive/permission expressions -> politeness contrast; tidak satu tabel masif.
- **Workflow:** agency diagram -> interpretation -> form reconstruction -> social context -> roleplay repair.
- **Gate:** agency comprehension wajib benar sebelum form; novel verbs and participants.
- **Upgrade:** ～てもらう/いただく diposisikan sebagai benefactive/politeness yang terkait, bukan sinonim causative.

## N3.04 - Hypothetical and Concessive Reasoning

- **Outcome:** memahami dan menghasilkan hypothetical/concessive forms berdasarkan certainty, stance, dan discourse.
- **Chunking:** one contrast pair per set; ～としたら, ～としても, ～にしても, ～にせよ/しろ muncul melalui scenarios.
- **Workflow:** branch prediction -> meaning contrast -> reconstruction -> response to dilemma -> delayed transfer.
- **Gate:** choose and justify form in unseen context; register mismatch feedback.
- **Integration:** forms recycle into reading argument and conversation.

## N3.05 - Evidence, Hearsay, Appearance, and Inference

- **Outcome:** membedakan そうだ, ようだ, らしい, dan みたい berdasarkan sumber bukti dan register.
- **Correction from V2:** そうだ memiliki hearsay dan appearance constructions; ようだ expresses inference/resemblance; らしい can convey hearsay/typicality; みたい is colloquial. Jangan memakai satu label yang salah untuk setiap form.
- **Workflow:** evidence scene -> source identification -> form prediction -> paired sentence contrast -> gossip/report task.
- **Gate:** evidence source and register must both be correct; form-only score tidak cukup.
- **Retention:** audio intonation and sentence context included.

## N3.06 - Workplace Polite Interaction

- **Outcome:** request, refuse, confirm, report, dan clarify di kantor dengan level kesopanan yang masuk akal.
- **Workflow:** observe hierarchy -> identify intent -> chunk shadow -> controlled turn -> 6-10 turn roleplay -> feedback and repair.
- **Gate:** completion, appropriateness, comprehensibility, and repair; AI confidence rendah memicu fallback, bukan automatic fail.
- **Content:** prioritaskan phrases high-frequency; かしこまりました/承知しました diajarkan sesuai role.
- **Separation:** hasil roleplay masuk JLP Communication, bukan skor JLPT.

## N3.07 - Reading N3: Expository and Comparison

- **Outcome:** memahami claim, reason, comparison, reference, dan author stance pada short/mid texts.
- **Workflow:** preview task -> first read -> argument skeleton -> evidence answer -> paraphrase -> parallel passage.
- **Scaffold:** lexical gloss on-demand; furigana by item mastery, bukan fixed 20%.
- **Gate:** main point, inference, comparison, and information retrieval on new texts; response time only after accuracy.
- **Transfer:** mixed source page seperti explanation + chart/notice.

## N3.08 - Listening N3: Extended Conversation and Summary

- **Outcome:** mengikuti percakapan 1-3 menit, melacak speaker/decision, dan membuat summary singkat.
- **Workflow:** listen for task -> speaker/event notes -> answer -> chunk replay -> transcript repair -> 20-second summary -> new audio.
- **Gate:** first-listen key point, delayed detail, relationship inference, and summary rubric.
- **Variation:** speaker number, gender/age, and discourse markers vary gradually.
- **Upgrade:** full dictation is selective diagnosis, bukan kewajiban untuk setiap audio.

## N3.09 - Abstract Nouns and Nuance Networks

- **Outcome:** menggunakan abstract words and grammatical nouns seperti わけ, はず, べき, もの, dan こと dalam konteks.
- **Workflow:** paired examples -> meaning prediction -> nuance matrix -> substitution -> explanation/paraphrase -> production.
- **Gate:** user memilih form dan menjelaskan effect pada meaning; translation alone tidak cukup.
- **Chunking:** maksimal 2-3 confusables per set.
- **Integration:** words recur in N3.10, reading, and listening.

## N3.10 - Compound Grammar and Sentence Architecture

- **Outcome:** memahami/menyusun complex sentences dengan patterns seperti ～ないことには, ～ずにはいられない, ～がち, ～つつある, ～かねない.
- **Workflow:** clause boundary -> core proposition -> modifier/pattern -> reconstruction -> contextual production -> paragraph transfer.
- **Gate:** both form and logical relation; long scramble without meaning support is not sufficient.
- **Feedback:** highlight broken relation, register, or attachment point.
- **Retention:** mixed with earlier patterns, weighted to confusions.

## N3.11 - Integration and Automaticity N3

- **Outcome:** meningkatkan accuracy, switching, dan pacing across vocabulary/grammar/reading without sacrificing comprehension.
- **Workflow:** untimed diagnostic -> targeted mixed sets -> paced set -> error review -> parallel set. Time limit adapts to baseline.
- **Gate:** accuracy floor first, then sustainable pace across two sessions; 100 items/10 minutes is not universal.
- **Reporting:** careless, knowledge, ambiguity, and timeout errors separated.
- **Transfer:** short official-like blocks.

## N3.12 - N3 Readiness and Bridge Gate

- **Format:** two official-like mock forms, section profile, delayed mastery sample, and separate JLP interaction/writing portfolio.
- **Gate:** readiness buffer on all sections, consistency across forms, no major retention collapse, and N3 discourse task.
- **Label:** JLP N3 Readiness. The JLPT certificate remains external.
- **Remediation:** weak-point map links directly to components instead of repeating entire level.
- **Upgrade:** N3 result explicitly shows readiness to bridge into broader real-world texts.

# LEVEL N2 - 12 MODUL

## Spiral N2

N2 memindahkan pusat belajar ke authentic discourse: news, editorial, workplace, explanation, dan lecture. Kanji/vocabulary tumbuh melalui teks dan audio; niche terminology dipelajari sebagai strategi inferensi, bukan hafalan daftar lintas domain. Register dan paraphrase menjadi kemampuan inti.

## N2.01 - Kanji N2: Context, Okurigana, and Compounds

- **Outcome:** membaca dan membedakan kanji/compounds N2 dalam konteks, termasuk okurigana produktif dan word formation.
- **Chunking:** frequent compounds -> okurigana contrasts -> derivation -> contextual reading. Name reading, ateji langka, dan classical forms menjadi enrichment, bukan core gate.
- **Workflow:** sentence first -> reading/form prediction -> component and okurigana analysis -> paraphrase -> typing/selected writing -> delayed context.
- **Gate:** unseen compounds within known components, usage, dan orthography; jangan meminta semua readings tanpa kata.
- **Alignment:** word formation dan usage diperkuat karena termasuk tipe item N2.[2]

## N2.02 - Vocabulary N2: Register, Collocation, and Paraphrase

- **Outcome:** memperluas cumulative 6.000-8.000 lexical units dengan exact usage, register, collocation, derivation, dan near-synonym distinctions.
- **Chunking:** corpus-driven semantic sets; domain terms muncul di authentic texts dengan glossary strategy. Politik, kedokteran, filsafat, dan teknologi tidak menjadi daftar wajib yang sama berat.
- **Workflow:** infer from discourse -> verify -> nuance/usage grid -> paraphrase -> sentence/summary production -> cross-domain transfer.
- **Gate:** contextually-defined expression, paraphrase, word formation, dan usage; receptive/productive strength dipisahkan.
- **Retention:** priority berdasarkan frequency, dispersion, and error impact.

## N2.03 - Agency, Benefactive Stance, and Honorific Framing

- **Outcome:** menggunakan ～ていただく, ～させていただく, requests, directives, dan related forms dengan agency serta social stance yang benar.
- **Chunking:** who benefits/permits -> social relation -> form -> overuse avoidance. ～させていただく tidak diajarkan sebagai formula otomatis.
- **Workflow:** relationship map -> interpret intent -> choose frame -> roleplay -> feedback on agency/register -> repair.
- **Gate:** correct meaning and social appropriateness in unseen workplace/public scenarios.
- **Upgrade:** “advanced causative” dan honorific tidak disatukan hanya karena bentuknya panjang; relation meaning menjadi pusat.

## N2.04 - Formal Written Relations

- **Outcome:** memahami dan memakai formal expressions seperti ～に際して, ～を踏まえて, ～をめぐって, dan ～に伴って dalam discourse.
- **Chunking:** 2-3 relations per set berdasarkan function: occasion, basis, topic/dispute, correlated change.
- **Workflow:** read paragraph -> identify logical relation -> compare register -> reconstruct -> paraphrase formal/plain -> short report.
- **Gate:** paragraph flow dan register; fill-in sentence tunggal hanya tahap awal.
- **Transfer:** notice, report, editorial excerpt, dan business email-style text.

## N2.05 - Emphasis, Scope, and Contrast

- **Outcome:** membedakan scope/stance pada こそ, さえ, すら, ばかりか, どころか, ものの, dan related forms.
- **Workflow:** proposition baseline -> scope highlight -> contrast pair -> predict implication -> sentence/paragraph production.
- **Chunking:** form families by discourse function; jangan mengurutkan sebagai “scale” bila makna tidak berada pada satu dimensi.
- **Gate:** speaker stance, scope, and implication pada context baru.
- **Feedback:** tunjukkan apa yang menjadi focus/contrast, bukan terjemahan formula saja.

## N2.06 - Keigo and Professional Interaction

- **Outcome:** memahami dan menghasilkan core sonkeigo, kenjougo, teineigo, request softening, reporting, dan repair di situasi profesional.
- **Workflow:** role/hierarchy -> intent -> model chunk -> controlled choice -> multi-turn task -> feedback -> repair in parallel scene.
- **Gate:** task completion, appropriateness, comprehensibility, and form; voice AI coaching tidak menjadi single hard gate.
- **Content:** cover over-politeness and mixed-register errors, bukan hanya conjugation table.
- **Reporting:** JLP Communication score separate from JLPT readiness.[3]

## N2.07 - Reading N2: Editorial, Opinion, and Integrated Sources

- **Outcome:** memahami structure, author intent, comparison, argument, dan information retrieval pada berbagai teks N2.
- **Workflow:** task preview -> first-pass map -> claim/evidence -> reference/paraphrase -> answer with evidence -> counter-position -> parallel text.
- **Chunking:** short 200-character texts, mid passages, thematic/integrated reading sesuai bentuk resmi N2.[2]
- **Gate:** new text and source combination; lookup/furigana as tracked support.
- **Upgrade:** bias detection digunakan bila text mendukung; jangan memaksa semua editorial memiliki bias sederhana.

## N2.08 - Listening N2: News, Explanation, and Lecture

- **Outcome:** menangkap task, key point, outline, stance, dan integrated comprehension pada audio panjang.
- **Workflow:** blind listen -> structured notes -> response -> selective replay -> transcript comparison -> oral/written summary -> new speaker transfer.
- **Chunking:** 1-5 minute audio bertahap; note-taking scaffold makin ringan.
- **Gate:** first-listen outline, detail, inference, and action; summary is JLP extension, not JLPT score.
- **Variation:** announcements, news, interview, and lecture, dengan beberapa speaker.

## N2.09 - Idioms and Fixed Expressions in Context

- **Outcome:** memahami dan memakai high-value 慣用句, 四字熟語, dan fixed phrases sesuai register/situation.
- **Chunking:** 5-8 expressions per semantic/context set; frequency and usefulness menentukan core vs enrichment.
- **Workflow:** story/context -> infer -> component note when useful -> usage contrast -> paraphrase -> production.
- **Gate:** context appropriateness dan paraphrase; origin story bersifat memory aid, bukan tujuan.
- **Upgrade:** proverb culture notes tidak mengalahkan frequency dan actual use.

## N2.10 - Sentence Endings, Modality, and Speaker Stance

- **Outcome:** membedakan ものだ, ことだ, わけだ, はずだ, にちがいない, dan related endings berdasarkan stance.
- **Workflow:** same proposition -> different ending -> infer speaker commitment -> audio prosody -> response choice -> production.
- **Gate:** stance and evidence in context; user menjelaskan difference atau memilih paraphrase tepat.
- **Chunking:** 2-3 endings per contrast set.
- **Retention:** mixed with N3.05 evidence forms and N2.05 scope forms.

## N2.11 - N2 Integration, Pacing, and Exam Strategy

- **Outcome:** mengelola time, switching, distractor, dan section balance tanpa mengorbankan reasoning.
- **Workflow:** untimed diagnostic -> strategy lesson -> timed subsection -> error attribution -> parallel subsection. Guessing strategy dipisah dari knowledge mastery.
- **Gate:** pace stable across two forms, accuracy floor per item family, and no section collapse.
- **Upgrade:** mengganti 100 soal/10 menit yang arbitrer dengan official-like blocks dan personalized pacing.
- **Analytics:** record omission, change-of-answer, confidence, and time per item family.

## N2.12 - N2 Readiness and Functional Proficiency Gate

- **Format:** two official-like full forms; scaled score tidak disimulasikan sebagai angka resmi. Apply overall and sectional readiness logic with safety buffer.[4]
- **JLP extension:** professional interaction, formal summary, and writing portfolio dilaporkan terpisah.
- **Gate:** consistent section readiness, delayed retention sample, and functional rubric; weak domain tidak ditutupi total rata-rata.
- **Label:** JLP N2 Readiness.
- **Remediation:** prioritise high-impact item families, not full-level reset.

# LEVEL N1 - 12 MODUL

## Spiral N1

N1 berfokus pada dense and abstract discourse, fast integration, implicit stance, register, dan broad lexical coverage. Rare kanji, dialect, classical grammar, dan specialist terminology adalah enrichment kecuali benar-benar sering muncul dalam target corpus. Tidak ada klaim “native-level” atau “master Japanese”.

## N1.01 - Advanced Kanji in Authentic Discourse

- **Outcome:** mencapai broad recognition sekitar 1.800-2.200 internal kanji coverage dan membaca compounds dalam authentic discourse.
- **Chunking:** corpus-frequency and word-family sets; rare characters only when contextually valuable. Kokuji, name readings, dan classical variants menjadi elective packs.
- **Workflow:** authentic sentence -> word/reading -> component/formation -> paraphrase -> rapid recognition after accuracy -> delayed cross-text retrieval.
- **Gate:** contextual reading, word formation, and orthography; handwriting all 2.000+ tidak menjadi hard gate.
- **Upgrade:** mengganti “rare kanji hunt” dengan coverage, discrimination, and inference strategy.

## N1.02 - Advanced Lexicon, Register, and Domain Transfer

- **Outcome:** membangun 10.000+ lexical-family coverage internal dengan near-synonym, register, derivation, and cross-domain inference.
- **Chunking:** high-dispersion advanced core -> domain sets -> literary/archaic recognition -> optional dialect. Dialect/slang tidak diperlakukan sebagai universal N1 requirement.
- **Workflow:** corpus context -> infer -> verify -> nuance/usage grid -> paraphrase -> summary/argument use -> delayed transfer.
- **Gate:** exact usage, register, paraphrase, and inference in new domain.
- **Upgrade:** kedokteran/filsafat/hukum dipakai sebagai genres untuk strategy, bukan ribuan istilah wajib.

## N1.03 - Literary and Classical Influence in Modern Reading

- **Outcome:** mengenali advanced/literary grammar dan classical residue yang benar-benar muncul pada modern texts.
- **Chunking:** modern high-value forms first; classical paradigm and bungo production menjadi enrichment.
- **Workflow:** authentic excerpt -> modern paraphrase -> register/effect -> contrast -> reconstruction -> cross-genre recognition.
- **Gate:** comprehension and paraphrase, bukan produksi classical style tanpa kebutuhan.
- **Upgrade:** mengurangi beban archaic forms yang tidak proporsional terhadap tujuan N1 resmi.

## N1.04 - Dense Formal and Academic Discourse

- **Outcome:** memahami forms seperti ～にあって, ～をよそに, ～を禁じえない, ～ゆえに dalam paragraph argument.
- **Chunking:** function clusters: circumstance, disregard, unavoidable stance, cause/reason, concession.
- **Workflow:** paragraph logic -> relation identification -> register contrast -> paraphrase -> formal summary -> transfer to new domain.
- **Gate:** coherence, stance, and register; isolated fill-in alone tidak cukup.
- **Content QA:** examples reviewed by qualified Japanese educator/editor.

## N1.05 - Temporal Logic, Unexpected Development, and Inference

- **Outcome:** membedakan advanced temporal/inference forms seperti ～やいなや, ～そばから, ～かと思いきや, ～ともなると, dan ～がてら.
- **Workflow:** event timeline -> expectation -> actual outcome -> form choice -> narrative reconstruction -> new scenario.
- **Gate:** temporal relation, expectation, and register all correct.
- **Chunking:** minimal contrasts; avoid mixing five new forms in one lesson.
- **Retention:** forms recycle in literary/essay reading and listening.

## N1.06 - Pragmatics, Implicature, and High-Stakes Interaction

- **Outcome:** memahami indirect refusal/request, stance, humor cues, disagreement, negotiation, dan repair across relationships.
- **Workflow:** observe full context -> infer literal vs intended meaning -> choose strategy -> multi-turn roleplay -> consequence feedback -> repair.
- **Gate:** task result, social appropriateness, comprehensibility, and adaptability; one “native-like” answer is not required.
- **Caution:** sarcasm/humor varies by context and person; AI feedback must express uncertainty.
- **Separation:** this is JLP functional proficiency, not tested directly by JLPT.[3]

## N1.07 - Reading N1: Complex, Abstract, and Multi-Text

- **Outcome:** comprehend logical/abstract writings, editorials, critiques, and complex structure consistent with N1 goals.[1]
- **Workflow:** first-pass thesis -> discourse map -> implicit relation -> stance/evidence -> integrated sources -> counterargument -> parallel text.
- **Chunking:** short dense passages, mid texts, long thematic texts, integrated comprehension, and information retrieval per official item families.[2]
- **Gate:** unseen text, evidence-backed answer, paraphrase, and transfer. “Author epistemological stance” only when genuinely inferable.
- **Scaffold:** glossary and annotation after first attempt; tool use tracked.

## N1.08 - Listening N1: Multi-Speaker and Implicit Discourse

- **Outcome:** follow natural-speed lecture, debate, interview, and multi-speaker discourse; infer stance and decision.
- **Workflow:** purpose -> speaker-position map -> first response -> evidence replay -> transcript/notes comparison -> concise synthesis -> new audio.
- **Gate:** first-listen outline, key point, integrated comprehension, and quick response per official families.[2]
- **Variation:** turn-taking, implicit disagreement, repair, and topic shift; noise added only after clean comprehension.
- **Upgrade:** “who won debate” diganti dengan accurately representing positions/evidence unless task explicitly asks evaluation.

## N1.09 - Near-Synonym and Collocational Precision

- **Outcome:** memilih dan menjelaskan advanced near-synonyms berdasarkan semantic feature, collocation, register, and stance.
- **Workflow:** corpus examples -> feature grid -> substitution test -> error diagnosis -> paraphrase -> production in short argument.
- **Chunking:** 2-4 words per set; example 抑制/制御/規制/管理 dipakai dengan multiple contexts, bukan satu gloss.
- **Gate:** unseen context and explanation; confidence recorded to detect lucky guesses.
- **Retention:** variants recur across multiple domains.

## N1.10 - Sentence Integration and Text Coherence

- **Outcome:** reconstruct complex sentences and paragraphs by syntax, attachment, reference, and discourse relation.
- **Workflow:** find core predicate -> attach modifiers -> identify connector/reference -> reconstruct -> compare alternatives -> paragraph coherence transfer.
- **Gate:** logical explanation and text flow, not speed scramble alone.
- **Alignment:** includes sentence composition and text grammar item families while extending to real editing.[2]
- **Feedback:** show the first broken relation rather than only final order.

## N1.11 - N1 Integration, Stamina, and Exam Strategy

- **Outcome:** maintain comprehension and section balance under official-like time and dense distractors.
- **Workflow:** baseline full/subsection -> process analysis -> targeted practice -> parallel timed form -> recovery and pacing plan.
- **Gate:** consistent accuracy and pacing across two forms; no fixed 0,3-second response targets.
- **Analytics:** passage rereads, answer changes, omitted items, confidence, and fatigue curve.
- **Upgrade:** speed is downstream of mastery, not a substitute for it.

## N1.12 - N1 Readiness and Advanced JLP Portfolio

- **Format JLPT:** two or more secure parallel forms, official-like item families/times, raw score and readiness interval, section floors.[2][4]
- **Format JLP:** advanced interaction, summary, and writing portfolio reported separately because JLPT has no conversation/composition section.[3]
- **Gate:** stable multi-section readiness, delayed lexical/grammar sample, and advanced comprehension transfer.
- **Label:** “JLP N1 Readiness”, never “native”, “sensei”, or official certification.
- **Next path:** native-content practice by domain, not a false endpoint; mastery remains ongoing.

# 8. Assessment Blueprint

## 8.1 Pisahkan empat jenis bukti

| Bukti | Pertanyaan | Contoh | Boleh memberi mastery? |
|---|---|---|---|
| Exposure | Apakah user sudah melihat materi? | Menonton animasi stroke | Tidak |
| Guided performance | Dapatkah user mengikuti bantuan? | Trace di atas ghost | Tidak |
| Unaided retrieval | Dapatkah user mengambil dari ingatan? | Dengar “o”, tulis お | Ya, sebagai Retrievable |
| Delayed transfer | Apakah bertahan dan dapat digunakan? | Tulis お setelah 3 hari di kata baru | Ya, sebagai Durable/Transferable |

Skor UI harus menjelaskan jenis bukti. Progress 100% tidak boleh berarti “semua halaman sudah diklik”; harus ada completion dan mastery secara terpisah.

## 8.2 Rubric tulisan kana yang dapat dijelaskan

Untuk mencegah kasus あ/お tampak benar tetapi gagal terus, evaluator menampilkan:

1. **Stroke completeness:** semua stroke canonical ada; tidak ada garis yang hilang atau stroke tambahan besar.
2. **Order and direction:** urutan dan arah dibandingkan per stroke, dengan toleransi sampling/perangkat.
3. **Topology:** bagian yang harus berpotongan, tersambung, atau terpisah dinilai secara struktural.
4. **Proportion:** posisi relatif dan ukuran, dengan rentang yang mengakomodasi variasi handwriting sah.
5. **Confidence:** bila model evaluator tidak yakin, hasil menjadi “perlu coba ulang/lihat perbandingan”, bukan hard fail palsu.

Score composite hanya untuk ringkasan. UI harus mengatakan, misalnya: “Stroke 3 belum terdeteksi” atau “urutan benar, bentuk bawah terlalu terpisah”, bukan “Skor 60”. Template あ dan お wajib diuji karena pernah ditemukan stroke hilang pada asset.

## 8.3 Gate komunikasi

Rubric 0-3 per aspek:

- Task completion
- Comprehensibility
- Target language control
- Social appropriateness/register
- Repair ability (untuk level N3+)

AI memberi feedback dan confidence. Hard gate untuk speaking hanya boleh dipakai setelah evaluator divalidasi; jika confidence rendah, user mendapat alternate task atau review queue.

## 8.4 Gate JLPT readiness

- Ikuti test item families resmi.[2]
- Simpan raw performance per family; jangan reverse-engineer scaled score sebagai klaim resmi.
- Terapkan section floor karena JLPT memerlukan overall dan minimum per scoring section.[4]
- Gunakan minimal dua parallel forms agar satu set yang kebetulan cocok tidak memberi label siap.
- Speaking/writing tidak masuk mock score.[3]

# 9. Eksperimen khusus Hiragana dan mnemonic

Analogi suara ayam untuk あ dapat menarik dan memorable bagi sebagian user, tetapi belum dapat disebut metode paling efektif. Ia berisiko menjadi cerita yang diingat tanpa bentuk, tidak universal secara budaya, dan dapat mendorong visual yang berbeda dari glyph canonical. Rekomendasi default:

- Tampilkan bunyi asli + bentuk canonical + satu kata konkret yang sangat pendek.
- Mnemonic menjadi cue opsional setelah user mencoba mengingat.
- Sediakan 2-3 anchor: shape anchor, sound/word anchor, dan “buat anchor sendiri”.
- Jangan menambahkan garis atau bentuk dekoratif yang bisa dianggap bagian huruf.
- Uji efektivitas pada delayed recall dan writing, bukan rating “seru” saja.

## 9.1 Trial A/B/C

| Variant | Intervensi | Yang dibuat sama |
|---|---|---|
| A | Story/sound mnemonic seperti ayam | Jumlah exposure, latihan, audio, dan waktu |
| B | Canonical shape + native sound + concrete word anchor | Jumlah exposure, latihan, audio, dan waktu |
| C | User memilih/membuat anchor setelah melihat canonical form | Jumlah exposure, latihan, audio, dan waktu |

Primary metrics:

- Unaided sound-to-symbol recall setelah 24 jam dan 7 hari
- Unaided writing validity setelah 24 jam dan 7 hari
- Confusion rate pada pasangan mirip
- Hint dependency
- Waktu aktif sampai Durable, bukan hanya completion

Secondary metrics: enjoyment, dropout, replay, perceived difficulty. Variant menang bila meningkatkan retention/transfer tanpa menambah false form atau waktu secara tidak wajar. Jangan memilih hanya dari immediate quiz.

## 9.2 Urutan rollout Hiragana 46

1. Validasi asset canonical dan evaluator untuk semua 46, terutama あ dan お.
2. Selesaikan Fase 1 bank 10 dan delayed check.
3. Buka Fase 2 bank 10 baru; checkpoint memakai campuran bank 20.
4. Fase 3 menambah 10; latihan berisi new-weighted mix dan full bank 30 checkpoint.
5. Fase 4 menambah 10; full bank 40.
6. Fase 5 menambah 6; full bank 46.
7. Immediate Core Gate, lalu Retention Gate 3-7 hari.
8. Baru buka modifiers dan contracted sounds dalam microsets.

Fase berikutnya tidak harus menunggu semua item berstatus Durable, tetapi critical floor wajib: minimal 80% unaided pada bank aktif, semua item pernah benar tanpa hint, dan weak items masuk remediation. Label mastered tetap menunggu uji tertunda.

# 10. Content Quality System

## 10.1 Single source of truth

Setiap item konten memiliki:

- stable item_id
- curriculum_version dan content_version
- canonical form/reading/meaning
- engine type dan response modes
- prerequisite concepts
- confusable set
- example contexts and source/reviewer
- audio speaker/recording metadata
- assessment rules and acceptable variants
- accessibility text

## 10.2 QA script/kana/kanji

- Stroke count dan path count sesuai canonical data.
- Semua stroke berada dalam bounding box dan tidak terpotong.
- Urutan/arah animation sama dengan evaluator.
- Preview glyph dan writing template berasal dari asset yang sama.
- Golden tests menggunakan contoh benar, variasi benar, missing stroke, extra stroke, wrong order, dan scribble.
- Device sampling diuji untuk mouse, touch, dan stylus.
- Japanese reviewer sign-off sebelum production.

## 10.3 QA language content

- Contoh alami, sesuai level, dan tidak mengajarkan generalisasi palsu.
- Grammar contrasts ditinjau dari meaning, register, dan restriction.
- Distractor plausible tetapi hanya satu best answer pada konteks.
- Audio transcript dan key answer diverifikasi.
- AI-generated content tidak langsung publish; wajib schema validation dan human linguistic review.
- Sensitive/cultural claims diberi context dan tidak dijadikan stereotip.

# 11. Data, Telemetry, dan Adaptasi

## 11.1 Event minimum

`item_presented`, `response_committed`, `hint_opened`, `feedback_viewed`, `retry_committed`, `item_retrieved`, `checkpoint_completed`, `retention_checked`, `transfer_completed`, `content_issue_reported`.

Field minimum:

- user_id, item_id, module_id, curriculum_version, content_version, engine_version
- prompt_mode, response_mode, support_level
- first_attempt_correct, final_correct, latency_ms, confidence
- hint_level, attempt_count, error_type
- device/input type
- score components for handwriting/speaking
- scheduled_interval and actual_interval

## 11.2 Scheduler priority

Priority meningkat bila:

- Salah tanpa hint
- Benar setelah hint
- Latency jauh lebih lambat dari baseline pada item Durable
- Confusion pair berulang
- Retention check gagal
- Item menjadi prasyarat task dekat

Priority menurun bila benar tanpa hint pada beberapa interval dan berhasil transfer. Scheduler tidak boleh membuat review queue yang tak berujung; gunakan daily cap, overdue triage, dan “minimum viable review”.

## 11.3 Mastery calculation

Jangan simpan hanya persentase modul. Simpan evidence per skill dimension:

- form recognition
- sound mapping
- meaning/context
- productive recall
- handwriting/orthography bila relevan
- delayed retention
- transfer

Overall status adalah ringkasan konservatif dari critical dimensions. Completion lama tidak boleh otomatis dikonversi menjadi mastery V2.1.

# 12. Versioning dan Migrasi Kurikulum

1. Buat `curriculum_version = v2.1` dan content manifest immutable.
2. Progress V2 lama dipertahankan sebagai history, tidak dihapus.
3. Mapping lama-baru hanya diberikan untuk item yang benar-benar ekuivalen; completion halaman lama bukan mastery baru.
4. User aktif mendapat placement/diagnostic singkat untuk memperoleh credit.
5. Feature flag rollout per module/cohort.
6. Database, auth, website shell, dan infrastructure tidak dihapus.
7. Semua event baru membawa version agar data trial tidak bercampur.

# 13. Urutan Implementasi yang Direkomendasikan

## P0 - Fondasi yang harus benar dahulu

1. **Canonical glyph pipeline:** satu asset source untuk display, animation, trace, dan scoring; perbaiki あ/お dan golden tests.
2. **Mastery evidence model:** pisahkan completion, unaided retrieval, hint usage, delayed retention, dan transfer.
3. **Hint ladder + retry semantics:** attempt dibantu tidak menambah mastery.
4. **Cumulative phase graph:** Hiragana 10/10/10/10/6 dengan bank 10/20/30/40/46.
5. **Explainable handwriting score:** tampilkan subscore dan specific correction.
6. **Curriculum versioning:** progress V2 lama tetap aman, V2.1 memiliki namespace baru.

## P1 - Vertical slice Pre-N5

1. PRE-N5.01 lengkap sampai delayed Core Gate.
2. Dashboard mastery/weak point yang memakai evidence nyata.
3. PRE-N5.02 dengan contrast kana dan interleaving terkendali.
4. PRE-N5.04 sebagai functional/audio slice untuk membuktikan engine berbeda.
5. PRE-N5.11 integrated gate.

## P2 - Engine reusable

1. Vocabulary engine + scheduler
2. Grammar contrast engine
3. Listening first-pass/replay/transcript engine
4. Reading evidence/highlight engine
5. Interaction rubric and repair loop
6. Official-like assessment builder

## P3 - Rollout level

Bangun satu complete spiral per level sebelum menambah seluruh bank: N5 cycle pilot -> N4 bridge -> N3 discourse -> N2 authentic formal -> N1 advanced discourse. Hindari memasukkan ribuan item sebelum engine dan measurement terbukti.

# 14. Definition of Done per Modul

Sebuah modul baru dianggap siap production bila:

- Outcome observable dan assessment blueprint cocok.
- Microsets, confusable sets, dan cumulative bank terdefinisi.
- Semua content mempunyai version dan reviewer.
- Hint ladder dan feedback tersedia untuk setiap error utama.
- Immediate, delayed, dan transfer evidence dapat direkam.
- Keyboard, touch, mouse, mobile, dan accessibility path diuji sesuai engine.
- Tidak ada blocker karena skor AI yang tidak dapat dijelaskan.
- Analytics dashboard dapat membedakan learning gain, retention, dan completion.
- Gate dan remediation telah diuji dengan user, bukan hanya unit test.

# 15. Pilot dan Keputusan Berbasis Data

## 15.1 Tahap pilot

- **Alpha internal:** asset correctness, scoring, routing, and event integrity.
- **Closed pilot:** 20-50 beginner users; usability and false-fail audit.
- **Learning pilot:** randomised mnemonic/feedback variants bila sample memadai.
- **Retention follow-up:** 1, 3, 7, dan 14 hari; jangan berhenti di same-session score.
- **Scale gate:** baru ekspansi 67 modul setelah satu script, satu grammar, satu vocab, dan satu listening engine menunjukkan learning gain serta retention yang dapat dipercaya.

## 15.2 Metric hierarchy

1. Safety/content correctness
2. Delayed unaided retention
3. Transfer/task success
4. False-fail/false-pass rate evaluator
5. Time to Durable
6. Completion and return rate
7. Enjoyment/XP/streak

Gamification tidak boleh mengalahkan urutan ini. Streak boleh mendorong hadir, tetapi tidak memaksa user menebak cepat atau melanjutkan saat overload.

# 16. Handoff Contract untuk Claude/Claude Code

Gunakan dokumen ini sebagai source of truth kurikulum V2.1 dengan aturan berikut:

1. Jangan menghapus website, database, authentication, routing shell, atau infrastructure yang sudah ada.
2. Jangan menganggap teks PDF lama sebagai spesifikasi implementasi setelah ada konflik; keputusan V2.1 menang untuk metode belajar.
3. Pertahankan 67 module IDs kecuali migration eksplisit disepakati.
4. Implementasi pertama adalah vertical slice PRE-N5.01, bukan membuat semua konten sekaligus.
5. Semua progress baru versioned; progress lama read-only/history sampai mapping tervalidasi.
6. Semua attempt yang membuka hint ditandai `assisted` dan tidak memberi mastery sebelum unaided retry.
7. Semua module mempunyai immediate checkpoint, retention gate, dan transfer task yang sesuai engine.
8. Speed/timer hanya aktif setelah accuracy floor.
9. JLPT readiness dan JLP communication selalu dipisah pada UI/data.
10. Setiap perubahan content Jepang memerlukan QA linguistik dan test asset.

## 16.1 Format spesifikasi machine-friendly

Setiap modul sebaiknya diwakili oleh object dengan field minimum:

```json
{
  "module_id": "PRE-N5.01",
  "curriculum_version": "v2.1",
  "outcomes": [],
  "tracks": [],
  "microsets": [],
  "prerequisite_rules": [],
  "phase_graph": [],
  "hint_policy": {},
  "assessment_blueprint": {},
  "retention_policy": {},
  "transfer_tasks": [],
  "telemetry_schema_version": "1",
  "content_manifest_version": "1",
  "review_status": "draft"
}
```

# 17. Ringkasan Modul dan Perubahan

| Level | Modul | Perubahan dominan |
|---|---:|---|
| Pre-N5 | 11 | Kana 10/10/10/10/6, hint ladder, cumulative bank, delayed gate |
| N5 | 10 | Kanji/vocab continuous; reading/listening sejak awal; readiness terpisah |
| N4 | 10 | Spiral, connector/condition contrast, contextual collocation |
| N3 | 12 | Discourse bridge, correction hearsay/inference, adaptive automaticity |
| N2 | 12 | Authentic formal discourse, corpus vocabulary, official-like section logic |
| N1 | 12 | Abstract discourse; rare/classical/dialect jadi enrichment; no native claim |
| **Total** | **67** | Seluruh ID dipertahankan, metode dan gate diperbarui |

# 18. Sumber dan Dasar Riset

[1] JLPT. “N1-N5: Summary of Linguistic Competence Required for Each Level.” https://www.jlpt.jp/e/about/levelsummary.html

[2] JLPT. “Composition of Test Sections and Items.” https://www.jlpt.jp/e/guideline/testsections.html

[3] JLPT. “FAQ.” Menjelaskan bahwa JLPT tidak memuat conversation/composition test dan tidak menerbitkan lagi daftar resmi kosakata/kanji/grammar. https://www.jlpt.jp/e/faq/

[4] JLPT. “Scoring Sections, Pass or Fail, Score Report.” https://www.jlpt.jp/e/guideline/results.html

[5] Roediger, H. L., & Karpicke, J. D. (2006). “Test-enhanced learning: Taking memory tests improves long-term retention.” Psychological Science, 17(3), 249-255. https://pubmed.ncbi.nlm.nih.gov/16507066/

[6] Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). “Distributed practice in verbal recall tasks: A review and quantitative synthesis.” Psychological Bulletin, 132(3), 354-380. https://pubmed.ncbi.nlm.nih.gov/16719566/

[7] Kornell, N., & Bjork, R. A. (2008). “Learning concepts and categories: Is spacing the enemy of induction?” Psychological Science, 19(6), 585-592. https://pubmed.ncbi.nlm.nih.gov/18578849/

[8] Mackey, A. (1999). “Input, interaction, and second language development: An empirical study of question formation in ESL.” Studies in Second Language Acquisition. https://eprints.lancs.ac.uk/id/eprint/59850/

[9] Nakata, T. (2017). “Does repeated practice make perfect? The effects of within-session repeated retrieval on second language vocabulary learning.” Studies in Second Language Acquisition. https://doi.org/10.1017/S0272263116000280

[10] Longcamp, M., Zerbato-Poudou, M.-T., & Velay, J.-L. (2005). “The influence of writing practice on letter recognition in preschool children: A comparison between handwriting and typing.” Acta Psychologica, 119(1), 67-79. https://pubmed.ncbi.nlm.nih.gov/15823243/

## Catatan interpretasi bukti

Studi di atas tidak langsung menentukan satu UI atau interval yang sempurna untuk semua user JLP. Keputusan seperti batch 10, pelajaran 5, default 1/3/7/14/30 hari, dan threshold awal adalah hipotesis desain yang konsisten dengan prinsip bukti serta masalah implementasi yang ditemukan. Nilai final harus ditentukan melalui pilot, calibration, dan retention data JLP.

# 19. Kesimpulan

Versi V2.1 mengubah JLP dari rangkaian halaman dan boss menjadi sistem pembelajaran yang dapat membedakan **pernah melihat**, **bisa menjawab**, **masih ingat**, dan **bisa menggunakan**. Hiragana menjadi contoh pola global: belajar sedikit, berlatih benar, mendapatkan bantuan saat lupa, mencoba ulang tanpa bantuan, mencampur semua materi lama, lalu diuji lagi setelah jeda.

Tujuan produk bukan membuat user merasa cepat selesai. Tujuannya adalah membuat user mencapai kemampuan yang bertahan, dapat dipakai, dan dapat dibuktikan dengan data - dari huruf pertama sampai pemahaman discourse N1.
