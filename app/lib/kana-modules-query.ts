import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Which kana_modules rows actually exist right now — /belajar and
// /beranda only ever show modules seeded here, nothing hardcoded.
export const getExistingKanaModuleCodes = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("kana_modules").select("code");
  return new Set((data ?? []).map((row) => row.code));
});
