// Deterministic kick simulation. Runs at a fixed time step, independent of
// the phone's frame rate, so the same kick gives the same result everywhere.
// The game animates the returned path; replays and (later) the server can
// re-run the same inputs and get the same outcome.

import { judgePush, PushTracker, Verdict } from './rules';
import { outerRadius, SpiralConfig } from './spiral';

export const MAX_SPEED = 760; // world units / s at full power
export const SIM_DT = 1 / 120; // seconds per physics step
const STOP_SPEED = 4;
const MAX_STEPS = 120 * 20; // safety cap: 20 s of sliding

export type Point = { x: number; y: number };
export type Kick = { angle: number; power: number };

export type KickResult = {
  path: Point[]; // stone position after every step, starting at `from`
  end: Point;
  verdict: Verdict;
};

// Round inputs so they survive being stored or sent over the network intact.
export function quantizeKick(k: Kick): Kick {
  return {
    angle: Math.round(k.angle * 1e4) / 1e4,
    power: Math.round(Math.min(Math.max(k.power, 0), 1) * 1e3) / 1e3,
  };
}

export function simulateKick(cfg: SpiralConfig, friction: number, from: Point, kick: Kick): KickResult {
  const speed0 = kick.power * MAX_SPEED;
  let x = from.x;
  let y = from.y;
  let vx = Math.cos(kick.angle) * speed0;
  let vy = Math.sin(kick.angle) * speed0;
  const tracker = new PushTracker(cfg, x, y);
  const path: Point[] = [{ x, y }];
  const flyOff = outerRadius(cfg) * 3;
  const decel = friction * SIM_DT;

  for (let i = 0; i < MAX_STEPS; i++) {
    const speed = Math.hypot(vx, vy);
    if (speed < STOP_SPEED) break;
    const slow = Math.min(decel, speed);
    vx -= (vx / speed) * slow;
    vy -= (vy / speed) * slow;
    x += vx * SIM_DT;
    y += vy * SIM_DT;
    tracker.step(x, y);
    path.push({ x, y });
    if (Math.hypot(x, y) > flyOff) {
      return { path, end: { x, y }, verdict: { ok: false, reason: 'outside' } };
    }
  }
  const end = { x, y };
  return { path, end, verdict: judgePush(cfg, from, end, tracker.crossedLine) };
}
