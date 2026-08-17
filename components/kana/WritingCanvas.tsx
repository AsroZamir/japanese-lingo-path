"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  angleDifference,
  averagePointDistance,
  resamplePoints,
  strokeDirectionAngle,
  type KanaStrokeData,
} from "./stroke-geometry";

export type WritingCanvasMode = "trace" | "guided" | "copy" | "faint_grid" | "blind";

export type StrokeFeedback = {
  strokeIndex: number;
  orderCorrect: boolean;
  directionCorrect: boolean;
  shapeCorrect: boolean;
  shapeScore: number;
};

export type WritingCanvasResult = {
  character: string;
  mode: WritingCanvasMode;
  expectedStrokeCount: number;
  drawnStrokeCount: number;
  strokes: StrokeFeedback[];
  overallOrderCorrect: boolean;
  overallDirectionCorrect: boolean;
  overallShapeCorrect: boolean;
};

export type WritingCanvasProps = {
  character: string;
  strokeData: KanaStrokeData | null;
  mode: WritingCanvasMode;
  onResult?: (result: WritingCanvasResult) => void;
};

const RESAMPLE_COUNT = 24;
// Both in the same 1024-unit font-coordinate space the stroke data uses —
// see StrokeAnimation for how that space was verified. Thresholds are a
// first-pass heuristic (arc-length resample + average point distance +
// endpoint-vector angle), not a trained recognizer; tune once real
// attempts data exists.
const SHAPE_ERROR_THRESHOLD = 130;
const DIRECTION_ANGLE_THRESHOLD = 100;
const MIN_POINTS_PER_STROKE = 2;
const STROKE_FILL = "#1a2b45";

function evaluateStroke(userPoints: number[][], expectedMedians: number[][][], index: number): StrokeFeedback {
  const userResampled = resamplePoints(userPoints, RESAMPLE_COUNT);
  const expected = expectedMedians[index] as number[][] | undefined;
  const expectedResampled = expected ? resamplePoints(expected, RESAMPLE_COUNT) : null;

  const shapeError = expectedResampled ? averagePointDistance(userResampled, expectedResampled) : Infinity;
  const shapeCorrect = expectedResampled != null && shapeError <= SHAPE_ERROR_THRESHOLD;
  const shapeScore = expectedResampled ? Math.max(0, 1 - shapeError / (SHAPE_ERROR_THRESHOLD * 2)) : 0;

  const userAngle = strokeDirectionAngle(userPoints);
  const directionCorrect =
    expected != null && angleDifference(userAngle, strokeDirectionAngle(expected)) <= DIRECTION_ANGLE_THRESHOLD;

  // Does this stroke actually best match some OTHER position in the
  // expected sequence? If so, it was likely drawn out of order.
  let bestIndex = index;
  let bestError = shapeError;
  expectedMedians.forEach((median, i) => {
    const error = averagePointDistance(userResampled, resamplePoints(median, RESAMPLE_COUNT));
    if (error < bestError) {
      bestError = error;
      bestIndex = i;
    }
  });
  const orderCorrect = bestIndex === index;

  return { strokeIndex: index, orderCorrect, directionCorrect, shapeCorrect, shapeScore };
}

function pointsToPathD(points: number[][]): string {
  if (points.length === 0) return "";
  return `M ${points[0][0]},${points[0][1]} ` + points.slice(1).map(([x, y]) => `L ${x},${y}`).join(" ");
}

function feedbackColor(feedback: StrokeFeedback | undefined): string {
  if (!feedback) return "#8b99aa";
  if (feedback.shapeCorrect && feedback.directionCorrect && feedback.orderCorrect) return "#22886c";
  if (feedback.shapeCorrect) return "#c98a1e";
  return "#c0392b";
}

function GridBackground() {
  return (
    <g stroke="#c9d4e3" strokeWidth={2} fill="none">
      <rect x={12} y={12} width={1000} height={1000} />
      <line x1={512} y1={12} x2={512} y2={1012} strokeDasharray="8 10" />
      <line x1={12} y1={512} x2={1012} y2={512} strokeDasharray="8 10" />
      <line x1={12} y1={12} x2={1012} y2={1012} strokeDasharray="8 10" />
      <line x1={1012} y1={12} x2={12} y2={1012} strokeDasharray="8 10" />
    </g>
  );
}

export function WritingCanvas({ character, strokeData, mode, onResult }: WritingCanvasProps) {
  const groupRef = useRef<SVGGElement>(null);
  const [userStrokes, setUserStrokes] = useState<number[][][]>([]);
  const [strokeFeedback, setStrokeFeedback] = useState<StrokeFeedback[]>([]);
  const [currentStroke, setCurrentStroke] = useState<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  if (!strokeData) {
    return (
      <div className="writing-canvas writing-canvas--empty">
        <span className="writing-canvas__placeholder-char">{character}</span>
        <p>Data stroke belum tersedia — latihan menulis tidak bisa divalidasi untuk karakter ini.</p>
      </div>
    );
  }

  // Captured in a local const so nested function declarations below keep
  // TypeScript's null-narrowing from the early-return guard above.
  const data = strokeData;
  const expectedCount = data.strokes.length;

  function toLocalPoint(event: ReactPointerEvent<SVGSVGElement>): [number, number] {
    const group = groupRef.current!;
    const point = new DOMPoint(event.clientX, event.clientY);
    const local = point.matrixTransform(group.getScreenCTM()!.inverse());
    return [local.x, local.y];
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (userStrokes.length >= expectedCount) return;
    (event.target as Element).setPointerCapture(event.pointerId);
    setIsDrawing(true);
    setCurrentStroke([toLocalPoint(event)]);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!isDrawing) return;
    setCurrentStroke((prev) => [...prev, toLocalPoint(event)]);
  }

  function handlePointerUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length < MIN_POINTS_PER_STROKE) {
      setCurrentStroke([]);
      return;
    }

    const index = userStrokes.length;
    const feedback = evaluateStroke(currentStroke, data.medians, index);
    const nextUserStrokes = [...userStrokes, currentStroke];
    const nextFeedback = [...strokeFeedback, feedback];

    setUserStrokes(nextUserStrokes);
    setStrokeFeedback(nextFeedback);
    setCurrentStroke([]);

    if (nextUserStrokes.length === expectedCount) {
      onResult?.({
        character,
        mode,
        expectedStrokeCount: expectedCount,
        drawnStrokeCount: nextUserStrokes.length,
        strokes: nextFeedback,
        overallOrderCorrect: nextFeedback.every((f) => f.orderCorrect),
        overallDirectionCorrect: nextFeedback.every((f) => f.directionCorrect),
        overallShapeCorrect: nextFeedback.every((f) => f.shapeCorrect),
      });
    }
  }

  function handleReset() {
    setUserStrokes([]);
    setStrokeFeedback([]);
    setCurrentStroke([]);
    setIsDrawing(false);
  }

  const nextStrokeIndex = userStrokes.length;
  const done = nextStrokeIndex >= expectedCount;

  return (
    <div className="writing-canvas">
      {mode === "copy" && (
        <svg viewBox="0 0 1024 1024" className="writing-canvas__reference" aria-hidden="true">
          <g transform="scale(1, -1) translate(0, -900)">
            {data.strokes.map((d, i) => <path key={i} d={d} fill={STROKE_FILL} />)}
          </g>
        </svg>
      )}

      <svg
        viewBox="0 0 1024 1024"
        className="writing-canvas__svg"
        role="img"
        aria-label={`Area menulis untuk ${character}, mode ${mode}`}
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {mode === "faint_grid" && <GridBackground />}
        <g ref={groupRef} transform="scale(1, -1) translate(0, -900)">
          {mode === "trace" && (
            <g opacity={0.32}>
              {data.strokes.map((d, i) => <path key={`trace-${i}`} d={d} fill={STROKE_FILL} />)}
            </g>
          )}
          {mode === "guided" && !done && (
            <g opacity={0.22}>
              <path d={data.strokes[nextStrokeIndex]} fill={STROKE_FILL} />
            </g>
          )}

          {userStrokes.map((points, i) => (
            <path
              key={`user-${i}`}
              d={pointsToPathD(points)}
              fill="none"
              stroke={feedbackColor(strokeFeedback[i])}
              strokeWidth={28}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentStroke.length > 0 && (
            <path
              d={pointsToPathD(currentStroke)}
              fill="none"
              stroke="#2563eb"
              strokeWidth={28}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
      </svg>

      <div className="writing-canvas__controls">
        <button type="button" onClick={handleReset}>↻ Ulang</button>
        <span className="writing-canvas__count">{Math.min(userStrokes.length, expectedCount)}/{expectedCount}</span>
      </div>
    </div>
  );
}
