ALTER TABLE "user_kana_attempts" ADD COLUMN "first_attempt_correct" boolean;--> statement-breakpoint
ALTER TABLE "user_kana_attempts" ADD COLUMN "hint_level" integer;--> statement-breakpoint
ALTER TABLE "user_kana_attempts" ADD COLUMN "assisted" boolean;--> statement-breakpoint
ALTER TABLE "user_kana_attempts" ADD COLUMN "phase_code" text;--> statement-breakpoint
ALTER TABLE "user_kana_attempts" ADD COLUMN "curriculum_version" text;