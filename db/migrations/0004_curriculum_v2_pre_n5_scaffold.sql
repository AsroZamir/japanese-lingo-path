CREATE TYPE "public"."curriculum_status" AS ENUM('draft', 'active', 'retired');--> statement-breakpoint
CREATE TYPE "public"."learning_content_status" AS ENUM('scaffold', 'building', 'ready', 'retired');--> statement-breakpoint
CREATE TYPE "public"."learning_module_type" AS ENUM('SCR', 'VOC', 'GRA', 'FUN', 'LIS', 'REA', 'BOS');--> statement-breakpoint
CREATE TYPE "public"."learning_progress_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."learning_stage_kind" AS ENUM('discover', 'trace', 'recall', 'blitz', 'srs', 'boss', 'assessment');--> statement-breakpoint
CREATE TABLE "curriculum_levels" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "curriculum_levels_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"version_id" integer NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"recognition_speed_ms" integer NOT NULL,
	"distractor_profile" text NOT NULL,
	"production_mode" text NOT NULL,
	"context_complexity" text NOT NULL,
	"ai_roleplay_turns" smallint NOT NULL,
	"furigana_percent" smallint NOT NULL,
	CONSTRAINT "curriculum_levels_recognition_speed_positive" CHECK ("curriculum_levels"."recognition_speed_ms" > 0),
	CONSTRAINT "curriculum_levels_ai_turns_nonnegative" CHECK ("curriculum_levels"."ai_roleplay_turns" >= 0),
	CONSTRAINT "curriculum_levels_furigana_percent_range" CHECK ("curriculum_levels"."furigana_percent" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "curriculum_levels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "curriculum_versions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "curriculum_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "curriculum_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	CONSTRAINT "curriculum_versions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "curriculum_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "learning_module_prerequisites" (
	"module_id" integer NOT NULL,
	"prerequisite_module_id" integer NOT NULL,
	CONSTRAINT "learning_module_prerequisites_module_id_prerequisite_module_id_pk" PRIMARY KEY("module_id","prerequisite_module_id"),
	CONSTRAINT "learning_module_prerequisites_not_self" CHECK ("learning_module_prerequisites"."module_id" <> "learning_module_prerequisites"."prerequisite_module_id")
);
--> statement-breakpoint
ALTER TABLE "learning_module_prerequisites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "learning_modules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "learning_modules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"level_id" integer NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"objective" text NOT NULL,
	"method_name" text NOT NULL,
	"module_type" "learning_module_type" NOT NULL,
	"order_index" integer NOT NULL,
	"estimated_minutes_min" integer NOT NULL,
	"estimated_minutes_max" integer NOT NULL,
	"icon" text NOT NULL,
	"status" "learning_content_status" DEFAULT 'scaffold' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_modules_estimate_range" CHECK ("learning_modules"."estimated_minutes_min" > 0 AND "learning_modules"."estimated_minutes_max" >= "learning_modules"."estimated_minutes_min")
);
--> statement-breakpoint
ALTER TABLE "learning_modules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "learning_stages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "learning_stages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"module_id" integer NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"stage_kind" "learning_stage_kind" NOT NULL,
	"mechanic" text NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"status" "learning_content_status" DEFAULT 'scaffold' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pass_criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_learning_module_progress" (
	"user_id" uuid NOT NULL,
	"module_id" integer NOT NULL,
	"status" "learning_progress_status" DEFAULT 'not_started' NOT NULL,
	"percent_complete" smallint DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_learning_module_progress_user_id_module_id_pk" PRIMARY KEY("user_id","module_id"),
	CONSTRAINT "user_learning_module_progress_percent_range" CHECK ("user_learning_module_progress"."percent_complete" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "user_learning_module_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_learning_stage_progress" (
	"user_id" uuid NOT NULL,
	"stage_id" integer NOT NULL,
	"status" "learning_progress_status" DEFAULT 'not_started' NOT NULL,
	"score" real,
	"attempts" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_learning_stage_progress_user_id_stage_id_pk" PRIMARY KEY("user_id","stage_id"),
	CONSTRAINT "user_learning_stage_progress_score_range" CHECK ("user_learning_stage_progress"."score" IS NULL OR "user_learning_stage_progress"."score" BETWEEN 0 AND 100),
	CONSTRAINT "user_learning_stage_progress_attempts_nonnegative" CHECK ("user_learning_stage_progress"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "user_learning_stage_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "curriculum_levels" ADD CONSTRAINT "curriculum_levels_version_id_curriculum_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_module_prerequisites" ADD CONSTRAINT "learning_module_prerequisites_module_id_learning_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."learning_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_module_prerequisites" ADD CONSTRAINT "learning_module_prerequisites_prerequisite_module_id_learning_modules_id_fk" FOREIGN KEY ("prerequisite_module_id") REFERENCES "public"."learning_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_modules" ADD CONSTRAINT "learning_modules_level_id_curriculum_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."curriculum_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_stages" ADD CONSTRAINT "learning_stages_module_id_learning_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."learning_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_module_progress" ADD CONSTRAINT "user_learning_module_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_module_progress" ADD CONSTRAINT "user_learning_module_progress_module_id_learning_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."learning_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_stage_progress" ADD CONSTRAINT "user_learning_stage_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_stage_progress" ADD CONSTRAINT "user_learning_stage_progress_stage_id_learning_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."learning_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_levels_version_code_key" ON "curriculum_levels" USING btree ("version_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_levels_version_order_key" ON "curriculum_levels" USING btree ("version_id","order_index");--> statement-breakpoint
CREATE INDEX "curriculum_levels_version_id_idx" ON "curriculum_levels" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "learning_module_prerequisites_prerequisite_idx" ON "learning_module_prerequisites" USING btree ("prerequisite_module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_modules_level_code_key" ON "learning_modules" USING btree ("level_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_modules_level_order_key" ON "learning_modules" USING btree ("level_id","order_index");--> statement-breakpoint
CREATE INDEX "learning_modules_level_id_idx" ON "learning_modules" USING btree ("level_id");--> statement-breakpoint
CREATE INDEX "learning_modules_level_status_idx" ON "learning_modules" USING btree ("level_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_stages_module_code_key" ON "learning_stages" USING btree ("module_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_stages_module_order_key" ON "learning_stages" USING btree ("module_id","order_index");--> statement-breakpoint
CREATE INDEX "learning_stages_module_id_idx" ON "learning_stages" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "learning_stages_module_status_idx" ON "learning_stages" USING btree ("module_id","status");--> statement-breakpoint
CREATE INDEX "user_learning_module_progress_module_idx" ON "user_learning_module_progress" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "user_learning_module_progress_user_status_idx" ON "user_learning_module_progress" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "user_learning_stage_progress_stage_idx" ON "user_learning_stage_progress" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "user_learning_stage_progress_user_status_idx" ON "user_learning_stage_progress" USING btree ("user_id","status");--> statement-breakpoint
CREATE POLICY "curriculum_levels_select_authenticated" ON "curriculum_levels" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "curriculum_versions_select_authenticated" ON "curriculum_versions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "learning_module_prerequisites_select_authenticated" ON "learning_module_prerequisites" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "learning_modules_select_authenticated" ON "learning_modules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "learning_stages_select_authenticated" ON "learning_stages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "user_learning_module_progress_select_own" ON "user_learning_module_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_learning_module_progress"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_learning_module_progress_insert_own" ON "user_learning_module_progress" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("user_learning_module_progress"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_learning_module_progress_update_own" ON "user_learning_module_progress" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("user_learning_module_progress"."user_id" = (select auth.uid())) WITH CHECK ("user_learning_module_progress"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_learning_stage_progress_select_own" ON "user_learning_stage_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_learning_stage_progress"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_learning_stage_progress_insert_own" ON "user_learning_stage_progress" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("user_learning_stage_progress"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_learning_stage_progress_update_own" ON "user_learning_stage_progress" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("user_learning_stage_progress"."user_id" = (select auth.uid())) WITH CHECK ("user_learning_stage_progress"."user_id" = (select auth.uid()));--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "curriculum_versions", "curriculum_levels", "learning_modules", "learning_module_prerequisites", "learning_stages", "user_learning_module_progress", "user_learning_stage_progress" FROM "anon", PUBLIC;
--> statement-breakpoint
GRANT SELECT ON TABLE "curriculum_versions", "curriculum_levels", "learning_modules", "learning_module_prerequisites", "learning_stages" TO "authenticated";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "user_learning_module_progress", "user_learning_stage_progress" TO "authenticated";
--> statement-breakpoint
GRANT ALL PRIVILEGES ON TABLE "curriculum_versions", "curriculum_levels", "learning_modules", "learning_module_prerequisites", "learning_stages", "user_learning_module_progress", "user_learning_stage_progress" TO "service_role";
--> statement-breakpoint
GRANT USAGE, SELECT ON SEQUENCE "curriculum_versions_id_seq", "curriculum_levels_id_seq", "learning_modules_id_seq", "learning_stages_id_seq" TO "service_role";