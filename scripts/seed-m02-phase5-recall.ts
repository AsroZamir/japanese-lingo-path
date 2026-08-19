import { sql, eq } from "drizzle-orm";
import { createSeedClient } from "../db/seed-client";
import { kanaModules, kanaPhases, kanaLessons } from "../db/schema/kana";

// M02 Fase 5 — Active Recall (docs/curriculum/M02.md "Fase 5"). All 3
// lessons are pure active_recall — no lesson_content_blocks/exercises to
// seed, everything is built live from getKanaPool/getWordPool by
// LessonActiveRecall.tsx / LessonActiveRecallWriting.tsx.

async function main() {
  const { db, close } = createSeedClient();
  try {
    const [module_] = await db.select().from(kanaModules).where(eq(kanaModules.code, "M02"));
    if (!module_) throw new Error("M02 belum ada.");

    const [phase] = await db
      .insert(kanaPhases)
      .values({
        moduleId: module_.id,
        code: "P18",
        titleId: "Active Recall",
        orderIndex: 18,
        descriptionId: "Latihan ingat acak lintas seluruh huruf dan kata yang sudah diajarkan, tanpa romaji.",
      })
      .onConflictDoUpdate({
        target: [kanaPhases.moduleId, kanaPhases.code],
        set: { titleId: sql`excluded.title_id`, orderIndex: sql`excluded.order_index`, descriptionId: sql`excluded.description_id` },
      })
      .returning({ id: kanaPhases.id });

    const LESSONS = [
      { code: "L01", titleId: "Sound → Kana", orderIndex: 1 },
      { code: "L02", titleId: "Audio → Menulis / Dikte", orderIndex: 2 },
      { code: "L03", titleId: "Mixed Random Recall", orderIndex: 3 },
    ];
    await db
      .insert(kanaLessons)
      .values(LESSONS.map((l) => ({
        phaseId: phase.id, code: l.code, titleId: l.titleId, lessonType: "active_recall",
        orderIndex: l.orderIndex, groupCode: null, romajiPolicy: "hidden" as const, targetThresholds: null,
      })))
      .onConflictDoUpdate({
        target: [kanaLessons.phaseId, kanaLessons.code],
        set: { titleId: sql`excluded.title_id`, lessonType: sql`excluded.lesson_type`, orderIndex: sql`excluded.order_index`, romajiPolicy: sql`excluded.romaji_policy` },
      });

    console.log(`Selesai. P18 id=${phase.id}, 3 lesson active_recall (tanpa konten seed — data-driven dari pool).`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("seed-m02-phase5-recall gagal:", error);
  process.exit(1);
});
