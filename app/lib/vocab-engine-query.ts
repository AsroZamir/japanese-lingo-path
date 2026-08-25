import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getPreN5ModuleOverview, type PreN5ModuleOverview, type PreN5StageSummary } from "@/app/lib/pre-n5-01-query";

// PROMPT-8 Bagian 4/6 — the Vocabulary Engine (V2.1 §6.3), first built
// for PRE-N5.03 but kept free of anything PRE-N5.03-specific in its
// data shape. Reuses getPreN5ModuleOverview as-is (already module-
// agnostic since Bagian 7's katakana generalization) — only the STAGE
// BUNDLE differs per "engine type" (kana vs vocab), not the outer
// module/stage list, locking, or delayed-gate logic.
export type VocabItem = {
  id: number;
  category: string;
  termKana: string;
  reading: string;
  meaningId: string;
  numericValue: number | null;
  isIrregular: boolean;
  irregularOfId: number | null;
  // PROMPT-10 Bagian 6 (PRE-N5.04) — null for every module that doesn't
  // use social register (numbers, katakana). registerOfId lets the UI
  // build a casual/formal bridge pair from the data, same shape as
  // irregularOfId but a distinct relationship (see db/schema/vocab.ts).
  register: "formal" | "casual" | null;
  registerOfId: number | null;
  audioUrl: string | null;
  // Second VOICEVOX speaker's narration — null for single-speaker
  // modules (PRE-N5.01-03). V2.1 §6.7 asks for cross-speaker recognition
  // practice specifically for the Interaction/Pragmatics Engine.
  audioUrlSpeaker2: string | null;
  mastery: { attempts: number; accuracyPercent: number; dueAt: string | null };
};

export type VocabUnit = {
  category: string;
  items: VocabItem[];
  regularItems: VocabItem[];
  irregularItems: VocabItem[];
};

export type VocabStageBundle = {
  module: PreN5ModuleOverview;
  stage: PreN5StageSummary;
  units: VocabUnit[];
  allItems: VocabItem[];
  konbiniSimulation: boolean;
  // PROMPT-10 Bagian 6 (PRE-N5.04) — BOSS stage config flag, same
  // pattern as konbiniSimulation: a capstone that's a different UI
  // (SapaanRoleplay.tsx) than the regular teaching lab.
  roleplayTransfer: boolean;
};

export const getVocabStageBundle = cache(
  async (stageCode: string, moduleCode: string): Promise<VocabStageBundle | null> => {
    const moduleOverview = await getPreN5ModuleOverview(moduleCode);
    if (!moduleOverview) return null;
    const stage = moduleOverview.stages.find((candidate) => candidate.code === stageCode);
    if (!stage) return null;

    const categories = Array.isArray(stage.configuration.categories)
      ? (stage.configuration.categories as string[])
      : [];
    if (categories.length === 0) {
      return { module: moduleOverview, stage, units: [], allItems: [], konbiniSimulation: false, roleplayTransfer: false };
    }

    const supabase = await createClient();
    const moduleRow = await supabase
      .from("learning_modules")
      .select("id")
      .eq("code", moduleCode)
      .maybeSingle();
    if (!moduleRow.data) return null;

    const { data: itemRows, error: itemError } = await supabase
      .from("vocab_items")
      .select(
        "id, category, term_kana, reading, meaning_id, numeric_value, is_irregular, irregular_of, register, register_of, audio_url, audio_url_speaker_2, order_index",
      )
      .eq("module_id", moduleRow.data.id)
      .in("category", categories)
      .order("order_index");
    if (itemError) throw new Error(itemError.message);

    const itemIds = (itemRows ?? []).map((row) => row.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: masteryRows, error: masteryError } =
      user && itemIds.length > 0
        ? await supabase
            .from("user_vocab_mastery")
            .select("item_id, attempts, correct, due_at")
            .eq("user_id", user.id)
            .in("item_id", itemIds)
        : { data: [], error: null };
    if (masteryError) throw new Error(masteryError.message);

    const masteryByItemId = new Map<number, { attempts: number; correct: number; dueAt: string | null }>();
    for (const row of masteryRows ?? []) {
      const current = masteryByItemId.get(row.item_id) ?? { attempts: 0, correct: 0, dueAt: null };
      current.attempts += row.attempts;
      current.correct += row.correct;
      if (row.due_at && (!current.dueAt || row.due_at < current.dueAt)) current.dueAt = row.due_at;
      masteryByItemId.set(row.item_id, current);
    }

    const allItems: VocabItem[] = (itemRows ?? []).map((row) => {
      const masteryRaw = masteryByItemId.get(row.id) ?? { attempts: 0, correct: 0, dueAt: null };
      return {
        id: row.id,
        category: row.category,
        termKana: row.term_kana,
        reading: row.reading,
        meaningId: row.meaning_id,
        numericValue: row.numeric_value,
        isIrregular: row.is_irregular,
        irregularOfId: row.irregular_of,
        register: row.register as "formal" | "casual" | null,
        registerOfId: row.register_of,
        audioUrl: row.audio_url,
        audioUrlSpeaker2: row.audio_url_speaker_2,
        mastery: {
          attempts: masteryRaw.attempts,
          accuracyPercent: masteryRaw.attempts > 0 ? Math.round((masteryRaw.correct / masteryRaw.attempts) * 100) : 0,
          dueAt: masteryRaw.dueAt,
        },
      };
    });

    const units: VocabUnit[] = categories.map((category) => {
      const items = allItems.filter((item) => item.category === category);
      return {
        category,
        items,
        regularItems: items.filter((item) => !item.isIrregular),
        irregularItems: items.filter((item) => item.isIrregular),
      };
    });

    return {
      module: moduleOverview,
      stage,
      units,
      allItems,
      konbiniSimulation: stage.configuration.konbiniSimulation === true,
      roleplayTransfer: stage.configuration.roleplayTransfer === true,
    };
  },
);
