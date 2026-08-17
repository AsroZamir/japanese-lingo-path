CREATE TYPE "public"."confusion_type" AS ENUM('visual', 'audio', 'cross_script');--> statement-breakpoint
CREATE TYPE "public"."kana_script" AS ENUM('hiragana', 'katakana');--> statement-breakpoint
CREATE TYPE "public"."kana_skill" AS ENUM('visual', 'audio', 'recall', 'writing', 'reading', 'typing');--> statement-breakpoint
CREATE TYPE "public"."kana_type" AS ENUM('basic', 'dakuten', 'handakuten', 'youon', 'sokuon', 'long_vowel', 'foreign_combo');--> statement-breakpoint
CREATE TYPE "public"."lesson_item_role" AS ENUM('new', 'review');--> statement-breakpoint
CREATE TYPE "public"."romaji_policy" AS ENUM('always', 'on_demand', 'hidden');--> statement-breakpoint
CREATE TABLE "kana_characters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kana_characters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"script" "kana_script" NOT NULL,
	"character" text NOT NULL,
	"romaji" text NOT NULL,
	"type" "kana_type" NOT NULL,
	"group_code" text,
	"order_in_group" integer,
	"stroke_count" integer,
	"base_character_id" integer,
	"audio_url" text,
	"stroke_data_key" text,
	"notes_id" text,
	CONSTRAINT "kana_characters_group_code_range" CHECK ("kana_characters"."group_code" IS NULL OR "kana_characters"."group_code" ~ '^[A-J]$')
);
--> statement-breakpoint
ALTER TABLE "kana_characters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kana_confusion_pairs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kana_confusion_pairs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kana_a_id" integer NOT NULL,
	"kana_b_id" integer NOT NULL,
	"confusion_type" "confusion_type" NOT NULL,
	"is_system_default" boolean DEFAULT true NOT NULL,
	CONSTRAINT "kana_confusion_pairs_canonical_order" CHECK ("kana_confusion_pairs"."kana_a_id" < "kana_confusion_pairs"."kana_b_id")
);
--> statement-breakpoint
ALTER TABLE "kana_confusion_pairs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kana_example_words" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kana_example_words_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"word_kana" text NOT NULL,
	"script" "kana_script" NOT NULL,
	"romaji" text NOT NULL,
	"meaning_id" text NOT NULL,
	"meaning_en" text,
	"audio_url" text,
	"image_url" text,
	"difficulty_tier" smallint DEFAULT 1 NOT NULL,
	"is_loanword" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kana_example_words" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kana_lesson_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kana_lesson_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lesson_id" integer NOT NULL,
	"kana_id" integer,
	"word_id" integer,
	"role" "lesson_item_role" NOT NULL,
	CONSTRAINT "kana_lesson_items_exactly_one_target" CHECK (("kana_lesson_items"."kana_id" IS NOT NULL AND "kana_lesson_items"."word_id" IS NULL) OR ("kana_lesson_items"."kana_id" IS NULL AND "kana_lesson_items"."word_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "kana_lesson_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kana_lessons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kana_lessons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"phase_id" integer NOT NULL,
	"code" text NOT NULL,
	"title_id" text NOT NULL,
	"lesson_type" text NOT NULL,
	"order_index" integer NOT NULL,
	"group_code" text,
	"romaji_policy" "romaji_policy" DEFAULT 'on_demand' NOT NULL,
	"video_url" text,
	"target_thresholds" jsonb,
	CONSTRAINT "kana_lessons_group_code_range" CHECK ("kana_lessons"."group_code" IS NULL OR "kana_lessons"."group_code" ~ '^[A-J]$')
);
--> statement-breakpoint
ALTER TABLE "kana_lessons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kana_modules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kana_modules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"title_id" text NOT NULL,
	"title_en" text,
	"description_id" text,
	"order_index" integer NOT NULL,
	"unlock_requirement" jsonb,
	CONSTRAINT "kana_modules_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "kana_modules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kana_phases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kana_phases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"module_id" integer NOT NULL,
	"code" text NOT NULL,
	"title_id" text NOT NULL,
	"order_index" integer NOT NULL,
	"description_id" text
);
--> statement-breakpoint
ALTER TABLE "kana_phases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kana_word_characters" (
	"word_id" integer NOT NULL,
	"kana_id" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "kana_word_characters_word_id_position_pk" PRIMARY KEY("word_id","position")
);
--> statement-breakpoint
ALTER TABLE "kana_word_characters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_kana_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_kana_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"kana_id" integer,
	"word_id" integer,
	"lesson_id" integer,
	"exercise_type" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"selected_option_id" integer,
	"correct_option_id" integer,
	"response_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_kana_attempts_wrong_needs_selection" CHECK ("user_kana_attempts"."is_correct" = true OR "user_kana_attempts"."selected_option_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "user_kana_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_kana_gate_results" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_kana_gate_results_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"phase_id" integer NOT NULL,
	"group_code" text,
	"passed" boolean NOT NULL,
	"scores_json" jsonb,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_kana_gate_results_group_code_range" CHECK ("user_kana_gate_results"."group_code" IS NULL OR "user_kana_gate_results"."group_code" ~ '^[A-J]$')
);
--> statement-breakpoint
ALTER TABLE "user_kana_gate_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_kana_lesson_progress" (
	"user_id" uuid NOT NULL,
	"lesson_id" integer NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"score_json" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "user_kana_lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
ALTER TABLE "user_kana_lesson_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_kana_mastery" (
	"user_id" uuid NOT NULL,
	"kana_id" integer NOT NULL,
	"skill" "kana_skill" NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"accuracy" real DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"srs_interval_days" integer DEFAULT 0 NOT NULL,
	"srs_ease" real DEFAULT 2.5 NOT NULL,
	"due_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "user_kana_mastery_user_id_kana_id_skill_pk" PRIMARY KEY("user_id","kana_id","skill")
);
--> statement-breakpoint
ALTER TABLE "user_kana_mastery" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "kana_characters" ADD CONSTRAINT "kana_characters_base_character_id_kana_characters_id_fk" FOREIGN KEY ("base_character_id") REFERENCES "public"."kana_characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kana_confusion_pairs" ADD CONSTRAINT "kana_confusion_pairs_kana_a_id_kana_characters_id_fk" FOREIGN KEY ("kana_a_id") REFERENCES "public"."kana_characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kana_confusion_pairs" ADD CONSTRAINT "kana_confusion_pairs_kana_b_id_kana_characters_id_fk" FOREIGN KEY ("kana_b_id") REFERENCES "public"."kana_characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kana_lesson_items" ADD CONSTRAINT "kana_lesson_items_lesson_id_kana_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."kana_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kana_lesson_items" ADD CONSTRAINT "kana_lesson_items_kana_id_kana_characters_id_fk" FOREIGN KEY ("kana_id") REFERENCES "public"."kana_characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kana_lesson_items" ADD CONSTRAINT "kana_lesson_items_word_id_kana_example_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."kana_example_words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kana_lessons" ADD CONSTRAINT "kana_lessons_phase_id_kana_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."kana_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kana_phases" ADD CONSTRAINT "kana_phases_module_id_kana_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."kana_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kana_word_characters" ADD CONSTRAINT "kana_word_characters_word_id_kana_example_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."kana_example_words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kana_word_characters" ADD CONSTRAINT "kana_word_characters_kana_id_kana_characters_id_fk" FOREIGN KEY ("kana_id") REFERENCES "public"."kana_characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_attempts" ADD CONSTRAINT "user_kana_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_attempts" ADD CONSTRAINT "user_kana_attempts_kana_id_kana_characters_id_fk" FOREIGN KEY ("kana_id") REFERENCES "public"."kana_characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_attempts" ADD CONSTRAINT "user_kana_attempts_word_id_kana_example_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."kana_example_words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_attempts" ADD CONSTRAINT "user_kana_attempts_lesson_id_kana_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."kana_lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_attempts" ADD CONSTRAINT "user_kana_attempts_selected_option_id_kana_characters_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."kana_characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_attempts" ADD CONSTRAINT "user_kana_attempts_correct_option_id_kana_characters_id_fk" FOREIGN KEY ("correct_option_id") REFERENCES "public"."kana_characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_gate_results" ADD CONSTRAINT "user_kana_gate_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_gate_results" ADD CONSTRAINT "user_kana_gate_results_phase_id_kana_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."kana_phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_lesson_progress" ADD CONSTRAINT "user_kana_lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_lesson_progress" ADD CONSTRAINT "user_kana_lesson_progress_lesson_id_kana_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."kana_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_mastery" ADD CONSTRAINT "user_kana_mastery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kana_mastery" ADD CONSTRAINT "user_kana_mastery_kana_id_kana_characters_id_fk" FOREIGN KEY ("kana_id") REFERENCES "public"."kana_characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kana_characters_script_character_key" ON "kana_characters" USING btree ("script","character");--> statement-breakpoint
CREATE UNIQUE INDEX "kana_confusion_pairs_pair_key" ON "kana_confusion_pairs" USING btree ("kana_a_id","kana_b_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kana_lesson_items_lesson_kana_key" ON "kana_lesson_items" USING btree ("lesson_id","kana_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kana_lesson_items_lesson_word_key" ON "kana_lesson_items" USING btree ("lesson_id","word_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kana_lessons_phase_code_key" ON "kana_lessons" USING btree ("phase_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "kana_phases_module_code_key" ON "kana_phases" USING btree ("module_id","code");--> statement-breakpoint
CREATE INDEX "kana_word_characters_kana_id_idx" ON "kana_word_characters" USING btree ("kana_id");--> statement-breakpoint
CREATE INDEX "user_kana_attempts_user_kana_idx" ON "user_kana_attempts" USING btree ("user_id","kana_id");--> statement-breakpoint
CREATE INDEX "user_kana_attempts_user_created_idx" ON "user_kana_attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_kana_gate_results_user_phase_idx" ON "user_kana_gate_results" USING btree ("user_id","phase_id");--> statement-breakpoint
CREATE INDEX "user_kana_mastery_due_at_idx" ON "user_kana_mastery" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "user_kana_mastery_user_skill_idx" ON "user_kana_mastery" USING btree ("user_id","skill");--> statement-breakpoint
CREATE POLICY "kana_characters_select_authenticated" ON "kana_characters" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "kana_confusion_pairs_select_authenticated" ON "kana_confusion_pairs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "kana_example_words_select_authenticated" ON "kana_example_words" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "kana_lesson_items_select_authenticated" ON "kana_lesson_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "kana_lessons_select_authenticated" ON "kana_lessons" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "kana_modules_select_authenticated" ON "kana_modules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "kana_phases_select_authenticated" ON "kana_phases" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "kana_word_characters_select_authenticated" ON "kana_word_characters" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "user_kana_attempts_select_own" ON "user_kana_attempts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_kana_attempts"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_kana_attempts_insert_own" ON "user_kana_attempts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("user_kana_attempts"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_kana_gate_results_select_own" ON "user_kana_gate_results" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_kana_gate_results"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_kana_gate_results_insert_own" ON "user_kana_gate_results" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("user_kana_gate_results"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_kana_lesson_progress_select_own" ON "user_kana_lesson_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_kana_lesson_progress"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_kana_lesson_progress_insert_own" ON "user_kana_lesson_progress" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("user_kana_lesson_progress"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_kana_lesson_progress_update_own" ON "user_kana_lesson_progress" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("user_kana_lesson_progress"."user_id" = auth.uid()) WITH CHECK ("user_kana_lesson_progress"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_kana_mastery_select_own" ON "user_kana_mastery" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_kana_mastery"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_kana_mastery_insert_own" ON "user_kana_mastery" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("user_kana_mastery"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_kana_mastery_update_own" ON "user_kana_mastery" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("user_kana_mastery"."user_id" = auth.uid()) WITH CHECK ("user_kana_mastery"."user_id" = auth.uid());