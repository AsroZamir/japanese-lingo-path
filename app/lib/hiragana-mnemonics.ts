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

export const HIRAGANA_LAB_VERSION = "hiragana-lab-20-v2";

export const HIRAGANA_TRIAL_CHARACTERS = [
  "\u3042", "\u3044", "\u3046", "\u3048", "\u304a",
  "\u304b", "\u304d", "\u304f", "\u3051", "\u3053",
  "\u3055", "\u3057", "\u3059", "\u305b", "\u305d",
  "\u305f", "\u3061", "\u3064", "\u3066", "\u3068",
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

export const HIRAGANA_LAB_MNEMONICS: Record<string, HiraganaMnemonic> = {
  "あ": { emoji: "🌧️", title: "A dari ame", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "あめ (ame) — hujan", soundCue: "Bunyi pertama あめ adalah a pendek dan terbuka.", shapeCue: "Garis tegak disilang, lalu lengkung besar mengitari tengah.", strokeCue: "Tiga goresan: tegak, silang pendek, lalu lengkung besar." },
  "い": { emoji: "🏠", title: "I dari ie", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "いえ (ie) — rumah", soundCue: "Bunyi pertama いえ adalah i yang jernih.", shapeCue: "Dua goresan terpisah; sisi kiri lebih panjang dan melengkung.", strokeCue: "Dua goresan dari atas ke bawah; jangan disambungkan." },
  "う": { emoji: "🌊", title: "U dari umi", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "うみ (umi) — laut", soundCue: "Bunyi pertama うみ adalah u pendek.", shapeCue: "Tanda kecil di atas dan goresan utama yang membelok ke kanan.", strokeCue: "Dua goresan: tanda pendek, lalu lengkung utama." },
  "え": { emoji: "🚉", title: "E dari eki", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "えき (eki) — stasiun", soundCue: "Bunyi pertama えき adalah e seperti pada 'enak'.", shapeCue: "Tanda pendek di atas; bagian bawah berbelok dan memanjang.", strokeCue: "Dua goresan; goresan kedua berubah arah tanpa terputus." },
  "お": { emoji: "🔊", title: "O dari oto", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "おと (oto) — bunyi", soundCue: "Bunyi pertama おと adalah o pendek.", shapeCue: "Bentuk utama bersilang dan melengkung; tanda kecil terpisah di kanan.", strokeCue: "Tiga goresan; tanda kanan ditulis paling akhir." },
  "か": { emoji: "☂️", title: "Ka dari kasa", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "かさ (kasa) — payung", soundCue: "Bunyi pertama かさ adalah ka.", shapeCue: "Bagian kiri seperti tiang berlengkung; garis pendek terpisah di kanan.", strokeCue: "Tiga goresan; jaga tanda kanan agar tidak menyatu." },
  "き": { emoji: "🌳", title: "Ki berarti pohon", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "き (ki) — pohon", soundCue: "Ucapkan ki sebagai satu ketukan pendek.", shapeCue: "Dua garis mendatar dilintasi goresan tegak; lengkung bawah terpisah.", strokeCue: "Empat goresan; jangan satukan lengkung bawah." },
  "く": { emoji: "👟", title: "Ku dari kutsu", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "くつ (kutsu) — sepatu", soundCue: "Bunyi pertama くつ adalah ku.", shapeCue: "Satu sudut sederhana yang terbuka ke kanan.", strokeCue: "Satu goresan: turun miring, berbelok, lalu turun ke kanan." },
  "け": { emoji: "💇", title: "Ke berarti rambut", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "け (ke) — rambut atau bulu", soundCue: "Ucapkan ke pendek dan jelas.", shapeCue: "Garis tegak berkait di kiri; silang dan garis turun di kanan.", strokeCue: "Tiga goresan; pisahkan tiang kiri dari bagian kanan." },
  "こ": { emoji: "🗣️", title: "Ko dari koe", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "こえ (koe) — suara", soundCue: "Bunyi pertama こえ adalah ko.", shapeCue: "Dua garis mendatar yang sedikit melengkung dan tidak tersambung.", strokeCue: "Dua goresan dari kiri ke kanan dengan jarak seimbang." },
  "さ": { emoji: "🐟", title: "Sa dari sakana", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "さかな (sakana) — ikan", soundCue: "Bunyi pertama さかな adalah sa.", shapeCue: "Garis atas disilang goresan turun; lengkung bawah terpisah.", strokeCue: "Tiga goresan; lengkung terakhir tidak disambungkan." },
  "し": { emoji: "🧂", title: "Shi dari shio", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "しお (shio) — garam", soundCue: "Bunyi し mendekati 'shi', dengan desis lembut.", shapeCue: "Satu garis panjang turun lalu melengkung naik ke kanan.", strokeCue: "Satu goresan dari atas; jangan membalik arah." },
  "す": { emoji: "🍣", title: "Su dari sushi", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "すし (sushi) — sushi", soundCue: "Bunyi pertama すし adalah su pendek.", shapeCue: "Garis mendatar disilang goresan berputar kecil dan berekor.", strokeCue: "Dua goresan; putaran kecil berada di tengah." },
  "せ": { emoji: "🌍", title: "Se dari sekai", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "せかい (sekai) — dunia", soundCue: "Bunyi pertama せかい adalah se.", shapeCue: "Garis mendatar dilintasi dua gerakan vertikal; kanan berkait.", strokeCue: "Tiga goresan: mendatar, sisi kiri, lalu sisi kanan." },
  "そ": { emoji: "☁️", title: "So dari sora", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "そら (sora) — langit", soundCue: "Bunyi pertama そら adalah so.", shapeCue: "Satu garis berkelok yang berubah arah lalu menyapu ke bawah.", strokeCue: "Satu goresan; perlambat pada perubahan arah di atas." },
  "た": { emoji: "🐙", title: "Ta dari tako", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "たこ (tako) — gurita", soundCue: "Bunyi pertama たこ adalah ta.", shapeCue: "Bagian kiri berupa silang; dua goresan kecil berada di kanan.", strokeCue: "Empat goresan; selesaikan silang kiri lebih dahulu." },
  "ち": { emoji: "🗺️", title: "Chi dari chizu", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "ちず (chizu) — peta", soundCue: "Bunyi ち adalah chi pendek.", shapeCue: "Garis mendatar di atas dan bentuk panjang yang turun melengkung.", strokeCue: "Dua goresan; goresan kedua menyapu ke kanan." },
  "つ": { emoji: "🌙", title: "Tsu dari tsuki", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "つき (tsuki) — bulan", soundCue: "Satukan t dan su menjadi satu ketukan: tsu.", shapeCue: "Satu lengkung lebar dari kiri atas menuju kanan.", strokeCue: "Satu goresan; turun melengkung lalu angkat di kanan." },
  "て": { emoji: "✋", title: "Te berarti tangan", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "て (te) — tangan", soundCue: "Ucapkan te pendek.", shapeCue: "Garis atas mengalir lalu berbelok turun dalam satu sapuan.", strokeCue: "Satu goresan; jangan angkat tangan saat berbelok." },
  "と": { emoji: "🐦", title: "To dari tori", story: "Kata nyata menjadi pegangan awal; petunjuk dilepas saat recall.", anchorWord: "とり (tori) — burung", soundCue: "Bunyi pertama とり adalah to.", shapeCue: "Tanda pendek di kiri dan goresan panjang berkait di kanan.", strokeCue: "Dua goresan; tanda pendek ditulis lebih dahulu." },
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
