// PROMPT-10 Bagian 6 (PRE-N5.04) — situation -> the correct expression's
// `reading` (matches vocab_items.reading exactly, a stable queryable
// field, unlike the seed script's local authoring keys). Used both for
// the ungraded "tebak maksud" warm-up before an item is taught and the
// graded "pilih respons"/"hasilkan respons" practice after. V2.1's core
// ask for this module: grade situational APPROPRIATENESS, not just
// vocabulary recall — a learner who knows both ohayou and ohayou
// gozaimasu but picks the wrong one for who they're talking to is
// exactly the failure this module exists to catch.
export type SapaanScenario = { situation: string; correctReading: string; category: string };

export const SAPAAN_SCENARIOS: SapaanScenario[] = [
  { category: "greeting", situation: "Anda bertemu atasan Anda jam 8 pagi di kantor.", correctReading: "ohayou gozaimasu" },
  { category: "greeting", situation: "Anda bertemu teman dekat jam 8 pagi di jalan.", correctReading: "ohayou" },
  { category: "greeting", situation: "Anda bertemu tetangga jam 2 siang.", correctReading: "konnichiwa" },
  { category: "greeting", situation: "Anda bertemu teman jam 8 malam.", correctReading: "konbanwa" },
  { category: "greeting", situation: "Keluarga Anda akan tidur; Anda ingin mengucapkan selamat malam.", correctReading: "oyasumi nasai" },

  { category: "home", situation: "Anda akan berangkat kerja, keluarga masih di rumah.", correctReading: "ittekimasu" },
  { category: "home", situation: "Anggota keluarga Anda akan berangkat kerja.", correctReading: "itterasshai" },
  { category: "home", situation: "Anda baru saja tiba kembali di rumah.", correctReading: "tadaima" },
  { category: "home", situation: "Anggota keluarga Anda baru pulang ke rumah.", correctReading: "okaeri nasai" },

  { category: "meal", situation: "Makanan sudah siap di meja; Anda akan mulai makan.", correctReading: "itadakimasu" },
  { category: "meal", situation: "Anda baru selesai makan.", correctReading: "gochisousama deshita" },
  { category: "meal", situation: "Sudah lama Anda belum makan, perut keroncongan.", correctReading: "onaka suita" },
  { category: "meal", situation: "Anda baru mencicipi makanan yang enak.", correctReading: "oishii" },

  { category: "thanks", situation: "Atasan membantu Anda menyelesaikan pekerjaan penting.", correctReading: "arigatou gozaimasu" },
  { category: "thanks", situation: "Teman dekat meminjamkan pulpen ke Anda.", correctReading: "arigatou" },
  { category: "thanks", situation: "Anda tidak sengaja menyenggol orang asing di jalan.", correctReading: "sumimasen" },
  { category: "thanks", situation: "Anda terlambat janjian dengan teman dekat.", correctReading: "gomen nasai" },

  { category: "introduction", situation: "Anda baru bertemu rekan kerja baru untuk pertama kali.", correctReading: "hajimemashite" },
  { category: "introduction", situation: "Setelah memperkenalkan diri, Anda menutup perkenalan dengan sopan.", correctReading: "yoroshiku onegaishimasu" },
];
