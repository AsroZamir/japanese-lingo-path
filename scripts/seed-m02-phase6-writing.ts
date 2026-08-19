import { sql, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons } from "../db/schema/kana";

// M02 Fase 6 — Writing Lab (docs/curriculum/M02.md "Fase 6"). Pure
// writing_lab lessons, data-driven from getKanaPool/getWordPool by
// LessonWritingLab.tsx — no lesson_content_blocks/exercises to seed.

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M02"));
    if (!module_) throw new Error("M02 belum ada.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P19",
        titleId: "Writing Lab",
        orderIndex: 19,
        descriptionId: "Latihan menulis mendalam — stroke mastery, kata per tingkat panjang, dan menulis buta.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Stroke Mastery", orderIndex: 1 },
      { code: "L02", titleId: "Word Writing", orderIndex: 2 },
      { code: "L03", titleId: "Blind Writing", orderIndex: 3 },
    ];
    await db
      .insert(kanaLessons)
      .values(LESSONS.map((l) => ({
        phaseId: phase.id, code: l.code, titleId: l.titleId, lessonType: "writing_lab",
        orderIndex: l.orderIndex, groupCode: null, romajiPolicy: "hidden" as const, targetThresholds: null,
      })))
      .onConflictDoUpdate({
        target: [kanaLessons.phaseId, kanaLessons.code],
        set: { titleId: sql`excluded.title_id`, lessonType: sql`excluded.lesson_type`, orderIndex: sql`excluded.order_index`, romajiPolicy: sql`excluded.romaji_policy` },
      });

    console.log(`Selesai. P19 id=${phase.id}, 3 lesson writing_lab (tanpa konten seed — data-driven dari pool).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m02-phase6-writing gagal:", error);
  process.exit(1);
});
