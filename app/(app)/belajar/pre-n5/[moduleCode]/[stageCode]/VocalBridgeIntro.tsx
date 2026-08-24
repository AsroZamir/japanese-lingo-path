"use client";

import { AudioButton } from "@/components/kana/AudioButton";
import type { HiraganaLearningItem } from "@/app/lib/pre-n5-01-query";

const INDONESIAN_VOWELS = ["a", "i", "u", "e", "o"];
const SAME_CONSONANTS = ["k", "s", "t", "n", "h", "m", "y", "r", "w"];

// PROMPT-7 Bagian 5 — one skippable screen shown only before F1's very
// first batch. Not persisted anywhere (no DB flag, no dismissed-forever
// state) — it's cheap enough to just show once per fresh session start
// at F1, per "satu layar saja, bisa dilewati, tidak wajib".
export function VocalBridgeIntro({
  vowels,
  onContinue,
}: {
  vowels: HiraganaLearningItem[];
  onContinue: () => void;
}) {
  return (
    <div className="vocal-bridge">
      <span className="vocal-bridge__eyebrow">SEBELUM MULAI</span>
      <h2>Kabar baik: kamu sudah tahu setengah dari bunyinya</h2>
      <p className="vocal-bridge__lede">
        Pembelajar berbahasa Indonesia punya keuntungan yang tidak dimiliki
        pembelajar berbahasa Inggris di titik ini — vokal bahasa Jepang
        identik dengan vokal bahasa Indonesia.
      </p>

      <div className="vocal-bridge__vowels">
        {vowels.map((item, index) => (
          <div className="vocal-bridge__vowel" key={item.id}>
            <span className="vocal-bridge__kana">{item.character}</span>
            <span className="vocal-bridge__romaji">{INDONESIAN_VOWELS[index]}</span>
            <AudioButton url={item.audioUrl} />
          </div>
        ))}
      </div>
      <p className="vocal-bridge__note">
        Putar bunyinya — persis sama dengan cara kamu mengucapkan a-i-u-e-o
        sehari-hari, tidak perlu belajar ulang.
      </p>

      <div className="vocal-bridge__consonants">
        <strong>Konsonan yang juga sama persis:</strong>{" "}
        {SAME_CONSONANTS.join(", ")}
      </div>

      <div className="vocal-bridge__caveat">
        <strong>Yang beda (biar tidak salah kira):</strong> つ dibaca &quot;tsu&quot;,
        ふ ada di antara &quot;f&quot; dan &quot;h&quot;, dan り bukan &quot;r&quot; Indonesia yang
        digulung di lidah.
      </div>

      <button type="button" className="primary-button" onClick={onContinue}>
        Mulai belajar →
      </button>
    </div>
  );
}
