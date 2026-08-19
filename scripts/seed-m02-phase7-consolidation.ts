import { sql, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons } from "../db/schema/kana";

// M02 Fase 7 — Consolidation (docs/curriculum/M02.md "Fase 7"). Pure
// consolidation lessons, data-driven from getKanaPool/getWordPool/
// getConfusionPairs by LessonConsolidation.tsx — no lesson_content_blocks
// to seed. Run scripts/seed-kana-confusion-pairs.ts BEFORE this one.

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M02"));
    if (!module_) throw new Error("M02 belum ada.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P20",
        titleId: "Consolidation",
        orderIndex: 20,
        descriptionId: "Pasangan huruf yang sering tertukar, lalu tantangan tanpa romaji sama sekali.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Similar Kana", orderIndex: 1 },
      { code: "L02", titleId: "No-Romaji Challenge", orderIndex: 2 },
    ];
    await db
      .insert(kanaLessons)
      .values(LESSONS.map((l) => ({
        phaseId: phase.id, code: l.code, titleId: l.titleId, lessonType: "consolidation",
        orderIndex: l.orderIndex, groupCode: null, romajiPolicy: "hidden" as const, targetThresholds: null,
      })))
      .onConflictDoUpdate({
        target: [kanaLessons.phaseId, kanaLessons.code],
        set: { titleId: sql`excluded.title_id`, lessonType: sql`excluded.lesson_type`, orderIndex: sql`excluded.order_index`, romajiPolicy: sql`excluded.romaji_policy` },
      });

    console.log(`Selesai. P20 id=${phase.id}, 2 lesson consolidation (tanpa konten seed — data-driven dari pool + confusion pairs).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m02-phase7-consolidation gagal:", error);
  process.exit(1);
});
