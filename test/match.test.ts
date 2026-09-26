/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyKick, currentPlayer, MatchSettings, MatchState, newMatch, standings } from '../src/game/match';
import type { Verdict } from '../src/game/rules';
import { quantizeKick, simulateKick } from '../src/game/sim';
import { startPosition, trackPoint } from '../src/game/spiral';
import { STAGES } from '../src/game/stages';

const cfg = STAGES[0].cfg;
const kick = { angle: 1, power: 0.3 };
const OK: Verdict = { ok: true, win: false, shortcut: false };
const SHORTCUT: Verdict = { ok: true, win: false, shortcut: true };
const FAIL: Verdict = { ok: false, reason: 'line' };
const WIN: Verdict = { ok: true, win: true, shortcut: false };
const somewhere = trackPoint(cfg, 1, 2);

function play(m: MatchState, settings: MatchSettings, verdicts: Verdict[]) {
  for (const v of verdicts) m = applyKick(m, cfg, settings, kick, v, v.ok && v.win ? { x: 0, y: 0 } : somewhere).match;
  return m;
}

// --- simulation ---

test('simulation is deterministic', () => {
  const from = startPosition(cfg);
  const k = quantizeKick({ angle: 2.123456789, power: 0.4567 });
  const a = simulateKick(cfg, 520, from, k);
  const b = simulateKick(cfg, 520, from, k);
  assert.deepEqual(a, b);
  assert.deepEqual(k, { angle: 2.1235, power: 0.457 });
});

test('slide distance matches the friction formula', () => {
  const from = { x: 0, y: 0 };
  const r = simulateKick(cfg, 500, from, { angle: 0, power: 0.5 });
  const v = 0.5 * 760;
  const expected = (v * v) / (2 * 500);
  assert.ok(Math.abs(Math.hypot(r.end.x, r.end.y) - expected) < 5, `${r.end.x} vs ${expected}`);
});

test('a hard kick off the board is out', () => {
  const r = simulateKick(cfg, 100, startPosition(cfg), { angle: 0, power: 1 });
  assert.deepEqual(r.verdict, { ok: false, reason: 'outside' });
});

// --- turns ---

test('kicks per turn: up to N successful kicks, then the next player', () => {
  const s = { kicksPerTurn: 3, par: 12 };
  let m = newMatch(cfg, 2);
  m = play(m, s, [OK, OK]);
  assert.equal(currentPlayer(m), 0);
  m = play(m, s, [OK]);
  assert.equal(currentPlayer(m), 1);
  assert.equal(m.players[0].kicks, 3);
});

test('a fail ends the turn early and sends the stone to start', () => {
  const s = { kicksPerTurn: 3, par: 12 };
  let m = play(newMatch(cfg, 2), s, [OK, FAIL]);
  assert.equal(currentPlayer(m), 1);
  assert.deepEqual({ x: m.players[0].x, y: m.players[0].y }, startPosition(cfg));
  assert.equal(m.players[0].kicks, 2);
  assert.equal(m.players[0].fails, 1);
});

test('rounds count up after everyone has had a turn', () => {
  const s = { kicksPerTurn: 1, par: 12 };
  const m = play(newMatch(cfg, 3), s, [OK, OK, OK, OK]);
  assert.equal(m.round, 2);
  assert.equal(currentPlayer(m), 1);
});

test('equal turns: the round is played out after someone gets home', () => {
  const s = { kicksPerTurn: 1, par: 12 };
  let m = newMatch(cfg, 3);
  m = play(m, s, [OK, WIN]); // P1 then P2 home in round 1
  assert.equal(m.over, false, 'P3 still gets their turn');
  assert.equal(currentPlayer(m), 2);
  m = play(m, s, [OK]);
  assert.equal(m.over, true);
});

test('first player home in the round is not automatically the winner: fewer kicks wins', () => {
  const s = { kicksPerTurn: 3, par: 12 };
  let m = newMatch(cfg, 2);
  m = play(m, s, [OK, OK, OK]); // P1: 3 kicks, not home
  m = play(m, s, [OK, OK, OK]); // P2: 3 kicks
  m = play(m, s, [OK, OK, WIN]); // P1 home in 6 kicks
  m = play(m, s, [WIN]); // P2 home in 4 kicks, same round
  assert.equal(m.over, true);
  const st = standings(m, cfg, s);
  assert.equal(st[0].player, 1);
  assert.equal(st[0].winner, true);
  assert.equal(st[1].winner, false);
});

test('first player rotates on rematch', () => {
  const m = newMatch(cfg, 3, 1);
  assert.deepEqual(m.order, [1, 2, 0]);
  assert.equal(currentPlayer(m), 1);
});

test('solo match ends when you get home', () => {
  const s = { kicksPerTurn: 1, par: 12 };
  const m = play(newMatch(cfg, 1), s, [OK, OK, WIN]);
  assert.equal(m.over, true);
});

// --- points and stars ---

test('points: win, home, under par, shortcuts, streaks', () => {
  const s = { kicksPerTurn: 3, par: 12 };
  // P1: OK, SHORTCUT, OK (streak of 3), then WIN (4 kicks, 8 under par). P2 plays its round.
  let m = newMatch(cfg, 2);
  m = play(m, s, [OK, SHORTCUT, OK]);
  m = play(m, s, [FAIL]);
  m = play(m, s, [WIN]);
  m = play(m, s, [OK, OK, OK]);
  assert.equal(m.over, true);
  const [first, second] = standings(m, cfg, s);
  assert.equal(first.player, 0);
  assert.equal(first.points, 50 + 20 + 8 * 5 + 10 + 5);
  assert.equal(second.points, 5); // one clean streak, not home
});

test('solo stars against par', () => {
  const s = { kicksPerTurn: 1, par: 3 };
  const stars = (vs: Verdict[]) => standings(play(newMatch(cfg, 1), s, vs), cfg, s)[0].stars;
  assert.equal(stars([OK, OK, WIN]), 3);
  assert.equal(stars([OK, OK, OK, OK, OK, WIN]), 2);
  assert.equal(stars([FAIL, FAIL, FAIL, FAIL, FAIL, FAIL, WIN]), 1);
});
