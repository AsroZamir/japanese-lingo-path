import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHiraganaStageBundle } from "@/app/lib/pre-n5-01-query";
import { HiraganaStagePlayer } from "./HiraganaStagePlayer";

export const dynamic = "force-dynamic";

export default async function HiraganaStagePage({
  params,
}: {
  params: Promise<{ moduleCode: string; stageCode: string }>;
}) {
  const { moduleCode, stageCode } = await params;
  if (moduleCode !== "PRE-N5.01") notFound();

  const bundle = await getHiraganaStageBundle(stageCode.toUpperCase());
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

  return (
    <div className="content hiragana-stage-page">
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
                ? "Bank lengkap 46 huruf"
                : "+" + newCharacterCount + " huruf baru - bank " + bundle.items.length + " huruf"} - attempt {bundle.stage.attempts + 1}
            </small>
          </aside>
        </div>
      </header>

      <HiraganaStagePlayer bundle={bundle} />
    </div>
  );
}