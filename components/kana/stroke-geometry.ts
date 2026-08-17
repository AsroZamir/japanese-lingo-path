export type KanaStrokeData = { strokes: string[]; medians: number[][][] };

export function medianPathD(points: number[][]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first[0]},${first[1]} ` + rest.map(([x, y]) => `L ${x},${y}`).join(" ");
}

export function medianLength(points: number[][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return total;
}

/** Arc-length resample to a fixed point count — puts two strokes of any
 * length/density on equal footing before comparing them point-by-point. */
export function resamplePoints(points: number[][], count: number): number[][] {
  if (points.length === 0) return [];
  if (points.length === 1 || count === 1) return Array(count).fill(points[0]);

  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = cumulative[cumulative.length - 1];
  if (total === 0) return Array(count).fill(points[0]);

  const result: number[][] = [];
  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1);
    let segIndex = cumulative.findIndex((c) => c >= target);
    if (segIndex <= 0) segIndex = 1;
    const segStart = cumulative[segIndex - 1];
    const segEnd = cumulative[segIndex];
    const t = segEnd === segStart ? 0 : (target - segStart) / (segEnd - segStart);
    const [x0, y0] = points[segIndex - 1];
    const [x1, y1] = points[segIndex];
    result.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
  }
  return result;
}

export function averagePointDistance(a: number[][], b: number[][]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]);
  return sum / n;
}

export function strokeDirectionAngle(points: number[][]): number {
  const first = points[0];
  const last = points[points.length - 1];
  return Math.atan2(last[1] - first[1], last[0] - first[0]) * (180 / Math.PI);
}

export function angleDifference(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}
