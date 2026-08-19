import { sql, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons } from "../db/schema/kana";

// M03 Fase 7 — Katakana Consolidation (docs/curriculum/M03.md "Fase 7").
// 3 lessons instead of M02's 2 — the extra one (L02 Hiragana vs
// Katakana) needs cross_script confusion_pairs, seeded separately by
// scripts/seed-katakana-confusion-pairs.ts (run BEFORE this one).
// LessonConsolidation.tsx was extended to branch on moduleCode + code
// for this 3-lesson shape; M02's own 2-lesson Consolidation is
// unaffected. No lesson_content_blocks to seed — pure data-driven.

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M03"));
    if (!module_) throw new Error("M03 belum ada.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P21",
        titleId: "Katakana Consolidation",
        orderIndex: 21,
        descriptionId: "Pasangan katakana yang sering tertukar, Hiragana vs Katakana, lalu tantangan tanpa romaji.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Similar Katakana", orderIndex: 1 },
      { code: "L02", titleId: "Hiragana vs Katakana", orderIndex: 2 },
      { code: "L03", titleId: "No-Romaji Katakana Challenge", orderIndex: 3 },
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

    console.log(`Selesai. P21 id=${phase.id}, 3 lesson consolidation (tanpa konten seed — data-driven dari pool + confusion pairs).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m03-phase7-consolidation gagal:", error);
  process.exit(1);
});
