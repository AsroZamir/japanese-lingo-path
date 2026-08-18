import { getExistingKanaModuleCodes } from "@/app/lib/kana-modules-query";
import { LearnPageClient } from "./LearnPageClient";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const existingModuleCodes = await getExistingKanaModuleCodes();
  return <LearnPageClient connectedModuleCodes={[...existingModuleCodes]} />;
}
