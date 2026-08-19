import type { ReactNode } from "react";
import * as wanakana from "wanakana";
import { KanaChart } from "@/components/kana/KanaChart";
import { AudioButton } from "@/components/kana/AudioButton";
import { NumberBuilder } from "@/components/numbers/NumberBuilder";
import { ClockDemo } from "@/components/numbers/ClockDemo";
import { getCurrentUser } from "@/app/lib/current-user";
import { getFullScriptChartPreview, type OrientationLessonBundle } from "@/app/lib/lesson-content-query";
import { nameToKatakanaOrFallback } from "@/app/lib/name-to-katakana";
import { groupParagraphs, groupUnits, chunkRows } from "@/app/lib/slide-text-split";
import type {
  LessonContentBlockRow,
  TextBlockContent,
  ChartBlockContent,
  TableBlockContent,
  AudioListBlockContent,
} from "@/app/lib/lesson-content-types";
import { DialogueBlock } from "./DialogueBlock";
import { M01SlideDeck, type ContentSlide } from "./M01SlideDeck";

// **bold** ala markdown ringan — satu-satunya inline markup yang dipakai
// di docs/konten-M01-orientasi.md, jadi tidak perlu parser markdown penuh.
function Bold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

function ParagraphSlide({ heading, paragraphs }: { heading?: string; paragraphs: string[] }) {
  return (
    <div className="m01-slide__body">
      {heading && <h2 className="m01-slide__title">{heading}</h2>}
      {paragraphs.map((p, i) => (
        <p key={i}><Bold text={p} /></p>
      ))}
    </div>
  );
}

// Each slide of a "text" block. Splitting rules: paragraphs/steps/
// closingParagraphs are grouped under a ~40-word budget (never
// splitting a single paragraph or step — see slide-text-split.ts);
// name-showcase is short enough to always be one slide on its own.
async function textBlockSlides(content: TextBlockContent, keyBase: string): Promise<ReactNode[]> {
  if (content.kind === "paragraphs") {
    return groupParagraphs(content.paragraphs).map((paras, gi) => (
      <ParagraphSlide key={`${keyBase}-${gi}`} heading={gi === 0 ? content.heading : undefined} paragraphs={paras} />
    ));
  }

  if (content.kind === "name-showcase") {
    const user = await getCurrentUser();
    const { kana: nameKana } = nameToKatakanaOrFallback(user?.name ?? "", content.fallbackNameKana);
    const nameRomaji = wanakana.toRomaji(nameKana);
    const sentenceKana = `${content.prefixKana}${nameKana}${content.suffixKana}`;
    const sentenceRomaji = `${content.prefixRomaji} ${nameRomaji} ${content.suffixRomaji}`;
    const meaning = content.meaningTemplate.replace("{name}", user?.name?.split(/\s+/)[0] ?? "Anda");
    return [
      <div className="m01-slide__body m01-slide__body--chart" key={keyBase}>
        <div className="m01-showcase">
          <p className="m01-slide__jp m01-slide__jp--sentence">{sentenceKana}</p>
          <p className="m01-showcase__romaji">{sentenceRomaji}</p>
          <p className="m01-showcase__meaning">{meaning}</p>
        </div>
      </div>,
    ];
  }

  if (content.kind === "number-builder") {
    return [
      <div className="m01-slide__body m01-slide__body--chart" key={keyBase}>
        <NumberBuilder
          heading={content.heading}
          instruction={content.instruction}
          tensOptions={content.tensOptions}
          onesOptions={content.onesOptions}
        />
      </div>,
    ];
  }

  if (content.kind === "clock-demo") {
    return [
      <div className="m01-slide__body m01-slide__body--chart" key={keyBase}>
        <ClockDemo
          heading={content.heading}
          instruction={content.instruction}
          hour={content.hour}
          minute={content.minute}
          mode={content.mode}
          readingKanji={content.readingKanji}
          readingRomaji={content.readingRomaji}
        />
      </div>,
    ];
  }

  // kind === "steps"
  const slides: ReactNode[] = [];
  let headingUsed = false;

  if (content.leadParagraphs?.length) {
    groupParagraphs(content.leadParagraphs).forEach((paras, gi) => {
      slides.push(<ParagraphSlide key={`${keyBase}-lead-${gi}`} heading={gi === 0 ? content.heading : undefined} paragraphs={paras} />);
    });
    headingUsed = true;
  }

  const stepUnits = content.steps.map((s) => ({ text: `${s.label ?? ""} ${s.title}`, payload: s }));
  const groupedSteps = groupUnits(stepUnits);

  groupedSteps.forEach((steps, gi) => {
    slides.push(
      <div className="m01-slide__body" key={`${keyBase}-steps-${gi}`}>
        {gi === 0 && !headingUsed && content.heading && <h2 className="m01-slide__title">{content.heading}</h2>}
        <ol className="m01-steps">
          {steps.map((step, i) => (
            <li key={i}>
              {step.label && <span className="m01-steps__label">{step.label}</span>}
              <span>{step.title}</span>
            </li>
          ))}
        </ol>
      </div>,
    );
  });

  if (content.closingParagraphs?.length) {
    groupParagraphs(content.closingParagraphs).forEach((paras, gi) => {
      slides.push(<ParagraphSlide key={`${keyBase}-close-${gi}`} paragraphs={paras} />);
    });
  }

  return slides;
}

// A one-line caption fits as a subtitle on the chart slide itself
// (matches the Moji reference); anything longer is real intro prose
// and gets its own slide(s) via the normal word-budget grouping below.
const SUBTITLE_MAX_WORDS = 25;

// Cacat A/E fix: the chart itself is dense (fills the slide, computed
// cell size, no scroll — see .kana-chart--dense). Only the block's
// LAST paragraph, and only if it's actually short, becomes a one-line
// subtitle ON the chart slide, matching the Moji reference's
// title+subtitle+grid pattern — checked against that paragraph's own
// word count, not the post-grouping group it happens to land in (with
// the 90-word budget, a short block's paragraphs can all pack into one
// group, which would otherwise dump the whole thing into the
// "subtitle" — including unrendered **markdown**, since this path
// bypasses <Bold>). Earlier paragraphs, if any, still get their own
// intro slide(s) with full paragraph rendering (Bold included).
async function chartBlockSlides(content: ChartBlockContent, keyBase: string): Promise<ReactNode[]> {
  const slides: ReactNode[] = [];
  const paragraphs = content.paragraphs ?? [];
  let subtitle: string | null = null;
  let introParagraphs = paragraphs;
  if (paragraphs.length) {
    const last = paragraphs[paragraphs.length - 1];
    const lastWordCount = last.trim().split(/\s+/).filter(Boolean).length;
    if (lastWordCount <= SUBTITLE_MAX_WORDS) {
      subtitle = last;
      introParagraphs = paragraphs.slice(0, -1);
    }
  }
  if (introParagraphs.length) {
    groupParagraphs(introParagraphs).forEach((paras, gi) => {
      slides.push(<ParagraphSlide key={`${keyBase}-intro-${gi}`} paragraphs={paras} />);
    });
  }
  const characters = await getFullScriptChartPreview(content.script);
  slides.push(
    <div className="m01-slide__body m01-slide__body--fullchart" key={`${keyBase}-chart`}>
      {content.heading && <h2 className="m01-slide__title">{content.heading}</h2>}
      {subtitle && <p className="m01-slide__subtitle"><Bold text={subtitle} /></p>}
      <KanaChart script={content.script} phase={content.heading ?? "Pratinjau"} characters={characters} dense />
    </div>,
  );
  return slides;
}

function tableBlockSlides(content: TableBlockContent, keyBase: string): ReactNode[] {
  if (content.kind === "vocab-card") {
    return [
      <div className="m01-slide__body m01-slide__body--chart" key={keyBase}>
        <div className="table-card m01-vocab-card">
          <div className="m01-vocab-card__head">
            <div>
              <p className="m01-slide__jp">{content.kana}</p>
              <p className="m01-vocab-card__romaji">{content.romaji}</p>
              <p className="m01-vocab-card__meaning">{content.meaning}</p>
            </div>
            <AudioButton url={content.audioUrl ?? null} />
          </div>
          {content.note && <p className="m01-vocab-card__note"><Bold text={content.note} /></p>}
          {content.extra && <p className="m01-vocab-card__note"><Bold text={content.extra} /></p>}
          {content.activity && <p className="m01-vocab-card__activity">{content.activity}</p>}
          {content.secondaryLabel && content.secondaryAudioUrl && (
            <div className="m01-vocab-card__secondary">
              <span className="m01-slide__jp">{content.secondaryLabel}</span>
              <AudioButton url={content.secondaryAudioUrl} />
            </div>
          )}
        </div>
      </div>,
    ];
  }

  const rowChunks = chunkRows(content.rows.map((row, i) => ({ row, idx: i })));
  return rowChunks.map((chunk, ci) => (
    <div className="m01-slide__body" key={`${keyBase}-${ci}`}>
      {ci === 0 && content.heading && <h2 className="m01-slide__title">{content.heading}</h2>}
      <div className="table-card m01-table-wrap">
        <table className="m01-table">
          <thead>
            <tr>{content.columns.map((col) => <th key={col}>{col}</th>)}</tr>
          </thead>
          <tbody>
            {chunk.map(({ row, idx }) => (
              <tr key={idx}>
                {row.map((cell, j) => (
                  <td key={j}>
                    <Bold text={cell} />
                    {j === row.length - 1 && content.rowAudioUrls?.[idx] && <AudioButton url={content.rowAudioUrls[idx]} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ci === rowChunks.length - 1 && content.audioUrl && (
        <div className="m01-table-audio">
          <AudioButton url={content.audioUrl} />
          <span>Dengarkan ketiganya</span>
        </div>
      )}
    </div>
  ));
}

// Cacat B fix: was a small kana + caption + tiny button all clumped in
// the middle with dead space below. .m01-audio-slide fills the slide
// height and spreads the three across it (justify-content: space-evenly)
// instead of them collapsing to their natural content size.
function audioListBlockSlides(content: AudioListBlockContent, keyBase: string): ReactNode[] {
  const slides: ReactNode[] = content.items.map((item, i) => (
    <div className="m01-slide__body m01-slide__body--fullchart" key={`${keyBase}-item-${i}`}>
      {i === 0 && content.heading && <h2 className="m01-slide__title">{content.heading}</h2>}
      <div className="m01-audio-slide">
        <p className="m01-slide__jp">{item.kana}</p>
        <p className="m01-vocab-card__meaning">{item.romaji} · {item.meaning}</p>
        <AudioButton url={item.audioUrl} />
      </div>
    </div>
  ));
  if (content.closingParagraphs?.length) {
    groupParagraphs(content.closingParagraphs).forEach((paras, gi) => {
      slides.push(<ParagraphSlide key={`${keyBase}-close-${gi}`} paragraphs={paras} />);
    });
  }
  return slides;
}

function dialogueBlockSlide(block: LessonContentBlockRow & { blockType: "dialogue" }, keyBase: string): ReactNode[] {
  return [
    <div className="m01-slide__body m01-slide__body--chart" key={keyBase}>
      <DialogueBlock content={block.content} />
    </div>,
  ];
}

function calloutBlockSlide(block: LessonContentBlockRow & { blockType: "callout" }, keyBase: string): ReactNode[] {
  return [
    <div className="m01-slide__body m01-slide__body--callout" key={keyBase}>
      <div className={`m01-callout m01-callout--${block.content.kind}`}><Bold text={block.content.body} /></div>
    </div>,
  ];
}

// One lesson_content_blocks row can expand into several slides (word-
// budget splitting) — narration is authored per BLOCK, not per split
// fragment, so it's attached only to the first slide a block produces.
// M01SlideDeck floats the narration button as a stage overlay keyed off
// this, not embedded in the slide markup itself.
async function buildContentSlides(blocks: LessonContentBlockRow[]): Promise<ContentSlide[]> {
  const slides: ContentSlide[] = [];
  for (const block of blocks) {
    const keyBase = `block-${block.id}`;
    let nodes: ReactNode[] = [];
    switch (block.blockType) {
      case "text":
        nodes = await textBlockSlides(block.content, keyBase);
        break;
      case "chart":
        nodes = await chartBlockSlides(block.content, keyBase);
        break;
      case "table":
        nodes = tableBlockSlides(block.content, keyBase);
        break;
      case "audio_list":
        nodes = audioListBlockSlides(block.content, keyBase);
        break;
      case "dialogue":
        nodes = dialogueBlockSlide(block, keyBase);
        break;
      case "callout":
        nodes = calloutBlockSlide(block, keyBase);
        break;
    }
    nodes.forEach((node, i) => {
      slides.push({ node, narrationUrl: i === 0 ? block.narrationUrl : null });
    });
  }
  return slides;
}

export async function M01LessonView({ bundle }: { bundle: OrientationLessonBundle }) {
  const contentSlides = await buildContentSlides(bundle.blocks);
  return (
    <M01SlideDeck
      lessonId={bundle.lesson.id}
      contentSlides={contentSlides}
      exercises={bundle.exercises}
    />
  );
}
