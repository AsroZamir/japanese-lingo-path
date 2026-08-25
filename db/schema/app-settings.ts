import { sql } from "drizzle-orm";
import { boolean, pgPolicy, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers, authenticatedRole } from "drizzle-orm/supabase";

// PROMPT-10 Bagian 1 — replaces NEXT_PUBLIC_DEV_UNLOCK_ALL. That env var
// is inlined into the JS bundle at BUILD time (Next.js's own documented
// behavior for anything prefixed NEXT_PUBLIC_), so adding/changing it in
// Vercel's dashboard does nothing until the next build — the exact bug
// PROMPT-10 reported ("kartu modul masih terkunci di production" even
// though the flag was supposedly on). A DB row read per-request has no
// such staleness: flip it, refresh, done — no redeploy.
//
// Scoped per-user (not a single global boolean) on purpose: only the
// owner's own account should ever see everything unlocked, never a real
// learner's session even if this table somehow gained more rows later.
export const devUnlockFlags = pgTable(
  "dev_unlock_flags",
  {
    userId: uuid("user_id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    // A user may read (and the app checks) only their OWN row — this is
    // not an admin table, just "does this signed-in user have the flag".
    pgPolicy("dev_unlock_flags_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
    }),
  ],
);
