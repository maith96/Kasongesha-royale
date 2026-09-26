// The match engine: turns, scoring and who wins. Pure functions over a plain
// state object, so the same rules drive pass-and-play now and online later.
//
// Rules
// - Players take turns in `order`. A turn is up to `kicksPerTurn` kicks.
// - A fail sends the stone back to start, counts as a kick and ends the turn.
// - Reaching HOME finishes that player and ends their turn.
// - Equal turns: once someone is home, the round is played out so everyone
//   has had the same number of turns, then the match ends.
// - Winner: finished players ranked by fewest kicks, then fewest fails.
//   (A sudden-death kick for exact ties is still an open decision.)

import type { Verdict } from './rules';
import { progressFraction } from './rules';
import type { Kick, Point } from './sim';
import { SpiralConfig, startPosition } from './spiral';

export type MatchSettings = { kicksPerTurn: number; par: number };

export type PlayerState = Point & {
  kicks: number;
  fails: number;
  shortcuts: number;
  streak: number; // successful kicks in a row
  streaksOf3: number;
  finished: boolean;
};

export type KickLog = { player: number; round: number; from: Point; kick: Kick; verdict: Verdict };

export type MatchState = {
  players: PlayerState[];
  order: number[]; // turn order (player indexes)
  turnIdx: number; // position in `order` of whoever is kicking
  round: number; // 1-based
  kicksThisTurn: number;
  finishRound: number | null; // round in which the first player got home
  over: boolean;
  log: KickLog[];
};

export const POINTS = { win: 50, home: 20, perKickUnderPar: 5, shortcut: 10, streakOf3: 5 };

export function newMatch(cfg: SpiralConfig, playerCount: number, firstPlayer = 0): MatchState {
  const s = startPosition(cfg);
  const players = Array.from({ length: playerCount }, () => ({
    ...s,
    kicks: 0,
    fails: 0,
    shortcuts: 0,
    streak: 0,
    streaksOf3: 0,
    finished: false,
  }));
  const order = players.map((_, i) => (i + firstPlayer) % playerCount);
  return { players, order, turnIdx: 0, round: 1, kicksThisTurn: 0, finishRound: null, over: false, log: [] };
}

export function currentPlayer(m: MatchState): number {
  return m.order[m.turnIdx];
}

// Record a simulated kick for the current player. Returns the new state and
// whether that player's turn ended.
export function applyKick(
  m: MatchState,
  cfg: SpiralConfig,
  settings: MatchSettings,
  kick: Kick,
  verdict: Verdict,
  end: Point,
): { match: MatchState; turnEnded: boolean } {
  if (m.over) return { match: m, turnEnded: true };
  const next: MatchState = { ...m, players: m.players.map((p) => ({ ...p })), log: [...m.log] };
  const who = currentPlayer(next);
  const p = next.players[who];
  next.log.push({ player: who, round: next.round, from: { x: p.x, y: p.y }, kick, verdict });
  p.kicks += 1;

  let turnEnded: boolean;
  if (!verdict.ok) {
    Object.assign(p, startPosition(cfg));
    p.fails += 1;
    p.streak = 0;
    turnEnded = true;
  } else {
    p.x = end.x;
    p.y = end.y;
    p.streak += 1;
    if (p.streak % 3 === 0) p.streaksOf3 += 1;
    if (verdict.shortcut) p.shortcuts += 1;
    if (verdict.win) {
      p.finished = true;
      if (next.finishRound === null) next.finishRound = next.round;
      turnEnded = true;
    } else {
      next.kicksThisTurn += 1;
      turnEnded = next.kicksThisTurn >= settings.kicksPerTurn;
    }
  }
  if (turnEnded) endTurn(next);
  return { match: next, turnEnded };
}

function endTurn(m: MatchState) {
  m.kicksThisTurn = 0;
  const n = m.order.length;
  let i = m.turnIdx;
  for (let step = 0; step < n; step++) {
    i += 1;
    if (i >= n) {
      // Round complete. With someone home, everyone has now had equal turns.
      i = 0;
      if (m.finishRound !== null) {
        m.over = true;
        return;
      }
      m.round += 1;
    }
    if (!m.players[m.order[i]].finished) {
      m.turnIdx = i;
      return;
    }
  }
  m.over = true; // everyone is home
}

// One line of the points breakdown; the screen turns `kind` into words.
export type PointsLine = { kind: 'win' | 'home' | 'underPar' | 'shortcuts' | 'streaks'; count: number; points: number };

export type Standing = {
  player: number;
  rank: number; // 1 = winner (ties share a rank)
  winner: boolean;
  finished: boolean;
  kicks: number;
  fails: number;
  shortcuts: number;
  progress: number; // 0..1 along the track
  points: number;
  breakdown: PointsLine[];
  stars: number; // solo rating: 3 at or under par, 2 within par+3, 1 finished
};

export function standings(m: MatchState, cfg: SpiralConfig, settings: MatchSettings): Standing[] {
  const rows = m.players.map((p, i) => ({
    player: i,
    finished: p.finished,
    kicks: p.kicks,
    fails: p.fails,
    shortcuts: p.shortcuts,
    streaksOf3: p.streaksOf3,
    progress: progressFraction(cfg, p.x, p.y),
  }));
  // Finished first (fewest kicks, then fails), then everyone else by progress.
  rows.sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finished) return a.kicks - b.kicks || a.fails - b.fails;
    return b.progress - a.progress;
  });
  const same = (a: (typeof rows)[0], b: (typeof rows)[0]) =>
    a.finished && b.finished ? a.kicks === b.kicks && a.fails === b.fails : !a.finished && !b.finished && a.progress === b.progress;

  let rank = 0;
  return rows.map((r, idx) => {
    if (idx === 0 || !same(rows[idx - 1], r)) rank = idx + 1;
    const winner = m.over && r.finished && rank === 1;
    const breakdown: PointsLine[] = [];
    if (winner) breakdown.push({ kind: 'win', count: 1, points: POINTS.win });
    if (r.finished) {
      breakdown.push({ kind: 'home', count: 1, points: POINTS.home });
      const under = settings.par - r.kicks;
      if (under > 0) breakdown.push({ kind: 'underPar', count: under, points: under * POINTS.perKickUnderPar });
    }
    if (r.shortcuts) breakdown.push({ kind: 'shortcuts', count: r.shortcuts, points: r.shortcuts * POINTS.shortcut });
    if (r.streaksOf3) breakdown.push({ kind: 'streaks', count: r.streaksOf3, points: r.streaksOf3 * POINTS.streakOf3 });
    const stars = !r.finished ? 0 : r.kicks <= settings.par ? 3 : r.kicks <= settings.par + 3 ? 2 : 1;
    return {
      player: r.player,
      rank,
      winner,
      finished: r.finished,
      kicks: r.kicks,
      fails: r.fails,
      shortcuts: r.shortcuts,
      progress: r.progress,
      points: breakdown.reduce((t, b) => t + b.points, 0),
      breakdown,
      stars,
    };
  });
}
