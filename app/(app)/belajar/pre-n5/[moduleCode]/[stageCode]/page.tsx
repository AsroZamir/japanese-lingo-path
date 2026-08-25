import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHiraganaStageBundle } from "@/app/lib/pre-n5-01-query";
import { getVocabStageBundle } from "@/app/lib/vocab-engine-query";
import { getStageOpeningSegments } from "@/app/lib/sensei-query";
import { isDevUnlockAllActive } from "@/app/lib/dev-mode";
import { isModuleLockedByPrerequisites } from "@/app/lib/curriculum-v2";
import { DevUnlockBanner } from "../../../../_components/DevUnlockBanner";
import { SenseiIntroGate } from "@/components/sensei/SenseiIntroGate";
import { HiraganaStagePlayer } from "./HiraganaStagePlayer";
import { VocabStagePlayer } from "./VocabStagePlayer";

export const dynamic = "force-dynamic";

// PRE-N5.03 (and every future module built on the Vocabulary Engine) uses
// a genuinely different stage-bundle shape than the kana modules — see
// docs/POLA-MODUL-BARU.md Bagian 6. The outer page chrome (back link,
// locked/delayed-gate handling) stays shared since both bundle shapes
// carry the same PreN5StageSummary `stage` field from getPreN5ModuleOverview.
const VOCAB_ENGINE_MODULES = ["PRE-N5.03", "PRE-N5.04"];

export default async function HiraganaStagePage({
  params,
}: {
  params: Promise<{ moduleCode: string; stageCode: string }>;
}) {
  const { moduleCode, stageCode } = await params;
  if (!["PRE-N5.01", "PRE-N5.02", "PRE-N5.03", "PRE-N5.04"].includes(moduleCode)) notFound();
  if (await isModuleLockedByPrerequisites(moduleCode)) redirect("/belajar");

  const isVocabEngine = VOCAB_ENGINE_MODULES.includes(moduleCode);
  const bundle = isVocabEngine
    ? await getVocabStageBundle(stageCode.toUpperCase(), moduleCode)
    : await getHiraganaStageBundle(stageCode.toUpperCase(), moduleCode);
  if (!bundle) notFound();
  if (bundle.stage.locked && !bundle.stage.delayedGateAvailableAt) {
    redirect("/belajar/pre-n5/" + moduleCode);
  }
  if (bundle.stage.delayedGateAvailableAt) {
    const availableAt = new Date(bundle.stage.delayedGateAvailableAt);
    const formatted = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(availableAt);
    return (
      <div className="content hiragana-stage-page">
        <Link href={"/belajar/pre-n5/" + moduleCode} className="back-button">
          Kembali ke {bundle.module.title}
        </Link>
        <div className="hiragana-stage__result">
          <span className="hiragana-stage__result-icon">JEDA</span>
          <h3>Belum waktunya kembali</h3>
          <p>
            {bundle.stage.code} menguji ingatan jangka panjang, jadi sengaja
            dibuka lagi setelah jeda. Kembali lagi setelah {formatted}.
          </p>
          <Link href={"/belajar/pre-n5/" + moduleCode} className="primary-button">
            Kembali ke {bundle.module.title}
          </Link>
        </div>
      </div>
    );
  }
  const newCharacterCount = bundle.units.reduce(
    (total, unit) => total + unit.items.length,
    0,
  );
  const bankSize = "allItems" in bundle ? bundle.allItems.length : bundle.items.length;
  const bankLabel = "allItems" in bundle ? "kosakata" : "huruf";
  const stageOpeningSegments =
    bundle.stage.code === "BOSS" || bundle.stage.code === "RETENTION"
      ? []
      : await getStageOpeningSegments(moduleCode, bundle.stage.code);

  return (
    <SenseiIntroGate
      segments={stageOpeningSegments}
      storageKey={"sensei-seen-stage-" + moduleCode + "-" + bundle.stage.code}
      finishLabel="Mulai tahap ini"
      reopenLabel="Lihat perkenalan tahap ini lagi"
    >
    <div className="content hiragana-stage-page">
      {(await isDevUnlockAllActive()) && <DevUnlockBanner />}
      <header className="hiragana-stage-page__header">
        <Link href={"/belajar/pre-n5/" + moduleCode} className="back-button">
          Kembali ke {bundle.module.title}
        </Link>
        <div className="hiragana-stage-page__heading">
          <div>
            <span>{moduleCode} - {bundle.stage.code}</span>
            <h1>{bundle.stage.title}</h1>
            <p>{bundle.stage.description}</p>
          </div>
          <aside>
            <strong>{bundle.stage.mechanic}</strong>
            <small>
              {bundle.stage.code === "BOSS" || bundle.stage.code === "RETENTION"
                ? "Bank lengkap " + bankSize + " " + bankLabel
                : "+" + newCharacterCount + " " + bankLabel + " baru - bank " + bankSize + " " + bankLabel}{" "}
              - attempt {bundle.stage.attempts + 1}
            </small>
          </aside>
        </div>
      </header>

      {"allItems" in bundle ? <VocabStagePlayer bundle={bundle} /> : <HiraganaStagePlayer bundle={bundle} />}
    </div>
    </SenseiIntroGate>
  );
}