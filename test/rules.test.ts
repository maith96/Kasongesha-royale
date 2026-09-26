/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { lineRadius, locate, maxTheta, SpiralConfig, startPosition, touchesLine, trackPoint } from '../src/game/spiral';
import { judgePush, progressFraction, PushTracker } from '../src/game/rules';
import { STAGES } from '../src/game/stages';

// Slide in a straight line, as the physics does, and return how many lines were crossed.
function slide(cfg: SpiralConfig, from: { x: number; y: number }, to: { x: number; y: number }) {
  const t = new PushTracker(cfg, from.x, from.y);
  for (let i = 1; i <= 200; i++) {
    t.step(from.x + ((to.x - from.x) * i) / 200, from.y + ((to.y - from.y) * i) / 200);
  }
  return t.linesCrossed;
}

function onLine(cfg: SpiralConfig, theta: number) {
  const r = lineRadius(cfg, theta);
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

for (const { name, cfg } of STAGES) {
  const at = (ring: number, phi: number) => trackPoint(cfg, ring, phi);

  test(`${name}: start position is clean and on the outermost ring`, () => {
    const s = startPosition(cfg);
    assert.equal(touchesLine(cfg, s.x, s.y), false);
    assert.equal(locate(cfg, s.x, s.y).ring, 0);
  });

  test(`${name}: the middle of every ring is clean and counted from the outside`, () => {
    for (let phi = 0.2; phi < Math.PI * 2; phi += 0.25) {
      for (let k = 0; k < cfg.rings; k++) {
        const p = at(k, phi);
        if (locate(cfg, p.x, p.y).kind !== 'track') continue;
        if (Math.abs(p.y) < cfg.stoneRadius) continue; // on the divider
        if (phi + Math.PI * 2 * (k + 1) > maxTheta(cfg)) continue; // past the line's end: no inner wall
        assert.equal(locate(cfg, p.x, p.y).ring, k, `ring ${k} at ${phi.toFixed(2)}`);
        assert.equal(touchesLine(cfg, p.x, p.y), false, `ring ${k} at ${phi.toFixed(2)} touches`);
      }
    }
  });

  test(`${name}: short push along the track is fine`, () => {
    const a = at(0, 1.0);
    const b = at(0, 1.3);
    const crossed = slide(cfg, a, b);
    assert.equal(crossed, 0);
    assert.deepEqual(judgePush(cfg, a, b, crossed), { ok: true, win: false, shortcut: false });
  });

  test(`${name}: stopping on the spiral line fails`, () => {
    assert.deepEqual(judgePush(cfg, at(0, 1.0), onLine(cfg, 1.3), 0), { ok: false, reason: 'line' });
  });

  test(`${name}: stopping on the divider fails`, () => {
    const a = at(1, Math.PI - 0.3);
    const b = at(1, Math.PI); // left side, right on y = 0
    assert.deepEqual(judgePush(cfg, a, b, slide(cfg, a, b)), { ok: false, reason: 'line' });
  });

  test(`${name}: jumping over one line to the next ring is a shortcut`, () => {
    const a = at(0, Math.PI / 2);
    const b = at(1, Math.PI / 2);
    const crossed = slide(cfg, a, b);
    assert.equal(crossed, 1);
    assert.deepEqual(judgePush(cfg, a, b, crossed), { ok: true, win: false, shortcut: true });
  });

  test(`${name}: jumping over two lines is too far`, () => {
    const a = at(0, Math.PI / 2);
    const b = at(2, Math.PI / 2);
    const crossed = slide(cfg, a, b);
    assert.equal(crossed, 2);
    assert.deepEqual(judgePush(cfg, a, b, crossed), { ok: false, reason: 'too-far' });
  });

  test(`${name}: cutting across the middle to the other half is too far`, () => {
    const a = at(0, Math.PI / 2);
    const b = at(0, (3 * Math.PI) / 2);
    assert.deepEqual(judgePush(cfg, a, b, slide(cfg, a, b)), { ok: false, reason: 'too-far' });
  });

  test(`${name}: kicking from START straight into HOME is too far`, () => {
    const a = startPosition(cfg);
    const b = { x: 0, y: 0 };
    assert.deepEqual(judgePush(cfg, a, b, slide(cfg, a, b)), { ok: false, reason: 'too-far' });
  });

  test(`${name}: sliding along the track round the wrap point crosses no line`, () => {
    // Ring 1 just before angle 0 continues into ring 2 just after it.
    const a = at(1, Math.PI * 2 - 0.35);
    const b = at(2, 0.35);
    assert.equal(slide(cfg, a, b), 0);
  });

  test(`${name}: jumping over one line but landing on the next fails`, () => {
    const a = at(0, Math.PI / 2);
    const b = onLine(cfg, Math.PI / 2 + Math.PI * 2 * 2);
    assert.deepEqual(judgePush(cfg, a, b, slide(cfg, a, b)), { ok: false, reason: 'line' });
  });

  test(`${name}: leaving the spiral fails`, () => {
    const a = at(0, Math.PI / 2);
    const b = { x: 0, y: 2000 };
    assert.deepEqual(judgePush(cfg, a, b, slide(cfg, a, b)), { ok: false, reason: 'outside' });
  });

  test(`${name}: stopping fully inside the centre from the innermost ring wins`, () => {
    const a = at(cfg.rings - 1, 5.5);
    const b = { x: 5, y: -5 };
    const v = judgePush(cfg, a, b, slide(cfg, a, b));
    assert.equal(v.ok && v.win, true);
  });

  test(`${name}: jumping one line from the second-innermost ring into HOME wins`, () => {
    const a = at(cfg.rings - 2, Math.PI / 2);
    const b = { x: 0, y: 3 };
    const crossed = slide(cfg, a, b);
    assert.equal(crossed, 1);
    const v = judgePush(cfg, a, b, crossed);
    assert.equal(v.ok && v.win, true);
  });

  test(`${name}: progress is 0 at the start and 1 at home`, () => {
    const s = startPosition(cfg);
    assert.equal(progressFraction(cfg, s.x, s.y), 0);
    assert.equal(progressFraction(cfg, 0, 0), 1);
  });
}
