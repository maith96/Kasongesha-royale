import { locate, SpiralConfig, touchesLine } from './spiral';

const TAU = Math.PI * 2;

export type Verdict =
  | { ok: true; win: boolean; shortcut: boolean }
  | { ok: false; reason: 'line' | 'outside' | 'foot-down' };

// Tracks a single push while the stone slides, so we know whether it jumped
// over any spiral line on the way (a shortcut, worth celebrating).
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

  // The stone may slide over lines; only where it stops counts.
  if (touchesLine(cfg, to.x, to.y)) return { ok: false, reason: 'line' };
  if (end.kind === 'outside') return { ok: false, reason: 'outside' };
  const shortcut = crossedLine && end.progress > start.progress;
  return { ok: true, win: end.kind === 'home', shortcut };
}

export function progressFraction(cfg: SpiralConfig, x: number, y: number): number {
  const loc = locate(cfg, x, y);
  if (loc.kind === 'home') return 1;
  if (loc.kind === 'outside') return 0;
  return loc.progress / (TAU * cfg.rings);
}
