/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

import { verdictMessage } from '../src/game/messages';
import { LANGUAGES, matchLanguage, setLanguage } from '../src/i18n';

// Shape of a strings object: nested keys, with functions and arrays marked.
function shape(o: unknown): unknown {
  if (typeof o === 'function') return 'fn';
  if (Array.isArray(o)) return 'array';
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v)]));
  return typeof o;
}

test('every language has exactly the same keys as English', () => {
  for (const [code, strings] of Object.entries(LANGUAGES)) {
    assert.deepEqual(shape(strings), shape(LANGUAGES.en), code);
  }
});

test('no empty strings or empty line lists', () => {
  const walk = (o: unknown, path: string) => {
    if (typeof o === 'string') assert.ok(o.trim().length > 0, path);
    else if (Array.isArray(o)) {
      assert.ok(o.length > 0, path);
      o.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
  };
  for (const [code, strings] of Object.entries(LANGUAGES)) walk(strings, code);
});

test('result messages follow the current language', () => {
  const fail = { ok: false as const, reason: 'line' as const };
  setLanguage('en');
  assert.match(verdictMessage(fail, null).message, /Back to start\./);
  setLanguage('sw');
  assert.match(verdictMessage(fail, null).message, /Rudi mwanzo\./);
  setLanguage('en');
});

test('device language matching falls back to English', () => {
  assert.equal(matchLanguage('sw'), 'sw');
  assert.equal(matchLanguage('fr'), 'en');
  assert.equal(matchLanguage(null), 'en');
});

// Guard against new hard-coded text in the UI: words written straight into JSX.
test('no hard-coded words in JSX', () => {
  const files = ['src/screens', 'src/components'].flatMap((d) => readdirSync(d).map((f) => `${d}/${f}`)).concat('App.tsx');
  const offenders: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    // Text sitting directly inside <Text> / <SvgText> (not inside {…}).
    for (const m of src.matchAll(/<(?:Svg)?Text\b[^>]*>([^<{}]*[A-Za-z]{2,}[^<{}]*)</g)) {
      const text = m[1].trim();
      if (text && !/^Kasongesha|^Royale/.test(text)) offenders.push(`${f}: ${text}`);
    }
  }
  assert.deepEqual(offenders, []);
});
