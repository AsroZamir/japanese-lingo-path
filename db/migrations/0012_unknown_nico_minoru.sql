ALTER TABLE "vocab_items" ADD COLUMN "register" text;--> statement-breakpoint
ALTER TABLE "vocab_items" ADD COLUMN "register_of" integer;--> statement-breakpoint
ALTER TABLE "vocab_items" ADD COLUMN "audio_url_speaker_2" text;--> statement-breakpoint
ALTER TABLE "vocab_items" ADD CONSTRAINT "vocab_items_register_of_vocab_items_id_fk" FOREIGN KEY ("register_of") REFERENCES "public"."vocab_items"("id") ON DELETE no action ON UPDATE no action;