import { and, eq, inArray } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import {
  curriculumLevels,
  curriculumVersions,
  learningModulePrerequisites,
  learningModules,
  learningStages,
  type learningContentStatusEnum,
  type learningModuleTypeEnum,
  type learningStageKindEnum,
} from "../db/schema/curriculum";

type ModuleType = (typeof learningModuleTypeEnum.enumValues)[number];
type ContentStatus = (typeof learningContentStatusEnum.enumValues)[number];
type StageKind = (typeof learningStageKindEnum.enumValues)[number];

type ModuleSeed = {
  code: string;
  title: string;
  description: string;
  objective: string;
  methodName: string;
  moduleType: ModuleType;
  orderIndex: number;
  estimatedMinutesMin: number;
  estimatedMinutesMax: number;
  icon: string;
  status: ContentStatus;
  bossTitle?: string;
};

const MODULES: ModuleSeed[] = [
  {
    code: "PRE-N5.01",
    title: "Hiragana Master",
    description: "Membaca dan menulis hiragana dasar, variasi bunyi, serta kombinasi kana dari ingatan.",
    objective: "Menguasai 46 hiragana dasar, dakuten, handakuten, dan kombinasi kana tanpa bantuan.",
    methodName: "Mnemonic Morph + Motor Memory",
    moduleType: "SCR",
    orderIndex: 1,
    estimatedMinutesMin: 240,
    estimatedMinutesMax: 360,
    icon: "あ",
    status: "ready",
    bossTitle: "Hiragana Gate",
  },
  {
    code: "PRE-N5.02",
    title: "Katakana Master",
    description: "Menguasai katakana melalui perbandingan dengan hiragana dan kata serapan dunia nyata.",
    objective: "Membaca dan menulis 46 katakana, kombinasi, serta memahami penggunaan dasarnya.",
    methodName: "Contrast Anchor + Loanword Detective",
    moduleType: "SCR",
    orderIndex: 2,
    estimatedMinutesMin: 180,
    estimatedMinutesMax: 300,
    icon: "ア",
    status: "scaffold",
    bossTitle: "Katakana Gate",
  },
  {
    code: "PRE-N5.03",
    title: "Angka, Waktu & Counter",
    description: "Merakit angka, membaca waktu, dan memilih counter dasar berdasarkan bentuk objek.",
    objective: "Menguasai angka, hari, bulan, jam, menit, serta counter dasar untuk kebutuhan sehari-hari.",
    methodName: "Pattern Builder + Konbini Simulator",
    moduleType: "VOC",
    orderIndex: 3,
    estimatedMinutesMin: 180,
    estimatedMinutesMax: 240,
    icon: "数",
    status: "scaffold",
    bossTitle: "Konbini Simulator",
  },
  {
    code: "PRE-N5.04",
    title: "Sapaan & Ungkapan Dasar",
    description: "Belajar ungkapan dasar melalui situasi, konteks emosi, shadowing, dan respons nyata.",
    objective: "Menggunakan lebih dari 20 ungkapan dasar dengan konteks dan intonasi yang tepat.",
    methodName: "Situasi Video + Shadow Scoring + Emotion Matcher",
    moduleType: "FUN",
    orderIndex: 4,
    estimatedMinutesMin: 120,
    estimatedMinutesMax: 180,
    icon: "話",
    status: "scaffold",
    bossTitle: "Daily Life AI Gate",
  },
  {
    code: "PRE-N5.05",
    title: "Kosakata Dasar 100",
    description: "Kosakata dasar dengan jangkar gambar, kalimat konteks, audio, dan hubungan antarkata.",
    objective: "Menguasai 100 kosakata dasar pada lima kategori utama.",
    methodName: "Image Anchor + Context Sentence + Collocation",
    moduleType: "VOC",
    orderIndex: 5,
    estimatedMinutesMin: 240,
    estimatedMinutesMax: 300,
    icon: "語",
    status: "scaffold",
    bossTitle: "Vocab 100 Gate",
  },
  {
    code: "PRE-N5.06",
    title: "Kata Ganti & Kosakata Lokasi",
    description: "Memahami orang, benda, dan lokasi melalui zona spasial serta permainan menunjuk.",
    objective: "Menggunakan kata ganti orang dan pola kore/sore/are serta koko/soko/asoko dengan benar.",
    methodName: "Spatial Anchor + Deixis Game",
    moduleType: "VOC",
    orderIndex: 6,
    estimatedMinutesMin: 120,
    estimatedMinutesMax: 180,
    icon: "指",
    status: "scaffold",
    bossTitle: "Direction Gate",
  },
  {
    code: "PRE-N5.07",
    title: "Partikel Dasar: は・が・の",
    description: "Membedakan topik, subjek, dan hubungan kepemilikan melalui pola visual dan substitusi.",
    objective: "Memahami serta menggunakan fungsi dasar は, が, dan の.",
    methodName: "Color-Coded Grammar + Pattern Substitution",
    moduleType: "GRA",
    orderIndex: 7,
    estimatedMinutesMin: 180,
    estimatedMinutesMax: 240,
    icon: "は",
    status: "scaffold",
    bossTitle: "Particle Gate",
  },
  {
    code: "PRE-N5.08",
    title: "Kalimat Polite: です・ます",
    description: "Menyusun kalimat formal positif, negatif, dan pertanyaan melalui sentence factory.",
    objective: "Membuat dan merespons kalimat formal dasar menggunakan です dan ます.",
    methodName: "Sentence Factory + Polarity Switch",
    moduleType: "GRA",
    orderIndex: 8,
    estimatedMinutesMin: 180,
    estimatedMinutesMax: 240,
    icon: "礼",
    status: "scaffold",
    bossTitle: "Polite Form Gate",
  },
  {
    code: "PRE-N5.09",
    title: "Partikel Lokasi: に・で・へ",
    description: "Membedakan keberadaan, lokasi aktivitas, dan arah gerak melalui navigasi peta.",
    objective: "Menggunakan に, で, dan へ sesuai fungsi lokasi, waktu, aktivitas, dan arah.",
    methodName: "Map Navigation + Action Spot",
    moduleType: "GRA",
    orderIndex: 9,
    estimatedMinutesMin: 180,
    estimatedMinutesMax: 240,
    icon: "所",
    status: "scaffold",
    bossTitle: "Location Gate",
  },
  {
    code: "PRE-N5.10",
    title: "Listening Pre-N5",
    description: "Mendengar angka, sapaan, dan instruksi sederhana dari kecepatan lambat ke normal.",
    objective: "Memahami audio dasar dengan dukungan visual yang dikurangi secara bertahap.",
    methodName: "Slow to Normal + Visual Context",
    moduleType: "LIS",
    orderIndex: 10,
    estimatedMinutesMin: 120,
    estimatedMinutesMax: 180,
    icon: "聴",
    status: "scaffold",
    bossTitle: "Listening Gate",
  },
  {
    code: "PRE-N5.11",
    title: "Boss: Pre-N5 Mastery",
    description: "Ujian terpadu untuk kecepatan, percakapan, dan kemampuan menulis seluruh fondasi Pre-N5.",
    objective: "Membuktikan penguasaan seluruh kompetensi Pre-N5 sebelum membuka level N5.",
    methodName: "Mixed Mastery Assessment",
    moduleType: "BOS",
    orderIndex: 11,
    estimatedMinutesMin: 60,
    estimatedMinutesMax: 60,
    icon: "門",
    status: "scaffold",
  },
];

const PREREQUISITES: Record<string, string[]> = {
  "PRE-N5.02": ["PRE-N5.01"],
  "PRE-N5.03": ["PRE-N5.01"],
  "PRE-N5.04": ["PRE-N5.01"],
  "PRE-N5.05": ["PRE-N5.01"],
  "PRE-N5.06": ["PRE-N5.05"],
  "PRE-N5.07": ["PRE-N5.05"],
  "PRE-N5.08": ["PRE-N5.07"],
  "PRE-N5.09": ["PRE-N5.08"],
  "PRE-N5.10": ["PRE-N5.04"],
  "PRE-N5.11": MODULES.slice(0, 10).map((moduleDefinition) => moduleDefinition.code),
};

const STANDARD_STAGES: {
  code: string;
  title: string;
  stageKind: StageKind;
  mechanic: string;
  description: string;
  orderIndex: number;
  configuration: Record<string, unknown>;
}[] = [
  {
    code: "F1",
    title: "Discover",
    stageKind: "discover",
    mechanic: "Input multimodal",
    description: "Konsep baru diperkenalkan melalui visual, audio, cerita, dan konteks.",
    orderIndex: 1,
    configuration: { learningMode: "multimodal_input" },
  },
  {
    code: "F2",
    title: "Trace / Deconstruct",
    stageKind: "trace",
    mechanic: "Motor memory atau analisis pola",
    description: "Pengguna membedah pola atau melatih gerakan dengan bantuan yang berkurang.",
    orderIndex: 2,
    configuration: { learningMode: "guided_to_independent" },
  },
  {
    code: "F3",
    title: "Recall / Produce",
    stageKind: "recall",
    mechanic: "Active recall",
    description: "Pengguna wajib menghasilkan jawaban, bukan hanya mengenali pilihan.",
    orderIndex: 3,
    configuration: { learningMode: "active_production" },
  },
  {
    code: "F4",
    title: "Blitz / Pressure",
    stageKind: "blitz",
    mechanic: "Speed drill",
    description: "Latihan berbatas waktu dengan streak dan tekanan kecepatan bertahap.",
    orderIndex: 4,
    configuration: { learningMode: "timed", recognitionSpeedMs: 3000 },
  },
  {
    code: "F5",
    title: "SRS Retention",
    stageKind: "srs",
    mechanic: "Spaced repetition",
    description: "Review terjadwal berdasarkan weak point dan kurva lupa pengguna.",
    orderIndex: 5,
    configuration: { reviewIntervalsDays: [1, 3, 7, 14, 30] },
  },
];

const HIRAGANA_STAGE_OVERRIDES: Record<
  string,
  {
    status: ContentStatus;
    mechanic: string;
    description: string;
    configuration: Record<string, unknown>;
    passCriteria: Record<string, unknown>;
  }
> = {
  F1: {
    status: "ready",
    mechanic: "Mnemonic Morph + mini checkpoint",
    description: "Visual konkret berubah menjadi kana, diikuti audio, contoh kata, dan checkpoint setiap maksimal lima karakter.",
    configuration: {
      script: "hiragana",
      itemTypes: ["basic", "dakuten", "handakuten", "youon", "sokuon"],
      morphDurationMs: 3000,
      examplesPerKana: 3,
      checkpointSize: 5,
      checkpointQuestions: 10,
    },
    passCriteria: { accuracyPercent: 80, requireAllUnits: true },
  },
  F2: {
    status: "ready",
    mechanic: "Guided, Ghost, dan Countdown Trace",
    description: "Motor memory melalui bantuan stroke yang dikurangi sampai pengguna menulis mandiri dalam lima detik.",
    configuration: {
      script: "hiragana",
      modes: ["guided", "ghost", "countdown"],
      ghostPreviewMs: 1000,
      countdownSeconds: 5,
      scoring: { retryBelow: 60, weakPointBelow: 80, masteredAt: 80 },
    },
    passCriteria: { scorePercent: 60, practiceCharacterCount: 46 },
  },
  F3: {
    status: "ready",
    mechanic: "Active production empat arah",
    description: "Type Romaji, Reverse Recall, Audio ke Visual, dan Write from Audio tanpa bergantung pada tebakan pasif.",
    configuration: {
      script: "hiragana",
      exerciseTypes: ["type_romaji", "reverse_recall", "audio_visual", "write_from_audio"],
      reverseRecallOptions: 6,
      audioVisualOptions: 8,
      questionCount: 20,
    },
    passCriteria: { accuracyPercent: 80 },
  },
  F4: {
    status: "ready",
    mechanic: "Hiragana Blitz 60",
    description: "Latihan mengetik romaji selama 60 detik dengan streak, pengali XP, dan satu Second Chance.",
    configuration: {
      script: "hiragana",
      durationSeconds: 60,
      itemDisplayMs: 1000,
      streakMultiplierAt: 5,
      xpMultiplier: 2,
      secondChanceCount: 1,
      targetCorrect: 25,
    },
    passCriteria: { correctCount: 25 },
  },
  F5: {
    status: "ready",
    mechanic: "SRS Retention + Weak Point Radar",
    description: "Review terjadwal pada interval 1, 3, 7, 14, dan 30 hari berdasarkan kesalahan per karakter.",
    configuration: {
      script: "hiragana",
      reviewIntervalsDays: [1, 3, 7, 14, 30],
      sessionQuestionCount: 20,
      weakPointThresholdPercent: 80,
    },
    passCriteria: { accuracyPercent: 80 },
  },
  BOSS: {
    status: "ready",
    mechanic: "Hiragana Gate",
    description: "Lima puluh soal campuran recognition, writing, dan audio dalam lima menit.",
    configuration: {
      script: "hiragana",
      questionCount: 50,
      timeLimitSeconds: 300,
      mix: { recognition: 20, audio: 15, writing: 15 },
      rewardBadge: "Hiragana Warrior",
    },
    passCriteria: { accuracyPercent: 80 },
  },
};
const MASTERY_ASSESSMENTS = [
  {
    code: "A1",
    title: "Blitz 100",
    stageKind: "assessment" as const,
    mechanic: "100 soal campuran dalam 5 menit",
    description: "Mengukur kecepatan dan akurasi seluruh materi Pre-N5.",
    orderIndex: 1,
    configuration: { questionCount: 100, timeLimitSeconds: 300 },
    passCriteria: { accuracyPercent: 75 },
  },
  {
    code: "A2",
    title: "AI Conversation Gate",
    stageKind: "assessment" as const,
    mechanic: "Tiga skenario percakapan",
    description: "Perkenalan formal, transaksi konbini, dan bertanya arah.",
    orderIndex: 2,
    configuration: { scenarioCount: 3 },
    passCriteria: { scenariosPassed: 2 },
  },
  {
    code: "A3",
    title: "Writing Challenge",
    stageKind: "assessment" as const,
    mechanic: "Menulis kana dari audio",
    description: "Menulis 10 hiragana dan 5 katakana dari audio.",
    orderIndex: 3,
    configuration: { hiraganaCount: 10, katakanaCount: 5 },
    passCriteria: { correctCount: 12, totalCount: 15 },
  },
];

async function main() {
  const { db, close } = createSeedClient();

  try {
    await db.transaction(async (tx) => {
      const [version] = await tx
        .insert(curriculumVersions)
        .values({
          code: "v2",
          title: "Active Mastery Curriculum",
          description: "Kurikulum baru Japanese Lingo Path dari Pre-N5 sampai N1.",
          status: "draft",
        })
        .onConflictDoUpdate({
          target: curriculumVersions.code,
          set: {
            title: "Active Mastery Curriculum",
            description: "Kurikulum baru Japanese Lingo Path dari Pre-N5 sampai N1.",
            status: "draft",
          },
        })
        .returning({ id: curriculumVersions.id });

      const [level] = await tx
        .insert(curriculumLevels)
        .values({
          versionId: version.id,
          code: "PRE-N5",
          title: "Pre-N5",
          description: "Fondasi bahasa Jepang untuk pembelajar yang benar-benar mulai dari nol.",
          orderIndex: 1,
          recognitionSpeedMs: 3000,
          distractorProfile: "Tidak mirip",
          productionMode: "Pilih 3 mirip",
          contextComplexity: "1 kalimat pendek",
          aiRoleplayTurns: 3,
          furiganaPercent: 100,
        })
        .onConflictDoUpdate({
          target: [curriculumLevels.versionId, curriculumLevels.code],
          set: {
            title: "Pre-N5",
            description: "Fondasi bahasa Jepang untuk pembelajar yang benar-benar mulai dari nol.",
            orderIndex: 1,
            recognitionSpeedMs: 3000,
            distractorProfile: "Tidak mirip",
            productionMode: "Pilih 3 mirip",
            contextComplexity: "1 kalimat pendek",
            aiRoleplayTurns: 3,
            furiganaPercent: 100,
          },
        })
        .returning({ id: curriculumLevels.id });

      for (const moduleDefinition of MODULES) {
        await tx
          .insert(learningModules)
          .values({
            levelId: level.id,
            code: moduleDefinition.code,
            title: moduleDefinition.title,
            description: moduleDefinition.description,
            objective: moduleDefinition.objective,
            methodName: moduleDefinition.methodName,
            moduleType: moduleDefinition.moduleType,
            orderIndex: moduleDefinition.orderIndex,
            estimatedMinutesMin: moduleDefinition.estimatedMinutesMin,
            estimatedMinutesMax: moduleDefinition.estimatedMinutesMax,
            icon: moduleDefinition.icon,
            status: moduleDefinition.status,
            configuration: {
              blueprint: "rancangan_modul_pre_n5_sampai_n1.pdf",
              bossTitle: moduleDefinition.bossTitle ?? null,
            },
          })
          .onConflictDoUpdate({
            target: [learningModules.levelId, learningModules.code],
            set: {
              title: moduleDefinition.title,
              description: moduleDefinition.description,
              objective: moduleDefinition.objective,
              methodName: moduleDefinition.methodName,
              moduleType: moduleDefinition.moduleType,
              orderIndex: moduleDefinition.orderIndex,
              estimatedMinutesMin: moduleDefinition.estimatedMinutesMin,
              estimatedMinutesMax: moduleDefinition.estimatedMinutesMax,
              icon: moduleDefinition.icon,
              status: moduleDefinition.status,
              configuration: {
                blueprint: "rancangan_modul_pre_n5_sampai_n1.pdf",
                bossTitle: moduleDefinition.bossTitle ?? null,
              },
              updatedAt: new Date(),
            },
          });
      }

      const moduleRows = await tx
        .select({ id: learningModules.id, code: learningModules.code })
        .from(learningModules)
        .where(
          and(
            eq(learningModules.levelId, level.id),
            inArray(learningModules.code, MODULES.map((moduleDefinition) => moduleDefinition.code)),
          ),
        );
      const idByCode = new Map(moduleRows.map((moduleDefinition) => [moduleDefinition.code, moduleDefinition.id]));
      const moduleIds = moduleRows.map((moduleDefinition) => moduleDefinition.id);

      await tx
        .delete(learningModulePrerequisites)
        .where(inArray(learningModulePrerequisites.moduleId, moduleIds));

      const prerequisiteRows = Object.entries(PREREQUISITES).flatMap(([moduleCode, prerequisites]) =>
        prerequisites.map((prerequisiteCode) => ({
          moduleId: idByCode.get(moduleCode)!,
          prerequisiteModuleId: idByCode.get(prerequisiteCode)!,
        })),
      );
      await tx.insert(learningModulePrerequisites).values(prerequisiteRows);

      for (const moduleDefinition of MODULES) {
        const moduleId = idByCode.get(moduleDefinition.code)!;
        const stages =
          moduleDefinition.code === "PRE-N5.11"
            ? MASTERY_ASSESSMENTS
            : [
                ...STANDARD_STAGES.map((stage) => ({ ...stage, passCriteria: {} })),
                {
                  code: "BOSS",
                  title: moduleDefinition.bossTitle ?? "Boss Battle",
                  stageKind: "boss" as const,
                  mechanic: "Mixed mastery assessment",
                  description: "Gerbang penguasaan yang menggabungkan kompetensi inti modul.",
                  orderIndex: 6,
                  configuration: { learningMode: "mixed_assessment" },
                  passCriteria: { blueprintDefined: true },
                },
              ];

        for (const stage of stages) {
          const hiraganaOverride =
            moduleDefinition.code === "PRE-N5.01" ? HIRAGANA_STAGE_OVERRIDES[stage.code] : undefined;
          const stageDefinition = hiraganaOverride ? { ...stage, ...hiraganaOverride } : stage;

          await tx
            .insert(learningStages)
            .values({
              moduleId,
              code: stageDefinition.code,
              title: stageDefinition.title,
              stageKind: stageDefinition.stageKind,
              mechanic: stageDefinition.mechanic,
              description: stageDefinition.description,
              orderIndex: stageDefinition.orderIndex,
              status: hiraganaOverride?.status ?? "scaffold",
              configuration: stageDefinition.configuration,
              passCriteria: stageDefinition.passCriteria,
            })
            .onConflictDoUpdate({
              target: [learningStages.moduleId, learningStages.code],
              set: {
                title: stageDefinition.title,
                stageKind: stageDefinition.stageKind,
                mechanic: stageDefinition.mechanic,
                description: stageDefinition.description,
                orderIndex: stageDefinition.orderIndex,
                status: hiraganaOverride?.status ?? "scaffold",
                configuration: stageDefinition.configuration,
                passCriteria: stageDefinition.passCriteria,
                updatedAt: new Date(),
              },
            });
        }
      }
    });

    const [version] = await db
      .select({ id: curriculumVersions.id })
      .from(curriculumVersions)
      .where(eq(curriculumVersions.code, "v2"));
    const [level] = await db
      .select({ id: curriculumLevels.id })
      .from(curriculumLevels)
      .where(
        and(eq(curriculumLevels.versionId, version.id), eq(curriculumLevels.code, "PRE-N5")),
      );
    const moduleRows = await db
      .select({ id: learningModules.id })
      .from(learningModules)
      .where(inArray(learningModules.levelId, [level.id]));
    const moduleIds = moduleRows.map((moduleDefinition) => moduleDefinition.id);
    const stageRows = await db
      .select({ id: learningStages.id })
      .from(learningStages)
      .where(inArray(learningStages.moduleId, moduleIds));
    const prerequisiteRows = await db
      .select({
        moduleId: learningModulePrerequisites.moduleId,
        prerequisiteModuleId: learningModulePrerequisites.prerequisiteModuleId,
      })
      .from(learningModulePrerequisites)
      .where(inArray(learningModulePrerequisites.moduleId, moduleIds));

    if (moduleRows.length !== 11 || stageRows.length !== 63 || prerequisiteRows.length !== 19) {
      throw new Error(
        "Verifikasi kerangka gagal: modules=" +
          moduleRows.length +
          ", stages=" +
          stageRows.length +
          ", prerequisites=" +
          prerequisiteRows.length,
      );
    }

    console.log("Kurikulum V2 Pre-N5 siap: 11 modul, 63 tahap, 19 relasi prasyarat.");
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("Seed Kurikulum V2 Pre-N5 gagal:", error);
  process.exit(1);
});
