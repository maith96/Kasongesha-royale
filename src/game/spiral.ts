// Geometry of the Kasongesha board: an Archimedean spiral drawn inwards,
// plus a straight divider line that splits it into a top and bottom half.
//
// World coordinates are centred on the spiral's centre, with y pointing down
// (same as SVG). The spiral line starts at angle 0 (on the divider, right side)
// at the outer radius and winds clockwise inwards for `rings` full turns.
//
// The track is the corridor between two consecutive turns of the line.
// "Ring k" at a given angle is the k-th corridor counting from the outside
// (ring 0 = outermost), which is how players describe tracks.

const TAU = Math.PI * 2;

export type SpiralConfig = {
  rings: number; // full turns of the spiral line
  pitch: number; // track width (gap between consecutive turns)
  centreRadius: number; // radius where the spiral line ends
  stoneRadius: number;
};

export const DEFAULT_SPIRAL: SpiralConfig = {
  rings: 4,
  pitch: 58,
  centreRadius: 42,
  stoneRadius: 12,
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

export function outerRadius(cfg: SpiralConfig): number {
  return cfg.centreRadius + cfg.pitch * cfg.rings;
}

export function maxTheta(cfg: SpiralConfig): number {
  return TAU * cfg.rings;
}

export function lineRadius(cfg: SpiralConfig, theta: number): number {
  return outerRadius(cfg) - (cfg.pitch * theta) / TAU;
}

function normAngle(a: number): number {
  const m = a % TAU;
  return m < 0 ? m + TAU : m;
}

export function locate(cfg: SpiralConfig, x: number, y: number): Location {
  const r = Math.hypot(x, y);
  const phi = normAngle(Math.atan2(y, x));
  const half: Half = y < 0 ? 'top' : 'bottom';

  if (r <= cfg.centreRadius - cfg.stoneRadius) {
    return { r, phi, half, kind: 'home', ring: cfg.rings, progress: maxTheta(cfg) };
  }

  const ring = Math.floor((outerRadius(cfg) - r) / cfg.pitch - phi / TAU);
  if (ring < 0) {
    return { r, phi, half, kind: 'outside', ring: -1, progress: -1 };
  }
  // Past the last turn you are in the open centre but not fully inside home.
  const clamped = Math.min(ring, cfg.rings - 1);
  const progress = Math.min(phi + TAU * clamped, maxTheta(cfg));
  return { r, phi, half, kind: 'track', ring: clamped, progress };
}

// Perpendicular distance from a point to the spiral line (not the divider).
export function distanceToSpiral(cfg: SpiralConfig, x: number, y: number): number {
  const r = Math.hypot(x, y);
  const phi = normAngle(Math.atan2(y, x));
  const b = cfg.pitch / TAU; // dr/dθ
  const slope = r / Math.hypot(r, b); // radial → perpendicular correction
  let best = Infinity;
  for (let j = 0; j <= cfg.rings; j++) {
    const theta = phi + TAU * j;
    if (theta > maxTheta(cfg)) break;
    best = Math.min(best, Math.abs(r - lineRadius(cfg, theta)) * slope);
  }
  // The two loose ends of the line.
  const outer = outerRadius(cfg);
  best = Math.min(best, Math.hypot(x - outer, y), Math.hypot(x - cfg.centreRadius, y));
  return best;
}

// The divider runs across the spiral on y = 0 but stops at the centre circle,
// so the home zone is one clean space. On the left it ends at the outermost
// line; on the right it closes the entrance.
export function dividerEnd(cfg: SpiralConfig, side: 'left' | 'right'): number {
  return side === 'right' ? outerRadius(cfg) : lineRadius(cfg, Math.PI);
}

export function distanceToDivider(cfg: SpiralConfig, x: number, y: number): number {
  const outer = dividerEnd(cfg, x < 0 ? 'left' : 'right');
  const ax = Math.abs(x);
  if (ax >= cfg.centreRadius && ax <= outer) return Math.abs(y);
  const nearestX = ax < cfg.centreRadius ? cfg.centreRadius : outer;
  return Math.hypot(ax - nearestX, y);
}

export function touchesLine(cfg: SpiralConfig, x: number, y: number): boolean {
  return (
    distanceToSpiral(cfg, x, y) < cfg.stoneRadius ||
    distanceToDivider(cfg, x, y) < cfg.stoneRadius
  );
}

export function startPosition(cfg: SpiralConfig): { x: number; y: number } {
  const phi = 0.45;
  const r = lineRadius(cfg, phi) - cfg.pitch / 2;
  return { x: r * Math.cos(phi), y: r * Math.sin(phi) };
}

// Points along the spiral line, for drawing.
export function spiralPoints(cfg: SpiralConfig, step = 0.05): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const end = maxTheta(cfg);
  for (let t = 0; t < end; t += step) {
    const r = lineRadius(cfg, t);
    pts.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
  }
  pts.push({ x: cfg.centreRadius, y: 0 });
  return pts;
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
