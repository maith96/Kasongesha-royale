/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { EMPTY_PROGRESS, isUnlocked, LEVELS, nextLevel, recordStars, totalStars } from '../src/game/campaign';
import { applyKick, currentPlayer, newMatch } from '../src/game/match';
import { buildReplay } from '../src/game/replay';
import { quantizeKick, simulateKick } from '../src/game/sim';
import { STAGES } from '../src/game/stages';

// Tiny seeded random so the "match" is the same every run.
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

test('replaying a match log reproduces every kick exactly', () => {
  for (const [stageIdx, players, kpt] of [[0, 2, 2], [1, 3, 1], [2, 4, 3]] as const) {
    const { cfg } = STAGES[stageIdx];
    const settings = { kicksPerTurn: kpt, par: 10 };
    const friction = 520;
    const rand = rng(42 + stageIdx);
    let m = newMatch(cfg, players, 1);
    for (let i = 0; i < 40 && !m.over; i++) {
      const p = m.players[currentPlayer(m)];
      const kick = quantizeKick({ angle: rand() * Math.PI * 2, power: 0.1 + rand() * 0.5 });
      const r = simulateKick(cfg, friction, { x: p.x, y: p.y }, kick);
      m = applyKick(m, cfg, settings, kick, r.verdict, r.end).match;
    }
    const replay = buildReplay(cfg, friction, settings, players, 1, m.log);
    assert.equal(replay.matchesLog, true);
    assert.equal(replay.steps.length, m.log.length);
    const last = replay.steps[replay.steps.length - 1];
    assert.deepEqual(last.after, m.players.map((p) => ({ x: p.x, y: p.y })));
    // Each step starts where the previous one left off.
    for (let i = 1; i < replay.steps.length; i++) assert.deepEqual(replay.steps[i].before, replay.steps[i - 1].after);
  }
});

test('campaign: only the first level is open at the start', () => {
  assert.equal(isUnlocked(EMPTY_PROGRESS, 0), true);
  assert.equal(isUnlocked(EMPTY_PROGRESS, 1), false);
  assert.equal(nextLevel(EMPTY_PROGRESS, 0), null);
});

test('campaign: finishing a level opens the next', () => {
  const p = recordStars(EMPTY_PROGRESS, '1', 1);
  assert.equal(isUnlocked(p, 1), true);
  assert.equal(isUnlocked(p, 2), false);
  assert.equal(nextLevel(p, 0), 1);
});

test('campaign: best stars are kept', () => {
  let p = recordStars(EMPTY_PROGRESS, '1', 3);
  p = recordStars(p, '1', 1);
  assert.equal(p.stars['1'], 3);
  assert.equal(totalStars(p), 3);
});

test('campaign: bonus levels unlock by total stars', () => {
  const b1 = LEVELS.findIndex((l) => l.id === 'B1');
  let p = EMPTY_PROGRESS;
  for (const id of ['1', '2', '3']) p = recordStars(p, id, 3);
  assert.equal(isUnlocked(p, b1), false); // 9 stars
  p = recordStars(p, '4', 3); // 12 stars
  assert.equal(isUnlocked(p, b1), true);
});

test('campaign: every level has a sensible par', () => {
  for (const l of LEVELS) assert.ok(l.par >= STAGES[l.stage].par, l.id);
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, LEVELS.length);
});
