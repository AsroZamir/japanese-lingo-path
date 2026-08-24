"use client";

import { useMemo, useState } from "react";
import { AudioButton } from "@/components/kana/AudioButton";
import type { VocabItem, VocabStageBundle } from "@/app/lib/vocab-engine-query";
import type { VocabQuizResult } from "./VocabQuiz";
import { recordVocabAttempt } from "./vocab-actions";

const CURRICULUM_VERSION_V21 = "v2.1";
const ROUNDS = 5;
const BILLS = [1000, 5000, 10000];

function moneyGivenFor(price: number): number {
  const bill = BILLS.find((candidate) => candidate >= price);
  return bill ?? price + 1000;
}

// react-hooks/purity flags Math.random() called directly inside a
// useMemo callback — routing it through a plain helper satisfies the rule.
function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

type Step = "price" | "change" | "round-result";

// V2.1 PRE-N5.03 capstone — "salah hitung != salah bahasa" implemented as
// a two-step exchange: step 1 grades ONLY whether the spoken total was
// heard correctly (language); step 2 always uses the TRUE price (not
// whatever the learner typed in step 1) so a wrong step 2 answer can only
// ever be arithmetic on a correctly-known price, never a mishearing.
export function KonbiniSimulation({
  bundle,
  onComplete,
}: {
  bundle: VocabStageBundle;
  onComplete: (result: VocabQuizResult, state: Record<string, unknown>) => void;
}) {
  const priceItems = useMemo(() => {
    const pool = bundle.allItems.filter((item) => item.category === "price" && item.numericValue != null);
    return shuffle(pool).slice(0, ROUNDS);
  }, [bundle.allItems]);

  const [round, setRound] = useState(0);
  const [step, setStep] = useState<Step>("price");
  const [priceInput, setPriceInput] = useState("");
  const [changeInput, setChangeInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roundOutcome, setRoundOutcome] = useState<{ priceCorrect: boolean; changeCorrect: boolean } | null>(null);
  const [tally, setTally] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  const item: VocabItem | undefined = priceItems[round];
  const moneyGiven = item?.numericValue != null ? moneyGivenFor(item.numericValue) : 0;
  const correctChange = item?.numericValue != null ? moneyGiven - item.numericValue : 0;

  if (priceItems.length === 0) {
    return <div className="hiragana-stage__empty">Belum ada data harga untuk simulasi konbini.</div>;
  }

  if (saving) {
    return <div className="hiragana-stage__loading">Menyimpan hasil...</div>;
  }

  if (!item) return null;
  // TS doesn't narrow a captured variable across a nested function
  // declaration's body, even for const — rebind post-guard so the
  // closures below see the narrowed VocabItem, not VocabItem | undefined.
  const currentItem = item;

  async function submitPrice() {
    const priceCorrect = Number(priceInput) === currentItem.numericValue;
    setChecked(true);
    setSaving(true);
    await recordVocabAttempt({
      stageId: bundle.stage.id,
      itemId: currentItem.id,
      exerciseType: "konbini_price",
      skill: "listening",
      typedValue: priceInput,
      phaseCode: bundle.stage.code,
      curriculumVersion: CURRICULUM_VERSION_V21,
      firstAttemptCorrect: priceCorrect,
    });
    setSaving(false);
    setRoundOutcome({ priceCorrect, changeCorrect: false });
  }

  async function submitChange() {
    const changeCorrect = Number(changeInput) === correctChange;
    setSaving(true);
    await recordVocabAttempt({
      stageId: bundle.stage.id,
      itemId: currentItem.id,
      exerciseType: "konbini_change",
      skill: "listening",
      typedValue: changeInput,
      confirmedPriceValue: correctChange,
      phaseCode: bundle.stage.code,
      curriculumVersion: CURRICULUM_VERSION_V21,
      firstAttemptCorrect: changeCorrect,
    });
    setSaving(false);
    const finalOutcome = { priceCorrect: roundOutcome?.priceCorrect ?? false, changeCorrect };
    setRoundOutcome(finalOutcome);
    setTally((prev) => ({
      correct: prev.correct + (finalOutcome.priceCorrect ? 1 : 0) + (finalOutcome.changeCorrect ? 1 : 0),
      total: prev.total + 2,
    }));
    setStep("round-result");
  }

  function nextRound() {
    const nextIndex = round + 1;
    if (nextIndex >= priceItems.length) {
      onComplete(tally, { konbiniSimulation: true });
      return;
    }
    setRound(nextIndex);
    setStep("price");
    setPriceInput("");
    setChangeInput("");
    setChecked(false);
    setRoundOutcome(null);
  }

  return (
    <div className="konbini-sim">
      <header className="konbini-sim__header">
        <span>Simulasi Konbini — transaksi {round + 1}/{priceItems.length}</span>
      </header>

      {step === "price" && (
        <div className="konbini-sim__step">
          <p>Kasir menyebutkan totalnya. Dengarkan, lalu ketik jumlahnya dalam angka (yen).</p>
          <AudioButton url={item.audioUrl} autoplay />
          {!checked ? (
            <>
              <input
                className="hiragana-quiz__input"
                inputMode="numeric"
                value={priceInput}
                onChange={(event) => setPriceInput(event.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Contoh: 2800"
                autoComplete="off"
              />
              <button type="button" className="primary-button" disabled={priceInput.trim().length === 0} onClick={() => void submitPrice()}>
                Periksa
              </button>
            </>
          ) : (
            <>
              <div className={roundOutcome?.priceCorrect ? "hiragana-quiz__feedback is-correct" : "hiragana-quiz__feedback is-wrong"}>
                {roundOutcome?.priceCorrect
                  ? "Benar, totalnya " + item.numericValue + " yen."
                  : "Totalnya sebenarnya " + item.numericValue + " yen (" + item.reading + ")."}
              </div>
              <button type="button" className="primary-button" onClick={() => setStep("change")}>
                Lanjut ke pembayaran
              </button>
            </>
          )}
        </div>
      )}

      {step === "change" && (
        <div className="konbini-sim__step">
          <p>
            Total belanja {item.numericValue} yen. Anda membayar dengan uang {moneyGiven} yen. Berapa kembaliannya?
          </p>
          <input
            className="hiragana-quiz__input"
            inputMode="numeric"
            value={changeInput}
            onChange={(event) => setChangeInput(event.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Kembalian dalam yen"
            autoComplete="off"
          />
          <button type="button" className="primary-button" disabled={changeInput.trim().length === 0} onClick={() => void submitChange()}>
            Periksa
          </button>
        </div>
      )}

      {step === "round-result" && roundOutcome && (
        <div className="konbini-sim__step">
          <div className={roundOutcome.changeCorrect ? "hiragana-quiz__feedback is-correct" : "hiragana-quiz__feedback is-wrong"}>
            {roundOutcome.changeCorrect
              ? "Kembalian benar: " + correctChange + " yen."
              : "Kembalian yang benar: " + correctChange + " yen (" + moneyGiven + " - " + item.numericValue + ")."}
          </div>
          <button type="button" className="primary-button" onClick={nextRound}>
            {round + 1 >= priceItems.length ? "Selesaikan simulasi" : "Transaksi berikutnya"}
          </button>
        </div>
      )}
    </div>
  );
}
