export type HiraganaMnemonic = {
  emoji: string;
  title: string;
  story: string;
  anchorWord?: string;
  soundCue?: string;
  shapeCue?: string;
  strokeCue?: string;
};

export type HiraganaWordUnlock = {
  kana: string;
  romaji: string;
  meaning: string;
};

export const HIRAGANA_LAB_VERSION = "hiragana-path-46-v1";

// V2.1 §7 refers to these stages as P1-P5, but the database rows kept
// their original F1-F5 codes to avoid an unnecessary rename migration.
// This is the single place that maps between the two. Kept in this
// client-safe module (not pre-n5-01-query.ts) because HiraganaLearningLab
// is a client component and importing a runtime value from the query
// file would pull its next/headers-dependent Supabase import into the
// client bundle.
export const V21_PHASE_CODE_BY_STAGE: Record<string, string> = {
  F1: "P1",
  F2: "P2",
  F3: "P3",
  F4: "P4",
  F5: "P5",
  BOSS: "CORE_GATE",
};
export const CURRICULUM_VERSION_V21 = "v2.1";

export const HIRAGANA_BASIC_CHARACTERS = [
  "\u3042", "\u3044", "\u3046", "\u3048", "\u304a",
  "\u304b", "\u304d", "\u304f", "\u3051", "\u3053",
  "\u3055", "\u3057", "\u3059", "\u305b", "\u305d",
  "\u305f", "\u3061", "\u3064", "\u3066", "\u3068",
  "\u306a", "\u306b", "\u306c", "\u306d", "\u306e",
  "\u306f", "\u3072", "\u3075", "\u3078", "\u307b",
  "\u307e", "\u307f", "\u3080", "\u3081", "\u3082",
  "\u3084", "\u3086", "\u3088", "\u3089", "\u308a",
  "\u308b", "\u308c", "\u308d", "\u308f", "\u3092", "\u3093",
] as const;

export const HIRAGANA_WORD_UNLOCKS: Record<string, HiraganaWordUnlock[]> = {
  "basic-A": [
    { kana: "\u3042\u3044", romaji: "ai", meaning: "cinta" },
    { kana: "\u3044\u3048", romaji: "ie", meaning: "rumah" },
    { kana: "\u3046\u3048", romaji: "ue", meaning: "atas" },
    { kana: "\u3042\u304a", romaji: "ao", meaning: "biru" },
  ],
  "basic-B": [
    { kana: "\u304b\u304a", romaji: "kao", meaning: "wajah" },
    { kana: "\u3053\u3048", romaji: "koe", meaning: "suara" },
    { kana: "\u3042\u304b", romaji: "aka", meaning: "merah" },
    { kana: "\u3048\u304d", romaji: "eki", meaning: "stasiun" },
  ],
  "basic-C": [
    { kana: "\u3059\u3057", romaji: "sushi", meaning: "sushi" },
    { kana: "\u304b\u3055", romaji: "kasa", meaning: "payung" },
    { kana: "\u3042\u3055", romaji: "asa", meaning: "pagi" },
    { kana: "\u3057\u304a", romaji: "shio", meaning: "garam" },
  ],
  "basic-D": [
    { kana: "\u305f\u3053", romaji: "tako", meaning: "gurita" },
    { kana: "\u3064\u304d", romaji: "tsuki", meaning: "bulan" },
    { kana: "\u304f\u3064", romaji: "kutsu", meaning: "sepatu" },
    { kana: "\u3057\u305f", romaji: "shita", meaning: "bawah" },
  ],
};

// PROMPT-7 Bagian 3 — mnemonik Indonesia asli untuk 46 hiragana inti.
// Format wajib, empat bagian (V2.1 Bagian 9): jangkar bunyi (soundCue,
// kata Indonesia konkret yang diawali bunyi yang sama — BUKAN kata
// Jepang lain, itu pendekatan versi lama yang diganti di sini), jangkar
// bentuk (shapeCue, benda Indonesia sehari-hari yang mirip bentuknya),
// cerita penghubung (story, satu kalimat yang menyatukan bunyi+bentuk),
// petunjuk goresan (strokeCue, bahasa awam, bukan istilah kaligrafi).
// Tidak ada garis/bentuk dekoratif ditambahkan pada penjelasan bentuk —
// hanya menamai apa yang sudah ada di goresan asli.
//
// Pasangan yang sering tertukar (dari kana_confusion_pairs, ditambah
// き/さ dan く/し yang diminta eksplisit) sengaja diberi cerita yang
// SALING KONTRAS, bukan dua cerita kebetulan berdekatan — lihat
// komentar "kontras" di tiap entri terkait: あ/お, い/り, き/さ, く/し,
// ぬ/め, ね/れ/わ (tiga arah), は/ほ, る/ろ.
//
// PERLU DITINJAU PEMILIK REPO: hanya penutur asli Indonesia yang bisa
// menilai apakah jangkar-jangkar ini benar-benar nyambung secara
// intuitif. Anggap draf pertama, bukan versi final.
export const HIRAGANA_LAB_MNEMONICS: Record<string, HiraganaMnemonic> = {
  // Baris A — kontras あ/お: あ menyatu jadi satu bentuk utuh (3 goresan
  // menyilang menyatu), お punya satu coretan TERPISAH di kanan atas.
  "あ": { emoji: "🐔", title: "A dari ayam", anchorWord: "ayam", soundCue: "Diawali bunyi seperti awal kata 'ayam'.", shapeCue: "Seperti orang menyilangkan tangan lalu memutar tubuhnya.", story: "Ayam yang bingung menyilangkan kedua sayapnya sendiri.", strokeCue: "Tiga goresan: garis datar, garis tegak menembusnya, lalu lengkung besar seperti angka 3 terbalik." },
  // kontras い/り: い = dua garis PENDEK sejajar (dua ikan tenang);
  // り = satu garis pendek + satu garis PANJANG meliuk turun jauh.
  "い": { emoji: "🐟", title: "I dari ikan", anchorWord: "ikan", soundCue: "Diawali bunyi seperti awal kata 'ikan'.", shapeCue: "Dua ekor ikan kecil berenang berdampingan, yang kiri sedikit lebih panjang.", story: "Dua ikan berenang tenang bersebelahan di kolam yang tenang.", strokeCue: "Dua goresan terpisah dari atas ke bawah; jangan disambungkan." },
  "う": { emoji: "🐍", title: "U dari ular", anchorWord: "ular", soundCue: "Diawali bunyi seperti awal kata 'ular'.", shapeCue: "Kepala kecil di atas, badan melengkung besar ke kanan bawah.", story: "Ular yang mengangkat kepalanya sebentar lalu tubuhnya melengkung turun.", strokeCue: "Dua goresan: tanda pendek di atas, lalu satu lengkung besar ke kanan bawah." },
  "え": { emoji: "🪣", title: "E dari ember", anchorWord: "ember", soundCue: "Diawali bunyi seperti awal kata 'ember'.", shapeCue: "Garis mendatar pendek seperti bibir ember, disambung garis panjang yang mengait ke kanan seperti gagangnya.", story: "Ember yang dituang airnya mengalir miring lalu mengait di ujung gagang.", strokeCue: "Dua goresan; goresan kedua mengalir turun dan berbelok tanpa terputus." },
  "お": { emoji: "💊", title: "O dari obat", anchorWord: "obat", soundCue: "Diawali bunyi seperti awal kata 'obat'.", shapeCue: "Mirip あ, tapi ada satu tetes kecil yang TERPISAH di kanan atas — kontras dengan あ yang menyatu utuh.", story: "Obat tetes yang wadahnya mirip あ, tapi satu tetesnya jatuh terpisah di sampingnya.", strokeCue: "Tiga goresan; dua goresan pertama seperti あ, lalu satu coretan pendek terpisah di kanan atas." },

  // Baris KA — kontras き/さ: き punya DUA garis mendatar penuh (4
  // goresan, rumit); さ hanya SATU garis atas + lengkung sabit besar
  // di bawah (3 goresan, lebih sederhana dan lengkungnya besar).
  "か": { emoji: "🪟", title: "Ka dari kaca", anchorWord: "kaca", soundCue: "Diawali bunyi seperti awal kata 'kaca'.", shapeCue: "Seperti panel kaca miring dengan gagang pendek terpisah di kanan.", story: "Jendela kaca besar yang berdiri miring dengan gagang kecil di sampingnya.", strokeCue: "Tiga goresan; tiang kiri berlengkung dulu, baru gagang pendek di kanan." },
  "き": { emoji: "🪭", title: "Ki dari kipas", anchorWord: "kipas", soundCue: "Diawali bunyi seperti awal kata 'kipas'.", shapeCue: "Dua garis mendatar penuh dilintasi satu garis tegak, dengan lipatan terpisah di bawah — lebih rumit daripada さ.", story: "Kipas lipat dengan dua rangka mendatar dan satu lipatan tambahan di ujung bawah.", strokeCue: "Empat goresan; jangan satukan lengkung bawah dengan garis di atasnya." },
  "く": { emoji: "🐾", title: "Ku dari kuku", anchorWord: "kuku", soundCue: "Diawali bunyi seperti awal kata 'kuku'.", shapeCue: "Satu sudut tajam yang terbuka ke kanan, TANPA lengkung balik di ujung — kontras dengan し.", story: "Kuku kucing yang mencakar membentuk satu sudut tajam sederhana.", strokeCue: "Satu goresan: turun miring, berbelok tajam sekali, lalu berhenti — tidak melengkung naik lagi." },
  "け": { emoji: "🐇", title: "Ke dari kelinci", anchorWord: "kelinci", soundCue: "Diawali bunyi seperti awal kata 'kelinci'.", shapeCue: "Telinga tegak berkait di kiri, badan menyilang dan kaki turun di kanan.", story: "Kelinci duduk dengan satu telinga tegak dan badan bulat di sampingnya.", strokeCue: "Tiga goresan; tiang kiri berkait dulu, baru silang dan garis turun di kanan." },
  "こ": { emoji: "🌊", title: "Ko dari kolam", anchorWord: "kolam", soundCue: "Diawali bunyi seperti awal kata 'kolam'.", shapeCue: "Dua garis mendatar melengkung yang tidak saling tersambung, seperti dua riak air.", story: "Dua riak air kolam yang melebar sejajar setelah batu dilempar.", strokeCue: "Dua goresan dari kiri ke kanan dengan jarak yang seimbang." },

  // Baris SA — lanjutan kontras き/さ (lihat baris KA); kontras く/し:
  // し = SATU garis panjang yang melengkung NAIK ke kanan di ujung.
  "さ": { emoji: "🌙", title: "Sa dari sabit", anchorWord: "sabit", soundCue: "Diawali bunyi seperti awal kata 'sabit'.", shapeCue: "Satu garis atas pendek dan satu lengkung besar seperti bulan sabit di bawah — lebih sederhana daripada き.", story: "Bulan sabit besar yang tergantung di bawah satu garis awan tipis.", strokeCue: "Tiga goresan; garis atas dulu, lalu turun, lalu lengkung sabit besar terpisah." },
  "し": { emoji: "🪥", title: "Shi dari sikat gigi", anchorWord: "sikat gigi", soundCue: "Diawali bunyi seperti awal kata 'sikat' (shi).", shapeCue: "Satu garis panjang turun yang MELENGKUNG NAIK ke kanan di ujung — kontras dengan く yang berhenti di sudut tajam.", story: "Gagang sikat gigi yang tergantung lurus lalu bulunya melengkung naik ke kanan.", strokeCue: "Satu goresan dari atas, turun panjang, lalu melengkung naik di ujung — jangan berhenti di sudut tajam seperti く." },
  "す": { emoji: "🍲", title: "Su dari sup", anchorWord: "sup", soundCue: "Diawali bunyi seperti awal kata 'sup'.", shapeCue: "Garis mendatar disilang satu putaran kecil berekor di tengah, seperti sendok mengaduk.", story: "Sendok yang mengaduk semangkuk sup hingga membentuk satu putaran kecil.", strokeCue: "Dua goresan; garis mendatar dulu, lalu satu putaran kecil menurun di tengah." },
  "せ": { emoji: "🔥", title: "Se dari setrika", anchorWord: "setrika", soundCue: "Diawali bunyi seperti awal kata 'setrika'.", shapeCue: "Garis mendatar seperti gagang, dilintasi dua garis tegak; yang kanan berkait di ujung seperti alasnya.", story: "Setrika dengan gagang mendatar dan alas berkait yang masih panas.", strokeCue: "Tiga goresan: garis mendatar, lalu sisi kiri, lalu sisi kanan yang berkait." },
  "そ": { emoji: "📄", title: "So dari sobek", anchorWord: "sobek", soundCue: "Diawali bunyi seperti awal kata 'sobek'.", shapeCue: "Satu garis berkelok zigzag yang berubah arah lalu menyapu turun.", story: "Kertas yang sobek berkelok-kelok sebelum akhirnya terbelah jatuh.", strokeCue: "Satu goresan; melambat setiap kali berubah arah di bagian atas." },

  // Baris TA — bunyi て cocok langsung dengan kata Indonesia "tangan".
  "た": { emoji: "🎒", title: "Ta dari tas", anchorWord: "tas", soundCue: "Diawali bunyi seperti awal kata 'tas'.", shapeCue: "Tali ransel menyilang di kiri, dua kancing kecil terpisah di kanan.", story: "Tas ransel dengan tali menyilang dan dua kancing kecil di sampingnya.", strokeCue: "Empat goresan; selesaikan silang kiri dulu, baru dua goresan kecil di kanan." },
  "ち": { emoji: "🦎", title: "Chi dari cicak", anchorWord: "cicak", soundCue: "Diawali bunyi mendekati awal kata 'cicak' (chi).", shapeCue: "Garis mendatar di atas seperti langit-langit, badan panjang melengkung turun seperti cicak menempel.", story: "Cicak yang menempel di langit-langit lalu badannya melengkung turun.", strokeCue: "Dua goresan; garis mendatar dulu, lalu satu garis panjang menyapu turun-kanan." },
  "つ": { emoji: "🌊", title: "Tsu dari tsunami", anchorWord: "tsunami", soundCue: "Satukan bunyi t dan su menjadi satu ketukan, seperti awal kata 'tsunami'.", shapeCue: "Satu lengkung lebar dari kiri atas menuju kanan bawah, seperti gelombang ombak.", story: "Ombak besar tsunami yang melengkung sebelum pecah ke pantai.", strokeCue: "Satu goresan; turun melengkung lalu angkat tangan di kanan bawah." },
  "て": { emoji: "✋", title: "Te dari tangan", anchorWord: "tangan", soundCue: "Diawali bunyi seperti awal kata 'tangan' (te).", shapeCue: "Satu sapuan yang mengalir lalu berbelok turun, seperti telapak tangan terbuka.", story: "Tangan terbuka yang direntangkan lalu jarinya menekuk turun.", strokeCue: "Satu goresan; jangan angkat tangan saat berbelok di tengah." },
  "と": { emoji: "🏪", title: "To dari toko", anchorWord: "toko", soundCue: "Diawali bunyi seperti awal kata 'toko'.", shapeCue: "Tanda pendek di kiri seperti papan nama, garis panjang berkait di kanan seperti gantungan.", story: "Papan nama toko kecil di samping gantungan panjang yang berkait.", strokeCue: "Dua goresan; tanda pendek ditulis lebih dulu, baru garis panjang berkait." },

  // Baris NA — segitiga kontras ね/れ/わ dijelaskan lengkap di ね, れ, わ.
  "な": { emoji: "🐉", title: "Na dari naga", anchorWord: "naga", soundCue: "Diawali bunyi seperti awal kata 'naga'.", shapeCue: "Beberapa lekukan yang saling melilit rumit, seperti ekor naga.", story: "Ekor naga yang melilit rumit membentuk beberapa simpul.", strokeCue: "Empat goresan; jaga setiap lekukan tetap terpisah, jangan disatukan." },
  "に": { emoji: "🧵", title: "Ni dari nilon", anchorWord: "nilon", soundCue: "Diawali bunyi seperti awal kata 'nilon'.", shapeCue: "Satu tali tegak lurus di kiri, dua jepitan pendek menempel di kanan.", story: "Seutas tali nilon berdiri tegak dengan dua jepitan kecil tergantung di sampingnya.", strokeCue: "Tiga goresan; tali tegak kiri dulu, baru dua goresan pendek di kanan." },
  // kontras ぬ/め: ぬ punya SATU PUTARAN/GULUNGAN di ujung ekor;
  // め cuma garis silang sederhana TANPA gulungan.
  "ぬ": { emoji: "🍜", title: "Nu dari nudel", anchorWord: "nudel", soundCue: "Diawali bunyi seperti awal kata 'nudel' (mi).", shapeCue: "Seperti め tapi ekornya BERGULUNG membentuk satu putaran penuh — kontras dengan め yang polos tanpa gulungan.", story: "Sumpit mengangkat mi yang ujungnya melingkar tergulung.", strokeCue: "Dua goresan; goresan kedua menyilang lalu ekornya digulung satu putaran penuh." },
  // kontras ね/れ/わ (tiga arah): ね = ekornya berakhir dengan SIMPUL
  // KECIL MELINGKAR; れ = ekornya berakhir dengan lengkung kecil TANPA
  // simpul penuh; わ = tanpa ekor tambahan sama sekali, cuma dua garis
  // sederhana.
  "ね": { emoji: "👵", title: "Ne dari nenek", anchorWord: "nenek", soundCue: "Diawali bunyi seperti awal kata 'nenek'.", shapeCue: "Garis tegak lalu lengkung panjang yang ujungnya membuat SATU SIMPUL KECIL MELINGKAR PENUH — beda dari れ (cuma lengkung kecil) dan わ (tanpa hiasan ujung).", story: "Tongkat nenek yang bengkok dengan seutas tali tersimpul bulat di ujungnya.", strokeCue: "Dua goresan; goresan kedua melengkung panjang lalu ujungnya diputar jadi simpul bulat." },
  "の": { emoji: "0️⃣", title: "No dari nol", anchorWord: "nol", soundCue: "Diawali bunyi seperti awal kata 'nol'.", shapeCue: "Satu lingkaran spiral yang tidak pernah putus, seperti angka nol yang ditulis menyambung.", story: "Angka nol yang ditulis dalam satu putaran spiral tanpa mengangkat tangan.", strokeCue: "Satu goresan; berputar penuh tanpa berhenti dari awal sampai akhir." },

  // Baris HA — kontras は/ほ: は punya SATU garis pendek tambahan di
  // kanan (3 goresan); ほ punya DUA garis tambahan di kanan (4 goresan).
  "は": { emoji: "🐯", title: "Ha dari harimau", anchorWord: "harimau", soundCue: "Diawali bunyi seperti awal kata 'harimau'.", shapeCue: "Tiang tegak berkait di kiri, SATU garis loreng pendek di kanan — kontras dengan ほ yang punya dua garis.", story: "Harimau berdiri tegak dengan satu garis loreng pendek di sampingnya.", strokeCue: "Tiga goresan; tiang kiri berkait dulu, baru silang dan satu garis turun di kanan." },
  "ひ": { emoji: "🙂", title: "Hi dari hilang", anchorWord: "hilang", soundCue: "Diawali bunyi seperti awal kata 'hilang'.", shapeCue: "Satu lengkung tipis dan sederhana, seperti senyum yang nyaris hilang.", story: "Senyum tipis yang perlahan hilang, tinggal satu lengkungan kecil.", strokeCue: "Satu goresan; melengkung pelan dari kiri ke kanan tanpa sudut tajam." },
  "ふ": { emoji: "📸", title: "Fu dari foto", anchorWord: "foto", soundCue: "Diawali bunyi antara f dan h, mendekati awal kata 'foto' — bunyi ini memang tidak identik dengan bahasa Indonesia (lihat layar pembuka).", shapeCue: "Beberapa lekukan kecil berjajar, seperti tombol-tombol kamera.", story: "Kamera foto tua dengan beberapa tombol dan lekukan kecil di badannya.", strokeCue: "Empat goresan pendek yang berjajar dari atas ke bawah." },
  "へ": { emoji: "⛑️", title: "He dari helm", anchorWord: "helm", soundCue: "Diawali bunyi seperti awal kata 'helm'.", shapeCue: "Satu lengkung kecil seperti puncak helm dilihat dari samping.", story: "Helm sepeda dilihat dari samping, membentuk satu lengkung kecil sederhana.", strokeCue: "Satu goresan; naik sedikit lalu turun dalam satu sapuan pendek." },
  "ほ": { emoji: "🏨", title: "Ho dari hotel", anchorWord: "hotel", soundCue: "Diawali bunyi seperti awal kata 'hotel'.", shapeCue: "Mirip は tapi dengan DUA garis tambahan di kanan, seperti dua bendera di tiang hotel.", story: "Tiang bendera hotel dengan dua bendera kecil berkibar, lebih ramai daripada は.", strokeCue: "Empat goresan; tiang kiri dulu, baru silang dan dua garis turun terpisah di kanan." },

  // Baris MA
  "ま": { emoji: "🥣", title: "Ma dari mangkuk", anchorWord: "mangkuk", soundCue: "Diawali bunyi seperti awal kata 'mangkuk'.", shapeCue: "Sendok menyilang di atas mangkuk, dengan ekor melengkung di bawah.", story: "Sendok yang menyilang di atas mangkuk sebelum ekornya melengkung turun.", strokeCue: "Tiga goresan; silang atas dulu, baru lengkung besar di bawah." },
  "み": { emoji: "💭", title: "Mi dari mimpi", anchorWord: "mimpi", soundCue: "Diawali bunyi seperti awal kata 'mimpi'.", shapeCue: "Dua garis berkelok naik-turun, seperti alur pikiran dalam mimpi.", story: "Alur pikiran dalam mimpi yang berkelok naik lalu turun dua kali.", strokeCue: "Dua goresan; garis tegak dulu, baru satu lengkung berkelok di kanan." },
  "む": { emoji: "🐄", title: "Mu dari sapi 'muu'", anchorWord: "muu", soundCue: "Diawali bunyi seperti suara sapi 'muu' — onomatope yang dikenal semua orang Indonesia.", shapeCue: "Tiga bagian menyilang dengan ekor melengkung, seperti sapi bertanduk dengan ekor terangkat.", story: "Seekor sapi mengangkat ekornya dan berkata 'muu' dengan keras.", strokeCue: "Tiga goresan; silang dulu, baru satu ekor melengkung ke kiri bawah." },
  // kontras ぬ/め (lihat baris NA): め TANPA gulungan.
  "め": { emoji: "👁️", title: "Me dari mata", anchorWord: "mata", soundCue: "Diawali bunyi seperti awal kata 'mata'.", shapeCue: "Garis silang sederhana TANPA gulungan tambahan di ujung — kontras dengan ぬ yang ekornya bergulung.", story: "Mata yang terbuka polos, tanpa hiasan tambahan seperti mi yang tergulung di ぬ.", strokeCue: "Dua goresan; menyilang sederhana, lalu selesai tanpa memutar ekornya." },
  "も": { emoji: "🐒", title: "Mo dari monyet", anchorWord: "monyet", soundCue: "Diawali bunyi seperti awal kata 'monyet'.", shapeCue: "Tiga bagian menyilang dengan ekor melengkung panjang, seperti monyet bergelantungan.", story: "Monyet yang bergelantungan dengan ekornya melengkung panjang ke bawah.", strokeCue: "Tiga goresan; silang atas dulu, baru satu ekor panjang melengkung." },

  // Baris YA
  "や": { emoji: "🙌", title: "Ya dari 'yakin!'", anchorWord: "yakin", soundCue: "Diawali bunyi seperti awal kata 'yakin'.", shapeCue: "Tiga garis tegas seperti tangan yang terangkat penuh keyakinan.", story: "Seseorang mengangkat tangan sambil berteriak 'ya, yakin!' dengan tegas.", strokeCue: "Tiga goresan tegas; garis tegak dulu, baru dua garis menyilang di kanan." },
  "ゆ": { emoji: "🏊", title: "Yu dari 'yuk!'", anchorWord: "yuk", soundCue: "Diawali bunyi seperti awal kata ajakan 'yuk'.", shapeCue: "Satu garis tegak dengan lengkung yang keluar dari celah di sampingnya, seperti orang berenang keluar kolam.", story: "Ajakan 'yuk berenang!' — tubuhnya melengkung keluar dari celah kolam.", strokeCue: "Dua goresan; garis tegak dulu, baru satu lengkung yang menembus dari kiri." },
  "よ": { emoji: "🪀", title: "Yo dari yoyo", anchorWord: "yoyo", soundCue: "Diawali bunyi seperti kata 'yoyo' — mainan yang sangat dikenal di Indonesia.", shapeCue: "Tali tegak di atas, lingkaran yoyo berputar di bawahnya.", story: "Yoyo yang turun dari talinya lalu berputar di bagian bawah.", strokeCue: "Dua goresan; tali tegak dulu, baru satu putaran di bawah." },

  // Baris RA
  "ら": { emoji: "💇", title: "Ra dari rambut", anchorWord: "rambut", soundCue: "Diawali bunyi seperti awal kata 'rambut'.", shapeCue: "Satu ikal rambut yang melengkung dengan ekor kecil di ujungnya.", story: "Satu ikal rambut keriting yang melengkung dengan ujung kecil menjuntai.", strokeCue: "Dua goresan; garis pendek dulu, baru satu lengkung ikal di kanan." },
  // kontras い/り (lihat baris A): り punya garis PANJANG meliuk turun jauh.
  "り": { emoji: "🎣", title: "Ri dari 'ribut!'", anchorWord: "ribut", soundCue: "Diawali bunyi seperti awal kata 'ribut'.", shapeCue: "Garis pendek di kiri, garis PANJANG yang meliuk jauh turun di kanan — kontras dengan い yang dua garisnya sama pendek.", story: "Ikan yang ribut meronta di ujung tali pancing yang panjang dan meliuk.", strokeCue: "Dua goresan; garis pendek tegak dulu, baru garis panjang turun yang meliuk di ujung bawah." },
  "る": { emoji: "🔁", title: "Ru dari rute", anchorWord: "rute", soundCue: "Diawali bunyi seperti awal kata 'rute'.", shapeCue: "Satu jalan yang berakhir dengan PUTARAN PENUH tertutup — kontras dengan ろ yang berujung siku terbuka.", story: "Rute jalan yang berbelok lalu berputar penuh di sebuah bundaran.", strokeCue: "Satu goresan; turun lalu melengkung memutar penuh sampai bertemu titik awal." },
  // kontras ね/れ/わ (lihat baris NA): れ = lengkung kecil TANPA simpul penuh.
  "れ": { emoji: "🍛", title: "Re dari rendang", anchorWord: "rendang", soundCue: "Diawali bunyi seperti awal kata 'rendang'.", shapeCue: "Garis tegak pendek di kiri, lengkung panjang di kanan dengan asap KECIL membubung di ujung — bukan simpul bulat penuh seperti ね.", story: "Sendok pendek di samping wajan rendang besar dengan asap kecil membubung.", strokeCue: "Dua goresan; garis tegak pendek dulu, baru lengkung panjang dengan sedikit kaitan di ujung." },
  "ろ": { emoji: "🛞", title: "Ro dari roda patah", anchorWord: "roda", soundCue: "Diawali bunyi seperti awal kata 'roda'.", shapeCue: "Satu bentuk siku-siku terbuka, TIDAK berputar penuh — kontras dengan る yang tertutup bulat.", story: "Roda yang patah sehingga bentuknya cuma siku-siku terbuka, tidak bulat lagi.", strokeCue: "Satu goresan; turun, berbelok siku, lalu berhenti tanpa memutar penuh seperti る." },

  // Baris WA
  // kontras ね/れ/わ (lengkap, lihat baris NA): わ TANPA hiasan ujung sama sekali.
  "わ": { emoji: "🍳", title: "Wa dari wajan", anchorWord: "wajan", soundCue: "Diawali bunyi seperti awal kata 'wajan'.", shapeCue: "Garis tegak pendek dan lengkung besar polos TANPA hiasan di ujung — beda dari ね (simpul bulat) dan れ (lengkung kecil).", story: "Wajan besar dengan gagang pendek, polos tanpa hiasan tambahan.", strokeCue: "Dua goresan; garis tegak pendek dulu, baru satu lengkung besar tanpa kaitan di ujung." },
  "を": { emoji: "🔦", title: "O dari obor (partikel を)", anchorWord: "obor", soundCue: "Dibaca 'o', bukan 'wo' — mirip お tapi hanya dipakai sebagai partikel tata bahasa, tidak pernah mengawali kata.", shapeCue: "Mirip お dengan tambahan satu lengkung dudukan di kiri bawah.", story: "Obor menyala dengan tambahan dudukan melengkung di bagian bawahnya.", strokeCue: "Tiga goresan; seperti お, ditambah satu lengkung dudukan di kiri." },
  "ん": { emoji: "👃", title: "N dari dengung hidung", anchorWord: "dengung", soundCue: "Bunyi sengau yang keluar dari hidung, seperti mendengung dengan mulut tertutup.", shapeCue: "Satu lengkung kecil dan sederhana, seperti garis hidung dari samping.", story: "Mendengung dengan hidung tertutup, membentuk satu lengkungan kecil.", strokeCue: "Satu goresan; melengkung pendek dari atas ke bawah." },
};

export const HIRAGANA_MNEMONICS: Record<string, HiraganaMnemonic> = {
  "あ": { emoji: "🐣", title: "Anak ayam berkata aaa", story: "Anak ayam membuka paruhnya lebar-lebar dan bersuara 'aaa'. Lengkung tubuh serta paruhnya berubah menjadi あ." },
  "い": { emoji: "👫", title: "Dua orang berdiri berdampingan", story: "Dua orang kurus berdiri sejajar sambil berkata 'ii'. Dua sosok itu membentuk dua coretan い." },
  "う": { emoji: "👄", title: "Mulut berbentuk U", story: "Mulut kecil mengucapkan 'u'. Bibir dan gerak suaranya berubah menjadi う." },
  "え": { emoji: "🧗", title: "Pendaki mencapai puncak", story: "Seorang pendaki berseru 'eh!' saat tali dan jalurnya membentuk え." },
  "お": { emoji: "🏌️", title: "Orang mengayun tongkat", story: "Orang mengayun tongkat sambil berseru 'o!'. Tubuh, tongkat, dan bola kecilnya membentuk お." },
  "か": { emoji: "🎣", title: "Kail menangkap ikan", story: "Sebuah kail besar menarik ikan. Kail dan tali yang menegang membentuk か untuk bunyi 'ka'." },
  "き": { emoji: "🔑", title: "Kunci dengan tiga gigi", story: "Sebuah kunci memiliki tiga gigi dan gagang melengkung. Kunci itu menjadi き, dibaca 'ki'." },
  "く": { emoji: "🐦", title: "Paruh burung terbuka", story: "Paruh burung terbuka seperti sudut tajam sambil berbunyi 'ku'. Siluet paruhnya adalah く." },
  "け": { emoji: "⚔️", title: "Kesatria membawa pedang", story: "Kesatria berdiri dengan pedang dan perisai. Garis perlengkapannya berubah menjadi け, bunyinya 'ke'." },
  "こ": { emoji: "🐟", title: "Dua ikan koi", story: "Dua ikan koi berenang sejajar. Dua jalur renangnya membentuk こ untuk bunyi 'ko'." },
  "さ": { emoji: "🏇", title: "Sadel di punggung kuda", story: "Sadel dan tali pada punggung kuda melengkung menjadi さ. Ingat 'sa' dari sadel." },
  "し": { emoji: "🎣", title: "Kail yang sangat panjang", story: "Kail panjang turun lalu melengkung seperti し. Seorang pemancing berbisik 'shi' agar ikan tidak lari." },
  "す": { emoji: "🍣", title: "Tusuk sushi berputar", story: "Tusuk menembus sushi lalu berputar membentuk simpul. Gerakannya menjadi す, awal dari 'sushi'." },
  "せ": { emoji: "🪡", title: "Jarum menjahit setelan", story: "Jarum dan benang menjahit sebuah setelan. Benang yang menyilang membentuk せ untuk bunyi 'se'." },
  "そ": { emoji: "🧵", title: "Benang yang tersangkut", story: "Seutas benang turun berkelok setelah tersangkut. Jalurnya membentuk そ untuk bunyi 'so'." },
  "た": { emoji: "🪑", title: "Tata meja dan kursi", story: "Meja, kursi, dan kaki-kakinya ditata hingga membentuk た. Ingat 'ta' dari tata." },
  "ち": { emoji: "💃", title: "Pemandu sorak berputar", story: "Pemandu sorak mengangkat tangan lalu memutar pita. Gerak tubuhnya berubah menjadi ち, dibaca 'chi'." },
  "つ": { emoji: "🌊", title: "Gelombang tsunami", story: "Satu gelombang besar tsunami melengkung ke pantai. Lengkung itu membentuk つ, dibaca 'tsu'." },
  "て": { emoji: "✋", title: "Tangan yang terbuka", story: "Sebuah tangan atau 'te' dalam bahasa Jepang direntangkan. Garis telapak dan jarinya membentuk て." },
  "と": { emoji: "🦶", title: "Jari kaki menyentuh tongkat", story: "Jari kaki atau toe menyentuh tongkat kecil. Keduanya berubah menjadi と untuk bunyi 'to'." },
  "な": { emoji: "🪢", title: "Tali membuat simpul", story: "Tali berputar menjadi simpul yang rumit. Ujung dan simpulnya membentuk な, dibaca 'na'." },
  "に": { emoji: "🦵", title: "Dua lutut sejajar", story: "Dua lutut atau knee terlihat sebagai dua garis di samping kaki. Bentuknya menjadi に, dibaca 'ni'." },
  "ぬ": { emoji: "🍜", title: "Mi melingkar di mangkuk", story: "Mi atau noodle berputar dan menyisakan ekor panjang. Putarannya membentuk ぬ, dibaca 'nu'." },
  "ね": { emoji: "🥅", title: "Jaring dengan simpul", story: "Sebuah net memiliki tiang, lilitan, dan simpul di ujung. Siluetnya membentuk ね, dibaca 'ne'." },
  "の": { emoji: "🚫", title: "Tanda larangan bulat", story: "Satu garis menggambar tanda 'no' yang bulat tanpa berhenti. Lingkarannya adalah の." },
  "は": { emoji: "😂", title: "Wajah tertawa ha-ha", story: "Wajah dengan dua mata tertawa 'ha-ha'. Garis wajah dan air matanya berubah menjadi は." },
  "ひ": { emoji: "😊", title: "Senyum lebar di wajah", story: "Sebuah wajah menarik senyum panjang sambil berkata 'hii'. Lengkung senyumnya membentuk ひ." },
  "ふ": { emoji: "🗻", title: "Gunung Fuji tertiup angin", story: "Angin berembus di atas Gunung Fuji dan memecah salju menjadi titik-titik. Bentuknya menjadi ふ, dibaca 'fu'." },
  "へ": { emoji: "⛰️", title: "Bukit menuju puncak", story: "Jalur naik lalu turun melewati puncak bukit. Jalur sederhana itu membentuk へ, dibaca 'he'." },
  "ほ": { emoji: "⛵", title: "Tiang dan dua layar", story: "Tiang kapal berdiri di samping dua layar. Semuanya membentuk ほ untuk bunyi 'ho'." },
  "ま": { emoji: "🗺️", title: "Peta dengan penanda", story: "Sebuah map memiliki dua jalan dan penanda melingkar. Garisnya berubah menjadi ま, dibaca 'ma'." },
  "み": { emoji: "🎼", title: "Not musik berkelok", story: "Nada musik melompat dan berkelok di paranada. Alurnya membentuk み, dibaca 'mi'." },
  "む": { emoji: "🐄", title: "Sapi berkata muu", story: "Seekor sapi mengangkat ekor dan berkata 'muu'. Tubuh serta ekornya berubah menjadi む." },
  "め": { emoji: "👁️", title: "Mata dengan garis silang", story: "Sebuah mata atau 'me' dalam bahasa Jepang dilintasi pantulan cahaya. Bentuknya menjadi め." },
  "も": { emoji: "🎣", title: "Kail membawa dua ikan", story: "Kail membawa dua ikan kecil dan meminta 'more'. Tali serta dua ikannya membentuk も." },
  "や": { emoji: "⛵", title: "Yacht dengan layar", story: "Sebuah yacht memiliki tiang dan layar terbuka. Siluetnya membentuk や, dibaca 'ya'." },
  "ゆ": { emoji: "🐟", title: "Ikan berenang di akuarium", story: "Seekor ikan berputar di dalam akuarium lalu keluar melalui celah. Jejaknya membentuk ゆ, dibaca 'yu'." },
  "よ": { emoji: "🪀", title: "Yo-yo pada seutas tali", story: "Sebuah yo-yo turun dari tali dan berputar. Tali serta putarannya membentuk よ, dibaca 'yo'." },
  "ら": { emoji: "🐇", title: "Kelinci berlari", story: "Kelinci atau rabbit mengangkat telinga lalu melompat. Jejak lompatannya membentuk ら, dibaca 'ra'." },
  "り": { emoji: "🌿", title: "Dua batang ilalang", story: "Dua batang ilalang berdiri di tepi sungai. Keduanya membentuk り, dibaca 'ri'." },
  "る": { emoji: "🛣️", title: "Rute berakhir di bundaran", story: "Sebuah route turun lalu berputar di bundaran kecil. Jalannya membentuk る, dibaca 'ru'." },
  "れ": { emoji: "🦌", title: "Rusa menarik tali", story: "Seekor reindeer menarik tali panjang yang berkelok. Tali dan tubuhnya membentuk れ, dibaca 're'." },
  "ろ": { emoji: "🛤️", title: "Jalan mengitari blok", story: "Sebuah road berbelok mengitari satu blok. Jalurnya membentuk ろ, dibaca 'ro'." },
  "わ": { emoji: "🌊", title: "Pusaran air", story: "Air atau water mengalir melewati tiang lalu berputar. Alirannya membentuk わ, dibaca 'wa'." },
  "を": { emoji: "🏅", title: "Pelari melewati rintangan", story: "Pelari Olimpiade melewati dua rintangan dan garis akhir melengkung. Jalurnya membentuk を, dibaca 'o'." },
  "ん": { emoji: "👃", title: "Hidung berkata n", story: "Siluet hidung menurun lalu melengkung saat bersuara 'n'. Garis hidungnya membentuk ん." },
};
