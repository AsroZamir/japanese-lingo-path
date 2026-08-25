CREATE TABLE "dev_unlock_flags" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dev_unlock_flags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dev_unlock_flags" ADD CONSTRAINT "dev_unlock_flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "dev_unlock_flags_select_own" ON "dev_unlock_flags" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.uid());