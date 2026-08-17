import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/kana";

// Runtime app client — used by Server Components/Actions/Route Handlers,
// which may run as short-lived Vercel serverless functions. Must go
// through Supabase's Transaction pooler (port 6543), NOT the Session
// pooler used by migrations: transaction-mode pgbouncer multiplexes many
// clients over few real Postgres connections by handing out a connection
// per transaction, not per session.
//
// prepare: false is required against the transaction pooler — pgbouncer
// in transaction mode can't keep a session-scoped prepared statement
// alive across the pool, so leaving this on causes intermittent
// "prepared statement does not exist" errors under load.
//
// max: 1 — the pooler is already doing the real pooling upstream; each
// serverless instance holding more than one connection just eats into
// the pooler's limited slot count for no benefit.
const connectionString = process.env.DATABASE_URL_POOLED;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL_POOLED tidak ditemukan. Isi variabel ini di .env.local (dan di Vercel → Environment Variables) dengan connection string 'Transaction pooler' (port 6543) dari Supabase Dashboard → Project Settings → Database.",
  );
}

declare global {
  var __kanaDbClient: postgres.Sql | undefined;
}

const client =
  globalThis.__kanaDbClient ??
  postgres(connectionString, { prepare: false, max: 1 });

if (process.env.NODE_ENV !== "production") {
  // Reuse the same connection across Fast Refresh reloads in dev, or
  // every file save opens a fresh pool against the pooler.
  globalThis.__kanaDbClient = client;
}

export const db = drizzle(client, { schema });
