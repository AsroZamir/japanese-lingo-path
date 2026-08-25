import { PageHeader } from "../_components/PageHeader";
import { isDevUnlockAllActive } from "@/app/lib/dev-mode";
import { DevUnlockBanner } from "../_components/DevUnlockBanner";
import { getSpeedDrillSession } from "@/app/lib/speed-drill-query";
import { SpeedDrillRunner } from "./SpeedDrillRunner";

export const dynamic = "force-dynamic";

// PROMPT-7 Bagian 1 audit: this page was previously 100% mock, same
// pattern /progres and /ulangi were in before PROMPT-6 — a fixed
// "Vocabulary 12 due / Grammar 6 sets / Kanji 8 due / Listening Coming
// next" grid where every button just fired a toast, for systems (kanji,
// grammar, listening) that don't exist in the app at all yet. Replaced
// wholesale with Bagian 4's real speed drill rather than left standing
// next to it.
export default async function PracticePage() {
  const session = await getSpeedDrillSession();

  return (
    <>
      {(await isDevUnlockAllActive()) && <DevUnlockBanner />}
      <PageHeader
        eyebrow="LATIHAN KECEPATAN"
        title="Latihan"
        copy="Pertajam huruf yang sudah kamu kenal supaya benar-benar hafal di luar kepala, bukan sekadar cukup akurat."
      />
      {!session.unlocked ? (
        <section className="speed-drill__locked">
          <h3>Belum terbuka</h3>
          <p>
            Latihan kecepatan baru terbuka setelah ada minimal 10 huruf berstatus
            &quot;Bisa diingat&quot; ke atas — sekarang baru {session.eligibleCount}. Selesaikan
            beberapa tahap dulu di{" "}
            <a href="/belajar/pre-n5/PRE-N5.01">PRE-N5.01</a>, lalu cek lagi di sini.
          </p>
        </section>
      ) : (
        <SpeedDrillRunner items={session.items} baselineMs={session.baselineMs} />
      )}
    </>
  );
}
