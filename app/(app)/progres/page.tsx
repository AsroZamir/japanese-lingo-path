import { PageHeader } from "../_components/PageHeader";
import { getHiraganaMasteryMap } from "@/app/lib/mastery-map-query";
import { MasteryMap } from "./MasteryMap";

export const dynamic = "force-dynamic";

// Bagian 6.5 — this page used to be entirely mock (a fixed "Vocabulary
// 42% / Grammar 31% / ..." skill list that tracked nothing real, since
// the app has no grammar/kanji/listening system at all yet). Replaced
// with the real 46-hiragana mastery map — the one piece of per-character
// progress data that actually exists — rather than leaving fabricated
// numbers next to it.
export default async function ProgressPage() {
  const entries = await getHiraganaMasteryMap();

  return (
    <>
      <PageHeader
        eyebrow="PENGUASAAN HIRAGANA"
        title="Peta 46 Huruf"
        copy="Warna menunjukkan status penguasaan sungguhan dari riwayat latihan, bukan angka buatan."
      />
      <MasteryMap entries={entries} />
    </>
  );
}
