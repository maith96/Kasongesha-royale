// Geometry of the Kasongesha board: a spiral drawn inwards, plus a straight
// divider line that splits it into a top and bottom half.
//
// The spiral can be round or follow a regular polygon (square, triangle, …).
// Every shape is described by a "shape factor" P(φ): how far the outline is
// from the centre at angle φ relative to its inradius. A circle has P = 1;
// a polygon has P = 1 in the middle of each side and grows towards corners.
// Actual radius = normalised radius × P(φ), so the ring/progress maths is the
// same for every shape once a point's radius is divided by P(φ).
//
// A round spiral shrinks smoothly. A polygon spiral is drawn like chalk on the
// ground: each side is a straight line parallel to the shape's edge, and the
// line steps inwards by pitch / sides at every corner.
//
// World coordinates are centred on the spiral's centre, with y pointing down
// (same as SVG). The spiral line starts at angle 0 (on the divider, right side)
// at the outer edge and winds clockwise inwards for `rings` full turns.
//
// The track is the corridor between two consecutive turns of the line.
// "Ring k" at a given angle is the k-th corridor counting from the outside
// (ring 0 = outermost), which is how players describe tracks.

const TAU = Math.PI * 2;

export type SpiralConfig = {
  rings: number; // full turns of the spiral line
  pitch: number; // track width in the middle of a side (gap between turns)
  centreRadius: number; // where the spiral line ends (normalised)
  stoneRadius: number;
  sides: number; // 0 for a round spiral, else polygon sides
  rotation: number; // angle of one polygon corner
};

export const DEFAULT_SPIRAL: SpiralConfig = {
  rings: 4,
  pitch: 58,
  centreRadius: 42,
  stoneRadius: 12,
  sides: 0,
  rotation: 0,
};

export type Half = 'top' | 'bottom';

export type Location = {
  r: number;
  phi: number; // [0, 2π), clockwise from the positive x axis
  half: Half;
  kind: 'track' | 'home' | 'outside';
  ring: number; // corridor index from the outside; -1 when outside
  progress: number; // distance along the track in radians of turn
};

type Point = { x: number; y: number };

function normAngle(a: number): number {
  const m = a % TAU;
  return m < 0 ? m + TAU : m;
}

export function shapeFactor(cfg: SpiralConfig, phi: number): number {
  if (cfg.sides < 3) return 1;
  const seg = TAU / cfg.sides;
  const a = normAngle(phi - cfg.rotation) % seg;
  return 1 / Math.cos(a - seg / 2);
}

export function outerRadius(cfg: SpiralConfig): number {
  return cfg.centreRadius + cfg.pitch * cfg.rings;
}

export function maxTheta(cfg: SpiralConfig): number {
  return TAU * cfg.rings;
}

function firstCorner(cfg: SpiralConfig): number {
  return normAngle(cfg.rotation) % (TAU / cfg.sides);
}

// How far the line has stepped in by angle φ within one turn, φ in [0, 2π).
function turnOffset(cfg: SpiralConfig, phi: number): number {
  if (cfg.sides < 3) return (cfg.pitch * phi) / TAU;
  const c = firstCorner(cfg);
  const corners = phi < c ? 0 : Math.floor((phi - c) / (TAU / cfg.sides)) + 1;
  return (cfg.pitch / cfg.sides) * corners;
}

// Normalised distance from the centre to the spiral line at turn angle θ.
function normalisedLine(cfg: SpiralConfig, theta: number): number {
  const turns = Math.floor(theta / TAU);
  return outerRadius(cfg) - cfg.pitch * turns - turnOffset(cfg, theta - turns * TAU);
}

// Actual distance from the centre to the spiral line at turn angle θ.
export function lineRadius(cfg: SpiralConfig, theta: number): number {
  return normalisedLine(cfg, theta) * shapeFactor(cfg, theta);
}

function polar(r: number, phi: number): Point {
  return { x: r * Math.cos(phi), y: r * Math.sin(phi) };
}

// Middle of ring `ring` at angle `phi`.
export function trackPoint(cfg: SpiralConfig, ring: number, phi: number): Point {
  const rn = normalisedLine(cfg, phi + TAU * ring) - cfg.pitch / 2;
  return polar(rn * shapeFactor(cfg, phi), phi);
}

// Unclamped ring coordinate: how many track-widths in from the outer line the
// point is at its angle (negative outside the spiral, beyond the last ring in
// the centre). Used to count line crossings while a stone slides.
export function rawRing(cfg: SpiralConfig, x: number, y: number): { phi: number; ring: number } {
  const phi = normAngle(Math.atan2(y, x));
  const rn = Math.hypot(x, y) / shapeFactor(cfg, phi);
  return { phi, ring: Math.floor((outerRadius(cfg) - turnOffset(cfg, phi) - rn) / cfg.pitch) };
}

// Is there a spiral line between ring j-1 and ring j at angle φ? (The line
// ends at the centre, so the innermost "walls" don't exist everywhere.)
export function lineExists(cfg: SpiralConfig, phi: number, j: number): boolean {
  const theta = phi + TAU * j;
  return j >= 0 && theta <= maxTheta(cfg);
}

export function locate(cfg: SpiralConfig, x: number, y: number): Location {
  const r = Math.hypot(x, y);
  const phi = normAngle(Math.atan2(y, x));
  const half: Half = y < 0 ? 'top' : 'bottom';
  const rn = r / shapeFactor(cfg, phi);

  if (rn <= cfg.centreRadius - cfg.stoneRadius) {
    return { r, phi, half, kind: 'home', ring: cfg.rings, progress: maxTheta(cfg) };
  }

  const ring = Math.floor((outerRadius(cfg) - turnOffset(cfg, phi) - rn) / cfg.pitch);
  if (ring < 0) {
    return { r, phi, half, kind: 'outside', ring: -1, progress: -1 };
  }
  // Past the last turn you are in the open centre but not fully inside home.
  const clamped = Math.min(ring, cfg.rings - 1);
  const progress = Math.min(phi + TAU * clamped, maxTheta(cfg));
  return { r, phi, half, kind: 'track', ring: clamped, progress };
}

// Turn angles to sample: an even step plus every polygon corner, so the
// drawn line (and the touch test against it) keeps its corners sharp.
function sampleAngles(cfg: SpiralConfig, end: number, step: number): number[] {
  const ts: number[] = [];
  for (let t = 0; t < end; t += step) ts.push(t);
  if (cfg.sides >= 3) {
    for (let c = firstCorner(cfg); c < end; c += TAU / cfg.sides) ts.push(c);
  }
  ts.push(end);
  return ts.sort((a, b) => a - b);
}

const pointCache = new WeakMap<SpiralConfig, Point[]>();

// Corner where the side ending at angle t meets the next, one step further in.
function cornerPoint(cfg: SpiralConfig, t: number): Point {
  const seg = TAU / cfg.sides;
  const n1 = t - seg / 2; // outward normal of the side before the corner
  const n2 = t + seg / 2; // and after it
  const r1 = normalisedLine(cfg, t - seg / 2);
  const r2 = normalisedLine(cfg, t + seg / 2);
  const det = Math.sin(seg);
  return {
    x: (r1 * Math.sin(n2) - r2 * Math.sin(n1)) / det,
    y: (r2 * Math.cos(n1) - r1 * Math.cos(n2)) / det,
  };
}

// Points along the spiral line, for drawing and touch tests.
export function spiralPoints(cfg: SpiralConfig): Point[] {
  let pts = pointCache.get(cfg);
  if (!pts) {
    const end = maxTheta(cfg);
    if (cfg.sides < 3) {
      pts = sampleAngles(cfg, end, 0.03).map((t) => polar(lineRadius(cfg, t), t));
    } else {
      // Straight sides: just the start, every corner, and the end.
      pts = [polar(lineRadius(cfg, 0), 0)];
      for (let t = firstCorner(cfg); t < end; t += TAU / cfg.sides) pts.push(cornerPoint(cfg, t));
      pts.push(polar(cfg.centreRadius * shapeFactor(cfg, 0), 0));
    }
    pointCache.set(cfg, pts);
  }
  return pts;
}

// Closed outline of the shape at normalised radius `rn` (for the home zone).
export function outlinePoints(cfg: SpiralConfig, rn: number): Point[] {
  return sampleAngles(cfg, TAU, 0.1).map((t) => polar(rn * shapeFactor(cfg, t), t));
}

function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Distance from a point to the spiral line (not the divider).
export function distanceToSpiral(cfg: SpiralConfig, x: number, y: number): number {
  const pts = spiralPoints(cfg);
  const p = { x, y };
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, segmentDistance(p, pts[i - 1], pts[i]));
  return best;
}

// The divider runs across the spiral on y = 0 but stops at the home zone.
// On the left it ends at the outermost line; on the right it closes the entrance.
export function dividerEnd(cfg: SpiralConfig, side: 'left' | 'right'): number {
  return side === 'right' ? lineRadius(cfg, 0) : lineRadius(cfg, Math.PI);
}

export function dividerStart(cfg: SpiralConfig, side: 'left' | 'right'): number {
  return cfg.centreRadius * shapeFactor(cfg, side === 'right' ? 0 : Math.PI);
}

export function distanceToDivider(cfg: SpiralConfig, x: number, y: number): number {
  const side = x < 0 ? 'left' : 'right';
  const inner = dividerStart(cfg, side);
  const outer = dividerEnd(cfg, side);
  const ax = Math.abs(x);
  if (ax >= inner && ax <= outer) return Math.abs(y);
  return Math.hypot(ax - (ax < inner ? inner : outer), y);
}

export function touchesLine(cfg: SpiralConfig, x: number, y: number): boolean {
  return (
    distanceToSpiral(cfg, x, y) < cfg.stoneRadius ||
    distanceToDivider(cfg, x, y) < cfg.stoneRadius
  );
}

export function startPosition(cfg: SpiralConfig): Point {
  return trackPoint(cfg, 0, 0.45);
}

// Tight box around everything drawn in chalk, for framing the board.
export function boardBounds(cfg: SpiralConfig) {
  const pts = spiralPoints(cfg);
  const xs = pts.map((p) => p.x).concat(-dividerEnd(cfg, 'left'), dividerEnd(cfg, 'right'));
  const ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}
