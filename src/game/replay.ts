// Rebuild a match from its kick log. Because the simulation is deterministic,
// re-running each logged kick reproduces exactly what happened, so a replay
// only needs the kick inputs (aim + power), which is also all an online
// opponent will need to be sent.

import { applyKick, currentPlayer, KickLog, MatchSettings, newMatch } from './match';
import type { Verdict } from './rules';
import { KickResult, Point, simulateKick } from './sim';
import { SpiralConfig } from './spiral';

export type ReplayStep = {
  player: number;
  round: number;
  path: Point[];
  verdict: Verdict;
  before: Point[]; // every player's stone before this kick
  after: Point[]; // and after it
};

export type Replay = { steps: ReplayStep[]; matchesLog: boolean };

export function buildReplay(
  cfg: SpiralConfig,
  friction: number,
  settings: MatchSettings,
  playerCount: number,
  firstPlayer: number,
  log: KickLog[],
): Replay {
  let m = newMatch(cfg, playerCount, firstPlayer);
  const steps: ReplayStep[] = [];
  let matchesLog = true;
  const positions = () => m.players.map((p) => ({ x: p.x, y: p.y }));

  for (const entry of log) {
    const who = currentPlayer(m);
    if (who !== entry.player) matchesLog = false;
    const from = { x: m.players[who].x, y: m.players[who].y };
    const result: KickResult =
      !entry.verdict.ok && entry.verdict.reason === 'foot-down'
        ? { path: [from], end: from, verdict: entry.verdict }
        : simulateKick(cfg, friction, from, entry.kick);
    if (JSON.stringify(result.verdict) !== JSON.stringify(entry.verdict)) matchesLog = false;
    const before = positions();
    const round = m.round;
    m = applyKick(m, cfg, settings, entry.kick, result.verdict, result.end).match;
    steps.push({ player: who, round, path: result.path, verdict: result.verdict, before, after: positions() });
  }
  return { steps, matchesLog };
}
