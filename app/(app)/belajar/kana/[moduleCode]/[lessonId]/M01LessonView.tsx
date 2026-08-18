import * as wanakana from "wanakana";
import { KanaChart } from "@/components/kana/KanaChart";
import { AudioButton } from "@/components/kana/AudioButton";
import { getCurrentUser } from "@/app/lib/current-user";
import { getFullScriptChartPreview, type M01LessonBundle } from "@/app/lib/lesson-content-query";
import { nameToKatakanaOrFallback } from "@/app/lib/name-to-katakana";
import type {
  LessonContentBlockRow,
  TextBlockContent,
  ChartBlockContent,
  TableBlockContent,
  AudioListBlockContent,
} from "@/app/lib/lesson-content-types";
import { DialogueBlock } from "./DialogueBlock";
import { ConceptExerciseRunner } from "./ConceptExerciseRunner";

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

async function TextBlock({ content }: { content: TextBlockContent }) {
  if (content.kind === "paragraphs") {
    return (
      <section className="m01-block">
        {content.heading && <h3>{content.heading}</h3>}
        {content.paragraphs.map((p, i) => (
          <p key={i}><Bold text={p} /></p>
        ))}
      </section>
    );
  }

  if (content.kind === "name-showcase") {
    const user = await getCurrentUser();
    const { kana: nameKana } = nameToKatakanaOrFallback(user?.name ?? "", content.fallbackNameKana);
    const nameRomaji = wanakana.toRomaji(nameKana);
    const sentenceKana = `${content.prefixKana}${nameKana}${content.suffixKana}`;
    const sentenceRomaji = `${content.prefixRomaji} ${nameRomaji} ${content.suffixRomaji}`;
    const meaning = content.meaningTemplate.replace("{name}", user?.name?.split(/\s+/)[0] ?? "Anda");
    return (
      <section className="m01-showcase">
        <p className="m01-showcase__kana">{sentenceKana}</p>
        <p className="m01-showcase__romaji">{sentenceRomaji}</p>
        <p className="m01-showcase__meaning">{meaning}</p>
      </section>
    );
  }

  // kind === "steps"
  return (
    <section className="m01-block">
      {content.heading && <h3>{content.heading}</h3>}
      {content.leadParagraphs?.map((p, i) => <p key={`lead-${i}`}><Bold text={p} /></p>)}
      <ol className="m01-steps">
        {content.steps.map((step, i) => (
          <li key={i}>
            {step.label && <span className="m01-steps__label">{step.label}</span>}
            <span>{step.title}</span>
          </li>
        ))}
      </ol>
      {content.closingParagraphs?.map((p, i) => <p key={`close-${i}`}><Bold text={p} /></p>)}
    </section>
  );
}

async function ChartBlockView({ content }: { content: ChartBlockContent }) {
  const characters = await getFullScriptChartPreview(content.script);
  return (
    <section className="m01-block">
      {content.heading && <h3>{content.heading}</h3>}
      {content.paragraphs?.map((p, i) => <p key={i}><Bold text={p} /></p>)}
      <KanaChart script={content.script} phase={content.heading ?? "Pratinjau"} characters={characters} />
    </section>
  );
}

function TableBlockView({ content }: { content: TableBlockContent }) {
  if (content.kind === "vocab-card") {
    return (
      <div className="table-card m01-vocab-card">
        <div className="m01-vocab-card__head">
          <div>
            <p className="m01-vocab-card__kana">{content.kana}</p>
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
            <span>{content.secondaryLabel}</span>
            <AudioButton url={content.secondaryAudioUrl} />
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="m01-block">
      {content.heading && <h3>{content.heading}</h3>}
      <div className="table-card m01-table-wrap">
        <table className="m01-table">
          <thead>
            <tr>{content.columns.map((col) => <th key={col}>{col}</th>)}</tr>
          </thead>
          <tbody>
            {content.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>
                    <Bold text={cell} />
                    {j === row.length - 1 && content.rowAudioUrls?.[i] && (
                      <AudioButton url={content.rowAudioUrls[i]} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {content.audioUrl && (
        <div className="m01-table-audio">
          <AudioButton url={content.audioUrl} />
          <span>Dengarkan ketiganya</span>
        </div>
      )}
    </section>
  );
}

function AudioListBlockView({ content }: { content: AudioListBlockContent }) {
  return (
    <section className="m01-block">
      {content.heading && <h3>{content.heading}</h3>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {content.items.map((item) => (
          <div key={item.kana} className="table-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div>
              <p className="m01-vocab-card__kana" style={{ fontSize: 20 }}>{item.kana}</p>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>{item.romaji} · {item.meaning}</span>
            </div>
            <AudioButton url={item.audioUrl} />
          </div>
        ))}
      </div>
      {content.closingParagraphs?.map((p, i) => <p key={i}><Bold text={p} /></p>)}
    </section>
  );
}

async function ContentBlock({ block }: { block: LessonContentBlockRow }) {
  switch (block.blockType) {
    case "text":
      return <TextBlock content={block.content} />;
    case "chart":
      return <ChartBlockView content={block.content} />;
    case "table":
      return <TableBlockView content={block.content} />;
    case "audio_list":
      return <AudioListBlockView content={block.content} />;
    case "dialogue":
      return <DialogueBlock content={block.content} />;
    case "callout":
      return (
        <div className={`m01-callout m01-callout--${block.content.kind}`}>
          <Bold text={block.content.body} />
        </div>
      );
  }
}

export function M01LessonView({ bundle }: { bundle: M01LessonBundle }) {
  return (
    <div>
      {bundle.blocks.map((block) => (
        <ContentBlock key={block.id} block={block} />
      ))}

      {bundle.exercises.length > 0 && (
        <section className="m01-block">
          <h3>Latihan</h3>
          <ConceptExerciseRunner lessonId={bundle.lesson.id} exercises={bundle.exercises} />
        </section>
      )}
    </div>
  );
}
