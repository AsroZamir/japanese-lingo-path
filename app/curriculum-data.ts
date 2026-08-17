export type CurriculumLevel = "PRE_N5" | "N5";

export type UnitOperations = {
  vocabulary: string;
  script: string;
  grammar: string;
  reading: string;
  listening: string;
  speaking: string;
  writing: string;
  practice: string;
  assessment: string;
};

export type LessonBlueprint = {
  title: string;
  phase: string;
  duration: string;
  objective: string;
  contentTargets: { label: string; target: string; scope: string }[];
  practiceFlow: { step: string; label: string; detail: string }[];
  skillTasks: { skill: string; task: string }[];
  assets: string[];
  examples: string[];
  masteryGate: string;
};

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
  operations: UnitOperations;
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
    lessonCount: "82 learning sessions",
    stats: ["250–350 kosakata", "40–60 kanji", "15–20 pola", "10 skenario bicara"],
    exitTarget: "Siap membaca kana, membangun kalimat dasar, dan memulai jalur N5.",
  },
  N5: {
    label: "N5",
    name: "Complete Beginner Japanese",
    description: "Bangun kemampuan Jepang sehari-hari yang terhubung: kosakata, kanji, grammar, membaca, menyimak, berbicara, dan menulis.",
    unitCount: "12 unit",
    lessonCount: "81 learning sessions",
    stats: ["800–1.200 kosakata", "100–150 kanji", "35–45 pola", "7 skill terintegrasi"],
    exitTarget: "Mampu menghadapi komunikasi harian sederhana dan memenuhi ambang kesiapan N5.",
  },
};

type UnitBase = Omit<CurriculumUnit, "operations">;

const preN5: UnitBase[] = [
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

const n5: UnitBase[] = [
  {
    id: "N5-01", level: "N5", order: 1, code: "N5.01", title: "Foundation Review", subtitle: "Diagnostik dan jembatan dari Pre-N5", focus: "Adaptive Review", vocabulary: "35–45", kanji: "10", grammar: "4",
    lessons: ["Kana Speed Check", "Core Vocabulary Diagnostic", "Particle Refresh", "です・ます Refresh", "～じゃありません", "Adaptive Review Path"],
    objectives: ["Memeriksa kesiapan kana dan fondasi", "Meninjau partikel, です, ます, dan angka", "Menentukan remediasi atau akselerasi"],
    canDo: ["Mengenali celah belajar", "Menggunakan ～じゃありません", "Masuk ke jalur N5 yang sesuai"],
    skills: ["Diagnostic", "Grammar", "Adaptive learning"], previews: ["学生じゃありません。", "私もインドネシア人です。", "これは先生の本です。"],
    checkpoint: "Hasil diagnostik menentukan jalur percepatan atau penguatan.",
  },
  {
    id: "N5-02", level: "N5", order: 2, code: "N5.02", title: "Personal World", subtitle: "Introductions & personal information", focus: "Speaking", vocabulary: "40–50", kanji: "12", grammar: "6",
    lessons: ["Name & Age", "Nationality & Language", "School & Company", "Particles は・も・の・か", "から・まで", "Meet a Classmate", "60-Second Introduction"],
    objectives: ["Mengembangkan perkenalan lengkap", "Memahami informasi pribadi lawan bicara", "Menggunakan partikel identitas dan rentang"],
    canDo: ["Memberi informasi pribadi", "Bertanya tentang sekolah atau pekerjaan", "Berbicara selama 60 detik"],
    skills: ["Speaking", "Listening", "Writing"], previews: ["ジャカルタから来ました。", "会社は九時から五時までです。", "はじめまして。アスロです。"],
    checkpoint: "Perkenalan 60 detik dan roleplay bertemu teman kelas.",
  },
  {
    id: "N5-03", level: "N5", order: 3, code: "N5.03", title: "Family & People", subtitle: "Keluarga dan orang terdekat", focus: "Description", vocabulary: "35–45", kanji: "12", grammar: "5",
    lessons: ["Family Members", "People & Relationships", "います", "People Counters", "Who Is This?", "Describe My Family"],
    objectives: ["Menyebut anggota keluarga", "Menjelaskan hubungan dan jumlah orang", "Mendeskripsikan keluarga sederhana"],
    canDo: ["Memperkenalkan keluarga", "Menanyakan siapa seseorang", "Mengatakan siapa yang ada"],
    skills: ["Speaking", "Description", "Kanji"], previews: ["父・母・兄・姉・弟・妹", "家族は四人です。", "姉がいます。"],
    checkpoint: "Presentasi singkat keluarga dengan visual atau foto.",
  },
  {
    id: "N5-04", level: "N5", order: 4, code: "N5.04", title: "Daily Routine", subtitle: "Rutinitas dan kebiasaan", focus: "Verb Control", vocabulary: "35–45", kanji: "12", grammar: "6",
    lessons: ["Morning to Night", "School & Work", "Present Polite Verbs", "Past Polite Verbs", "Frequency Adverbs", "My Typical Day", "Yesterday's Routine"],
    objectives: ["Menceritakan rutinitas harian", "Mengendalikan empat bentuk ます", "Menggunakan adverbia frekuensi"],
    canDo: ["Menjelaskan satu hari", "Membandingkan hari ini dan kemarin", "Menyatakan kebiasaan"],
    skills: ["Speaking", "Listening", "Verb grammar"], previews: ["毎朝七時に起きます。", "昨日、勉強しませんでした。", "ときどき映画を見ます。"],
    checkpoint: "Rekam atau tulis narasi rutinitas satu hari.",
  },
  {
    id: "N5-05", level: "N5", order: 5, code: "N5.05", title: "Food & Restaurant", subtitle: "Makanan dan memesan di restoran", focus: "Roleplay", vocabulary: "35–45", kanji: "8", grammar: "5",
    lessons: ["Food & Drinks", "Reading a Menu", "Particle を", "～をください", "Likes & Dislikes", "Natural Restaurant Listening", "Order a Meal"],
    objectives: ["Mengenali makanan dan minuman umum", "Membaca menu sederhana", "Memesan makanan dengan sopan"],
    canDo: ["Memesan menu", "Menyatakan preferensi", "Memahami pertanyaan pelayan"],
    skills: ["Roleplay", "Listening", "Practical reading"], previews: ["ラーメンをください。", "魚が好きです。", "店員：ご注文は？ 客：カレーをお願いします。"],
    checkpoint: "Roleplay restoran lengkap dari membaca menu sampai membayar.",
  },
  {
    id: "N5-06", level: "N5", order: 6, code: "N5.06", title: "Shopping", subtitle: "Harga, barang, dan pilihan", focus: "Practical Japanese", vocabulary: "35–45", kanji: "10", grammar: "5",
    lessons: ["Stores & Money", "Colors & Sizes", "Adjectives for Products", "これ・それ・あれ", "この・その・あの・どの", "Ask the Price", "Shopping Roleplay"],
    objectives: ["Menanyakan harga dan detail barang", "Membandingkan ukuran dan kondisi", "Memilih benda dengan demonstratif"],
    canDo: ["Menanyakan harga", "Meminta barang tertentu", "Menyebut warna dan ukuran"],
    skills: ["Speaking", "Information reading", "Adjectives"], previews: ["これはいくらですか。", "その青いかばんをください。", "高い・安い・新しい・古い"],
    checkpoint: "Selesaikan simulasi membeli satu barang sesuai kebutuhan.",
  },
  {
    id: "N5-07", level: "N5", order: 7, code: "N5.07", title: "Places & Transportation", subtitle: "Arah dan perjalanan", focus: "Reading", vocabulary: "40–50", kanji: "12", grammar: "5",
    lessons: ["Transport Vocabulary", "Station & Airport", "Particles に・へ・で", "Direction Language", "Read Signs & Schedules", "Ask for Directions", "Travel Mini Mission"],
    objectives: ["Memahami tempat dan alat transportasi", "Menggunakan partikel tujuan dan lokasi aksi", "Membaca tanda, jadwal, dan peta"],
    canDo: ["Menanyakan arah", "Mencari peron", "Mengikuti jadwal transportasi"],
    skills: ["Practical reading", "Listening", "Navigation"], previews: ["駅へ行きます。", "電車で東京に行きます。", "右へ曲がってください。"],
    checkpoint: "Misi mencari rute menggunakan peta dan jadwal sederhana.",
  },
  {
    id: "N5-08", level: "N5", order: 8, code: "N5.08", title: "Time, Events & Plans", subtitle: "Rencana dan ajakan", focus: "Planning", vocabulary: "35–45", kanji: "10", grammar: "6",
    lessons: ["Calendar & Events", "～たい", "～つもり", "～予定", "～ましょう", "～ませんか", "My Weekend Plan"],
    objectives: ["Menceritakan rencana mendatang", "Mengajak dan merespons ajakan", "Membedakan keinginan, niat, dan jadwal"],
    canDo: ["Mengajak teman", "Menjelaskan rencana akhir pekan", "Membaca jadwal acara"],
    skills: ["Speaking", "Grammar", "Writing"], previews: ["旅行したいです。", "週末、映画を見ませんか。", "来週、日本へ行く予定です。"],
    checkpoint: "Presentasi rencana akhir pekan dan percakapan ajakan.",
  },
  {
    id: "N5-09", level: "N5", order: 9, code: "N5.09", title: "Hobbies & Preferences", subtitle: "Minat, kemampuan, dan kesukaan", focus: "Conversation", vocabulary: "30–40", kanji: "8", grammar: "5",
    lessons: ["Hobby World", "好き・嫌い", "上手・下手", "できます", "Ask About Interests", "Three Likes, One Dislike"],
    objectives: ["Berbicara tentang minat", "Menyatakan kemampuan", "Menjaga percakapan preferensi sederhana"],
    canDo: ["Menyebut tiga kesukaan", "Menyatakan satu ketidaksukaan", "Menanyakan kemampuan orang lain"],
    skills: ["Conversation", "Listening", "Free response"], previews: ["写真が好きです。", "料理ができます。", "スポーツはあまり好きじゃありません。"],
    checkpoint: "Percakapan bebas singkat tentang kesukaan dan kemampuan.",
  },
  {
    id: "N5-10", level: "N5", order: 10, code: "N5.10", title: "Home & Everyday Life", subtitle: "Rumah dan kehidupan sehari-hari", focus: "Description", vocabulary: "35–45", kanji: "10", grammar: "5",
    lessons: ["Rooms & Furniture", "あります・います", "Position Review", "Describe with Adjectives", "My Room Reading", "Design a Room", "Home Tour"],
    objectives: ["Menyebut ruang dan perabot", "Menjelaskan keberadaan dan posisi", "Mendeskripsikan rumah dengan kata sifat"],
    canDo: ["Mendeskripsikan kamar", "Menanyakan letak benda", "Memahami teks rumah pendek"],
    skills: ["Reading", "Description", "Writing"], previews: ["机の上に本があります。", "部屋は小さいですが、きれいです。", "窓の前にベッドがあります。"],
    checkpoint: "Tulis dan ceritakan deskripsi kamar sendiri.",
  },
  {
    id: "N5-11", level: "N5", order: 11, code: "N5.11", title: "Experiences & Opinions", subtitle: "Pengalaman, alasan, dan pendapat", focus: "Expression", vocabulary: "35–45", kanji: "10", grammar: "4",
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

const unitOperations: Record<string, UnitOperations> = {
  P0: { vocabulary: "20 orientation terms", script: "4 writing systems + 9 sound concepts", grammar: "Sentence-order awareness", reading: "2 script recognition sets", listening: "4 pronunciation labs", speaking: "3 sound mimic checks", writing: "1 personal study-plan task", practice: "4 guided diagnostics", assessment: "Orientation readiness check" },
  P1: { vocabulary: "30 hiragana-only core words", script: "46 hiragana + 25 sound variations", grammar: "No formal patterns", reading: "6 graded kana passages", listening: "15 sound discrimination drills", speaking: "5 pronunciation checks", writing: "15 tracing and typing tasks", practice: "15 lesson checks + mixed review", assessment: "Kana recognition, typing, and reading mastery" },
  P2: { vocabulary: "40 common loanwords", script: "46 katakana + 25 sound variations", grammar: "No formal patterns", reading: "6 loanword and label passages", listening: "15 sound discrimination drills", speaking: "5 pronunciation checks", writing: "15 tracing and typing tasks", practice: "15 lesson checks + mixed review", assessment: "Katakana and loanword mastery" },
  P3: { vocabulary: "35 social expressions", script: "5 starter kanji", grammar: "2 sentence patterns", reading: "2 dialogue strips", listening: "4 social mini-dialogues", speaking: "3 guided interactions", writing: "1 introduction card", practice: "10 recognition and response sets", assessment: "Greeting and introduction roleplay" },
  P4: { vocabulary: "45 number and time items", script: "10 number/time kanji", grammar: "4 information-question patterns", reading: "3 price, calendar, and schedule tasks", listening: "4 information extraction activities", speaking: "2 time and price tasks", writing: "2 date and schedule tasks", practice: "12 mixed information sets", assessment: "Time, date, and price checkpoint" },
  P5: { vocabulary: "40 identity words", script: "10 people/country kanji", grammar: "4 identity patterns", reading: "2 short profile cards", listening: "4 personal-information exchanges", speaking: "3 self-introduction tasks", writing: "2 profile tasks", practice: "12 sentence and interview sets", assessment: "Personal identity mini-presentation" },
  P6: { vocabulary: "40 everyday objects", script: "10 object kanji", grammar: "5 demonstrative/possession patterns", reading: "2 item cards and labels", listening: "3 object-identification activities", speaking: "2 possession tasks", writing: "2 object-description tasks", practice: "12 matching and sentence sets", assessment: "Object hunt and ownership check" },
  P7: { vocabulary: "40 places and position words", script: "10 place kanji", grammar: "5 location patterns", reading: "3 maps, signs, and notices", listening: "4 location exchanges", speaking: "3 direction/location tasks", writing: "2 map-description tasks", practice: "12 map and information sets", assessment: "Mini-map navigation task" },
  P8: { vocabulary: "55 core action verbs", script: "15 action/time kanji", grammar: "6 polite verb patterns", reading: "3 daily-routine texts", listening: "4 action and routine activities", speaking: "3 interview tasks", writing: "2 routine tasks", practice: "15 conjugation and production sets", assessment: "Today/yesterday action interview" },
  P9: { vocabulary: "50 hobby and preference words", script: "10 hobby kanji", grammar: "6 preference/desire patterns", reading: "2 hobby profiles", listening: "4 preference conversations", speaking: "3 conversation tasks", writing: "2 hobby and wish tasks", practice: "14 choice and production sets", assessment: "Hobby and preference conversation" },
  P10: { vocabulary: "Full Pre-N5 recycle", script: "Kana + 40–60 kanji recycle", grammar: "15–20 pattern recycle", reading: "5 practical information texts", listening: "6 survival scenario activities", speaking: "10 integrated simulations", writing: "3 survival writing tasks", practice: "10 scenario missions + remediation", assessment: "7-skill Pre-N5 exit assessment" },
  "N5-01": { vocabulary: "35–45 diagnostic core words", script: "10 review kanji", grammar: "4 foundation patterns", reading: "2 adaptive diagnostic texts", listening: "3 diagnostic activities", speaking: "1 guided response task", writing: "1 foundation writing task", practice: "6 adaptive review sets", assessment: "Remediate-or-accelerate diagnostic" },
  "N5-02": { vocabulary: "40–50 personal-information words", script: "12 identity kanji", grammar: "6 identity and range patterns", reading: "2 profiles and simple forms", listening: "4 personal-information exchanges", speaking: "3 introduction tasks", writing: "2 profile and introduction tasks", practice: "14 recognition-to-production sets", assessment: "60-second introduction roleplay" },
  "N5-03": { vocabulary: "35–45 family and people words", script: "12 family kanji", grammar: "5 people/existence patterns", reading: "2 family profiles", listening: "4 family conversations", speaking: "2 family-description tasks", writing: "1 family paragraph", practice: "12 counter and description sets", assessment: "Family presentation checkpoint" },
  "N5-04": { vocabulary: "35–45 routine and work words", script: "12 routine kanji", grammar: "6 verb and frequency patterns", reading: "2 routine passages", listening: "4 daily-routine activities", speaking: "2 routine narration tasks", writing: "1 connected routine task", practice: "14 verb-control sets", assessment: "Today-versus-yesterday routine" },
  "N5-05": { vocabulary: "35–45 food and restaurant words", script: "8 food/menu kanji", grammar: "5 ordering and preference patterns", reading: "2 menus and order slips", listening: "4 restaurant interactions", speaking: "2 restaurant roleplays", writing: "1 order-note task", practice: "14 menu, listening, and response sets", assessment: "Complete restaurant mission" },
  "N5-06": { vocabulary: "35–45 shopping and product words", script: "10 shopping kanji", grammar: "5 demonstrative/adjective patterns", reading: "2 catalogs and price-tag tasks", listening: "4 shopping interactions", speaking: "2 shopping roleplays", writing: "1 product-request task", practice: "14 price, choice, and response sets", assessment: "Purchase-by-requirement mission" },
  "N5-07": { vocabulary: "40–50 transport and direction words", script: "12 travel kanji", grammar: "5 movement/location patterns", reading: "3 maps, signs, and schedules", listening: "4 station announcements/exchanges", speaking: "3 navigation tasks", writing: "1 short travel-note task", practice: "15 route and information sets", assessment: "Station-to-destination mission" },
  "N5-08": { vocabulary: "35–45 event and planning words", script: "10 calendar kanji", grammar: "6 desire, plan, and invitation patterns", reading: "2 calendars and event posts", listening: "4 invitation exchanges", speaking: "3 plan/invitation tasks", writing: "2 weekend-plan tasks", practice: "14 planning and response sets", assessment: "Weekend plan presentation" },
  "N5-09": { vocabulary: "30–40 hobby and ability words", script: "8 hobby kanji", grammar: "5 preference/ability patterns", reading: "2 hobby profiles", listening: "4 interest conversations", speaking: "3 free-response tasks", writing: "1 preference paragraph", practice: "12 conversation-building sets", assessment: "Three likes and one dislike" },
  "N5-10": { vocabulary: "35–45 home and furniture words", script: "10 home kanji", grammar: "5 existence/location/description patterns", reading: "2 room descriptions and floor plans", listening: "3 home-tour activities", speaking: "2 room-description tasks", writing: "2 room-design tasks", practice: "13 location and description sets", assessment: "Written and spoken home tour" },
  "N5-11": { vocabulary: "35–45 opinion and experience words", script: "10 opinion/experience kanji", grammar: "4 connection and experience patterns", reading: "2 opinion and experience passages", listening: "4 opinion exchanges", speaking: "3 reason/experience tasks", writing: "2 connected paragraphs", practice: "14 connection and free-response sets", assessment: "Opinion and experience response" },
  "N5-12": { vocabulary: "Full N5 recycle", script: "100–150 cumulative kanji", grammar: "35–45 cumulative patterns", reading: "4 practical documents", listening: "6 real-world scenario activities", speaking: "6 integrated missions", writing: "3 connected writing tasks", practice: "12 survival missions + remediation", assessment: "7-section N5 mastery assessment" },
};

export const curriculumUnits: CurriculumUnit[] = [...preN5, ...n5].map((unit) => ({
  ...unit,
  operations: unitOperations[unit.id],
}));

function perLessonTarget(scope: string, lessonCount: number) {
  const numbers = scope.match(/\d+/g)?.map(Number) ?? [];
  if (!numbers.length) return "Integrated as needed";
  const low = Math.max(1, Math.floor(numbers[0] / lessonCount));
  const highBase = numbers.length > 1 ? numbers[1] : numbers[0];
  const high = Math.max(low, Math.ceil(highBase / lessonCount));
  return low === high ? `${low} focus item${low === 1 ? "" : "s"}` : `${low}–${high} focus items`;
}

export function getLessonBlueprint(unit: CurriculumUnit, lessonIndex: number): LessonBlueprint {
  const title = unit.lessons[lessonIndex];
  const isFinal = lessonIndex === unit.lessons.length - 1;
  const progress = (lessonIndex + 1) / unit.lessons.length;
  const phase = isFinal ? "Integration & Checkpoint" : progress <= .34 ? "Input & Recognition" : progress <= .7 ? "Pattern Building" : "Guided Production";
  const objective = isFinal
    ? unit.checkpoint
    : `${unit.objectives[lessonIndex % unit.objectives.length]} melalui fokus “${title}”.`;
  const op = unit.operations;

  return {
    title,
    phase,
    duration: isFinal ? "20–25 min" : "14–18 min",
    objective,
    contentTargets: [
      { label: "Vocabulary", target: perLessonTarget(op.vocabulary, unit.lessons.length), scope: op.vocabulary },
      { label: "Kana / Kanji", target: perLessonTarget(op.script, unit.lessons.length), scope: op.script },
      { label: "Grammar", target: perLessonTarget(op.grammar, unit.lessons.length), scope: op.grammar },
    ],
    practiceFlow: [
      { step: "01", label: "Retrieval warm-up", detail: "Aktifkan materi prasyarat tanpa petunjuk." },
      { step: "02", label: "Meaning & form", detail: `Perkenalkan inti ${title} dengan audio dan contoh.` },
      { step: "03", label: "Guided recognition", detail: "Matching, sorting, atau pilihan berbasis konteks." },
      { step: "04", label: "Context input", detail: "Baca atau dengarkan informasi dengan target yang jelas." },
      { step: "05", label: "Active production", detail: isFinal ? "Selesaikan mini-mission terintegrasi." : "Bangun respons lisan atau tulisan terbimbing." },
      { step: "06", label: "Quick check & review", detail: "Nilai mastery dan jadwalkan item yang belum stabil." },
    ],
    skillTasks: [
      { skill: "Reading", task: `${op.reading} · bagian ${lessonIndex + 1}/${unit.lessons.length}` },
      { skill: "Listening", task: `${op.listening} · audio bertahap dari lambat ke natural` },
      { skill: "Speaking", task: `${op.speaking} · dari guided response ke scenario` },
      { skill: "Writing", task: `${op.writing} · form-to-meaning lalu free response` },
    ],
    assets: ["Vocabulary deck", "Audio model", "Example bank", "Guided practice", "Quick-check bank", "Scoring rubric"],
    examples: unit.previews.map((item, index) => unit.previews[(index + lessonIndex) % unit.previews.length]),
    masteryGate: isFinal ? unit.checkpoint : "Recognition ≥80% · contextual recall ≥70% · kesalahan masuk review queue.",
  };
}

export const lessonTemplate = [
  "Objective", "Warm-up", "Vocabulary", "Grammar", "Example Sentences", "Listening",
  "Guided Practice", "Free Practice", "Mini Conversation", "Quick Assessment", "Review Schedule",
];

export const masteryStages = ["New", "Introduced", "Familiar", "Recalling", "Contextual", "Mastered"];

export const skillTracks = ["Kana", "Vocabulary", "Kanji", "Grammar", "Reading", "Listening", "Speaking", "Writing"];
