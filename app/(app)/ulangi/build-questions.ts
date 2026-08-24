import type { HiraganaLearningItem } from "@/app/lib/pre-n5-01-query";
import type { ReviewQueueItem, DistractorKana } from "@/app/lib/review-query";
import type { HiraganaQuizQuestion } from "../belajar/pre-n5/[moduleCode]/[stageCode]/HiraganaQuiz";

const CURRICULUM_VERSION_REVIEW = "v2.1";
const PHASE_CODE_REVIEW = "review";

function pickDistractors(
  target: HiraganaLearningItem,
  pool: DistractorKana[],
  count: number,
): DistractorKana[] {
  const others = pool.filter((k) => k.id !== target.id);
  const confusable = others.filter((k) => target.confusableIds.includes(k.id));
  const rest = others.filter((k) => !target.confusableIds.includes(k.id));
  const shuffledRest = [...rest].sort(() => Math.random() - 0.5);
  return [...confusable, ...shuffledRest].slice(0, count);
}

function toChoiceItem(kana: DistractorKana): HiraganaLearningItem {
  return {
    id: kana.id,
    character: kana.character,
    romaji: "",
    type: "basic",
    groupCode: null,
    orderInGroup: null,
    audioUrl: null,
    strokeDataUrl: null,
    baseCharacter: null,
    mnemonic: { emoji: "✦", title: "", story: "" },
    examples: [],
    confusableIds: [],
    mastery: { attempts: 0, accuracyPercent: 0, dueAt: null, weak: false, due: false },
  };
}

// Bagian 6.3 — mixes the 3 review exercise types requested (see kana → say
// reading, hear sound → pick kana, hear sound → write kana), reusing
// HiraganaQuiz's existing "typing" / "choice" / "writing" kinds exactly as
// F1-F12/BOSS already do. Falls back to typing whenever a review item is
// missing the audio or stroke data an audio/writing question would need,
// so no character silently gets a broken question.
export function buildReviewQuestions(
  queue: ReviewQueueItem[],
  distractorPool: DistractorKana[],
): HiraganaQuizQuestion[] {
  return queue.map((entry, index): HiraganaQuizQuestion => {
    const { item } = entry;
    const wantKind = index % 3;
    const canAudio = Boolean(item.audioUrl);
    const canWrite = Boolean(item.strokeDataUrl) && canAudio;

    if (wantKind === 2 && canWrite) {
      return {
        id: "review-" + item.id + "-writing",
        kind: "writing",
        item,
        prompt: "Dengar bunyinya, lalu tulis hurufnya.",
        promptMode: "audio",
        exerciseType: "write_from_audio",
        skill: "writing",
        phaseCode: PHASE_CODE_REVIEW,
        curriculumVersion: CURRICULUM_VERSION_REVIEW,
      };
    }

    if (wantKind === 1 && canAudio) {
      const distractors = pickDistractors(item, distractorPool, 3).map(toChoiceItem);
      const choices = [...distractors, { ...item }].sort(() => Math.random() - 0.5);
      return {
        id: "review-" + item.id + "-choice",
        kind: "choice",
        item,
        prompt: "Dengar bunyinya, lalu pilih hurufnya.",
        promptMode: "audio",
        choices,
        exerciseType: "audio_visual",
        skill: "audio",
        phaseCode: PHASE_CODE_REVIEW,
        curriculumVersion: CURRICULUM_VERSION_REVIEW,
      };
    }

    return {
      id: "review-" + item.id + "-typing",
      kind: "typing",
      item,
      prompt: "Lihat hurufnya, lalu ketik cara bacanya (romaji).",
      promptMode: "kana",
      exerciseType: "type_romaji",
      skill: "reading",
      phaseCode: PHASE_CODE_REVIEW,
      curriculumVersion: CURRICULUM_VERSION_REVIEW,
    };
  });
}
