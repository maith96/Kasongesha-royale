import { strings } from '../i18n';
import type { Verdict } from './rules';

export type Tone = 'info' | 'good' | 'bad';

const pick = (lines: string[], seed: number) => lines[seed % lines.length];

// Banner text for the result of a kick, in the current language. `name` is
// null in solo play; `close` means it stopped just short of a line; `seed` is
// the kick number, so a replay shows the same words as the live game.
export function verdictMessage(v: Verdict, name: string | null, close = false, seed = 0): { message: string; tone: Tone } {
  const s = strings().verdict;
  if (v.ok && v.win) return { message: s.win(name), tone: 'good' };
  if (v.ok) return { message: pick(v.shortcut ? s.shortcut : close ? s.close : s.good, seed), tone: 'good' };
  const lines = { line: s.line, outside: s.outside, 'too-far': s.tooFar, 'foot-down': s.footDown }[v.reason];
  return { message: `${pick(lines, seed)} ${s.backToStart}`, tone: 'bad' };
}

export function playerName(i: number, count: number) {
  const s = strings().common;
  return count === 1 ? s.you : s.player(i + 1);
}
