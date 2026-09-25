/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SPIRAL as cfg,
  lineRadius,
  locate,
  startPosition,
  touchesLine,
} from '../src/game/spiral';
import { judgePush, PushTracker } from '../src/game/rules';

// Centre of ring `ring` at angle `phi`.
function onTrack(ring: number, phi: number) {
  const r = lineRadius(cfg, phi + Math.PI * 2 * ring) - cfg.pitch / 2;
  return { x: r * Math.cos(phi), y: r * Math.sin(phi) };
}

// Slide in a straight line, as the physics does, and return whether a line was jumped.
function slide(from: { x: number; y: number }, to: { x: number; y: number }) {
  const t = new PushTracker(cfg, from.x, from.y);
  for (let i = 1; i <= 200; i++) {
    t.step(from.x + ((to.x - from.x) * i) / 200, from.y + ((to.y - from.y) * i) / 200);
  }
  return t.crossedLine;
}

test('start position is clean and on the outermost ring', () => {
  const s = startPosition(cfg);
  assert.equal(touchesLine(cfg, s.x, s.y), false);
  assert.equal(locate(cfg, s.x, s.y).ring, 0);
});

test('rings count from the outside at any angle', () => {
  for (const phi of [0.3, Math.PI / 2, Math.PI, 4.5, 6]) {
    for (let k = 0; k < cfg.rings; k++) {
      const p = onTrack(k, phi);
      if (Math.hypot(p.x, p.y) < cfg.centreRadius) continue;
      assert.equal(locate(cfg, p.x, p.y).ring, k, `ring ${k} at ${phi}`);
    }
  }
});

test('short push along the track is fine', () => {
  const a = onTrack(0, 1.0);
  const b = onTrack(0, 1.4);
  const crossed = slide(a, b);
  assert.equal(crossed, false);
  assert.deepEqual(judgePush(cfg, a, b, crossed), { ok: true, win: false, shortcut: false });
});

test('stopping on the spiral line fails', () => {
  const a = onTrack(0, 1.0);
  const r = lineRadius(cfg, 1.3);
  const b = { x: r * Math.cos(1.3), y: r * Math.sin(1.3) };
  assert.deepEqual(judgePush(cfg, a, b, false), { ok: false, reason: 'line' });
});

test('stopping on the divider fails', () => {
  const a = onTrack(1, Math.PI - 0.3);
  const b = onTrack(1, Math.PI); // left side, right on y = 0
  assert.deepEqual(judgePush(cfg, a, b, slide(a, b)), { ok: false, reason: 'line' });
});

test('shortcut across the middle to the same ring on the other half is valid', () => {
  const a = onTrack(0, Math.PI / 2); // bottom, outermost
  const b = onTrack(0, (3 * Math.PI) / 2); // top, outermost
  const crossed = slide(a, b);
  assert.equal(crossed, true);
  assert.deepEqual(judgePush(cfg, a, b, crossed), { ok: true, win: false, shortcut: true });
});

test('shortcut landing on a different ring fails', () => {
  const a = onTrack(0, Math.PI / 2);
  const b = onTrack(1, (3 * Math.PI) / 2);
  assert.deepEqual(judgePush(cfg, a, b, slide(a, b)), { ok: false, reason: 'wrong-track' });
});

test('jumping a line but staying on the same half fails', () => {
  const a = onTrack(0, Math.PI / 2);
  const b = onTrack(1, Math.PI / 2);
  assert.deepEqual(judgePush(cfg, a, b, slide(a, b)), { ok: false, reason: 'wrong-track' });
});

test('leaving the spiral fails', () => {
  const a = onTrack(0, Math.PI / 2);
  const b = { x: 0, y: 400 };
  assert.deepEqual(judgePush(cfg, a, b, slide(a, b)), { ok: false, reason: 'outside' });
});

test('stopping fully inside the centre wins', () => {
  const a = onTrack(cfg.rings - 1, 5.5);
  const b = { x: 5, y: -5 };
  const v = judgePush(cfg, a, b, slide(a, b));
  assert.equal(v.ok && v.win, true);
});
