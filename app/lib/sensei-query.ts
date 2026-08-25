import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseVisualAction, type SenseiVisualAction } from "@/app/lib/sensei-types";
import type { SenseiPose, SenseiSegmentType } from "@/db/schema/sensei";

export type SenseiSegmentRow = {
  id: number;
  orderIndex: number;
  boardText: string;
  visualAction: SenseiVisualAction;
  senseiPose: SenseiPose;
  narrationUrl: string | null;
  // Only meaningful for segmentType 'writing_demo' — resolved server-side
  // here so SenseiWritingDemo only needs to fetch the stroke JSON itself
  // client-side (same fetch pattern as HiraganaLearningLab's useStrokeData).
  kanaId: number | null;
  kanaCharacter: string | null;
  strokeDataUrl: string | null;
};

// One query, three shapes of caller: module_intro (stageId omitted),
// phase_intro/concept_moment (stageId required), writing_demo (kanaId
// required instead of stageId). All rows sharing the same grouping key
// come back ordered — the caller plays them as one sequence.
export const getSenseiSegments = cache(
  async (
    moduleCode: string,
    segmentType: SenseiSegmentType,
    opts?: { stageCode?: string; kanaId?: number },
  ): Promise<SenseiSegmentRow[]> => {
    const supabase = await createClient();
    const { data: moduleRow } = await supabase
      .from("learning_modules")
      .select("id")
      .eq("code", moduleCode)
      .maybeSingle();
    if (!moduleRow) return [];

    let query = supabase
      .from("sensei_segments")
      .select("id, order_index, board_text, visual_action, sensei_pose, narration_url, kana_id, stage_id")
      .eq("module_id", moduleRow.id)
      .eq("segment_type", segmentType)
      .order("order_index");

    if (opts?.stageCode) {
      const { data: stageRow } = await supabase
        .from("learning_stages")
        .select("id")
        .eq("module_id", moduleRow.id)
        .eq("code", opts.stageCode)
        .maybeSingle();
      if (!stageRow) return [];
      query = query.eq("stage_id", stageRow.id);
    }
    if (opts?.kanaId != null) {
      query = query.eq("kana_id", opts.kanaId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const kanaIds = [...new Set((data ?? []).map((row) => row.kana_id).filter((id): id is number => id != null))];
    const kanaById = new Map<number, { character: string; strokeDataKey: string | null }>();
    if (kanaIds.length > 0) {
      const { data: kanaRows, error: kanaError } = await supabase
        .from("kana_characters")
        .select("id, character, stroke_data_key")
        .in("id", kanaIds);
      if (kanaError) throw new Error(kanaError.message);
      for (const row of kanaRows ?? []) {
        kanaById.set(row.id, { character: row.character, strokeDataKey: row.stroke_data_key });
      }
    }

    return (data ?? []).map((row) => {
      const kana = row.kana_id != null ? kanaById.get(row.kana_id) : undefined;
      return {
        id: row.id,
        orderIndex: row.order_index,
        boardText: row.board_text,
        visualAction: parseVisualAction(row.visual_action),
        senseiPose: (row.sensei_pose as SenseiPose) ?? "neutral",
        narrationUrl: row.narration_url,
        kanaId: row.kana_id,
        kanaCharacter: kana?.character ?? null,
        strokeDataUrl: kana?.strokeDataKey ? "/kana-strokes/" + kana.strokeDataKey + ".json" : null,
      };
    });
  },
);

// concept_moment segments for a stage play immediately after that
// stage's phase_intro, as one continuous sequence (see
// docs/POLA-MODUL-BARU.md-style reasoning in the report: a second popup
// right after the first would feel jarring) — this helper fetches both
// and concatenates them in the right order.
export const getStageOpeningSegments = cache(
  async (moduleCode: string, stageCode: string): Promise<SenseiSegmentRow[]> => {
    const [phaseIntro, conceptMoment] = await Promise.all([
      getSenseiSegments(moduleCode, "phase_intro", { stageCode }),
      getSenseiSegments(moduleCode, "concept_moment", { stageCode }),
    ]);
    return [...phaseIntro, ...conceptMoment];
  },
);
