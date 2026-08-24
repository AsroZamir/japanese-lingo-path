import { existsSync, readFileSync } from "node:fs";

// Prompt 4 Bagian 4: calls the real "use server" functions in actions.ts
// directly — not through the UI, not a reimplementation — by replaying
// the exact HTTP protocol Next.js Server Actions use: a POST to the
// page's own URL, a `next-action` header naming which exported function
// to run (read here from the build's own server-reference-manifest,
// never hardcoded — that hash is a build artifact, not a stable
// constant), and the arguments as a JSON array body. This is how
// "call recordHiraganaAttempt/completeHiraganaStage with fabricated
// evaluation data, bypassing the canvas" is possible at all — these are
// server-only functions gated on next/headers' cookies(), so a bare
// Node script can't import and call them directly outside a real
// request; a raw HTTP call using the real protocol is the actual way in.
const STAGE_PAGE_PATH =
  "app/(app)/belajar/pre-n5/[moduleCode]/[stageCode]/page/server-reference-manifest.json";

function manifestPath(): string {
  const devPath = ".next/dev/server/" + STAGE_PAGE_PATH;
  const buildPath = ".next/server/" + STAGE_PAGE_PATH;
  if (existsSync(devPath)) return devPath;
  if (existsSync(buildPath)) return buildPath;
  throw new Error(
    "server-reference-manifest.json tidak ditemukan di " + devPath + " atau " + buildPath +
      " — jalankan `npm run dev` (atau `npm run build`) dulu supaya Next.js membuatnya.",
  );
}

type ServerReferenceManifest = {
  node: Record<string, { workers: Record<string, { exportedName: string }> }>;
};

export function serverActionId(exportedName: string): string {
  const manifest = JSON.parse(readFileSync(manifestPath(), "utf8")) as ServerReferenceManifest;
  for (const [id, entry] of Object.entries(manifest.node)) {
    const worker = Object.values(entry.workers)[0];
    if (worker?.exportedName === exportedName) return id;
  }
  throw new Error(
    "Server action '" + exportedName + "' tidak ditemukan di server-reference-manifest.json.",
  );
}

// The route-state-tree header only needs to describe a plausible route
// under this same page — Next.js uses it for rendering the response
// payload, not for authorizing which action runs, so a fixed one for the
// F1 stage page works fine when replaying actions against any stage.
const ROUTER_STATE_TREE =
  "%5B%22%22%2C%7B%22children%22%3A%5B%22(app)%22%2C%7B%22children%22%3A%5B%22belajar%22%2C%7B%22children%22%3A%5B%22pre-n5%22%2C%7B%22children%22%3A%5B%5B%22moduleCode%22%2C%22PRE-N5.01%22%2C%22d%22%2Cnull%5D%2C%7B%22children%22%3A%5B%5B%22stageCode%22%2C%22F1%22%2C%22d%22%2Cnull%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C16%5D";

export async function callServerAction(
  baseURL: string,
  exportedName: string,
  args: unknown,
  cookieHeader: string,
): Promise<unknown> {
  const response = await fetch(baseURL + "/belajar/pre-n5/PRE-N5.01/F1", {
    method: "POST",
    headers: {
      "next-action": serverActionId(exportedName),
      "next-router-state-tree": ROUTER_STATE_TREE,
      "content-type": "text/plain;charset=UTF-8",
      accept: "text/x-component",
      cookie: cookieHeader,
    },
    body: JSON.stringify([args]),
  });
  if (!response.ok) {
    throw new Error(exportedName + " HTTP " + response.status + ": " + (await response.text()));
  }
  const text = await response.text();
  // React Flight wire format: a series of "<id>:<payload>" lines. When
  // the action calls revalidatePath (completeHiraganaStage does),
  // Next.js streams a full re-rendered page alongside the actual return
  // value — the "last parseable JSON line" is then whichever of those
  // two happens to come last, not necessarily the action's own result.
  // The one reliable pointer: chunk "0" is always {"a": "$@<id>", ...},
  // where <id> names the chunk holding the actual return value — follow
  // that reference explicitly instead of guessing.
  const chunks = new Map<string, string>();
  for (const line of text.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) continue;
    chunks.set(line.slice(0, separatorIndex), line.slice(separatorIndex + 1));
  }
  const root = chunks.get("0");
  if (!root) throw new Error("Respons " + exportedName + " tidak berisi chunk root \"0\".");
  const rootParsed = JSON.parse(root) as { a?: string };
  const resultRef = typeof rootParsed.a === "string" ? rootParsed.a.match(/^\$@(.+)$/) : null;
  if (!resultRef) {
    throw new Error(
      exportedName + ": chunk root \"0\".a bukan referensi \"$@<id>\" yang diharapkan: " +
        JSON.stringify(rootParsed.a),
    );
  }
  const resultChunk = chunks.get(resultRef[1]);
  if (resultChunk == null) {
    throw new Error(exportedName + ": chunk \"" + resultRef[1] + "\" (hasil action) tidak ditemukan.");
  }
  return JSON.parse(resultChunk);
}
