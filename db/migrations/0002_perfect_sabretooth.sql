CREATE TYPE "public"."lesson_content_block_type" AS ENUM('text', 'chart', 'table', 'audio_list', 'dialogue', 'callout');--> statement-breakpoint
CREATE TABLE "lesson_content_blocks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lesson_content_blocks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lesson_id" integer NOT NULL,
	"order_index" integer NOT NULL,
	"block_type" "lesson_content_block_type" NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_content_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lesson_exercises" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lesson_exercises_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lesson_id" integer NOT NULL,
	"order_index" integer NOT NULL,
	"exercise_type" text NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb,
	"correct_option_id" integer,
	"explanation" text,
	"audio_url" text
);
--> statement-breakpoint
ALTER TABLE "lesson_exercises" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lesson_content_blocks" ADD CONSTRAINT "lesson_content_blocks_lesson_id_kana_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."kana_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_exercises" ADD CONSTRAINT "lesson_exercises_lesson_id_kana_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."kana_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_content_blocks_lesson_order_key" ON "lesson_content_blocks" USING btree ("lesson_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_exercises_lesson_order_key" ON "lesson_exercises" USING btree ("lesson_id","order_index");--> statement-breakpoint
CREATE POLICY "lesson_content_blocks_select_authenticated" ON "lesson_content_blocks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "lesson_exercises_select_authenticated" ON "lesson_exercises" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);