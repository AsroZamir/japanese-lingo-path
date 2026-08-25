import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Development-only switch to unlock every learning stage regardless of
 * prerequisites or delayed (retention) gates. Read from a single place so
 * every enforcement point (page-level lock, server action re-checks) stays
 * in sync. See CLAUDE.md for how to turn this off before a commercial
 * release — it must be off (or unset) for real learners.
 *
 * PROMPT-10 Bagian 1 — was NEXT_PUBLIC_DEV_UNLOCK_ALL, an env var
 * inlined at BUILD time; changing it in Vercel's dashboard does nothing
 * until the next build, which is why it appeared "on" but stayed locked
 * in production. Replaced with a per-request DB read
 * (dev_unlock_flags, keyed to the owner's own user id) — flip a row,
 * no redeploy needed. Now async; every call site awaits it.
 */
export const isDevUnlockAllActive = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("dev_unlock_flags")
    .select("enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return false;
  return data.enabled === true;
});
