import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ path: ".env.local" });

const PROJECT_REF = "xfwlfioyrcbmknxgmmib";
const NEW_TABLES = [
  "curriculum_versions",
  "curriculum_levels",
  "learning_modules",
  "learning_module_prerequisites",
  "learning_stages",
  "user_learning_module_progress",
  "user_learning_stage_progress",
] as const;
const LEGACY_TABLES = [
  "kana_characters",
  "kana_example_words",
  "kana_word_characters",
  "kana_confusion_pairs",
  "kana_modules",
  "kana_phases",
  "kana_lessons",
  "kana_lesson_items",
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  assert(databaseUrl, "DATABASE_URL tidak ditemukan di .env.local.");
  assert(
    publicSupabaseUrl?.includes(PROJECT_REF),
    "Target Supabase bukan Japanese Lingo Path (" + PROJECT_REF + ").",
  );

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const tableSecurity = await sql.unsafe<
      { tableName: string; rlsEnabled: boolean }[]
    >(
      "select c.relname as \"tableName\", c.relrowsecurity as \"rlsEnabled\" " +
        "from pg_catalog.pg_class c " +
        "join pg_catalog.pg_namespace n on n.oid = c.relnamespace " +
        "where n.nspname = 'public' and c.relkind = 'r' " +
        "and c.relname = any($1::text[]) order by c.relname",
      [[...NEW_TABLES]],
    );
    assert(
      tableSecurity.length === NEW_TABLES.length,
      "Tabel V2 tidak lengkap: " + tableSecurity.length + "/" + NEW_TABLES.length + ".",
    );
    assert(
      tableSecurity.every((table) => table.rlsEnabled),
      "Ada tabel V2 yang belum mengaktifkan RLS.",
    );

    const [resumeColumn] = await sql.unsafe<
      { dataType: string; nullable: string; columnDefault: string | null }[]
    >(
      "select data_type as \"dataType\", is_nullable as nullable, column_default as \"columnDefault\" " +
        "from information_schema.columns where table_schema = 'public' " +
        "and table_name = 'user_learning_stage_progress' and column_name = 'state'",
    );
    assert(resumeColumn, "Kolom resume state belum tersedia.");
    assert(resumeColumn.dataType === "jsonb", "Kolom resume state harus bertipe jsonb.");
    assert(resumeColumn.nullable === "NO", "Kolom resume state tidak boleh nullable.");
    assert(
      resumeColumn.columnDefault?.includes("'{}'::jsonb"),
      "Default kolom resume state harus object JSON kosong.",
    );
    const legacyTables = await sql.unsafe<{ tableName: string }[]>(
      "select c.relname as \"tableName\" from pg_catalog.pg_class c " +
        "join pg_catalog.pg_namespace n on n.oid = c.relnamespace " +
        "where n.nspname = 'public' and c.relkind = 'r' " +
        "and c.relname = any($1::text[]) order by c.relname",
      [[...LEGACY_TABLES]],
    );
    assert(
      legacyTables.length === LEGACY_TABLES.length,
      "Tabel lama tidak lengkap: " + legacyTables.length + "/" + LEGACY_TABLES.length + ".",
    );

    const [curriculum] = await sql.unsafe<
      {
        modules: number;
        stages: number;
        prerequisites: number;
        masteryPrerequisites: number;
      }[]
    >(
      "with target_modules as (" +
        "select m.id, m.code from curriculum_versions v " +
        "join curriculum_levels l on l.version_id = v.id " +
        "join learning_modules m on m.level_id = l.id " +
        "where v.code = 'v2' and l.code = 'PRE-N5'" +
        ") select " +
        "(select count(*)::int from target_modules) as modules, " +
        "(select count(*)::int from learning_stages s " +
        "join target_modules m on m.id = s.module_id) as stages, " +
        "(select count(*)::int from learning_module_prerequisites p " +
        "join target_modules m on m.id = p.module_id) as prerequisites, " +
        "(select count(*)::int from learning_module_prerequisites p " +
        "join target_modules m on m.id = p.module_id " +
        "where m.code = 'PRE-N5.11') as \"masteryPrerequisites\"",
    );
    assert(curriculum.modules === 11, "Jumlah modul salah: " + curriculum.modules + ".");
    assert(curriculum.stages === 63, "Jumlah tahap salah: " + curriculum.stages + ".");
    assert(curriculum.prerequisites === 19, "Jumlah prasyarat salah.");
    assert(curriculum.masteryPrerequisites === 10, "Boss Mastery harus memiliki 10 prasyarat.");

    const hiraganaStages = await sql.unsafe<
      {
        code: string;
        moduleStatus: string;
        stageStatus: string;
        configuration: Record<string, unknown>;
        passCriteria: Record<string, unknown>;
      }[]
    >(
      "select s.code, m.status as \"moduleStatus\", s.status as \"stageStatus\", " +
        "s.configuration, s.pass_criteria as \"passCriteria\" " +
        "from curriculum_versions v join curriculum_levels l on l.version_id = v.id " +
        "join learning_modules m on m.level_id = l.id " +
        "join learning_stages s on s.module_id = m.id " +
        "where v.code = 'v2' and l.code = 'PRE-N5' and m.code = 'PRE-N5.01' " +
        "order by s.order_index",
    );
    assert(hiraganaStages.length === 6, "PRE-N5.01 harus memiliki enam tahap.");
    assert(
      hiraganaStages.every((stage) => stage.moduleStatus === "ready" && stage.stageStatus === "ready"),
      "PRE-N5.01 dan seluruh tahapnya harus berstatus ready.",
    );
    const hiraganaStageByCode = new Map(hiraganaStages.map((stage) => [stage.code, stage]));
    const expectedBatches = [
      { code: "F1", batchStart: 0, newCount: 10, cumulativeCount: 10, unitSize: 5 },
      { code: "F2", batchStart: 10, newCount: 10, cumulativeCount: 20, unitSize: 5 },
      { code: "F3", batchStart: 20, newCount: 10, cumulativeCount: 30, unitSize: 5 },
      { code: "F4", batchStart: 30, newCount: 10, cumulativeCount: 40, unitSize: 5 },
      { code: "F5", batchStart: 40, newCount: 6, cumulativeCount: 46, unitSize: 3 },
    ];
    for (const expected of expectedBatches) {
      const stage = hiraganaStageByCode.get(expected.code);
      assert(stage, "Tahap " + expected.code + " tidak ditemukan.");
      assert(stage.configuration.batchStart === expected.batchStart, "Awal batch " + expected.code + " salah.");
      assert(stage.configuration.newCharacterCount === expected.newCount, "Jumlah huruf baru " + expected.code + " salah.");
      assert(
        stage.configuration.cumulativeCharacterCount === expected.cumulativeCount,
        "Jumlah kumulatif " + expected.code + " salah.",
      );
      assert(stage.configuration.unitSize === expected.unitSize, "Ukuran unit " + expected.code + " salah.");
      const validator = stage.configuration.writingValidator as Record<string, unknown>;
      assert(validator.requireAllLogicalStrokes === true, expected.code + " harus memeriksa semua goresan.");
      assert(validator.requireUnaidedRecall === true, expected.code + " harus mewajibkan recall tanpa petunjuk.");
      assert(stage.passCriteria.accuracyPercent === 80, "Batas checkpoint " + expected.code + " harus 80%.");
    }
    const gate = hiraganaStageByCode.get("BOSS");
    assert(gate?.configuration.cumulativeCharacterCount === 46, "Gate harus memakai seluruh 46 Hiragana.");
    assert(gate.configuration.questionCount === 46, "Hiragana Gate harus berisi 46 soal.");
    assert(gate.configuration.timeLimitSeconds === 600, "Hiragana Gate harus berdurasi sepuluh menit.");
    assert(gate.passCriteria.accuracyPercent === 80, "Batas lulus Hiragana Gate harus 80%.");
    const grants = await sql.unsafe<{ tableName: string; privilege: string }[]>(
      "select table_name as \"tableName\", privilege_type as privilege " +
        "from information_schema.role_table_grants " +
        "where table_schema = 'public' and grantee = 'authenticated' " +
        "and table_name = any($1::text[])",
      [[...NEW_TABLES]],
    );
    const grantSet = new Set(grants.map((grant) => grant.tableName + ":" + grant.privilege));
    for (const table of NEW_TABLES.slice(0, 5)) {
      assert(grantSet.has(table + ":SELECT"), "Grant SELECT hilang pada " + table + ".");
    }
    for (const table of NEW_TABLES.slice(5)) {
      for (const privilege of ["SELECT", "INSERT", "UPDATE"]) {
        assert(grantSet.has(table + ":" + privilege), "Grant " + privilege + " hilang pada " + table + ".");
      }
    }

    const [{ anonGrants }] = await sql.unsafe<{ anonGrants: number }[]>(
      "select count(*)::int as \"anonGrants\" from information_schema.role_table_grants " +
        "where table_schema = 'public' and grantee = 'anon' and table_name = any($1::text[])",
      [[...NEW_TABLES]],
    );
    assert(anonGrants === 0, "Role anon masih memiliki grant pada tabel V2.");

    const [legacy] = await sql.unsafe<
      { modules: number; phases: number; lessons: number; lessonItems: number }[]
    >(
      "select (select count(*)::int from kana_modules) as modules, " +
        "(select count(*)::int from kana_phases) as phases, " +
        "(select count(*)::int from kana_lessons) as lessons, " +
        "(select count(*)::int from kana_lesson_items) as \"lessonItems\"",
    );
    console.log("Verifikasi JLP lulus: alur kumulatif 10-20-30-40-46 ready, Gate 46 aktif, resume state tersedia, dan 7/7 tabel V2 memakai RLS.");
    console.log(
      "Data lama tetap utuh: " +
        legacy.modules +
        " modul, " +
        legacy.phases +
        " fase, " +
        legacy.lessons +
        " pelajaran, " +
        legacy.lessonItems +
        " item.",
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
