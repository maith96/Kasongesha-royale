/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { currentPlayer } from '../src/game/match';
import { simulateKick } from '../src/game/sim';
import { progressFraction } from '../src/game/rules';
import { startPosition } from '../src/game/spiral';
import { STAGES } from '../src/game/stages';
import { afterKick, cleanName, MatchDoc, newCode, normaliseCode, rebuild } from '../src/online/model';

const doc = (over: Partial<MatchDoc> = {}): MatchDoc => ({
  code: 'ABC234',
  hostUid: 'a',
  config: { stage: 0, surface: 0, wet: false, kicksPerTurn: 1 },
  maxPlayers: 2,
  players: [
    { uid: 'a', name: 'Amani' },
    { uid: 'b', name: 'Baraka' },
  ],
  status: 'playing',
  kicks: [],
  turnUid: 'a',
  ...over,
});

// A gentle kick along the track from the start that lands cleanly.
const cfg = STAGES[0].cfg;
const s = startPosition(cfg);
const goodKick = { angle: Math.atan2(s.y, s.x) + Math.PI / 2, power: 0.2 };

test('codes are 6 readable characters', () => {
  for (let i = 0; i < 50; i++) assert.match(newCode(), /^[A-HJKMNP-Z2-9]{6}$/);
  assert.equal(normaliseCode(' abc-234 x'), 'ABC234');
});

test('names are trimmed and capped', () => {
  assert.equal(cleanName('  Amani   the   Great kicker of Kibera '), 'Amani the Great');
});

test('a clean kick with 1 kick per turn passes the turn', () => {
  assert.equal(simulateKick(cfg, 520, s, goodKick).verdict.ok, true);
  const u = afterKick(doc(), goodKick);
  assert.equal(u.kicks.length, 1);
  assert.equal(u.turnUid, 'b');
  assert.equal(u.status, 'playing');
});

test('with 2 kicks per turn the same player kicks again', () => {
  const u = afterKick(doc({ config: { stage: 0, surface: 0, wet: false, kicksPerTurn: 2 } }), goodKick);
  assert.equal(u.turnUid, 'a');
});

test('rebuilding from kicks gives the same state on every phone', () => {
  let d = doc();
  for (let i = 0; i < 6; i++) d = { ...d, ...afterKick(d, { angle: 1 + i * 0.7, power: 0.15 + (i % 3) * 0.1 }) };
  const a = rebuild(d);
  const b = rebuild(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(a, b);
  assert.equal(d.turnUid, d.players[currentPlayer(a)].uid);
});

// Greedy bot: the legal kick that gets furthest along the track.
function bestKick(d: MatchDoc) {
  const m = rebuild(d);
  const p = m.players[currentPlayer(m)];
  let best = { angle: 0, power: 0.05 };
  let bestScore = -1;
  for (let a = 0; a < 48; a++) {
    for (let pw = 1; pw <= 16; pw++) {
      const k = { angle: (a / 48) * Math.PI * 2, power: pw / 20 };
      const r = simulateKick(cfg, 520, p, k);
      if (!r.verdict.ok) continue;
      const score = r.verdict.win ? 1e9 : progressFraction(cfg, r.end.x, r.end.y);
      if (score > bestScore) [best, bestScore] = [k, score];
    }
  }
  return best;
}

test('the match ends with equal turns when someone gets home', () => {
  let d = doc();
  let guard = 0;
  while (d.status === 'playing' && guard++ < 200) {
    // A plays to win; B just nudges along.
    const k = d.turnUid === 'a' ? bestKick(d) : goodKickFrom(d);
    d = { ...d, ...afterKick(d, k) };
  }
  assert.equal(d.status, 'over');
  assert.equal(d.turnUid, null);
  const m = rebuild(d);
  assert.equal(m.players[0].finished, true);
  // B had as many turns as A (1 kick per turn, B never fails a nudge here or it'd still be one turn).
  const kicksA = m.log.filter((l) => l.player === 0).length;
  const kicksB = m.log.filter((l) => l.player === 1).length;
  assert.equal(kicksA, kicksB);
});

function goodKickFrom(d: MatchDoc) {
  const m = rebuild(d);
  const p = m.players[currentPlayer(m)];
  return { angle: Math.atan2(p.y, p.x) + Math.PI / 2, power: 0.08 };
}
