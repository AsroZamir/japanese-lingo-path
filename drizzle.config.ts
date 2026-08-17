import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// drizzle-kit doesn't know about Next.js's .env.local convention, so it
// never sees DATABASE_URL unless we load the file ourselves.
loadEnv({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL tidak ditemukan. Isi variabel DATABASE_URL di file .env.local dengan connection string Postgres dari Supabase (Project Settings → Database → Connection string).",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/kana.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
  entities: {
    roles: {
      provider: "supabase",
    },
  },
});
