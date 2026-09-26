import { lineExists, locate, rawRing, SpiralConfig, startPosition, touchesLine } from './spiral';

const TAU = Math.PI * 2;

export type Verdict =
  | { ok: true; win: boolean; shortcut: boolean }
  | { ok: false; reason: 'line' | 'outside' | 'too-far' | 'foot-down' };

// A kick may slide over at most this many spiral lines.
export const MAX_LINES_PER_KICK = 1;

// Counts the spiral lines a stone slides over during one push. (The divider
// isn't a spiral line, so crossing it doesn't count.)
export class PushTracker {
  private last: { phi: number; ring: number };
  linesCrossed = 0;

  constructor(private cfg: SpiralConfig, x: number, y: number) {
    this.last = rawRing(cfg, x, y);
  }

  get crossedLine() {
    return this.linesCrossed > 0;
  }

  step(x: number, y: number) {
    const now = rawRing(this.cfg, x, y);
    // Ring numbers step by one where the spiral wraps round (angle 0) even
    // though the stone stays in the same corridor; undo that.
    let d = now.ring - this.last.ring;
    const dphi = now.phi - this.last.phi;
    if (dphi < -Math.PI) d -= 1;
    else if (dphi > Math.PI) d += 1;
    // Each ring boundary passed is a line, if the line exists at that angle.
    const [lo, hi] = d > 0 ? [now.ring - d + 1, now.ring] : [now.ring + 1, now.ring - d];
    for (let j = lo; j <= hi; j++) if (lineExists(this.cfg, now.phi, j)) this.linesCrossed += 1;
    this.last = now;
  }
}

export function judgePush(
  cfg: SpiralConfig,
  from: { x: number; y: number },
  to: { x: number; y: number },
  linesCrossed: number,
): Verdict {
  const start = locate(cfg, from.x, from.y);
  const end = locate(cfg, to.x, to.y);

  // The stone may slide over lines; only where it stops counts.
  if (touchesLine(cfg, to.x, to.y)) return { ok: false, reason: 'line' };
  if (end.kind === 'outside') return { ok: false, reason: 'outside' };
  if (linesCrossed > MAX_LINES_PER_KICK) return { ok: false, reason: 'too-far' };
  const shortcut = linesCrossed > 0 && end.progress > start.progress;
  return { ok: true, win: end.kind === 'home', shortcut };
}

export function progressFraction(cfg: SpiralConfig, x: number, y: number): number {
  const loc = locate(cfg, x, y);
  if (loc.kind === 'home') return 1;
  if (loc.kind === 'outside') return 0;
  const s = startPosition(cfg);
  const from = locate(cfg, s.x, s.y).progress;
  return Math.max(0, (loc.progress - from) / (TAU * cfg.rings - from));
}
