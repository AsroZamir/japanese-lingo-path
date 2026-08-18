import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Which kana_modules rows actually exist right now — used to decide, per
// legacy curriculum-data.ts unit, whether it has a real DB-backed
// equivalent yet (see app/lib/legacy-module-bridge.ts) or should stay
// disabled behind "Belum tersedia" on /belajar.
export const getExistingKanaModuleCodes = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("kana_modules").select("code");
  return new Set((data ?? []).map((row) => row.code));
});
