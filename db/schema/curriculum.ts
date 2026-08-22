import { sql } from "drizzle-orm";
import {
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
} from "drizzle-orm/pg-core";
import { authUsers, authenticatedRole } from "drizzle-orm/supabase";

export const curriculumStatusEnum = pgEnum("curriculum_status", ["draft", "active", "retired"]);
export const learningModuleTypeEnum = pgEnum("learning_module_type", [
  "SCR",
  "VOC",
  "GRA",
  "FUN",
  "LIS",
  "REA",
  "BOS",
]);
export const learningContentStatusEnum = pgEnum("learning_content_status", [
  "scaffold",
  "building",
  "ready",
  "retired",
]);
export const learningStageKindEnum = pgEnum("learning_stage_kind", [
  "discover",
  "trace",
  "recall",
  "blitz",
  "srs",
  "boss",
  "assessment",
]);
export const learningProgressStatusEnum = pgEnum("learning_progress_status", [
  "not_started",
  "in_progress",
  "completed",
]);

const readStaticContent = (tableName: string) =>
  pgPolicy(`${tableName}_select_authenticated`, {
    for: "select",
    to: authenticatedRole,
    using: sql`true`,
  });

// Curriculum V2 lives beside the legacy kana_* curriculum. Keeping the two
// versions separate makes rollback possible while PRE-N5 is rebuilt from the
// new blueprint.
export const curriculumVersions = pgTable(
  "curriculum_versions",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    code: text("code").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    status: curriculumStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
  },
  () => [readStaticContent("curriculum_versions")],
);

export const curriculumLevels = pgTable(
  "curriculum_levels",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    versionId: integer("version_id")
      .notNull()
      .references(() => curriculumVersions.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull(),
    recognitionSpeedMs: integer("recognition_speed_ms").notNull(),
    distractorProfile: text("distractor_profile").notNull(),
    productionMode: text("production_mode").notNull(),
    contextComplexity: text("context_complexity").notNull(),
    aiRoleplayTurns: smallint("ai_roleplay_turns").notNull(),
    furiganaPercent: smallint("furigana_percent").notNull(),
  },
  (table) => [
    uniqueIndex("curriculum_levels_version_code_key").on(table.versionId, table.code),
    uniqueIndex("curriculum_levels_version_order_key").on(table.versionId, table.orderIndex),
    index("curriculum_levels_version_id_idx").on(table.versionId),
    check("curriculum_levels_recognition_speed_positive", sql`${table.recognitionSpeedMs} > 0`),
    check("curriculum_levels_ai_turns_nonnegative", sql`${table.aiRoleplayTurns} >= 0`),
    check(
      "curriculum_levels_furigana_percent_range",
      sql`${table.furiganaPercent} BETWEEN 0 AND 100`,
    ),
    readStaticContent("curriculum_levels"),
  ],
);

export const learningModules = pgTable(
  "learning_modules",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    levelId: integer("level_id")
      .notNull()
      .references(() => curriculumLevels.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    objective: text("objective").notNull(),
    methodName: text("method_name").notNull(),
    moduleType: learningModuleTypeEnum("module_type").notNull(),
    orderIndex: integer("order_index").notNull(),
    estimatedMinutesMin: integer("estimated_minutes_min").notNull(),
    estimatedMinutesMax: integer("estimated_minutes_max").notNull(),
    icon: text("icon").notNull(),
    status: learningContentStatusEnum("status").notNull().default("scaffold"),
    configuration: jsonb("configuration").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("learning_modules_level_code_key").on(table.levelId, table.code),
    uniqueIndex("learning_modules_level_order_key").on(table.levelId, table.orderIndex),
    index("learning_modules_level_id_idx").on(table.levelId),
    index("learning_modules_level_status_idx").on(table.levelId, table.status),
    check(
      "learning_modules_estimate_range",
      sql`${table.estimatedMinutesMin} > 0 AND ${table.estimatedMinutesMax} >= ${table.estimatedMinutesMin}`,
    ),
    readStaticContent("learning_modules"),
  ],
);

export const learningModulePrerequisites = pgTable(
  "learning_module_prerequisites",
  {
    moduleId: integer("module_id")
      .notNull()
      .references(() => learningModules.id, { onDelete: "cascade" }),
    prerequisiteModuleId: integer("prerequisite_module_id")
      .notNull()
      .references(() => learningModules.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.moduleId, table.prerequisiteModuleId] }),
    index("learning_module_prerequisites_prerequisite_idx").on(table.prerequisiteModuleId),
    check(
      "learning_module_prerequisites_not_self",
      sql`${table.moduleId} <> ${table.prerequisiteModuleId}`,
    ),
    readStaticContent("learning_module_prerequisites"),
  ],
);

export const learningStages = pgTable(
  "learning_stages",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    moduleId: integer("module_id")
      .notNull()
      .references(() => learningModules.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    stageKind: learningStageKindEnum("stage_kind").notNull(),
    mechanic: text("mechanic").notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull(),
    status: learningContentStatusEnum("status").notNull().default("scaffold"),
    configuration: jsonb("configuration").notNull().default(sql`'{}'::jsonb`),
    passCriteria: jsonb("pass_criteria").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("learning_stages_module_code_key").on(table.moduleId, table.code),
    uniqueIndex("learning_stages_module_order_key").on(table.moduleId, table.orderIndex),
    index("learning_stages_module_id_idx").on(table.moduleId),
    index("learning_stages_module_status_idx").on(table.moduleId, table.status),
    readStaticContent("learning_stages"),
  ],
);

export const userLearningModuleProgress = pgTable(
  "user_learning_module_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    moduleId: integer("module_id")
      .notNull()
      .references(() => learningModules.id, { onDelete: "cascade" }),
    status: learningProgressStatusEnum("status").notNull().default("not_started"),
    percentComplete: smallint("percent_complete").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.moduleId] }),
    index("user_learning_module_progress_module_idx").on(table.moduleId),
    index("user_learning_module_progress_user_status_idx").on(table.userId, table.status),
    check(
      "user_learning_module_progress_percent_range",
      sql`${table.percentComplete} BETWEEN 0 AND 100`,
    ),
    pgPolicy("user_learning_module_progress_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = (select auth.uid())`,
    }),
    pgPolicy("user_learning_module_progress_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.userId} = (select auth.uid())`,
    }),
    pgPolicy("user_learning_module_progress_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.userId} = (select auth.uid())`,
      withCheck: sql`${table.userId} = (select auth.uid())`,
    }),
  ],
);

export const userLearningStageProgress = pgTable(
  "user_learning_stage_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    stageId: integer("stage_id")
      .notNull()
      .references(() => learningStages.id, { onDelete: "cascade" }),
    status: learningProgressStatusEnum("status").notNull().default("not_started"),
    score: real("score"),
    attempts: integer("attempts").notNull().default(0),
    state: jsonb("state").$type<Record<string, unknown>>().notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.stageId] }),
    index("user_learning_stage_progress_stage_idx").on(table.stageId),
    index("user_learning_stage_progress_user_status_idx").on(table.userId, table.status),
    check(
      "user_learning_stage_progress_score_range",
      sql`${table.score} IS NULL OR ${table.score} BETWEEN 0 AND 100`,
    ),
    check("user_learning_stage_progress_attempts_nonnegative", sql`${table.attempts} >= 0`),
    pgPolicy("user_learning_stage_progress_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = (select auth.uid())`,
    }),
    pgPolicy("user_learning_stage_progress_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.userId} = (select auth.uid())`,
    }),
    pgPolicy("user_learning_stage_progress_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.userId} = (select auth.uid())`,
      withCheck: sql`${table.userId} = (select auth.uid())`,
    }),
  ],
);
