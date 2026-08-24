import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getHiraganaMasteryMap } from "@/app/lib/mastery-map-query";

const MIN_POOL_FOR_UNLOCK = 10;
const SESSION_SIZE = 25;

export type SpeedDrillItem = {
  id: number;
  character: string;
  romaji: string;
  audioUrl: string | null;
};

export type SpeedDrillSession = {
  unlocked: boolean;
  items: SpeedDrillItem[];
  baselineMs: number | null;
  eligibleCount: number;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// PROMPT-7 Bagian 4 — V2.1 Bagian 4.3's rule "hanya terbuka setelah
// akurasi stabil pada dua set" is interpreted here as: at least
// MIN_POOL_FOR_UNLOCK (10 — one batch's worth) characters have already
// reached "Bisa diingat" (retrievable) or higher on the real 5-tier
// mastery map (mastery-tier.ts). Below that, there just isn't a stable
// enough pool yet — the page shows why instead of a session.
export const getSpeedDrillSession = cache(async (): Promise<SpeedDrillSession> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const masteryMap = await getHiraganaMasteryMap();
  const eligible = masteryMap.filter(
    (entry) => entry.tier === "retrievable" || entry.tier === "durable" || entry.tier === "transferable",
  );

  if (!user || eligible.length < MIN_POOL_FOR_UNLOCK) {
    return { unlocked: false, items: [], baselineMs: null, eligibleCount: eligible.length };
  }

  const { data: kanaRows, error: kanaError } = await supabase
    .from("kana_characters")
    .select("id, character, romaji, audio_url")
    .in(
      "id",
      eligible.map((entry) => entry.id),
    );
  if (kanaError) throw new Error(kanaError.message);

  const items: SpeedDrillItem[] = shuffle(
    (kanaRows ?? []).map((row) => ({
      id: row.id,
      character: row.character,
      romaji: row.romaji,
      audioUrl: row.audio_url,
    })),
  ).slice(0, SESSION_SIZE);

  // Personal baseline: this user's own average response time across
  // every attempt that recorded one, any exercise type — the point of
  // comparison is "faster than I used to be", not a fixed target.
  const { data: timedRows, error: timedError } = await supabase
    .from("user_kana_attempts")
    .select("response_time_ms")
    .eq("user_id", user.id)
    .not("response_time_ms", "is", null);
  if (timedError) throw new Error(timedError.message);

  const times = (timedRows ?? []).map((row) => row.response_time_ms as number).filter((ms) => ms > 0);
  const baselineMs = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  return { unlocked: true, items, baselineMs, eligibleCount: eligible.length };
});
