import { PageHeader } from "../_components/PageHeader";
import { getHiraganaMasteryMap } from "@/app/lib/mastery-map-query";
import { getVocabMasteryMap } from "@/app/lib/vocab-mastery-query";
import { MasteryMap } from "./MasteryMap";
import { VocabMasteryList } from "./VocabMasteryList";

const VOCAB_MODULES: { code: string; title: string }[] = [
  { code: "PRE-N5.03", title: "Angka, Waktu & Counter" },
  { code: "PRE-N5.04", title: "Sapaan & Ungkapan Dasar" },
  { code: "PRE-N5.05", title: "Kosakata Dasar" },
];

export const dynamic = "force-dynamic";

// Bagian 6.5 — this page used to be entirely mock (a fixed "Vocabulary
// 42% / Grammar 31% / ..." skill list that tracked nothing real, since
// the app has no grammar/kanji/listening system at all yet). Replaced
// with the real 46-hiragana mastery map — the one piece of per-character
// progress data that actually exists — rather than leaving fabricated
// numbers next to it. PROMPT-7 Bagian 7.4 adds the katakana map
// alongside it once PRE-N5.02 exists, instead of leaving it hiragana-only.
export default async function ProgressPage() {
  const [hiraganaEntries, katakanaEntries, vocabModuleEntries] = await Promise.all([
    getHiraganaMasteryMap("hiragana"),
    getHiraganaMasteryMap("katakana"),
    Promise.all(VOCAB_MODULES.map((mod) => getVocabMasteryMap(mod.code))),
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

      {VOCAB_MODULES.map((mod, index) => {
        const entries = vocabModuleEntries[index];
        if (entries.length === 0 || !entries.some((entry) => entry.recognition.attempts > 0 || entry.production.attempts > 0)) {
          return null;
        }
        return <VocabMasteryList key={mod.code} moduleTitle={mod.title} entries={entries} />;
      })}
    </>
  );
}
