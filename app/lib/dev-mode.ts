/**
 * Development-only switch to unlock every learning stage regardless of
 * prerequisites or delayed (retention) gates. Read from a single place so
 * every enforcement point (page-level lock, server action re-checks) stays
 * in sync. See CLAUDE.md for how to turn this off before a commercial
 * release — it must be off (or unset) in production once real learners
 * other than the owner are using the site.
 */
export function isDevUnlockAllActive(): boolean {
  return process.env.NEXT_PUBLIC_DEV_UNLOCK_ALL === "true";
}
