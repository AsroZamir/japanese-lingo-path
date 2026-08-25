import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgPolicy,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { authUsers, authenticatedRole } from "drizzle-orm/supabase";
import { learningModules } from "./curriculum";

const readByAuthenticated = (tableName: string) =>
  pgPolicy(`${tableName}_select_authenticated`, {
    for: "select",
    to: authenticatedRole,
    using: sql`true`,
  });

// PROMPT-8 Bagian 4/6 — generic vocabulary/pattern-drill engine. Built
// for PRE-N5.03 (angka/waktu/harga/counter) but deliberately NOT
// hardcoded to it: V2.1 §6.3's "Vocabulary Engine" (small set of items
// with form + reading + meaning + one confusable/irregular contrast)
// covers PRE-N5.04 (sapaan), PRE-N5.05 (kosakata dasar), and PRE-N5.10
// (listening) too — those can add rows here without new tables. See
// docs/POLA-MODUL-BARU.md for what's reusable vs what's category-
// specific to PRE-N5.03 (numeric grading, konbini simulation).
export const vocabItems = pgTable(
  "vocab_items",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    moduleId: integer("module_id").notNull().references(() => learningModules.id),
    // Free text, not an enum — every module defines its own categories
    // (number/tens_hundreds/hour/minute/date/price/counter for
    // PRE-N5.03; a future module picks its own set). Chunking/phase
    // assignment in the query layer reads this, same spirit as
    // kana_characters.type.
    category: text("category").notNull(),
    termKana: text("term_kana").notNull(),
    reading: text("reading").notNull(),
    meaningId: text("meaning_id").notNull(),
    // The real number this item represents, when it has one (angka itu
    // sendiri, jam, menit, tanggal, harga) — lets exercises grade
    // against an actual value instead of just string-matching kana,
    // and lets "salah hitung vs salah bahasa" (Bagian 4 poin 4) be
    // told apart later. Null for items with no numeric value (a bare
    // counter word like 個 on its own).
    numericValue: real("numeric_value"),
    isIrregular: boolean("is_irregular").notNull().default(false),
    // For an irregular item, which regular item it's the sound-changed
    // exception of (e.g. 三本 さんぼん -> irregularOf 本 はん's "regular"
    // combination row) — lets the UI build regular-vs-irregular contrast
    // pairs directly instead of a separate join table. Null for regular
    // items and for irregulars with no single clean "regular" pair
    // (dates 1-10/14/20/24, which have no pattern to contrast against).
    irregularOf: integer("irregular_of").references((): AnyPgColumn => vocabItems.id),
    // PROMPT-10 Bagian 6 (PRE-N5.04) — social register, null for modules
    // where it doesn't apply (numbers, katakana). "formal" | "casual" |
    // null (register-neutral, e.g. すみません serves both).
    register: text("register"),
    // The OTHER register variant of the same underlying expression (e.g.
    // おはようございます's registerOf points at おはよう, or vice versa) —
    // lets the UI build a casual/formal bridge pair directly from the
    // data, same shape as irregularOf but a distinct relationship (a
    // register pair isn't a sound-change exception, it's two equally
    // "correct" forms for different social contexts).
    registerOf: integer("register_of").references((): AnyPgColumn => vocabItems.id),
    audioUrl: text("audio_url"),
    // PROMPT-10 Bagian 6: V2.1 asks for narration from at least two
    // distinct VOICEVOX speakers so learners practice cross-speaker
    // recognition. Second speaker's audio, when generated; null
    // otherwise (single-speaker modules like PRE-N5.01-03 never fill this).
    audioUrlSpeaker2: text("audio_url_speaker_2"),
    // PROMPT-11 Bagian 5 (PRE-N5.05) — V2.1 §6.3/7 explicit requirement:
    // "setiap kata wajib punya satu frasa pasangan (collocation)." Null
    // for modules where a bare item already IS the whole teaching unit
    // (numbers, greetings) — this is specifically for vocabulary items
    // that are near-useless alone (水 vs 水を飲む).
    collocation: text("collocation"),
    collocationMeaningId: text("collocation_meaning_id"),
    orderIndex: integer("order_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("vocab_items_module_category_order_key").on(
      table.moduleId,
      table.category,
      table.orderIndex,
    ),
    index("vocab_items_module_idx").on(table.moduleId),
    readByAuthenticated("vocab_items"),
  ],
);

export const userVocabAttempts = pgTable(
  "user_vocab_attempts",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    itemId: integer("item_id").notNull().references(() => vocabItems.id),
    exerciseType: text("exercise_type").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    typedValue: text("typed_value"),
    // PRE-N5.03 Bagian 4 poin 4 (V2.1: "salah hitung dipisahkan dari
    // salah bahasa"): set only on exercises that ask the user to DO
    // something with a heard number (compute change, sum a total), not
    // on plain recognition/production. 'language' = misheard or
    // misproduced the Japanese itself; 'math' = heard/produced it
    // correctly but the arithmetic on top of it was wrong. Null for
    // exercises where the distinction doesn't apply.
    errorType: text("error_type"),
    responseTimeMs: integer("response_time_ms"),
    firstAttemptCorrect: boolean("first_attempt_correct"),
    hintLevel: integer("hint_level"),
    assisted: boolean("assisted"),
    phaseCode: text("phase_code"),
    curriculumVersion: text("curriculum_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_vocab_attempts_user_item_idx").on(table.userId, table.itemId),
    index("user_vocab_attempts_user_created_idx").on(table.userId, table.createdAt),
    pgPolicy("user_vocab_attempts_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = auth.uid()`,
    }),
    pgPolicy("user_vocab_attempts_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.userId} = auth.uid()`,
    }),
  ],
);

export const userVocabMastery = pgTable(
  "user_vocab_mastery",
  {
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    itemId: integer("item_id").notNull().references(() => vocabItems.id),
    // V2.1 §6.3: "retrieval dua arah ... dipisahkan; mengenali arti
    // tidak otomatis berarti bisa memproduksi kata" — recognition
    // (dengar/lihat -> pilih) and production (dengar -> ketik/ucapkan)
    // are tracked as separate skill rows, same pattern as
    // user_kana_mastery's skill column.
    skill: text("skill").notNull(),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    accuracy: real("accuracy").notNull().default(0),
    streak: integer("streak").notNull().default(0),
    srsIntervalDays: integer("srs_interval_days").notNull().default(0),
    srsEase: real("srs_ease").notNull().default(2.5),
    dueAt: timestamp("due_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.itemId, table.skill] }),
    index("user_vocab_mastery_due_at_idx").on(table.userId, table.dueAt),
    pgPolicy("user_vocab_mastery_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = auth.uid()`,
    }),
    pgPolicy("user_vocab_mastery_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.userId} = auth.uid()`,
    }),
    pgPolicy("user_vocab_mastery_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.userId} = auth.uid()`,
      withCheck: sql`${table.userId} = auth.uid()`,
    }),
  ],
);
