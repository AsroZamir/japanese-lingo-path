import { PageHeader } from "../_components/PageHeader";
import { getHiraganaMasteryMap } from "@/app/lib/mastery-map-query";
import { MasteryMap } from "./MasteryMap";

export const dynamic = "force-dynamic";

// Bagian 6.5 — this page used to be entirely mock (a fixed "Vocabulary
// 42% / Grammar 31% / ..." skill list that tracked nothing real, since
// the app has no grammar/kanji/listening system at all yet). Replaced
// with the real 46-hiragana mastery map — the one piece of per-character
// progress data that actually exists — rather than leaving fabricated
// numbers next to it. PROMPT-7 Bagian 7.4 adds the katakana map
// alongside it once PRE-N5.02 exists, instead of leaving it hiragana-only.
export default async function ProgressPage() {
  const [hiraganaEntries, katakanaEntries] = await Promise.all([
    getHiraganaMasteryMap("hiragana"),
    getHiraganaMasteryMap("katakana"),
  ]);
  const katakanaStarted = katakanaEntries.some((entry) => entry.attempts > 0);

  return (
    <>
      <PageHeader
        eyebrow="PENGUASAAN KANA"
        title="Peta Huruf"
        copy="Warna menunjukkan status penguasaan sungguhan dari riwayat latihan, bukan angka buatan."
      />
      <h3 className="mastery-map__section-title">Hiragana (46 huruf)</h3>
      <MasteryMap entries={hiraganaEntries} />
      {katakanaStarted && (
        <>
          <h3 className="mastery-map__section-title">Katakana (46 huruf)</h3>
          <MasteryMap entries={katakanaEntries} />
        </>
      )}
    </>
  );
}
