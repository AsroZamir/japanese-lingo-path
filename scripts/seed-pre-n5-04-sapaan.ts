import { eq } from "drizzle-orm";
import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSeedClient } from "../db/seed-client";
import { vocabItems } from "../db/schema/vocab";
import { learningModules } from "../db/schema/curriculum";

// PROMPT-10 Bagian 6 — content for PRE-N5.04 (Sapaan & Ungkapan Dasar).
// Built on the same Vocabulary Engine as PRE-N5.03 (docs/POLA-MODUL-BARU.md
// already flagged this as the second vocab-engine module — see
// resolveVocabPhaseCode in vocab-actions.ts for the phase_code collision
// fix that follow-up needed). NOT linguistically QA'd by a native speaker
// (V2.1 Bagian 16 butir 10) — flag this every time this script runs.
//
// V2.1 §6.7 asks for narration from at least two distinct VOICEVOX
// speakers so recognition isn't tied to one voice — speaker 2 (four koku
// metan, production default) plus speaker 8 (春日部つむぎ, a genuinely
// different voice already used in this project's own comparison work).

const VOICEVOX_BASE_URL = process.env.VOICEVOX_BASE_URL ?? "http://localhost:50021";
const BUCKET = "audio";
const SPEAKER_1 = process.env.VOICEVOX_SPEAKER_ID ? Number(process.env.VOICEVOX_SPEAKER_ID) : 2;
const SPEAKER_2 = 8;

type ItemSeed = {
  key: string;
  category: string;
  termKana: string;
  reading: string;
  meaningId: string;
  register: "formal" | "casual" | null;
  registerOfKey: string | null;
  orderIndex: number;
};

let order = 0;
function next(): number {
  order += 1;
  return order;
}

const ITEMS: ItemSeed[] = [
  // ── greeting: sapaan & waktu ──
  { key: "gr-ohayou", category: "greeting", termKana: "おはよう", reading: "ohayou", meaningId: "\"Pagi!\" — ke teman dekat, adik, sebaya akrab", register: "casual", registerOfKey: null, orderIndex: next() },
  { key: "gr-ohayou-f", category: "greeting", termKana: "おはようございます", reading: "ohayou gozaimasu", meaningId: "\"Selamat pagi, Pak/Bu\" — ke atasan, guru, orang tua, orang baru", register: "formal", registerOfKey: "gr-ohayou", orderIndex: next() },
  { key: "gr-konnichiwa", category: "greeting", termKana: "こんにちは", reading: "konnichiwa", meaningId: "\"Selamat siang\" — netral, siang hari", register: null, registerOfKey: null, orderIndex: next() },
  { key: "gr-konbanwa", category: "greeting", termKana: "こんばんは", reading: "konbanwa", meaningId: "\"Selamat malam\" — netral, malam hari", register: null, registerOfKey: null, orderIndex: next() },
  { key: "gr-oyasumi", category: "greeting", termKana: "おやすみなさい", reading: "oyasumi nasai", meaningId: "\"Selamat tidur\"", register: null, registerOfKey: null, orderIndex: next() },

  // ── home: rutinitas rumah ──
  { key: "hm-ittekimasu", category: "home", termKana: "いってきます", reading: "ittekimasu", meaningId: "\"Aku berangkat dulu ya\" — dikatakan yang PERGI", register: null, registerOfKey: null, orderIndex: next() },
  { key: "hm-itterasshai", category: "home", termKana: "いってらっしゃい", reading: "itterasshai", meaningId: "\"Hati-hati di jalan\" — dikatakan yang TINGGAL", register: null, registerOfKey: null, orderIndex: next() },
  { key: "hm-tadaima", category: "home", termKana: "ただいま", reading: "tadaima", meaningId: "\"Aku pulang\" — dikatakan yang BARU PULANG", register: null, registerOfKey: null, orderIndex: next() },
  { key: "hm-okaeri", category: "home", termKana: "おかえりなさい", reading: "okaeri nasai", meaningId: "\"Selamat datang kembali\" — dikatakan yang MENYAMBUT", register: null, registerOfKey: null, orderIndex: next() },

  // ── meal: makan ──
  { key: "ml-itadakimasu", category: "meal", termKana: "いただきます", reading: "itadakimasu", meaningId: "\"Selamat makan\" — diucapkan SEBELUM makan, oleh yang makan", register: null, registerOfKey: null, orderIndex: next() },
  { key: "ml-gochisousama", category: "meal", termKana: "ごちそうさまでした", reading: "gochisousama deshita", meaningId: "\"Terima kasih atas hidangannya\" — diucapkan SESUDAH makan", register: null, registerOfKey: null, orderIndex: next() },
  { key: "ml-onakasuita", category: "meal", termKana: "おなかすいた", reading: "onaka suita", meaningId: "\"Aku lapar\"", register: "casual", registerOfKey: null, orderIndex: next() },
  { key: "ml-oishii", category: "meal", termKana: "おいしい", reading: "oishii", meaningId: "\"Enak!\"", register: null, registerOfKey: null, orderIndex: next() },

  // ── thanks: terima kasih & maaf ──
  { key: "th-arigatou", category: "thanks", termKana: "ありがとう", reading: "arigatou", meaningId: "\"Makasih\" — akrab", register: "casual", registerOfKey: null, orderIndex: next() },
  { key: "th-arigatou-f", category: "thanks", termKana: "ありがとうございます", reading: "arigatou gozaimasu", meaningId: "\"Terima kasih banyak, Pak/Bu\" — formal", register: "formal", registerOfKey: "th-arigatou", orderIndex: next() },
  { key: "th-sumimasen", category: "thanks", termKana: "すみません", reading: "sumimasen", meaningId: "\"Permisi\" / \"Maaf\" — serbaguna, dua fungsi: minta perhatian ATAU minta maaf ringan", register: null, registerOfKey: null, orderIndex: next() },
  { key: "th-gomennasai", category: "thanks", termKana: "ごめんなさい", reading: "gomen nasai", meaningId: "\"Maaf ya\" — akrab", register: "casual", registerOfKey: null, orderIndex: next() },

  // ── introduction: perkenalan ──
  { key: "in-hajimemashite", category: "introduction", termKana: "はじめまして", reading: "hajimemashite", meaningId: "\"Salam kenal\" — dikatakan saat PERTAMA bertemu", register: null, registerOfKey: null, orderIndex: next() },
  { key: "in-yoroshiku", category: "introduction", termKana: "よろしくおねがいします", reading: "yoroshiku onegaishimasu", meaningId: "\"Mohon bantuannya\" / \"Senang berkenalan\" — penutup perkenalan", register: null, registerOfKey: null, orderIndex: next() },
  { key: "in-namae-wa-desu", category: "introduction", termKana: "わたしのなまえは～です", reading: "watashi no namae wa ~ desu", meaningId: "\"Nama saya ...\" — pola kalimat memperkenalkan nama", register: null, registerOfKey: null, orderIndex: next() },
  { key: "in-onamae-wa", category: "introduction", termKana: "おなまえは？", reading: "onamae wa", meaningId: "\"Siapa nama Anda?\" — bertanya nama secara sopan", register: null, registerOfKey: null, orderIndex: next() },
];

function toSlug(romajiReading: string): string {
  return romajiReading.toLowerCase().replace(/[^a-z]/g, "");
}

async function synthesize(text: string, speakerId: number): Promise<Buffer> {
  const queryUrl = `${VOICEVOX_BASE_URL}/audio_query?${new URLSearchParams({ text, speaker: String(speakerId) })}`;
  const queryRes = await fetch(queryUrl, { method: "POST" });
  if (!queryRes.ok) throw new Error(`audio_query gagal untuk "${text}": HTTP ${queryRes.status}`);
  const audioQuery = await queryRes.json();

  const synthUrl = `${VOICEVOX_BASE_URL}/synthesis?${new URLSearchParams({ speaker: String(speakerId) })}`;
  const synthRes = await fetch(synthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(audioQuery),
  });
  if (!synthRes.ok) throw new Error(`synthesis gagal untuk "${text}": HTTP ${synthRes.status}`);
  return Buffer.from(await synthRes.arrayBuffer());
}

async function ensureBucket(supabaseAdmin: SupabaseClient) {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw new Error(`Gagal membaca daftar bucket storage: ${listError.message}`);
  if (buckets?.find((b) => b.name === BUCKET)) return;
  const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  if (createError) throw new Error(`Gagal membuat bucket "${BUCKET}": ${createError.message}`);
}

function requireEnv(name: string, hint: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} tidak ditemukan di .env.local. ${hint}`);
  return value;
}

async function main() {
  const skipAudio = process.argv.includes("--no-audio");
  console.log(
    `Target: ${ITEMS.length} vocab_items untuk PRE-N5.04${skipAudio ? " (tanpa audio)" : ` (2 suara: ${SPEAKER_1} dan ${SPEAKER_2})`}.\n`,
  );

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "Cek .env.local.");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", "Diperlukan untuk upload ke Storage.");
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
  const { db, close } = createSeedClient();

  let audioOk = 0;
  let audioFailed = 0;
  let voicevoxReady = false;

  try {
    if (!skipAudio) {
      try {
        const ping = await fetch(`${VOICEVOX_BASE_URL}/speakers`);
        if (!ping.ok) throw new Error(`HTTP ${ping.status}`);
        await ensureBucket(supabaseAdmin);
        voicevoxReady = true;
      } catch (err) {
        console.warn(`VOICEVOX/storage tidak siap (${(err as Error).message}) — lanjut TANPA audio.`);
      }
    }

    const [moduleRow] = await db.select().from(learningModules).where(eq(learningModules.code, "PRE-N5.04"));
    if (!moduleRow) throw new Error("Modul PRE-N5.04 tidak ditemukan.");

    await db.delete(vocabItems).where(eq(vocabItems.moduleId, moduleRow.id));

    const idByKey = new Map<string, number>();

    for (const item of ITEMS) {
      let audioUrl: string | null = null;
      let audioUrlSpeaker2: string | null = null;
      if (!skipAudio && voicevoxReady) {
        try {
          const buf1 = await synthesize(item.termKana, SPEAKER_1);
          const path1 = `vocab/pre-n5-04/${item.category}/${toSlug(item.reading)}-s1.wav`;
          const { error: err1 } = await supabaseAdmin.storage.from(BUCKET).upload(path1, buf1, { contentType: "audio/wav", upsert: true });
          if (err1) throw err1;
          audioUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path1).data.publicUrl;

          const buf2 = await synthesize(item.termKana, SPEAKER_2);
          const path2 = `vocab/pre-n5-04/${item.category}/${toSlug(item.reading)}-s2.wav`;
          const { error: err2 } = await supabaseAdmin.storage.from(BUCKET).upload(path2, buf2, { contentType: "audio/wav", upsert: true });
          if (err2) throw err2;
          audioUrlSpeaker2 = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path2).data.publicUrl;

          audioOk += 1;
        } catch (err) {
          audioFailed += 1;
          console.warn(`  audio gagal untuk "${item.termKana}": ${(err as Error).message}`);
        }
      }

      const [inserted] = await db
        .insert(vocabItems)
        .values({
          moduleId: moduleRow.id,
          category: item.category,
          termKana: item.termKana,
          reading: item.reading,
          meaningId: item.meaningId,
          numericValue: null,
          isIrregular: false,
          irregularOf: null,
          register: item.register,
          registerOf: null,
          audioUrl,
          audioUrlSpeaker2,
          orderIndex: item.orderIndex,
        })
        .returning({ id: vocabItems.id });
      idByKey.set(item.key, inserted.id);
    }

    // Pass 2: wire registerOf now that every id exists.
    let wired = 0;
    for (const item of ITEMS) {
      if (!item.registerOfKey) continue;
      const id = idByKey.get(item.key);
      const registerOfId = idByKey.get(item.registerOfKey);
      if (!id || !registerOfId) continue;
      await db.update(vocabItems).set({ registerOf: registerOfId }).where(eq(vocabItems.id, id));
      wired += 1;
    }

    console.log(`${ITEMS.length}/${ITEMS.length} item dimasukkan. registerOf terpasang: ${wired}.`);
    console.log(`Audio: ${audioOk} berhasil (2 suara masing-masing), ${audioFailed} gagal.`);
    console.log(
      "\nPERLU DITINJAU: seluruh naskah dan pemetaan skenario belum melalui QA linguistik penutur asli (V2.1 Bagian 16 butir 10).",
    );
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-pre-n5-04-sapaan gagal:", error);
  process.exit(1);
});
