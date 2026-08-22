import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_CURRICULUM_CODE = "v2";
const ACTIVE_LEVEL_CODE = "PRE-N5";

const MODULE_TYPE_LABEL: Record<string, string> = {
  SCR: "Script Mastery",
  VOC: "Vocabulary",
  GRA: "Grammar",
  FUN: "Functional",
  LIS: "Listening",
  REA: "Reading",
  BOS: "Boss Battle",
};

export type CurriculumModuleSummary = {
  code: string;
  title: string;
  description: string;
  methodName: string;
  moduleType: string;
  moduleTypeLabel: string;
  icon: string;
  contentStatus: "scaffold" | "building" | "ready" | "retired";
  statusLabel: string;
  percentComplete: number;
  locked: boolean;
  unlockNote: string | null;
  stageCount: number;
  estimatedHours: string;
};

export const getCurriculumV2ModuleSummaries = cache(
  async (): Promise<CurriculumModuleSummary[]> => {
    const supabase = await createClient();

    const { data: version } = await supabase
      .from("curriculum_versions")
      .select("id")
      .eq("code", ACTIVE_CURRICULUM_CODE)
      .maybeSingle();
    if (!version) return [];

    const { data: level } = await supabase
      .from("curriculum_levels")
      .select("id")
      .eq("version_id", version.id)
      .eq("code", ACTIVE_LEVEL_CODE)
      .maybeSingle();
    if (!level) return [];

    const { data: moduleRows } = await supabase
      .from("learning_modules")
      .select(
        "id, code, title, description, method_name, module_type, order_index, estimated_minutes_min, estimated_minutes_max, icon, status",
      )
      .eq("level_id", level.id)
      .neq("status", "retired")
      .order("order_index");

    if (!moduleRows?.length) return [];

    const moduleIds = moduleRows.map((module) => module.id);
    const [
      { data: prerequisiteRows },
      { data: stageRows },
      {
        data: { user },
      },
    ] = await Promise.all([
      supabase
        .from("learning_module_prerequisites")
        .select("module_id, prerequisite_module_id")
        .in("module_id", moduleIds),
      supabase.from("learning_stages").select("module_id").in("module_id", moduleIds),
      supabase.auth.getUser(),
    ]);

    const { data: progressRows } = user
      ? await supabase
          .from("user_learning_module_progress")
          .select("module_id, status, percent_complete")
          .eq("user_id", user.id)
          .in("module_id", moduleIds)
      : { data: [] };

    const prerequisiteIdsByModule = new Map<number, number[]>();
    for (const prerequisite of prerequisiteRows ?? []) {
      const current = prerequisiteIdsByModule.get(prerequisite.module_id) ?? [];
      current.push(prerequisite.prerequisite_module_id);
      prerequisiteIdsByModule.set(prerequisite.module_id, current);
    }

    const stageCountByModule = new Map<number, number>();
    for (const stage of stageRows ?? []) {
      stageCountByModule.set(stage.module_id, (stageCountByModule.get(stage.module_id) ?? 0) + 1);
    }

    const progressByModule = new Map(
      (progressRows ?? []).map((progress) => [progress.module_id, progress]),
    );
    const completedModuleIds = new Set(
      (progressRows ?? [])
        .filter((progress) => progress.status === "completed")
        .map((progress) => progress.module_id),
    );
    const codeById = new Map(moduleRows.map((module) => [module.id, module.code]));

    return moduleRows.map((module): CurriculumModuleSummary => {
      const prerequisiteIds = prerequisiteIdsByModule.get(module.id) ?? [];
      const missingPrerequisites = prerequisiteIds.filter(
        (prerequisiteId) => !completedModuleIds.has(prerequisiteId),
      );
      const locked = missingPrerequisites.length > 0;
      const progress = progressByModule.get(module.id);
      const percentComplete = progress?.percent_complete ?? 0;
      const contentStatus = module.status as CurriculumModuleSummary["contentStatus"];

      const unlockNote =
        missingPrerequisites.length === 0
          ? null
          : missingPrerequisites.length >= 5
            ? "Selesaikan seluruh modul Pre-N5"
            : "Selesaikan " +
              missingPrerequisites
                .map((prerequisiteId) => codeById.get(prerequisiteId))
                .filter(Boolean)
                .join(", ");

      const statusLabel = locked
        ? "Terkunci"
        : contentStatus === "building"
          ? "Sedang dibangun"
          : contentStatus === "scaffold"
            ? "Kerangka siap"
            : progress?.status === "completed"
              ? "Selesai"
              : percentComplete > 0
                ? "Sedang berjalan"
                : "Siap dipelajari";

      const minHours = module.estimated_minutes_min / 60;
      const maxHours = module.estimated_minutes_max / 60;
      const estimatedHours =
        minHours === maxHours ? minHours + " jam" : minHours + "-" + maxHours + " jam";

      return {
        code: module.code,
        title: module.title,
        description: module.description,
        methodName: module.method_name,
        moduleType: module.module_type,
        moduleTypeLabel: MODULE_TYPE_LABEL[module.module_type] ?? module.module_type,
        icon: module.icon,
        contentStatus,
        statusLabel,
        percentComplete,
        locked,
        unlockNote,
        stageCount: stageCountByModule.get(module.id) ?? 0,
        estimatedHours,
      };
    });
  },
);
