import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  HIRAGANA_BASIC_CHARACTERS,
  HIRAGANA_LAB_MNEMONICS,
  HIRAGANA_LAB_VERSION,
  HIRAGANA_MNEMONICS,
  type HiraganaMnemonic,
} from "@/app/lib/hiragana-mnemonics";

const CURRICULUM_CODE = "v2";
const LEVEL_CODE = "PRE-N5";
const HIRAGANA_MODULE_CODE = "PRE-N5.01";
export type LearningProgressStatus = "not_started" | "in_progress" | "completed";
export type HiraganaType = "basic" | "dakuten" | "handakuten" | "youon" | "sokuon";

export type PreN5StageSummary = {
  id: number;
  code: string;
  title: string;
  stageKind: string;
  mechanic: string;
  description: string;
  orderIndex: number;
  contentStatus: "scaffold" | "building" | "ready" | "retired";
  configuration: Record<string, unknown>;
  passCriteria: Record<string, unknown>;
  progressStatus: LearningProgressStatus;
  score: number | null;
  attempts: number;
  state: Record<string, unknown>;
  locked: boolean;
  statusLabel: string;
};

export type PreN5ModuleOverview = {
  id: number;
  code: string;
  title: string;
  description: string;
  objective: string;
  methodName: string;
  icon: string;
  estimatedHours: string;
  percentComplete: number;
  completedStageCount: number;
  stages: PreN5StageSummary[];
  nextStageCode: string | null;
};

export type HiraganaExample = {
  id: number;
  wordKana: string;
  romaji: string;
  meaning: string;
  audioUrl: string | null;
};

export type HiraganaMastery = {
  attempts: number;
  accuracyPercent: number;
  dueAt: string | null;
  weak: boolean;
  due: boolean;
};

export type HiraganaLearningItem = {
  id: number;
  character: string;
  romaji: string;
  type: HiraganaType;
  groupCode: string | null;
  orderInGroup: number | null;
  audioUrl: string | null;
  strokeDataUrl: string | null;
  baseCharacter: string | null;
  mnemonic: HiraganaMnemonic;
  examples: HiraganaExample[];
  mastery: HiraganaMastery;
};

export type HiraganaUnit = {
  code: string;
  title: string;
  description: string;
  items: HiraganaLearningItem[];
};

export type HiraganaStageBundle = {
  module: PreN5ModuleOverview;
  stage: PreN5StageSummary;
  items: HiraganaLearningItem[];
  units: HiraganaUnit[];
};

function estimatedHours(minMinutes: number, maxMinutes: number): string {
  const formatter = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  });
  const minHours = Math.round((minMinutes / 60) * 10) / 10;
  const maxHours = Math.round((maxMinutes / 60) * 10) / 10;
  return minHours === maxHours
    ? formatter.format(minHours) + " jam"
    : formatter.format(minHours) + "\u2013" + formatter.format(maxHours) + " jam";
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const getPreN5ModuleOverview = cache(
  async (moduleCode: string): Promise<PreN5ModuleOverview | null> => {
    const supabase = await createClient();

    const { data: version, error: versionError } = await supabase
      .from("curriculum_versions")
      .select("id")
      .eq("code", CURRICULUM_CODE)
      .maybeSingle();
    if (versionError) throw new Error(versionError.message);
    if (!version) return null;

    const { data: level, error: levelError } = await supabase
      .from("curriculum_levels")
      .select("id")
      .eq("version_id", version.id)
      .eq("code", LEVEL_CODE)
      .maybeSingle();
    if (levelError) throw new Error(levelError.message);
    if (!level) return null;

    const { data: moduleRow, error: moduleError } = await supabase
      .from("learning_modules")
      .select(
        "id, code, title, description, objective, method_name, icon, estimated_minutes_min, estimated_minutes_max, status",
      )
      .eq("level_id", level.id)
      .eq("code", moduleCode)
      .neq("status", "retired")
      .maybeSingle();
    if (moduleError) throw new Error(moduleError.message);
    if (!moduleRow) return null;

    const { data: stageRows, error: stageError } = await supabase
      .from("learning_stages")
      .select(
        "id, code, title, stage_kind, mechanic, description, order_index, status, configuration, pass_criteria",
      )
      .eq("module_id", moduleRow.id)
      .neq("status", "retired")
      .order("order_index");
    if (stageError) throw new Error(stageError.message);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const stageIds = (stageRows ?? []).map((stage) => stage.id);
    const { data: progressRows, error: progressError } =
      user && stageIds.length > 0
        ? await supabase
            .from("user_learning_stage_progress")
            .select("stage_id, status, score, attempts, state")
            .eq("user_id", user.id)
            .in("stage_id", stageIds)
        : { data: [], error: null };
    if (progressError) throw new Error(progressError.message);

    const progressByStageId = new Map(
      (progressRows ?? []).map((progress) => [progress.stage_id, progress]),
    );

    const completedStageCodes = new Set(
      (stageRows ?? [])
        .filter((stage) => {
          const progress = progressByStageId.get(stage.id);
          const progressState = asObject(progress?.state);
          return (
            progressState.labVersion === HIRAGANA_LAB_VERSION &&
            progress?.status === "completed"
          );
        })
        .map((stage) => stage.code),
    );

    const stages = (stageRows ?? []).map((stage): PreN5StageSummary => {
      const progress = progressByStageId.get(stage.id);
      const progressState = asObject(progress?.state);
      const progressIsCurrent =
        progressState.labVersion === HIRAGANA_LAB_VERSION;
      const progressStatus =
        progressIsCurrent
          ? (progress?.status as LearningProgressStatus | undefined) ?? "not_started"
          : "not_started";
      const contentStatus = stage.status as PreN5StageSummary["contentStatus"];
      const stageIndex = (stageRows ?? []).findIndex((candidate) => candidate.id === stage.id);
      const previousStage = stageIndex > 0 ? (stageRows ?? [])[stageIndex - 1] : null;
      const prerequisites = previousStage ? [previousStage.code] : [];
      const locked =
        prerequisites.some((code) => !completedStageCodes.has(code)) ||
        contentStatus !== "ready";
      const summary: PreN5StageSummary = {
        id: stage.id,
        code: stage.code,
        title: stage.title,
        stageKind: stage.stage_kind,
        mechanic: stage.mechanic,
        description: stage.description,
        orderIndex: stage.order_index,
        contentStatus,
        configuration: asObject(stage.configuration),
        passCriteria: asObject(stage.pass_criteria),
        progressStatus,
        score: progressIsCurrent ? progress?.score ?? null : null,
        attempts: progressIsCurrent ? progress?.attempts ?? 0 : 0,
        state: progressIsCurrent ? progressState : {},
        locked,
        statusLabel: locked
          ? contentStatus === "ready"
            ? "Selesaikan tahap sebelumnya"
            : "Sedang dibangun"
          : progressStatus === "completed"
            ? "Selesai"
            : progressStatus === "in_progress"
              ? "Lanjutkan"
              : "Mulai",
      };
      return summary;
    });

    const completedStageCount = stages.filter(
      (stage) => stage.progressStatus === "completed",
    ).length;
    const percentComplete =
      stages.length > 0 ? Math.round((completedStageCount / stages.length) * 100) : 0;
    const nextStage =
      stages.find((stage) => !stage.locked && stage.progressStatus !== "completed") ?? null;

    return {
      id: moduleRow.id,
      code: moduleRow.code,
      title: moduleRow.title,
      description: moduleRow.description,
      objective: moduleRow.objective,
      methodName: moduleRow.method_name,
      icon: moduleRow.icon,
      estimatedHours: estimatedHours(
        moduleRow.estimated_minutes_min,
        moduleRow.estimated_minutes_max,
      ),
      percentComplete,
      completedStageCount,
      stages,
      nextStageCode: nextStage?.code ?? null,
    };
  },
);

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function buildUnits(items: HiraganaLearningItem[]): HiraganaUnit[] {
  const units: HiraganaUnit[] = [];
  const basicGroups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  for (const groupCode of basicGroups) {
    const groupItems = items.filter(
      (item) => item.type === "basic" && item.groupCode === groupCode,
    );
    if (groupItems.length === 0) continue;
    units.push({
      code: "basic-" + groupCode,
      title: "Hiragana Dasar · Kelompok " + groupCode,
      description: groupItems.map((item) => item.character).join(" · "),
      items: groupItems,
    });
  }

  const modifiedTypes: {
    type: HiraganaType;
    title: string;
    description: string;
  }[] = [
    {
      type: "dakuten",
      title: "Dakuten",
      description: "Tanda ゛mengubah bunyi dasar menjadi lebih berat.",
    },
    {
      type: "handakuten",
      title: "Handakuten",
      description: "Tanda bulat ゜mengubah baris H menjadi bunyi P.",
    },
    {
      type: "youon",
      title: "Kombinasi Yoon",
      description: "Kana dasar bertemu ゃ, ゅ, atau ょ kecil.",
    },
    {
      type: "sokuon",
      title: "Sokuon",
      description: "っ kecil memberi jeda dan menggandakan konsonan berikutnya.",
    },
  ];

  for (const definition of modifiedTypes) {
    const groups = chunk(
      items.filter((item) => item.type === definition.type),
      5,
    );
    groups.forEach((groupItems, index) => {
      units.push({
        code: definition.type + "-" + (index + 1),
        title:
          definition.title + (groups.length > 1 ? " · Bagian " + (index + 1) : ""),
        description: definition.description,
        items: groupItems,
      });
    });
  }

  return units;
}

function modifiedMnemonic(
  type: HiraganaType,
  character: string,
  romaji: string,
  baseCharacter: string | null,
): HiraganaMnemonic {
  if (type === "dakuten") {
    return {
      emoji: "🔔",
      title: "Dua tanda membuat bunyi bergetar",
      story:
        "Tambahkan ゛pada " +
        (baseCharacter ?? "huruf dasar") +
        ". Suaranya bergetar lebih berat dan berubah menjadi " +
        character +
        " ('" +
        romaji +
        "').",
    };
  }
  if (type === "handakuten") {
    return {
      emoji: "⭕",
      title: "Lingkaran kecil meletupkan bunyi P",
      story:
        "Lingkaran ゜menempel pada " +
        (baseCharacter ?? "huruf dasar") +
        " seperti gelembung yang meletup. Hasilnya " +
        character +
        " ('" +
        romaji +
        "').",
    };
  }
  if (type === "youon") {
    return {
      emoji: "🔗",
      title: "Dua kana melebur menjadi satu bunyi",
      story:
        (baseCharacter ?? "Kana dasar") +
        " merangkul ゃ, ゅ, atau ょ kecil. Keduanya dibaca cepat sebagai " +
        character +
        " ('" +
        romaji +
        "'), bukan dua bunyi terpisah.",
    };
  }
  return {
    emoji: "⏸️",
    title: "Jeda kecil sebelum konsonan",
    story:
      character +
      " adalah っ kecil. Ia menahan napas sesaat lalu menggandakan konsonan kata berikutnya.",
  };
}
export const getHiraganaStageBundle = cache(
  async (stageCode: string): Promise<HiraganaStageBundle | null> => {
    const moduleOverview = await getPreN5ModuleOverview(HIRAGANA_MODULE_CODE);
    if (!moduleOverview) return null;
    const stage = moduleOverview.stages.find((candidate) => candidate.code === stageCode);
    if (!stage) return null;

    const supabase = await createClient();
    const { data: rows, error: kanaError } = await supabase
      .from("kana_characters")
      .select(
        "id, character, romaji, type, group_code, order_in_group, base_character_id, audio_url, stroke_data_key",
      )
      .eq("script", "hiragana")
      .in("character", [...HIRAGANA_BASIC_CHARACTERS]);
    if (kanaError) throw new Error(kanaError.message);

    const defaultScopes: Record<string, {
      batchStart: number;
      newCharacterCount: number;
      cumulativeCharacterCount: number;
    }> = {
      F1: { batchStart: 0, newCharacterCount: 10, cumulativeCharacterCount: 10 },
      F2: { batchStart: 10, newCharacterCount: 10, cumulativeCharacterCount: 20 },
      F3: { batchStart: 20, newCharacterCount: 10, cumulativeCharacterCount: 30 },
      F4: { batchStart: 30, newCharacterCount: 10, cumulativeCharacterCount: 40 },
      F5: { batchStart: 40, newCharacterCount: 6, cumulativeCharacterCount: 46 },
      BOSS: { batchStart: 0, newCharacterCount: 0, cumulativeCharacterCount: 46 },
    };
    const defaultScope = defaultScopes[stage.code] ?? defaultScopes.F1;
    const configuredNumber = (key: string, fallback: number) => {
      const value = stage.configuration[key];
      return typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.round(value))
        : fallback;
    };
    const batchStart = configuredNumber("batchStart", defaultScope.batchStart);
    const newCharacterCount = configuredNumber(
      "newCharacterCount",
      defaultScope.newCharacterCount,
    );
    const cumulativeCharacterCount = configuredNumber(
      "cumulativeCharacterCount",
      defaultScope.cumulativeCharacterCount,
    );
    const characterOrder = new Map(
      HIRAGANA_BASIC_CHARACTERS.map((character, index) => [character, index]),
    );
    const sortedRows = [...(rows ?? [])]
      .sort(
        (a, b) =>
          (characterOrder.get(a.character) ?? 99) -
          (characterOrder.get(b.character) ?? 99),
      )
      .slice(0, cumulativeCharacterCount);
    const kanaIds = sortedRows.map((row) => row.id);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const [linkResult, masteryResult] = await Promise.all([
      kanaIds.length > 0
        ? supabase
            .from("kana_word_characters")
            .select("kana_id, word_id, position")
            .in("kana_id", kanaIds)
            .order("position")
        : Promise.resolve({ data: [], error: null }),
      user && kanaIds.length > 0
        ? supabase
            .from("user_kana_mastery")
            .select("kana_id, attempts, correct, accuracy, due_at")
            .eq("user_id", user.id)
            .in("kana_id", kanaIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (linkResult.error) throw new Error(linkResult.error.message);
    if (masteryResult.error) throw new Error(masteryResult.error.message);

    const wordIds = [
      ...new Set((linkResult.data ?? []).map((link) => link.word_id)),
    ];
    const { data: wordRows, error: wordError } =
      wordIds.length > 0
        ? await supabase
            .from("kana_example_words")
            .select("id, word_kana, romaji, meaning_id, audio_url")
            .in("id", wordIds)
        : { data: [], error: null };
    if (wordError) throw new Error(wordError.message);

    const wordById = new Map((wordRows ?? []).map((word) => [word.id, word]));
    const examplesByKanaId = new Map<number, HiraganaExample[]>();
    for (const link of linkResult.data ?? []) {
      const word = wordById.get(link.word_id);
      if (!word) continue;
      const examples = examplesByKanaId.get(link.kana_id) ?? [];
      if (examples.length >= 3 || examples.some((example) => example.id === word.id)) continue;
      examples.push({
        id: word.id,
        wordKana: word.word_kana,
        romaji: word.romaji,
        meaning: word.meaning_id,
        audioUrl: word.audio_url,
      });
      examplesByKanaId.set(link.kana_id, examples);
    }

    const masteryByKanaId = new Map<
      number,
      { attempts: number; correct: number; dueAt: string | null }
    >();
    for (const row of masteryResult.data ?? []) {
      const current = masteryByKanaId.get(row.kana_id) ?? {
        attempts: 0,
        correct: 0,
        dueAt: null,
      };
      current.attempts += row.attempts;
      current.correct += row.correct;
      if (row.due_at && (!current.dueAt || row.due_at < current.dueAt)) {
        current.dueAt = row.due_at;
      }
      masteryByKanaId.set(row.kana_id, current);
    }

    const characterById = new Map(sortedRows.map((row) => [row.id, row.character]));
    const now = Date.now();
    const items = sortedRows.map((row): HiraganaLearningItem => {
      const type = row.type as HiraganaType;
      const baseCharacter = row.base_character_id
        ? characterById.get(row.base_character_id) ?? null
        : null;
      const masteryRaw = masteryByKanaId.get(row.id) ?? {
        attempts: 0,
        correct: 0,
        dueAt: null,
      };
      const accuracyPercent =
        masteryRaw.attempts > 0
          ? Math.round((masteryRaw.correct / masteryRaw.attempts) * 100)
          : 0;

      return {
        id: row.id,
        character: row.character,
        romaji: row.romaji,
        type,
        groupCode: row.group_code,
        orderInGroup: row.order_in_group,
        audioUrl: row.audio_url,
        strokeDataUrl: row.stroke_data_key
          ? "/kana-strokes/" + row.stroke_data_key + ".json"
          : null,
        baseCharacter,
        mnemonic:
          type === "basic"
            ? HIRAGANA_LAB_MNEMONICS[row.character] ??
              HIRAGANA_MNEMONICS[row.character] ?? {
                emoji: "✦",
                title: "Bentuk dan bunyi " + row.character,
                story: "Hubungkan bentuk " + row.character + " dengan bunyi '" + row.romaji + "'.",
              }
            : modifiedMnemonic(type, row.character, row.romaji, baseCharacter),
        examples: examplesByKanaId.get(row.id) ?? [],
        mastery: {
          attempts: masteryRaw.attempts,
          accuracyPercent,
          dueAt: masteryRaw.dueAt,
          weak: masteryRaw.attempts > 0 && accuracyPercent < 80,
          due: Boolean(masteryRaw.dueAt && Date.parse(masteryRaw.dueAt) <= now),
        },
      };
    });

    const newItems = items.slice(
      batchStart,
      Math.min(batchStart + newCharacterCount, items.length),
    );

    return {
      module: moduleOverview,
      stage,
      items,
      units: buildUnits(newItems),
    };
  },
);
