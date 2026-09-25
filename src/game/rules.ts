import { locate, SpiralConfig, touchesLine } from './spiral';

const TAU = Math.PI * 2;

export type Verdict =
  | { ok: true; win: boolean; shortcut: boolean }
  | { ok: false; reason: 'line' | 'outside' | 'wrong-track' | 'foot-down' };

// Tracks a single push while the stone slides, so we know whether it jumped
// over any spiral line on the way (a shortcut attempt).
export class PushTracker {
  private lastProgress: number;
  crossedLine = false;

  constructor(private cfg: SpiralConfig, x: number, y: number) {
    this.lastProgress = locate(cfg, x, y).progress;
  }

  step(x: number, y: number) {
    const loc = locate(this.cfg, x, y);
    // Sliding along the corridor changes progress smoothly, even across the
    // divider. Jumping over a spiral line changes it by a whole turn.
    if (Math.abs(loc.progress - this.lastProgress) > Math.PI) this.crossedLine = true;
    this.lastProgress = loc.progress;
  }
}

export function judgePush(
  cfg: SpiralConfig,
  from: { x: number; y: number },
  to: { x: number; y: number },
  crossedLine: boolean,
): Verdict {
  const start = locate(cfg, from.x, from.y);
  const end = locate(cfg, to.x, to.y);

  if (touchesLine(cfg, to.x, to.y)) return { ok: false, reason: 'line' };
  if (end.kind === 'outside') return { ok: false, reason: 'outside' };
  if (end.kind === 'home') return { ok: true, win: true, shortcut: crossedLine };

  if (crossedLine) {
    // Shortcut across the middle: must land on the other half, same ring.
    const sameRing = end.ring === start.ring;
    const otherHalf = end.half !== start.half;
    if (!sameRing || !otherHalf) return { ok: false, reason: 'wrong-track' };
    return { ok: true, win: false, shortcut: true };
  }
  return { ok: true, win: false, shortcut: false };
}

export function progressFraction(cfg: SpiralConfig, x: number, y: number): number {
  const loc = locate(cfg, x, y);
  if (loc.kind === 'home') return 1;
  if (loc.kind === 'outside') return 0;
  return loc.progress / (TAU * cfg.rings);
}
