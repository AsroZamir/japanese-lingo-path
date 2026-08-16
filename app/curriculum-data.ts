export type CurriculumLevel = "PRE_N5" | "N5";

export type CurriculumUnit = {
  id: string;
  level: CurriculumLevel;
  order: number;
  code: string;
  title: string;
  subtitle: string;
  focus: string;
  vocabulary: string;
  kanji: string;
  grammar: string;
  lessons: string[];
  objectives: string[];
  canDo: string[];
  skills: string[];
  previews: string[];
  checkpoint: string;
};

export const levelDetails: Record<CurriculumLevel, {
  label: string;
  name: string;
  description: string;
  unitCount: string;
  lessonCount: string;
  stats: string[];
  exitTarget: string;
}> = {
  PRE_N5: {
    label: "PRE-N5",
    name: "Japanese Starter Foundation",
    description: "Untuk pemula total: kuasai kana, bunyi bahasa Jepang, pola kalimat pertama, dan situasi survival sebelum masuk N5.",
    unitCount: "11 unit",
    lessonCount: "±50 pelajaran",
    stats: ["250–350 kosakata", "40–60 kanji", "15–20 pola", "10 skenario bicara"],
    exitTarget: "Siap membaca kana, membangun kalimat dasar, dan memulai jalur N5.",
  },
  N5: {
    label: "N5",
    name: "Complete Beginner Japanese",
    description: "Bangun kemampuan Jepang sehari-hari yang terhubung: kosakata, kanji, grammar, membaca, menyimak, berbicara, dan menulis.",
    unitCount: "12 unit",
    lessonCount: "±70 pelajaran",
    stats: ["800–1.200 kosakata", "100–150 kanji", "35–45 pola", "7 skill terintegrasi"],
    exitTarget: "Mampu menghadapi komunikasi harian sederhana dan memenuhi ambang kesiapan N5.",
  },
};

const preN5: CurriculumUnit[] = [
  {
    id: "P0", level: "PRE_N5", order: 0, code: "P0", title: "Japanese Orientation", subtitle: "Kenali cara kerja bahasa Jepang", focus: "Awareness", vocabulary: "20", kanji: "—", grammar: "—",
    lessons: ["How Japanese Writing Works", "Japanese Sounds", "Japanese Sentence Basics", "How to Study Japanese"],
    objectives: ["Membedakan hiragana, katakana, kanji, dan romaji", "Mengenali lima vokal dan ritme mora", "Memahami gambaran dasar urutan kalimat Jepang"],
    canDo: ["Mengidentifikasi jenis tulisan", "Membaca bunyi Jepang paling dasar", "Memilih strategi belajar yang tepat"],
    skills: ["Script awareness", "Pronunciation", "Study skills"],
    previews: ["あ · ア · 日 · a", "Long vowel: おばさん / おばあさん", "Small sounds: きゃ · きゅ · きょ"],
    checkpoint: "Kenali sistem tulisan dan bunyi sebelum membuka latihan kana.",
  },
  {
    id: "P1", level: "PRE_N5", order: 1, code: "P1", title: "Hiragana Foundation", subtitle: "46 kana dan variasi bunyinya", focus: "Reading", vocabulary: "30", kanji: "—", grammar: "—",
    lessons: ["あ行", "か行", "さ行", "た行", "な行", "は行", "ま行", "や行", "ら行", "わ行・ん", "Dakuten", "Handakuten", "Small ゃゅょ", "Small っ", "Reading Practice"],
    objectives: ["Mengenali dan mengetik hiragana dasar", "Membaca variasi dakuten dan handakuten", "Membaca kombinasi dan konsonan ganda"],
    canDo: ["Mengenali kana ≥90%", "Mengetik kana ≥85%", "Membaca kata hiragana ≥80%"],
    skills: ["Recognition", "Typing", "Word reading"], previews: ["あさ — pagi", "さかな — ikan", "たべます — makan"],
    checkpoint: "Tes pengenalan, pengetikan, dan pembacaan kata hiragana.",
  },
  {
    id: "P2", level: "PRE_N5", order: 2, code: "P2", title: "Katakana Foundation", subtitle: "Kana untuk kata serapan", focus: "Reading", vocabulary: "40", kanji: "—", grammar: "—",
    lessons: ["ア行", "カ行", "サ行", "タ行", "ナ行", "ハ行", "マ行", "ヤ行", "ラ行", "ワ行・ン", "Dakuten", "Small Vowels", "Long Mark ー", "Loanwords", "Reading Practice"],
    objectives: ["Mengenali katakana dasar dan variasinya", "Memahami tanda vokal panjang ー", "Membaca kata serapan umum"],
    canDo: ["Mengenali katakana", "Mengetik kata serapan", "Membaca label sederhana"],
    skills: ["Recognition", "Typing", "Loanword reading"], previews: ["テレビ — televisi", "ホテル · バス · タクシー", "パン · コーヒー"],
    checkpoint: "Tes katakana dan pembacaan kata serapan sehari-hari.",
  },
  {
    id: "P3", level: "PRE_N5", order: 3, code: "P3", title: "Greetings & Social Basics", subtitle: "Sapaan dan interaksi pertama", focus: "Speaking", vocabulary: "35", kanji: "5", grammar: "2",
    lessons: ["Morning to Night Greetings", "Thanks & Apologies", "Polite Social Phrases", "First Introduction", "Mini Social Roleplay"],
    objectives: ["Menggunakan sapaan sesuai waktu", "Berterima kasih dan meminta maaf", "Mengenal A は B です dan ～ですか"],
    canDo: ["Menyapa", "Memperkenalkan diri", "Mengakhiri interaksi dengan sopan"],
    skills: ["Speaking", "Listening", "Social expressions"], previews: ["おはようございます", "ありがとうございます", "はじめまして。よろしくお願いします。"],
    checkpoint: "Roleplay sapaan dan perkenalan pendek.",
  },
  {
    id: "P4", level: "PRE_N5", order: 4, code: "P4", title: "Numbers, Time & Dates", subtitle: "Angka dan informasi waktu", focus: "Listening", vocabulary: "45", kanji: "10", grammar: "4",
    lessons: ["Numbers 0–100", "Age & Money", "Hours & Minutes", "Days & Weeks", "Months & Dates", "Time Information Practice"],
    objectives: ["Memahami angka, umur, dan harga", "Menyebut jam, hari, bulan, dan tanggal", "Menggunakan 何 dalam pertanyaan informasi"],
    canDo: ["Menanyakan jam", "Menyebut hari dan tanggal", "Memahami harga sederhana"],
    skills: ["Listening", "Information retrieval", "Kanji"], previews: ["今、何時ですか。", "これは千円です。", "月・火・水・木・金・土・日"],
    checkpoint: "Ambil informasi angka, waktu, hari, dan harga dari audio pendek.",
  },
  {
    id: "P5", level: "PRE_N5", order: 5, code: "P5", title: "People & Identity", subtitle: "Siapa saya dan orang di sekitar", focus: "Speaking", vocabulary: "40", kanji: "10", grammar: "4",
    lessons: ["People & Roles", "Countries & Languages", "A は B です", "Negative & Questions", "Particles も and の", "My Identity Card"],
    objectives: ["Menyatakan nama, negara, bahasa, dan pekerjaan", "Membuat bentuk negatif dan pertanyaan", "Menghubungkan identitas dengan も dan の"],
    canDo: ["Memperkenalkan identitas", "Bertanya tentang orang lain", "Menyebut afiliasi sederhana"],
    skills: ["Speaking", "Grammar", "Vocabulary"], previews: ["私は学生です。", "インドネシア人です。", "日本語の先生です。"],
    checkpoint: "Buat dan ucapkan profil diri sederhana.",
  },
  {
    id: "P6", level: "PRE_N5", order: 6, code: "P6", title: "Things & Possession", subtitle: "Benda dan kepemilikan", focus: "Grammar", vocabulary: "40", kanji: "10", grammar: "5",
    lessons: ["Everyday Objects", "これ・それ・あれ", "この・その・あの", "N の N", "Whose Item?", "Object Hunt"],
    objectives: ["Menunjuk benda dekat dan jauh", "Membedakan pronomina dan determiner", "Menyatakan kepemilikan"],
    canDo: ["Menanyakan nama benda", "Menyatakan pemilik", "Mengidentifikasi orang atau benda"],
    skills: ["Grammar", "Reading", "Speaking"], previews: ["これは本です。", "それは私のかばんです。", "あの人は先生です。"],
    checkpoint: "Identifikasi dan jelaskan benda menggunakan demonstratif.",
  },
  {
    id: "P7", level: "PRE_N5", order: 7, code: "P7", title: "Places & Location", subtitle: "Tempat, posisi, dan arah", focus: "Reading", vocabulary: "40", kanji: "10", grammar: "5",
    lessons: ["Places in Town", "ここ・そこ・あそこ・どこ", "あります・います", "Position Words", "Where Is It?", "Mini Map Practice"],
    objectives: ["Menyebut tempat umum", "Menanyakan dan menjawab lokasi", "Membedakan keberadaan benda dan orang"],
    canDo: ["Menanyakan stasiun", "Menjelaskan letak benda", "Menemukan orang pada peta sederhana"],
    skills: ["Reading", "Location language", "Speaking"], previews: ["駅はどこですか。", "友達は学校にいます。", "上・下・前・後ろ・中・外・右・左"],
    checkpoint: "Baca peta mini dan jawab pertanyaan lokasi.",
  },
  {
    id: "P8", level: "PRE_N5", order: 8, code: "P8", title: "Basic Actions", subtitle: "Kata kerja dan kegiatan dasar", focus: "Speaking", vocabulary: "55", kanji: "15", grammar: "6",
    lessons: ["Movement Verbs", "Daily Action Verbs", "ます・ません", "ました・ませんでした", "Build an Action Sentence", "Daily Action Interview"],
    objectives: ["Mengenali kata kerja kegiatan inti", "Mengubah bentuk sopan sekarang dan lampau", "Membuat kalimat aksi sederhana"],
    canDo: ["Menceritakan kegiatan", "Mengatakan yang tidak dilakukan", "Menanyakan aksi sehari-hari"],
    skills: ["Speaking", "Verb morphology", "Listening"], previews: ["行く・来る・帰る", "食べる・飲む・見る・聞く", "勉強します。休みませんでした。"],
    checkpoint: "Wawancara mini tentang kegiatan hari ini dan kemarin.",
  },
  {
    id: "P9", level: "PRE_N5", order: 9, code: "P9", title: "Likes, Hobbies & Wants", subtitle: "Kesukaan dan keinginan", focus: "Conversation", vocabulary: "50", kanji: "10", grammar: "6",
    lessons: ["Hobby Vocabulary", "好き・嫌い", "上手・下手", "ほしい", "～たい", "My Hobby Conversation"],
    objectives: ["Membicarakan hobi dan preferensi", "Menyatakan kemampuan sederhana", "Menyatakan benda dan kegiatan yang diinginkan"],
    canDo: ["Menyebut hobi", "Bertanya tentang kesukaan", "Mengatakan yang ingin dilakukan"],
    skills: ["Conversation", "Grammar", "Writing"], previews: ["音楽が好きです。", "料理が上手です。", "日本へ行きたいです。"],
    checkpoint: "Percakapan singkat tentang hobi, kesukaan, dan keinginan.",
  },
  {
    id: "P10", level: "PRE_N5", order: 10, code: "P10", title: "Survival Simulation", subtitle: "Integrasi kemampuan Pre-N5", focus: "Integration", vocabulary: "Review", kanji: "Review", grammar: "Review",
    lessons: ["Greeting & Introduction", "Price & Ordering Food", "Location & Time", "Hobby & Family", "Daily Routine", "Simple Help Request", "Pre-N5 Exit Assessment"],
    objectives: ["Menggabungkan seluruh materi Pre-N5", "Menjalankan sepuluh skenario survival", "Menemukan area yang perlu diperbaiki sebelum N5"],
    canDo: ["Berinteraksi dalam situasi dasar", "Memahami informasi pendek", "Menulis respons sederhana"],
    skills: ["7-skill integration", "Roleplay", "Assessment"], previews: ["すみません、駅はどこですか。", "これをお願いします。", "毎朝七時に起きます。"],
    checkpoint: "Kana 90%; vocab/grammar 75%; reading/listening 70%; speaking/writing 65%.",
  },
];

const n5: CurriculumUnit[] = [
  {
    id: "N5-01", level: "N5", order: 1, code: "N5.01", title: "Foundation Review", subtitle: "Diagnostik dan jembatan dari Pre-N5", focus: "Adaptive Review", vocabulary: "Review", kanji: "Review", grammar: "3+",
    lessons: ["Kana Speed Check", "Core Vocabulary Diagnostic", "Particle Refresh", "です・ます Refresh", "～じゃありません", "Adaptive Review Path"],
    objectives: ["Memeriksa kesiapan kana dan fondasi", "Meninjau partikel, です, ます, dan angka", "Menentukan remediasi atau akselerasi"],
    canDo: ["Mengenali celah belajar", "Menggunakan ～じゃありません", "Masuk ke jalur N5 yang sesuai"],
    skills: ["Diagnostic", "Grammar", "Adaptive learning"], previews: ["学生じゃありません。", "私もインドネシア人です。", "これは先生の本です。"],
    checkpoint: "Hasil diagnostik menentukan jalur percepatan atau penguatan.",
  },
  {
    id: "N5-02", level: "N5", order: 2, code: "N5.02", title: "Personal World", subtitle: "Introductions & personal information", focus: "Speaking", vocabulary: "80+", kanji: "10+", grammar: "6",
    lessons: ["Name & Age", "Nationality & Language", "School & Company", "Particles は・も・の・か", "から・まで", "Meet a Classmate", "60-Second Introduction"],
    objectives: ["Mengembangkan perkenalan lengkap", "Memahami informasi pribadi lawan bicara", "Menggunakan partikel identitas dan rentang"],
    canDo: ["Memberi informasi pribadi", "Bertanya tentang sekolah atau pekerjaan", "Berbicara selama 60 detik"],
    skills: ["Speaking", "Listening", "Writing"], previews: ["ジャカルタから来ました。", "会社は九時から五時までです。", "はじめまして。アスロです。"],
    checkpoint: "Perkenalan 60 detik dan roleplay bertemu teman kelas.",
  },
  {
    id: "N5-03", level: "N5", order: 3, code: "N5.03", title: "Family & People", subtitle: "Keluarga dan orang terdekat", focus: "Description", vocabulary: "70+", kanji: "12+", grammar: "4",
    lessons: ["Family Members", "People & Relationships", "います", "People Counters", "Who Is This?", "Describe My Family"],
    objectives: ["Menyebut anggota keluarga", "Menjelaskan hubungan dan jumlah orang", "Mendeskripsikan keluarga sederhana"],
    canDo: ["Memperkenalkan keluarga", "Menanyakan siapa seseorang", "Mengatakan siapa yang ada"],
    skills: ["Speaking", "Description", "Kanji"], previews: ["父・母・兄・姉・弟・妹", "家族は四人です。", "姉がいます。"],
    checkpoint: "Presentasi singkat keluarga dengan visual atau foto.",
  },
  {
    id: "N5-04", level: "N5", order: 4, code: "N5.04", title: "Daily Routine", subtitle: "Rutinitas dan kebiasaan", focus: "Verb Control", vocabulary: "90+", kanji: "14+", grammar: "6",
    lessons: ["Morning to Night", "School & Work", "Present Polite Verbs", "Past Polite Verbs", "Frequency Adverbs", "My Typical Day", "Yesterday's Routine"],
    objectives: ["Menceritakan rutinitas harian", "Mengendalikan empat bentuk ます", "Menggunakan adverbia frekuensi"],
    canDo: ["Menjelaskan satu hari", "Membandingkan hari ini dan kemarin", "Menyatakan kebiasaan"],
    skills: ["Speaking", "Listening", "Verb grammar"], previews: ["毎朝七時に起きます。", "昨日、勉強しませんでした。", "ときどき映画を見ます。"],
    checkpoint: "Rekam atau tulis narasi rutinitas satu hari.",
  },
  {
    id: "N5-05", level: "N5", order: 5, code: "N5.05", title: "Food & Restaurant", subtitle: "Makanan dan memesan di restoran", focus: "Roleplay", vocabulary: "90+", kanji: "12+", grammar: "5",
    lessons: ["Food & Drinks", "Reading a Menu", "Particle を", "～をください", "Likes & Dislikes", "Natural Restaurant Listening", "Order a Meal"],
    objectives: ["Mengenali makanan dan minuman umum", "Membaca menu sederhana", "Memesan makanan dengan sopan"],
    canDo: ["Memesan menu", "Menyatakan preferensi", "Memahami pertanyaan pelayan"],
    skills: ["Roleplay", "Listening", "Practical reading"], previews: ["ラーメンをください。", "魚が好きです。", "店員：ご注文は？ 客：カレーをお願いします。"],
    checkpoint: "Roleplay restoran lengkap dari membaca menu sampai membayar.",
  },
  {
    id: "N5-06", level: "N5", order: 6, code: "N5.06", title: "Shopping", subtitle: "Harga, barang, dan pilihan", focus: "Practical Japanese", vocabulary: "85+", kanji: "12+", grammar: "5",
    lessons: ["Stores & Money", "Colors & Sizes", "Adjectives for Products", "これ・それ・あれ", "この・その・あの・どの", "Ask the Price", "Shopping Roleplay"],
    objectives: ["Menanyakan harga dan detail barang", "Membandingkan ukuran dan kondisi", "Memilih benda dengan demonstratif"],
    canDo: ["Menanyakan harga", "Meminta barang tertentu", "Menyebut warna dan ukuran"],
    skills: ["Speaking", "Information reading", "Adjectives"], previews: ["これはいくらですか。", "その青いかばんをください。", "高い・安い・新しい・古い"],
    checkpoint: "Selesaikan simulasi membeli satu barang sesuai kebutuhan.",
  },
  {
    id: "N5-07", level: "N5", order: 7, code: "N5.07", title: "Places & Transportation", subtitle: "Arah dan perjalanan", focus: "Reading", vocabulary: "90+", kanji: "15+", grammar: "5",
    lessons: ["Transport Vocabulary", "Station & Airport", "Particles に・へ・で", "Direction Language", "Read Signs & Schedules", "Ask for Directions", "Travel Mini Mission"],
    objectives: ["Memahami tempat dan alat transportasi", "Menggunakan partikel tujuan dan lokasi aksi", "Membaca tanda, jadwal, dan peta"],
    canDo: ["Menanyakan arah", "Mencari peron", "Mengikuti jadwal transportasi"],
    skills: ["Practical reading", "Listening", "Navigation"], previews: ["駅へ行きます。", "電車で東京に行きます。", "右へ曲がってください。"],
    checkpoint: "Misi mencari rute menggunakan peta dan jadwal sederhana.",
  },
  {
    id: "N5-08", level: "N5", order: 8, code: "N5.08", title: "Time, Events & Plans", subtitle: "Rencana dan ajakan", focus: "Planning", vocabulary: "80+", kanji: "12+", grammar: "5",
    lessons: ["Calendar & Events", "～たい", "～つもり", "～予定", "～ましょう", "～ませんか", "My Weekend Plan"],
    objectives: ["Menceritakan rencana mendatang", "Mengajak dan merespons ajakan", "Membedakan keinginan, niat, dan jadwal"],
    canDo: ["Mengajak teman", "Menjelaskan rencana akhir pekan", "Membaca jadwal acara"],
    skills: ["Speaking", "Grammar", "Writing"], previews: ["旅行したいです。", "週末、映画を見ませんか。", "来週、日本へ行く予定です。"],
    checkpoint: "Presentasi rencana akhir pekan dan percakapan ajakan.",
  },
  {
    id: "N5-09", level: "N5", order: 9, code: "N5.09", title: "Hobbies & Preferences", subtitle: "Minat, kemampuan, dan kesukaan", focus: "Conversation", vocabulary: "75+", kanji: "10+", grammar: "5",
    lessons: ["Hobby World", "好き・嫌い", "上手・下手", "できます", "Ask About Interests", "Three Likes, One Dislike"],
    objectives: ["Berbicara tentang minat", "Menyatakan kemampuan", "Menjaga percakapan preferensi sederhana"],
    canDo: ["Menyebut tiga kesukaan", "Menyatakan satu ketidaksukaan", "Menanyakan kemampuan orang lain"],
    skills: ["Conversation", "Listening", "Free response"], previews: ["写真が好きです。", "料理ができます。", "スポーツはあまり好きじゃありません。"],
    checkpoint: "Percakapan bebas singkat tentang kesukaan dan kemampuan.",
  },
  {
    id: "N5-10", level: "N5", order: 10, code: "N5.10", title: "Home & Everyday Life", subtitle: "Rumah dan kehidupan sehari-hari", focus: "Description", vocabulary: "85+", kanji: "12+", grammar: "5",
    lessons: ["Rooms & Furniture", "あります・います", "Position Review", "Describe with Adjectives", "My Room Reading", "Design a Room", "Home Tour"],
    objectives: ["Menyebut ruang dan perabot", "Menjelaskan keberadaan dan posisi", "Mendeskripsikan rumah dengan kata sifat"],
    canDo: ["Mendeskripsikan kamar", "Menanyakan letak benda", "Memahami teks rumah pendek"],
    skills: ["Reading", "Description", "Writing"], previews: ["机の上に本があります。", "部屋は小さいですが、きれいです。", "窓の前にベッドがあります。"],
    checkpoint: "Tulis dan ceritakan deskripsi kamar sendiri.",
  },
  {
    id: "N5-11", level: "N5", order: 11, code: "N5.11", title: "Experiences & Opinions", subtitle: "Pengalaman, alasan, dan pendapat", focus: "Expression", vocabulary: "80+", kanji: "12+", grammar: "4",
    lessons: ["Opinion Adjectives", "～と思います", "Reason with ～から", "Contrast with ～が", "～たことがあります", "My Experience", "Share an Opinion"],
    objectives: ["Memberi pendapat sederhana", "Memberi alasan dan kontras", "Menceritakan pengalaman lampau"],
    canDo: ["Mengatakan apa yang dipikirkan", "Menjelaskan alasan", "Menyebut pengalaman yang pernah dilakukan"],
    skills: ["Speaking", "Connected writing", "Grammar"], previews: ["日本語は面白いと思います。", "難しいですが、楽しいです。", "京都へ行ったことがあります。"],
    checkpoint: "Respons pendapat dan pengalaman dalam paragraf pendek.",
  },
  {
    id: "N5-12", level: "N5", order: 12, code: "N5.12", title: "Integration & Mastery", subtitle: "Survival Japanese dan asesmen akhir", focus: "7-Skill Mastery", vocabulary: "Review", kanji: "Review", grammar: "Review",
    lessons: ["Personal & Family Mission", "Restaurant & Shopping Mission", "Directions & Train Mission", "Routine & Hobby Mission", "Plans & Problems", "Visiting Japan Simulation", "N5 Mastery Assessment"],
    objectives: ["Mengintegrasikan tujuh keterampilan", "Menangani skenario sehari-hari berantai", "Mengukur kesiapan akhir N5"],
    canDo: ["Menavigasi perjalanan sederhana", "Berinteraksi di toko dan restoran", "Menjelaskan diri, rencana, dan pengalaman"],
    skills: ["Vocabulary", "Kanji", "Grammar", "Reading", "Listening", "Speaking", "Writing"], previews: ["切符を一枚ください。", "三番ホームはどこですか。", "今日は浅草へ行く予定です。"],
    checkpoint: "Overall 72%; setiap core skill mencapai ambang blueprint.",
  },
];

export const curriculumUnits = [...preN5, ...n5];

export const lessonTemplate = [
  "Objective", "Warm-up", "Vocabulary", "Grammar", "Example Sentences", "Listening",
  "Guided Practice", "Free Practice", "Mini Conversation", "Quick Assessment", "Review Schedule",
];

export const masteryStages = ["New", "Introduced", "Familiar", "Recalling", "Contextual", "Mastered"];

export const skillTracks = ["Kana", "Vocabulary", "Kanji", "Grammar", "Reading", "Listening", "Speaking", "Writing"];
