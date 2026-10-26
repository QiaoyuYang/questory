import "server-only";

type Point = [number, number];

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / length;
}

/** Ramer–Douglas–Peucker, iterative. Keeps the outline's shape with far fewer points. */
function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDistance = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[start], points[end]);
      if (d > maxDistance) {
        maxDistance = d;
        index = i;
      }
    }
    if (index !== -1 && maxDistance > epsilon) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function area(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/**
 * Move a mask outline (an M/L/Z polygon path in mask-raster pixels) into photo
 * pixels, simplify it, and drop specks. Returns null if the path uses commands
 * this doesn't understand, so the caller can fall back to an SVG transform.
 */
export function outlineInPhotoSpace(
  path: string,
  bounds: { left: number; top: number; right: number; bottom: number },
  mask: { width: number; height: number },
): string | null {
  const scaleX = (bounds.right - bounds.left) / mask.width;
  const scaleY = (bounds.bottom - bounds.top) / mask.height;
  const tokens = path.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];

  const rings: Point[][] = [];
  let current: Point[] | null = null;
  let command = "";
  const numbers: number[] = [];

  const flush = () => {
    for (let i = 0; i + 1 < numbers.length; i += 2) {
      const point: Point = [bounds.left + numbers[i] * scaleX, bounds.top + numbers[i + 1] * scaleY];
      if (command === "M" && (i === 0 || !current)) {
        current = [point];
        rings.push(current);
      } else if (current) {
        current.push(point);
      }
    }
    numbers.length = 0;
  };

  for (const token of tokens) {
    if (/^[A-Za-z]$/.test(token)) {
      flush();
      if (!["M", "L", "Z", "z"].includes(token)) return null;
      command = token.toUpperCase();
      if (command === "Z") current = null;
    } else {
      numbers.push(Number(token));
    }
  }
  flush();

  const boxArea = Math.max(1, (bounds.right - bounds.left) * (bounds.bottom - bounds.top));
  const epsilon = Math.max(1, Math.hypot(bounds.right - bounds.left, bounds.bottom - bounds.top) * 0.004);
  const kept = rings
    .map((ring) => simplify(ring, epsilon))
    .filter((ring) => ring.length >= 3)
    .map((ring) => ({ ring, area: area(ring) }))
    .sort((a, b) => b.area - a.area)
    .filter((entry, i) => i === 0 || entry.area >= boxArea * 0.004)
    .map((entry) => entry.ring);
  if (kept.length === 0) return null;

  const f = (n: number) => (Math.round(n * 10) / 10).toString();
  return kept
    .map((ring) => `M${ring.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}Z`)
    .join("");
}
