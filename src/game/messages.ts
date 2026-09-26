import type { Verdict } from './rules';

export type Tone = 'info' | 'good' | 'bad';

const FAIL_TEXT: Record<Extract<Verdict, { ok: false }>['reason'], string> = {
  line: 'Umeguza line! Back to start.',
  outside: 'Umetoka nje! Back to start.',
  'foot-down': 'Mguu chini! You lost balance. Back to start.',
};

// Banner text for the result of a kick. `name` is null in solo play.
export function verdictMessage(v: Verdict, name: string | null): { message: string; tone: Tone } {
  if (v.ok && v.win) return { message: name ? `${name} amefika! 🏆` : 'Umefika! 🏆', tone: 'good' };
  if (v.ok) return { message: v.shortcut ? 'Shortcut safi! 🔥' : 'Poa!', tone: 'good' };
  return { message: FAIL_TEXT[v.reason], tone: 'bad' };
}

export function playerName(i: number, count: number) {
  return count === 1 ? 'You' : `Player ${i + 1}`;
}
