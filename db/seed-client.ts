import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/kana";

loadEnv({ path: ".env.local" });

// Script/admin client — for one-off local processes (seed scripts, ad-hoc
// data fixes), never imported by app runtime code. Uses the same Session
// pooler connection (DATABASE_URL) as drizzle-kit migrations: a script
// is a single long-lived process, not a fleet of serverless instances,
// so there's no pooler-exhaustion concern and prepared statements work
// normally here.
//
// Connects as the Postgres role from DATABASE_URL (Supabase's default
// "postgres" user), which is a superuser and therefore bypasses RLS —
// this is what lets seed scripts insert into kana_* tables even though
// those tables only have a SELECT policy for `authenticated`.
export function createSeedClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL tidak ditemukan. Isi variabel ini di .env.local dengan connection string 'Session pooler' (port 5432) dari Supabase Dashboard → Project Settings → Database.",
    );
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  return { db, close: () => client.end() };
}
