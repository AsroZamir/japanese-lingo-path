import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { learningModules, learningStages } from "./curriculum";
import { kanaCharacters } from "./kana";

const readByAuthenticated = (tableName: string) =>
  pgPolicy(`${tableName}_select_authenticated`, {
    for: "select",
    to: authenticatedRole,
    using: sql`true`,
  });

// PROMPT-9 — Mesin Sensei: a generic "papan tulis" (whiteboard)
// presentation engine meant for ALL 67 modules (V2.1 §10.1: stable
// item_id, content_version, reviewable), not a PRE-N5.01-specific
// feature. One row = one "beat" on the board: some text, an optional
// visual action, an optional narration, and which sensei pose to show.
// Multiple rows sharing (moduleId, stageId, segmentType) play in
// orderIndex sequence as one continuous presentation.
//
// Deliberately NOT built on lesson_content_blocks/kanaLessons (db/schema/
// kana.ts) — that table is V1-only (kana_modules/kana_lessons), which
// CLAUDE.md §3 says is disconnected and must not be extended. This new
// table is scoped to the active V2/V2.1 learning_modules/learning_stages
// graph instead.
export const SENSEI_SEGMENT_TYPES = ["module_intro", "phase_intro", "concept_moment", "writing_demo"] as const;
export type SenseiSegmentType = (typeof SENSEI_SEGMENT_TYPES)[number];

// PROMPT-10 Bagian 4 — the 8-pose set the owner's real character art
// uses (public/sensei/sensei-{pose}.webp). Names match the art's own
// filenames exactly so a new pose is "drop the file in, nothing else."
export const SENSEI_POSES = [
  "netral",
  "menunjuk",
  "menjelaskan",
  "memberi-semangat",
  "berpikir",
  "menulis",
  "merayakan",
  "prihatin-mendukung",
] as const;
export type SenseiPose = (typeof SENSEI_POSES)[number];

export const senseiSegments = pgTable(
  "sensei_segments",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    moduleId: integer("module_id").notNull().references(() => learningModules.id, { onDelete: "cascade" }),
    // Null for module_intro (module-wide, not tied to one stage).
    // Filled for phase_intro (the stage it introduces) and
    // concept_moment (the stage where the new concept first appears).
    // Ignored for writing_demo (see kanaId below instead).
    stageId: integer("stage_id").references(() => learningStages.id, { onDelete: "cascade" }),
    // Only for segmentType='writing_demo' — one narration per character,
    // paired with the EXISTING stroke-animation component (reused, not
    // reimplemented — see components/sensei/SenseiWritingDemo.tsx).
    kanaId: integer("kana_id").references(() => kanaCharacters.id, { onDelete: "cascade" }),
    // Free text, not a DB enum — matches this repo's established
    // convention (see vocab_items.category) of validating small closed
    // sets in application code (senseiSegmentTypeEnum above) rather than
    // a Postgres enum, since new segment types are far more likely to be
    // added per-module than kana scripts ever were.
    segmentType: text("segment_type").notNull(),
    orderIndex: integer("order_index").notNull(),
    boardText: text("board_text").notNull(),
    // { kind: "text" } | { kind: "glyph"; char; label? }
    // | { kind: "table"; columns; rows }
    // | { kind: "compare"; items: { label; example; note }[] }
    // | { kind: "write_char" } — see app/lib/sensei-types.ts for the
    // full discriminated union both this table's authors and the
    // renderer (SenseiBoard.tsx) must agree on.
    visualAction: jsonb("visual_action").notNull().default(sql`'{"kind":"text"}'::jsonb`),
    senseiPose: text("sensei_pose").notNull().default("netral"),
    // Editable narration script (Indonesian) — kept as a real column so
    // it can be reviewed/edited without touching visualAction's jsonb
    // shape, same split as lesson_content_blocks.narrationText/Url.
    narrationText: text("narration_text"),
    narrationUrl: text("narration_url"),
    // PROMPT-11 Bagian 4 — lip sync foundation. { mouthCues: { start,
    // end, value }[] } from Rhubarb Lip Sync (-r phonetic, JSON export),
    // generated once per narration text — see scripts/generate-lipsync.ts.
    // Null for every row today (no mouth-shape ART exists yet to drive
    // with it — see SenseiLayeredCharacter.tsx's silent fallback); the
    // column exists so generating this data doesn't require a later
    // migration once real illustrated assets arrive.
    lipSyncData: jsonb("lip_sync_data"),
    // V2.1 §10.1 single-source-of-truth fields: content_version so
    // authored copy can be revised without breaking old references, and
    // a lightweight review flag (not a full workflow) so unreviewed
    // content is visibly distinguishable from checked content.
    contentVersion: text("content_version").notNull().default("v1"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sensei_segments_group_order_key").on(
      table.moduleId,
      table.segmentType,
      table.stageId,
      table.kanaId,
      table.orderIndex,
    ),
    index("sensei_segments_module_idx").on(table.moduleId),
    index("sensei_segments_kana_idx").on(table.kanaId),
    readByAuthenticated("sensei_segments"),
  ],
);
