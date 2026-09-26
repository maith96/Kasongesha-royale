import type { Verdict } from './rules';

export type Tone = 'info' | 'good' | 'bad';

// Several lines per event for variety. Picked by kick number (not at random)
// so a replay shows the same words as the live game.
const LINES = {
  good: ['Poa!', 'Safi!', 'Fiti sana!', 'Uko sawa!', 'Freshi!'],
  shortcut: ['Shortcut safi! 🔥', 'Umeruka poa! 🔥', 'Kasongesha! 🔥'],
  close: ['Close one! 😅', 'Karibu uguze! 😅', 'Aii, karibu! 😅'],
  line: ['Umeguza line!', 'Aii, umeguza!', 'Line imekushika!'],
  outside: ['Umetoka nje!', 'Nje kabisa!'],
  'too-far': ['Umeruka sana! Only one line per kick.'],
  'foot-down': ['Mguu chini! You lost balance.'],
};

const pick = (lines: string[], seed: number) => lines[seed % lines.length];

// Banner text for the result of a kick. `name` is null in solo play; `close`
// means it stopped just short of a line; `seed` is the kick number.
export function verdictMessage(v: Verdict, name: string | null, close = false, seed = 0): { message: string; tone: Tone } {
  if (v.ok && v.win) return { message: name ? `${name} amefika! 🏆` : 'Umefika! 🏆', tone: 'good' };
  if (v.ok) {
    const lines = v.shortcut ? LINES.shortcut : close ? LINES.close : LINES.good;
    return { message: pick(lines, seed), tone: 'good' };
  }
  return { message: `${pick(LINES[v.reason], seed)} Back to start.`, tone: 'bad' };
}

export function playerName(i: number, count: number) {
  return count === 1 ? 'You' : `Player ${i + 1}`;
}
