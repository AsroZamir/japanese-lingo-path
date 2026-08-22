import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

loadEnv({ path: ".env.local" });

// Melewati /login sepenuhnya (tidak ada Google yang terlibat) dengan
// login langsung ke Supabase Auth REST API lewat signInWithPassword(),
// lalu menyuntikkan session yang dihasilkan sebagai cookie persis
// seperti yang @supabase/ssr tulis sendiri di lib/supabase/server.ts —
// supaya proxy.ts (middleware) dan setiap Server Component yang
// memanggil createClient() menganggap ini sesi asli, bukan tiruan yang
// setengah-jadi.
//
// Format cookie ini DIBACA langsung dari node_modules/@supabase/ssr
// (dist/main/cookies.js + dist/main/utils/base64url.js + chunker.js),
// bukan ditebak:
//   - nama cookie   = `sb-${projectRef}-auth-token`, projectRef dari
//     NEXT_PUBLIC_SUPABASE_URL (createServerClient.js: storageKey tidak
//     di-override lewat cookieOptions.name di lib/supabase/server.ts,
//     jadi fallback ke default supabase-js: `sb-${hostname.split(".")[0]}-auth-token`)
//   - nilai cookie  = "base64-" + base64url(JSON.stringify(session)),
//     cookieEncoding default createServerClient adalah "base64url"
//   - dipecah jadi `${name}.0`, `${name}.1`, dst. kalau nilainya lebih
//     dari MAX_CHUNK_SIZE=3180 karakter (base64url alphabet A-Za-z0-9-_
//     tidak butuh escaping URI, jadi potong per-karakter langsung aman)
//   - opsi cookie   = DEFAULT_COOKIE_OPTIONS: path "/", sameSite "lax",
//     httpOnly false (httpOnly di sini tidak relevan untuk pembacaan
//     server-side lewat next/headers, cuma membatasi document.cookie)
const MAX_CHUNK_SIZE = 3180;

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const email = requireEnv("E2E_TEST_EMAIL");
  const password = requireEnv("E2E_TEST_PASSWORD");
  const appUrl = process.env.E2E_APP_URL ?? "http://localhost:3000";

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Login E2E gagal: ${error?.message ?? "tidak ada session dikembalikan"}`);
  }

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;

  const encoded = "base64-" + Buffer.from(JSON.stringify(data.session), "utf-8").toString("base64url");
  const chunks: { name: string; value: string }[] = [];
  if (encoded.length <= MAX_CHUNK_SIZE) {
    chunks.push({ name: cookieName, value: encoded });
  } else {
    let remaining = encoded;
    let i = 0;
    while (remaining.length > 0) {
      chunks.push({ name: `${cookieName}.${i}`, value: remaining.slice(0, MAX_CHUNK_SIZE) });
      remaining = remaining.slice(MAX_CHUNK_SIZE);
      i += 1;
    }
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies(
    chunks.map((c) => ({
      name: c.name,
      value: c.value,
      url: appUrl,
      httpOnly: false,
      sameSite: "Lax" as const,
    })),
  );

  const authDir = path.join(process.cwd(), ".auth");
  fs.mkdirSync(authDir, { recursive: true });
  const storageStatePath = path.join(authDir, "storageState.json");
  await context.storageState({ path: storageStatePath });
  await browser.close();
  // Keep this test session valid; signing out here revokes the refresh token stored above.

  console.log(
    `Sesi tersimpan ke ${storageStatePath} (cookie "${cookieName}"${chunks.length > 1 ? ` dipecah jadi ${chunks.length} chunk` : ""}).`,
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} tidak ditemukan di .env.local.`);
  return value;
}

main().catch((error) => {
  console.error("auth-setup gagal:", error.message ?? error);
  process.exit(1);
});
