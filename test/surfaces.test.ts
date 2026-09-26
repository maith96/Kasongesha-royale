/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { slideDistance, SURFACES } from '../src/game/surfaces';

const byName = (n: string) => SURFACES.find((s) => s.name === n)!;
const dist = (n: string, wet = false) => slideDistance(500, byName(n), wet);

test('slipperiness order: tile > cement > dirt > sand', () => {
  assert.ok(dist('Tile') > dist('Cement'));
  assert.ok(dist('Cement') > dist('Dirt'));
  assert.ok(dist('Dirt') > dist('Sand'));
});

test('wet ground slides further on every surface', () => {
  for (const s of SURFACES) assert.ok(dist(s.name, true) > dist(s.name), s.name);
});
