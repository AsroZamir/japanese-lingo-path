CREATE TABLE "sensei_segments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sensei_segments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"module_id" integer NOT NULL,
	"stage_id" integer,
	"kana_id" integer,
	"segment_type" text NOT NULL,
	"order_index" integer NOT NULL,
	"board_text" text NOT NULL,
	"visual_action" jsonb DEFAULT '{"kind":"text"}'::jsonb NOT NULL,
	"sensei_pose" text DEFAULT 'neutral' NOT NULL,
	"narration_text" text,
	"narration_url" text,
	"content_version" text DEFAULT 'v1' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sensei_segments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sensei_segments" ADD CONSTRAINT "sensei_segments_module_id_learning_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."learning_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensei_segments" ADD CONSTRAINT "sensei_segments_stage_id_learning_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."learning_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensei_segments" ADD CONSTRAINT "sensei_segments_kana_id_kana_characters_id_fk" FOREIGN KEY ("kana_id") REFERENCES "public"."kana_characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sensei_segments_group_order_key" ON "sensei_segments" USING btree ("module_id","segment_type","stage_id","kana_id","order_index");--> statement-breakpoint
CREATE INDEX "sensei_segments_module_idx" ON "sensei_segments" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "sensei_segments_kana_idx" ON "sensei_segments" USING btree ("kana_id");--> statement-breakpoint
CREATE POLICY "sensei_segments_select_authenticated" ON "sensei_segments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);