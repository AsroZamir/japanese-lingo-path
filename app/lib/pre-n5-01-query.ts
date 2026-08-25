import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  HIRAGANA_BASIC_CHARACTERS,
  HIRAGANA_LAB_MNEMONICS,
  HIRAGANA_LAB_VERSION,
  HIRAGANA_MNEMONICS,
  type HiraganaMnemonic,
} from "@/app/lib/hiragana-mnemonics";
import { evaluateDelayedGateEligibility } from "@/app/(app)/belajar/pre-n5/[moduleCode]/[stageCode]/gate-logic";
import { isDevUnlockAllActive } from "@/app/lib/dev-mode";
import { KATAKANA_BASIC_CHARACTERS } from "@/app/lib/katakana-data";

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
  // Bagian 3: set only for a stage configured with delayedGateHours whose
  // wait isn't over yet — null otherwise, including once it opens.
  delayedGateAvailableAt: string | null;
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
  // PROMPT-9 Bagian 3 — narration for the "Sensei Menulis" moment
  // (sensei_segments, segment_type='writing_demo'). Null until authored
  // for this character — the UI still shows the stroke animation, just
  // without a narration button.
  senseiNarrationUrl: string | null;
  baseCharacter: string | null;
  mnemonic: HiraganaMnemonic;
  examples: HiraganaExample[];
  mastery: HiraganaMastery;
  confusableIds: number[];
};

export type HiraganaUnit = {
  code: string;
  title: string;
  description: string;
  items: HiraganaLearningItem[];
};

export type HiraganaReadWord = {
  id: number;
  wordKana: string;
  romaji: string;
  meaning: string;
  audioUrl: string | null;
  kanaIds: number[];
};

export type HiraganaStageBundle = {
  module: PreN5ModuleOverview;
  stage: PreN5StageSummary;
  items: HiraganaLearningItem[];
  units: HiraganaUnit[];
  readWords: HiraganaReadWord[];
};

// Bagian 6.4 (the missing "Baca" step) — a word only counts as readable
// with the bank learned so far if EVERY character in it is already in
// that bank, not just the character the word happens to be linked to via
// kana_word_characters' primary link. Fetches full per-word character
// sets and filters client-side rather than trying to express "array is a
// subset of array" as a single SQL predicate through PostgREST.
async function getReadWordsForCharacters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kanaIds: number[],
): Promise<HiraganaReadWord[]> {
  if (kanaIds.length === 0) return [];
  const allowedIds = new Set(kanaIds);

  const { data: candidateLinks, error: candidateError } = await supabase
    .from("kana_word_characters")
    .select("word_id")
    .in("kana_id", kanaIds);
  if (candidateError) throw new Error(candidateError.message);
  const candidateWordIds = [...new Set((candidateLinks ?? []).map((row) => row.word_id))];
  if (candidateWordIds.length === 0) return [];

  const { data: allLinks, error: allLinksError } = await supabase
    .from("kana_word_characters")
    .select("word_id, kana_id, position")
    .in("word_id", candidateWordIds)
    .order("position");
  if (allLinksError) throw new Error(allLinksError.message);

  const kanaIdsByWordId = new Map<number, number[]>();
  for (const link of allLinks ?? []) {
    kanaIdsByWordId.set(link.word_id, [...(kanaIdsByWordId.get(link.word_id) ?? []), link.kana_id]);
  }
  const eligibleWordIds = [...kanaIdsByWordId.entries()]
    .filter(([, ids]) => ids.length > 0 && ids.every((id) => allowedIds.has(id)))
    .map(([wordId]) => wordId);
  if (eligibleWordIds.length === 0) return [];

  const { data: wordRows, error: wordError } = await supabase
    .from("kana_example_words")
    .select("id, word_kana, romaji, meaning_id, audio_url")
    .in("id", eligibleWordIds);
  if (wordError) throw new Error(wordError.message);

  return (wordRows ?? []).map((word) => ({
    id: word.id,
    wordKana: word.word_kana,
    romaji: word.romaji,
    meaning: word.meaning_id,
    audioUrl: word.audio_url,
    kanaIds: kanaIdsByWordId.get(word.id) ?? [],
  }));
}

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
            .select("stage_id, status, score, attempts, state, first_completed_at")
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
      const configuration = asObject(stage.configuration);
      const delayedGateHours =
        typeof configuration.delayedGateHours === "number" ? configuration.delayedGateHours : null;
      const previousProgress = previousStage ? progressByStageId.get(previousStage.id) : null;
      const previousFirstCompletedAt = previousProgress?.first_completed_at
        ? new Date(previousProgress.first_completed_at)
        : null;
      const delayedGate =
        delayedGateHours != null
          ? evaluateDelayedGateEligibility(previousFirstCompletedAt, new Date(), delayedGateHours)
          : null;
      const devUnlock = isDevUnlockAllActive();
      const locked =
        !devUnlock &&
        (prerequisites.some((code) => !completedStageCodes.has(code)) ||
          contentStatus !== "ready" ||
          (delayedGate != null && !delayedGate.eligible));
      const summary: PreN5StageSummary = {
        id: stage.id,
        code: stage.code,
        title: stage.title,
        stageKind: stage.stage_kind,
        mechanic: stage.mechanic,
        description: stage.description,
        orderIndex: stage.order_index,
        contentStatus,
        configuration,
        passCriteria: asObject(stage.pass_criteria),
        progressStatus,
        score: progressIsCurrent ? progress?.score ?? null : null,
        attempts: progressIsCurrent ? progress?.attempts ?? 0 : 0,
        state: progressIsCurrent ? progressState : {},
        locked,
        delayedGateAvailableAt:
          !devUnlock && delayedGate != null && !delayedGate.eligible
            ? (delayedGate.availableAt?.toISOString() ?? null)
            : null,
        statusLabel: locked
          ? delayedGate != null && !delayedGate.eligible
            ? "Menunggu jeda waktu"
            : contentStatus === "ready"
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

function buildUnits(items: HiraganaLearningItem[], script: string): HiraganaUnit[] {
  const scriptLabel = script === "katakana" ? "Katakana Dasar" : "Hiragana Dasar";
  const units: HiraganaUnit[] = [];

  // V2.1 §7 chunks every phase's new characters into exactly two lessons
  // (2x5 for P1-P4, 2x3 for P5) rather than by the gojuon group_code
  // stored on kana_characters — that column mixes group boundaries (H
  // has 3 rows, I has 5) in ways that don't land on phase edges, so
  // grouping by it produced uneven lessons (e.g. 5/3/2 for P4 instead
  // of 2x5). Splitting the already phase-sliced items in half is exact.
  const basicItems = items.filter((item) => item.type === "basic");
  if (basicItems.length > 0) {
    const half = Math.ceil(basicItems.length / 2);
    const lessons = [basicItems.slice(0, half), basicItems.slice(half)].filter(
      (lesson) => lesson.length > 0,
    );
    lessons.forEach((lessonItems, index) => {
      units.push({
        code: "basic-" + (index + 1),
        title: scriptLabel + " · Kelompok " + (index + 1),
        description: lessonItems.map((item) => item.character).join(" · "),
        items: lessonItems,
      });
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
// Bagian 5 (V2.1 §7 "Extensions"): dakuten/handakuten and youon open only
// after the core 46 checkpoint, each as its own small-set track — never
// mixed into one session with the other, or with the core 46. A stage
// opts into one of these via configuration.characterSet; anything unset
// (F1-F5, BOSS) keeps behaving exactly as before (core46 is the default).
// Canonical order here is hand-picked gojuon order, not the DB's
// group_code/order_in_group — those columns turned out not to be in a
// clean row order for these types (verified by querying them directly).
const DAKUTEN_HANDAKUTEN_CHARACTERS = [
  "が", "ぎ", "ぐ", "げ", "ご", // がぎぐげご
  "ざ", "じ", "ず", "ぜ", "ぞ", // ざじずぜぞ
  "だ", "ぢ", "づ", "で", "ど", // だぢづでど
  "ば", "び", "ぶ", "べ", "ぼ", // ばびぶべぼ
  "ぱ", "ぴ", "ぷ", "ぺ", "ぽ", // ぱぴぷぺぽ
] as const;
const YOUON_CHARACTERS = [
  "きゃ", "きゅ", "きょ", // きゃきゅきょ
  "ぎゃ", "ぎゅ", "ぎょ", // ぎゃぎゅぎょ
  "しゃ", "しゅ", "しょ", // しゃしゅしょ
  "じゃ", "じゅ", "じょ", // じゃじゅじょ
  "ちゃ", "ちゅ", "ちょ", // ちゃちゅちょ
  "にゃ", "にゅ", "にょ", // にゃにゅにょ
  "ひゃ", "ひゅ", "ひょ", // ひゃひゅひょ
  "びゃ", "びゅ", "びょ", // びゃびゅびょ
  "ぴゃ", "ぴゅ", "ぴょ", // ぴゃぴゅぴょ
  "みゃ", "みゅ", "みょ", // みゃみゅみょ
  "りゃ", "りゅ", "りょ", // りゃりゅりょ
] as const;
const CHARACTER_TRACKS: Record<string, Record<string, readonly string[]>> = {
  hiragana: {
    core46: HIRAGANA_BASIC_CHARACTERS,
    dakuten_handakuten: DAKUTEN_HANDAKUTEN_CHARACTERS,
    youon: YOUON_CHARACTERS,
  },
  katakana: {
    core46: KATAKANA_BASIC_CHARACTERS,
  },
};

// PROMPT-7 Bagian 7 — generalized to any PRE-N5 module built on this same
// engine (moduleCode, defaulting to hiragana for every existing caller).
// `script` is read from the stage's own configuration.script (set to
// "katakana" on PRE-N5.02's rows, "hiragana" — or unset, same default —
// on PRE-N5.01's) rather than hardcoded, so CHARACTER_TRACKS and the
// kana_characters query resolve to the right script automatically.
export const getHiraganaStageBundle = cache(
  async (
    stageCode: string,
    moduleCode: string = HIRAGANA_MODULE_CODE,
  ): Promise<HiraganaStageBundle | null> => {
    const moduleOverview = await getPreN5ModuleOverview(moduleCode);
    if (!moduleOverview) return null;
    const stage = moduleOverview.stages.find((candidate) => candidate.code === stageCode);
    if (!stage) return null;

    const script =
      typeof stage.configuration.script === "string" ? stage.configuration.script : "hiragana";
    const trackKey =
      typeof stage.configuration.characterSet === "string"
        ? stage.configuration.characterSet
        : "core46";
    const trackCharacters =
      CHARACTER_TRACKS[script]?.[trackKey] ?? CHARACTER_TRACKS.hiragana.core46;

    const supabase = await createClient();
    const { data: rows, error: kanaError } = await supabase
      .from("kana_characters")
      .select(
        "id, character, romaji, type, group_code, order_in_group, base_character_id, audio_url, stroke_data_key",
      )
      .eq("script", script)
      .in("character", [...trackCharacters]);
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
      trackCharacters.map((character, index) => [character, index]),
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
    const [linkResult, masteryResult, confusionResult, senseiWritingResult] = await Promise.all([
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
      kanaIds.length > 0
        ? supabase
            .from("kana_confusion_pairs")
            .select("kana_a_id, kana_b_id")
            .or(
              "kana_a_id.in.(" + kanaIds.join(",") + "),kana_b_id.in.(" + kanaIds.join(",") + ")",
            )
        : Promise.resolve({ data: [], error: null }),
      // PROMPT-9 Bagian 3 — narration for "Sensei Menulis" (see
      // RetrievalStep's hint-level-3 in HiraganaLearningLab.tsx), one
      // row per character at most (segment_type='writing_demo').
      kanaIds.length > 0
        ? supabase
            .from("sensei_segments")
            .select("kana_id, narration_url")
            .eq("segment_type", "writing_demo")
            .in("kana_id", kanaIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (linkResult.error) throw new Error(linkResult.error.message);
    if (masteryResult.error) throw new Error(masteryResult.error.message);
    if (confusionResult.error) throw new Error(confusionResult.error.message);
    if (senseiWritingResult.error) throw new Error(senseiWritingResult.error.message);
    const senseiNarrationByKanaId = new Map<number, string | null>();
    for (const row of senseiWritingResult.data ?? []) {
      if (row.kana_id != null) senseiNarrationByKanaId.set(row.kana_id, row.narration_url);
    }

    const kanaIdSet = new Set(kanaIds);
    const confusableIdsByKanaId = new Map<number, number[]>();
    for (const pair of confusionResult.data ?? []) {
      if (!kanaIdSet.has(pair.kana_a_id) || !kanaIdSet.has(pair.kana_b_id)) continue;
      confusableIdsByKanaId.set(pair.kana_a_id, [
        ...(confusableIdsByKanaId.get(pair.kana_a_id) ?? []),
        pair.kana_b_id,
      ]);
      confusableIdsByKanaId.set(pair.kana_b_id, [
        ...(confusableIdsByKanaId.get(pair.kana_b_id) ?? []),
        pair.kana_a_id,
      ]);
    }

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
        senseiNarrationUrl: senseiNarrationByKanaId.get(row.id) ?? null,
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
        confusableIds: confusableIdsByKanaId.get(row.id) ?? [],
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

    const readWords = await getReadWordsForCharacters(supabase, kanaIds);

    return {
      module: moduleOverview,
      stage,
      items,
      units: buildUnits(newItems, script),
      readWords,
    };
  },
);
