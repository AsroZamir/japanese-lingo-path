CREATE TABLE "user_vocab_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_vocab_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"exercise_type" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"typed_value" text,
	"error_type" text,
	"response_time_ms" integer,
	"first_attempt_correct" boolean,
	"hint_level" integer,
	"assisted" boolean,
	"phase_code" text,
	"curriculum_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_vocab_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_vocab_mastery" (
	"user_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"skill" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"accuracy" real DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"srs_interval_days" integer DEFAULT 0 NOT NULL,
	"srs_ease" real DEFAULT 2.5 NOT NULL,
	"due_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "user_vocab_mastery_user_id_item_id_skill_pk" PRIMARY KEY("user_id","item_id","skill")
);
--> statement-breakpoint
ALTER TABLE "user_vocab_mastery" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vocab_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vocab_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"module_id" integer NOT NULL,
	"category" text NOT NULL,
	"term_kana" text NOT NULL,
	"reading" text NOT NULL,
	"meaning_id" text NOT NULL,
	"numeric_value" real,
	"is_irregular" boolean DEFAULT false NOT NULL,
	"irregular_of" integer,
	"audio_url" text,
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vocab_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_vocab_attempts" ADD CONSTRAINT "user_vocab_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocab_attempts" ADD CONSTRAINT "user_vocab_attempts_item_id_vocab_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."vocab_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocab_mastery" ADD CONSTRAINT "user_vocab_mastery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocab_mastery" ADD CONSTRAINT "user_vocab_mastery_item_id_vocab_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."vocab_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_items" ADD CONSTRAINT "vocab_items_module_id_learning_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."learning_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_items" ADD CONSTRAINT "vocab_items_irregular_of_vocab_items_id_fk" FOREIGN KEY ("irregular_of") REFERENCES "public"."vocab_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_vocab_attempts_user_item_idx" ON "user_vocab_attempts" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE INDEX "user_vocab_attempts_user_created_idx" ON "user_vocab_attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_vocab_mastery_due_at_idx" ON "user_vocab_mastery" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vocab_items_module_category_order_key" ON "vocab_items" USING btree ("module_id","category","order_index");--> statement-breakpoint
CREATE INDEX "vocab_items_module_idx" ON "vocab_items" USING btree ("module_id");--> statement-breakpoint
CREATE POLICY "user_vocab_attempts_select_own" ON "user_vocab_attempts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_vocab_attempts"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_vocab_attempts_insert_own" ON "user_vocab_attempts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("user_vocab_attempts"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_vocab_mastery_select_own" ON "user_vocab_mastery" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_vocab_mastery"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_vocab_mastery_insert_own" ON "user_vocab_mastery" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("user_vocab_mastery"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_vocab_mastery_update_own" ON "user_vocab_mastery" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("user_vocab_mastery"."user_id" = auth.uid()) WITH CHECK ("user_vocab_mastery"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "vocab_items_select_authenticated" ON "vocab_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);