import { sql, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons } from "../db/schema/kana";

// M03 Fase 8 — Katakana Mastery + Retention (docs/curriculum/M03.md
// "Fase 8"). Identical shape to seed-m02-phase8-mastery.ts —
// LessonMasteryGate.tsx / mastery-query.ts are script-agnostic. Final
// lesson in M03; L04's pass/fail is meant to unlock M04, same open item
// as M02's own L04 (real gate result written to user_kana_gate_results,
// UI-level module lock not wired until M04 exists — see docs/curriculum/M03.md).

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M03"));
    if (!module_) throw new Error("M03 belum ada.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P22",
        titleId: "Mastery + Retention",
        orderIndex: 22,
        descriptionId: "Tes gabungan, remediasi personal, review terjadwal, dan pemeriksaan akhir sebelum lanjut ke M04.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Basic Katakana Mastery Test", orderIndex: 1 },
      { code: "L02", titleId: "Targeted Remediation", orderIndex: 2 },
      { code: "L03", titleId: "Delayed Retention Check", orderIndex: 3 },
      { code: "L04", titleId: "Final Unlock Check", orderIndex: 4 },
    ];
    await db
      .insert(kanaLessons)
      .values(LESSONS.map((l) => ({
        phaseId: phase.id, code: l.code, titleId: l.titleId, lessonType: "mastery",
        orderIndex: l.orderIndex, groupCode: null, romajiPolicy: "hidden" as const, targetThresholds: null,
      })))
      .onConflictDoUpdate({
        target: [kanaLessons.phaseId, kanaLessons.code],
        set: { titleId: sql`excluded.title_id`, lessonType: sql`excluded.lesson_type`, orderIndex: sql`excluded.order_index`, romajiPolicy: sql`excluded.romaji_policy` },
      });

    console.log(`Selesai. P22 id=${phase.id}, 4 lesson mastery (tanpa konten seed — data-driven).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m03-phase8-mastery gagal:", error);
  process.exit(1);
});
