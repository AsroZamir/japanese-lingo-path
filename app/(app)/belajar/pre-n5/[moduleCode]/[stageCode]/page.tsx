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
  if (bundle.stage.locked) {
    redirect("/belajar/pre-n5/" + moduleCode);
  }

  return (
    <div className="content hiragana-stage-page">
      <header className="hiragana-stage-page__header">
        <Link href={"/belajar/pre-n5/" + moduleCode} className="back-button">
          Kembali ke Hiragana Master
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
              {bundle.items.length} karakter aktif - attempt {bundle.stage.attempts + 1}
            </small>
          </aside>
        </div>
      </header>

      <HiraganaStagePlayer bundle={bundle} />
    </div>
  );
}