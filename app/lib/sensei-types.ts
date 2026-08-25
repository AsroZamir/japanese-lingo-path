// Contract for sensei_segments.visual_action (jsonb), shared by content
// authors (scripts/seed-sensei-*.ts) and the renderer (SenseiBoard.tsx) —
// same split as app/lib/lesson-content-types.ts's TextBlockContent, kept
// deliberately small (5 kinds) since V2.1 §5.1 sessions are short and a
// module intro rarely needs more than a comparison table + a couple of
// glyphs to make its point.
export type SenseiVisualAction =
  | { kind: "text" }
  | { kind: "glyph"; char: string; label?: string }
  | { kind: "table"; columns: string[]; rows: string[][] }
  | { kind: "compare"; items: { label: string; example: string; note?: string }[] }
  // Triggers the reused stroke-animation component (KanaStrokeAnimator)
  // for the segment's own kanaId — only meaningful on segmentType
  // 'writing_demo' rows, which always carry a kanaId.
  | { kind: "write_char" };

export function parseVisualAction(value: unknown): SenseiVisualAction {
  if (value && typeof value === "object" && "kind" in value) {
    return value as SenseiVisualAction;
  }
  return { kind: "text" };
}
