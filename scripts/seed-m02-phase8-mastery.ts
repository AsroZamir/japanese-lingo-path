import { sql, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons } from "../db/schema/kana";

// M02 Fase 8 — Mastery + Retention (docs/curriculum/M02.md "Fase 8").
// Pure mastery lessons, data-driven by LessonMasteryGate.tsx from
// getKanaPool/getWordPool/getConfusionPairs/getWeakestKana/getDueForReview
// — no lesson_content_blocks to seed. Final lesson in M02.

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M02"));
    if (!module_) throw new Error("M02 belum ada.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P21",
        titleId: "Mastery + Retention",
        orderIndex: 21,
        descriptionId: "Tes gabungan, remediasi personal, review terjadwal, dan pemeriksaan akhir sebelum lanjut ke Katakana.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Hiragana Mastery Test", orderIndex: 1 },
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

    console.log(`Selesai. P21 id=${phase.id}, 4 lesson mastery (tanpa konten seed — data-driven).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m02-phase8-mastery gagal:", error);
  process.exit(1);
});
