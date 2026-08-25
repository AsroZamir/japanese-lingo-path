import { eq, and, inArray } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { learningModules, learningStages, learningModulePrerequisites } from "../db/schema/curriculum";

// PROMPT-11 Bagian 5 — activates PRE-N5.05 (Kosakata Dasar) from scaffold
// to ready, same one-off targeted-update pattern PRE-N5.04 used (its
// specific stage titles/status live only as DB data from that session,
// not in seed-pre-n5-v2.ts's generic STANDARD_STAGES template — this
// script is the equivalent record for PRE-N5.05, so a future session can
// see exactly how these rows got their real content instead of just
// finding it already there unexplained).
//
// Also fixes a structural bug matching V2.1's explicit instruction that
// PRE-N5.05 is a "running track, not a block that must finish before
// grammar": PRE-N5.06 and PRE-N5.07 currently list PRE-N5.05 as a
// prerequisite (inherited from seed-pre-n5-v2.ts's PREREQUISITES map,
// which was never updated for this). Re-pointed to PRE-N5.01 instead,
// matching how PRE-N5.04/05 themselves only depend on PRE-N5.01 — so
// module 5 can run in parallel with 6/7 rather than gating them.

const CATEGORY_GROUPS = {
  F1: { title: "Alam & Hewan", categories: ["alam", "cuaca_waktu", "warna_sifat", "hewan"] },
  F2: { title: "Tubuh, Keluarga & Rumah", categories: ["tubuh", "keluarga", "benda_rumah", "sekolah"] },
  F3: { title: "Pakaian, Makanan & Transportasi", categories: ["pakaian", "makanan", "minuman_jajan", "transportasi"] },
  F4: { title: "Tempat, Teknologi & Kata Kerja", categories: ["tempat", "teknologi", "kata_kerja", "dasar_lain"] },
} as const;

const ALL_CATEGORIES = Object.values(CATEGORY_GROUPS).flatMap((g) => g.categories);

const MECHANIC =
  "Gambar/objek + audio -> bentuk kana -> kontras kata mirip -> pengenalan dua arah (dengar & baca) -> frasa pasangan -> dipakai ulang dalam kalimat/listening";

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module5] = await db.select().from(learningModules).where(eq(learningModules.code, "PRE-N5.05"));
    if (!module5) throw new Error("PRE-N5.05 tidak ditemukan.");

    await db
      .update(learningModules)
      .set({
        title: "Kosakata Dasar",
        description:
          "111 kosakata dasar lintas 16 tema sehari-hari, tiap kata dengan satu frasa pasangan (collocation) supaya langsung bisa dipakai, bukan cuma dihafal.",
        objective:
          "Mengenali DAN memproduksi kosakata dasar secara terpisah (dua kekuatan berbeda), lalu memakainya dalam frasa nyata.",
        status: "ready",
        configuration: {
          blueprint: "rancangan_modul_pre_n5_sampai_n1.pdf",
          bossTitle: "Vocab Dasar Gate",
        },
        updatedAt: new Date(),
      })
      .where(eq(learningModules.id, module5.id));

    for (const [code, group] of Object.entries(CATEGORY_GROUPS)) {
      await db
        .update(learningStages)
        .set({
          title: group.title,
          mechanic: MECHANIC,
          description: `Kosakata tema ${group.title.toLowerCase()}, tiap kata disertai satu frasa pasangan.`,
          status: "ready",
          configuration: { engine: "vocab", categories: group.categories, checkpointQuestions: 12 },
          passCriteria: { accuracyPercent: 80 },
          updatedAt: new Date(),
        })
        .where(and(eq(learningStages.moduleId, module5.id), eq(learningStages.code, code)));
    }

    await db
      .update(learningStages)
      .set({
        title: "SRS Retention: Kosakata Dasar",
        mechanic: "Review terjadwal seluruh 16 tema berdasarkan weak point dua arah (recognition vs production).",
        description: "Review tertunda untuk memastikan kosakata bertahan di memori jangka panjang.",
        status: "ready",
        configuration: {
          engine: "vocab",
          categories: ALL_CATEGORIES,
          retentionGate: true,
          delayedGateHours: 72,
          checkpointQuestions: 16,
        },
        passCriteria: { accuracyPercent: 80 },
        updatedAt: new Date(),
      })
      .where(and(eq(learningStages.moduleId, module5.id), eq(learningStages.code, "F5")));

    await db
      .update(learningStages)
      .set({
        title: "Vocab Dasar Gate",
        mechanic: "Ujian campuran 16 tema, recognition dan production sama-sama diuji.",
        description: "Gerbang penguasaan kosakata dasar sebelum lanjut ke modul berikutnya.",
        status: "ready",
        configuration: { engine: "vocab", categories: ALL_CATEGORIES, timeLimitSeconds: 600, checkpointQuestions: 16 },
        passCriteria: { accuracyPercent: 80 },
        updatedAt: new Date(),
      })
      .where(and(eq(learningStages.moduleId, module5.id), eq(learningStages.code, "BOSS")));

    // Fix the running-track-not-gate bug: PRE-N5.06/07 should not need
    // PRE-N5.05 completed. Re-point them to PRE-N5.01 instead.
    const [module1] = await db.select().from(learningModules).where(eq(learningModules.code, "PRE-N5.01"));
    const [module6] = await db.select().from(learningModules).where(eq(learningModules.code, "PRE-N5.06"));
    const [module7] = await db.select().from(learningModules).where(eq(learningModules.code, "PRE-N5.07"));
    await db
      .delete(learningModulePrerequisites)
      .where(inArray(learningModulePrerequisites.moduleId, [module6.id, module7.id]));
    await db.insert(learningModulePrerequisites).values([
      { moduleId: module6.id, prerequisiteModuleId: module1.id },
      { moduleId: module7.id, prerequisiteModuleId: module1.id },
    ]);

    console.log("PRE-N5.05 diaktifkan: modul + 6 stage -> status ready.");
    console.log("Prasyarat PRE-N5.06/07 dipindah dari PRE-N5.05 ke PRE-N5.01 (running track, bukan gate).");
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("activate-pre-n5-05 gagal:", error);
  process.exit(1);
});
