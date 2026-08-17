import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { authUsers, authenticatedRole } from "drizzle-orm/supabase";

// ── Enums ──────────────────────────────────────────────────────────────
export const kanaScriptEnum = pgEnum("kana_script", ["hiragana", "katakana"]);
export const kanaTypeEnum = pgEnum("kana_type", [
  "basic", "dakuten", "handakuten", "youon", "sokuon", "long_vowel", "foreign_combo",
]);
export const confusionTypeEnum = pgEnum("confusion_type", ["visual", "audio", "cross_script"]);
export const romajiPolicyEnum = pgEnum("romaji_policy", ["always", "on_demand", "hidden"]);
export const lessonItemRoleEnum = pgEnum("lesson_item_role", ["new", "review"]);
export const kanaSkillEnum = pgEnum("kana_skill", [
  "visual", "audio", "recall", "writing", "reading", "typing",
]);

const readByAuthenticated = (tableName: string) =>
  pgPolicy(`${tableName}_select_authenticated`, {
    for: "select",
    to: authenticatedRole,
    using: sql`true`,
  });

// ── Content tables (static, same for every user) ────────────────────
export const kanaCharacters = pgTable(
  "kana_characters",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    script: kanaScriptEnum("script").notNull(),
    character: text("character").notNull(),
    romaji: text("romaji").notNull(),
    type: kanaTypeEnum("type").notNull(),
    groupCode: text("group_code"),
    orderInGroup: integer("order_in_group"),
    strokeCount: integer("stroke_count"),
    baseCharacterId: integer("base_character_id").references((): AnyPgColumn => kanaCharacters.id),
    audioUrl: text("audio_url"),
    strokeDataKey: text("stroke_data_key"),
    notesId: text("notes_id"),
  },
  (table) => [
    uniqueIndex("kana_characters_script_character_key").on(table.script, table.character),
    check("kana_characters_group_code_range", sql`${table.groupCode} IS NULL OR ${table.groupCode} ~ '^[A-J]$'`),
    readByAuthenticated("kana_characters"),
  ],
);

export const kanaExampleWords = pgTable(
  "kana_example_words",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    wordKana: text("word_kana").notNull(),
    script: kanaScriptEnum("script").notNull(),
    romaji: text("romaji").notNull(),
    meaningId: text("meaning_id").notNull(),
    meaningEn: text("meaning_en"),
    audioUrl: text("audio_url"),
    imageUrl: text("image_url"),
    difficultyTier: smallint("difficulty_tier").notNull().default(1),
    isLoanword: boolean("is_loanword").notNull().default(false),
  },
  () => [readByAuthenticated("kana_example_words")],
);

export const kanaWordCharacters = pgTable(
  "kana_word_characters",
  {
    wordId: integer("word_id").notNull().references(() => kanaExampleWords.id, { onDelete: "cascade" }),
    kanaId: integer("kana_id").notNull().references(() => kanaCharacters.id),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.wordId, table.position] }),
    index("kana_word_characters_kana_id_idx").on(table.kanaId),
    readByAuthenticated("kana_word_characters"),
  ],
);

export const kanaConfusionPairs = pgTable(
  "kana_confusion_pairs",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    kanaAId: integer("kana_a_id").notNull().references(() => kanaCharacters.id),
    kanaBId: integer("kana_b_id").notNull().references(() => kanaCharacters.id),
    confusionType: confusionTypeEnum("confusion_type").notNull(),
    isSystemDefault: boolean("is_system_default").notNull().default(true),
  },
  (table) => [
    uniqueIndex("kana_confusion_pairs_pair_key").on(table.kanaAId, table.kanaBId),
    check("kana_confusion_pairs_canonical_order", sql`${table.kanaAId} < ${table.kanaBId}`),
    readByAuthenticated("kana_confusion_pairs"),
  ],
);

// ── Learning-structure tables ────────────────────────────────────────
export const kanaModules = pgTable(
  "kana_modules",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    code: text("code").notNull().unique(),
    titleId: text("title_id").notNull(),
    titleEn: text("title_en"),
    descriptionId: text("description_id"),
    orderIndex: integer("order_index").notNull(),
    unlockRequirement: jsonb("unlock_requirement"),
  },
  () => [readByAuthenticated("kana_modules")],
);

export const kanaPhases = pgTable(
  "kana_phases",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    moduleId: integer("module_id").notNull().references(() => kanaModules.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    titleId: text("title_id").notNull(),
    orderIndex: integer("order_index").notNull(),
    descriptionId: text("description_id"),
  },
  (table) => [
    uniqueIndex("kana_phases_module_code_key").on(table.moduleId, table.code),
    readByAuthenticated("kana_phases"),
  ],
);

export const kanaLessons = pgTable(
  "kana_lessons",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    phaseId: integer("phase_id").notNull().references(() => kanaPhases.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    titleId: text("title_id").notNull(),
    lessonType: text("lesson_type").notNull(),
    orderIndex: integer("order_index").notNull(),
    groupCode: text("group_code"),
    romajiPolicy: romajiPolicyEnum("romaji_policy").notNull().default("on_demand"),
    videoUrl: text("video_url"),
    targetThresholds: jsonb("target_thresholds"),
  },
  (table) => [
    uniqueIndex("kana_lessons_phase_code_key").on(table.phaseId, table.code),
    check("kana_lessons_group_code_range", sql`${table.groupCode} IS NULL OR ${table.groupCode} ~ '^[A-J]$'`),
    readByAuthenticated("kana_lessons"),
  ],
);

export const kanaLessonItems = pgTable(
  "kana_lesson_items",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    lessonId: integer("lesson_id").notNull().references(() => kanaLessons.id, { onDelete: "cascade" }),
    kanaId: integer("kana_id").references(() => kanaCharacters.id),
    wordId: integer("word_id").references(() => kanaExampleWords.id),
    role: lessonItemRoleEnum("role").notNull(),
  },
  (table) => [
    check(
      "kana_lesson_items_exactly_one_target",
      sql`(${table.kanaId} IS NOT NULL AND ${table.wordId} IS NULL) OR (${table.kanaId} IS NULL AND ${table.wordId} IS NOT NULL)`,
    ),
    uniqueIndex("kana_lesson_items_lesson_kana_key").on(table.lessonId, table.kanaId),
    uniqueIndex("kana_lesson_items_lesson_word_key").on(table.lessonId, table.wordId),
    readByAuthenticated("kana_lesson_items"),
  ],
);

// ── User progress tables ─────────────────────────────────────────────
export const userKanaMastery = pgTable(
  "user_kana_mastery",
  {
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    kanaId: integer("kana_id").notNull().references(() => kanaCharacters.id),
    skill: kanaSkillEnum("skill").notNull(),
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
    primaryKey({ columns: [table.userId, table.kanaId, table.skill] }),
    index("user_kana_mastery_due_at_idx").on(table.userId, table.dueAt),
    index("user_kana_mastery_user_skill_idx").on(table.userId, table.skill),
    pgPolicy("user_kana_mastery_select_own", { for: "select", to: authenticatedRole, using: sql`${table.userId} = auth.uid()` }),
    pgPolicy("user_kana_mastery_insert_own", { for: "insert", to: authenticatedRole, withCheck: sql`${table.userId} = auth.uid()` }),
    pgPolicy("user_kana_mastery_update_own", { for: "update", to: authenticatedRole, using: sql`${table.userId} = auth.uid()`, withCheck: sql`${table.userId} = auth.uid()` }),
  ],
);

export const userKanaAttempts = pgTable(
  "user_kana_attempts",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    kanaId: integer("kana_id").references(() => kanaCharacters.id),
    wordId: integer("word_id").references(() => kanaExampleWords.id),
    lessonId: integer("lesson_id").references(() => kanaLessons.id),
    exerciseType: text("exercise_type").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    selectedOptionId: integer("selected_option_id").references(() => kanaCharacters.id),
    correctOptionId: integer("correct_option_id").references(() => kanaCharacters.id),
    // Free-form record of a non-multiple-choice mistake: what the user
    // typed (typing/dictation), or a compact order/direction/shape
    // summary (writing, from WritingCanvas — there's no "option" to
    // select there either). Added in Fase 5 once ExerciseRunner's
    // typing types and WritingCanvas were actually wired up and hit the
    // CHECK constraint below, which Fase 2 only designed around
    // multiple-choice mistakes.
    typedValue: text("typed_value"),
    responseTimeMs: integer("response_time_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "user_kana_attempts_wrong_needs_selection",
      sql`${table.isCorrect} = true OR ${table.selectedOptionId} IS NOT NULL OR ${table.typedValue} IS NOT NULL`,
    ),
    index("user_kana_attempts_user_kana_idx").on(table.userId, table.kanaId),
    index("user_kana_attempts_user_created_idx").on(table.userId, table.createdAt),
    pgPolicy("user_kana_attempts_select_own", { for: "select", to: authenticatedRole, using: sql`${table.userId} = auth.uid()` }),
    pgPolicy("user_kana_attempts_insert_own", { for: "insert", to: authenticatedRole, withCheck: sql`${table.userId} = auth.uid()` }),
  ],
);

export const userKanaLessonProgress = pgTable(
  "user_kana_lesson_progress",
  {
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id").notNull().references(() => kanaLessons.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("not_started"),
    scoreJson: jsonb("score_json"),
    attempts: integer("attempts").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.lessonId] }),
    pgPolicy("user_kana_lesson_progress_select_own", { for: "select", to: authenticatedRole, using: sql`${table.userId} = auth.uid()` }),
    pgPolicy("user_kana_lesson_progress_insert_own", { for: "insert", to: authenticatedRole, withCheck: sql`${table.userId} = auth.uid()` }),
    pgPolicy("user_kana_lesson_progress_update_own", { for: "update", to: authenticatedRole, using: sql`${table.userId} = auth.uid()`, withCheck: sql`${table.userId} = auth.uid()` }),
  ],
);

export const userKanaGateResults = pgTable(
  "user_kana_gate_results",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    phaseId: integer("phase_id").notNull().references(() => kanaPhases.id),
    groupCode: text("group_code"),
    passed: boolean("passed").notNull(),
    scoresJson: jsonb("scores_json"),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("user_kana_gate_results_group_code_range", sql`${table.groupCode} IS NULL OR ${table.groupCode} ~ '^[A-J]$'`),
    index("user_kana_gate_results_user_phase_idx").on(table.userId, table.phaseId),
    pgPolicy("user_kana_gate_results_select_own", { for: "select", to: authenticatedRole, using: sql`${table.userId} = auth.uid()` }),
    pgPolicy("user_kana_gate_results_insert_own", { for: "insert", to: authenticatedRole, withCheck: sql`${table.userId} = auth.uid()` }),
  ],
);
